export const Config = {
    DEFAULT_BOARD_SIZE: 4,
    WINNING_EXPONENT: 11, // 2^11 = 2048
    SPAWN_PROBABILITY_2: 0.9,
    TILE_EXPONENT_LOW: 1, // 2^1 = 2
    TILE_EXPONENT_HIGH: 2, // 2^2 = 4

    // Masks for bitwise operations (BigInt literals requiring 'n' suffix)
    ROW_MASK: 0xffffn,
    COL_MASK: 0x000f000f000f000fn,
};
