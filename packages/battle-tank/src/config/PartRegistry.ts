import type { TankDef } from './TankConfig.js';
import type { ArmorKitId } from './ArmorConfig.js';
import type { WeaponDef } from './WeaponConfig.js';
import { PLAYER_WEAPONS, WEAPON_REGISTRY } from './WeaponConfig.js';
import { ARMOR_TABLE } from './ArmorConfig.js';
import { TileId } from '../tilemap/types.js';

// ---------------------------------------------------------------------------
// Part definition interfaces
// ---------------------------------------------------------------------------

export interface HullDef {
  id: string;
  name: string;
  spriteKey: string;
  height: number;       // display px; width is derived at render time from sprite natural aspect ratio
  trackOffsetX: number; // px from center to track center (hull geometry — not track property)
  baseHP: number;
  collisionRadius: number;
  weight: number;
}

export interface EngineDef {
  id: string;
  name: string;
  power: number;      // abstract power units; P/W ratio = power / totalWeight
  speedMult: number;  // multiplier on maxForwardSpeed / maxReverseSpeed
  accelMult: number;  // multiplier on acceleration (deceleration always 1.0)
  weight: number;
}

/** Terrain movement cost multiplier: 1.0 = normal, <1 = penalty, >1 = bonus. */
export type TerrainCosts = Record<TileId, number>;

export interface TrackDef {
  id: string;
  name: string;
  spriteKey: string;
  width: number;
  height: number;
  handling: number;   // abstract 0–1; affects turnRate
  terrainCosts: TerrainCosts;
  weight: number;
}

export interface ArmorPartDef {
  id: ArmorKitId;
  name: string;
  weight: number;
}

// ---------------------------------------------------------------------------
// Loadout type (serializable — IDs only)
// ---------------------------------------------------------------------------

export interface LoadoutParts {
  hullId: string;
  engineId: string;
  trackId: string;
  gunId: string;
  armorId: ArmorKitId;
}

// ---------------------------------------------------------------------------
// Radar chart stats (all normalized 0–1)
// ---------------------------------------------------------------------------

export interface RadarStats {
  spd: number;   // speed
  acc: number;   // acceleration
  fpw: number;   // firepower (damage * ROF)
  rof: number;   // rate of fire
  arm: number;   // armor effectiveness
  hnd: number;   // handling
}

export const RADAR_LABELS: readonly string[] = ['SPD', 'ACC', 'FPW', 'ROF', 'ARM', 'HND'];

// ---------------------------------------------------------------------------
// Hull registry (8 hulls — sprites Hull_01..08, all 256x256 source)
// ---------------------------------------------------------------------------

// trackOffsetX is a per-sprite visual constant — tune by eye in the garage preview.
// Source sprites vary in width (167–171px wide × 256px tall); width is derived at render time
// from img.naturalWidth / img.naturalHeight * displayHeight.
// trackOffsetX ≈ computedDisplayWidth / 2 so tracks sit flush with hull edge.
export const HULL_REGISTRY: Readonly<Record<string, HullDef>> = {
  //                                                              h   trkX  HP   radius  wt
  'hull-01': { id: 'hull-01', name: 'Scout',      spriteKey: 'hull-01', height: 56, trackOffsetX: 18, baseHP: 95,  collisionRadius: 20, weight: 8  },
  'hull-02': { id: 'hull-02', name: 'Vanguard',   spriteKey: 'hull-02', height: 56, trackOffsetX: 19, baseHP: 100, collisionRadius: 22, weight: 12 },
  'hull-03': { id: 'hull-03', name: 'Enforcer',   spriteKey: 'hull-03', height: 60, trackOffsetX: 16, baseHP: 130, collisionRadius: 24, weight: 16 },
  'hull-04': { id: 'hull-04', name: 'Sentinel',   spriteKey: 'hull-04', height: 60, trackOffsetX: 13, baseHP: 150, collisionRadius: 25, weight: 20 },
  'hull-05': { id: 'hull-05', name: 'Juggernaut', spriteKey: 'hull-05', height: 64, trackOffsetX: 20, baseHP: 200, collisionRadius: 28, weight: 28 },
  'hull-06': { id: 'hull-06', name: 'Phantom',    spriteKey: 'hull-06', height: 54, trackOffsetX: 17, baseHP: 55,  collisionRadius: 19, weight: 5  },
  'hull-07': { id: 'hull-07', name: 'Reaper',     spriteKey: 'hull-07', height: 58, trackOffsetX: 16, baseHP: 110, collisionRadius: 23, weight: 14 },
  'hull-08': { id: 'hull-08', name: 'Titan',      spriteKey: 'hull-08', height: 66, trackOffsetX: 15, baseHP: 250, collisionRadius: 30, weight: 34 },
};

