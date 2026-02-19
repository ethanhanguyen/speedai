import type { DamageType } from './ArmorConfig.js';
import type { ParticleBurstConfig } from '@speedai/game-engine';

export type { DamageType };

// ---------------------------------------------------------------------------
// Behavior union — one per fire mode
// ---------------------------------------------------------------------------

export type WeaponBehavior =
  | {
      kind: 'ballistic';
      spread?: number;        // radians half-angle for random deviation
      tracerEvery?: number;   // show colored tracer every N shots
      knockbackPx?: number;   // velocity impulse applied to target on hit
      bouncesMax?: number;    // bounces off walls before despawning
      pelletCount?: number;   // spawn N projectiles per shot (shotgun)
      maxRangePx?: number;    // despawn when distanceTraveled >= this value
      rangeDropoff?: number;  // fraction (0–1) of maxRangePx over which alpha fades to 0
    }
  | {
      kind: 'charge';
      chargeMs: number;    // ms to hold before shot is ready
      piercesMax: number;  // number of entities a single shot can pierce
    }
  | {
      kind: 'hitscan';
      persistMs: number;             // beam fade duration (ms) after release
      beamLayerCount: number;        // concentric line layers (3 = core + glow + outer)
      maxRangePx: number;            // raycast cutoff
      continuousMode: boolean;       // hold-to-fire every frame (vs legacy click)
      damageTickIntervalMs: number;  // ms between batched damage events (throttle VFX spam)
      heatCapacity: number;          // seconds of continuous fire before lockout
      heatPerSec: number;            // heat units added per second while firing
      cooldownPerSec: number;        // heat units removed per second when idle
      overheatLockoutSec: number;    // forced cooldown duration after max heat
    }
  | {
      kind: 'splash';
      splashRadiusPx: number;  // AoE damage radius on detonation
      indicatorPulseHz: number; // indicator circle pulse frequency
    };

// ---------------------------------------------------------------------------
// Weapon definition
// ---------------------------------------------------------------------------

export interface MuzzleFlashDef {
  spriteKeys: string[];
  fps: number;
  width: number;
  height: number;
}

/** Per-weapon tracer line drawn behind each in-flight projectile. */
export interface TracerStyle {
  color: string;
  glowColor?: string;  // ctx.shadowColor; omit = no glow
  glowBlur?: number;   // ctx.shadowBlur in px
  length: number;      // px behind projectile center
  width: number;       // lineWidth
}

/** In-flight particle trail emitted from ballistic projectiles. */
export interface TrailConfig {
  emitIntervalMs: number;                  // ms between particle burst emissions
  particles: Partial<ParticleBurstConfig>; // merged over base smokeParticles
}

/** World-space arc showing reload progress at the muzzle tip (slow weapons). */
export interface LoadingRingDef {
  radiusPx: number;
  lineWidth: number;
  color: string;
  readyColor: string;  // flashed briefly when cooldown reaches 0
}

export interface ShakeDef {
  intensity: number; // px
  duration: number;  // seconds
  decay?: 'linear' | 'quadratic'; // amplitude envelope; default linear
  /** Continuous shake applied per-second while charging (charge weapons only). */
  buildup?: { rampPerSec: number; maxIntensity: number };
}

/** Turret/barrel visual paired with this weapon. */
export interface TurretVisual {
  spriteKey: string;
  width: number;       // display px
  height: number;      // display px
  pivotY: number;      // 0–1, pivot from top of turret sprite
}

export type UnitClass = 'any' | 'tank' | 'infantry';

