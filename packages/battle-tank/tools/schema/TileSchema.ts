import type { TileId, ObjectId, DecorId } from '../../src/tilemap/types.js';
import type { TileDef, ObjectDef, DecorDef } from '../../src/tilemap/TileRegistry.js';

/**
 * Tile schema — unified description of all available tiles, objects, and decors.
 * Used by LLM map generator and designer tools.
 */
export interface TileSchema {
  tiles: Record<TileId, TileDef>;
  objects: Record<ObjectId, ObjectDef>;
  decors: Record<DecorId, DecorDef>;
  charMap: Record<string, { ground: TileId; object: ObjectId }>;
  constraints: {
    minRows: number;
    maxRows: number;
    minCols: number;
    maxCols: number;
    tileSize: number;
  };
}
