import type { EntityManager, UnifiedInput, CameraSystem } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';

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
    tank.hullAngle += turnInput * tank.turnRate * dt;

    // --- Forward/back (W/S or ArrowUp/ArrowDown) ---
    let driveInput = 0;
    if (input.isPressed('KeyW') || input.isPressed('ArrowUp')) driveInput += 1;
    if (input.isPressed('KeyS') || input.isPressed('ArrowDown')) driveInput -= 1;

    if (driveInput !== 0) {
      const maxSpd = driveInput > 0 ? tank.maxForwardSpeed : tank.maxReverseSpeed;
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

    // Convert scalar speed + hull angle to velocity vector
    vel.vx = Math.sin(tank.hullAngle) * tank.speed;
    vel.vy = -Math.cos(tank.hullAngle) * tank.speed;

    // --- Turret follows mouse (screen → world) ---
    const pointer = input.getPointer();
    const cam = camera.getTransform();
    const worldX = (pointer.x - cam.x) / cam.zoom;
    const worldY = (pointer.y - cam.y) / cam.zoom;
    const dx = worldX - pos.x;
    const dy = worldY - pos.y;
    tank.turretAngle = Math.atan2(dx, -dy); // 0=up, CW positive
  }
}
