import { TILE_DEFS, OBJECT_DEFS, DECOR_DEFS, CHAR_MAP } from '../../src/tilemap/TileRegistry.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';
import type { TileSchema } from './TileSchema.js';

/** Map size constraints for validation. */
const MAP_CONSTRAINTS = {
  minRows: 12,
  maxRows: 48,
  minCols: 12,
  maxCols: 48,
} as const;

/**
 * Build live tile schema from current registry definitions.
 * No drift — always reflects latest TileRegistry state.
 */
export function buildTileSchema(): TileSchema {
  return {
    tiles: { ...TILE_DEFS },
    objects: { ...OBJECT_DEFS },
    decors: { ...DECOR_DEFS },
    charMap: { ...CHAR_MAP },
    constraints: {
      ...MAP_CONSTRAINTS,
      tileSize: MAP_CONFIG.tileSize,
    },
  };
}
