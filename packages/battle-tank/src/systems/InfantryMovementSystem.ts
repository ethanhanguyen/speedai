import type { EntityManager } from '@speedai/game-engine';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';
import type { InfantryPartsComponent } from '../components/InfantryParts.js';
import {
  INFANTRY_ANIM_TABLE,
  INFANTRY_ANIM_SPEED_THRESHOLDS,
} from '../config/InfantryConfig.js';
import type { InfantryAnimState } from '../config/InfantryConfig.js';
import { getDamageSpeedFactor } from './TankMovementSystem.js';

/**
 * Advances infantry animation state and timers each frame.
 * Velocity is applied by TileCollisionSystem (shared with tanks).
 * Called with real dt (not gameDt) for VFX consistency.
 */
export function updateInfantryVFXState(em: EntityManager, dt: number): void {
  const ids = em.query('Position', INFANTRY_PARTS);
  for (const id of ids) {
    const inf = em.getComponent(id, INFANTRY_PARTS) as unknown as InfantryPartsComponent;
    if (!inf) continue;

    // Timers
    if (inf.hitFlashElapsed > 0) inf.hitFlashElapsed = Math.max(0, inf.hitFlashElapsed - dt);
    if (inf.shotFlashElapsed > 0) inf.shotFlashElapsed = Math.max(0, inf.shotFlashElapsed - dt);

    // Sync speed from velocity magnitude (AISystem writes velocity, we read it here)
    const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    if (vel) inf.speed = Math.hypot(vel.vx, vel.vy);

    // Determine target animation state
    let target: InfantryAnimState;
    if (inf.shotFlashElapsed > inf.shotFlashDuration * 0.5) {
      target = 'shot';
    } else if (inf.shotFlashElapsed > 0) {
      target = 'reload';
    } else {
      const frac = inf.speed / Math.max(inf.maxSpeed, 1);
      if (frac > INFANTRY_ANIM_SPEED_THRESHOLDS.run)  target = 'run';
      else if (frac > INFANTRY_ANIM_SPEED_THRESHOLDS.walk) target = 'walk';
      else target = 'idle';
    }

    if (target !== inf.animState) {
      inf.animState = target;
      inf.frameIndex = 0;
      inf.frameElapsed = 0;
    }

    // Advance frame (looping)
    const def = INFANTRY_ANIM_TABLE[inf.soldierVariant][inf.animState];
    inf.frameElapsed += dt;
    if (inf.frameElapsed >= 1 / def.fps) {
      inf.frameElapsed -= 1 / def.fps;
      inf.frameIndex = (inf.frameIndex + 1) % def.frameCount;
    }
  }
}

/** Speed degradation factor from health ratio — delegates to TankMovementSystem's implementation. */
export { getDamageSpeedFactor as getInfantrySpeedFactor };
