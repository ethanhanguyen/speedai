import type { AssetManager } from '@speedai/game-engine';
import type { LoadoutParts } from '../config/PartRegistry.js';
import { HULL_REGISTRY, TRACK_REGISTRY } from '../config/PartRegistry.js';
import { WEAPON_REGISTRY } from '../config/WeaponConfig.js';

// Hull trackOffsetX is the canonical attachment point; TankPreview reads it directly.

/**
 * Draw a rotatable tank preview from loadout parts.
 * Renders hull + tracks + turret centered at (cx, cy) at the given angle.
 */
export function drawTankPreview(
  ctx: CanvasRenderingContext2D,
  assets: AssetManager,
  parts: LoadoutParts,
  cx: number,
  cy: number,
  angle: number,
  scale: number,
): void {
  const hull = HULL_REGISTRY[parts.hullId];
  const track = TRACK_REGISTRY[parts.trackId];
  const gun = WEAPON_REGISTRY[parts.gunId];
  if (!hull || !track || !gun) return;

  const turret = gun.turret;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Tracks (left and right) — offset derived from hull geometry
  const trackImg = assets.getImage(track.spriteKey);
  if (trackImg) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * hull.trackOffsetX, 0);
      ctx.drawImage(trackImg, -track.width / 2, -track.height / 2, track.width, track.height);
      ctx.restore();
    }
  }

  // Hull — width derived from sprite natural aspect ratio
  const hullImg = assets.getImage(hull.spriteKey) as HTMLImageElement | undefined;
  if (hullImg) {
    const hullDisplayW = hullImg.naturalHeight > 0
      ? hullImg.naturalWidth / hullImg.naturalHeight * hull.height
      : hull.height;
    ctx.drawImage(hullImg, -hullDisplayW / 2, -hull.height / 2, hullDisplayW, hull.height);
  }

  // Turret — pivot placed at tank center: top = -(height * pivotY)
  const turretImg = assets.getImage(turret.spriteKey);
  if (turretImg && turret.width > 0) {
    ctx.drawImage(
      turretImg,
      -turret.width / 2,
      -(turret.height * turret.pivotY),
      turret.width,
      turret.height,
    );
  }

  ctx.restore();
}
