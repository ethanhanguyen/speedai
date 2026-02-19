import type { EntityManager, UnifiedInput, CameraSystem, ComponentData, GridModel } from '@speedai/game-engine';
import type { EventBus, ObjectPoolSystem } from '@speedai/game-engine';
import { ComponentFactory } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';
import type { InfantryPartsComponent } from '../components/InfantryParts.js';
import { WEAPON } from '../components/Weapon.js';
import type { WeaponComponent } from '../components/Weapon.js';
import { PROJECTILE } from '../components/Projectile.js';
import type { ProjectileComponent } from '../components/Projectile.js';
import { getTurretTip } from '../tank/TankUtils.js';
import type { HitscanSystem } from './HitscanSystem.js';
import type { BombSystem } from './BombSystem.js';
import type { TileCell } from '../tilemap/types.js';
import { PLAYER_WEAPONS } from '../config/WeaponConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { BOMB_PLACE_KEY, BOMB_CYCLE_KEYS } from '../config/BombConfig.js';
import type { BombType } from '../config/BombConfig.js';
import type { BuffSystem } from '../systems/BuffSystem.js';

/** Keys used to switch player weapons (Digit1–Digit5). */
const WEAPON_SWITCH_KEYS = [
  'Digit1','Digit2','Digit3','Digit4','Digit5',
] as const;

const BOMB_TYPES: BombType[] = ['proximity', 'timed', 'remote'];

function cycleBombType(current: BombType, dir: -1 | 1): BombType {
  const idx = BOMB_TYPES.indexOf(current);
  return BOMB_TYPES[(idx + dir + BOMB_TYPES.length) % BOMB_TYPES.length];
}

/**
 * Ticks weapon cooldowns for all armed entities.
 * Handles player fire input, weapon switching, charge, and bomb placement.
 * AI fires via tryFire() directly — ballistic only.
 */
