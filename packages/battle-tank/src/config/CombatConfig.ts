import type { ParticleBurstConfig } from '@speedai/game-engine';
import type { DamageType } from './ArmorConfig.js';
import type { ShakeDef } from './WeaponConfig.js';

export type ExplosionType = 'bomb' | 'laser' | 'plasma' | 'nuclear';

export interface ExplosionDef {
  spriteKeys: string[];
  fps: number;
  displaySize: number;
}

export const EXPLOSION_DEFS: Record<ExplosionType, ExplosionDef> = {
  bomb: {
    spriteKeys: [
      'explosion-bomb-0', 'explosion-bomb-1', 'explosion-bomb-2', 'explosion-bomb-3',
      'explosion-bomb-4', 'explosion-bomb-5', 'explosion-bomb-6', 'explosion-bomb-7',
      'explosion-bomb-8', 'explosion-bomb-9',
    ],
    fps: 20,
    displaySize: 64,
  },
  laser: {
    spriteKeys: [
      'explosion-laser-0', 'explosion-laser-1', 'explosion-laser-2', 'explosion-laser-3',
      'explosion-laser-4', 'explosion-laser-5', 'explosion-laser-6', 'explosion-laser-7',
      'explosion-laser-8', 'explosion-laser-9', 'explosion-laser-10',
    ],
    fps: 22,
    displaySize: 56,
  },
  plasma: {
    spriteKeys: [
      'explosion-plasma-0', 'explosion-plasma-1', 'explosion-plasma-2', 'explosion-plasma-3',
      'explosion-plasma-4', 'explosion-plasma-5', 'explosion-plasma-6', 'explosion-plasma-7',
      'explosion-plasma-8', 'explosion-plasma-9',
    ],
    fps: 20,
    displaySize: 60,
  },
  nuclear: {
    spriteKeys: [
      'explosion-nuclear-0', 'explosion-nuclear-1', 'explosion-nuclear-2', 'explosion-nuclear-3',
      'explosion-nuclear-4', 'explosion-nuclear-5', 'explosion-nuclear-6', 'explosion-nuclear-7',
      'explosion-nuclear-8', 'explosion-nuclear-9', 'explosion-nuclear-10',
    ],
    fps: 18,
    displaySize: 80,
  },
};

