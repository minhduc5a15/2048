interface WasmBoard {
  reset(): void;
  move(direction: number): boolean; // Trả về true nếu di chuyển hợp lệ
  getTile(row: number, col: number): number; // Trả về giá trị tile: 0, 1, 2...
  isGameOver(): boolean;
  getScore(): number;
  getHighScore(): number;
  hasWon(): boolean;
  delete(): void; // Quan trọng để giải phóng bộ nhớ C++
}

interface WasmAgent {
  getBestMove(board: WasmBoard): number; // -1: Không đi được, 0: Up, 1: Down, 2: Left, 3: Right
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