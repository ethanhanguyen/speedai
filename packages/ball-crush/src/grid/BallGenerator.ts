import type { BallColor } from '../components/BallData.js';
import { GameplayConfig } from '../config/GameplayConfig.js';
import { WeightedPicker } from '@speedai/game-engine';

/**
 * Smart ball generator that prevents excessive cascades
 * by analyzing board state, cascade streak, and difficulty.
 */
export class BallGenerator {
  private picker = new WeightedPicker<BallColor>();
  /**
   * Generate next ball color for refill based on context.
   * Uses weighted probability to prevent infinite cascades.
   */
  generateForRefill(
    column: number,
    availableColors: BallColor[],
    columnHistory: BallColor[][],
    cascadeCount: number,
    columnColors: (BallColor | null)[],
  ): BallColor {
    const cfg = GameplayConfig.generation;

    // Build weighted color pool
    const weights = new Map<BallColor, number>();

    for (const color of availableColors) {
      let weight = 1.0;

      // Penalize recent colors in this column to increase variety
      const recentInColumn = columnHistory[column]?.filter(c => c === color).length || 0;
      weight *= Math.pow(cfg.recentColorPenalty, recentInColumn);

      // Penalize colors that appear in the column (avoid immediate matches)
      const countInColumn = columnColors.filter(c => c === color).length;

      if (cascadeCount <= GameplayConfig.dampening.normalThreshold) {
        // Normal mode: only slight penalty
        if (countInColumn >= 2) {
          weight *= cfg.normal.twoInColumnPenalty;
        }
      } else if (cascadeCount <= GameplayConfig.dampening.moderateThreshold) {
        // Moderate dampening: reduce matching probability
        if (countInColumn >= 2) {
          weight *= cfg.moderate.twoInColumnPenalty;
        } else if (countInColumn >= 1) {
          weight *= cfg.moderate.oneInColumnPenalty;
        }
      } else {
        // Aggressive dampening: heavily avoid matches
        if (countInColumn >= 2) {
          weight *= cfg.aggressive.twoInColumnPenalty;
        } else if (countInColumn >= 1) {
          weight *= cfg.aggressive.oneInColumnPenalty;
        }
      }

      weights.set(color, Math.max(weight, cfg.minWeight));
    }

    // Weighted random selection using WeightedPicker
    return this.picker.pick(availableColors, (color: BallColor) => weights.get(color) || 1);
  }
}
