import { useState, useEffect, useRef, useCallback } from 'react';
import { Direction } from '../constants';

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

export const useGame = () => {
    // State
    const [tiles, setTiles] = useState<RenderTile[]>([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isReady, setIsReady] = useState(false);
    
    // Wasm refs
    const wasmModule = useRef<WasmModule | null>(null);
    const board = useRef<WasmBoard | null>(null);
    const agent = useRef<WasmAgent | null>(null);
    
    // Sync state from C++ to React
    const syncState = useCallback(() => {
        if (!board.current) return;
        
        const b = board.current;
        const newTiles: RenderTile[] = [];
        
        // Reconstruct grid
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = b.getTile(r, c);
                if (val > 0) {
                    newTiles.push({
                        id: r * 4 + c, // Stable ID based on position for React reconciliation
                        val: 1 << val,
                        r,
                        c,
                        // Animation flags (isNew, isMerged) are skipped in this basic Wasm integration
                        // as we don't have move vector data from the simple Wasm API.
                    });
                }
            }
        }
        
        setTiles(newTiles);
        setScore(b.getScore());
        setHighScore(b.getHighScore());
        setGameOver(b.isGameOver());
    }, []);

    // Load Wasm
    useEffect(() => {
        // Prevent double loading
        if (typeof window.create2048Module === 'function' && wasmModule.current) return;

        const loadWasm = async () => {
            try {
                // Ensure the script is loaded
                if (typeof window.create2048Module !== 'function') {
                   await new Promise<void>((resolve, reject) => {
                       const script = document.createElement('script');
                       script.src = '/wasm/game_core.js';
                       script.async = true;
                       script.onload = () => resolve();
                       script.onerror = () => reject(new Error('Failed to load Wasm script'));
                       document.body.appendChild(script);
                   });
                }

                if (window.create2048Module) {
                    const mod = await window.create2048Module();
                    wasmModule.current = mod;
                    
                    // Instantiate Board FIRST to trigger static initialization in C++ constructor
                    board.current = new mod.Board();
                    agent.current = new mod.ExpectimaxAgent();

                    // Verify core logic initialization AFTER Board creation
                    if (mod.isTableInitialized && !mod.isTableInitialized()) {
                        console.error("Wasm Logic Error: LookupTable broken (Merge check failed)!");
                    } else {
                        console.log("Wasm Logic Verified: LookupTable initialized & Merge logic OK.");
                    }
                    
                    setIsReady(true);
                    syncState();
                }
            } catch (err) {
                console.error("Error loading Wasm module:", err);
            }
        };

        loadWasm();
        
        return () => {
             // Cleanup if needed
        }
    }, [syncState]);

    const move = useCallback((dir: Direction) => {
        if (!board.current || !isReady || gameOver) return;
        
        try {
            const moved = board.current.move(dir);
            if (moved) {
                syncState();
            }
        } catch (err) {
            console.error("[JS] Error calling board.move:", err);
        }
    }, [isReady, gameOver, syncState]);

    const reset = useCallback(() => {
        if (!board.current) return;
        board.current.reset();
        syncState();
    }, [syncState]);

    const autoMove = useCallback(() => {
        if (!board.current || !agent.current || gameOver) return;
        
        try {
            // Agent returns direction: 0: Up, 1: Down, 2: Left, 3: Right
            const bestDir = agent.current.getBestMove(board.current);
            
            // Check if move is valid (not -1)
            if (bestDir >= 0) {
                 move(bestDir as Direction);
            } else {
                console.warn("AI returned no move (-1)");
            }
        } catch (e) {
            console.error("Error in AI autoMove:", e);
        }
    }, [gameOver, move]);

    return { 
        tiles, 
        floatingTexts: [], // Empty for now
        score, 
        highScore, 
        gameOver, 
        move, 
        reset, 
        autoMove,
        isReady 
    };
};