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
  [TileId.LOOSE_SAND]:         { spriteKey: 'ground-02a', tint: { color: '#d4a574', alpha: 0.25 } },
  [TileId.HARDPAN]:            { spriteKey: 'ground-01b' },
  [TileId.GRAVEL]:             { spriteKey: 'ground-02a', tint: { color: '#888888', alpha: 0.2 } },
  [TileId.ROCKY_OUTCROP]:      { spriteKey: 'ground-01b', tint: { color: '#666666', alpha: 0.4 } },
  [TileId.ASPHALT]:            { spriteKey: 'ground-01b', tint: { color: '#1a1a1a', alpha: 0.5 } },
  [TileId.MUDDY_SINKHOLE]:     { spriteKey: 'ground-02a', tint: { color: '#3a2a10', alpha: 0.4 } },
  [TileId.DUNE_SLOPE]:         { spriteKey: 'ground-02a', tint: { color: '#c9a961', alpha: 0.35 } },
  [TileId.SALT_FLAT]:          { spriteKey: 'ground-01b', tint: { color: '#f5f5dc', alpha: 0.4 } },
  [TileId.SCRUB_VEGETATION]:   { spriteKey: 'ground-02a', tint: { color: '#4a6741', alpha: 0.3 } },
  [TileId.OASIS_TURF]:         { spriteKey: 'ground-02a', tint: { color: '#6b8e23', alpha: 0.25 } },
  [TileId.WATER]:              { spriteKey: 'ground-water' },
  [TileId.GRASS_PLAINS]:       { spriteKey: 'ground-02a', tint: { color: '#228b22', alpha: 0.2 } },
  [TileId.HILLY_GROUND]:       { spriteKey: 'ground-01b', tint: { color: '#8b7355', alpha: 0.25 } },
  [TileId.FOREST_FLOOR]:       { spriteKey: 'ground-02a', tint: { color: '#1b4d1b', alpha: 0.3 } },
  [TileId.JUNGLE_UNDERBRUSH]:  { spriteKey: 'ground-02a', tint: { color: '#0d4d0d', alpha: 0.4 } },
  [TileId.ICE_SNOW_FIELD]:     { spriteKey: 'ground-01b', tint: { color: '#e6f2ff', alpha: 0.3 } },
  [TileId.DEEP_SNOW]:          { spriteKey: 'ground-01b', tint: { color: '#f0f8ff', alpha: 0.4 } },
  [TileId.URBAN_PAVEMENT]:     { spriteKey: 'ground-01b', tint: { color: '#2a2a2a', alpha: 0.45 } },
  [TileId.MARSH_SWAMP]:        { spriteKey: 'ground-02a', tint: { color: '#556B2F', alpha: 0.35 } },
  [TileId.DIRT_ROAD]:          { spriteKey: 'ground-02a', tint: { color: '#8b6f47', alpha: 0.2 } },
  [TileId.BEACH_SAND]:         { spriteKey: 'ground-02a', tint: { color: '#f4a460', alpha: 0.25 } },
  [TileId.HILL_SLOPE]:         { spriteKey: 'ground-01b', tint: { color: '#a0826d', alpha: 0.3 } },
  [TileId.CANYON_FLOOR]:       { spriteKey: 'ground-02a', tint: { color: '#704214', alpha: 0.35 } },
  [TileId.SHORELINE]:          { spriteKey: 'ground-02a', tint: { color: '#daa520', alpha: 0.25 } },
  [TileId.RAPIDS_DROP]:        { spriteKey: 'ground-water', tint: { color: '#4169e1', alpha: 0.5 } },
  [TileId.SADDLE_PASS]:        { spriteKey: 'ground-01b', tint: { color: '#9b8b7e', alpha: 0.2 } },
  [TileId.DEPRESSION]:         { spriteKey: 'ground-02a', tint: { color: '#6b6b47', alpha: 0.25 } },
  [TileId.VALLEY_FLOOR]:       { spriteKey: 'ground-02a', tint: { color: '#8fbc8f', alpha: 0.2 } },
  [TileId.RIDGE_CREST]:        { spriteKey: 'ground-01b', tint: { color: '#7b7b6b', alpha: 0.25 } },
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
  [ObjectId.WATER_CHANNEL]: {
    spriteKey: 'ground-water',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.SHIPPING_CONTAINER]: {
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
  [ObjectId.BOULDER_FORMATION]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 2, h: 2 },
    displaySize: { w: 128, h: 128 },
    orientations: [0],
  },
  [ObjectId.CLIFF_FACE]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.RUINED_STRUCTURE]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.TANK_HULL_WRECKAGE]: {
    spriteKey: 'hedgehog-a',
    spriteVariants: ['hedgehog-a', 'hedgehog-b'],
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0, 90],
  },
  [ObjectId.DEEP_WADI]: {
    spriteKey: 'ground-water',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.ESCARPMENT]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.CONCRETE_BARRIER]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.OIL_DERRICK]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  // New blocking obstacles (from ObjectData.json taxonomy)
  [ObjectId.ROCK_WALL]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.ICE_WALL]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.QUARRY_PIT_WALL]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.CANYON_WALL]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.MORAINE_RIDGE]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.KARST_OUTCROP]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.FROZEN_LAKE_EDGE]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.RAILROAD_EMBANKMENT]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.ANTI_TANK_DITCH]: {
    spriteKey: 'block-b01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
  },
  [ObjectId.MOUNTAINSIDE]: {
    spriteKey: 'block-a01',
    walkable: false,
    destructible: false,
    hp: Infinity,
    blockProjectile: true,
    gridSpan: { w: 1, h: 1 },
    orientations: [0],
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
 * Spawns use '1' (player) and '2' (enemy) to avoid conflicting with terrain symbols.
 */
export const CHAR_MAP: Record<string, { ground: TileId; object: ObjectId }> = {
  // Ground terrains (user spec symbols)
  '.': { ground: TileId.LOOSE_SAND,        object: ObjectId.NONE },
  'P': { ground: TileId.HARDPAN,           object: ObjectId.NONE },
  'G': { ground: TileId.GRAVEL,            object: ObjectId.NONE },
  'O': { ground: TileId.ROCKY_OUTCROP,     object: ObjectId.NONE },
  'A': { ground: TileId.ASPHALT,           object: ObjectId.NONE },
  '&': { ground: TileId.MUDDY_SINKHOLE,    object: ObjectId.NONE },  // Changed from 'M' to avoid conflict with moraine_ridge object
  'D': { ground: TileId.DUNE_SLOPE,        object: ObjectId.NONE },
  'S': { ground: TileId.SALT_FLAT,         object: ObjectId.NONE },
  'V': { ground: TileId.SCRUB_VEGETATION,  object: ObjectId.NONE },
  'T': { ground: TileId.OASIS_TURF,        object: ObjectId.NONE },
  ',': { ground: TileId.GRASS_PLAINS,      object: ObjectId.NONE },
  '^': { ground: TileId.HILLY_GROUND,      object: ObjectId.NONE },
  'f': { ground: TileId.FOREST_FLOOR,      object: ObjectId.NONE },
  'j': { ground: TileId.JUNGLE_UNDERBRUSH, object: ObjectId.NONE },
  'i': { ground: TileId.ICE_SNOW_FIELD,    object: ObjectId.NONE },
  'n': { ground: TileId.DEEP_SNOW,         object: ObjectId.NONE },
  'u': { ground: TileId.URBAN_PAVEMENT,    object: ObjectId.NONE },
  ';': { ground: TileId.MARSH_SWAMP,       object: ObjectId.NONE },
  'r': { ground: TileId.DIRT_ROAD,         object: ObjectId.NONE },
  'b': { ground: TileId.BEACH_SAND,        object: ObjectId.NONE },
  'h': { ground: TileId.HILL_SLOPE,        object: ObjectId.NONE },
  'c': { ground: TileId.CANYON_FLOOR,      object: ObjectId.NONE },
  'w': { ground: TileId.SHORELINE,         object: ObjectId.NONE },
  '`': { ground: TileId.RAPIDS_DROP,       object: ObjectId.NONE },
  '+': { ground: TileId.SADDLE_PASS,       object: ObjectId.NONE },
  '-': { ground: TileId.DEPRESSION,        object: ObjectId.NONE },
  '=': { ground: TileId.VALLEY_FLOOR,      object: ObjectId.NONE },  // Changed from '/' to avoid conflict with mountainside object
  '\\': { ground: TileId.RIDGE_CREST,      object: ObjectId.NONE },

  // Blocking obstacles (user spec symbols, from ObjectData.json taxonomy)
  'W': { ground: TileId.LOOSE_SAND,  object: ObjectId.WATER_CHANNEL },
  'C': { ground: TileId.LOOSE_SAND,  object: ObjectId.SHIPPING_CONTAINER },
  'R': { ground: TileId.LOOSE_SAND,  object: ObjectId.BOULDER_FORMATION },
  'X': { ground: TileId.LOOSE_SAND,  object: ObjectId.CLIFF_FACE },
  'B': { ground: TileId.LOOSE_SAND,  object: ObjectId.RUINED_STRUCTURE },
  'H': { ground: TileId.LOOSE_SAND,  object: ObjectId.TANK_HULL_WRECKAGE },
  '~': { ground: TileId.LOOSE_SAND,  object: ObjectId.DEEP_WADI },
  'E': { ground: TileId.LOOSE_SAND,  object: ObjectId.ESCARPMENT },
  'F': { ground: TileId.LOOSE_SAND,  object: ObjectId.CONCRETE_BARRIER },
  'L': { ground: TileId.LOOSE_SAND,  object: ObjectId.OIL_DERRICK },
  'p': { ground: TileId.LOOSE_SAND,  object: ObjectId.RAILROAD_EMBANKMENT },
  '_': { ground: TileId.LOOSE_SAND,  object: ObjectId.ANTI_TANK_DITCH },
  '#': { ground: TileId.LOOSE_SAND,  object: ObjectId.ROCK_WALL },
  'I': { ground: TileId.LOOSE_SAND,  object: ObjectId.ICE_WALL },
  'Q': { ground: TileId.LOOSE_SAND,  object: ObjectId.QUARRY_PIT_WALL },
  'Y': { ground: TileId.LOOSE_SAND,  object: ObjectId.CANYON_WALL },
  'M': { ground: TileId.LOOSE_SAND,  object: ObjectId.MORAINE_RIDGE },
  'K': { ground: TileId.LOOSE_SAND,  object: ObjectId.KARST_OUTCROP },
  'Z': { ground: TileId.LOOSE_SAND,  object: ObjectId.FROZEN_LAKE_EDGE },
  '/': { ground: TileId.LOOSE_SAND,  object: ObjectId.MOUNTAINSIDE },

  // Spawn markers (numeric to avoid terrain conflicts)
  '1': { ground: TileId.HARDPAN,     object: ObjectId.NONE },     // player spawn marker
  '2': { ground: TileId.HARDPAN,     object: ObjectId.NONE },     // enemy spawn marker
};
