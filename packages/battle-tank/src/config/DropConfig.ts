import type { AIRole } from '../components/AI.js';

// ---------------------------------------------------------------------------
// Item types — matches craftpix Bonus_Items asset pack
// ---------------------------------------------------------------------------

/** All droppable item types. */
export type DropItemType =
  // Instant effects
  | 'coin'
  | 'hp'
  | 'ammo'
  | 'nuke'
  | 'hp_debuff'
  // Timed buffs (definitions in BuffConfig.ts)
  | 'shield'
  | 'attack'
  | 'speed'
  | 'magnet'
  | 'armor'
  // Timed debuffs (definitions in BuffConfig.ts)
  | 'speed_debuff'
  | 'armor_debuff'
  | 'ammo_debuff'
  | 'mobility_debuff';

/** Polarity category for an item type. */
export type DropPolarity = 'instant' | 'buff' | 'debuff';

export const ITEM_POLARITY: Record<DropItemType, DropPolarity> = {
  coin:            'instant',
  hp:              'instant',
  ammo:            'instant',
  nuke:            'instant',
  hp_debuff:       'instant',
  shield:          'buff',
  attack:          'buff',
  speed:           'buff',
  magnet:          'buff',
  armor:           'buff',
  speed_debuff:    'debuff',
  armor_debuff:    'debuff',
  ammo_debuff:     'debuff',
  mobility_debuff: 'debuff',
};

// ---------------------------------------------------------------------------
// Display — sprite key + fallback color + size per item type
// ---------------------------------------------------------------------------

export interface ItemDisplayDef {
  spriteKey?: string;   // loaded via AssetManager; undefined = use color fallback
  color: string;        // procedural fallback circle color
  size: number;         // display px (square)
  /** 0 = no pulse. Timed items pulse subtly to distinguish from instant pickups. */
  pulseAmplitude: number;
}

export const ITEM_DISPLAY: Record<DropItemType, ItemDisplayDef> = {
  // Instant
  coin:            { spriteKey: undefined,              color: '#ffd700', size: 16, pulseAmplitude: 0 },
  hp:              { spriteKey: 'drop-hp',              color: '#44ff44', size: 20, pulseAmplitude: 0 },
  ammo:            { spriteKey: 'drop-ammo',            color: '#ff8800', size: 20, pulseAmplitude: 0 },
  nuke:            { spriteKey: 'drop-nuke',            color: '#ff2222', size: 22, pulseAmplitude: 0 },
  hp_debuff:       { spriteKey: 'drop-hp-debuff',       color: '#884422', size: 20, pulseAmplitude: 0 },
  // Timed buffs
  shield:          { spriteKey: 'drop-shield',          color: '#44aaff', size: 20, pulseAmplitude: 0.08 },
  attack:          { spriteKey: 'drop-attack',          color: '#ff4444', size: 20, pulseAmplitude: 0.08 },
  speed:           { spriteKey: 'drop-speed',           color: '#44ffaa', size: 20, pulseAmplitude: 0.08 },
  magnet:          { spriteKey: 'drop-magnet',          color: '#aa44ff', size: 20, pulseAmplitude: 0.08 },
  armor:           { spriteKey: 'drop-armor',           color: '#8888ff', size: 20, pulseAmplitude: 0.08 },
  // Timed debuffs
  speed_debuff:    { spriteKey: 'drop-speed-debuff',    color: '#886644', size: 20, pulseAmplitude: 0.08 },
  armor_debuff:    { spriteKey: 'drop-armor-debuff',    color: '#664488', size: 20, pulseAmplitude: 0.08 },
  ammo_debuff:     { spriteKey: 'drop-ammo-debuff',     color: '#886600', size: 20, pulseAmplitude: 0.08 },
  mobility_debuff: { spriteKey: 'drop-mobility-debuff', color: '#668844', size: 20, pulseAmplitude: 0.08 },
};

// ---------------------------------------------------------------------------
// Drop tables — weighted bonus pools per source
// ---------------------------------------------------------------------------

