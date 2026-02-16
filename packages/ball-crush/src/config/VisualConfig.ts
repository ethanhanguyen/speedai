/**
 * Visual rendering configuration.
 * Tweak these values to adjust visual appearance and effects.
 */
export const VisualConfig = {
  // Ball rendering
  ball: {
    radius: 18,
    gradient: {
      highlightOffsetX: -0.3, // as ratio of radius
      highlightOffsetY: -0.3,
      highlightSize: 0.1,
      innerStop: 0.7,
      darkenAmount: 0.3,
    },
    highlight: {
      alpha: 0.4,
      offsetX: -0.25, // as ratio of radius
      offsetY: -0.3,
      radiusX: 0.35,
      radiusY: 0.2,
      rotation: -0.3,
    },
  },

  // Grid cells
  cell: {
    backgroundAlpha: 0.06,
    borderRadius: 6,
  },

  // Selection highlight
  selector: {
    lineWidth: 3,
    alphaBase: 0.6,
    alphaOscillation: 0.4,
    pulseSpeed: 6,
    borderRadius: 8,
    paddingFromCell: 2,
  },

  // Special ball overlays
  special: {
    striped: {
      lineWidth: 2,
      lineAlpha: 0.8,
      spacing: 4, // pixels between stripes
      count: 5, // number of stripes (i = -2 to 2)
      edgePadding: 2,
    },
    bomb: {
      ringRadius: 0.65, // as ratio of ball radius
      ringLineWidth: 2.5,
      crossLineWidth: 1.5,
      crossSize: 0.4, // as ratio of ball radius
      ringAlpha: 0.7,
    },
    rainbow: {
      ringRadius: 0.75, // as ratio of ball radius
      lineWidth: 3,
      colors: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'],
    },
  },

  // Special effect overlays (beams, rings, etc.)
  effects: {
    beam: {
      heightMultiplier: 0.4, // CELL_SIZE * this
      alphaMain: 0.7,
      alphaCore: 0.9,
      gradientStopInner: 0.15,
      gradientStopOuter: 0.85,
      coreBaseWidth: 2,
      coreWidthMultiplier: 0.1,
      heightShrink: 0.6, // (1 - t * this)
    },
    ring: {
      lineWidthMultiplier: 0.2, // CELL_SIZE * this
      lineWidthShrink: 0.7, // (1 - t * this)
      alphaRing: 0.8,
      alphaFill: 0.15,
    },
    colorBurst: {
      lineWidth: 2,
      shadowBlur: 10,
      alpha: 0.8,
      curveBend: 0.1, // curve offset as ratio of distance
      tipCircleRadius: 3,
      tipCircleThreshold: 0.3, // show when progress > this
      tipCircleAlpha: 0.6,
    },
  },

  // Particles
  particles: {
    match: {
      count: 6,
      speed: 120,
      lifetime: 0.4,
      size: 3,
    },
    suck: {
      count: 4,
      speed: 100,
      lifetime: 0.3,
      size: 2,
    },
    special: {
      count: 6,
      speed: 120,
      lifetime: 0.4,
      size: 3,
    },
  },

  // Screen effects
  shake: {
    match: {
      intensity: 4,
      duration: 0.3,
    },
    special: {
      intensity: 4,
      duration: 0.3,
    },
    combo: {
      intensity: 6,
      duration: 0.4,
    },
  },

  flash: {
    match: {
      duration: 0.15,
      color: '#fff',
    },
    special: {
      duration: 0.15,
      color: '#fff',
    },
    combo: {
      duration: 0.2,
      color: '#fff',
    },
  },

  // Border glow (combo escalation)
  borderGlow: {
    width: 8,
    colorLow: '#FF8800',
    colorHigh: '#FF0000',
    blurRadius: 12,
  },

  // Last-move tension (B5)
  lastMove: {
    vignetteAlpha: 0.5,
    pulseSpeed: 2.0,
    dramaticPauseDuration: 500,
  },

  // Idle animations (B6)
  idleAnimations: {
    breathe: {
      scale: 0.02,
      speed: 1.5,
      rowStagger: 0.3,
    },
    sparkle: {
      interval: 3000,
      duration: 500,
      alpha: 0.6,
      radius: 24,
    },
    rainbowHueSpeed: 60, // degrees per second
  },
} as const;