export function updateWeapons(
  em: EntityManager,
  input: UnifiedInput,
  pool: ObjectPoolSystem,
  eventBus: EventBus,
  hitscanSys: HitscanSystem,
  bombSys: BombSystem,
  tilemap: GridModel<TileCell>,
  camera: CameraSystem,
  dt: number,
  weaponKeyState: Set<string>,
  activeBombTypeRef: { value: BombType },
  buffSystem?: BuffSystem,
): void {
  const ids = em.query('Position', TANK_PARTS, WEAPON);

  for (const id of ids) {
    const weapon = em.getComponent(id, WEAPON) as WeaponComponent | undefined;
    if (!weapon) continue;

    const tags = em.getComponent(id, 'Tag') as Set<string> | undefined;
    const isPlayer = tags?.has('player') ?? false;

    // Tick cooldown — player benefits from fireRate buff
    const fireRateMod = (isPlayer && buffSystem) ? buffSystem.getModifier('fireRate') : 1;
    weapon.cooldownRemaining = Math.max(0, weapon.cooldownRemaining - dt * fireRateMod);

    if (!isPlayer) continue;

    // ----- Player-only below -----
    const pos  = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
    const tank = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
    if (!pos || !tank) continue;

    const pointer = input.getPointer();
    const cam     = camera.getTransform();
    const cursorX = (pointer.x - cam.x) / cam.zoom;
    const cursorY = (pointer.y - cam.y) / cam.zoom;

    // Weapon switch (1–8 keys) — edge detect
    for (let i = 0; i < WEAPON_SWITCH_KEYS.length; i++) {
      const key = WEAPON_SWITCH_KEYS[i];
      const down = input.isPressed(key);
      if (down && !weaponKeyState.has(key) && i < PLAYER_WEAPONS.length) {
        weapon.def = PLAYER_WEAPONS[i];
        weapon.isCharging = false;
        weapon.chargeElapsed = 0;
        // Stop any active laser beam on weapon switch
        if (weapon.laserFiring) {
          hitscanSys.stopContinuous();
          weapon.laserFiring = false;
        }
        weapon.heatCurrent    = 0;
        weapon.isOverheated   = false;
        weapon.overheatElapsed = 0;
      }
      if (down) weaponKeyState.add(key); else weaponKeyState.delete(key);
    }

    // Bomb cycle ([ / ])
    const prevDown = input.isPressed(BOMB_CYCLE_KEYS.prev);
    const nextDown = input.isPressed(BOMB_CYCLE_KEYS.next);
    if (prevDown && !weaponKeyState.has(BOMB_CYCLE_KEYS.prev))
      activeBombTypeRef.value = cycleBombType(activeBombTypeRef.value, -1);
    if (nextDown && !weaponKeyState.has(BOMB_CYCLE_KEYS.next))
      activeBombTypeRef.value = cycleBombType(activeBombTypeRef.value, +1);
    if (prevDown) weaponKeyState.add(BOMB_CYCLE_KEYS.prev); else weaponKeyState.delete(BOMB_CYCLE_KEYS.prev);
    if (nextDown) weaponKeyState.add(BOMB_CYCLE_KEYS.next); else weaponKeyState.delete(BOMB_CYCLE_KEYS.next);

    // Bomb placement (B key)
    const bombDown = input.isPressed(BOMB_PLACE_KEY);
    if (bombDown && !weaponKeyState.has(BOMB_PLACE_KEY))
      bombSys.placeBomb(em, id, pos.x, pos.y, activeBombTypeRef.value);
    if (bombDown) weaponKeyState.add(BOMB_PLACE_KEY); else weaponKeyState.delete(BOMB_PLACE_KEY);

    const behavior = weapon.def.behavior;

    // ----- Hitscan (Laser) -----
    if (behavior.kind === 'hitscan') {
      if (behavior.continuousMode) {
        if (weapon.isOverheated) {
          // Lockout countdown — no firing allowed
          weapon.overheatElapsed += dt;
          if (weapon.overheatElapsed >= behavior.overheatLockoutSec) {
            weapon.isOverheated    = false;
            weapon.heatCurrent     = 0;
            weapon.overheatElapsed = 0;
          }
          if (weapon.laserFiring) {
            hitscanSys.stopContinuous();
            weapon.laserFiring = false;
          }
        } else if (pointer.down) {
          // Build heat
          weapon.heatCurrent = Math.min(
            weapon.heatCurrent + behavior.heatPerSec * dt,
            behavior.heatCapacity,
          );
          const heatRatio = weapon.heatCurrent / behavior.heatCapacity;
          const tip = getTurretTip(pos, tank);

          // Muzzle flash only on the first frame (laser start)
          if (!weapon.laserFiring) {
            weapon.laserFiring = true;
            weapon.shotCount++;
            eventBus.fire('weapon:fired', {
              tankId: id, x: tip.x, y: tip.y, angle: tank.turretAngle, weaponDef: weapon.def,
            });
          }

          // Per-frame: fire continuous beam
          hitscanSys.fireContinuous(dt, tip.x, tip.y, tank.turretAngle, weapon.def, heatRatio, tilemap, id, em, eventBus);

          // Barrel tint: reset each frame so it stays on while firing
          tank.hitFlashColor    = COMBAT_CONFIG.laserBeam.barrelTintColor;
          tank.hitFlashElapsed  = Number.EPSILON;
          tank.hitFlashDuration = 0.08;

          // Buildup camera shake grows with heat (reuses existing weapon:charging pathway)
          eventBus.fire('weapon:charging', {
            tankId: id, x: tip.x, y: tip.y,
            angle: tank.turretAngle,
            chargeRatio: heatRatio,
            weaponDef: weapon.def,
          });

          // Trigger overheat
          if (weapon.heatCurrent >= behavior.heatCapacity) {
            weapon.isOverheated    = true;
            weapon.overheatElapsed = 0;
            hitscanSys.stopContinuous();
            weapon.laserFiring = false;
            // Big flash on overheat — reuse muzzle flash event
            eventBus.fire('weapon:fired', {
              tankId: id, x: tip.x, y: tip.y, angle: tank.turretAngle, weaponDef: weapon.def,
            });
          }
        } else {
          // Mouse released — cool down
          if (weapon.laserFiring) {
            hitscanSys.stopContinuous();
            weapon.laserFiring = false;
          }
          weapon.heatCurrent = Math.max(0, weapon.heatCurrent - behavior.cooldownPerSec * dt);
        }
      } else {
        // Legacy click-fire hitscan (non-continuous)
        if (pointer.down && weapon.cooldownRemaining <= 0) {
          weapon.cooldownRemaining = 1 / weapon.def.fireRate;
          weapon.shotCount++;
          const tip = getTurretTip(pos, tank);
          hitscanSys.fire(tip.x, tip.y, tank.turretAngle, weapon.def, tilemap, id, em, eventBus);
          eventBus.fire('weapon:fired', {
            tankId: id, x: tip.x, y: tip.y, angle: tank.turretAngle, weaponDef: weapon.def,
          });
        }
      }
      continue;
    }

    // ----- Charge (Railgun) -----
    if (behavior.kind === 'charge') {
      if (pointer.down) {
        weapon.isCharging = true;
        weapon.chargeElapsed += dt * 1000;
        const chargeRatio = Math.min(weapon.chargeElapsed / behavior.chargeMs, 1);
        const tip = getTurretTip(pos, tank);
        eventBus.fire('weapon:charging', {
          tankId: id, x: tip.x, y: tip.y,
          angle: tank.turretAngle,
          chargeRatio,
          weaponDef: weapon.def,
        });
      } else if (weapon.isCharging) {
        weapon.isCharging = false;
        if (weapon.chargeElapsed >= behavior.chargeMs && weapon.cooldownRemaining <= 0) {
          tryFire(em, id, pool, eventBus, { targetX: cursorX, targetY: cursorY });
        }
        weapon.chargeElapsed = 0;
      }
      continue;
    }

    // ----- Splash (Howitzer) -----
    if (behavior.kind === 'splash') {
      if (pointer.down && weapon.cooldownRemaining <= 0) {
        tryFire(em, id, pool, eventBus, { targetX: cursorX, targetY: cursorY });
      }
      continue;
    }

    // ----- Ballistic (all others incl. MG, Heavy, Rifled, Shotgun) -----
    if (pointer.down && weapon.cooldownRemaining <= 0) {
      const pellets = (behavior.kind === 'ballistic' && behavior.pelletCount) ? behavior.pelletCount : 1;
      for (let p = 0; p < pellets; p++) {
        tryFire(em, id, pool, eventBus, { targetX: cursorX, targetY: cursorY });
      }
    }
  }
}

