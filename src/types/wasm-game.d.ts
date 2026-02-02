interface WasmBoard {
    reset(): void;
    move(direction: number): boolean;
    moveInt(direction: number): boolean;
    getTile(row: number, col: number): number;
    setTile(row: number, col: number, value: number): void;
    restoreState(bitboardHex: string, score: number): void;
    getBitboardString(): string;
    isGameOver(): boolean;
    getScore(): number;
    getHighScore(): number;
    hasWon(): boolean;
    delete(): void;
}
interface WasmAgent {
    getBestMove(board: WasmBoard): number;
    delete(): void;
}

interface WasmModule {
    Board: new () => WasmBoard;
    ExpectimaxAgent: new () => WasmAgent;
    Direction: {
        Up: 0;
        Down: 1;
        Left: 2;
        Right: 3;
    };
}

interface Window {
    create2048Module: () => Promise<WasmModule>;
}
