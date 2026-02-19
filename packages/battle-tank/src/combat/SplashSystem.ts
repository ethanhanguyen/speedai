import type { EntityManager, EventBus } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';

interface HowitzerIndicator {
  x: number;
  y: number;
  elapsed: number;         // seconds since launched
  pulseHz: number;
}

/**
 * Handles splash detonation: AoE entity damage with linear falloff.
 * Manages howitzer landing-zone indicators.
 */
export class SplashSystem {
  private indicators = new Map<number, HowitzerIndicator>(); // projectileId → indicator
  private nextIndicatorId = 0;

  constructor(private eventBus: EventBus) {
    eventBus.on('weapon:fired', (event: unknown) => {
      const e = event as { data?: FiredData };
      const d = (e.data ?? e) as FiredData;
      if (!d || d.weaponDef?.behavior.kind !== 'splash') return;
      if (!d.splashTarget) return;

      const behavior = d.weaponDef.behavior as { kind: 'splash'; splashRadiusPx: number; indicatorPulseHz: number };
      const iId = d.projectileId ?? this.nextIndicatorId++;
      this.indicators.set(iId, {
        x: d.splashTarget.x,
        y: d.splashTarget.y,
        elapsed: 0,
        pulseHz: behavior.indicatorPulseHz,
      });
    });

    eventBus.on('splash:detonated', (event: unknown) => {
      const e = event as { data?: DetonateData };
      const d = (e.data ?? e) as DetonateData;
      if (!d) return;
      this.currentWeaponDef = d.weaponDef;
      this.detonateAt(d.x, d.y, d.splashRadiusPx, d.damage, d.ownerId);
      this.currentWeaponDef = undefined;
    });
  }

  private em!: EntityManager;
  private currentWeaponDef: import('../config/WeaponConfig.js').WeaponDef | undefined;

  setEntityManager(em: EntityManager): void {
    this.em = em;
  }

  private detonateAt(
    x: number, y: number,
    splashRadiusPx: number,
    damage: number,
    ownerId: number,
  ): void {
    if (!this.em) return;

    const radiusSq = splashRadiusPx * splashRadiusPx;
    const tankIds  = this.em.query('Position', TANK_PARTS, 'Health');

    for (const tId of tankIds) {
      if (tId === ownerId) continue;

      const tPos = this.em.getComponent(tId, 'Position') as { x: number; y: number } | undefined;
      if (!tPos) continue;

      const dx     = tPos.x - x;
      const dy     = tPos.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        const dist    = Math.sqrt(distSq);
        const falloff = 1 - dist / splashRadiusPx; // linear: 1 at center, 0 at edge

        this.eventBus.fire('splash:entity:hit', {
          targetId: tId,
          x: tPos.x, y: tPos.y,
          damage,
          falloffMultiplier: falloff,
          splashCenterX: x,
          splashCenterY: y,
          weaponDef: this.currentWeaponDef,
        });
      }
    }

    // Remove indicator for this detonation (if matched by proximity)
    for (const [iId, ind] of this.indicators) {
      const dx = ind.x - x;
      const dy = ind.y - y;
      if (dx * dx + dy * dy < 64 * 64) {
        this.indicators.delete(iId);
        break;
      }
    }
  }

  update(dt: number): void {
    for (const ind of this.indicators.values()) {
      ind.elapsed += dt;
    }
  }

  drawIndicators(ctx: CanvasRenderingContext2D): void {
    const cfg = COMBAT_CONFIG.howitzerIndicator;
    for (const ind of this.indicators.values()) {
      const pulse = (Math.sin(ind.elapsed * ind.pulseHz * Math.PI * 2) + 1) / 2;
      const alpha = cfg.pulseAlphaMin + pulse * (cfg.pulseAlphaMax - cfg.pulseAlphaMin);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth   = cfg.lineWidth;
      ctx.beginPath();
      ctx.arc(ind.x, ind.y, cfg.radiusPx, 0, Math.PI * 2);
      ctx.stroke();
      // Cross-hair lines
      ctx.beginPath();
      ctx.moveTo(ind.x - cfg.radiusPx, ind.y);
      ctx.lineTo(ind.x + cfg.radiusPx, ind.y);
      ctx.moveTo(ind.x, ind.y - cfg.radiusPx);
      ctx.lineTo(ind.x, ind.y + cfg.radiusPx);
      ctx.stroke();
      ctx.restore();
    }
  }
}

interface FiredData {
  projectileId?: number;
  weaponDef?: { behavior: { kind: string } };
  splashTarget?: { x: number; y: number };
}

interface DetonateData {
  x: number;
  y: number;
  splashRadiusPx: number;
  damage: number;
  ownerId: number;
  weaponDef?: import('../config/WeaponConfig.js').WeaponDef;
}
