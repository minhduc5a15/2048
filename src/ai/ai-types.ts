import type { Bitboard } from '../core/types';

export interface TranspositionEntry {
    depth: number;
    score: number;
}

export type TranspositionTable = Map<Bitboard, TranspositionEntry>;

export interface SearchState {
    transTable: TranspositionTable;
    cprobThreshold: number;
}