export interface WeaponDef {
  id: string;
  name: string;
  damage: number;
  fireRate: number;           // rounds per second
  projectileSpeed: number;    // px/s (0 for hitscan)
  projectileLifetime: number; // seconds (0 for hitscan; overridden at fire-time for splash)
  shellSpriteKey: string;
  shellWidth: number;         // display px
  shellHeight: number;        // display px
  muzzleFlash: MuzzleFlashDef;
  shakeOnFire: ShakeDef;
  shakeOnHit: ShakeDef;
  behavior: WeaponBehavior;
  damageType: DamageType;
  /** Which unit class may equip this weapon: 'tank' | 'infantry' | 'any'. */
  unitClass: UnitClass;
  /** Barrel kick in px along the barrel axis on fire; springs back via recoilSpring. */
  recoilPx: number;
  /** Spring constant for recoil return (higher = snappier). */
  recoilSpring: number;
  /** Velocity impulse applied to any hit entity regardless of behavior kind. */
  hitStaggerPx: number;
  /** Tracer line drawn behind each in-flight projectile. */
  tracerStyle: TracerStyle;
  /** Optional in-flight particle trail (heavy/explosive weapons). */
  trailConfig?: TrailConfig;
  /** World-space reload arc drawn at muzzle tip (slow weapons: fireRate ≤ 1). */
  loadingRing?: LoadingRingDef;
  /** Turret/barrel visual for this weapon. Used by garage + assembleLoadout(). */
  turret: TurretVisual;
  /** Weight in abstract units. Contributes to total loadout weight → P/W ratio. */
  weight: number;
  /** ms to stow (retract) the current weapon barrel before swapping. */
  switchOutMs: number;
  /** ms to draw (extend) the new weapon barrel before it's ready to fire. */
  switchInMs: number;
  /**
   * Degrees the turret sweeps away from aim angle during stow (pivot motion).
   * Distinct from recoil: this is a deliberate lateral traversal, not a fire reaction.
   * Larger = more dramatic stow sweep. Direction controlled by WEAPON_SWITCH_CONFIG.pivotDir.
   */
  switchPivotDeg: number;
}

/**
 * Tuning constants for the mechanical weapon-switch animation.
 * stowRecoilMult   — stow snap kick = weapon.recoilPx × mult / 0.016 (complementary, not primary).
 * drawOffsetMult   — draw starts barrel = weapon.recoilPx × mult px behind rest.
 * drawMinOffsetPx  — floor on draw start offset (for low-recoil weapons like Laser).
 * pivotDir         — 1 = clockwise sweep during stow, −1 = counter-clockwise.
 */
export const WEAPON_SWITCH_CONFIG = {
  stowRecoilMult:       0.8,
  drawOffsetMult:       1.8,
  drawMinOffsetPx:      10,
  /** Direction of turret pivot sweep during stow (1 = CW, −1 = CCW). */
  pivotDir:             1 as 1 | -1,
  /** Fraction of switchOutMs over which turret alpha decays 1→0. */
  turretFadeOutFraction: 0.85,
  /** Fraction of switchInMs over which turret alpha rises 0→1. */
  turretFadeInFraction:  0.45,
} as const;

// ---------------------------------------------------------------------------
// Shared muzzle flash animation sets
// ---------------------------------------------------------------------------

const MUZZLE_FLASH_A: MuzzleFlashDef = {
  spriteKeys: ['muzzle-flash-0', 'muzzle-flash-1', 'muzzle-flash-2', 'muzzle-flash-3'],
  fps: 24,
  width: 32,
  height: 32,
};

const MUZZLE_FLASH_HEAVY: MuzzleFlashDef = {
  spriteKeys: ['muzzle-flash-0', 'muzzle-flash-1', 'muzzle-flash-2', 'muzzle-flash-3'],
  fps: 20,
  width: 48,
  height: 48,
};

// ---------------------------------------------------------------------------
// Weapon definitions — GUN_01 through GUN_08 (player weapons, keys 1–8)
// Source sprite sizes: Gun_01=94x212 Gun_02=86x228 Gun_03=66x176
//   Gun_04=94x191 Gun_05=76x194 Gun_06=71x164 Gun_07=86x218 Gun_08=81x177
// Display sizes scaled to ~20-24 width, height proportional.
// ---------------------------------------------------------------------------