// ---------------------------------------------------------------------------
// Engine registry (4 abstract engines — no sprite)
// ---------------------------------------------------------------------------

// speedMult × accelMult create distinct character — no engine is best at everything
export const ENGINE_REGISTRY: Readonly<Record<string, EngineDef>> = {
  //                                                          power  spd    acc   wt
  'engine-light':    { id: 'engine-light',    name: 'Light Engine',    power: 60,  speedMult: 0.85, accelMult: 1.20, weight: 4  },
  'engine-standard': { id: 'engine-standard', name: 'Standard Engine', power: 100, speedMult: 1.00, accelMult: 1.00, weight: 8  },
  'engine-heavy':    { id: 'engine-heavy',    name: 'Heavy Engine',    power: 160, speedMult: 1.10, accelMult: 0.85, weight: 14 },
  'engine-turbo':    { id: 'engine-turbo',    name: 'Turbo Engine',    power: 200, speedMult: 1.25, accelMult: 0.70, weight: 10 },
};

// ---------------------------------------------------------------------------
// Track registry (4 track types — sprites Track_1..4, A/B variants, all 42x246)
// ---------------------------------------------------------------------------

const TRACK_DISPLAY_W = 9;
const TRACK_DISPLAY_H = 54;

/** Default terrain costs: 1.0 = normal speed. Values < 1 = penalty. */
const BASE_TERRAIN: TerrainCosts = {
  [TileId.GRASS]:  1.0,
  [TileId.DIRT]:   0.95,
  [TileId.STONE]:  1.05,
  [TileId.MUD]:    0.6,
  [TileId.SAND]:   0.75,
  [TileId.ICE]:    0.85,
  [TileId.WATER]:  0.4,
  [TileId.PUDDLE]: 0.9,
};

export const TRACK_REGISTRY: Readonly<Record<string, TrackDef>> = {
  'track-1': {
    id: 'track-1', name: 'Narrow Steel',
    spriteKey: 'track-1a', width: TRACK_DISPLAY_W, height: TRACK_DISPLAY_H,
    handling: 0.7, weight: 6,
    terrainCosts: { ...BASE_TERRAIN, [TileId.STONE]: 1.1, [TileId.MUD]: 0.5 },
  },
  'track-2': {
    id: 'track-2', name: 'Wide Rubber',
    spriteKey: 'track-2a', width: TRACK_DISPLAY_W, height: TRACK_DISPLAY_H,
    handling: 0.85, weight: 8,
    terrainCosts: { ...BASE_TERRAIN, [TileId.MUD]: 0.9, [TileId.SAND]: 0.9, [TileId.WATER]: 0.55 },
  },
  'track-3': {
    id: 'track-3', name: 'Spiked Treads',
    spriteKey: 'track-3a', width: TRACK_DISPLAY_W, height: TRACK_DISPLAY_H,
    handling: 0.6, weight: 10,
    terrainCosts: { ...BASE_TERRAIN, [TileId.ICE]: 1.0, [TileId.MUD]: 0.8, [TileId.SAND]: 0.85 },
  },
  'track-4': {
    id: 'track-4', name: 'Hover Pads',
    spriteKey: 'track-4a', width: TRACK_DISPLAY_W, height: TRACK_DISPLAY_H,
    handling: 0.95, weight: 12,
    terrainCosts: { ...BASE_TERRAIN, [TileId.WATER]: 0.85, [TileId.MUD]: 0.85, [TileId.ICE]: 0.75 },
  },
};

