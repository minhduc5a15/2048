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
const HIGH_SCORE_KEY = '2048-high-score';

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
        const isOver = b.isGameOver();

        setScore(currentScore);
        setGameOver(isOver);

        setHighScore((prevHigh) => {
            if (currentScore > prevHigh) {
                localStorage.setItem(HIGH_SCORE_KEY, currentScore.toString());
                return currentScore;
            }
            return prevHigh;
        });

        // Save game state
        if (b.getBitboardString) {
            const stateToSave = {
                bitboardHex: b.getBitboardString(),
                score: currentScore,
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
                        id: r * 4 + c,
                        val: val,
                        r,
                        c,
                    });
                }
            }
        }

        // Logic branching: Auto Play vs Manual Play
        if (isAuto || direction === undefined) {
            setTiles(rawTiles);
            setFloatingTexts([]);
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
                setFloatingTexts((prev) => prev.slice(1));
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
    useEffect(() => {
        let isMounted = true;

        const loadWasm = async () => {
            try {
                const savedHigh = localStorage.getItem(HIGH_SCORE_KEY);
                if (savedHigh) {
                    setHighScore(parseInt(savedHigh, 10));
                }

                // Logic Load Script
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

                    // Restore Game State
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

        localStorage.removeItem(STORAGE_KEY);

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
