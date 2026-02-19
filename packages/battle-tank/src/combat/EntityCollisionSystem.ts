import type { EntityManager } from '@speedai/game-engine';
import type { ObjectPoolSystem, EventBus } from '@speedai/game-engine';
import { PROJECTILE } from '../components/Projectile.js';
import type { ProjectileComponent } from '../components/Projectile.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';

/**
 * Checks projectile-vs-tank entity collisions (circle test).
 * Fires 'projectile:hit:entity' on hit.
 * Supports pierce (piercesRemaining > 0) and skips already-hit entities.
 * Passes shotVx/shotVy for knockback calculation downstream.
 */
export function checkEntityCollisions(
  em: EntityManager,
  pool: ObjectPoolSystem,
  eventBus: EventBus,
): void {
  const projectileIds = em.query('Position', 'Velocity', PROJECTILE);
  const tankIds       = em.query('Position', TANK_PARTS, 'Health');

  for (const pId of projectileIds) {
    const pPos = em.getComponent(pId, 'Position') as { x: number; y: number } | undefined;
    const vel  = em.getComponent(pId, 'Velocity') as { vx: number; vy: number } | undefined;
    const proj = em.getComponent(pId, PROJECTILE) as ProjectileComponent | undefined;
    if (!pPos || !vel || !proj) continue;

    let consumed = false;

    for (const tId of tankIds) {
      if (tId === proj.ownerId) continue;
      if (proj.hitEntities.has(tId)) continue; // already pierced through this entity

      const tPos = em.getComponent(tId, 'Position') as { x: number; y: number } | undefined;
      const tank = em.getComponent(tId, TANK_PARTS) as TankPartsComponent | undefined;
      if (!tPos || !tank) continue;

      const dx     = pPos.x - tPos.x;
      const dy     = pPos.y - tPos.y;
      const distSq = dx * dx + dy * dy;
      const rSq    = tank.collisionRadius * tank.collisionRadius;

      if (distSq <= rSq) {
        eventBus.fire('projectile:hit:entity', {
          projectileId: pId,
          targetId: tId,
          ownerId: proj.ownerId,
          x: pPos.x, y: pPos.y,
          damage: proj.weaponDef.damage,
          weaponDef: proj.weaponDef,
          shotVx: vel.vx,
          shotVy: vel.vy,
        });

        if (proj.piercesRemaining > 0) {
          proj.hitEntities.add(tId);
          proj.piercesRemaining--;
          // Do not consume — continue checking other tanks
        } else {
          em.removeComponent(pId, 'Position');
          em.removeComponent(pId, 'Velocity');
          em.removeComponent(pId, PROJECTILE);
          pool.release('projectile', pId);
          consumed = true;
          break;
        }
      }
    }

    if (consumed) continue;
  }
}
