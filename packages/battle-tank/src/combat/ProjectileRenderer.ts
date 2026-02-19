import type { EntityManager, AssetManager, GridModel } from '@speedai/game-engine';
import { ParticleBurst } from '@speedai/game-engine';
import { PROJECTILE } from '../components/Projectile.js';
import type { ProjectileComponent } from '../components/Projectile.js';
import { WEAPON } from '../components/Weapon.js';
import type { WeaponComponent } from '../components/Weapon.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import type { TileCell } from '../tilemap/types.js';
import { drawTrajectoryPreview } from './TrajectoryPreviewSystem.js';
import type { HitscanSystem } from './HitscanSystem.js';
import type { SplashSystem } from './SplashSystem.js';
import type { BombSystem } from './BombSystem.js';
import { getTurretTip } from '../tank/TankUtils.js';

/**
 * Owns the in-flight trail particle bursts for all projectiles.
 * Updated each frame alongside draw pass to emit + draw trail particles.
 */
export class ProjectileRenderer {
  private trailParticles = new ParticleBurst();

  /** Update trail state — call with real dt before draw. */
  update(em: EntityManager, dt: number): void {
    this.trailParticles.update(dt, 0);

    const ids = em.query('Position', 'Velocity', PROJECTILE);
    for (const id of ids) {
      const pos  = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      const vel  = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
      const proj = em.getComponent(id, PROJECTILE)  as ProjectileComponent       | undefined;
      if (!pos || !vel || !proj) continue;

      const trail = proj.weaponDef.trailConfig;
      if (!trail) continue;

      proj.trailAccumulatedMs += dt * 1000;
      if (proj.trailAccumulatedMs >= trail.emitIntervalMs) {
        proj.trailAccumulatedMs -= trail.emitIntervalMs;
        this.trailParticles.emit({
          ...COMBAT_CONFIG.smokeParticles,
          ...trail.particles,
          x: pos.x,
          y: pos.y,
        });
      }
    }
  }

