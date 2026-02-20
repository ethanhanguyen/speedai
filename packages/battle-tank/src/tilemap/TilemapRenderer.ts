import type { GridModel, CameraSystem, AssetManager, LayerCache } from '@speedai/game-engine';
import { bakeLayer, drawLayerSlice } from '@speedai/game-engine';
import type { TileCell } from './types.js';
import { ObjectId } from './types.js';
import { TILE_DEFS, OBJECT_DEFS, DECOR_DEFS } from './TileRegistry.js';
import type { ObjectDef } from './TileRegistry.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { ENGINE_CONFIG } from '../config/EngineConfig.js';
import { getRotatedDimensions } from './MultiTileUtils.js';

// ---------------------------------------------------------------------------
// Static layer baking (ground + decor)
// ---------------------------------------------------------------------------

/**
 * Returns 0–3: deterministic per-cell 90° rotation step.
 * Breaks uniform texture repeat without new art.
 */
function groundRotationIndex(r: number, c: number): number {
  const { hashRowPrime, hashColPrime } = MAP_CONFIG.TILE_COHERENCE;
  return ((r * hashRowPrime) ^ (c * hashColPrime)) & 0x3;
}

/**
 * Deterministic hash for decor placement variation.
 * Returns value in [0, 1) based on tile position and decor index.
 */
function decorHash(r: number, c: number, decorIndex: number): number {
  const { hashRowPrime, hashColPrime } = MAP_CONFIG.TILE_COHERENCE;
  const h = ((r * hashRowPrime) ^ (c * hashColPrime) ^ (decorIndex * 37)) >>> 0;
  return (h % 1000) / 1000;
}

/**
 * Bake the static ground + decor layers into a single offscreen canvas.
 *
 * Tier A — Deterministic per-cell 90° rotation breaks uniform texture repeat.
 * Tier B — Cardinal-neighbor alpha-blend transition softens terrain seams.
 * Decor — Rendered on top of ground after transitions.
 *
 * Call once at scene init; pass the result to `drawTilemap()` each frame.
 * The object layer (destructibles) is excluded — it stays per-frame.
 */
