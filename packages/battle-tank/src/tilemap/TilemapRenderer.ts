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

  // Transition blending layer (between ground layer and object layer)
  const blendW = ts * MAP_CONFIG.tileTransitionWidth;
  const DIRS = [
    { dr: 0, dc:  1 }, // right
    { dr: 0, dc: -1 }, // left
    { dr:  1, dc: 0 }, // bottom
    { dr: -1, dc: 0 }, // top
  ] as const;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = tilemap.get(r, c);
      if (!cell) continue;

      for (const { dr, dc } of DIRS) {
        const nb = tilemap.get(r + dr, c + dc);
        if (!nb || nb.ground === cell.ground) continue;

        const nbColor = TILE_DEFS[nb.ground].blendColor;
        let rx: number, ry: number, rw: number, rh: number;
        let gx0: number, gy0: number, gx1: number, gy1: number;

        if (dc === 1) {        // right neighbor
          rx = (c + 1) * ts - blendW; ry = r * ts; rw = blendW; rh = ts;
          gx0 = rx; gy0 = ry; gx1 = rx + blendW; gy1 = ry;
        } else if (dc === -1) { // left neighbor
          rx = c * ts; ry = r * ts; rw = blendW; rh = ts;
          gx0 = rx + blendW; gy0 = ry; gx1 = rx; gy1 = ry;
        } else if (dr === 1) { // bottom neighbor
          rx = c * ts; ry = (r + 1) * ts - blendW; rw = ts; rh = blendW;
          gx0 = rx; gy0 = ry; gx1 = rx; gy1 = ry + blendW;
        } else {               // top neighbor
          rx = c * ts; ry = r * ts; rw = ts; rh = blendW;
          gx0 = rx; gy0 = ry + blendW; gx1 = rx; gy1 = ry;
        }

        const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, nbColor);
        ctx.fillStyle = grad;
        ctx.fillRect(rx, ry, rw, rh);
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