/**
 * Spawn a projectile from the given tank's turret tip.
 * Handles ballistic, splash, and charge fire modes.
 * Called by player input (updateWeapons) and AI (AISystem).
 */
export function tryFire(
  em: EntityManager,
  tankId: number,
  pool: ObjectPoolSystem,
  eventBus: EventBus,
  opts?: { targetX?: number; targetY?: number },
): boolean {
  const pos    = em.getComponent(tankId, 'Position') as { x: number; y: number } | undefined;
  const tank   = em.getComponent(tankId, TANK_PARTS)  as TankPartsComponent      | undefined;
  const weapon = em.getComponent(tankId, WEAPON)       as WeaponComponent         | undefined;
  if (!pos || !tank || !weapon) return false;
  if (weapon.cooldownRemaining > 0) return false;

  weapon.cooldownRemaining = 1 / weapon.def.fireRate;

  const tip = getTurretTip(pos, tank);
  const behavior = weapon.def.behavior;

  // Per-pellet spread
  const spread = (behavior.kind === 'ballistic' && behavior.spread) ? behavior.spread : 0;
  const angle  = tank.turretAngle + (spread > 0 ? (Math.random() * 2 - 1) * spread : 0);

  const projectileId = pool.acquire('projectile');
  if (projectileId === null) return false;

  // Lifetime — may be overridden
  let lifetime = weapon.def.projectileLifetime;
  let splashTarget: { x: number; y: number } | undefined;

  if (behavior.kind === 'splash' && opts?.targetX !== undefined && opts.targetY !== undefined) {
    const dx = opts.targetX - tip.x;
    const dy = opts.targetY - tip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    lifetime = Math.min(dist / weapon.def.projectileSpeed, weapon.def.projectileLifetime);
    splashTarget = { x: opts.targetX, y: opts.targetY };
  }

  const piercesRemaining = (behavior.kind === 'charge') ? behavior.piercesMax : 0;
  const bouncesRemaining = (behavior.kind === 'ballistic' && behavior.bouncesMax) ? behavior.bouncesMax : 0;

  em.addComponent(projectileId, 'Position',
    ComponentFactory.position(tip.x, tip.y) as unknown as ComponentData);

  em.addComponent(projectileId, 'Velocity',
    ComponentFactory.velocity(
      Math.sin(angle) * weapon.def.projectileSpeed,
      -Math.cos(angle) * weapon.def.projectileSpeed,
    ) as unknown as ComponentData);

  const proj: ProjectileComponent = {
    weaponDef: weapon.def,
    ownerId: tankId,
    elapsed: 0,
    distanceTraveled: 0,
    lifetimeOverride: lifetime !== weapon.def.projectileLifetime ? lifetime : undefined,
    bouncesRemaining,
    piercesRemaining,
    hitEntities: new Set<number>(),
    splashTarget,
    trailAccumulatedMs: 0,
  };
  em.addComponent(projectileId, PROJECTILE, proj as unknown as ComponentData);

  weapon.shotCount++;

  // Kick recoil: impart an instantaneous velocity so the barrel snaps back in ~1 frame
  tank.recoilOffset   = 0;
  tank.recoilVelocity = weapon.def.recoilPx / 0.016;

  eventBus.fire('weapon:fired', {
    tankId,
    projectileId,
    x: tip.x, y: tip.y,
    angle,
    weaponDef: weapon.def,
    splashTarget,
  });

  return true;
}