/** Gun_01 — Medium Cannon. Balanced starter. */
export const GUN_01: WeaponDef = {
  id: 'gun-01',
  name: 'Medium Cannon',
  damage: 20,
  fireRate: 3,
  projectileSpeed: 400,
  projectileLifetime: 2,
  shellSpriteKey: 'medium-shell',
  shellWidth: 8,
  shellHeight: 16,
  muzzleFlash: MUZZLE_FLASH_A,
  shakeOnFire: { intensity: 2, duration: 0.1, decay: 'quadratic' },
  shakeOnHit:  { intensity: 3, duration: 0.08, decay: 'quadratic' },
  behavior: { kind: 'ballistic' },
  damageType: 'kinetic',
  unitClass: 'any',
  recoilPx: 5,
  recoilSpring: 280,
  hitStaggerPx: 12,
  tracerStyle: { color: '#ffd040', length: 20, width: 2 },
  turret: { spriteKey: 'gun-01', width: 20, height: 46, pivotY: 0.8 },
  weight: 10,
  switchOutMs:    280,
  switchInMs:     320,
  switchPivotDeg: 20,
};

/** Gun_02 — Machine Gun. Infantry only. */
export const GUN_02: WeaponDef = {
  id: 'gun-02',
  name: 'Machine Gun',
  damage: 8,
  fireRate: 8,
  projectileSpeed: 350,
  projectileLifetime: 1.5,
  shellSpriteKey: 'light-shell',
  shellWidth: 5,
  shellHeight: 12,
  muzzleFlash: { ...MUZZLE_FLASH_A, fps: 30, width: 24, height: 24 },
  shakeOnFire: { intensity: 1, duration: 0.05, decay: 'linear' },
  shakeOnHit:  { intensity: 1, duration: 0.04, decay: 'linear' },
  behavior: {
    kind: 'ballistic',
    spread: Math.PI / 36, // ±5°
    tracerEvery: 4,
  },
  damageType: 'kinetic',
  unitClass: 'infantry',
  recoilPx: 2,
  recoilSpring: 400,
  hitStaggerPx: 4,
  tracerStyle: { color: '#ff9900', length: 12, width: 1.5 },
  turret: { spriteKey: 'gun-02', width: 18, height: 48, pivotY: 0.8 },
  weight: 6,
  switchOutMs:    200,
  switchInMs:     220,
  switchPivotDeg: 15,
};

/** Gun_03 — Heavy Cannon. Slow, powerful, knockback. */
export const GUN_03: WeaponDef = {
  id: 'gun-03',
  name: 'Heavy Cannon',
  damage: 80,
  fireRate: 0.5,
  projectileSpeed: 500,
  projectileLifetime: 2.5,
  shellSpriteKey: 'heavy-shell',
  shellWidth: 12,
  shellHeight: 22,
  muzzleFlash: MUZZLE_FLASH_HEAVY,
  shakeOnFire: { intensity: 4, duration: 0.15, decay: 'quadratic' },
  shakeOnHit:  { intensity: 5, duration: 0.12, decay: 'quadratic' },
  behavior: { kind: 'ballistic', knockbackPx: 80 },
  damageType: 'kinetic',
  unitClass: 'tank',
  recoilPx: 10,
  recoilSpring: 160,
  hitStaggerPx: 20,
  tracerStyle: { color: '#ff6600', glowColor: '#ff4400', glowBlur: 8, length: 32, width: 3 },
  trailConfig: {
    emitIntervalMs: 40,
    particles: { count: 2, speed: 18, size: 4, colors: ['#888', '#aaa', '#666'], lifetime: 0.9 },
  },
  loadingRing: { radiusPx: 10, lineWidth: 2, color: '#ff8800', readyColor: '#ffffff' },
  turret: { spriteKey: 'gun-03', width: 14, height: 38, pivotY: 0.8 },
  weight: 18,
  switchOutMs:    450,
  switchInMs:     520,
  switchPivotDeg: 40,
};

