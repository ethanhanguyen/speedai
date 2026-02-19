import type { EntityManager, HealthComponent } from '@speedai/game-engine';
import { ParticleBurst } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';

/**
 * Visual damage states on tanks:
 * - Below cracked (50%):   orange hull tint
 * - Below smoking (25%):   light gray smoke
 * - Below heavySmoke (10%): thick black smoke + orange fire sparks
 *
 * Emit intervals are taken from COMBAT_CONFIG.smokeEmitIntervals (no hard-coded values).
 */
export class DamageStateRenderer {
  private lightSmoke  = new ParticleBurst();
  private heavySmoke  = new ParticleBurst();
  private fire        = new ParticleBurst();

  private lightTimer  = 0;
  private heavyTimer  = 0;
  private fireTimer   = 0;

  update(em: EntityManager, dt: number): void {
    const intervals = COMBAT_CONFIG.smokeEmitIntervals;

    this.lightSmoke.update(dt, COMBAT_CONFIG.lightSmokeParticles.gravity ?? -15);
    this.heavySmoke.update(dt, COMBAT_CONFIG.heavySmokeParticles.gravity ?? -12);
    this.fire.update(dt, COMBAT_CONFIG.fireParticles.gravity ?? -30);

    this.lightTimer += dt;
    this.heavyTimer += dt;
    this.fireTimer  += dt;

    const ids = em.query('Position', TANK_PARTS, 'Health');
    for (const id of ids) {
      const health = em.getComponent(id, 'Health') as HealthComponent | undefined;
      if (!health) continue;

      const ratio = health.current / health.max;
      if (ratio >= COMBAT_CONFIG.damageStates.smoking) continue;

      const pos  = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      const tank = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
      if (!pos || !tank) continue;

      const jitterX = (Math.random() - 0.5) * tank.hullWidth  * 0.5;
      const jitterY = (Math.random() - 0.5) * tank.hullHeight * 0.5;

      if (ratio < COMBAT_CONFIG.damageStates.heavySmoke) {
        // Critical — heavy black smoke + fire
        if (this.heavyTimer >= intervals.heavy) {
          this.heavyTimer = 0;
          this.heavySmoke.emit({ ...COMBAT_CONFIG.heavySmokeParticles, x: pos.x + jitterX, y: pos.y + jitterY });
        }
        if (this.fireTimer >= intervals.fire) {
          this.fireTimer = 0;
          // Fire spawns slightly above center (engine position)
          this.fire.emit({ ...COMBAT_CONFIG.fireParticles, x: pos.x + jitterX, y: pos.y - tank.hullHeight * 0.2 + jitterY });
        }
      } else {
        // Smoking tier — light gray puffs
        if (this.lightTimer >= intervals.light) {
          this.lightTimer = 0;
          this.lightSmoke.emit({ ...COMBAT_CONFIG.lightSmokeParticles, x: pos.x + jitterX, y: pos.y + jitterY });
        }
      }
    }

    // Reset timers that have accumulated past their intervals (no missed emit stacking)
    if (this.lightTimer  >= intervals.light)  this.lightTimer  = 0;
    if (this.heavyTimer  >= intervals.heavy)  this.heavyTimer  = 0;
    if (this.fireTimer   >= intervals.fire)   this.fireTimer   = 0;
  }

  /** Draw cracked hull tint below cracked threshold. Called in world space after tank draw. */
  drawHullTint(ctx: CanvasRenderingContext2D, em: EntityManager): void {
    const ids = em.query('Position', TANK_PARTS, 'Health');
    for (const id of ids) {
      const health = em.getComponent(id, 'Health') as HealthComponent | undefined;
      if (!health) continue;

      const ratio = health.current / health.max;
      if (ratio >= COMBAT_CONFIG.damageStates.cracked) continue;

      const pos  = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      const tank = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
      if (!pos || !tank) continue;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(tank.hullAngle);
      ctx.fillStyle = COMBAT_CONFIG.crackedTint;
      ctx.fillRect(-tank.hullWidth / 2, -tank.hullHeight / 2, tank.hullWidth, tank.hullHeight);
      ctx.restore();
    }
  }

  /** Draw all smoke/fire particles in world space. */
  drawSmoke(ctx: CanvasRenderingContext2D): void {
    this.lightSmoke.draw(ctx);
    this.heavySmoke.draw(ctx);
    this.fire.draw(ctx);
  }
}