export function bakeTilemapGroundLayer(
  tilemap: GridModel<TileCell>,
  assets: AssetManager,
): LayerCache {
  const ts = MAP_CONFIG.tileSize;
  const { transitionWidth: W, transitionAlpha } = MAP_CONFIG.TILE_COHERENCE;

  // Reusable strip canvases for Tier B — one per orientation.
  const stripH    = document.createElement('canvas'); stripH.width = W; stripH.height = ts;
  const stripHCtx = stripH.getContext('2d') as CanvasRenderingContext2D;
  const stripV    = document.createElement('canvas'); stripV.width = ts; stripV.height = W;
  const stripVCtx = stripV.getContext('2d') as CanvasRenderingContext2D;

  return bakeLayer(
    { worldWidth: tilemap.cols * ts, worldHeight: tilemap.rows * ts },
    (ctx) => {
      // ---------------------------------------------------------------
      // Tier A: ground tiles with deterministic per-cell 90° rotation
      // ---------------------------------------------------------------
      for (let r = 0; r < tilemap.rows; r++) {
        for (let c = 0; c < tilemap.cols; c++) {
          const cell = tilemap.get(r, c);
          if (!cell) continue;
          const def = TILE_DEFS[cell.ground];
          const img = assets.getImage(def.spriteKey);
          if (!img) continue;

          const rot = groundRotationIndex(r, c);
          if (rot !== 0) {
            const cx = c * ts + ts / 2;
            const cy = r * ts + ts / 2;
            ctx.translate(cx, cy);
            ctx.rotate(rot * Math.PI / 2);
            ctx.translate(-cx, -cy);
          }
          ctx.drawImage(img, c * ts, r * ts, ts, ts);
          if (rot !== 0) ctx.resetTransform(); // bake ctx always starts at identity

          if (def.tint) {
            ctx.globalAlpha = def.tint.alpha;
            ctx.fillStyle = def.tint.color;
            ctx.fillRect(c * ts, r * ts, ts, ts);
            ctx.globalAlpha = 1;
          }
        }
      }

      // ---------------------------------------------------------------
      // Tier B: cross-terrain alpha-blend transitions at seam edges
      // For each tile, blend each differing cardinal neighbor's edge
      // using an offscreen canvas + destination-in gradient masking.
      // ---------------------------------------------------------------
      const DIRS = [
        { dr:  0, dc:  1, isH: true,  atEnd: true  }, // right
        { dr:  0, dc: -1, isH: true,  atEnd: false }, // left
        { dr:  1, dc:  0, isH: false, atEnd: true  }, // bottom
        { dr: -1, dc:  0, isH: false, atEnd: false }, // top
      ] as const;

      for (let r = 0; r < tilemap.rows; r++) {
        for (let c = 0; c < tilemap.cols; c++) {
          const cell = tilemap.get(r, c);
          if (!cell) continue;

          for (const dir of DIRS) {
            const nr = r + dir.dr;
            const nc = c + dir.dc;
            if (nr < 0 || nr >= tilemap.rows || nc < 0 || nc >= tilemap.cols) continue;
            const neighbor = tilemap.get(nr, nc);
            if (!neighbor || neighbor.ground === cell.ground) continue;

            const nImg = assets.getImage(TILE_DEFS[neighbor.ground].spriteKey);
            if (!nImg) continue;

            if (dir.isH) {
              // Blend a W×ts vertical strip at the left or right edge of this tile.
              // srcX: for a right neighbor, take its left strip (x=0);
              //       for a left  neighbor, take its right strip (x=ts−W).
              const srcX = dir.atEnd ? 0 : ts - W;
              stripHCtx.clearRect(0, 0, W, ts);
              stripHCtx.drawImage(nImg, srcX, 0, W, ts, 0, 0, W, ts);
              // Gradient fades from transparent (away from seam) → transitionAlpha (at seam).
              const grd = stripHCtx.createLinearGradient(
                dir.atEnd ? 0 : W, 0,
                dir.atEnd ? W : 0, 0,
              );
              grd.addColorStop(0, 'rgba(0,0,0,0)');
              grd.addColorStop(1, `rgba(0,0,0,${transitionAlpha})`);
              stripHCtx.globalCompositeOperation = 'destination-in';
              stripHCtx.fillStyle = grd;
              stripHCtx.fillRect(0, 0, W, ts);
              stripHCtx.globalCompositeOperation = 'source-over';
              ctx.drawImage(stripH, dir.atEnd ? c * ts + ts - W : c * ts, r * ts);
            } else {
              // Blend a ts×W horizontal strip at the top or bottom edge of this tile.
              const srcY = dir.atEnd ? 0 : ts - W;
              stripVCtx.clearRect(0, 0, ts, W);
              stripVCtx.drawImage(nImg, 0, srcY, ts, W, 0, 0, ts, W);
              const grd = stripVCtx.createLinearGradient(
                0, dir.atEnd ? 0 : W,
                0, dir.atEnd ? W : 0,
              );
              grd.addColorStop(0, 'rgba(0,0,0,0)');
              grd.addColorStop(1, `rgba(0,0,0,${transitionAlpha})`);
              stripVCtx.globalCompositeOperation = 'destination-in';
              stripVCtx.fillStyle = grd;
              stripVCtx.fillRect(0, 0, ts, W);
              stripVCtx.globalCompositeOperation = 'source-over';
              ctx.drawImage(stripV, c * ts, dir.atEnd ? r * ts + ts - W : r * ts);
            }
          }
        }
      }

      // ---------------------------------------------------------------
      // Decor layer (rendered on top of ground + transitions)
      // ---------------------------------------------------------------
      for (let r = 0; r < tilemap.rows; r++) {
        for (let c = 0; c < tilemap.cols; c++) {
          const cell = tilemap.get(r, c);
          if (!cell || !cell.decors || cell.decors.length === 0) continue;
          for (let i = 0; i < cell.decors.length; i++) {
            const decorId = cell.decors[i];
            const def = DECOR_DEFS[decorId];
            if (!def) continue;
            const img = assets.getImage(def.spriteKey);
            if (!img) continue;

            // Position-hash determines scale within range
            const scaleHash = decorHash(r, c, i);
            const scale = def.scaleRange.min + scaleHash * (def.scaleRange.max - def.scaleRange.min);
            const drawn = ts * scale;

            // Position-hash determines offset from tile center
            let offsetX = (ts - drawn) / 2;
            let offsetY = (ts - drawn) / 2;
            if (def.offsetRange) {
              const offsetHashX = decorHash(r, c, i * 2 + 1);
              const offsetHashY = decorHash(r, c, i * 2 + 2);
              offsetX += (offsetHashX * 2 - 1) * def.offsetRange.x;
              offsetY += (offsetHashY * 2 - 1) * def.offsetRange.y;
            }

            ctx.drawImage(img, c * ts + offsetX, r * ts + offsetY, drawn, drawn);
          }
        }
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Per-frame draw
// ---------------------------------------------------------------------------

/**
 * Draw the static ground layer (ground tiles + decor) in screen space.
 * Must be called BEFORE camera transform is applied.
 *
 * With `groundCache`: single offscreen canvas blit (fast path).
 * Without `groundCache`: per-tile fallback in world space (requires camera transform).
 */
export function drawGroundLayer(
  ctx: CanvasRenderingContext2D,
  tilemap: GridModel<TileCell>,
  camera: CameraSystem,
  assets: AssetManager,
  groundCache?: LayerCache,
): void {
  if (groundCache) {
    // Screen-space blit from baked canvas
    const vw = ENGINE_CONFIG.canvas.width / camera.zoom;
    const vh = ENGINE_CONFIG.canvas.height / camera.zoom;
    drawLayerSlice(
      ctx, groundCache,
      camera.x, camera.y,
      vw, vh,
      ENGINE_CONFIG.canvas.width, ENGINE_CONFIG.canvas.height,
    );
  } else {
    // Fallback: per-tile rendering in world space (camera transform must be applied first)
    const ts = MAP_CONFIG.tileSize;
    const { startCol, endCol, startRow, endRow } = getVisibleRange(camera, tilemap.cols, tilemap.rows);
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = tilemap.get(r, c);
        if (!cell) continue;
        const def = TILE_DEFS[cell.ground];
        const img = assets.getImage(def.spriteKey);
        if (img) ctx.drawImage(img, c * ts, r * ts, ts, ts);
        if (def.tint) {
          ctx.save();
          ctx.globalAlpha = def.tint.alpha;
          ctx.fillStyle = def.tint.color;
          ctx.fillRect(c * ts, r * ts, ts, ts);
          ctx.restore();
        }
      }
    }
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = tilemap.get(r, c);
        if (!cell || !cell.decors || cell.decors.length === 0) continue;
        for (let i = 0; i < cell.decors.length; i++) {
          const decorId = cell.decors[i];
          const def = DECOR_DEFS[decorId];
          if (!def) continue;
          const img = assets.getImage(def.spriteKey);
          if (!img) continue;

          // Position-hash determines scale within range
          const scaleHash = decorHash(r, c, i);
          const scale = def.scaleRange.min + scaleHash * (def.scaleRange.max - def.scaleRange.min);
          const drawn = ts * scale;

          // Position-hash determines offset from tile center
          let offsetX = (ts - drawn) / 2;
          let offsetY = (ts - drawn) / 2;
          if (def.offsetRange) {
            const offsetHashX = decorHash(r, c, i * 2 + 1);
            const offsetHashY = decorHash(r, c, i * 2 + 2);
            offsetX += (offsetHashX * 2 - 1) * def.offsetRange.x;
            offsetY += (offsetHashY * 2 - 1) * def.offsetRange.y;
          }

          ctx.drawImage(img, c * ts + offsetX, r * ts + offsetY, drawn, drawn);
        }
      }
    }
  }
}

