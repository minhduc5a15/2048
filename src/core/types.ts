export type Tile = number; // Exponent: 0, 1=2, 2=4, ...
export type Bitboard = bigint;
export type Row = number; // 16-bit integer
export type Grid = number[][]; // For UI rendering (actual values: 0, 2, 4...)

export const Direction = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3,
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export interface GameState {
    board: Bitboard;
    score: number;
}

export interface IGameObserver {
    onGameReset(): void;
    onGameOver(): void;
    onTileSpawn(r: number, c: number, value: number): void;
    onTileMove(fromR: number, fromC: number, toR: number, toC: number, value: number): void;
    onTileMerge(r: number, c: number, newValue: number): void;
}
