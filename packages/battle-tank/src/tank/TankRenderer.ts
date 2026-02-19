import type { EntityManager, AssetManager } from '@speedai/game-engine';
import { TANK_PARTS } from './TankParts.js';
import type { TankPartsComponent } from './TankParts.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { AI_STATE } from '../components/AI.js';
import type { AIComponent } from '../components/AI.js';

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
    const trackImg = assets.getImage(tank.trackKey) as HTMLImageElement | undefined;
    if (trackImg) {
      drawTrackScrolled(ctx, trackImg, pos.x, pos.y, tank.hullAngle,
        -tank.trackSpacing, 0, tank.trackWidth, tank.trackHeight, tank.trackOffset);
      drawTrackScrolled(ctx, trackImg, pos.x, pos.y, tank.hullAngle,
        tank.trackSpacing, 0, tank.trackWidth, tank.trackHeight, tank.trackOffset);
    }

    // --- Hull ---
    const hullImg = assets.getImage(tank.hullKey) as CanvasImageSource | undefined;
    if (hullImg) {
      drawPart(ctx, hullImg, pos.x, pos.y, tank.hullAngle,
        0, 0, tank.hullWidth, tank.hullHeight);
    }

    // --- Enemy tint overlay (per-role color) ---
    const tags = em.getComponent(id, 'Tag') as Set<string> | undefined;
    if (tags?.has('enemy')) {
      const ai = em.getComponent(id, AI_STATE) as unknown as AIComponent | undefined;
      const tint = ai ? COMBAT_CONFIG.roleTints[ai.role] : COMBAT_CONFIG.roleTints.grunt;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(tank.hullAngle);
      ctx.fillStyle = tint;
      ctx.fillRect(-tank.hullWidth / 2, -tank.hullHeight / 2,
        tank.hullWidth, tank.hullHeight);
      ctx.restore();
    }

    // --- Turret (drawn last, on top) ---
    const turretImg = assets.getImage(tank.turretKey) as CanvasImageSource | undefined;
    if (turretImg) {
      // Pivot near turret base; recoilOffset shifts barrel backward along turret axis
      const offsetY = tank.turretHeight * (0.5 - tank.turretPivotY) + tank.recoilOffset;
      drawPart(ctx, turretImg, pos.x, pos.y, tank.turretAngle,
        0, offsetY, tank.turretWidth, tank.turretHeight);
    }

    // --- Shield overlay (cyan pulse while active) ---
    if (tank.shieldElapsed > 0 && tank.shieldDuration > 0) {
      const remaining = 1 - tank.shieldElapsed / tank.shieldDuration;
      // Pulse faster as shield is about to expire
      const pulseHz = remaining > 0.2 ? 2 : 6;
      const pulse = 0.25 + 0.25 * Math.sin(tank.shieldElapsed * pulseHz * Math.PI * 2);
      ctx.save();
      ctx.globalAlpha = pulse * remaining;
      ctx.translate(pos.x, pos.y);
      ctx.rotate(tank.hullAngle);
      ctx.fillStyle = '#44ccff';
      ctx.fillRect(-tank.hullWidth / 2, -tank.hullHeight / 2,
        tank.hullWidth, tank.hullHeight);
      ctx.restore();
    }

    // --- Hit flash overlay ---
    if (tank.hitFlashElapsed > 0 && tank.hitFlashDuration > 0 && tank.hitFlashColor) {
      const alpha = Math.max(0, 1 - tank.hitFlashElapsed / tank.hitFlashDuration);
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pos.x, pos.y);
        ctx.rotate(tank.hullAngle);
        ctx.fillStyle = tank.hitFlashColor;
        ctx.fillRect(-tank.hullWidth / 2, -tank.hullHeight / 2,
          tank.hullWidth, tank.hullHeight);
        ctx.restore();
      }
    }

    // --- Enemy HP bar (world space, above tank) ---
    if (tags?.has('enemy')) {
      const health = em.getComponent(id, 'Health') as { current: number; max: number } | undefined;
      if (health && health.current < health.max) {
        const cfg = COMBAT_CONFIG.enemyHpBar;
        const ratio = Math.max(0, health.current / health.max);
        const barX  = pos.x - cfg.width / 2;
        const barY  = pos.y + cfg.yOffset;
        ctx.fillStyle = cfg.colors.bg;
        ctx.fillRect(barX, barY, cfg.width, cfg.height);
        ctx.fillStyle = ratio >= cfg.lowHpThreshold ? cfg.colors.full : cfg.colors.low;
        ctx.fillRect(barX, barY, cfg.width * ratio, cfg.height);
      }
    }
  }
}

/**
 * Draw a track scrolled by `offset` px along the track's local Y axis using clip + drawImage.
 * Two draws handle the wrap-around at the image boundary.
 */
function drawTrackScrolled(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  worldX: number,
  worldY: number,
  angle: number,
  localOffsetX: number,
  localOffsetY: number,
  width: number,
  height: number,
  offset: number,
): void {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  if (!imgW || !imgH) return;

  ctx.save();
  ctx.translate(worldX, worldY);
  ctx.rotate(angle);
  ctx.translate(localOffsetX, localOffsetY);

  // Clip to track rect so the second draw doesn't bleed outside
  ctx.beginPath();
  ctx.rect(-width / 2, -height / 2, width, height);
  ctx.clip();

  // Map display offset → source pixel offset, wrap within image height
  const srcY = (offset * imgH / height) % imgH;

  // First segment: from srcY to bottom of image
  const srcH1 = imgH - srcY;
  const dstH1 = srcH1 * height / imgH;
  ctx.drawImage(img, 0, srcY, imgW, srcH1, -width / 2, -height / 2, width, dstH1);

  // Second segment: wrap-around top of image to fill the remainder
  if (srcH1 < imgH) {
    ctx.drawImage(img, 0, 0, imgW, srcY, -width / 2, -height / 2 + dstH1, width, height - dstH1);
  }

  ctx.restore();
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
