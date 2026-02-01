import type { Bitboard } from '../core/types';
import type { TranspositionTable as TTMap } from './ai-types';

export class TranspositionTable {
    private table: TTMap = new Map();
    private static readonly MAX_SIZE = 500000;

    get(board: Bitboard) {
        return this.table.get(board);
    }

    set(board: Bitboard, depth: number, score: number) {
        if (this.table.size > TranspositionTable.MAX_SIZE) {
            this.table.clear();
        }
        this.table.set(board, { depth, score });
    }

    clear() {
        this.table.clear();
    }

    get raw() {
        return this.table;
    }
}
