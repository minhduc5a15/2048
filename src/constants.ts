export const Direction = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3,
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];