export interface BonusDropEntry {
  itemType: Exclude<DropItemType, 'coin'>;
  /** Relative weight within the pool (higher = more likely). */
  weight: number;
}

export interface DropTable {
  /** Number of guaranteed coins on kill/destroy. */
  coins: number;
  /** Independent probability (0–1) that any bonus drops at all. */
  bonusChance: number;
  /** Weighted pool — one item is picked when bonus triggers. */
  bonusPool: BonusDropEntry[];
}

export type DropSource = AIRole | 'heavy_grunt' | 'armored_sniper' | 'cage_rusher' | 'tile';

export const DROP_TABLES: Record<DropSource, DropTable> = {
  grunt:          { coins: 3, bonusChance: 0.30, bonusPool: [{ itemType: 'hp', weight: 3 }, { itemType: 'ammo', weight: 2 }] },
  flanker:        { coins: 2, bonusChance: 0.25, bonusPool: [{ itemType: 'speed', weight: 3 }, { itemType: 'ammo', weight: 2 }] },
  sniper:         { coins: 4, bonusChance: 0.35, bonusPool: [{ itemType: 'attack', weight: 2 }, { itemType: 'ammo', weight: 3 }] },
  rusher:         { coins: 2, bonusChance: 0.20, bonusPool: [{ itemType: 'hp', weight: 2 }, { itemType: 'speed', weight: 2 }] },
  heavy_grunt:    { coins: 3, bonusChance: 0.30, bonusPool: [{ itemType: 'shield', weight: 2 }, { itemType: 'armor', weight: 2 }, { itemType: 'speed_debuff', weight: 1 }] },
  armored_sniper: { coins: 4, bonusChance: 0.35, bonusPool: [{ itemType: 'attack', weight: 3 }, { itemType: 'nuke', weight: 1 }, { itemType: 'armor_debuff', weight: 1 }] },
  cage_rusher:    { coins: 2, bonusChance: 0.30, bonusPool: [{ itemType: 'shield', weight: 2 }, { itemType: 'magnet', weight: 2 }, { itemType: 'mobility_debuff', weight: 1 }] },
  tile:           { coins: 2, bonusChance: 0,    bonusPool: [] },
};

// ---------------------------------------------------------------------------
// Physics / pickup
// ---------------------------------------------------------------------------

export const DROP_PHYSICS = {
  /** Seconds before an uncollected item despawns. */
  ttl: 12,
  /** Pixel radius within which items are magnetized toward the player. */
  magnetRadius: 80,
  /** px/s magnet acceleration (applied continuously while in range). */
  magnetSpeed: 400,
  /** Maximum speed cap while inside magnet range (px/s). */
  maxSpeed: 400,
  /** Velocity multiplier per frame when outside magnet range (0–1, lower = more friction). */
  friction: 0.85,
  /** Scatter radius for initial spawn offset (px). */
  scatter: 28,
  /** Proximity radius for instant pickup. */
  pickupRadius: 18,
  /** Spawn scale-in animation duration (seconds). */
  spawnAnimDurationS: 0.15,
  /** Bob speed for non-coin items (radians/s). */
  bobSpeed: 3,
  /** Bob amplitude (px). */
  bobAmplitude: 2,
  /** Pulse speed for timed items (radians/s). */
  pulseSpeed: 4,
} as const;

// ---------------------------------------------------------------------------
// Effects — what each instant item does when collected
// ---------------------------------------------------------------------------

export const ITEM_EFFECTS = {
  hp: {
    /** HP to restore on pickup (before max-HP clamp). */
    amount: 25,
  },
  hp_debuff: {
    /** HP lost on pickup. */
    damage: 15,
  },
  shield: {
    /** Fraction of damage that passes through while shield is active (0 = full block). */
    damageReduction: 0.1,
  },
  nuke: {
    /** Damage dealt to all enemies on screen. */
    damage: 9999,
  },
} as const;
