#include <emscripten/bind.h>
#include <sstream>
#include <iomanip>
#include "core/board.h"
#include "ai/expectimax_agent.h"
#include "core/types.h"
#include "core/game-observer.h"

using namespace emscripten;
using namespace tfe::core;
using namespace tfe::ai;
using namespace tfe;

// Wrapper to get move from Board object directly
int getBestMoveWrapper(ExpectimaxAgent& agent, const Board& board) {
    auto result = agent.getBestMove(board.getState().board);
    if (result.has_value()) {
        return static_cast<int>(result.value());
    }
    return -1;
}

// Wrapper to get bitboard as a hex string to avoid BigInt issues
std::string getBitboardWrapper(const Board& board) {
    std::stringstream ss;
    ss << "0x" << std::hex << board.getState().board;
    return ss.str();
}

struct GameObserverWrapper : public wrapper<IGameObserver> {
    EMSCRIPTEN_WRAPPER(GameObserverWrapper);
    void onTileSpawn(int r, int c, Tile value) override {
        call<void>("onTileSpawn", r, c, (int)value);
    }
    void onTileMerge(int r, int c, Tile value) override {
        call<void>("onTileMerge", r, c, (int)value);
    }
    void onTileMove(int fromR, int fromC, int toR, int toC, Tile value) override {
        call<void>("onTileMove", fromR, fromC, toR, toC, (int)value);
    }
    void onGameOver() override {
        call<void>("onGameOver");
    }
    void onGameReset() override {
        call<void>("onGameReset");
    }
};

EMSCRIPTEN_BINDINGS(my_module) {
    // Register vectors for getGrid
    register_vector<int>("VectorInt");
    register_vector<std::vector<int>>("VectorVectorInt");

    enum_<Direction>("Direction")
        .value("Up", Direction::Up)
        .value("Down", Direction::Down)
        .value("Left", Direction::Left)
        .value("Right", Direction::Right);

    class_<IGameObserver>("IGameObserver")
        .allow_subclass<GameObserverWrapper>("GameObserverWrapper");

    class_<Board>("Board")
        .constructor<>()
        .function("reset", &Board::reset)
        .function("move", &Board::move)
        .function("spawnRandomTile", &Board::spawnRandomTile)
        .function("getScore", &Board::getScore)
        .function("getHighScore", &Board::getHighScore)
        .function("hasWon", &Board::hasWon)
        .function("isGameOver", &Board::isGameOver)
        .function("getGrid", &Board::getGrid)
        .function("getBitboard", &getBitboardWrapper)
        .function("addObserver", &Board::addObserver, allow_raw_pointers())
        .function("removeObserver", &Board::removeObserver, allow_raw_pointers());

    class_<ExpectimaxAgent>("ExpectimaxAgent")
        .constructor<>()
        .function("getBestMove", &getBestMoveWrapper);
}