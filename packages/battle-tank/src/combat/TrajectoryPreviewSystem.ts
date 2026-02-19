import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';

/**
 * Draws a dotted trajectory preview for the rifled gun (bouncing projectile).
 * Pure drawing utility — no state, no entities.
 */
export function drawTrajectoryPreview(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  angle: number,
  bouncesMax: number,
  tilemap: GridModel<TileCell>,
): void {
  const cfg   = COMBAT_CONFIG.trajectoryPreview;
  const ts    = MAP_CONFIG.tileSize;
  let vx = Math.sin(angle);
  let vy = -Math.cos(angle);

  let x = startX;
  let y = startY;
  let bouncesLeft = bouncesMax;
  let totalDots = 0;
  const maxDots = cfg.segmentCount * cfg.stepsPerSegment;

  ctx.save();
  ctx.globalAlpha = cfg.alpha;
  ctx.fillStyle   = cfg.color;

  let distSinceLastDot = 0;

  for (let step = 0; step < maxDots; step++) {
    x += vx * cfg.stepPx;
    y += vy * cfg.stepPx;
    distSinceLastDot += cfg.stepPx;

    const col  = Math.floor(x / ts);
    const row  = Math.floor(y / ts);
    const cell = tilemap.get(row, col);

    if (!cell) break;

    if (cell.object !== ObjectId.NONE && OBJECT_DEFS[cell.object].blockProjectile) {
      if (bouncesLeft <= 0) break;

      // Detect which axis we hit
      const prevCol = Math.floor((x - vx * cfg.stepPx) / ts);
      const prevRow = Math.floor((y - vy * cfg.stepPx) / ts);
      const movedX  = prevCol !== col;
      const movedY  = prevRow !== row;

      if (movedX) vx = -vx;
      if (movedY) vy = -vy;
      if (!movedX && !movedY) { vx = -vx; vy = -vy; } // corner

      bouncesLeft--;
      // Step out of wall
      x += vx * cfg.stepPx;
      y += vy * cfg.stepPx;
    }

    if (distSinceLastDot >= cfg.dotSpacingPx) {
      ctx.beginPath();
      ctx.arc(x, y, cfg.dotRadius, 0, Math.PI * 2);
      ctx.fill();
      distSinceLastDot = 0;
      totalDots++;
    }
  }

  ctx.restore();
}