/** Gun_04 — Rifled Gun. Infantry only. */
export const GUN_04: WeaponDef = {
  id: 'gun-04',
  name: 'Rifled Gun',
  damage: 40,
  fireRate: 1.5,
  projectileSpeed: 380,
  projectileLifetime: 3,
  shellSpriteKey: 'medium-shell',
  shellWidth: 7,
  shellHeight: 16,
  muzzleFlash: MUZZLE_FLASH_A,
  shakeOnFire: { intensity: 2, duration: 0.1, decay: 'quadratic' },
  shakeOnHit:  { intensity: 3, duration: 0.08, decay: 'quadratic' },
  behavior: { kind: 'ballistic', bouncesMax: 2 },
  damageType: 'kinetic',
  unitClass: 'infantry',
  recoilPx: 5,
  recoilSpring: 260,
  hitStaggerPx: 14,
  tracerStyle: { color: '#ffffff', glowColor: '#aaaaff', glowBlur: 6, length: 18, width: 2 },
  loadingRing: { radiusPx: 8, lineWidth: 1.5, color: '#aaaaff', readyColor: '#ffffff' },
  turret: { spriteKey: 'gun-04', width: 20, height: 41, pivotY: 0.8 },
  weight: 9,
  switchOutMs:    250,
  switchInMs:     280,
  switchPivotDeg: 22,
};

/** Gun_05 — Howitzer. Slow arcing shell, 120px AoE on impact. */
export const GUN_05: WeaponDef = {
  id: 'gun-05',
  name: 'Howitzer',
  damage: 120,
  fireRate: 0.4,
  projectileSpeed: 220,
  projectileLifetime: 4, // overridden per-shot based on cursor distance
  shellSpriteKey: 'grenade-shell',
  shellWidth: 14,
  shellHeight: 14,
  muzzleFlash: MUZZLE_FLASH_HEAVY,
  shakeOnFire: { intensity: 3, duration: 0.12, decay: 'quadratic' },
  shakeOnHit:  { intensity: 6, duration: 0.2, decay: 'quadratic' },
  behavior: { kind: 'splash', splashRadiusPx: 120, indicatorPulseHz: 3 },
  damageType: 'explosive',
  unitClass: 'tank',
  recoilPx: 8,
  recoilSpring: 180,
  hitStaggerPx: 28,
  tracerStyle: { color: '#ff5500', glowColor: '#ff3300', glowBlur: 12, length: 8, width: 4 },
  trailConfig: {
    emitIntervalMs: 80,
    particles: { count: 2, speed: 14, size: 5, colors: ['#ff4400', '#ff8800', '#ffcc00'], lifetime: 0.7 },
  },
  loadingRing: { radiusPx: 12, lineWidth: 2, color: '#ff4400', readyColor: '#ffff00' },
  turret: { spriteKey: 'gun-05', width: 16, height: 42, pivotY: 0.8 },
  weight: 20,
  switchOutMs:    520,
  switchInMs:     600,
  switchPivotDeg: 45,
};

/** Gun_06 — Laser. Hold-to-fire continuous beam with heat management. damage = DPS. */
export const GUN_06: WeaponDef = {
  id: 'gun-06',
  name: 'Laser',
  damage: 60,            // DPS — multiplied by dt in continuous fire path
  fireRate: 1,           // unused in continuous mode
  projectileSpeed: 0,    // unused — hitscan
  projectileLifetime: 0, // unused — hitscan
  shellSpriteKey: 'laser-beam',  // unused — no projectile spawned
  shellWidth: 0,
  shellHeight: 0,
  muzzleFlash: { ...MUZZLE_FLASH_A, fps: 30, width: 36, height: 36 },
  shakeOnFire: {
    intensity: 1.5,
    duration: 0.05,
    decay: 'linear',
    buildup: { rampPerSec: 1.2, maxIntensity: 3.5 }, // grows with heat
  },
  shakeOnHit: { intensity: 2, duration: 0.06, decay: 'quadratic' },
  behavior: {
    kind: 'hitscan',
    persistMs: 120,
    beamLayerCount: 3,
    maxRangePx: 800,
    continuousMode: true,
    damageTickIntervalMs: 100,   // batch damage events at 10Hz
    heatCapacity: 3.0,           // 3 seconds of fire before lockout
    heatPerSec: 1.0,
    cooldownPerSec: 0.6,         // cools slower than it heats
    overheatLockoutSec: 2.0,
  },
  damageType: 'energy',
  unitClass: 'tank',
  recoilPx: 0,
  recoilSpring: 300,
  hitStaggerPx: 6,
  tracerStyle: { color: '#00e5ff', length: 0, width: 0 }, // hitscan — tracer unused
  turret: { spriteKey: 'gun-06', width: 15, height: 35, pivotY: 0.8 },
  weight: 14,
  switchOutMs:    300,
  switchInMs:     360,
  switchPivotDeg: 25,
};

