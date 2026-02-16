/**
 * Gameplay mechanics configuration.
 * Tweak these values to adjust difficulty and game balance.
 */
export const GameplayConfig = {
  // Scoring
  score: {
    baseMatchPoints: 10, // points per ball in match × cascade multiplier
    specialActivationPoints: 15, // points per ball cleared by special × cascade multiplier
  },

  // Cascade system
  cascade: {
    multiplierIncrement: 1, // how much to increase multiplier per cascade
    toastThreshold: 2, // show "Nx Cascade!" when count >= this
    toastDuration: 1, // seconds
  },

  // Difficulty dampening (prevent infinite cascades)
  dampening: {
    normalThreshold: 1, // cascade count <= this = normal mode
    moderateThreshold: 4, // cascade count <= this = moderate dampening
    // Above moderate = aggressive dampening
  },

  // Ball generation weights
  generation: {
    recentColorPenalty: 0.6, // pow(this, count) for recent colors in column
    minWeight: 0.01, // minimum weight for any color

    // Normal mode (cascade <= 1)
    normal: {
      twoInColumnPenalty: 0.5,
    },

    // Moderate dampening (2-4 cascades)
    moderate: {
      twoInColumnPenalty: 0.2,
      oneInColumnPenalty: 0.6,
    },

    // Aggressive dampening (5+ cascades)
    aggressive: {
      twoInColumnPenalty: 0.05,
      oneInColumnPenalty: 0.3,
    },
  },

  // Match detection
  match: {
    antiMatchMaxAttempts: 50, // max attempts to avoid pre-existing matches when filling board
  },

  // UI thresholds
  ui: {
    lowMovesThreshold: 5, // show red warning when moves <= this
    progressBarWarningThreshold: 0.8, // change color when progress >= this
  },

  // Combo escalation effects
  combo: {
    shake2x: { intensity: 2, duration: 0.2 },
    shake3x: { intensity: 4, duration: 0.3 },
    shake5x: { intensity: 8, duration: 0.5 },
    slowMoScale: 0.3, // time scale (0.3 = 70% slower)
    slowMoDuration: 0.3, // seconds
    glowMaxIntensity: 1.0,
    glowDivisor: 10, // cascadeCount / this = glow intensity
    toast2x: '2x Cascade!',
    toast3x: '3x Cascade!',
    toast5x: 'INCREDIBLE!',
  },
} as const;
