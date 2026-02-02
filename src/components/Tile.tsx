import { motion } from 'framer-motion';
import { Theme } from '../gui/theme';
import type { RenderTile } from '../hooks/useGame';
import clsx from 'clsx';

interface TileProps {
    tile: RenderTile;
    isFastMode?: boolean;
}

export const Tile = ({ tile, isFastMode = false }: TileProps) => {
    const getPos = (index: number) => `${2 + index * 24.5}%`;
    const left = getPos(tile.c);
    const top = getPos(tile.r);

    // Dynamic styles
    const backgroundColor = Theme.getTileColor(tile.val);
    const color = Theme.getTextColor(tile.val);

    // Responsive font size
    const fontSize = tile.val < 100 ? 'clamp(30px, 8vw, 55px)' : tile.val < 1000 ? 'clamp(24px, 6vw, 45px)' : 'clamp(18px, 5vw, 35px)';

    const isMerged = tile.isMerged;
    const isNew = tile.isNew;
    const toDelete = tile.toDelete;

    // Animation configuration

    // When isFastMode is true, we disable most animations for performance

    return (
        <motion.div
            layout={!isFastMode && !isNew} // Only layout animate if NOT new (slide existing tiles)
            initial={
                isFastMode
                    ? false
                    : isNew
                      ? { scale: 0 } // Zoom in from center of its position
                      : false
            }
            animate={{
                left,
                top,
                scale: isFastMode ? 1 : isMerged ? [1, 1.2, 1] : toDelete ? 0.8 : 1,
                opacity: isFastMode ? 1 : toDelete ? 0 : 1,
                zIndex: isMerged ? 20 : toDelete ? 5 : 10,
            }}
            transition={{
                duration: isFastMode ? 0 : 0.1,
                ease: 'easeInOut',
                scale: {
                    duration: 0.15,
                    // If merged, pop effect. If deleting, shrink.
                },
            }}
            className={clsx('absolute flex items-center justify-center rounded-md font-bold select-none shadow-sm')}
            style={{
                width: '22.5%',
                height: '22.5%',
                backgroundColor,
                color,
                fontSize,
                // Positions are now handled by motion via 'left'/'top' in animate prop
                // But we set initial styles for server/static rendering
                left,
                top,
            }}
        >
            {tile.val}
        </motion.div>
    );
};
