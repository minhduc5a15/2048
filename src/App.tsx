import { useEffect, useState, useRef } from 'react';
import { Grid } from './components/Grid';
import { useGame } from './hooks/useGame';
import { Direction } from './constants';
import { useSwipe } from './hooks/useSwipe';

function App() {
    const { tiles, floatingTexts, score, highScore, gameOver, move, reset, autoMove, isReady } =
        useGame();
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const autoPlayTimer = useRef<number | null>(null);
    const { handleTouchStart, handleTouchEnd } = useSwipe(move);

    // Auto Play Logic
    useEffect(() => {
        if (isAutoPlaying && !gameOver) {
            autoPlayTimer.current = window.setInterval(() => {
                autoMove();
            }, 20); // Speed of AI (Fast mode)
        } else {
            if (autoPlayTimer.current) {
                clearInterval(autoPlayTimer.current);
                autoPlayTimer.current = null;
            }
            if (gameOver) setIsAutoPlaying(false);
        }
        return () => {
            if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
        };
    }, [isAutoPlaying, gameOver, autoMove]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return;
            // Stop auto play on manual intervention
            if (
                isAutoPlaying &&
                ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(
                    e.key
                )
            ) {
                setIsAutoPlaying(false);
            }

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    move(Direction.Up);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    move(Direction.Down);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    move(Direction.Left);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    move(Direction.Right);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, gameOver, isAutoPlaying]);

    // Loading Screen
    if (!isReady) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf8ef] font-sans">
                <h1 className="text-4xl font-bold text-[#776e65] mb-4">2048</h1>
                <div className="text-[#776e65] text-xl animate-pulse">Loading Game Core...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#504439] to-[#2b251f] font-sans p-4 select-none overflow-hidden">
            {/* Game Card Frame */}
            <div className="bg-[#faf8ef] p-4 sm:p-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-[480px] border-[4px] border-[#bbada0]">
                {/* Header */}
                <div className="flex flex-row justify-between items-start mb-4 gap-2">
                    <div className="flex flex-col justify-between h-full">
                        <h1 className="text-5xl sm:text-6xl font-extrabold text-[#776e65] mb-0 drop-shadow-sm tracking-tighter leading-none">
                            2048
                        </h1>
                        <p className="text-[#776e65] font-medium text-sm sm:text-base mt-2">
                            Join the numbers to get <br className="hidden sm:block" />
                            <strong className="text-[#8f7a66] underline decoration-2 underline-offset-2">
                                2048!
                            </strong>
                        </p>
                    </div>
                    <div className="flex gap-2 self-start">
                        <div className="bg-[#bbada0] rounded-md p-1.5 min-w-[65px] text-center text-white shadow-inner border-b-2 border-[#a0948a]">
                            <div className="text-[10px] font-bold uppercase text-[#eee4da] tracking-widest">
                                Score
                            </div>
                            <div className="text-lg font-bold leading-tight">{score}</div>
                        </div>
                        <div className="bg-[#bbada0] rounded-md p-1.5 min-w-[65px] text-center text-white shadow-inner border-b-2 border-[#a0948a]">
                            <div className="text-[10px] font-bold uppercase text-[#eee4da] tracking-widest">
                                Best
                            </div>
                            <div className="text-lg font-bold leading-tight">{highScore}</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center mb-4 gap-2">
                    <p className="text-[#776e65] text-xs sm:text-sm font-medium opacity-80">
                        Join the tiles, get to 2048!
                    </p>
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                            className={`font-bold py-1.5 px-3 rounded text-sm sm:text-base transition-all transform active:scale-95 shadow-sm border-b-2 whitespace-nowrap cursor-pointer ${
                                isAutoPlaying
                                    ? 'bg-gradient-to-r from-[#edcf72] to-[#f65e3b] text-white border-[#df5a3b] hover:brightness-110'
                                    : 'bg-[#8f7a66] text-white border-[#7f6a56] hover:bg-[#9f8b77]'
                            }`}
                        >
                            {isAutoPlaying ? 'Stop AI' : 'Auto Play'}
                        </button>
                        <button
                            onClick={() => {
                                reset();
                                setIsAutoPlaying(false);
                            }}
                            className="bg-[#8f7a66] text-white font-bold py-1.5 px-3 rounded text-sm sm:text-base hover:bg-[#9f8b77] transition-all transform active:scale-95 shadow-sm border-b-2 border-[#7f6a56] whitespace-nowrap cursor-pointer"
                        >
                            New Game
                        </button>
                    </div>
                </div>

                {/* Game Container */}
                <div
                    className="relative w-full aspect-square touch-none bg-[#bbada0] rounded-lg p-[1.5%]"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <Grid
                        tiles={tiles}
                        floatingTexts={isAutoPlaying ? [] : floatingTexts}
                        isFastMode={isAutoPlaying}
                    />

                    {/* Game Over Overlay */}
                    {gameOver && (
                        <div className="absolute inset-0 bg-[rgba(238,228,218,0.73)] z-50 flex flex-col items-center justify-center rounded-lg animate-fade-in backdrop-blur-sm">
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#776e65] mb-3 drop-shadow-md">
                                Game Over!
                            </h2>
                            <button
                                onClick={reset}
                                className="bg-[#8f7a66] text-white font-bold py-2 px-6 rounded text-lg hover:bg-[#9f8b77] transition-all transform hover:scale-105 shadow-md border-b-4 border-[#7f6a56] cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-4 text-[#776e65] text-xs sm:text-sm leading-relaxed border-t-2 border-[#bbada0] pt-2">
                    <p>
                        <strong className="uppercase">How to play:</strong> Swipe (Mobile) or use{' '}
                        <strong>arrow keys</strong> (Desktop) to move tiles. Merge numbers to reach{' '}
                        <strong>2048!</strong>
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-4 text-center text-[#776e65] text-xs opacity-75 hover:opacity-100 transition-opacity">
                    Code by{' '}
                    <a
                        href="https://github.com/minhduc5a15"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline hover:text-[#5c554e] cursor-pointer"
                    >
                        minhduc5a15
                    </a>
                </div>
            </div>
        </div>
    );
}

export default App;
