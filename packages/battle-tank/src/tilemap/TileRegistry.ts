import { TileId, ObjectId, DecorId } from './types.js';

export interface ObjectDef {
  spriteKey: string;
  /** Optional sprite variants — visual only. Position-hash selects one. */
  spriteVariants?: string[];
  walkable: boolean;
  destructible: boolean;
  hp: number;
  blockProjectile: boolean;
  /** Grid cells occupied (width, height). Default: {w:1, h:1}. */
  gridSpan?: { w: number; h: number };
  /** Allowed rotation angles in degrees. Default: [0]. */
  orientations?: number[];
  /** Display size in pixels. Default: gridSpan * tileSize. */
  displaySize?: { w: number; h: number };
  /** Pivot point (0-1 normalized). Default: {x:0.5, y:0.5} = center. */
  pivot?: { x: number; y: number };
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
  /** Scale range: position-hash selects value between min and max. */
  scaleRange: { min: number; max: number };
  /** Offset range (in pixels): position-hash determines offset from tile center. */
  offsetRange?: { x: number; y: number };
}

/** Ground tile visual definitions. Keyed by TileId. */
export const TILE_DEFS: Record<TileId, TileDef> = {
  [TileId.GRASS]:  { spriteKey: 'ground-01a' },
  [TileId.DIRT]:   { spriteKey: 'ground-02a' },
  [TileId.STONE]:  { spriteKey: 'ground-01b' },
  [TileId.MUD]:    { spriteKey: 'ground-02a', tint: { color: '#3a2a10', alpha: 0.35 } },
  [TileId.SAND]:   { spriteKey: 'ground-02a', tint: { color: '#c2b280', alpha: 0.3 } },
  [TileId.ICE]:    { spriteKey: 'ground-winter' },
  [TileId.WATER]:  { spriteKey: 'ground-water' },
  [TileId.PUDDLE]: { spriteKey: 'ground-01a',  tint: { color: '#3a6090', alpha: 0.35 } },
};

/** Object definitions: visual + gameplay flags. Keyed by ObjectId. */
export const OBJECT_DEFS: Record<ObjectId, ObjectDef> = {
  [ObjectId.NONE]: {
    spriteKey: '',
    walkable: true,
    destructible: false,
    hp: 0,
    blockProjectile: false,
  },
  [ObjectId.BLOCK]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 2, h: 2 },
    displaySize: { w: 128, h: 128 },
    orientations: [0],
  },
  [ObjectId.CONTAINER]: {
    spriteKey: 'container-a',
    spriteVariants: ['container-a', 'container-b', 'container-c', 'container-d'],
    walkable: false,
    destructible: true,
    hp: 3,
    blockProjectile: true,
    gridSpan: { w: 1, h: 2 },
    displaySize: { w: 64, h: 128 },
    orientations: [0, 90],
  },
  [ObjectId.WALL]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.HEDGEHOG]: {
    spriteKey: 'hedgehog-a',
    spriteVariants: ['hedgehog-a', 'hedgehog-b'],
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0, 90],
  },
};

/** Decoration visual definitions. Keyed by DecorId. */
export const DECOR_DEFS: Record<DecorId, DecorDef> = {
  // Blast trails — large, centered (battle damage)
  [DecorId.BLAST_1]: { spriteKey: 'decor-blast-1', scaleRange: { min: 0.9, max: 1.1 }, offsetRange: { x: 6, y: 6 } },
  [DecorId.BLAST_2]: { spriteKey: 'decor-blast-2', scaleRange: { min: 0.9, max: 1.1 }, offsetRange: { x: 6, y: 6 } },
  [DecorId.BLAST_3]: { spriteKey: 'decor-blast-3', scaleRange: { min: 0.9, max: 1.1 }, offsetRange: { x: 6, y: 6 } },
  [DecorId.BLAST_4]: { spriteKey: 'decor-blast-4', scaleRange: { min: 0.9, max: 1.1 }, offsetRange: { x: 6, y: 6 } },
  [DecorId.BLAST_5]: { spriteKey: 'decor-blast-5', scaleRange: { min: 0.9, max: 1.1 }, offsetRange: { x: 6, y: 6 } },
  [DecorId.BLAST_6]: { spriteKey: 'decor-blast-6', scaleRange: { min: 0.9, max: 1.1 }, offsetRange: { x: 6, y: 6 } },
  // Border decorations — large, minimal offset (edge clutter)
  [DecorId.BORDER_A]: { spriteKey: 'decor-border-a', scaleRange: { min: 0.85, max: 1.0 }, offsetRange: { x: 4, y: 4 } },
  [DecorId.BORDER_B]: { spriteKey: 'decor-border-b', scaleRange: { min: 0.85, max: 1.0 }, offsetRange: { x: 4, y: 4 } },
  [DecorId.BORDER_C]: { spriteKey: 'decor-border-c', scaleRange: { min: 0.85, max: 1.0 }, offsetRange: { x: 4, y: 4 } },
  // Puddles — small, scattered (can stack multiple)
  [DecorId.PUDDLE_1]: { spriteKey: 'decor-puddle-1', scaleRange: { min: 0.5, max: 0.8 }, offsetRange: { x: 10, y: 10 } },
  [DecorId.PUDDLE_2]: { spriteKey: 'decor-puddle-2', scaleRange: { min: 0.5, max: 0.8 }, offsetRange: { x: 10, y: 10 } },
  [DecorId.PUDDLE_3]: { spriteKey: 'decor-puddle-3', scaleRange: { min: 0.5, max: 0.8 }, offsetRange: { x: 10, y: 10 } },
  [DecorId.PUDDLE_4]: { spriteKey: 'decor-puddle-4', scaleRange: { min: 0.5, max: 0.8 }, offsetRange: { x: 10, y: 10 } },
  [DecorId.PUDDLE_5]: { spriteKey: 'decor-puddle-5', scaleRange: { min: 0.5, max: 0.8 }, offsetRange: { x: 10, y: 10 } },
  [DecorId.PUDDLE_6]: { spriteKey: 'decor-puddle-6', scaleRange: { min: 0.5, max: 0.8 }, offsetRange: { x: 10, y: 10 } },
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
  'P': { ground: TileId.GRASS,  object: ObjectId.NONE },     // player spawn marker
  'S': { ground: TileId.GRASS,  object: ObjectId.NONE },     // enemy spawn marker
  'H': { ground: TileId.GRASS,  object: ObjectId.HEDGEHOG }, // Czech hedgehog obstacle
};
