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
    const fontSize =
        tile.val < 100
            ? 'clamp(30px, 8vw, 55px)'
            : tile.val < 1000
              ? 'clamp(24px, 6vw, 45px)'
              : 'clamp(18px, 5vw, 35px)';

    // Determine animation states
    const isMerged = tile.isMerged;
    const isNew = tile.isNew;

    // Fast mode: No animation duration
    const transition = isFastMode
        ? { duration: 0 }
        : {
              left: { duration: Theme.ANIMATION_SPEED_SLIDE, ease: 'linear' }, // Slide
              top: { duration: Theme.ANIMATION_SPEED_SLIDE, ease: 'linear' }, // Slide
              scale: {
                  duration: Theme.ANIMATION_SPEED_SCALE,
                  ease: isNew ? 'backOut' : 'easeInOut', // Spawn (backOut) vs Merge (pop)
                  times: isMerged ? [0, 0.5, 1] : undefined, // For keyframes
              },
              opacity: { duration: 0.15 },
          };

    return (
        <motion.div
            initial={
                !isFastMode && isNew
                    ? { scale: 0, left, top }
                    : isMerged
                      ? { scale: 1, left, top }
                      : false
            }
            animate={{
                left,
                top,
                scale: !isFastMode && isMerged ? [1, 1.2, 1] : 1,
                opacity: 1,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={transition}
            className={clsx(
                'absolute flex items-center justify-center rounded-md font-bold select-none shadow-sm'
            )}
            style={{
                width: '22.5%',
                height: '22.5%',
                backgroundColor,
                color,
                fontSize,
                zIndex: isMerged ? 20 : tile.toDelete ? 10 : 15,
            }}
        >
            {tile.val}
        </motion.div>
    );
};
