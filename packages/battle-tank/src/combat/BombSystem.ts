import type { EntityManager, EventBus, ComponentData } from '@speedai/game-engine';
import { ComponentFactory } from '@speedai/game-engine';
import { BOMB } from '../components/Bomb.js';
import type { BombComponent } from '../components/Bomb.js';
import { BOMB_DEFS } from '../config/BombConfig.js';
import type { BombType } from '../config/BombConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { TANK_PARTS } from '../tank/TankParts.js';

/**
 * Manages placed bomb entities: arming, proximity trigger, fuse countdown,
 * remote detonation, and chain reaction.
 * Detonation fires 'splash:detonated' for SplashSystem to handle AoE damage.
 */
export class BombSystem {
  constructor(private eventBus: EventBus) {}

  /** Place a bomb entity at (x, y) on behalf of ownerId. */
  placeBomb(
    em: EntityManager,
    ownerId: number,
    x: number, y: number,
    type: BombType,
  ): void {
    const def = BOMB_DEFS[type];
    const id  = em.create();

    em.addComponent(id, 'Position',
      ComponentFactory.position(x, y) as unknown as ComponentData);

    const bomb: BombComponent = {
      type,
      state: 'arming',
      elapsedMs: 0,
      ownerId,
      detonated: false,
    };
    em.addComponent(id, BOMB, bomb as unknown as ComponentData);

    this.eventBus.fire('bomb:placed', { x, y, type });
  }

  /** Call each frame with gameDt (slow-motion scaled). */
  update(em: EntityManager, dt: number): void {
    const bombIds  = em.query('Position', BOMB);
    const tankIds  = em.query('Position', TANK_PARTS, 'Health');

    // Collect player position for proximity check
    let playerX = -9999, playerY = -9999;
    for (const tId of tankIds) {
      const tags = em.getComponent(tId, 'Tag') as Set<string> | undefined;
      if (tags?.has('player')) {
        const pp = em.getComponent(tId, 'Position') as { x: number; y: number } | undefined;
        if (pp) { playerX = pp.x; playerY = pp.y; }
        break;
      }
    }

    for (const bId of bombIds) {
      const pos  = em.getComponent(bId, 'Position') as { x: number; y: number } | undefined;
      const bomb = em.getComponent(bId, BOMB)        as BombComponent             | undefined;
      if (!pos || !bomb || bomb.detonated) continue;

      const def = BOMB_DEFS[bomb.type];
      bomb.elapsedMs += dt * 1000;

      switch (bomb.state) {
        case 'arming':
          if (bomb.elapsedMs >= def.armMs) {
            bomb.state = 'armed';
            bomb.elapsedMs = 0;
          }
          break;

        case 'armed':
          if (bomb.type === 'timed' && def.fuseMs !== undefined) {
            if (bomb.elapsedMs >= def.fuseMs) {
              this.detonate(em, bId, pos, bomb);
            }
          } else if (bomb.type === 'proximity' && def.triggerRadiusPx !== undefined) {
            const dx = playerX - pos.x;
            const dy = playerY - pos.y;
            if (dx * dx + dy * dy <= def.triggerRadiusPx * def.triggerRadiusPx) {
              this.detonate(em, bId, pos, bomb);
            }
          }
          // Remote: stays armed until explicit trigger (see triggerRemoteBombs)
          break;

        case 'detonating':
          // One-frame state — already detonated, clean up
          em.removeComponent(bId, BOMB);
          em.removeComponent(bId, 'Position');
          em.destroy(bId);
          break;
      }
    }
  }

  /** Trigger all armed remote bombs (called when player presses B again with remote selected). */
  triggerRemoteBombs(em: EntityManager, ownerId: number): void {
    const bombIds = em.query('Position', BOMB);
    for (const bId of bombIds) {
      const pos  = em.getComponent(bId, 'Position') as { x: number; y: number } | undefined;
      const bomb = em.getComponent(bId, BOMB)        as BombComponent             | undefined;
      if (!pos || !bomb || bomb.detonated) continue;
      if (bomb.ownerId !== ownerId || bomb.type !== 'remote' || bomb.state !== 'armed') continue;
      this.detonate(em, bId, pos, bomb);
    }
  }

  private detonate(
    em: EntityManager,
    bId: number,
    pos: { x: number; y: number },
    bomb: BombComponent,
  ): void {
    if (bomb.detonated) return;
    bomb.detonated = true;
    bomb.state = 'detonating';

    const def = BOMB_DEFS[bomb.type];

    this.eventBus.fire('splash:detonated', {
      x: pos.x, y: pos.y,
      splashRadiusPx: def.splashRadiusPx,
      damage: def.damage,
      ownerId: bomb.ownerId,
      explosionType: def.explosionType ?? 'bomb',
    });

    this.eventBus.fire('bomb:exploded', { x: pos.x, y: pos.y, type: bomb.type });

    // Chain reaction for remote bombs
    if (bomb.type === 'remote' && def.chainRadiusPx !== undefined) {
      const chainRSq = def.chainRadiusPx * def.chainRadiusPx;
      const bombIds  = em.query('Position', BOMB);
      for (const otherId of bombIds) {
        if (otherId === bId) continue;
        const oPos  = em.getComponent(otherId, 'Position') as { x: number; y: number } | undefined;
        const oBomb = em.getComponent(otherId, BOMB)        as BombComponent             | undefined;
        if (!oPos || !oBomb || oBomb.detonated || oBomb.state !== 'armed') continue;
        const dx = oPos.x - pos.x;
        const dy = oPos.y - pos.y;
        if (dx * dx + dy * dy <= chainRSq) {
          this.detonate(em, otherId, oPos, oBomb);
        }
      }
    }
  }

  drawBombs(ctx: CanvasRenderingContext2D, em: EntityManager): void {
    const cfg     = COMBAT_CONFIG.bomb;
    const bombIds = em.query('Position', BOMB);
    const half    = cfg.displayPx / 2;

    for (const bId of bombIds) {
      const pos  = em.getComponent(bId, 'Position') as { x: number; y: number } | undefined;
      const bomb = em.getComponent(bId, BOMB)        as BombComponent             | undefined;
      if (!pos || !bomb) continue;

      const color = bomb.type === 'remote'
        ? cfg.remoteColor
        : bomb.state === 'arming' ? cfg.armingColor : cfg.armedColor;

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, half, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Fuse dot
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - half * 0.4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Remove all bomb entities owned by a player (on scene destroy). */
  clearAll(em: EntityManager): void {
    for (const bId of em.query(BOMB)) {
      em.removeComponent(bId, BOMB);
      em.removeComponent(bId, 'Position');
      em.destroy(bId);
    }
  }
}
