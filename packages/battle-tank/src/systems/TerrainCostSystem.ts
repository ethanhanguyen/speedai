import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import type { TerrainCosts } from '../config/PartRegistry.js';
import { MAP_CONFIG } from '../config/MapConfig.js';

/**
 * Returns the speed multiplier for the terrain tile at world position (wx, wy).
 *
 * 1.0 = normal speed
 * > 1.0 = bonus  (e.g. stone road for Narrow Steel: 1.1)
 * < 1.0 = penalty (e.g. mud for Narrow Steel: 0.7)
 *
 * Returns 1.0 if the position is out-of-bounds.
 */
export function getTerrainSpeedMod(
  tilemap: GridModel<TileCell>,
  costs: TerrainCosts,
  wx: number,
  wy: number,
): number {
  const r = Math.floor(wy / MAP_CONFIG.tileSize);
  const c = Math.floor(wx / MAP_CONFIG.tileSize);
  const cell = tilemap.get(r, c);
  return cell ? (costs[cell.ground] ?? 1) : 1;
}
