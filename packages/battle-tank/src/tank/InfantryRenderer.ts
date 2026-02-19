import type { EntityManager, AssetManager } from '@speedai/game-engine';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';
import type { InfantryPartsComponent } from '../components/InfantryParts.js';
import {
  INFANTRY_ANIM_TABLE,
  INFANTRY_SPRITE_SHEET_FRAME_SIZE,
  INFANTRY_DISPLAY_SIZE,
} from '../config/InfantryConfig.js';
import type { InfantryAnimState } from '../config/InfantryConfig.js';

interface DeathAnim {
  x: number;
  y: number;
  soldierVariant: 1 | 2 | 3;
  facingAngle: number;
  frameIndex: number;
  frameElapsed: number;
}

function spriteKey(variant: 1 | 2 | 3, state: InfantryAnimState): string {
  return `infantry-s${variant}-${state}`;
}

/**
 * Renders all living infantry entities and plays death animations at last-known positions.
 * Death animations are triggered via onEntityKilled() before EntityManager destroys the entity.
 */
export class InfantryRenderer {
  private dying: DeathAnim[] = [];

  /**
   * Call this in entity:killed handler — entity still exists at this point
   * (EventBus fires listeners before em.destroy() returns).
   */
  onEntityKilled(em: EntityManager, entityId: number, fallbackX: number, fallbackY: number): void {
    const inf = em.getComponent(entityId, INFANTRY_PARTS) as InfantryPartsComponent | undefined;
    if (!inf) return;
    const pos = em.getComponent(entityId, 'Position') as { x: number; y: number } | undefined;
    this.dying.push({
      x: pos?.x ?? fallbackX,
      y: pos?.y ?? fallbackY,
      soldierVariant: inf.soldierVariant,
      facingAngle: inf.facingAngle,
      frameIndex: 0,
      frameElapsed: 0,
    });
  }

  update(dt: number): void {
    for (const d of this.dying) {
      const def = INFANTRY_ANIM_TABLE[d.soldierVariant].dead;
      d.frameElapsed += dt;
      if (d.frameElapsed >= 1 / def.fps) {
        d.frameElapsed -= 1 / def.fps;
        d.frameIndex++;
      }
    }
    this.dying = this.dying.filter(d => {
      const def = INFANTRY_ANIM_TABLE[d.soldierVariant].dead;
      return d.frameIndex < def.frameCount;
    });
  }

  draw(ctx: CanvasRenderingContext2D, em: EntityManager, assets: AssetManager): void {
    const ids = em.query('Position', INFANTRY_PARTS);
    for (const id of ids) {
      const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      const inf = em.getComponent(id, INFANTRY_PARTS) as unknown as InfantryPartsComponent | undefined;
      if (!pos || !inf) continue;
      drawSoldier(ctx, assets, pos.x, pos.y, inf.soldierVariant, inf.animState, inf.frameIndex,
        inf.facingAngle, inf.hitFlashElapsed > 0 ? inf.hitFlashColor : '');
    }
    for (const d of this.dying) {
      drawSoldier(ctx, assets, d.x, d.y, d.soldierVariant, 'dead', d.frameIndex, d.facingAngle, '');
    }
  }
}

function drawSoldier(
  ctx: CanvasRenderingContext2D,
  assets: AssetManager,
  x: number, y: number,
  variant: 1 | 2 | 3,
  animState: InfantryAnimState,
  frameIndex: number,
  facingAngle: number,
  flashColor: string,
): void {
  const key = spriteKey(variant, animState);
  const img = assets.getImage(key);
  const half = INFANTRY_DISPLAY_SIZE / 2;
  const src = INFANTRY_SPRITE_SHEET_FRAME_SIZE;
  const imgEl = img as HTMLImageElement | undefined;
  const safeFrame = imgEl ? Math.min(frameIndex, Math.floor(imgEl.naturalWidth / src) - 1) : 0;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(facingAngle);

  if (imgEl) {
    ctx.drawImage(
      imgEl,
      safeFrame * src, 0, src, src,
      -half, -half, INFANTRY_DISPLAY_SIZE, INFANTRY_DISPLAY_SIZE,
    );
  } else {
    ctx.fillStyle = '#88ff88';
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
  }

  if (flashColor) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = flashColor;
    ctx.fillRect(-half, -half, INFANTRY_DISPLAY_SIZE, INFANTRY_DISPLAY_SIZE);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
