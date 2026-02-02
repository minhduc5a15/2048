import { useState, useEffect, useRef, useCallback } from 'react';
import { Direction } from '../constants';
import { simulateMove } from '../utils/animation';

export interface RenderTile {
    id: number;
    val: number;
    r: number;
    c: number;
    isNew?: boolean;
    isMerged?: boolean;
    toDelete?: boolean;
}

export interface FloatingText {
    id: number;
    val: number;
    x: number;
    y: number;
}

const STORAGE_KEY = '2048-react-wasm-state';

export const useGame = () => {
    // State
    const [tiles, setTiles] = useState<RenderTile[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Wasm refs
    const wasmModule = useRef<WasmModule | null>(null);
    const board = useRef<WasmBoard | null>(null);
    const agent = useRef<WasmAgent | null>(null);

    // Sync state from C++ to React
    const syncState = useCallback((direction?: Direction, isAuto: boolean = false) => {
        if (!board.current) return;

        const b = board.current;
        const currentScore = b.getScore();
        const currentHighScore = b.getHighScore();
        const isOver = b.isGameOver();

        setScore(currentScore);
        setHighScore(currentHighScore);
        setGameOver(isOver);

        // Save to LocalStorage
        if (b.getBitboardString) {
            const stateToSave = {
                bitboardHex: b.getBitboardString(),
                score: currentScore,
                highScore: currentHighScore, // We might want to persist high score separately too
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        }

        // Construct 2D grid from C++ for comparison/rendering
        const cppGrid: number[][] = Array(4)
            .fill(0)
            .map(() => Array(4).fill(0));
        const rawTiles: RenderTile[] = []; // For fallback/auto mode

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const exponent = b.getTile(r, c);
                const val = exponent > 0 ? 1 << exponent : 0;
                cppGrid[r][c] = val;

                if (val > 0) {
                    rawTiles.push({
                        id: r * 4 + c, // Simple ID for auto mode
                        val: val,
                        r,
                        c,
                    });
                }
            }
        }

        // Logic branching: Auto Play vs Manual Play
        if (isAuto || direction === undefined) {
            // Fast/Init path: Just render what C++ has
            setTiles(rawTiles);
            setFloatingTexts([]); // No floating text in auto/reset
        } else {
            setTiles((prevTiles) => {
                const result = simulateMove(prevTiles, direction, cppGrid);
                setFloatingTexts((prev) => [...prev, ...result.floatingTexts]);
                return result.nextTiles;
            });
        }
    }, []);

    // Cleanup floating texts
    useEffect(() => {
        if (floatingTexts.length > 0) {
            const timer = setTimeout(() => {
                setFloatingTexts((prev) => prev.slice(1)); // Remove oldest
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [floatingTexts]);

    // Cleanup ghost tiles
    useEffect(() => {
        if (tiles.some((t) => t.toDelete)) {
            const timer = setTimeout(() => {
                setTiles((prev) => prev.filter((t) => !t.toDelete));
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [tiles]);

    // Load Wasm & Restore State
    // Load Wasm & Restore State
    useEffect(() => {
        // Biến cờ để tránh update state khi component đã unmount (cleanup)
        let isMounted = true;

        const loadWasm = async () => {
            try {
                if (typeof window.create2048Module !== 'function') {
                    const existingScript = document.querySelector('script[src="/wasm/game_core.js"]');

                    if (!existingScript) {
                        await new Promise<void>((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = '/wasm/game_core.js';
                            script.async = true;
                            script.onload = () => resolve();
                            script.onerror = () => reject(new Error('Failed to load Wasm script'));
                            document.body.appendChild(script);
                        });
                    } else {
                        await new Promise<void>((resolve) => {
                            const checkInterval = setInterval(() => {
                                if (typeof window.create2048Module === 'function') {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 50);
                        });
                    }
                }

                if (window.create2048Module && !wasmModule.current && isMounted) {
                    const mod = await window.create2048Module();

                    if (!isMounted) return;

                    wasmModule.current = mod;
                    board.current = new mod.Board();
                    agent.current = new mod.ExpectimaxAgent();

                    // Restore state logic
                    const savedData = localStorage.getItem(STORAGE_KEY);
                    if (savedData) {
                        try {
                            const { bitboardHex, score } = JSON.parse(savedData);
                            if (bitboardHex && typeof score === 'number' && board.current.restoreState) {
                                board.current.restoreState(bitboardHex, score);
                            }
                        } catch (e) {
                            console.error('Failed to parse saved game:', e);
                        }
                    }

                    setIsReady(true);
                    syncState(undefined, false);
                }
            } catch (err) {
                console.error('Error loading Wasm module:', err);
            }
        };

        loadWasm();

        return () => {
            isMounted = false;
            if (board.current) {
                board.current.delete();
                board.current = null;
            }
            if (agent.current) {
                agent.current.delete();
                agent.current = null;
            }
        };
    }, [syncState]);

    const move = useCallback(
        (dir: Direction, isAuto: boolean = false) => {
            if (!board.current || !isReady || gameOver) return;

            // CRITICAL: Use moveInt to ensure correct Integer -> Enum casting in C++
            const moved = board.current.moveInt(dir);
            if (moved) {
                syncState(dir, isAuto);
            }
        },
        [isReady, gameOver, syncState]
    );

    const reset = useCallback(() => {
        if (!board.current) return;
        board.current.reset();
        localStorage.removeItem(STORAGE_KEY); // Clear save on reset
        syncState(undefined, false);
    }, [syncState]);

    const autoMove = useCallback(() => {
        if (!board.current || !agent.current || gameOver) return;

        try {
            const bestDir = agent.current.getBestMove(board.current);
            if (bestDir >= 0) {
                move(bestDir as Direction, true); // Pass isAuto=true
            }
        } catch (e) {
            console.error('Error in AI autoMove:', e);
        }
    }, [gameOver, move]);

    return {
        tiles,
        floatingTexts,
        score,
        highScore,
        gameOver,
        move,
        reset,
        autoMove,
        isReady,
    };
};
