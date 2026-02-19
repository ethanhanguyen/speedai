import type { WeaponDef } from './WeaponConfig.js';
import type { ArmorKitId } from './ArmorConfig.js';
import { GUN_01, SNIPER_GUN, AUTOCANNON } from './WeaponConfig.js';

export interface TankDef {
  hull:   { spriteKey: string; width: number; height: number };
  tracks: { spriteKey: string; width: number; height: number; spacing: number };
  turret: { spriteKey: string; width: number; height: number; pivotY: number };
  weapon: WeaponDef;
  movement: {
    maxForwardSpeed: number;  // px/s
    maxReverseSpeed: number;  // px/s
    acceleration: number;     // px/s^2
    deceleration: number;     // px/s^2
    turnRate: number;         // rad/s — hull rotation rate
    turretTurnRate: number;   // rad/s — turret rotation rate (independent of hull)
  };
  collisionRadius: number;    // px from center
  maxHP: number;
  armorKit?: ArmorKitId;      // absent / 'none' = no armor
}

/**
 * Hull_01 + Track_1 + Gun_01 — light starter tank.
 * Source sprites: Hull 256×256, Track 42×246, Gun 94×212.
 */
export const PLAYER_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: GUN_01,
  movement: {
    maxForwardSpeed: 150,
    maxReverseSpeed: 75,
    acceleration: 300,
    deceleration: 200,
    turnRate: Math.PI,             // 180 deg/s hull
    turretTurnRate: Math.PI * 2.5, // 450 deg/s — responsive, slight lag vs instant
  },
  collisionRadius: 22,
  maxHP: 100,
};

// ---------------------------------------------------------------------------
// Enemy tank defs
// ---------------------------------------------------------------------------

/** Grunt — slow, basic. No armor. */
export const GRUNT_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: GUN_01,
  movement: {
    maxForwardSpeed: 100,
    maxReverseSpeed: 50,
    acceleration: 200,
    deceleration: 150,
    turnRate: Math.PI * 0.75,
    turretTurnRate: Math.PI * 1.2, // 216 deg/s — lumbering aim
  },
  collisionRadius: 22,
  maxHP: 60,
};

/** Flanker — fast, strafes. No armor. */
export const FLANKER_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: AUTOCANNON,
  movement: {
    maxForwardSpeed: 130,
    maxReverseSpeed: 65,
    acceleration: 280,
    deceleration: 200,
    turnRate: Math.PI * 1.2,
    turretTurnRate: Math.PI * 1.8, // 324 deg/s — fast tracking to match mobility
  },
  collisionRadius: 22,
  maxHP: 50,
};

/** Sniper — slow, fragile, long-range. No armor. */
export const SNIPER_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: SNIPER_GUN,
  movement: {
    maxForwardSpeed: 70,
    maxReverseSpeed: 35,
    acceleration: 140,
    deceleration: 120,
    turnRate: Math.PI * 0.6,
    turretTurnRate: Math.PI * 0.8, // 144 deg/s — slow deliberate aim
  },
  collisionRadius: 22,
  maxHP: 40,
};

/** Rusher — very fast, charges straight in. No armor. */
export const RUSHER_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: AUTOCANNON,
  movement: {
    maxForwardSpeed: 180,
    maxReverseSpeed: 60,
    acceleration: 400,
    deceleration: 250,
    turnRate: Math.PI * 0.9,
    turretTurnRate: Math.PI * 2.0, // 360 deg/s — aggressive snap-tracking
  },
  collisionRadius: 22,
  maxHP: 40,
};

/** Heavy Grunt — slower, tougher, reactive armor vs explosives. */
export const HEAVY_GRUNT_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: GUN_01,
  movement: {
    maxForwardSpeed: 75,
    maxReverseSpeed: 40,
    acceleration: 140,
    deceleration: 120,
    turnRate: Math.PI * 0.6,
    turretTurnRate: Math.PI * 1.0, // 180 deg/s — heavy, slow aim
  },
  collisionRadius: 22,
  maxHP: 120,
  armorKit: 'reactive',
};

/** Composite Sniper — elite sniper with composite ceramic armor. */
export const ARMORED_SNIPER_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: SNIPER_GUN,
  movement: {
    maxForwardSpeed: 65,
    maxReverseSpeed: 30,
    acceleration: 130,
    deceleration: 110,
    turnRate: Math.PI * 0.55,
    turretTurnRate: Math.PI * 0.7, // 126 deg/s — elite but deliberate
  },
  collisionRadius: 22,
  maxHP: 60,
  armorKit: 'composite',
};

/** Cage Rusher — fast rusher with cage armor (excels vs explosives). */
export const CAGE_RUSHER_TANK: TankDef = {
  hull:   { spriteKey: 'hull-01',  width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9,  height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01',   width: 20, height: 46, pivotY: 0.8 },
  weapon: AUTOCANNON,
  movement: {
    maxForwardSpeed: 170,
    maxReverseSpeed: 55,
    acceleration: 380,
    deceleration: 240,
    turnRate: Math.PI * 0.85,
    turretTurnRate: Math.PI * 1.8, // 324 deg/s — fast close-range tracking
  },
  collisionRadius: 22,
  maxHP: 45,
  armorKit: 'cage',
};
