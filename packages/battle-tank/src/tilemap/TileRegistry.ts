import { TileId, ObjectId, DecorId } from './types.js';

export interface ObjectDef {
  spriteKey: string;
  /** Optional variant keys — renderer picks by deterministic position hash. */
  spriteVariants?: string[];
  walkable: boolean;
  destructible: boolean;
  hp: number;
  blockProjectile: boolean;
}

/**
 * Runtime tint overlay applied on top of the base sprite for synthetic terrains.
 * `null` = no tint (sprite used as-is).
 */
export interface TileTint {
  color: string;
  alpha: number;
}

export interface TileDef {
  spriteKey: string;
  /** Optional runtime color overlay for terrains that share a base sprite. */
  tint?: TileTint;
}

/**
 * Decoration definition — visual only.
 * No walkable/hp/blockProjectile flags: decor has zero gameplay effect.
 */
export interface DecorDef {
  spriteKey: string;
  /** Draw at this fraction of tile size, centered. Default 1.0. */
  scale?: number;
}

/** Ground tile visual definitions. Keyed by TileId. */
export const TILE_DEFS: Record<TileId, TileDef> = {
  [TileId.GRASS]:  { spriteKey: 'ground-01a' },
  [TileId.DIRT]:   { spriteKey: 'ground-02a' },
  [TileId.STONE]:  { spriteKey: 'ground-01b' },
  [TileId.MUD]:    { spriteKey: 'ground-02a', tint: { color: '#3a2a10', alpha: 0.35 } },
  [TileId.SAND]:   { spriteKey: 'ground-02a', tint: { color: '#c2b280', alpha: 0.3 } },
  [TileId.ICE]:    { spriteKey: 'ground-snow' },
  [TileId.WATER]:  { spriteKey: 'ground-water' },
  [TileId.PUDDLE]: { spriteKey: 'ground-01a',  tint: { color: '#3a6090', alpha: 0.35 } },
};

/** Object definitions: visual + gameplay flags. Keyed by ObjectId. */
export const OBJECT_DEFS: Record<ObjectId, ObjectDef> = {
  [ObjectId.NONE]:      { spriteKey: '', walkable: true, destructible: false, hp: 0, blockProjectile: false },
  [ObjectId.BLOCK]:     { spriteKey: 'block-a01', walkable: false, destructible: false, hp: Infinity, blockProjectile: true },
  [ObjectId.CONTAINER]: {
    spriteKey: 'container-a',
    spriteVariants: ['container-a', 'container-b', 'container-c', 'container-d'],
    walkable: false, destructible: true, hp: 3, blockProjectile: true,
  },
  [ObjectId.WALL]:     { spriteKey: 'block-b01', walkable: false, destructible: false, hp: Infinity, blockProjectile: true },
  [ObjectId.HEDGEHOG]: {
    spriteKey: 'hedgehog-a',
    spriteVariants: ['hedgehog-a', 'hedgehog-b'],
    walkable: false, destructible: false, hp: Infinity, blockProjectile: false,
  },
};

/** Decoration visual definitions. Keyed by DecorId. */
export const DECOR_DEFS: Record<DecorId, DecorDef> = {
  [DecorId.BLAST_TRAIL_1]: { spriteKey: 'decor-blast-1' },
  [DecorId.BLAST_TRAIL_2]: { spriteKey: 'decor-blast-2' },
  [DecorId.BLAST_TRAIL_3]: { spriteKey: 'decor-blast-3' },
  [DecorId.BLAST_TRAIL_4]: { spriteKey: 'decor-blast-4' },
  [DecorId.BLAST_TRAIL_5]: { spriteKey: 'decor-blast-5' },
  [DecorId.BLAST_TRAIL_6]: { spriteKey: 'decor-blast-6' },
  [DecorId.BORDER_A]: { spriteKey: 'decor-border-a' },
  [DecorId.BORDER_B]: { spriteKey: 'decor-border-b' },
  [DecorId.BORDER_C]: { spriteKey: 'decor-border-c' },
  [DecorId.PUDDLE_1]: { spriteKey: 'decor-puddle-1', scale: 0.7 },
  [DecorId.PUDDLE_2]: { spriteKey: 'decor-puddle-2', scale: 0.7 },
  [DecorId.PUDDLE_3]: { spriteKey: 'decor-puddle-3', scale: 0.7 },
  [DecorId.PUDDLE_4]: { spriteKey: 'decor-puddle-4', scale: 0.7 },
  [DecorId.PUDDLE_5]: { spriteKey: 'decor-puddle-5', scale: 0.7 },
  [DecorId.PUDDLE_6]: { spriteKey: 'decor-puddle-6', scale: 0.7 },
};

/**
 * ASCII char → TileCell mapping.
 * Single source of truth for map parsing.
 */
export const CHAR_MAP: Record<string, { ground: TileId; object: ObjectId }> = {
  '.': { ground: TileId.GRASS,  object: ObjectId.NONE },
  'd': { ground: TileId.DIRT,   object: ObjectId.NONE },
  's': { ground: TileId.STONE,  object: ObjectId.NONE },
  'm': { ground: TileId.MUD,    object: ObjectId.NONE },
  'a': { ground: TileId.SAND,   object: ObjectId.NONE },
  'i': { ground: TileId.ICE,    object: ObjectId.NONE },
  'w': { ground: TileId.WATER,  object: ObjectId.NONE },
  'p': { ground: TileId.PUDDLE, object: ObjectId.NONE },
  'B': { ground: TileId.GRASS,  object: ObjectId.BLOCK },
  'C': { ground: TileId.GRASS,  object: ObjectId.CONTAINER },
  'W': { ground: TileId.STONE,  object: ObjectId.WALL },
  'H': { ground: TileId.STONE,  object: ObjectId.HEDGEHOG },
  'P': { ground: TileId.GRASS,  object: ObjectId.NONE }, // player spawn marker
  'S': { ground: TileId.GRASS,  object: ObjectId.NONE }, // enemy spawn marker
};
