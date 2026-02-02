#include <iostream>
#include <iomanip>
#include <vector>
#include <cstdint>
#include <bitset>

// Include necessary headers
#include "core/types.h"
#include "core/config.h"
#include "core/bitboard_ops.h"
#include "core/lookup_table.h"

// We will link against the .cpp files or include them. 
// For simplicity in this test, we assume we compile everything together.

using namespace tfe::core;

void printBoard(Bitboard b) {
    for (int r = 0; r < 4; ++r) {
        for (int c = 0; c < 4; ++c) {
            int val = (b >> ((r * 4 + c) * 4)) & 0xF;
            std::cout << std::setw(3) << val << " ";
        }
        std::cout << "\n";
    }
    std::cout << "Hex: " << std::hex << b << std::dec << "\n";
}

int main() {
    LookupTable::init();

    std::cout << "--- Test Transpose ---\\n";
    // 0 1 2 3
    // 4 5 6 7
    // 8 9 A B
    // C D E F
    // Hex: FEDCBA9876543210 (Little Endian?)
    // Row 0 is lowest bits.
    // Let's construct it manually to be sure.
    Bitboard b = 0;
    for(int r=0; r<4; ++r) {
        for(int c=0; c<4; ++c) {
            uint64_t val = r * 4 + c;
            b |= (val << ((r*4 + c)*4));
        }
    }
    
    std::cout << "Original:\n";
    printBoard(b);
    
    Bitboard t = BitboardOps::transpose64(b);
    std::cout << "Transposed:\n";
    printBoard(t);
    
    // Expected Transpose:
    // 0 4 8 C
    // 1 5 9 D
    // 2 6 A E
    // 3 7 B F
    
    std::cout << "\n--- Test Move ---\\n";
    // Setup:
    // 2 2 0 0  (Exponent 1, 1, 0, 0)
    // 0 0 4 0  (Exponent 0, 0, 2, 0)
    // 0 0 0 0
    // 0 0 0 0
    Bitboard game = 0;
    // Row 0: 1 at col 0, 1 at col 1
    game |= (1ULL << 0); // r0 c0
    game |= (1ULL << 4); // r0 c1
    // Row 1: 2 at col 2
    game |= (2ULL << (1 * 16 + 2 * 4)); 

    std::cout << "Game Board:\n";
    printBoard(game);

    auto [leftBoard, leftScore] = BitboardOps::executeMove(game, Direction::Left);
    std::cout << "Move Left:\n";
    printBoard(leftBoard);
    // Expected Row 0: 2 0 0 0 (Exponent 2) -> Value 4
    // Expected Row 1: 2 0 0 0 (Exponent 2) -> Value 4 (Moved to left)
    
    auto [rightBoard, rightScore] = BitboardOps::executeMove(game, Direction::Right);
    std::cout << "Move Right:\n";
    printBoard(rightBoard);
    // Expected Row 0: 0 0 0 2 (Exponent 2)
    
    auto [upBoard, upScore] = BitboardOps::executeMove(game, Direction::Up);
    std::cout << "Move Up:\n";
    printBoard(upBoard);
    // Expected:
    // 1 1 2 0 -> No merge
    // 0 0 0 0
    
    return 0;
}
