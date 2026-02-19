import type { AssetManager, CameraSystem, EventBus, EntityManager } from '@speedai/game-engine';
import { ParticleBurst, FrameAnimator } from '@speedai/game-engine';
import type { WeaponDef } from '../config/WeaponConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { TIMED_BUFF_DEFS, BUFF_HUD, BUFF_NOTIFY } from '../config/BuffConfig.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';

interface SpriteAnimation {
  x: number;
  y: number;
  angle: number;
  elapsed: number;
  spriteKeys: string[];
  fps: number;
  width: number;
  height: number;
}

interface FloatingNumber {
  x: number;
  y: number;
  text: string;
  elapsed: number;
}

interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  color: string;
  elapsed: number;
}

interface TurretPopOff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  elapsed: number;
  alpha: number;
}

const TURRET_POP_GRAVITY = 300;   // px/s^2
const TURRET_POP_DURATION = 0.8;  // seconds before fade-out
const TURRET_POP_SPEED = 120;     // initial upward speed

/**
 * Manages all visual effects: muzzle flashes, impacts, explosions,
 * floating damage numbers, turret pop-offs, and particle bursts.
 * Listens to EventBus events — fully decoupled from game logic.
 */
export class VFXManager {
  private muzzleFlashes: SpriteAnimation[] = [];
  private impacts: SpriteAnimation[] = [];
  private explosions: SpriteAnimation[] = [];
  private floatingNumbers: FloatingNumber[] = [];
  private floatingLabels: FloatingLabel[] = [];
  private turretPopOffs: TurretPopOff[] = [];
  private particles = new ParticleBurst();
  private playerId = -1;
  private em: EntityManager | null = null;

  /** Must be called after the player entity is created. */
  setPlayerId(id: number, em: EntityManager): void {
    this.playerId = id;
    this.em = em;
  }