// ---------------------------------------------------------------------------
// Armor part registry (wraps ArmorKitId with weight)
// ---------------------------------------------------------------------------

export const ARMOR_REGISTRY: Readonly<Record<ArmorKitId, ArmorPartDef>> = {
  none:      { id: 'none',      name: 'No Armor',        weight: 0  },
  reactive:  { id: 'reactive',  name: 'Reactive Armor',  weight: 10 },
  composite: { id: 'composite', name: 'Composite Armor', weight: 14 },
  cage:      { id: 'cage',      name: 'Cage Armor',      weight: 8  },
};

// ---------------------------------------------------------------------------
// Gun part list (references existing PLAYER_WEAPONS; garage selects from these)
// ---------------------------------------------------------------------------

/** Guns available in the garage. */
export const GUN_PARTS: readonly WeaponDef[] = PLAYER_WEAPONS;

// ---------------------------------------------------------------------------
// Default loadout
// ---------------------------------------------------------------------------

export const DEFAULT_LOADOUT: LoadoutParts = {
  hullId: 'hull-02',
  engineId: 'engine-standard',
  trackId: 'track-1',
  gunId: 'gun-01',
  armorId: 'none',
};

// ---------------------------------------------------------------------------
// P/W ratio → movement assembly
// ---------------------------------------------------------------------------

/** Base movement values at P/W ratio = 1.0 */
const BASE_FORWARD_SPEED = 150;     // px/s
const BASE_REVERSE_SPEED = 75;      // px/s
const BASE_ACCELERATION = 300;      // px/s^2
const BASE_DECELERATION = 200;      // px/s^2
const BASE_TURN_RATE = Math.PI;     // rad/s
const BASE_TURRET_TURN_RATE = Math.PI * 2.5;

/** Clamp P/W ratio to prevent extreme values. */
const MIN_PW_RATIO = 0.3;
const MAX_PW_RATIO = 2.5;

/** Weight threshold — above this, tank is "overloaded" (visual warning). */
export const OVERLOAD_PW_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Stat normalization ceilings (for radar chart 0–1 mapping)
// ---------------------------------------------------------------------------

// Speed ceiling uses the best speedMult in ENGINE_REGISTRY to avoid recalculating at runtime
const MAX_ENGINE_SPEED_MULT = Math.max(...Object.values(ENGINE_REGISTRY).map(e => e.speedMult));
const MAX_SPEED_CEIL = BASE_FORWARD_SPEED * MAX_PW_RATIO * MAX_ENGINE_SPEED_MULT;
const MAX_ACCEL_CEIL = BASE_ACCELERATION  * MAX_PW_RATIO;
const MAX_DPS_CEIL = 200;    // generous ceiling; shotgun 5×15×1.5=112, laser DPS 60, railgun 100×0.5=50
const MAX_ROF_CEIL = 10;     // just above MG's 8/s
const MAX_HANDLING_CEIL = 1.0;

// ARM normalization: derive floor from actual armor data so the full 0–1 scale is used.
// avgMult = average damage multiplier across all types; lower = better armor.
const ARMOR_NORM_FLOOR = Math.min(
  ...Object.values(ARMOR_TABLE).map(r => (r.kinetic + r.explosive + r.energy) / 3),
);

/**
 * Assemble a TankDef from loadout part IDs.
 * Pure function — no side effects.
 */
