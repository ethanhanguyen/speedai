import type { EntityManager, EventBus, GridModel } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import type { WeaponDef } from '../config/WeaponConfig.js';

interface ActiveBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsed: number;
  maxDuration: number;
  layerCount: number;
  heatRatio: number; // captured at beam creation — drives bloom on fade-out
}

/** Cached pending hits — flushed on each damage tick. */
interface PendingTileHit {
  tileRow: number;
  tileCol: number;
  x: number;
  y: number;
  isDestructible: boolean;
}

interface PendingEntityHit {
  targetId: number;
  x: number;
  y: number;
  shotDx: number; // normalized direction
  shotDy: number;
}

/** Step size for raycast march (px). */
const RAYCAST_STEP_PX = 4;

/**
 * Handles hitscan (laser) fire modes.
 *
 * Two paths:
 *  - fire(): legacy single-click hitscan (backward compat).
 *  - fireContinuous(): hold-to-fire, called every frame while mouse held.
 *    Maintains a single live beam for rendering; batches damage events at
 *    damageTickIntervalMs to avoid VFX spam.
 */
export class HitscanSystem {
  // Decaying beams (after release — fade out over persistMs)
  private beams: ActiveBeam[] = [];
  // Live beam: set each frame while firing, null when idle
  private liveBeam: ActiveBeam | null = null;

  // Continuous-mode state
  private firingElapsed = 0;         // seconds since continuous fire started (for flicker)
  private currentHeatRatio = 0;      // latest heat ratio passed by WeaponSystem
  private damageAccumulator = 0;     // accumulated DPS damage between ticks
  private damageTickAccMs = 0;       // ms since last damage event batch
  private pendingTileHit: PendingTileHit | null = null;
  private pendingEntityHit: PendingEntityHit | null = null;

  // -------------------------------------------------------------------------
  // Legacy single-click hitscan
  // -------------------------------------------------------------------------

  fire(
    startX: number,
    startY: number,
    angle: number,
    weaponDef: WeaponDef,
    tilemap: GridModel<TileCell>,
    ownerId: number,
    em: EntityManager,
    eventBus: EventBus,
  ): void {
    const behavior = weaponDef.behavior;
    if (behavior.kind !== 'hitscan') return;

    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const maxRange = behavior.maxRangePx;
    const ts = MAP_CONFIG.tileSize;

    let endX = startX + dx * maxRange;
    let endY = startY + dy * maxRange;

    let traveled = 0;
    outer: while (traveled < maxRange) {
      traveled += RAYCAST_STEP_PX;
      const cx = startX + dx * traveled;
      const cy = startY + dy * traveled;
      const col  = Math.floor(cx / ts);
      const row  = Math.floor(cy / ts);
      const cell = tilemap.get(row, col);

      if (!cell) { endX = cx; endY = cy; break; }

      if (cell.object !== ObjectId.NONE && OBJECT_DEFS[cell.object].blockProjectile) {
        endX = cx; endY = cy;
        eventBus.fire('projectile:hit', {
          projectileId: -1,
          x: cx, y: cy,
          tileRow: row, tileCol: col,
          damage: weaponDef.damage,
          isDestructible: OBJECT_DEFS[cell.object].destructible,
          weaponDef,
        });
        break;
      }

      const tankIds = em.query('Position', TANK_PARTS, 'Health');
      for (const tId of tankIds) {
        if (tId === ownerId) continue;
        const tPos = em.getComponent(tId, 'Position') as { x: number; y: number } | undefined;
        const tank = em.getComponent(tId, TANK_PARTS) as TankPartsComponent | undefined;
        if (!tPos || !tank) continue;
        const ddx = cx - tPos.x;
        const ddy = cy - tPos.y;
        if (ddx * ddx + ddy * ddy <= tank.collisionRadius * tank.collisionRadius) {
          endX = cx; endY = cy;
          eventBus.fire('projectile:hit:entity', {
            projectileId: -1,
            targetId: tId,
            x: cx, y: cy,
            damage: weaponDef.damage,
            weaponDef,
            shotVx: dx * weaponDef.damage,
            shotVy: dy * weaponDef.damage,
          });
          traveled = maxRange;
          break outer;
        }
      }
    }

    this.beams.push({
      startX, startY, endX, endY,
      elapsed: 0,
      maxDuration: behavior.persistMs / 1000,
      layerCount: behavior.beamLayerCount,
      heatRatio: 0,
    });
  }