/** Gun_07 — Shotgun. Infantry only. */
export const GUN_07: WeaponDef = {
  id: 'gun-07',
  name: 'Shotgun',
  damage: 15, // per pellet
  fireRate: 1.5,
  projectileSpeed: 500,
  projectileLifetime: 0.5,
  shellSpriteKey: 'shotgun-shells',
  shellWidth: 5,
  shellHeight: 10,
  muzzleFlash: { ...MUZZLE_FLASH_A, width: 40, height: 40 },
  shakeOnFire: { intensity: 3, duration: 0.1, decay: 'quadratic' },
  shakeOnHit:  { intensity: 2, duration: 0.06, decay: 'quadratic' },
  behavior: {
    kind: 'ballistic',
    pelletCount: 5,
    spread: Math.PI / 12, // ±15° (30° total cone)
    maxRangePx: 250,
    rangeDropoff: 0.35,
  },
  damageType: 'kinetic',
  unitClass: 'infantry',
  recoilPx: 7,
  recoilSpring: 220,
  hitStaggerPx: 10,
  tracerStyle: { color: '#ffcc00', length: 8, width: 1.5 },
  turret: { spriteKey: 'gun-07', width: 18, height: 46, pivotY: 0.8 },
  weight: 8,
  switchOutMs:    220,
  switchInMs:     250,
  switchPivotDeg: 18,
};

/** Gun_08 — Railgun. 180ms charge, pierces 2 enemies. */
export const GUN_08: WeaponDef = {
  id: 'gun-08',
  name: 'Railgun',
  damage: 100,
  fireRate: 0.5,
  projectileSpeed: 900,
  projectileLifetime: 1.5,
  shellSpriteKey: 'plasma',
  shellWidth: 6,
  shellHeight: 24,
  muzzleFlash: { ...MUZZLE_FLASH_HEAVY, fps: 30 },
  shakeOnFire: {
    intensity: 5,
    duration: 0.2,
    decay: 'quadratic',
    buildup: { rampPerSec: 0.8, maxIntensity: 2.5 },
  },
  shakeOnHit:  { intensity: 4, duration: 0.15, decay: 'quadratic' },
  behavior: { kind: 'charge', chargeMs: 180, piercesMax: 2 },
  damageType: 'energy',
  unitClass: 'tank',
  recoilPx: 14,
  recoilSpring: 200,
  hitStaggerPx: 32,
  tracerStyle: { color: '#00e5ff', glowColor: '#00cfff', glowBlur: 14, length: 40, width: 2.5 },
  loadingRing: { radiusPx: 8, lineWidth: 2, color: '#00cfff', readyColor: '#ffffff' },
  turret: { spriteKey: 'gun-08', width: 17, height: 38, pivotY: 0.8 },
  weight: 16,
  switchOutMs:    560,
  switchInMs:     640,
  switchPivotDeg: 35,
};

// ---------------------------------------------------------------------------
// AI-only weapons (not in player weapon list)
// ---------------------------------------------------------------------------

/** Sniper Cannon — high damage, slow ROF, fast projectile (AI sniper role). */
export const SNIPER_GUN: WeaponDef = {
  id: 'sniper-gun',
  name: 'Sniper Cannon',
  damage: 40,
  fireRate: 0.8,
  projectileSpeed: 600,
  projectileLifetime: 3,
  shellSpriteKey: 'sniper-shell',
  shellWidth: 6,
  shellHeight: 20,
  muzzleFlash: { ...MUZZLE_FLASH_A, width: 36, height: 36 },
  shakeOnFire: { intensity: 3, duration: 0.12, decay: 'quadratic' },
  shakeOnHit:  { intensity: 4, duration: 0.1, decay: 'quadratic' },
  behavior: { kind: 'ballistic', maxRangePx: 720, rangeDropoff: 0.15 },
  damageType: 'kinetic',
  unitClass: 'tank',
  recoilPx: 4,
  recoilSpring: 280,
  hitStaggerPx: 12,
  tracerStyle: { color: '#ffd040', length: 24, width: 1.5 },
  turret: { spriteKey: 'gun-01', width: 20, height: 46, pivotY: 0.8 },
  weight: 12,
  switchOutMs:    350,
  switchInMs:     400,
  switchPivotDeg: 25,
};

