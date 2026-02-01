import type { Bitboard, Grid, IGameObserver, Tile, GameState } from './types';
import { Direction } from './types';
import { Config } from './config';
import { BitboardOps } from './bitboard-ops';
import { LookupTable } from './lookup-table';

export class Board {
    private board_: Bitboard = 0n;
    private score_: number = 0;
    private highScore_: number = 0;
    private observers_: IGameObserver[] = [];

    constructor() {
        LookupTable.init();
        this.reset();
    }

    public reset() {
        this.board_ = 0n;
        this.score_ = 0;
        this.notifyGameReset();
        this.spawnRandomTile();
        this.spawnRandomTile();
    }

    public getGrid(): Grid {
        const result: Grid = Array(4)
            .fill(0)
            .map(() => Array(4).fill(0));
        for (let r = 0; r < 4; ++r) {
            for (let c = 0; c < 4; ++c) {
                const t = this.getTile(r, c);
                result[r][c] = t === 0 ? 0 : 1 << t;
            }
        }
        return result;
    }

    public getTile(row: number, col: number): Tile {
        const shift = BigInt(row * 16 + col * 4);
        const mask = 0xf;
        return Number((this.board_ >> shift) & BigInt(mask));
    }

    public move(dir: Direction): boolean {
        // 1. Calculate final state (Source of Truth)
        const { newBoard, moveScore } = BitboardOps.executeMove(this.board_, dir);

        if (newBoard === this.board_) {
            return false;
        }

        // 2. Simulate logic for animation events
        this.simulateMove(dir);

        // 3. Commit state
        this.board_ = newBoard;
        this.score_ += moveScore;
        if (this.score_ > this.highScore_) {
            this.highScore_ = this.score_;
        }

        this.spawnRandomTile();
        return true;
    }

    private simulateMove(dir: Direction) {
        // Helper to track simulation state
        type MergedTile = { val: number; merged: boolean };

        for (let line = 0; line < 4; ++line) {
            const virtualLine: MergedTile[] = [];

            for (let pos = 0; pos < 4; ++pos) {
                let r = 0,
                    c = 0;

                switch (dir) {
                    case Direction.Left:
                        r = line;
                        c = pos;
                        break;
                    case Direction.Right:
                        r = line;
                        c = 3 - pos;
                        break;
                    case Direction.Up:
                        r = pos;
                        c = line;
                        break;
                    case Direction.Down:
                        r = 3 - pos;
                        c = line;
                        break;
                }

                const currentExp = this.getTile(r, c);
                if (currentExp === 0) continue;

                let merged = false;
                if (virtualLine.length > 0) {
                    const last = virtualLine[virtualLine.length - 1];
                    if (last.val === currentExp && !last.merged) {
                        // MERGE
                        last.val++;
                        last.merged = true;
                        merged = true;

                        const destIdx = virtualLine.length - 1;
                        const { destR, destC } = this.getDestCoords(dir, line, destIdx);

                        // Notify: Move then Merge
                        this.notifyTileMove(r, c, destR, destC, 1 << currentExp);
                        this.notifyTileMerge(destR, destC, 1 << last.val);
                    }
                }

                if (!merged) {
                    // SLIDE
                    virtualLine.push({ val: currentExp, merged: false });
                    const destIdx = virtualLine.length - 1;

                    // Notify only if coordinates changed
                    if (destIdx !== pos) {
                        const { destR, destC } = this.getDestCoords(dir, line, destIdx);
                        this.notifyTileMove(r, c, destR, destC, 1 << currentExp);
                    }
                }
            }
        }
    }

    private getDestCoords(
        dir: Direction,
        line: number,
        idx: number
    ): { destR: number; destC: number } {
        let destR = 0,
            destC = 0;
        switch (dir) {
            case Direction.Left:
                destR = line;
                destC = idx;
                break;
            case Direction.Right:
                destR = line;
                destC = 3 - idx;
                break;
            case Direction.Up:
                destR = idx;
                destC = line;
                break;
            case Direction.Down:
                destR = 3 - idx;
                destC = line;
                break;
        }
        return { destR, destC };
    }

    private spawnRandomTile() {
        const emptyIndices: number[] = [];
        for (let i = 0; i < 16; ++i) {
            const shift = BigInt(i * 4);
            const val = (this.board_ >> shift) & 0xfn;
            if (val === 0n) {
                emptyIndices.push(i);
            }
        }

        if (emptyIndices.length > 0) {
            const randIndex = Math.floor(Math.random() * emptyIndices.length);
            const idx = emptyIndices[randIndex];

            const isTwo = Math.random() < Config.SPAWN_PROBABILITY_2;
            const val = isTwo ? Config.TILE_EXPONENT_LOW : Config.TILE_EXPONENT_HIGH;

            this.board_ |= BigInt(val) << BigInt(idx * 4);

            const r = Math.floor(idx / 4);
            const c = idx % 4;
            this.notifyTileSpawn(r, c, 1 << val);
        }
    }

    public isGameOver(): boolean {
        // Simple check: can we move in any direction?
        if (BitboardOps.executeMove(this.board_, Direction.Left).newBoard !== this.board_)
            return false;
        if (BitboardOps.executeMove(this.board_, Direction.Right).newBoard !== this.board_)
            return false;
        if (BitboardOps.executeMove(this.board_, Direction.Up).newBoard !== this.board_)
            return false;
        if (BitboardOps.executeMove(this.board_, Direction.Down).newBoard !== this.board_)
            return false;

        this.notifyGameOver();
        return true;
    }

    // Observer methods
    public addObserver(observer: IGameObserver) {
        this.observers_.push(observer);
    }
    public removeObserver(observer: IGameObserver) {
        this.observers_ = this.observers_.filter((o) => o !== observer);
    }

    private notifyGameReset() {
        this.observers_.forEach((o) => o.onGameReset());
    }
    private notifyGameOver() {
        this.observers_.forEach((o) => o.onGameOver());
    }
    private notifyTileSpawn(r: number, c: number, val: number) {
        this.observers_.forEach((o) => o.onTileSpawn(r, c, val));
    }
    private notifyTileMove(fr: number, fc: number, tr: number, tc: number, v: number) {
        this.observers_.forEach((o) => o.onTileMove(fr, fc, tr, tc, v));
    }
    private notifyTileMerge(r: number, c: number, val: number) {
        this.observers_.forEach((o) => o.onTileMerge(r, c, val));
    }

    // State persistence
    public getState(): GameState {
        return { board: this.board_, score: this.score_ };
    }

    public loadState(state: GameState) {
        this.board_ = state.board;
        this.score_ = state.score;
        this.notifyGameReset();
    }

    public setHighScore(score: number) {
        this.highScore_ = score;
    }
    public getHighScore() {
        return this.highScore_;
    }
    public getScore() {
        return this.score_;
    }
}