  // -------------------------------------------------------------------------
  // Continuous hold-to-fire (called every game frame while mouse held)
  // -------------------------------------------------------------------------

  fireContinuous(
    dt: number,
    startX: number,
    startY: number,
    angle: number,
    weaponDef: WeaponDef,
    heatRatio: number,
    tilemap: GridModel<TileCell>,
    ownerId: number,
    em: EntityManager,
    eventBus: EventBus,
  ): void {
    const behavior = weaponDef.behavior;
    if (behavior.kind !== 'hitscan' || !behavior.continuousMode) return;

    this.firingElapsed += dt;
    this.currentHeatRatio = heatRatio;

    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const maxRange = behavior.maxRangePx;
    const ts = MAP_CONFIG.tileSize;

    let endX = startX + dx * maxRange;
    let endY = startY + dy * maxRange;

    let newTileHit: PendingTileHit | null = null;
    let newEntityHit: PendingEntityHit | null = null;

    // Raycast
    let traveled = 0;
    outer: while (traveled < maxRange) {
      traveled += RAYCAST_STEP_PX;
      const cx = startX + dx * traveled;
      const cy = startY + dy * traveled;
      const col = Math.floor(cx / ts);
      const row = Math.floor(cy / ts);
      const cell = tilemap.get(row, col);

      if (!cell) { endX = cx; endY = cy; break; }

      if (cell.object !== ObjectId.NONE && OBJECT_DEFS[cell.object].blockProjectile) {
        endX = cx; endY = cy;
        newTileHit = { tileRow: row, tileCol: col, x: cx, y: cy, isDestructible: OBJECT_DEFS[cell.object].destructible };
        break;
      }

      const tankIds = em.query('Position', TANK_PARTS, 'Health');
      for (const tId of tankIds) {
        if (tId === ownerId) continue;
        const tPos = em.getComponent(tId, 'Position') as { x: number; y: number } | undefined;
        const tank = em.getComponent(tId, TANK_PARTS) as TankPartsComponent | undefined;
        if (!tPos || !tank) continue;
        const ddx = cx - tPos.x;
        const ddy = cy - tPos.y;
        if (ddx * ddx + ddy * ddy <= tank.collisionRadius * tank.collisionRadius) {
          endX = cx; endY = cy;
          newEntityHit = { targetId: tId, x: cx, y: cy, shotDx: dx, shotDy: dy };
          traveled = maxRange;
          break outer;
        }
      }
    }

    // Accumulate damage
    this.damageAccumulator += weaponDef.damage * dt;
    this.damageTickAccMs += dt * 1000;

    // Flush damage on tick interval
    if (this.damageTickAccMs >= behavior.damageTickIntervalMs) {
      const tickDamage = Math.round(this.damageAccumulator);
      this.damageAccumulator = 0;
      this.damageTickAccMs -= behavior.damageTickIntervalMs;

      const tileTarget = newTileHit ?? this.pendingTileHit;
      if (tileTarget && tickDamage > 0) {
        eventBus.fire('projectile:hit', {
          projectileId: -1,
          x: tileTarget.x, y: tileTarget.y,
          tileRow: tileTarget.tileRow, tileCol: tileTarget.tileCol,
          damage: tickDamage,
          isDestructible: tileTarget.isDestructible,
          weaponDef,
        });
      }

      const entityTarget = newEntityHit ?? this.pendingEntityHit;
      if (entityTarget && tickDamage > 0) {
        eventBus.fire('projectile:hit:entity', {
          projectileId: -1,
          targetId: entityTarget.targetId,
          x: entityTarget.x, y: entityTarget.y,
          damage: tickDamage,
          weaponDef,
          shotVx: entityTarget.shotDx * tickDamage,
          shotVy: entityTarget.shotDy * tickDamage,
        });
      }
    }

    // Keep latest hit targets for next tick
    this.pendingTileHit   = newTileHit;
    this.pendingEntityHit = newEntityHit;

    // Update live beam (replaces previous each frame)
    this.liveBeam = {
      startX, startY, endX, endY,
      elapsed: 0,
      maxDuration: behavior.persistMs / 1000,
      layerCount: behavior.beamLayerCount,
      heatRatio,
    };
  }