/**
 * Draw the dynamic object layer (destructibles) in world space.
 * Must be called AFTER camera transform is applied.
 */
export function drawObjectLayer(
  ctx: CanvasRenderingContext2D,
  tilemap: GridModel<TileCell>,
  camera: CameraSystem,
  assets: AssetManager,
): void {
  const ts = MAP_CONFIG.tileSize;
  const { startCol, endCol, startRow, endRow } = getVisibleRange(camera, tilemap.cols, tilemap.rows);
  const rendered = new Set<string>(); // Track already-rendered multi-tile objects

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = tilemap.get(r, c);
      if (!cell) continue;

      // Skip continuation cells (they're rendered with their anchor)
      if (cell.multiTileAnchor) continue;

      // Skip empty cells
      if (cell.object === ObjectId.NONE) continue;

      const cellKey = `${r},${c}`;
      if (rendered.has(cellKey)) continue;

      const def = OBJECT_DEFS[cell.object];
      const spriteKey = resolveObjectSprite(def, r, c, tilemap.cols);
      const img = assets.getImage(spriteKey);
      if (!img) continue;

      const gridSpan = def.gridSpan ?? { w: 1, h: 1 };
      const displaySize = def.displaySize ?? { w: gridSpan.w * ts, h: gridSpan.h * ts };
      const pivot = def.pivot ?? MAP_CONFIG.MULTI_TILE.defaultPivot;
      const rotation = cell.objectRotation ?? 0;

      // Calculate object center in world space using rotation-aware dimensions
      const rotatedSpan = getRotatedDimensions(gridSpan, rotation);
      const centerX = c * ts + (rotatedSpan.w * ts) / 2;
      const centerY = r * ts + (rotatedSpan.h * ts) / 2;

      // Calculate pivot offset (normalized to pixels)
      const pivotOffsetX = (pivot.x - 0.5) * displaySize.w;
      const pivotOffsetY = (pivot.y - 0.5) * displaySize.h;

      ctx.save();
      ctx.translate(centerX, centerY);
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }
      ctx.translate(pivotOffsetX, pivotOffsetY);
      ctx.drawImage(
        img,
        -displaySize.w / 2,
        -displaySize.h / 2,
        displaySize.w,
        displaySize.h,
      );
      ctx.restore();

      rendered.add(cellKey);
    }
  }
}


/**
 * Deterministically pick a sprite variant for an object cell.
 * Uses position-hash so identical adjacent objects look varied.
 * Falls back to `def.spriteKey` when no variants are defined.
 */
export function resolveObjectSprite(def: ObjectDef, r: number, c: number, mapCols: number): string {
  if (!def.spriteVariants || def.spriteVariants.length === 0) return def.spriteKey;
  return def.spriteVariants[(r * mapCols + c) % def.spriteVariants.length];
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
    endCol:   Math.min(mapCols - 1, Math.ceil((camera.x + halfW) / ts) + 1),
    startRow: Math.max(0, Math.floor((camera.y - halfH) / ts) - 1),
    endRow:   Math.min(mapRows - 1, Math.ceil((camera.y + halfH) / ts) + 1),
  };
}
