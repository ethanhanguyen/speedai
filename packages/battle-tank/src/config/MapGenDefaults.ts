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
    [TileId.GRASS_PLAINS]:   6,
    [TileId.DIRT_ROAD]:      3,
    [TileId.ROCKY_OUTCROP]:  2,
    [TileId.MUDDY_SINKHOLE]: 1,
    [TileId.LOOSE_SAND]:     1,
    [TileId.MARSH_SWAMP]:    1,
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
    [TileId.LOOSE_SAND]:    5,
    [TileId.ROCKY_OUTCROP]: 4,
    [TileId.DIRT_ROAD]:     3,
    [TileId.GRASS_PLAINS]:  2,
    [TileId.ICE_SNOW_FIELD]:1,
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

export interface NearWallEntry {
  decors: DecorId[];
  probability: number;
  /** Object types whose adjacency triggers pipe/industrial decor. */
  adjacentObjects: ObjectId[];
}

export interface BorderScatterEntry {
  decors: DecorId[];
  probability: number;
  /** Max number of decors to place per tile (1-3). */
  maxCount: number;
}

export interface ByGroundEntry {
  decors: DecorId[];
  probability: number;
  /** Max number of decors to place per tile (1-3). */
  maxCount: number;
}

export interface HedgehogConfig {
  probability: number;
  /** Minimum tile distance from any spawn point — hedgehogs suppressed within. */
  minDistFromSpawn: number;
}

/** Controls all three decor + hedgehog scatter passes. */
export interface DecorScatterConfig {
  /** Pass 1: perimeter cells with no object. */
  border: BorderScatterEntry;
  /** Pass 2a: contextual scatter by ground type. */
  byGround: Partial<Record<TileId, ByGroundEntry>>;
  /** Pass 2b: near-wall industrial scatter. */
  nearWall: NearWallEntry;
  /** Pass 3: hedgehog obstacle placement. */
  hedgehog: HedgehogConfig;
}

const BLAST_TRAILS: DecorId[] = [
  DecorId.BLAST_1, DecorId.BLAST_2, DecorId.BLAST_3,
  DecorId.BLAST_4, DecorId.BLAST_5, DecorId.BLAST_6,
];

const PUDDLES: DecorId[] = [
  DecorId.PUDDLE_1, DecorId.PUDDLE_2, DecorId.PUDDLE_3,
  DecorId.PUDDLE_4, DecorId.PUDDLE_5, DecorId.PUDDLE_6,
];

const BORDERS: DecorId[] = [DecorId.BORDER_A, DecorId.BORDER_B, DecorId.BORDER_C];

export const DECOR_SCATTER_CONFIG: DecorScatterConfig = {
  border: {
    decors: BORDERS,
    probability: 0.35,
    maxCount: 1,
  },
  byGround: {
    [TileId.ROCKY_OUTCROP]:  { decors: BLAST_TRAILS, probability: 0.18, maxCount: 1 },
    [TileId.DIRT_ROAD]:      { decors: PUDDLES,      probability: 0.15, maxCount: 2 },
    [TileId.MUDDY_SINKHOLE]: { decors: PUDDLES,      probability: 0.20, maxCount: 3 },
  },
  nearWall: {
    decors: [],
    probability: 0,
    adjacentObjects: [ObjectId.ROCK_WALL, ObjectId.BOULDER_FORMATION],
  },
  hedgehog: {
    probability: 0.035,
    minDistFromSpawn: 3,
  },
};