  constructor(
    private assets: AssetManager,
    private camera: CameraSystem,
    eventBus: EventBus,
  ) {
    // --- Existing tile-based events ---

    eventBus.on('weapon:fired', (event: unknown) => {
      const e = event as { data?: { x: number; y: number; angle: number; weaponDef: WeaponDef } };
      const d = e.data ?? (e as any);
      if (!d) return;
      this.spawnMuzzleFlash(d.x, d.y, d.angle, d.weaponDef);
      this.camera.shake(d.weaponDef.shakeOnFire.intensity, d.weaponDef.shakeOnFire.duration);
    });

    eventBus.on('projectile:hit', (event: unknown) => {
      const e = event as { data?: { x: number; y: number; weaponDef: WeaponDef } };
      const d = e.data ?? (e as any);
      if (!d) return;
      this.spawnImpact(d.x, d.y, d.weaponDef);
      this.camera.shake(d.weaponDef.shakeOnHit.intensity, d.weaponDef.shakeOnHit.duration);
    });

    eventBus.on('tile:damaged', (event: unknown) => {
      const e = event as { data?: { x: number; y: number; damage: number } };
      const d = e.data ?? (e as any);
      if (!d) return;
      this.spawnDamageNumber(d.x, d.y, d.damage);
    });

    eventBus.on('tile:destroyed', (event: unknown) => {
      const e = event as { data?: { x: number; y: number } };
      const d = e.data ?? (e as any);
      if (!d) return;
      this.spawnExplosion(d.x, d.y);
      this.particles.emit({
        ...COMBAT_CONFIG.destructionParticles,
        x: d.x,
        y: d.y,
      });
    });

    // --- Phase 3: entity-level events ---

    eventBus.on('entity:killed', (event: unknown) => {
      const e = event as { data?: { x: number; y: number; tags: string[] } };
      const d = (e.data ?? e) as { x: number; y: number; tags: string[] };
      if (!d?.tags?.includes('enemy')) return;
      this.spawnExplosion(d.x, d.y);
      this.spawnTurretPopOff(d.x, d.y);
      this.particles.emit({
        ...COMBAT_CONFIG.destructionParticles,
        x: d.x,
        y: d.y,
      });
    });

    eventBus.on('entity:damaged', (event: unknown) => {
      const e = event as { data?: { entityId?: number; x: number; y: number; damage: number; weaponDef?: WeaponDef } };
      const d = (e.data ?? e) as { entityId?: number; x: number; y: number; damage: number; weaponDef?: WeaponDef };
      if (!d) return;
      this.spawnDamageNumber(d.x, d.y, d.damage);
      this.particles.emit({
        ...COMBAT_CONFIG.impactParticles,
        ...(d.weaponDef ? COMBAT_CONFIG.damageTypeImpact[d.weaponDef.damageType] : {}),
        x: d.x,
        y: d.y,
      });

      // Hit flash on the damaged tank
      if (d.entityId !== undefined && d.weaponDef && this.em) {
        const tank = this.em.getComponent(d.entityId, TANK_PARTS) as TankPartsComponent | undefined;
        if (tank) {
          const flashCfg = COMBAT_CONFIG.hitFlash[d.weaponDef.damageType];
          tank.hitFlashElapsed  = Number.EPSILON; // start flash (> 0)
          tank.hitFlashDuration = flashCfg.duration;
          tank.hitFlashColor    = flashCfg.color;
        }
      }

      // Player-takes-hit camera shake
      if (d.entityId === this.playerId && d.weaponDef) {
        const shakeCfg = COMBAT_CONFIG.playerHitShake[d.weaponDef.damageType];
        this.camera.shake(shakeCfg.intensity, shakeCfg.duration);
      }
    });

    eventBus.on('projectile:hit:entity', (event: unknown) => {
      const e = event as { data?: { x: number; y: number; weaponDef: WeaponDef } };
      const d = (e.data ?? e) as { x: number; y: number; weaponDef: WeaponDef };
      if (!d) return;
      this.spawnImpact(d.x, d.y, d.weaponDef);
      if (d.weaponDef) {
        this.camera.shake(d.weaponDef.shakeOnHit.intensity, d.weaponDef.shakeOnHit.duration);
      }
    });

    // --- Item pickup VFX ---

    eventBus.on('item:picked', (event: unknown) => {
      const e = event as { data?: { itemType: string; x: number; y: number } };
      const d = (e.data ?? e) as { itemType: string; x: number; y: number };
      if (!d) return;
      if (d.itemType === 'coin') {
        this.particles.emit({ ...COMBAT_CONFIG.coin.pickupParticles, x: d.x, y: d.y });
        return;
      }
      // Timed buff/debuff → float label above player
      const def = TIMED_BUFF_DEFS[d.itemType];
      if (def) {
        const playerPos = this.em
          ? (this.em.getComponent(this.playerId, 'Position') as { x: number; y: number } | undefined)
          : undefined;
        const lx = playerPos?.x ?? d.x;
        const ly = (playerPos?.y ?? d.y) - BUFF_NOTIFY.yOffsetPx;
        const color = def.polarity === 'buff' ? BUFF_HUD.vignetteBuffColor : BUFF_HUD.vignetteDebuffColor;
        this.floatingLabels.push({ x: lx, y: ly, text: `${def.polarity === 'buff' ? '+' : '-'}${def.label}`, color, elapsed: 0 });
      }
    });

    // --- Phase 4: weapon VFX ---

    // Charge buildup tremor
    eventBus.on('weapon:charging', (event: unknown) => {
      const e = event as { data?: { chargeRatio: number; weaponDef: WeaponDef } };
      const d = (e.data ?? e) as { chargeRatio: number; weaponDef: WeaponDef };
      if (!d?.weaponDef?.shakeOnFire.buildup) return;
      const bu = d.weaponDef.shakeOnFire.buildup;
      const intensity = Math.min(bu.rampPerSec * d.chargeRatio, bu.maxIntensity);
      if (intensity > 0) this.camera.shake(intensity, 0.05);
    });

    eventBus.on('projectile:bounce', (event: unknown) => {
      const e = event as { data?: { x: number; y: number } };
      const d = (e.data ?? e) as { x: number; y: number };
      if (!d) return;
      this.particles.emit({ ...COMBAT_CONFIG.impactParticles, x: d.x, y: d.y, count: 4, speed: 60 });
    });

    eventBus.on('splash:detonated', (event: unknown) => {
      const e = event as { data?: { x: number; y: number } };
      const d = (e.data ?? e) as { x: number; y: number };
      if (!d) return;
      this.spawnExplosion(d.x, d.y);
      this.particles.emit({ ...COMBAT_CONFIG.splashParticles, x: d.x, y: d.y });
      this.camera.shake(5, 0.25);
    });

    eventBus.on('bomb:exploded', (event: unknown) => {
      const e = event as { data?: { x: number; y: number } };
      const d = (e.data ?? e) as { x: number; y: number };
      if (!d) return;
      this.spawnExplosion(d.x, d.y);
      this.particles.emit({ ...COMBAT_CONFIG.splashParticles, x: d.x, y: d.y });
      this.camera.shake(4, 0.2);
    });

    // --- Phase 5.4: armor deflection ---

    eventBus.on('projectile:deflected', (event: unknown) => {
      const e = event as { data?: { x: number; y: number } };
      const d = (e.data ?? e) as { x: number; y: number };
      if (!d) return;
      this.particles.emit({ ...COMBAT_CONFIG.deflection.ricochetParticles, x: d.x, y: d.y });
      this.floatingLabels.push({
        x: d.x,
        y: d.y - 12,
        text:    COMBAT_CONFIG.deflection.ricochetLabelText,
        color:   COMBAT_CONFIG.deflection.ricochetLabelColor,
        elapsed: 0,
      });
    });
  }

