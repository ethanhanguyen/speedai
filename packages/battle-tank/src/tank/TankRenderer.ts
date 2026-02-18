import type { EntityManager, AssetManager } from '@speedai/game-engine';
import { TANK_PARTS } from './TankParts.js';
import type { TankPartsComponent } from './TankParts.js';

/**
 * Draw all tank entities. Assumes ctx is in world space (camera applied).
 * Draw order per tank: tracks → hull → turret.
 */
export function drawTanks(
  ctx: CanvasRenderingContext2D,
  em: EntityManager,
  assets: AssetManager,
): void {
  const ids = em.query('Position', TANK_PARTS);

  for (const id of ids) {
    const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
    const tank = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
    if (!pos || !tank) continue;

    // --- Tracks (drawn first, under hull) ---
    const trackImg = assets.getImage(tank.trackKey) as CanvasImageSource | undefined;
    if (trackImg) {
      drawPart(ctx, trackImg, pos.x, pos.y, tank.hullAngle,
        -tank.trackSpacing, 0, tank.trackWidth, tank.trackHeight);
      drawPart(ctx, trackImg, pos.x, pos.y, tank.hullAngle,
        tank.trackSpacing, 0, tank.trackWidth, tank.trackHeight);
    }

    // --- Hull ---
    const hullImg = assets.getImage(tank.hullKey) as CanvasImageSource | undefined;
    if (hullImg) {
      drawPart(ctx, hullImg, pos.x, pos.y, tank.hullAngle,
        0, 0, tank.hullWidth, tank.hullHeight);
    }

    // --- Turret (drawn last, on top) ---
    const turretImg = assets.getImage(tank.turretKey) as CanvasImageSource | undefined;
    if (turretImg) {
      // Pivot near turret base: offset drawing so pivot point is at (0,0)
      const offsetY = tank.turretHeight * (0.5 - tank.turretPivotY);
      drawPart(ctx, turretImg, pos.x, pos.y, tank.turretAngle,
        0, offsetY, tank.turretWidth, tank.turretHeight);
    }
  }
}

/**
 * Draw a single part at (worldX, worldY) with a rotation and local offset.
 * localOffsetX: perpendicular to heading (+ = right).
 * localOffsetY: along heading (+ = forward).
 */
function drawPart(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  worldX: number,
  worldY: number,
  angle: number,
  localOffsetX: number,
  localOffsetY: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.translate(worldX, worldY);
  ctx.rotate(angle);
  ctx.drawImage(
    img,
    localOffsetX - width / 2,
    localOffsetY - height / 2,
    width,
    height,
  );
  ctx.restore();
}
