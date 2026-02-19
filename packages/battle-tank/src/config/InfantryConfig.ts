// ---------------------------------------------------------------------------
// Infantry unit configuration — soldiers with MG / Shotgun / Rifled weapons
// ---------------------------------------------------------------------------

export type InfantryAnimState = 'idle' | 'walk' | 'run' | 'shot' | 'reload' | 'hurt' | 'dead';

export interface AnimFrameDef {
  frameCount: number;
  fps: number;
}

/**
 * Per-variant, per-state frame counts & playback rates.
 * Source sheets are horizontal, 128×128 px per frame (see design_docs/ASSETS.md Pack 5).
 */
export const INFANTRY_ANIM_TABLE: Record<1 | 2 | 3, Record<InfantryAnimState, AnimFrameDef>> = {
  1: {
    idle:   { frameCount: 7,  fps: 8  },
    walk:   { frameCount: 7,  fps: 10 },
    run:    { frameCount: 8,  fps: 12 },
    shot:   { frameCount: 4,  fps: 16 },
    reload: { frameCount: 13, fps: 12 },
    hurt:   { frameCount: 3,  fps: 12 },
    dead:   { frameCount: 4,  fps: 10 },
  },
  2: {
    idle:   { frameCount: 9, fps: 8  },
    walk:   { frameCount: 8, fps: 10 },
    run:    { frameCount: 8, fps: 12 },
    shot:   { frameCount: 4, fps: 16 },
    reload: { frameCount: 7, fps: 12 },
    hurt:   { frameCount: 3, fps: 12 },
    dead:   { frameCount: 4, fps: 10 },
  },
  3: {
    idle:   { frameCount: 7, fps: 8  },
    walk:   { frameCount: 8, fps: 10 },
    run:    { frameCount: 6, fps: 12 },
    shot:   { frameCount: 4, fps: 16 },
    reload: { frameCount: 8, fps: 12 },
    hurt:   { frameCount: 4, fps: 12 },
    dead:   { frameCount: 5, fps: 10 },
  },
};

/** Source sprite sheet frame size (pixels). All soldiers use 128×128 per frame. */
export const INFANTRY_SPRITE_SHEET_FRAME_SIZE = 128;

/** Rendered display size (px). Infantry is smaller than tanks (56×56). */
export const INFANTRY_DISPLAY_SIZE = 32;

/**
 * Speed fraction thresholds that select animation state.
 * Values are fractions of maxSpeed.
 */
export const INFANTRY_ANIM_SPEED_THRESHOLDS = {
  walk: 0.2,
  run:  0.6,
} as const;

/**
 * Formation slots — local-space offsets relative to lead tank.
 * +x = right, +y = forward (along lead hull angle).
 * Rotated by lead.hullAngle at runtime to get world-space target.
 */
export const FORMATION_SLOTS: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: -30, dy: -20 }, // slot 0: left-flank
  { dx:  30, dy: -20 }, // slot 1: right-flank
  { dx: -20, dy: -42 }, // slot 2: far-left
  { dx:  20, dy: -42 }, // slot 3: far-right
];

export const SQUAD_CONFIG = {
  /** If squad lead dies, infantry break formation and revert to flow field. */
  formationSnapPx: 120, // px from slot target before steering override activates
};

// ---------------------------------------------------------------------------
// Infantry unit definitions
// ---------------------------------------------------------------------------

export interface InfantryDef {
  id: string;
  soldierVariant: 1 | 2 | 3;
  weaponId: string;       // key into WEAPON_REGISTRY
  maxHP: number;
  maxSpeed: number;       // px/s — faster than tanks, omnidirectional
  collisionRadius: number; // px
  muzzleOffsetPx: number;  // fire origin distance from center along facingAngle
}

/** Soldier_1 — Machine Gun suppression. Rusher/grunt role. */
export const INFANTRY_MG_UNIT: InfantryDef = {
  id: 'infantry-mg',
  soldierVariant: 1,
  weaponId: 'infantry-mg',
  maxHP: 35,
  maxSpeed: 190,
  collisionRadius: 16,
  muzzleOffsetPx: 18,
};

/** Soldier_2 — Shotgun close-range burst. Flanker role. */
export const INFANTRY_SHOTGUN_UNIT: InfantryDef = {
  id: 'infantry-shotgun',
  soldierVariant: 2,
  weaponId: 'infantry-shotgun',
  maxHP: 30,
  maxSpeed: 155,
  collisionRadius: 16,
  muzzleOffsetPx: 18,
};

/** Soldier_3 — Rifled bouncing shot. Sniper role. */
export const INFANTRY_RIFLED_UNIT: InfantryDef = {
  id: 'infantry-rifled',
  soldierVariant: 3,
  weaponId: 'infantry-rifled',
  maxHP: 40,
  maxSpeed: 115,
  collisionRadius: 16,
  muzzleOffsetPx: 20,
};