  /** Draw all active projectiles + special weapon VFX. ctx must be in world space. */
  draw(
    ctx: CanvasRenderingContext2D,
    em: EntityManager,
    assets: AssetManager,
    hitscanSys: HitscanSystem,
    splashSys: SplashSystem,
    bombSys: BombSystem,
    tilemap: GridModel<TileCell>,
    playerId: number,
  ): void {
    // Trail particles — behind everything else
    this.trailParticles.draw(ctx);

    // Trajectory preview — only for player with rifled gun
    const playerWeapon = em.getComponent(playerId, WEAPON) as WeaponComponent | undefined;
    const playerTank   = em.getComponent(playerId, TANK_PARTS) as TankPartsComponent | undefined;
    const playerPos    = em.getComponent(playerId, 'Position') as { x: number; y: number } | undefined;
    if (playerWeapon && playerTank && playerPos) {
      const beh = playerWeapon.def.behavior;
      if (beh.kind === 'ballistic' && beh.bouncesMax) {
        drawTrajectoryPreview(
          ctx,
          playerPos.x, playerPos.y,
          playerTank.turretAngle,
          beh.bouncesMax,
          tilemap,
        );
      }
    }

    // Howitzer landing indicator
    splashSys.drawIndicators(ctx);

    // Beam VFX (laser)
    hitscanSys.drawBeams(ctx);

    // Bombs
    bombSys.drawBombs(ctx, em);

    // Ballistic projectiles
    const ids = em.query('Position', 'Velocity', PROJECTILE);
    for (const id of ids) {
      const pos  = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      const vel  = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
      const proj = em.getComponent(id, PROJECTILE)  as ProjectileComponent       | undefined;
      if (!pos || !vel || !proj) continue;

      const img = assets.getImage(proj.weaponDef.shellSpriteKey) as CanvasImageSource | undefined;
      const w   = proj.weaponDef.shellWidth;
      const h   = proj.weaponDef.shellHeight;

      const speed = Math.hypot(vel.vx, vel.vy);
      if (speed > 0) {
        drawTracer(ctx, pos, vel, speed, proj.weaponDef.tracerStyle ?? COMBAT_CONFIG.defaultTracer);
      }

      const angle = Math.atan2(vel.vx, -vel.vy);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      // Range dropoff — fade alpha as projectile approaches max range
      const pbeh = proj.weaponDef.behavior;
      if (pbeh.kind === 'ballistic' && pbeh.maxRangePx && pbeh.rangeDropoff) {
        const fadeStart = pbeh.maxRangePx * (1 - pbeh.rangeDropoff);
        if (proj.distanceTraveled > fadeStart) {
          const t = (proj.distanceTraveled - fadeStart) / (pbeh.maxRangePx - fadeStart);
          ctx.globalAlpha = Math.max(0, 1 - t);
        }
      }

      if (img && w > 0) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else if (w > 0) {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      ctx.restore();
    }

    // Railgun charge glow — drawn at muzzle tip in world space
    if (playerWeapon && playerTank && playerPos) {
      const beh = playerWeapon.def.behavior;
      if (beh.kind === 'charge' && playerWeapon.isCharging) {
        const chargeRatio = Math.min(playerWeapon.chargeElapsed / beh.chargeMs, 1);
        drawChargeGlow(ctx, playerPos, playerTank, chargeRatio);
      }
    }

    // Loading rings — world-space reload arc for slow weapons
    drawLoadingRings(ctx, playerPos, playerTank, playerWeapon);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drawTracer(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  vel: { vx: number; vy: number },
  speed: number,
  style: { color: string; glowColor?: string; glowBlur?: number; length: number; width: number },
): void {
  if (style.length <= 0 || style.width <= 0) return;
  const nx = vel.vx / speed;
  const ny = vel.vy / speed;
  ctx.save();
  if (style.glowColor && style.glowBlur) {
    ctx.shadowColor = style.glowColor;
    ctx.shadowBlur  = style.glowBlur;
  }
  ctx.strokeStyle = style.color;
  ctx.lineWidth   = style.width;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x - nx * style.length, pos.y - ny * style.length);
  ctx.stroke();
  ctx.restore();
}

function drawChargeGlow(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  tank: TankPartsComponent,
  chargeRatio: number,
): void {
  const cfg = COMBAT_CONFIG.railgunCharge;
  const tip = getTurretTip(
    pos,
    tank,
  );

  const radius = cfg.glowMaxRadius * chargeRatio;
  const ready  = chargeRatio >= 1;
  let alpha: number;

  if (ready) {
    // Pulse when fully charged
    alpha = cfg.glowMinAlpha + ((Math.sin(Date.now() * 0.001 * cfg.readyFlashHz * Math.PI * 2) + 1) / 2)
          * (cfg.glowMaxAlpha - cfg.glowMinAlpha);
  } else {
    alpha = cfg.glowMinAlpha + chargeRatio * (cfg.glowMaxAlpha - cfg.glowMinAlpha);
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = cfg.glowColor;
  ctx.shadowBlur  = radius * 2;
  ctx.fillStyle   = cfg.glowColor;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, Math.max(1, radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLoadingRings(
  ctx: CanvasRenderingContext2D,
  playerPos: { x: number; y: number } | undefined,
  playerTank: TankPartsComponent | undefined,
  playerWeapon: WeaponComponent | undefined,
): void {
  if (!playerPos || !playerTank || !playerWeapon) return;
  const ring = playerWeapon.def.loadingRing;
  if (!ring) return;

  const fireInterval = 1 / playerWeapon.def.fireRate;
  const progress     = 1 - Math.min(playerWeapon.cooldownRemaining / fireInterval, 1);
  const ready        = playerWeapon.cooldownRemaining <= 0;

  const tip = getTurretTip(playerPos, playerTank);

  ctx.save();
  ctx.lineWidth   = ring.lineWidth;
  ctx.lineCap     = 'round';
  ctx.strokeStyle = ready ? ring.readyColor : ring.color;
  ctx.globalAlpha = ready ? (0.6 + 0.4 * ((Math.sin(Date.now() * 0.01) + 1) / 2)) : 0.75;

  ctx.beginPath();
  // Arc sweeps from -π/2 (top) clockwise to progress * 2π
  ctx.arc(tip.x, tip.y, ring.radiusPx, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
