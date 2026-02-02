import { useRef } from 'react';
import { Direction } from '../constants';
import type { TouchEvent } from 'react';

export const useSwipe = (onMove: (dir: Direction) => void) => {
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: TouchEvent) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (!touchStart.current) return;

        const touchEnd = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY,
        };

        const dx = touchEnd.x - touchStart.current.x;
        const dy = touchEnd.y - touchStart.current.y;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Threshold to avoid accidental swipes (e.g. tapping)
        if (Math.max(absDx, absDy) > 30) {
            // Horizontal vs Vertical
            if (absDx > absDy) {
                // Horizontal
                if (dx > 0) onMove(Direction.Right);
                else onMove(Direction.Left);
            } else {
                // Vertical
                if (dy > 0) onMove(Direction.Down);
                else onMove(Direction.Up);
            }
        }

        touchStart.current = null;
    };

    return { handleTouchStart, handleTouchEnd };
};
