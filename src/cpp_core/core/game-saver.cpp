#include "game-saver.h"

namespace tfe::core {

    void GameSaver::save(const GameState& state) {
        // No-op
    }

    std::optional<GameState> GameSaver::load() {
        return std::nullopt;
    }

    void GameSaver::clearSave() {
        // No-op
    }

    bool GameSaver::hasSave() { return false; }

}  // namespace tfe::core