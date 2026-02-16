/**
 * Hint system configuration.
 * Controls idle hint timing and visual appearance.
 */
export const HintConfig = {
  // Timing
  idleSubtleSeconds: 5, // show subtle hint after this many seconds
  idleStrongSeconds: 10, // show strong hint (with arrow) after this many seconds

  // Pulse intensity
  pulseSubtle: 0.5, // scale multiplier for subtle hint pulse
  pulseStrong: 1.0, // scale multiplier for strong hint pulse

  // Arrow rendering
  arrow: {
    width: 4,
    color: '#FFD700',
    glowBlur: 8,
    glowColor: 'rgba(255, 215, 0, 0.6)',
    curveAmount: 0.3, // bezier curve offset as ratio of distance
    arrowHeadSize: 12,
  },
} as const;
