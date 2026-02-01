export const Theme = {
    // Colors
    BG_COLOR: '#bbada0',
    EMPTY_CELL_COLOR: '#cdc1b4',
    TEXT_DARK: '#776e65',
    TEXT_LIGHT: '#f9f6f2',

    // Dimensions (used for calculation logic if needed, but mainly handled by CSS/Tailwind)
    BOARD_PADDING: 10,
    CELL_PADDING: 10,

    // Animation
    ANIMATION_SPEED_SLIDE: 0.125, // seconds (1/8.0f)
    ANIMATION_SPEED_SCALE: 0.333, // seconds (1/3.0f)

    getTileColor: (value: number): string => {
        switch (value) {
            case 2:
                return '#eee4da'; // Standard start
            case 4:
                return '#ede0c8';
            case 8:
                return '#f2b179'; // Orange
            case 16:
                return '#f59563'; // Darker Orange
            case 32:
                return '#f67c5f'; // Red-Orange
            case 64:
                return '#f65e3b'; // Red
            case 128:
                return '#edcf72'; // Yellow-Gold
            case 256:
                return '#edcc61';
            case 512:
                return '#edc850';
            case 1024:
                return '#edc53f';
            case 2048:
                return '#edc22e';
            case 4096:
                return '#3c3a32'; // Deep Dark
            default:
                return '#3c3a32';
        }
    },

    getTextColor: (value: number): string => {
        return value <= 4 ? '#776e65' : '#f9f6f2';
    },

    getFontSize: (value: number): string => {
        if (value < 100) return '3rem'; // ~48px (Large)
        if (value < 1000) return '2.5rem'; // ~40px (Medium)
        return '1.8rem'; // ~30px (Small)
    },
};
