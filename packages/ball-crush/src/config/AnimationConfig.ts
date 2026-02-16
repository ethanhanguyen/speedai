/**
 * Animation timing configuration.
 * Tweak these values to adjust game feel and animation speed.
 */
export const AnimationConfig = {
  // Basic interactions
  swap: {
    duration: 0.15,
  },

  // Match clearing
  clear: {
    wobbleDuration: 0.06,
    shrinkDuration: 0.18,
    delayIncrement: 0.02, // stagger between balls
  },

  // Special ball formation (balls sucked into special)
  suck: {
    wobbleDuration: 0.05,
    duration: 0.25,
  },

  // Special ball creation sequence
  formation: {
    convergePause: 0.08, // pause after suck before charge
    chargeDuration: 0.12, // scale pulse 0.8 → 1.3
    chargeScaleMin: 0.8,
    chargeScaleMax: 1.3,
    burstDuration: 0.25, // 0 → 1.4 → 1.0
    burstOvershoot: 1.4,
    startDelay: -0.1, // start before suck completes (overlap)
    delayIncrement: 0.05, // stagger between multiple specials
  },

  // Legacy pop-in (replaced by formation for specials from matches)
  popIn: {
    overshootDuration: 0.2,
    overshootScale: 1.2,
    settleDuration: 0.1,
  },

  // Gravity & falling
  fall: {
    minDuration: 0.1,
    maxDuration: 1.2,
    bounceRatio: 0.12,
    bounceHeightMultiplier: 0.15, // 15% of cell size
    gravity: 800,
  },

  // Refill (new balls dropping from top)
  refill: {
    spawnOffsetY: -400, // pixels above target
    speedMultiplier: 0.7, // 70% of normal fall speed
    columnDelayIncrement: 0.02,
    ballDropDelayIncrement: 0.08,
  },

  // Level entrance (initial board fill)
  entrance: {
    columnDelayIncrement: 0.035,
    ballDropDelayIncrement: 0.045,
  },

  // Selection pulse
  pulse: {
    duration: 0.4,
    scale: 1.15,
  },

  // Special activation intros (per type)
  specialIntro: {
    striped_h: {
      anticipationDuration: 0.08,
      anticipationScale: { x: 0.8, y: 1.2 },
      stretchDuration: 0.25,
      stretchScale: { x: 3, y: 0.4 },
      fadeoutDuration: 0.12,
    },
    striped_v: {
      anticipationDuration: 0.08,
      anticipationScale: { x: 1.2, y: 0.8 },
      stretchDuration: 0.25,
      stretchScale: { x: 0.4, y: 3 },
      fadeoutDuration: 0.12,
    },
    bomb: {
      squashDuration: 0.1,
      squashScale: 0.7,
      explosionDuration: 0.3,
      explosionScale: 2.5,
      fadeoutDuration: 0.12,
    },
    rainbow: {
      pulseDuration: 0.15,
      pulseAlpha: 0.2,
      pulseScale: 1.4,
      expandDuration: 0.2,
      expandScale: 2.2,
      fadeoutDuration: 0.15,
    },
  },

  // Special destroy animations (affected cells)
  specialDestroy: {
    striped_h: {
      delayPerCell: 0.015, // based on distance
      squashDuration: 0.06,
      squashScale: { x: 1.5, y: 0.5 },
      shrinkDuration: 0.12,
    },
    striped_v: {
      delayPerCell: 0.015,
      squashDuration: 0.06,
      squashScale: { x: 0.5, y: 1.5 },
      shrinkDuration: 0.12,
    },
    bomb: {
      delayPerCell: 0.02,
      expandDuration: 0.06,
      expandScale: 1.3,
      shrinkDuration: 0.12,
    },
    rainbow: {
      randomDelayMax: 0.04,
      flash1Duration: 0.08,
      flash1Scale: 1.3,
      flash1Alpha: 0.4,
      flash2Duration: 0.06,
      flash2Scale: 1.4,
      shrinkDuration: 0.12,
    },
  },

  // Special effects overlay
  effects: {
    beamDuration: 0.25,
    ringDuration: 0.3,
    colorBurstDuration: 0.3,
    expandSpeed: 2.5, // multiplier for expansion
    fadeEarlyThreshold: 0.3, // start fading at this progress
    fadeEarlyDuration: 0.7, // fade over this fraction
    fadeLateThreshold: 0.2, // for ring
    fadeLateDuration: 0.8,
    burstFadeThreshold: 0.5,
    burstFadeDuration: 0.5,
    burstReachProgress: 2.5, // lines reach targets at t * this
  },

  // Board shuffle visual (B7)
  shuffle: {
    shrinkDuration: 300,
    shrinkScale: 0.1,
    scatterDuration: 400,
    reformDuration: 500,
    reformDelay: 100,
  },
} as const;
