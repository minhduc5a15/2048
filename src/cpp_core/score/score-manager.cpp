#include "score-manager.h"

namespace tfe::score {

    int ScoreManager::load_high_score() {
        return 0; // Always return 0 for now as we manage high score in JS
    }

    void ScoreManager::save_game(int finalScore, bool won) {
        // No-op
    }

}  // namespace tfe::score