  private spawnMuzzleFlash(x: number, y: number, angle: number, weapon: WeaponDef): void {
    this.muzzleFlashes.push({
      x, y, angle,
      elapsed: 0,
      spriteKeys: weapon.muzzleFlash.spriteKeys,
      fps: weapon.muzzleFlash.fps,
      width: weapon.muzzleFlash.width,
      height: weapon.muzzleFlash.height,
    });
  }

  private spawnImpact(x: number, y: number, weaponDef?: WeaponDef): void {
    this.impacts.push({
      x, y, angle: 0,
      elapsed: 0,
      spriteKeys: COMBAT_CONFIG.impact.spriteKeys,
      fps: COMBAT_CONFIG.impact.fps,
      width: COMBAT_CONFIG.impact.displaySize,
      height: COMBAT_CONFIG.impact.displaySize,
    });
    this.particles.emit({
      ...COMBAT_CONFIG.impactParticles,
      ...(weaponDef ? COMBAT_CONFIG.damageTypeImpact[weaponDef.damageType] : {}),
      x, y,
    });
  }

  private spawnExplosion(x: number, y: number): void {
    this.explosions.push({
      x, y, angle: 0,
      elapsed: 0,
      spriteKeys: COMBAT_CONFIG.explosion.spriteKeys,
      fps: COMBAT_CONFIG.explosion.fps,
      width: COMBAT_CONFIG.explosion.displaySize,
      height: COMBAT_CONFIG.explosion.displaySize,
    });
  }

  private spawnTurretPopOff(x: number, y: number): void {
    const launchAngle = Math.random() * Math.PI * 2;
    this.turretPopOffs.push({
      x, y,
      vx: Math.cos(launchAngle) * TURRET_POP_SPEED * 0.5,
      vy: -TURRET_POP_SPEED, // upward in screen space
      angle: Math.random() * Math.PI * 2,
      angularVel: (Math.random() - 0.5) * 10,
      elapsed: 0,
      alpha: 1,
    });
  }

  spawnDamageNumber(x: number, y: number, amount: number): void {
    this.floatingNumbers.push({
      x,
      y,
      text: String(amount),
      elapsed: 0,
    });
  }

  update(dt: number): void {
    this.updateAnimations(this.muzzleFlashes, dt);
    this.updateAnimations(this.impacts, dt);
    this.updateAnimations(this.explosions, dt);
    this.particles.update(dt, 0); // no gravity for top-down

    // Floating numbers
    const cfg = COMBAT_CONFIG.damageNumber;
    for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
      const fn = this.floatingNumbers[i];
      fn.elapsed += dt;
      fn.y -= cfg.floatSpeed * dt;
      if (fn.elapsed >= cfg.fadeTime) {
        this.floatingNumbers.splice(i, 1);
      }
    }

