import type { Bitboard, Row } from './types';
import { Direction } from './types';
import { Config } from './config';
import { LookupTable } from './lookup-table';

export class BitboardOps {
    /**
     * Transposes the 4x4 bitboard (swaps rows and columns).
     * Replicated from C++ SWAR implementation.
     */
    static transpose64(b: Bitboard): Bitboard {
        const MASK_NIBBLE_KEEP = 0xf0f00f0ff0f00f0fn;
        const MASK_NIBBLE_SHIFT = 0x0000f0f00000f0f0n;
        const MASK_NIBBLE_BACK = 0x0f0f00000f0f0000n;

        // Step 1: Swap 4-bit Nibbles
        const stage1 =
            (b & MASK_NIBBLE_KEEP) |
            ((b & MASK_NIBBLE_SHIFT) << 12n) |
            ((b & MASK_NIBBLE_BACK) >> 12n);

        const MASK_ROW_KEEP = 0xff00ff0000ff00ffn;
        const MASK_ROW_DOWN = 0x00ff00ff00000000n;
        const MASK_ROW_UP = 0x00000000ff00ff00n;

        // Step 2: Swap 16-bit Rows
        return (
            (stage1 & MASK_ROW_KEEP) |
            ((stage1 & MASK_ROW_DOWN) >> 24n) |
            ((stage1 & MASK_ROW_UP) << 24n)
        );
    }

    static executeMove(board: Bitboard, dir: Direction): { newBoard: Bitboard; moveScore: number } {
        // If moving Up or Down, transpose first so we can treat it as Left/Right
        if (dir === Direction.Up || dir === Direction.Down) {
            board = this.transpose64(board);
        }

        let newBoard = 0n;
        let moveScore = 0;

        for (let r = 0; r < 4; ++r) {
            // Extract the 16-bit row
            const shift = BigInt(r * 16);
            const rowBig = (board >> shift) & Config.ROW_MASK;
            const row = Number(rowBig); // Convert to number for LookupTable access

            let newRow: Row;

            if (dir === Direction.Left || dir === Direction.Up) {
                newRow = LookupTable.moveLeftTable[row];
            } else {
                newRow = LookupTable.moveRightTable[row];
            }

            moveScore += LookupTable.scoreTable[row];

            // Reconstruct board
            newBoard |= BigInt(newRow) << shift;
        }

        // Transpose back if needed
        if (dir === Direction.Up || dir === Direction.Down) {
            newBoard = this.transpose64(newBoard);
        }

        return { newBoard, moveScore };
    }

    static countEmpty(board: Bitboard): number {
        // A naive iteration is fast enough for 16 items
        let count = 0;
        for (let i = 0; i < 16; i++) {
            if (((board >> BigInt(i * 4)) & 0xfn) === 0n) {
                count++;
            }
        }
        return count;
    }

    static countDistinctTiles(board: Bitboard): number {
        let mask = 0; // Bitmask of present exponents (up to 15, fits in int)
        for (let i = 0; i < 16; i++) {
            const val = Number((board >> BigInt(i * 4)) & 0xfn);
            if (val !== 0) {
                mask |= 1 << val;
            }
        }

        // Count set bits
        let count = 0;
        while (mask > 0) {
            if (mask & 1) count++;
            mask >>= 1;
        }
        return count;
    }
}
