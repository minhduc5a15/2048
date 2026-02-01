import type { Row } from './types';

export class LookupTable {
    static moveLeftTable = new Uint16Array(65536);
    static moveRightTable = new Uint16Array(65536);
    static scoreTable = new Int32Array(65536);
    static heuristicTable = new Float32Array(65536);

    private static initialized = false;

    // Heuristic weights
    static readonly SCORE_LOST_PENALTY = 200000.0;
    static readonly SCORE_MONOTONICITY_POWER = 4.0;
    static readonly SCORE_MONOTONICITY_WEIGHT = 47.0;
    static readonly SCORE_SUM_POWER = 3.5;
    static readonly SCORE_SUM_WEIGHT = 11.0;
    static readonly SCORE_MERGES_WEIGHT = 700.0;
    static readonly SCORE_EMPTY_WEIGHT = 270.0;

    static init() {
        if (this.initialized) return;

        for (let i = 0; i < 65536; ++i) {
            this.initRow(i);
        }
        // Second pass for moveRightTable (reverse of moveLeftTable logic)
        for (let i = 0; i < 65536; ++i) {
            const revRow = this.reverseRow(i);
            const moveLeftRev = this.moveLeftTable[revRow];
            this.moveRightTable[i] = this.reverseRow(moveLeftRev);
        }

        this.initialized = true;
    }

    private static reverseRow(row: Row): Row {
        return (
            ((row >> 12) & 0xf) |
            ((row >> 4) & 0xf0) |
            ((row << 4) & 0xf00) |
            ((row << 12) & 0xf000)
        );
    }

    private static unpack(row: number): number[] {
        return [(row >> 0) & 0xf, (row >> 4) & 0xf, (row >> 8) & 0xf, (row >> 12) & 0xf];
    }

    private static pack(line: number[]): Row {
        let row = 0;
        row |= line[0] << 0;
        row |= line[1] << 4;
        row |= line[2] << 8;
        row |= line[3] << 12;
        return row;
    }

    private static initRow(row: number) {
        const line = this.unpack(row);

        // 1. Calculate Heuristic Score
        let sum = 0;
        let empty = 0;
        let merges = 0;
        let prev = 0;
        let counter = 0;

        for (const val of line) {
            sum += Math.pow(val, LookupTable.SCORE_SUM_POWER);
            if (val === 0) {
                empty++;
            } else {
                if (prev === val) {
                    counter++;
                } else if (counter > 0) {
                    merges += 1 + counter;
                    counter = 0;
                }
                prev = val;
            }
        }
        if (counter > 0) merges += 1 + counter;

        let mono_left = 0;
        let mono_right = 0;
        for (let i = 1; i < 4; ++i) {
            if (line[i - 1] > line[i]) {
                mono_left +=
                    Math.pow(line[i - 1], LookupTable.SCORE_MONOTONICITY_POWER) -
                    Math.pow(line[i], LookupTable.SCORE_MONOTONICITY_POWER);
            } else {
                mono_right +=
                    Math.pow(line[i], LookupTable.SCORE_MONOTONICITY_POWER) -
                    Math.pow(line[i - 1], LookupTable.SCORE_MONOTONICITY_POWER);
            }
        }

        this.heuristicTable[row] =
            LookupTable.SCORE_LOST_PENALTY +
            LookupTable.SCORE_EMPTY_WEIGHT * empty +
            LookupTable.SCORE_MERGES_WEIGHT * merges -
            LookupTable.SCORE_MONOTONICITY_WEIGHT * Math.min(mono_left, mono_right) -
            LookupTable.SCORE_SUM_WEIGHT * sum;

        // 2. Calculate Move Left Logic
        let score = 0;
        const temp: number[] = [];
        for (const val of line) {
            if (val !== 0) temp.push(val);
        }

        if (temp.length > 0) {
            for (let i = 0; i < temp.length - 1; ++i) {
                if (temp[i] === temp[i + 1]) {
                    temp[i]++; // Increment exponent
                    score += 1 << temp[i]; // Score is the value of the merged tile
                    temp.splice(i + 1, 1);
                    // Standard loop continues correctly as per JS splicing
                }
            }
        }

        // Pad with zeros
        while (temp.length < 4) {
            temp.push(0);
        }

        this.moveLeftTable[row] = this.pack(temp);
        this.scoreTable[row] = score;
    }
}
