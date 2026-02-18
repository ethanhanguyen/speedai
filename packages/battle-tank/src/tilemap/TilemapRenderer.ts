import type { GridModel, CameraSystem, AssetManager } from '@speedai/game-engine';
import type { TileCell } from './types.js';
import { ObjectId } from './types.js';
import { TILE_DEFS, OBJECT_DEFS } from './TileRegistry.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { ENGINE_CONFIG } from '../config/EngineConfig.js';

/**
 * Draws a GridModel<TileCell> with camera-based culling.
 * Assumes ctx is already transformed to world space (camera applied).
 */
export function drawTilemap(
  ctx: CanvasRenderingContext2D,
  tilemap: GridModel<TileCell>,
  camera: CameraSystem,
  assets: AssetManager,
): void {
  const ts = MAP_CONFIG.tileSize;
  const { startCol, endCol, startRow, endRow } = getVisibleRange(camera, tilemap.cols, tilemap.rows);

  // Ground layer (z-order: bottom)
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = tilemap.get(r, c);
      if (!cell) continue;
      const img = assets.getImage(TILE_DEFS[cell.ground].spriteKey);
      if (img) {
        ctx.drawImage(img, c * ts, r * ts, ts, ts);
      }
    }
  }

  // Object layer (z-order: above ground)
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = tilemap.get(r, c);
      if (!cell || cell.object === ObjectId.NONE) continue;
      const def = OBJECT_DEFS[cell.object];
      const img = assets.getImage(def.spriteKey);
      if (img) {
        ctx.drawImage(img, c * ts, r * ts, ts, ts);
      }
    }
  }
}

function getVisibleRange(
  camera: CameraSystem,
  mapCols: number,
  mapRows: number,
): { startCol: number; endCol: number; startRow: number; endRow: number } {
  const ts = MAP_CONFIG.tileSize;
  const halfW = (ENGINE_CONFIG.canvas.width / 2) / camera.zoom;
  const halfH = (ENGINE_CONFIG.canvas.height / 2) / camera.zoom;

  return {
    startCol: Math.max(0, Math.floor((camera.x - halfW) / ts) - 1),
    endCol: Math.min(mapCols - 1, Math.ceil((camera.x + halfW) / ts) + 1),
    startRow: Math.max(0, Math.floor((camera.y - halfH) / ts) - 1),
    endRow: Math.min(mapRows - 1, Math.ceil((camera.y + halfH) / ts) + 1),
  };
}
