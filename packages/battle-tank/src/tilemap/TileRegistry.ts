import { TileId, ObjectId } from './types.js';

export interface ObjectDef {
  spriteKey: string;
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
  [ObjectId.NONE]: { spriteKey: '', walkable: true, destructible: false, hp: 0, blockProjectile: false },
  [ObjectId.BLOCK]: { spriteKey: 'block-a01', walkable: false, destructible: false, hp: Infinity, blockProjectile: true },
  [ObjectId.HEDGE]: { spriteKey: 'hedge-a01', walkable: false, destructible: true, hp: 5, blockProjectile: true },
  [ObjectId.CONTAINER]: { spriteKey: 'container-a', walkable: false, destructible: true, hp: 3, blockProjectile: true },
  [ObjectId.WALL]: { spriteKey: 'block-b01', walkable: false, destructible: false, hp: Infinity, blockProjectile: true },
};

/**
 * ASCII char → TileCell mapping.
 * Single source of truth for map parsing.
 */
export const CHAR_MAP: Record<string, { ground: TileId; object: ObjectId }> = {
  '.': { ground: TileId.GRASS, object: ObjectId.NONE },
  'd': { ground: TileId.DIRT, object: ObjectId.NONE },
  's': { ground: TileId.STONE, object: ObjectId.NONE },
  'm': { ground: TileId.MUD, object: ObjectId.NONE },
  'a': { ground: TileId.SAND, object: ObjectId.NONE },
  'i': { ground: TileId.ICE, object: ObjectId.NONE },
  'w': { ground: TileId.WATER, object: ObjectId.NONE },
  'p': { ground: TileId.PUDDLE, object: ObjectId.NONE },
  'B': { ground: TileId.GRASS, object: ObjectId.BLOCK },
  'H': { ground: TileId.GRASS, object: ObjectId.HEDGE },
  'C': { ground: TileId.GRASS, object: ObjectId.CONTAINER },
  'W': { ground: TileId.STONE, object: ObjectId.WALL },
  'P': { ground: TileId.GRASS, object: ObjectId.NONE }, // player spawn marker
  'S': { ground: TileId.GRASS, object: ObjectId.NONE }, // enemy spawn marker
};
