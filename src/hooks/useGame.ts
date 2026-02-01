import { useState, useEffect, useCallback, useRef } from 'react';
import { Board } from '../core/board';
import { GameSaver } from '../core/game-saver';
import type { IGameObserver } from '../core/types';
import { Direction } from '../core/types';

export interface RenderTile {
    id: number;
    val: number;
    r: number;
    c: number;
    isNew?: boolean; // For spawn animation
    isMerged?: boolean; // For merge animation
    toDelete?: boolean; // For ghost tiles
}

export interface FloatingText {
    id: number;
    val: number;
    x: number;
    y: number;
}

import { ExpectimaxAgent } from '../ai/expectimax-agent';

export const useGame = () => {
    const [board] = useState(() => new Board());
    const [tiles, setTiles] = useState<RenderTile[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    const aiAgent = useRef(new ExpectimaxAgent());

    // Mutable refs to handle synchronous updates from Board callbacks
    const nextId = useRef(1);
    const nextTextId = useRef(1);
    const currentTiles = useRef<RenderTile[]>([]);

    const updateState = useCallback(() => {
        setTiles([...currentTiles.current]);
        setScore(board.getScore());

        const currentHigh = Math.max(board.getHighScore(), GameSaver.loadHighScore());
        if (board.getScore() > currentHigh) {
            GameSaver.saveHighScore(board.getScore());
        }
        setHighScore(Math.max(currentHigh, board.getScore()));

        GameSaver.save(board.getState());
    }, [board]);

    // Cleanup ghost tiles
    useEffect(() => {
        if (tiles.some((t) => t.toDelete)) {
            const timer = setTimeout(() => {
                currentTiles.current = currentTiles.current.filter((t) => !t.toDelete);
                setTiles([...currentTiles.current]);
            }, 150); // Matches animation duration approx
            return () => clearTimeout(timer);
        }
    }, [tiles]);

    // Cleanup floating texts
    useEffect(() => {
        if (floatingTexts.length > 0) {
            const timer = setTimeout(() => {
                setFloatingTexts((prev) => prev.slice(1)); // Remove oldest
            }, 600); // Max lifetime 0.6s
            return () => clearTimeout(timer);
        }
    }, [floatingTexts]);

    // Observer Implementation
    const observer = useRef<IGameObserver>({
        onGameReset: () => {
            currentTiles.current = [];
            setFloatingTexts([]);
            setGameOver(false);
        },
        onGameOver: () => {
            setGameOver(true);
            GameSaver.clearSave();
        },
        onTileSpawn: (r, c, value) => {
            currentTiles.current.push({
                id: nextId.current++,
                val: value,
                r,
                c,
                isNew: true,
            });
        },
        onTileMove: (fromR, fromC, toR, toC) => {
            const tile = currentTiles.current.find(
                (t) => t.r === fromR && t.c === fromC && !t.toDelete
            );
            if (tile) {
                tile.r = toR;
                tile.c = toC;
                tile.isNew = false;
                tile.isMerged = false;
            }
        },
        onTileMerge: (r, c, newValue) => {
            // Mark existing tiles at (r,c) for deletion
            // This includes the tile that JUST moved there in the previous step of this loop
            currentTiles.current.forEach((t) => {
                if (t.r === r && t.c === c && !t.toDelete) {
                    t.toDelete = true;
                }
            });

            // Add new merged tile
            currentTiles.current.push({
                id: nextId.current++,
                val: newValue,
                r,
                c,
                isMerged: true,
            });

            // Spawn floating text
            setFloatingTexts((prev) => [
                ...prev,
                {
                    id: nextTextId.current++,
                    val: newValue,
                    x: c, // We store grid coords here, convert to pixels in render
                    y: r,
                },
            ]);
        },
    });

    // Initialize
    useEffect(() => {
        board.addObserver(observer.current);

        // Load saved game
        const savedState = GameSaver.load();
        const savedHighScore = GameSaver.loadHighScore();
        board.setHighScore(savedHighScore);

        if (savedState) {
            board.loadState(savedState);
            // Reconstruct tiles from bitboard because we don't save RenderTiles
            // This means we lose animation history on reload, which is fine.
            const grid = board.getGrid();
            const reconstructedTiles: RenderTile[] = [];
            for (let r = 0; r < 4; ++r) {
                for (let c = 0; c < 4; ++c) {
                    if (grid[r][c] !== 0) {
                        reconstructedTiles.push({
                            id: nextId.current++,
                            val: grid[r][c],
                            r,
                            c,
                        });
                    }
                }
            }
            currentTiles.current = reconstructedTiles;
        }

        updateState();

        return () => board.removeObserver(observer.current);
    }, [board, updateState]);

    const move = useCallback(
        (dir: Direction) => {
            if (gameOver) return;

            // Reset animation flags for existing tiles before move
            currentTiles.current.forEach((t) => {
                t.isNew = false;
                t.isMerged = false;
            });

            const moved = board.move(dir);
            if (moved) {
                updateState();
            }
        },
        [board, gameOver, updateState]
    );

    const reset = useCallback(() => {
        board.reset();
        updateState();
    }, [board, updateState]);

    const autoMove = useCallback(() => {
        if (gameOver) return;

        // Get raw bitboard for AI
        const currentState = board.getState();
        const bestDir = aiAgent.current.getBestMove(currentState.board);

        if (bestDir !== null) {
            move(bestDir);
        }
    }, [board, gameOver, move]);

    return { tiles, floatingTexts, score, highScore, gameOver, move, reset, autoMove };
};