  /** Called when the player releases fire or switches weapons. */
  stopContinuous(): void {
    if (this.liveBeam) {
      this.beams.push({ ...this.liveBeam });
      this.liveBeam = null;
    }
    this.firingElapsed        = 0;
    this.currentHeatRatio     = 0;
    this.damageAccumulator    = 0;
    this.damageTickAccMs      = 0;
    this.pendingTileHit       = null;
    this.pendingEntityHit     = null;
  }

  /** True while a continuous beam is active. */
  isActive(): boolean { return this.liveBeam !== null; }

  // -------------------------------------------------------------------------
  // Update / render
  // -------------------------------------------------------------------------

  update(dt: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].elapsed += dt;
      if (this.beams[i].elapsed >= this.beams[i].maxDuration) {
        this.beams.splice(i, 1);
      }
    }
  }

  drawBeams(ctx: CanvasRenderingContext2D): void {
    if (this.beams.length === 0 && this.liveBeam === null) return;
    const cfg = COMBAT_CONFIG.laserBeam;

    // ---- Live beam (full intensity + bloom + flicker + glows) ----
    if (this.liveBeam) {
      const heat    = this.currentHeatRatio;
      const flicker = 1 + cfg.flickerAmplitudePx *
        Math.sin(this.firingElapsed * cfg.flickerHz * Math.PI * 2);
      const bloom = cfg.minWidthMultiplier +
        (cfg.maxWidthMultiplier - cfg.minWidthMultiplier) * heat;

      const { startX, startY, endX, endY } = this.liveBeam;

      // Muzzle entry glow
      const entryR = cfg.muzzleGlowMaxRadius * (0.5 + 0.5 * heat);
      const entryA = cfg.muzzleGlowMaxAlpha * heat;
      if (entryA > 0.01 && entryR > 0) {
        const eg = ctx.createRadialGradient(startX, startY, 0, startX, startY, entryR);
        eg.addColorStop(0, `rgba(0,200,255,${entryA.toFixed(2)})`);
        eg.addColorStop(1, 'rgba(0,200,255,0)');
        ctx.save();
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(startX, startY, entryR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Beam layers
      const layerCount = Math.min(this.liveBeam.layerCount, cfg.layers.length);
      for (let l = 0; l < layerCount; l++) {
        const layer = cfg.layers[l];
        ctx.save();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth   = layer.widthPx * bloom * flicker;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      }

      // Terminus glow at impact point
      const termR = cfg.terminusGlowMaxRadius * (0.4 + 0.6 * heat);
      const termA = cfg.terminusGlowMaxAlpha * (0.5 + 0.5 * heat);
      if (termR > 0) {
        const tg = ctx.createRadialGradient(endX, endY, 0, endX, endY, termR);
        tg.addColorStop(0,   `rgba(180,240,255,${termA.toFixed(2)})`);
        tg.addColorStop(0.4, `rgba(0,220,255,${(termA * 0.7).toFixed(2)})`);
        tg.addColorStop(1,   'rgba(0,220,255,0)');
        ctx.save();
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(endX, endY, termR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ---- Decaying beams (after release — fade out) ----
    for (const beam of this.beams) {
      const alpha = 1 - beam.elapsed / beam.maxDuration;
      const bloom = cfg.minWidthMultiplier +
        (cfg.maxWidthMultiplier - cfg.minWidthMultiplier) * beam.heatRatio;
      const layerCount = Math.min(beam.layerCount, cfg.layers.length);

      for (let l = 0; l < layerCount; l++) {
        const layer = cfg.layers[l];
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth   = layer.widthPx * bloom;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(beam.startX, beam.startY);
        ctx.lineTo(beam.endX, beam.endY);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