/** Autocannon — medium ROF tank suppression (AI flanker/rusher). Not in player weapon list. */
export const AUTOCANNON: WeaponDef = {
  id: 'autocannon',
  name: 'Autocannon',
  damage: 12,
  fireRate: 5,
  projectileSpeed: 380,
  projectileLifetime: 1.5,
  shellSpriteKey: 'light-shell',
  shellWidth: 5,
  shellHeight: 13,
  muzzleFlash: { ...MUZZLE_FLASH_A, fps: 28, width: 26, height: 26 },
  shakeOnFire: { intensity: 1.2, duration: 0.05, decay: 'linear' },
  shakeOnHit:  { intensity: 1.5, duration: 0.05, decay: 'linear' },
  behavior: { kind: 'ballistic', spread: Math.PI / 30, tracerEvery: 3 }, // ±6°
  damageType: 'kinetic',
  unitClass: 'tank',
  recoilPx: 3,
  recoilSpring: 380,
  hitStaggerPx: 5,
  tracerStyle: { color: '#ffaa44', length: 14, width: 1.5 },
  turret: { spriteKey: 'gun-02', width: 18, height: 48, pivotY: 0.8 },
  weight: 7,
  switchOutMs:    200,
  switchInMs:     220,
  switchPivotDeg: 18,
};

/** Machine Gun — fast burst (AI flanker/rusher role). */
export const MACHINE_GUN: WeaponDef = {
  id: 'machine-gun',
  name: 'Machine Gun',
  damage: 8,
  fireRate: 8,
  projectileSpeed: 350,
  projectileLifetime: 1.5,
  shellSpriteKey: 'light-shell',
  shellWidth: 6,
  shellHeight: 12,
  muzzleFlash: { ...MUZZLE_FLASH_A, fps: 30, width: 24, height: 24 },
  shakeOnFire: { intensity: 1, duration: 0.05, decay: 'linear' },
  shakeOnHit:  { intensity: 2, duration: 0.06, decay: 'linear' },
  behavior: { kind: 'ballistic', spread: Math.PI / 36 },
  damageType: 'kinetic',
  unitClass: 'tank',
  recoilPx: 2,
  recoilSpring: 400,
  hitStaggerPx: 4,
  tracerStyle: { color: '#ff9900', length: 12, width: 1.5 },
  turret: { spriteKey: 'gun-02', width: 18, height: 48, pivotY: 0.8 },
  weight: 6,
  switchOutMs:    200,
  switchInMs:     220,
  switchPivotDeg: 18,
};

// ---------------------------------------------------------------------------
// Infantry weapons (not in player weapon list; unitClass: 'infantry')
// ---------------------------------------------------------------------------

/** Infantry MG — Soldier_1 (rusher/grunt). High ROF suppression at close range. */
export const INFANTRY_MG: WeaponDef = {
  id: 'infantry-mg',
  name: 'Infantry MG',
  damage: 6,
  fireRate: 7,
  projectileSpeed: 320,
  projectileLifetime: 1.2,
  shellSpriteKey: 'light-shell',
  shellWidth: 4,
  shellHeight: 10,
  muzzleFlash: { ...MUZZLE_FLASH_A, fps: 30, width: 20, height: 20 },
  shakeOnFire: { intensity: 0.5, duration: 0.04, decay: 'linear' },
  shakeOnHit:  { intensity: 1,   duration: 0.04, decay: 'linear' },
  behavior: { kind: 'ballistic', spread: Math.PI / 36 }, // ±5°
  damageType: 'kinetic',
  unitClass: 'infantry',
  recoilPx: 0,
  recoilSpring: 0,
  hitStaggerPx: 3,
  tracerStyle: { color: '#ffaa00', length: 10, width: 1.5 },
  turret: { spriteKey: 'gun-01', width: 0, height: 0, pivotY: 0 }, // infantry — no turret sprite
  weight: 4,
  switchOutMs:    160,
  switchInMs:     180,
  switchPivotDeg: 12,
};