    // Floating buff/debuff labels
    for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
      const fl = this.floatingLabels[i];
      fl.elapsed += dt;
      fl.y -= BUFF_NOTIFY.floatSpeed * dt;
      if (fl.elapsed >= BUFF_NOTIFY.fadeTime) this.floatingLabels.splice(i, 1);
    }

    // Turret pop-offs
    for (let i = this.turretPopOffs.length - 1; i >= 0; i--) {
      const tp = this.turretPopOffs[i];
      tp.elapsed += dt;
      tp.vy += TURRET_POP_GRAVITY * dt;
      tp.x += tp.vx * dt;
      tp.y += tp.vy * dt;
      tp.angle += tp.angularVel * dt;
      tp.alpha = Math.max(0, 1 - tp.elapsed / TURRET_POP_DURATION);
      if (tp.elapsed >= TURRET_POP_DURATION) {
        this.turretPopOffs.splice(i, 1);
      }
    }
  }

  private updateAnimations(list: SpriteAnimation[], dt: number): void {
    for (let i = list.length - 1; i >= 0; i--) {
      const anim = list[i];
      anim.elapsed += dt;
      if (FrameAnimator.isOneShotComplete(anim.elapsed, anim.spriteKeys.length, anim.fps)) {
        list.splice(i, 1);
      }
    }
  }

  /** Draw all VFX. ctx must be in world space (camera transform applied). */
  drawWorld(ctx: CanvasRenderingContext2D): void {
    this.drawAnimationList(ctx, this.explosions);
    this.drawAnimationList(ctx, this.impacts);
    this.drawAnimationList(ctx, this.muzzleFlashes);
    this.drawTurretPopOffs(ctx);
    this.particles.draw(ctx);
    this.drawFloatingNumbers(ctx);
    this.drawFloatingLabels(ctx);
  }

  private drawAnimationList(ctx: CanvasRenderingContext2D, list: SpriteAnimation[]): void {
    for (const anim of list) {
      const frameIdx = FrameAnimator.getOneShotFrame(anim.elapsed, anim.spriteKeys.length, anim.fps);
      const img = this.assets.getImage(anim.spriteKeys[frameIdx]) as CanvasImageSource | undefined;
      if (!img) continue;

      ctx.save();
      ctx.translate(anim.x, anim.y);
      if (anim.angle !== 0) ctx.rotate(anim.angle);
      ctx.drawImage(img,
        -anim.width / 2, -anim.height / 2,
        anim.width, anim.height);
      ctx.restore();
    }
  }

  private drawTurretPopOffs(ctx: CanvasRenderingContext2D): void {
    for (const tp of this.turretPopOffs) {
      const img = this.assets.getImage('gun-01') as CanvasImageSource | undefined;
      ctx.save();
      ctx.globalAlpha = tp.alpha;
      ctx.translate(tp.x, tp.y);
      ctx.rotate(tp.angle);
      if (img) {
        ctx.drawImage(img, -10, -23, 20, 46);
      } else {
        ctx.fillStyle = '#666';
        ctx.fillRect(-5, -12, 10, 24);
      }
      ctx.restore();
    }
  }

  private drawFloatingNumbers(ctx: CanvasRenderingContext2D): void {
    const cfg = COMBAT_CONFIG.damageNumber;
    for (const fn of this.floatingNumbers) {
      const alpha = 1 - fn.elapsed / cfg.fadeTime;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = cfg.font;
      ctx.fillStyle = cfg.color;
      ctx.textAlign = 'center';
      ctx.fillText(fn.text, fn.x, fn.y);
      ctx.restore();
    }
  }

  private drawFloatingLabels(ctx: CanvasRenderingContext2D): void {
    for (const fl of this.floatingLabels) {
      const alpha = 1 - fl.elapsed / BUFF_NOTIFY.fadeTime;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = BUFF_NOTIFY.font;
      ctx.fillStyle = fl.color;
      ctx.textAlign = 'center';
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }
  }
}
