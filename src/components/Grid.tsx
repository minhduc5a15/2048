import { motion } from 'framer-motion';
import type { RenderTile, FloatingText as FloatingTextType } from '../hooks/useGame';
import { Tile } from './Tile';

interface GridProps {
    tiles: RenderTile[];
    floatingTexts: FloatingTextType[];
    isFastMode?: boolean;
}

const getPos = (index: number) => `${2 + index * (22.5 + 2)}%`;

const FloatingText = ({ text }: { text: FloatingTextType }) => {
    return (
        <motion.div
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute z-50 font-bold pointer-events-none flex items-center justify-center"
            style={{
                width: '22.5%',
                height: '22.5%',
                fontSize: 'clamp(20px, 5vw, 30px)',
                color: '#776e65',
                top: getPos(text.y),
                left: getPos(text.x),
            }}
        >
            <div className="whitespace-nowrap">+{text.val}</div>
        </motion.div>
    );
};

export const Grid = ({ tiles, floatingTexts = [], isFastMode = false }: GridProps) => {
    // Create 16 empty cells for background
    const emptyCells = Array(16).fill(null);

    return (
        <div className="relative bg-[#bbada0] rounded-lg w-full h-full">
            {/* Background Grid */}
            {emptyCells.map((_, i) => {
                const r = Math.floor(i / 4);
                const c = i % 4;
                return (
                    <div
                        key={i}
                        className="absolute bg-[#cdc1b4] rounded-md"
                        style={{
                            width: '22.5%',
                            height: '22.5%',
                            top: getPos(r),
                            left: getPos(c),
                        }}
                    />
                );
            })}

            {/* Foreground Tiles (Absolute) */}
            <div className="absolute inset-0">
                {tiles.map((tile) => (
                    <Tile key={tile.id} tile={tile} isFastMode={isFastMode} />
                ))}

                {!isFastMode && floatingTexts.map((ft) => <FloatingText key={ft.id} text={ft} />)}
            </div>
        </div>
    );
};
