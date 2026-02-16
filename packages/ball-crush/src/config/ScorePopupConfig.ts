/**
 * Score popup (floating text) configuration.
 * Controls appearance and animation of score numbers that float up from matches.
 */
export const ScorePopupConfig = {
  // Font sizing
  baseFontSize: 24,
  maxFontSize: 48,
  fontFamily: 'bold Arial',

  // Animation
  floatSpeed: 50, // pixels per second upward drift
  fadeDuration: 1.0, // seconds until fully transparent
  scaleMultiplier: 1.2, // font size multiplier per cascade level (capped at maxFontSize)

  // Visual effects
  shadow: {
    blur: 4,
    offsetX: 2,
    offsetY: 2,
    color: 'rgba(0, 0, 0, 0.5)',
  },

  // Text outline for readability
  outline: {
    width: 2,
    color: '#000',
  },
} as const;
