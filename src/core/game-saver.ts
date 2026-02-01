import type { GameState } from './types';

export class GameSaver {
    private static STORAGE_KEY = '2048-game-state';
    private static SCORE_KEY = '2048-high-score';

    static save(state: GameState) {
        const serialized = JSON.stringify({
            board: state.board.toString(), // BigInt to string
            score: state.score,
        });
        localStorage.setItem(this.STORAGE_KEY, serialized);
    }

    static load(): GameState | null {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            return {
                board: BigInt(parsed.board),
                score: parsed.score,
            };
        } catch (e) {
            console.error('Failed to load save', e);
            return null;
        }
    }

    static saveHighScore(score: number) {
        localStorage.setItem(this.SCORE_KEY, score.toString());
    }

    static loadHighScore(): number {
        const score = localStorage.getItem(this.SCORE_KEY);
        return score ? parseInt(score, 10) : 0;
    }

    static clearSave() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}