export function assembleLoadout(parts: LoadoutParts): TankDef {
  const hull = HULL_REGISTRY[parts.hullId];
  const engine = ENGINE_REGISTRY[parts.engineId];
  const track = TRACK_REGISTRY[parts.trackId];
  const gun = WEAPON_REGISTRY[parts.gunId];
  const armor = ARMOR_REGISTRY[parts.armorId];

  if (!hull || !engine || !track || !gun || !armor) {
    throw new Error(`Invalid loadout part ID: ${JSON.stringify(parts)}`);
  }

  const totalWeight = hull.weight + engine.weight + track.weight + gun.weight + armor.weight;
  const pwRatio = Math.min(MAX_PW_RATIO, Math.max(MIN_PW_RATIO, engine.power / totalWeight));

  return {
    hull:   { spriteKey: hull.spriteKey, height: hull.height },
    tracks: { spriteKey: track.spriteKey, width: track.width, height: track.height, spacing: hull.trackOffsetX },
    turret: gun.turret,
    weapon: gun,
    movement: {
      maxForwardSpeed: BASE_FORWARD_SPEED * pwRatio * engine.speedMult,
      maxReverseSpeed: BASE_REVERSE_SPEED  * pwRatio * engine.speedMult,
      acceleration:    BASE_ACCELERATION   * pwRatio * engine.accelMult,
      deceleration:    BASE_DECELERATION   * pwRatio,
      turnRate:        BASE_TURN_RATE * track.handling,
      turretTurnRate:  BASE_TURRET_TURN_RATE,
    },
    collisionRadius: hull.collisionRadius,
    maxHP:           hull.baseHP,
    armorKit:        parts.armorId === 'none' ? undefined : parts.armorId,
  };
}

/**
 * Compute total weight for a loadout.
 */
export function computeTotalWeight(parts: LoadoutParts): number {
  const hull = HULL_REGISTRY[parts.hullId];
  const engine = ENGINE_REGISTRY[parts.engineId];
  const track = TRACK_REGISTRY[parts.trackId];
  const gun = WEAPON_REGISTRY[parts.gunId];
  const armor = ARMOR_REGISTRY[parts.armorId];
  return (hull?.weight ?? 0) + (engine?.weight ?? 0) + (track?.weight ?? 0) + (gun?.weight ?? 0) + (armor?.weight ?? 0);
}

/**
 * Compute P/W ratio for a loadout.
 */
export function computePWRatio(parts: LoadoutParts): number {
  const engine = ENGINE_REGISTRY[parts.engineId];
  const totalWeight = computeTotalWeight(parts);
  if (!engine || totalWeight === 0) return 1;
  return Math.min(MAX_PW_RATIO, Math.max(MIN_PW_RATIO, engine.power / totalWeight));
}

/**
 * Compute radar stats (all 0–1) from a loadout.
 */
export function computeRadarStats(parts: LoadoutParts): RadarStats {
  const pwRatio = computePWRatio(parts);
  const gun = WEAPON_REGISTRY[parts.gunId];
  const track = TRACK_REGISTRY[parts.trackId];
  const armorId = parts.armorId;

  // Armor effectiveness: average multiplier across damage types (lower = better armor).
  // Normalized against the actual best kit in ARMOR_TABLE so the full 0–1 scale is used.
  const armorRow = ARMOR_TABLE[armorId];
  const avgMult = armorRow
    ? (armorRow.kinetic + armorRow.explosive + armorRow.energy) / 3
    : 1.0;
  const armNorm = Math.max(0, Math.min(1, 1 - (avgMult - ARMOR_NORM_FLOOR) / (1 - ARMOR_NORM_FLOOR)));

  const dps = gun ? gun.damage * gun.fireRate : 0;

  return {
    spd: Math.min(1, (BASE_FORWARD_SPEED * pwRatio) / MAX_SPEED_CEIL),
    acc: Math.min(1, (BASE_ACCELERATION * pwRatio) / MAX_ACCEL_CEIL),
    fpw: Math.min(1, dps / MAX_DPS_CEIL),
    rof: Math.min(1, (gun?.fireRate ?? 0) / MAX_ROF_CEIL),
    arm: armNorm,
    hnd: Math.min(1, (track?.handling ?? 0.5) / MAX_HANDLING_CEIL),
  };
}

/**
 * Get terrain costs for the selected track in a loadout.
 */
export function getLoadoutTerrainCosts(parts: LoadoutParts): TerrainCosts {
  const track = TRACK_REGISTRY[parts.trackId];
  return track?.terrainCosts ?? BASE_TERRAIN;
}