/** Infantry Shotgun — Soldier_2 (flanker). 3-pellet burst, short range. */
export const INFANTRY_SHOTGUN: WeaponDef = {
  id: 'infantry-shotgun',
  name: 'Infantry Shotgun',
  damage: 12,
  fireRate: 1.2,
  projectileSpeed: 420,
  projectileLifetime: 0.4,
  shellSpriteKey: 'shotgun-shells',
  shellWidth: 4,
  shellHeight: 9,
  muzzleFlash: { ...MUZZLE_FLASH_A, width: 28, height: 28 },
  shakeOnFire: { intensity: 1, duration: 0.07, decay: 'quadratic' },
  shakeOnHit:  { intensity: 1.5, duration: 0.05, decay: 'quadratic' },
  behavior: {
    kind: 'ballistic',
    pelletCount: 3,
    spread: Math.PI / 10, // ±18°
    maxRangePx: 180,
    rangeDropoff: 0.4,
  },
  damageType: 'kinetic',
  unitClass: 'infantry',
  recoilPx: 0,
  recoilSpring: 0,
  hitStaggerPx: 6,
  tracerStyle: { color: '#ffdd55', length: 7, width: 1.5 },
  turret: { spriteKey: 'gun-01', width: 0, height: 0, pivotY: 0 }, // infantry — no turret sprite
  weight: 5,
  switchOutMs:    180,
  switchInMs:     200,
  switchPivotDeg: 14,
};

/** Infantry Rifled — Soldier_3 (sniper). Single bouncing shot, medium accuracy. */
export const INFANTRY_RIFLED: WeaponDef = {
  id: 'infantry-rifled',
  name: 'Infantry Rifled',
  damage: 22,
  fireRate: 1.0,
  projectileSpeed: 360,
  projectileLifetime: 2.5,
  shellSpriteKey: 'medium-shell',
  shellWidth: 5,
  shellHeight: 12,
  muzzleFlash: { ...MUZZLE_FLASH_A, width: 22, height: 22 },
  shakeOnFire: { intensity: 1, duration: 0.08, decay: 'quadratic' },
  shakeOnHit:  { intensity: 2, duration: 0.07, decay: 'quadratic' },
  behavior: { kind: 'ballistic', bouncesMax: 1 },
  damageType: 'kinetic',
  unitClass: 'infantry',
  recoilPx: 0,
  recoilSpring: 0,
  hitStaggerPx: 8,
  tracerStyle: { color: '#ccddff', glowColor: '#aaaaff', glowBlur: 4, length: 14, width: 2 },
  turret: { spriteKey: 'gun-01', width: 0, height: 0, pivotY: 0 }, // infantry — no turret sprite
  weight: 7,
  switchOutMs:    200,
  switchInMs:     220,
  switchPivotDeg: 16,
};

// ---------------------------------------------------------------------------
// Registry + player weapon list
// ---------------------------------------------------------------------------

/** All weapons by id — for lookup at runtime. */
export const WEAPON_REGISTRY: Readonly<Record<string, WeaponDef>> = {
  [GUN_01.id]: GUN_01,
  [GUN_02.id]: GUN_02,
  [GUN_03.id]: GUN_03,
  [GUN_04.id]: GUN_04,
  [GUN_05.id]: GUN_05,
  [GUN_06.id]: GUN_06,
  [GUN_07.id]: GUN_07,
  [GUN_08.id]: GUN_08,
  [SNIPER_GUN.id]: SNIPER_GUN,
  [AUTOCANNON.id]: AUTOCANNON,
  [MACHINE_GUN.id]: MACHINE_GUN,
  [INFANTRY_MG.id]: INFANTRY_MG,
  [INFANTRY_SHOTGUN.id]: INFANTRY_SHOTGUN,
  [INFANTRY_RIFLED.id]: INFANTRY_RIFLED,
};

/** Player weapon list — keys 1–5 map to index 0–4 (tank weapons only). */
export const PLAYER_WEAPONS: WeaponDef[] = [
  GUN_01, GUN_03, GUN_05, GUN_06, GUN_08,
];
