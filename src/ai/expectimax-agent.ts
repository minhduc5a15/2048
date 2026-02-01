import { BitboardOps } from '../core/bitboard-ops';
import { Config } from '../core/config';
import { LookupTable } from '../core/lookup-table';
import { Direction } from '../core/types';
import type { Bitboard } from '../core/types';
import type { SearchState } from './ai-types';
import { TranspositionTable } from './transposition-table';

export class ExpectimaxAgent {
    private transTable = new TranspositionTable();

    // Configuration
    private static readonly CPROB_THRESH_BASE = 0.0001;
    private static readonly TIME_BUDGET_MS = 100; // Slightly reduced for JS single-thread
    private static readonly MAX_DEPTH_CAP = 12;

    constructor() {
        // Init if not already
        LookupTable.init();
    }

    public getBestMove(board: Bitboard): Direction | null {
        // 1. Dynamic Depth Calculation
        const distinctTiles = BitboardOps.countDistinctTiles(board);
        let targetDepth = Math.max(3, distinctTiles - 2);
        if (targetDepth > ExpectimaxAgent.MAX_DEPTH_CAP) {
            targetDepth = ExpectimaxAgent.MAX_DEPTH_CAP;
        }

        // 2. Setup Search Context
        const startTime = performance.now();
        const state: SearchState = {
            transTable: this.transTable.raw,
            cprobThreshold: ExpectimaxAgent.CPROB_THRESH_BASE,
        };

        // Periodic cleanup handled by TranspositionTable setter logic or we can do it here
        // The C++ one clears if > 500k. Our wrapper does that on set.

        let bestMoveDir: Direction = Direction.Up;
        let foundAnyMove = false;

        const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

        // 3. Iterative Deepening Loop
        for (let depth = 1; depth <= targetDepth; ++depth) {
            let currentDepthBestScore = -Infinity;
            let currentDepthBestMove: Direction = Direction.Up;
            let validMoveFoundAtThisDepth = false;

            for (const dir of dirs) {
                const { newBoard } = BitboardOps.executeMove(board, dir);

                if (newBoard !== board) {
                    // Root always has probability 1.0
                    const score = this.scoreChanceNode(state, newBoard, depth, 1.0);

                    if (score > currentDepthBestScore) {
                        currentDepthBestScore = score;
                        currentDepthBestMove = dir;
                    }
                    validMoveFoundAtThisDepth = true;
                }
            }

            if (validMoveFoundAtThisDepth) {
                bestMoveDir = currentDepthBestMove;
                foundAnyMove = true;
            }

            // Time Budget Check
            const now = performance.now();
            if (now - startTime > ExpectimaxAgent.TIME_BUDGET_MS) {
                break;
            }
        }

        return foundAnyMove ? bestMoveDir : null;
    }

    // --- Heuristic Evaluation ---
    private evaluateBoard(board: Bitboard): number {
        let score = 0;
        // Row scores
        for (let r = 0; r < 4; ++r) {
            score += LookupTable.heuristicTable[Number((board >> BigInt(r * 16)) & 0xffffn)];
        }
        // Column scores (transpose)
        const t = BitboardOps.transpose64(board);
        for (let r = 0; r < 4; ++r) {
            score += LookupTable.heuristicTable[Number((t >> BigInt(r * 16)) & 0xffffn)];
        }
        return score;
    }

    // --- Max Node (Player Move) ---
    private scoreMoveNode(
        state: SearchState,
        board: Bitboard,
        depth: number,
        cprob: number
    ): number {
        // Base case: Depth limit reached or Probability Pruning
        if (depth === 0 || cprob < state.cprobThreshold) {
            return this.evaluateBoard(board);
        }

        // Transposition Table Lookup
        const entry = state.transTable.get(board);
        if (entry && entry.depth >= depth) {
            return entry.score;
        }

        let bestScore = -Infinity;
        let canMove = false;

        const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

        for (const dir of dirs) {
            const { newBoard } = BitboardOps.executeMove(board, dir);

            if (newBoard !== board) {
                canMove = true;
                // Move Node -> Chance Node (same depth convention as per C++ implementation logic)
                // Wait, C++ code: scoreChanceNode(..., depth, ...)
                // And scoreMoveNode calls scoreChanceNode with same depth?
                // C++: const float score = scoreChanceNode(state, newBoard, depth, cprob);
                // Yes, depth is decremented in scoreChanceNode calls to scoreMoveNode.

                const score = this.scoreChanceNode(state, newBoard, depth, cprob);
                if (score > bestScore) {
                    bestScore = score;
                }
            }
        }

        if (!canMove) {
            return 0; // Game Over
        }

        // Store result
        state.transTable.set(board, { depth, score: bestScore });

        return bestScore;
    }

    // --- Chance Node (Random Spawn) ---
    private scoreChanceNode(
        state: SearchState,
        board: Bitboard,
        depth: number,
        cprob: number
    ): number {
        const emptyCount = BitboardOps.countEmpty(board);
        if (emptyCount === 0) return 0;

        const p_cell = cprob / emptyCount;

        // Pruning
        if (p_cell < state.cprobThreshold) {
            return this.evaluateBoard(board);
        }

        let totalScore = 0;

        for (let i = 0; i < 16; ++i) {
            if (((board >> BigInt(i * 4)) & 0xfn) === 0n) {
                // Spawn 2 (90%)
                // Recursive step: Chance -> Move (depth - 1)
                const board2 = board | (BigInt(Config.TILE_EXPONENT_LOW) << BigInt(i * 4));
                const s2 = this.scoreMoveNode(
                    state,
                    board2,
                    depth - 1,
                    p_cell * Config.SPAWN_PROBABILITY_2
                );

                // Spawn 4 (10%)
                const board4 = board | (BigInt(Config.TILE_EXPONENT_HIGH) << BigInt(i * 4));
                const s4 = this.scoreMoveNode(
                    state,
                    board4,
                    depth - 1,
                    p_cell * (1.0 - Config.SPAWN_PROBABILITY_2)
                );

                totalScore +=
                    Config.SPAWN_PROBABILITY_2 * s2 + (1.0 - Config.SPAWN_PROBABILITY_2) * s4;
            }
        }

        return totalScore / emptyCount;
    }
}
