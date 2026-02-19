import type { EntityManager, UnifiedInput, CameraSystem, HealthComponent } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { WEAPON } from '../components/Weapon.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import type { BuffSystem } from './BuffSystem.js';

/** Damping ratio for recoil spring: critical damping = 1.0, overdamped > 1. */
const RECOIL_DAMPING = 1.4;

/** Returns a [0–1] speed multiplier based on current HP ratio. */
export function getDamageSpeedFactor(healthRatio: number): number {
  const { damageStates: ds, movementPenalty: mp } = COMBAT_CONFIG;
  if (healthRatio <= ds.heavySmoke) return mp.heavySmoke;
  if (healthRatio <= ds.smoking)    return mp.smoking;
  return mp.healthy;
}

/**
 * Reads keyboard (WASD) for hull movement/rotation, mouse for turret aim.
 * Updates TankParts state + Velocity. Only affects entities tagged "player".
 *
 * Angle convention: 0 = up (north), positive = clockwise.
 * Velocity: vx = sin(angle) * speed, vy = -cos(angle) * speed.
 */
export function updateTankMovement(
  em: EntityManager,
  input: UnifiedInput,
  camera: CameraSystem,
  dt: number,
  buffSystem?: BuffSystem,
): void {
  const ids = em.query('Position', 'Velocity', TANK_PARTS, 'Tag');

  for (const id of ids) {
    const tags = em.getComponent(id, 'Tag') as Set<string> | undefined;
    if (!tags?.has('player')) continue;

    const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
    const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    const tank = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
    if (!pos || !vel || !tank) continue;

    // --- Hull rotation (A/D or ArrowLeft/ArrowRight) ---
    let turnInput = 0;
    if (input.isPressed('KeyA') || input.isPressed('ArrowLeft')) turnInput -= 1;
    if (input.isPressed('KeyD') || input.isPressed('ArrowRight')) turnInput += 1;
    const turnMod = buffSystem ? buffSystem.getModifier('turnRate') : 1;
    tank.hullAngle += turnInput * tank.turnRate * turnMod * dt;

    // --- Forward/back (W/S or ArrowUp/ArrowDown) ---
    let driveInput = 0;
    if (input.isPressed('KeyW') || input.isPressed('ArrowUp')) driveInput += 1;
    if (input.isPressed('KeyS') || input.isPressed('ArrowDown')) driveInput -= 1;

    // Damage degrades speed — read HP ratio and apply multiplier
    const health     = em.getComponent(id, 'Health') as HealthComponent | undefined;
    const healthRatio = health ? health.current / health.max : 1;
    const speedFactor = getDamageSpeedFactor(healthRatio);
    const buffSpeedMod = buffSystem ? buffSystem.getModifier('speed') : 1;

    if (driveInput !== 0) {
      const maxSpd = (driveInput > 0 ? tank.maxForwardSpeed : tank.maxReverseSpeed) * speedFactor * buffSpeedMod;
      const targetSpeed = driveInput * maxSpd;
      // Accelerate toward target speed
      if (tank.speed < targetSpeed) {
        tank.speed = Math.min(tank.speed + tank.acceleration * dt, targetSpeed);
      } else if (tank.speed > targetSpeed) {
        tank.speed = Math.max(tank.speed - tank.acceleration * dt, targetSpeed);
      }
    } else {
      // Decelerate (friction)
      if (tank.speed > 0) {
        tank.speed = Math.max(0, tank.speed - tank.deceleration * dt);
      } else if (tank.speed < 0) {
        tank.speed = Math.min(0, tank.speed + tank.deceleration * dt);
      }
    }

    // Accumulate track scroll offset: signed so forward/reverse scroll in opposite directions
    tank.trackOffset = ((tank.trackOffset + tank.speed * dt) % tank.trackHeight + tank.trackHeight) % tank.trackHeight;

    // Convert scalar speed + hull angle to velocity vector
    vel.vx = Math.sin(tank.hullAngle) * tank.speed;
    vel.vy = -Math.cos(tank.hullAngle) * tank.speed;

    // --- Turret tracks mouse with angular speed limit ---
    const pointer = input.getPointer();
    const cam = camera.getTransform();
    const worldX = (pointer.x - cam.x) / cam.zoom;
    const worldY = (pointer.y - cam.y) / cam.zoom;
    const dx = worldX - pos.x;
    const dy = worldY - pos.y;
    const targetAngle = Math.atan2(dx, -dy); // 0=up, CW positive
    tank.turretAngle = rotateToward(tank.turretAngle, targetAngle, tank.turretTurnRate * dt);
  }
}

/**
 * Spring-damp recoil and tick hit flash for all tanks each frame.
 * Separate from player movement so AI tanks animate too.
 */
export function updateTankVFXState(em: EntityManager, dt: number): void {
  const ids = em.query(TANK_PARTS, WEAPON);
  for (const id of ids) {
    const tank   = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
    const weapon = em.getComponent(id, WEAPON)     as { def: { recoilPx: number; recoilSpring: number } } | undefined;
    if (!tank || !weapon) continue;

    // Recoil spring-damper
    if (tank.recoilOffset !== 0 || tank.recoilVelocity !== 0) {
      const k     = weapon.def.recoilSpring;
      const c     = RECOIL_DAMPING * 2 * Math.sqrt(k);
      const accel = -k * tank.recoilOffset - c * tank.recoilVelocity;
      tank.recoilVelocity += accel * dt;
      tank.recoilOffset   += tank.recoilVelocity * dt;
      if (Math.abs(tank.recoilOffset) < 0.05 && Math.abs(tank.recoilVelocity) < 0.5) {
        tank.recoilOffset   = 0;
        tank.recoilVelocity = 0;
      }
    }

    // Hit flash timer
    if (tank.hitFlashElapsed > 0) {
      tank.hitFlashElapsed += dt;
      if (tank.hitFlashElapsed >= tank.hitFlashDuration) {
        tank.hitFlashElapsed = 0;
        tank.hitFlashColor   = '';
      }
    }

    // Shield timer
    if (tank.shieldElapsed > 0) {
      tank.shieldElapsed += dt;
      if (tank.shieldElapsed >= tank.shieldDuration) {
        tank.shieldElapsed  = 0;
        tank.shieldDuration = 0;
      }
    }
  }
}

/**
 * Rotate `current` angle toward `target` by at most `maxStep` radians,
 * taking the shortest arc (handles ±π wrap correctly).
 */
function rotateToward(current: number, target: number, maxStep: number): number {
  const delta = ((target - current + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}
