import type { MapGenConfig } from '../maps/MapGenerator.js';
import { TileId, ObjectId, DecorId } from '../tilemap/types.js';

/**
 * Preset for survival_01-style symmetric map.
 * Quad symmetry, mixed terrain, moderate object density.
 */
export const SURVIVAL_GEN_CONFIG: MapGenConfig = {
  rows: 18,
  cols: 24,
  seed: 1,
  symmetry: 'quad',
  enemySpawnCount: 4,
  terrainWeights: {
    [TileId.GRASS]:  6,
    [TileId.DIRT]:   3,
    [TileId.STONE]:  2,
    [TileId.MUD]:    1,
    [TileId.SAND]:   1,
    [TileId.PUDDLE]: 1,
  },
  objectDensity: {
    block: 6,
    container: 5,
    wallSegmentCount: 2,
    wallSegmentLength: 3,
  },
  spawnClearRadius: 2,
};

/**
 * Preset for arena_01: open center, sand/stone theme, more cover.
 * Horizontal symmetry, wider lanes, denser objects.
 */
export const ARENA_GEN_CONFIG: MapGenConfig = {
  rows: 18,
  cols: 24,
  seed: 7,
  symmetry: 'h',
  enemySpawnCount: 4,
  terrainWeights: {
    [TileId.SAND]:   5,
    [TileId.STONE]:  4,
    [TileId.DIRT]:   3,
    [TileId.GRASS]:  2,
    [TileId.ICE]:    1,
  },
  objectDensity: {
    block: 9,
    container: 6,
    wallSegmentCount: 4,
    wallSegmentLength: 4,
  },
  spawnClearRadius: 2,
};

// ---------------------------------------------------------------------------
// Decor scatter configuration
// ---------------------------------------------------------------------------

export interface GroundDecorEntry {
  decors: DecorId[];
  probability: number;
}

export interface NearWallEntry {
  decors: DecorId[];
  probability: number;
  /** Object types whose adjacency triggers pipe/industrial decor. */
  adjacentObjects: ObjectId[];
}

export interface HedgehogEntry {
  /** Probability per open interior cell. */
  probability: number;
  /** Manhattan distance from any spawn point below which hedgehogs are suppressed. */
  minDistFromSpawn: number;
}

/**
 * Controls all three post-load decor passes.
 * All numeric values are config-driven — no inline magic numbers.
 */
export interface DecorScatterConfig {
  border:   { decors: DecorId[]; probability: number };
  byGround: Partial<Record<TileId, GroundDecorEntry>>;
  nearWall: NearWallEntry;
  hedgehog: HedgehogEntry;
}

const BLAST_TRAILS: DecorId[] = [
  DecorId.BLAST_TRAIL_1, DecorId.BLAST_TRAIL_2, DecorId.BLAST_TRAIL_3,
  DecorId.BLAST_TRAIL_4, DecorId.BLAST_TRAIL_5, DecorId.BLAST_TRAIL_6,
];
const BORDERS: DecorId[] = [DecorId.BORDER_A, DecorId.BORDER_B, DecorId.BORDER_C];
const PUDDLES: DecorId[] = [
  DecorId.PUDDLE_1, DecorId.PUDDLE_2, DecorId.PUDDLE_3,
  DecorId.PUDDLE_4, DecorId.PUDDLE_5, DecorId.PUDDLE_6,
];

export const DECOR_SCATTER_CONFIG: DecorScatterConfig = {
  border: { decors: BORDERS, probability: 0.35 },
  byGround: {
    [TileId.STONE]: { decors: BLAST_TRAILS, probability: 0.10 },
    [TileId.DIRT]:  { decors: PUDDLES,      probability: 0.12 },
    [TileId.MUD]:   { decors: PUDDLES,      probability: 0.18 },
  },
  nearWall: {
    decors: [],
    probability: 0.20,
    adjacentObjects: [ObjectId.WALL, ObjectId.BLOCK],
  },
  hedgehog: {
    probability: 0.035,
    minDistFromSpawn: 3,
  },
};