export const COMBAT_CONFIG = {
  projectilePoolSize: 40,

  playerHP: 100,

  explosion: EXPLOSION_DEFS.bomb, // backward compat default

  impact: {
    spriteKeys: [
      'impact-0', 'impact-1', 'impact-2', 'impact-3',
    ],
    fps: 24,
    displaySize: 24,
  },

  damageNumber: {
    floatSpeed: 40,  // px/s upward
    fadeTime: 0.6,   // seconds
    font: 'bold 14px monospace',
    color: '#ff4444',
  },

  smokeParticles: {
    x: 0, y: 0, // set at runtime
    count: 3,
    speed: 30,
    lifetime: 0.8,
    size: 3,
    colors: ['#888', '#666', '#aaa'],
    gravity: -20,
  } satisfies ParticleBurstConfig,

  impactParticles: {
    x: 0, y: 0,
    count: 8,
    speed: 120,
    lifetime: 0.3,
    size: 3,
    colors: ['#FFD700', '#FF6B6B', '#FF8C00'],
  } satisfies ParticleBurstConfig,

  destructionParticles: {
    x: 0, y: 0,
    count: 16,
    speed: 160,
    lifetime: 0.5,
    size: 4,
    colors: ['#FF4500', '#FF6B00', '#FFD700', '#333'],
  } satisfies ParticleBurstConfig,

  /** HP thresholds for damage states (fraction of max). */
  damageStates: {
    cracked:    0.50, // orange tint on hull
    smoking:    0.25, // light gray smoke begins
    heavySmoke: 0.10, // thick black smoke + fire sparks
  },

  /**
   * Speed multipliers applied per damage tier.
   * Keyed to match damageStates thresholds — no magic numbers.
   */
  movementPenalty: {
    healthy:    1.00, // above smoking threshold — no penalty
    smoking:    0.70, // 25–10% HP — 30% speed reduction
    heavySmoke: 0.45, // ≤10% HP — 55% speed reduction (limp)
  },

  /** Hull tint at cracked state. */
  crackedTint: 'rgba(255, 80, 0, 0.25)',

  coin: {
    spriteKeys: [
      'coin-0', 'coin-1', 'coin-2', 'coin-3',
      'coin-4', 'coin-5', 'coin-6', 'coin-7',
    ],
    animFps: 10,
    displaySize: 16,
    coinsPerDrop: 3,
    dropScatter: 20,
    pickupRadius: 28,
    pickupParticles: {
      x: 0, y: 0,
      count: 6,
      speed: 80,
      lifetime: 0.3,
      size: 3,
      colors: ['#FFD700', '#FFC107', '#FFE082'],
    } satisfies ParticleBurstConfig,
  },

  /** HP bar drawn above enemy tanks in world space. */
  enemyHpBar: {
    width: 40,             // px
    height: 5,             // px
    yOffset: -38,          // px above tank center (negative = up)
    lowHpThreshold: 0.4,   // ratio below which bar turns red
    colors: {
      bg:   '#222222',
      full: '#44dd44',
      low:  '#dd4444',
    },
  },

  /** Per-role hull tint overlays. */
  roleTints: {
    grunt:   'rgba(200, 50, 50, 0.3)',
    flanker: 'rgba(220, 180, 30, 0.3)',
    sniper:  'rgba(50, 100, 220, 0.3)',
    rusher:  'rgba(50, 200, 80, 0.3)',
  } as Record<string, string>,

  killSlowMo: {
    scale: 0.3,
    duration: 0.3,
  },

  gameOverTransition: {
    lose: { duration: 0.8, slowMoScale: 0.05 },
    win:  { duration: 1.5, slowMoScale: 0.3  },
    /** Seconds over which the black fade-out ramps from 0 → 1. */
    fadeIn: 0.4,
  },

  /** Trajectory preview for rifled gun. */
  trajectoryPreview: {
    segmentCount: 3,      // max segments (initial + 2 bounces)
    stepsPerSegment: 80,  // simulation steps per segment
    stepPx: 3,            // world px per step
    dotSpacingPx: 14,     // px between dots
    dotRadius: 2,
    alpha: 0.55,
    color: '#ffffff',
  },

  /** Howitzer landing-zone indicator. */
  howitzerIndicator: {
    radiusPx: 32,
    lineWidth: 2,
    color: '#ff3333',
    pulseAlphaMin: 0.3,
    pulseAlphaMax: 0.85,
  },

  /** Laser beam layers — outer to inner — plus continuous-mode VFX params. */
  laserBeam: {
    layers: [
      { widthPx: 8,   color: 'rgba(0,220,255,0.18)' },
      { widthPx: 4,   color: 'rgba(120,240,255,0.55)' },
      { widthPx: 1.5, color: 'rgba(220,255,255,0.95)' },
    ],
    // Heat bloom: layer widths multiply by this range based on heat ratio
    minWidthMultiplier: 0.8,
    maxWidthMultiplier: 2.2,
    // Beam flicker (sinusoidal width oscillation while firing)
    flickerHz: 28,
    flickerAmplitudePx: 0.7,
    // Muzzle entry glow (radial gradient at beam origin)
    muzzleGlowMaxRadius: 22,
    muzzleGlowMaxAlpha: 0.65,
    // Terminus glow at impact point
    terminusGlowMaxRadius: 14,
    terminusGlowMaxAlpha: 0.80,
    // Barrel tint color applied to turret hull while firing (low opacity)
    barrelTintColor: 'rgba(0,200,255,0.28)',
    // Screen-edge vignette intensity ramp: 0 at 60% heat, max at 100%
    overheatVignetteMaxAlpha: 0.20,
  },

  /** Laser heat bar (drawn below weapon name when laser is equipped). */
  laserHeatBar: {
    x: 16,
    y: 112,
    width: 160,
    height: 8,
    emptyColor: '#1a2a3a',
    coolColor: '#00aaff',
    hotColor:  '#ff6600',
    overheatColor: '#ff2200',
    overheatFlashHz: 8,
    borderColor: '#111',
    borderWidth: 1,
    showThreshold: 0.02, // only render bar when heat > 2%
  },

  /** Railgun charge bar config. */
  chargeBar: {
    x: 16,
    y: 88,
    width: 160,
    height: 10,
    emptyColor: '#333',
    fillColor: '#00cfff',
    readyColor: '#ffffff',
    borderColor: '#111',
    borderWidth: 1,
  },

  /** Bomb entity display. */
  bomb: {
    displayPx: 18,
    armingColor: '#ff8800',
    armedColor:  '#ff2200',
    remoteColor: '#aa00ff',
  },

  /** Splash / bomb detonation particles. */
  splashParticles: {
    x: 0, y: 0,
    count: 20,
    speed: 200,
    lifetime: 0.6,
    size: 5,
    colors: ['#FF4500', '#FF8C00', '#FFD700', '#FF6B00'],
  } satisfies ParticleBurstConfig,

  // ---------------------------------------------------------------------------
  // Projectile feel — Phase 4.5 additions
  // ---------------------------------------------------------------------------

  /** Fallback tracer used when weapon.tracerStyle is absent (should not happen). */
  defaultTracer: {
    color: '#ffd040',
    length: 16,
    width: 2,
  },

  /** Per-damage-type impact particle overrides merged over base impactParticles. */
  damageTypeImpact: {
    kinetic:   { colors: ['#ffd040', '#ffffff', '#ff8c00'], speed: 120, count: 8 },
    explosive: { colors: ['#ff4500', '#ff8c00', '#ffcc00', '#666666'], speed: 180, count: 14, size: 5 },
    energy:    { colors: ['#00e5ff', '#80ffff', '#ffffff'], speed: 80, count: 6, size: 2 },
  } as Record<DamageType, Partial<ParticleBurstConfig>>,

  /** Railgun world-space charge glow drawn at muzzle tip. */
  railgunCharge: {
    glowColor: '#00cfff',
    glowMaxRadius: 18,   // px at full charge
    glowMinAlpha: 0.15,
    glowMaxAlpha: 0.85,
    readyFlashHz: 6,     // pulse frequency when fully charged
  },

  // ---------------------------------------------------------------------------
  // Hit reactions — receiving end
  // ---------------------------------------------------------------------------

  /** Hull flash color + duration per damage type when an entity takes a hit. */
  hitFlash: {
    kinetic:   { color: 'rgba(255,255,255,0.70)', duration: 0.08 },
    explosive: { color: 'rgba(255,140,0,0.70)',   duration: 0.12 },
    energy:    { color: 'rgba(0,220,255,0.70)',   duration: 0.10 },
  } as Record<DamageType, { color: string; duration: number }>,

  /** Camera shake applied when the player tank takes a hit. */
  playerHitShake: {
    kinetic:   { intensity: 3, duration: 0.12, decay: 'quadratic' },
    explosive: { intensity: 6, duration: 0.22, decay: 'quadratic' },
    energy:    { intensity: 2, duration: 0.10, decay: 'linear'    },
  } as Record<DamageType, ShakeDef>,

  // ---------------------------------------------------------------------------
  // Damage state smoke — three tiers
  // ---------------------------------------------------------------------------

  /** Light gray puffs — 25–50% HP. Emitted every lightSmokeIntervalS seconds. */
  lightSmokeParticles: {
    x: 0, y: 0,
    count: 2,
    speed: 20,
    size: 4,
    colors: ['#999999', '#bbbbbb'],
    gravity: -15,
    lifetime: 1.0,
  } satisfies ParticleBurstConfig,

  /** Thick dark smoke — 10–25% HP. Emitted every heavySmokeIntervalS seconds. */
  heavySmokeParticles: {
    x: 0, y: 0,
    count: 4,
    speed: 15,
    size: 7,
    colors: ['#222222', '#333333', '#111111'],
    gravity: -12,
    lifetime: 1.4,
  } satisfies ParticleBurstConfig,

  /** Orange fire sparks — 0–10% HP (critical). Emitted every fireIntervalS seconds. */
  fireParticles: {
    x: 0, y: 0,
    count: 3,
    speed: 40,
    size: 3,
    colors: ['#ff4500', '#ff8c00', '#ffcc00'],
    gravity: -30,
    lifetime: 0.4,
  } satisfies ParticleBurstConfig,

  /** Emit intervals (seconds) per damage tier. */
  smokeEmitIntervals: {
    light:  0.50,  // 25–50% HP
    heavy:  0.30,  // 10–25% HP
    fire:   0.15,  // 0–10% HP (critical)
  },

  // ---------------------------------------------------------------------------
  // Phase 5.4 — Armor Deflection VFX
  // ---------------------------------------------------------------------------

  /** Silver spark burst emitted when a kinetic round ricochets off armor. */
  deflection: {
    ricochetParticles: {
      x: 0, y: 0,
      count: 6,
      speed: 130,
      size: 2,
      colors: ['#e8e8e8', '#c0c0c0', '#ffffff'],
      lifetime: 0.35,
    } satisfies ParticleBurstConfig,
    /** Floating text shown on ricochet (world space, above hit point). */
    ricochetLabelText:  'RICO',
    ricochetLabelColor: '#a0a0a0',
  },
};
