import { TileId, ObjectId } from './types.js';

export interface TileDef {
  spriteKey: string;
  /** rgba color used for gradient blending at tile-type boundaries. */
  blendColor: string;
}

export interface ObjectDef {
  spriteKey: string;
  walkable: boolean;
  destructible: boolean;
  hp: number;
  blockProjectile: boolean;
}

/** Ground tile visual definitions. Keyed by TileId. */
export const TILE_DEFS: Record<TileId, TileDef> = {
  [TileId.GRASS]: { spriteKey: 'ground-01a', blendColor: 'rgba(90,122,58,0.55)' },
  [TileId.DIRT]:  { spriteKey: 'ground-02a', blendColor: 'rgba(138,106,58,0.55)' },
  [TileId.STONE]: { spriteKey: 'ground-01b', blendColor: 'rgba(100,100,100,0.55)' },
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
  'B': { ground: TileId.GRASS, object: ObjectId.BLOCK },
  'H': { ground: TileId.GRASS, object: ObjectId.HEDGE },
  'C': { ground: TileId.GRASS, object: ObjectId.CONTAINER },
  'W': { ground: TileId.STONE, object: ObjectId.WALL },
  'P': { ground: TileId.GRASS, object: ObjectId.NONE }, // player spawn marker
  'S': { ground: TileId.GRASS, object: ObjectId.NONE }, // enemy spawn marker
};
