import { TileId, ObjectId, DecorId } from './types.js';
import { buildObjectDefsMap, getAllObjects } from '../config/ObjectDatabase.js';
import { getAllTerrains } from '../config/TerrainDatabase.js';

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

/**
 * Object definitions: visual + gameplay flags. Keyed by ObjectId.
 * Generated from ObjectData.json via buildObjectDefsMap() — single source of truth.
 */
export const OBJECT_DEFS: Record<ObjectId, ObjectDef> = buildObjectDefsMap() as Record<ObjectId, ObjectDef>;

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
 * Generated from TerrainData.json + ObjectData.json (single source of truth).
 * When symbols conflict, objects win (they're placed on default ground).
 * Spawns use '1' (player) and '2' (enemy).
 */
function buildCharMap(): Record<string, { ground: TileId; object: ObjectId }> {
  const map: Record<string, { ground: TileId; object: ObjectId }> = {};

  // Step 1: terrain symbols → ground-only entries
  for (const terrain of getAllTerrains()) {
    map[terrain.symbol] = { ground: terrain.name as TileId, object: ObjectId.NONE };
  }

  // Step 2: object symbols override (objects placed on default ground)
  for (const obj of getAllObjects()) {
    map[obj.symbol] = { ground: TileId.LOOSE_SAND, object: obj.name as ObjectId };
  }

  // Step 3: spawn markers
  map['1'] = { ground: TileId.HARDPAN, object: ObjectId.NONE };
  map['2'] = { ground: TileId.HARDPAN, object: ObjectId.NONE };

  return map;
}

export const CHAR_MAP = buildCharMap();
