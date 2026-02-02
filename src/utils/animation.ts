import { Direction } from '../constants';
import type { RenderTile } from '../hooks/useGame';

export const ANIMATION_SPEED = 0.1; // seconds

export interface SimulationResult {
    nextTiles: RenderTile[];
    floatingTexts: { id: number; val: number; x: number; y: number }[];
}

// Generate a unique ID if needed
let tempIdCounter = 10000;

export const simulateMove = (
    currentTiles: RenderTile[],
    direction: Direction,
    cppGrid: number[][] // 4x4 grid from C++ containing actual values (2, 4, 8...)
): SimulationResult => {
    const nextTiles: RenderTile[] = [];
    const floatingTexts: { id: number; val: number; x: number; y: number }[] = [];

    // 1. Map current tiles to a grid for easy access
    const grid: (RenderTile | null)[][] = Array(4)
        .fill(null)
        .map(() => Array(4).fill(null));

    currentTiles.forEach((t) => {
        if (t.r >= 0 && t.r < 4 && t.c >= 0 && t.c < 4 && !t.toDelete) {
            grid[t.r][t.c] = { ...t, isNew: false, isMerged: false }; // Clone
        }
    });

    // 2. Define traversal order based on direction
    const isVertical = direction === Direction.Up || direction === Direction.Down;
    const isReverse = direction === Direction.Right || direction === Direction.Down;

    // 3. Simulate Slide & Merge
    // We process line by line (or col by col)
    for (let i = 0; i < 4; i++) {
        let lastMergedIdx = -1; // Track where the last merge happened to avoid double merge

        // Get tiles in the current line
        const lineTiles: RenderTile[] = [];
        for (let j = 0; j < 4; j++) {
            const idx = isReverse ? 3 - j : j;
            const r = isVertical ? idx : i;
            const c = isVertical ? i : idx;
            const tile = grid[r][c];
            if (tile) lineTiles.push(tile);
        }

        // Process this line
        const processedLine: RenderTile[] = [];

        for (let k = 0; k < lineTiles.length; k++) {
            const current = lineTiles[k];

            // Check merge with previous
            if (processedLine.length > 0 && processedLine[processedLine.length - 1].val === current.val && lastMergedIdx !== processedLine.length - 1) {
                // MERGE
                const prev = processedLine[processedLine.length - 1];

                // Update the "previous" tile to be the merged result
                prev.val *= 2;
                prev.isMerged = true;

                // Add floating text
                floatingTexts.push({
                    id: tempIdCounter++,
                    val: prev.val,
                    x: isVertical ? i : isReverse ? 3 - (processedLine.length - 1) : processedLine.length - 1,
                    y: isVertical ? (isReverse ? 3 - (processedLine.length - 1) : processedLine.length - 1) : i,
                });

                // Calculate target R/C based on processedLine index
                const pIdx = processedLine.length - 1;
                const tr = isVertical ? (isReverse ? 3 - pIdx : pIdx) : i;
                const tc = isVertical ? i : isReverse ? 3 - pIdx : pIdx;

                current.r = tr;
                current.c = tc;
                current.toDelete = true; // Helper flag for UI to animate exit

                // Update prev position (it stays or slides)
                prev.r = tr;
                prev.c = tc;

                nextTiles.push(current); // Push the dying tile so it animates there

                lastMergedIdx = processedLine.length - 1;
            } else {
                // SLIDE (No merge)
                processedLine.push(current);

                // Calculate target position
                const pIdx = processedLine.length - 1;
                const tr = isVertical ? (isReverse ? 3 - pIdx : pIdx) : i;
                const tc = isVertical ? i : isReverse ? 3 - pIdx : pIdx;

                current.r = tr;
                current.c = tc;
            }
        }

        // Add valid tiles to result
        processedLine.forEach((t) => nextTiles.push(t));
    }

    // 4. Identify Spawned Tile
    // Compare nextTiles with cppGrid to find the tile that exists in cppGrid but not in nextTiles (at that position)
    const nextTilesMap = new Set<string>();
    nextTiles.forEach((t) => {
        if (!t.toDelete) nextTilesMap.add(`${t.r},${t.c}`);
    });

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const val = cppGrid[r][c]; // This is actual value (2, 4...) from useGame conversion
            if (val > 0) {
                // If this position is empty in our simulated matching, it MUST be the new spawn
                if (!nextTilesMap.has(`${r},${c}`)) {
                    nextTiles.push({
                        id: tempIdCounter++,
                        val: val,
                        r,
                        c,
                        isNew: true,
                    });
                }
            }
        }
    }

    return { nextTiles, floatingTexts };
};