/**
 * Spawn a projectile from an infantry unit's muzzle (no turret — uses facingAngle).
 * Supports ballistic only (infantry weapons are all ballistic, incl. pellet shotgun).
 * Called by AISystem for infantry entities.
 */
export function tryFireInfantry(
  em: EntityManager,
  infantryId: number,
  pool: ObjectPoolSystem,
  eventBus: EventBus,
): boolean {
  const pos    = em.getComponent(infantryId, 'Position') as { x: number; y: number } | undefined;
  const inf    = em.getComponent(infantryId, INFANTRY_PARTS) as InfantryPartsComponent | undefined;
  const weapon = em.getComponent(infantryId, WEAPON) as WeaponComponent | undefined;
  if (!pos || !inf || !weapon) return false;
  if (weapon.cooldownRemaining > 0) return false;

  weapon.cooldownRemaining = 1 / weapon.def.fireRate;

  const muzzleX = pos.x + Math.sin(inf.facingAngle) * inf.muzzleOffsetPx;
  const muzzleY = pos.y - Math.cos(inf.facingAngle) * inf.muzzleOffsetPx;
  const behavior = weapon.def.behavior;
  const spread = (behavior.kind === 'ballistic' && behavior.spread) ? behavior.spread : 0;
  const pellets = (behavior.kind === 'ballistic' && behavior.pelletCount) ? behavior.pelletCount : 1;

  for (let p = 0; p < pellets; p++) {
    const projectileId = pool.acquire('projectile');
    if (projectileId === null) break;

    const angle = inf.facingAngle + (spread > 0 ? (Math.random() * 2 - 1) * spread : 0);
    const bouncesRemaining = (behavior.kind === 'ballistic' && behavior.bouncesMax) ? behavior.bouncesMax : 0;

    em.addComponent(projectileId, 'Position',
      ComponentFactory.position(muzzleX, muzzleY) as unknown as ComponentData);
    em.addComponent(projectileId, 'Velocity',
      ComponentFactory.velocity(
        Math.sin(angle) * weapon.def.projectileSpeed,
        -Math.cos(angle) * weapon.def.projectileSpeed,
      ) as unknown as ComponentData);

    const proj: ProjectileComponent = {
      weaponDef: weapon.def,
      ownerId: infantryId,
      elapsed: 0,
      distanceTraveled: 0,
      bouncesRemaining,
      piercesRemaining: 0,
      hitEntities: new Set<number>(),
      trailAccumulatedMs: 0,
    };
    em.addComponent(projectileId, PROJECTILE, proj as unknown as ComponentData);

    eventBus.fire('weapon:fired', {
      tankId: infantryId,
      projectileId,
      x: muzzleX, y: muzzleY,
      angle,
      weaponDef: weapon.def,
    });
  }

  weapon.shotCount++;

  // Trigger shot animation on infantry parts
  const shotAnimDuration = (1 / weapon.def.fireRate) * 1.1;
  inf.shotFlashElapsed = shotAnimDuration;
  inf.shotFlashDuration = shotAnimDuration;

  return true;
}
