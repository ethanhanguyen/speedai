import type { EntityManager, HealthComponent } from '@speedai/game-engine';
import type { ObjectPoolSystem, EventBus } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';
import type { InfantryPartsComponent } from '../components/InfantryParts.js';
import { AI_STATE, AIState } from '../components/AI.js';
import type { AIComponent } from '../components/AI.js';
import { WEAPON } from '../components/Weapon.js';
import type { WeaponComponent } from '../components/Weapon.js';
import { DISENGAGE_MULTIPLIER, SEPARATION_CONFIG, SQUAD_STEERING } from '../config/AIConfig.js';
import { getDamageSpeedFactor } from '../systems/TankMovementSystem.js';
import { getInfantrySpeedFactor } from '../systems/InfantryMovementSystem.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { tryFire } from '../combat/WeaponSystem.js';
import { tryFireInfantry } from '../combat/WeaponSystem.js';
import type { FlowField } from './FlowField.js';

/**
 * Processes all AI-controlled entities: tanks and infantry.
 * - Tanks: flow field navigation, hull/turret rotation, existing behavior.
 * - Infantry: omnidirectional movement, squad formation steering, facingAngle update.
 * All per-role behavior is driven by resolved values on AIComponent.
 */
export function updateAI(
  em: EntityManager,
  flowField: FlowField,
  playerId: number,
  pool: ObjectPoolSystem,
  eventBus: EventBus,
  dt: number,
): void {
  const playerPos = em.getComponent(playerId, 'Position') as { x: number; y: number } | undefined;
  if (!playerPos) return;

  // ---- TANKS ----------------------------------------------------------------
  const tankIds = em.query('Position', TANK_PARTS, AI_STATE, WEAPON);

  const tankPositions = new Map<number, { x: number; y: number }>();
  for (const id of tankIds) {
    const pos = em.getComponent(id, 'Position') as { x: number; y: number };
    if (pos) tankPositions.set(id, pos);
  }

  for (const id of tankIds) {
    const pos    = tankPositions.get(id);
    const tank   = em.getComponent(id, TANK_PARTS) as unknown as TankPartsComponent;
    const ai     = em.getComponent(id, AI_STATE)   as unknown as AIComponent;
    const weapon = em.getComponent(id, WEAPON)     as unknown as WeaponComponent;
    if (!pos || !tank || !ai || !weapon) continue;

    weapon.cooldownRemaining = Math.max(0, weapon.cooldownRemaining - dt);

    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleToPlayer = Math.atan2(dx, -dy);

    tickFSM(ai, dist);
    const sep = separationVector(id, pos, tankPositions);
    const health = em.getComponent(id, 'Health') as HealthComponent | undefined;
    const speedFactor = getDamageSpeedFactor(health ? health.current / health.max : 1);

    if (ai.state === AIState.CHASE) {
      tankChaseUpdate(em, id, pos, tank, ai, flowField, sep, angleToPlayer, dt, speedFactor);
      if (ai.fireOnMove && dist < ai.fireRange * DISENGAGE_MULTIPLIER) {
        aimTankAtPlayer(tank, ai, angleToPlayer);
        tryFire(em, id, pool, eventBus);
      }
    } else if (ai.state === AIState.ENGAGE) {
      tankEngageUpdate(em, id, pos, tank, ai, playerPos, sep, angleToPlayer, dist, dt, speedFactor);
      ai.reactionTimer -= dt;
      if (ai.reactionTimer <= 0) {
        aimTankAtPlayer(tank, ai, angleToPlayer);
        tryFire(em, id, pool, eventBus);
      }
    }
  }

  // ---- INFANTRY -------------------------------------------------------------
  const infantryIds = em.query('Position', INFANTRY_PARTS, AI_STATE, WEAPON);

  const infantryPositions = new Map<number, { x: number; y: number }>();
  for (const id of infantryIds) {
    const pos = em.getComponent(id, 'Position') as { x: number; y: number };
    if (pos) infantryPositions.set(id, pos);
  }

  // Combined positions for separation (infantry repel both infantry + tanks)
  const allEnemyPositions = new Map<number, { x: number; y: number }>([
    ...tankPositions, ...infantryPositions,
  ]);

  for (const id of infantryIds) {
    const pos    = infantryPositions.get(id);
    const inf    = em.getComponent(id, INFANTRY_PARTS) as unknown as InfantryPartsComponent;
    const ai     = em.getComponent(id, AI_STATE)       as unknown as AIComponent;
    const weapon = em.getComponent(id, WEAPON)         as unknown as WeaponComponent;
    if (!pos || !inf || !ai || !weapon) continue;

    weapon.cooldownRemaining = Math.max(0, weapon.cooldownRemaining - dt);

    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleToPlayer = Math.atan2(dx, -dy);

    tickFSM(ai, dist);
    const sep = separationVector(id, pos, allEnemyPositions);
    const health = em.getComponent(id, 'Health') as HealthComponent | undefined;
    const speedFactor = getInfantrySpeedFactor(health ? health.current / health.max : 1);

    if (ai.state === AIState.CHASE) {
      infantryChaseUpdate(em, id, pos, inf, ai, flowField, sep, angleToPlayer, dt, speedFactor);
      if (ai.fireOnMove && dist < ai.fireRange * DISENGAGE_MULTIPLIER) {
        inf.facingAngle = angleToPlayer + aimSpread(ai);
        tryFireInfantry(em, id, pool, eventBus);
      }
    } else if (ai.state === AIState.ENGAGE) {
      infantryEngageUpdate(em, id, pos, inf, ai, playerPos, sep, angleToPlayer, dist, dt, speedFactor);
      ai.reactionTimer -= dt;
      if (ai.reactionTimer <= 0) {
        inf.facingAngle = angleToPlayer + aimSpread(ai);
        tryFireInfantry(em, id, pool, eventBus);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Shared FSM tick
// ---------------------------------------------------------------------------

function tickFSM(ai: AIComponent, dist: number): void {
  switch (ai.state) {
    case AIState.IDLE:
      ai.state = AIState.CHASE;
      break;
    case AIState.CHASE:
      if (dist < ai.fireRange) ai.state = AIState.ENGAGE;
      break;
    case AIState.ENGAGE:
      if (dist > ai.fireRange * DISENGAGE_MULTIPLIER) ai.state = AIState.CHASE;
      break;
  }
}

// ---------------------------------------------------------------------------
// Separation steering (shared)
// ---------------------------------------------------------------------------

function separationVector(
  id: number,
  pos: { x: number; y: number },
  positions: Map<number, { x: number; y: number }>,
): { x: number; y: number } {
  let sx = 0; let sy = 0;
  const rSq = SEPARATION_CONFIG.radius * SEPARATION_CONFIG.radius;
  for (const [otherId, otherPos] of positions) {
    if (otherId === id) continue;
    const ex = pos.x - otherPos.x;
    const ey = pos.y - otherPos.y;
    const dSq = ex * ex + ey * ey;
    if (dSq > 0 && dSq < rSq) {
      const inv = 1 / Math.sqrt(dSq);
      sx += ex * inv;
      sy += ey * inv;
    }
  }
  const len = Math.sqrt(sx * sx + sy * sy);
  return len > 0 ? { x: sx / len, y: sy / len } : { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// TANK movement helpers (unchanged from Phase 4.5)
// ---------------------------------------------------------------------------

function tankChaseUpdate(
  em: EntityManager,
  id: number,
  pos: { x: number; y: number },
  tank: TankPartsComponent,
  ai: AIComponent,
  flowField: FlowField,
  sep: { x: number; y: number },
  angleToPlayer: number,
  dt: number,
  speedFactor: number,
): void {
  const tileR = Math.floor(pos.y / MAP_CONFIG.tileSize);
  const tileC = Math.floor(pos.x / MAP_CONFIG.tileSize);
  const dir = flowField.getDirection(tileR, tileC);

  let moveX = 0; let moveY = 0;
  if (dir) {
    if (ai.chaseOffsetAngle !== 0) {
      const off = ai.chaseOffsetAngle * ai.strafeSign;
      const cos = Math.cos(off); const sin = Math.sin(off);
      moveX = dir.dx * cos - dir.dy * sin;
      moveY = dir.dx * sin + dir.dy * cos;
    } else {
      moveX = dir.dx; moveY = dir.dy;
    }
    moveX += sep.x * SEPARATION_CONFIG.weight;
    moveY += sep.y * SEPARATION_CONFIG.weight;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) { moveX /= len; moveY /= len; }

    const targetAngle = Math.atan2(moveX, -moveY);
    tank.hullAngle = lerpAngle(tank.hullAngle, targetAngle, tank.turnRate * dt);
    tank.speed = Math.min(tank.speed + tank.acceleration * dt, tank.maxForwardSpeed * speedFactor);
  } else {
    tank.speed = Math.max(0, tank.speed - tank.deceleration * dt);
  }

  ai.retargetTimer -= dt;
  if (ai.retargetTimer <= 0) {
    ai.retargetTimer = 0.3;
    tank.turretAngle = angleToPlayer;
  }

  const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number };
  if (vel) {
    vel.vx = Math.sin(tank.hullAngle) * tank.speed;
    vel.vy = -Math.cos(tank.hullAngle) * tank.speed;
  }
  tank.trackOffset = ((tank.trackOffset + tank.speed * dt) % tank.trackHeight + tank.trackHeight) % tank.trackHeight;
}

function tankEngageUpdate(
  em: EntityManager,
  id: number,
  pos: { x: number; y: number },
  tank: TankPartsComponent,
  ai: AIComponent,
  playerPos: { x: number; y: number },
  sep: { x: number; y: number },
  angleToPlayer: number,
  dist: number,
  dt: number,
  speedFactor: number,
): void {
  const targetSpeed = tank.maxForwardSpeed * ai.engageSpeedFraction * speedFactor;

  if (ai.engageStrafeRate > 0) {
    const tangentAngle = angleToPlayer + (Math.PI / 2) * ai.strafeSign;
    let radialX = 0; let radialY = 0;
    const rangeDiff = dist - ai.preferredRange;
    if (Math.abs(rangeDiff) > ai.preferredRange * 0.1) {
      const sign = rangeDiff > 0 ? 1 : -1;
      radialX = Math.sin(angleToPlayer) * sign;
      radialY = -Math.cos(angleToPlayer) * sign;
    }
    let moveX = Math.sin(tangentAngle) + radialX * 0.5 + sep.x * SEPARATION_CONFIG.weight;
    let moveY = -Math.cos(tangentAngle) + radialY * 0.5 + sep.y * SEPARATION_CONFIG.weight;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) { moveX /= len; moveY /= len; }
    tank.hullAngle = lerpAngle(tank.hullAngle, Math.atan2(moveX, -moveY), ai.engageStrafeRate * dt);
    tank.speed = Math.min(tank.speed + tank.acceleration * dt, targetSpeed);
  } else if (targetSpeed > 0) {
    let moveX = Math.sin(angleToPlayer) + sep.x * SEPARATION_CONFIG.weight;
    let moveY = -Math.cos(angleToPlayer) + sep.y * SEPARATION_CONFIG.weight;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) { moveX /= len; moveY /= len; }
    tank.hullAngle = lerpAngle(tank.hullAngle, Math.atan2(moveX, -moveY), tank.turnRate * dt);
    tank.speed = Math.min(tank.speed + tank.acceleration * dt, targetSpeed);
  } else {
    tank.speed = Math.max(0, tank.speed - tank.deceleration * dt);
  }

  const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number };
  if (vel) {
    vel.vx = Math.sin(tank.hullAngle) * tank.speed;
    vel.vy = -Math.cos(tank.hullAngle) * tank.speed;
  }
  tank.trackOffset = ((tank.trackOffset + tank.speed * dt) % tank.trackHeight + tank.trackHeight) % tank.trackHeight;
}

function aimTankAtPlayer(tank: TankPartsComponent, ai: AIComponent, angleToPlayer: number): void {
  tank.turretAngle = angleToPlayer + aimSpread(ai);
}

// ---------------------------------------------------------------------------
// INFANTRY movement helpers
// ---------------------------------------------------------------------------

function infantryChaseUpdate(
  em: EntityManager,
  id: number,
  pos: { x: number; y: number },
  inf: InfantryPartsComponent,
  ai: AIComponent,
  flowField: FlowField,
  sep: { x: number; y: number },
  angleToPlayer: number,
  dt: number,
  speedFactor: number,
): void {
  let moveX = 0; let moveY = 0;

  // Squad formation: steer toward formation slot behind lead tank
  if (ai.squadLeadId !== undefined) {
    const leadPos  = em.getComponent(ai.squadLeadId, 'Position') as { x: number; y: number } | undefined;
    const leadTank = em.getComponent(ai.squadLeadId, TANK_PARTS) as TankPartsComponent | undefined;
    if (leadPos && leadTank) {
      // Rotate local-space formation offset by lead's hull angle
      const ha  = leadTank.hullAngle;
      const cos = Math.cos(ha); const sin = Math.sin(ha);
      const worldDx = ai.formationDx * cos - ai.formationDy * sin;
      const worldDy = ai.formationDx * sin + ai.formationDy * cos;
      const slotX = leadPos.x + worldDx;
      const slotY = leadPos.y + worldDy;
      const toSlotX = slotX - pos.x;
      const toSlotY = slotY - pos.y;
      const distToSlot = Math.hypot(toSlotX, toSlotY);

      if (distToSlot > SQUAD_STEERING.slotReachRadius) {
        moveX = toSlotX / distToSlot;
        moveY = toSlotY / distToSlot;
      }
      // else: already at slot, idle
    } else {
      // Lead is dead — break formation
      ai.squadLeadId = undefined;
    }
  }

  // Fall back to flow field if not in formation (or no squad)
  if (moveX === 0 && moveY === 0) {
    const tileR = Math.floor(pos.y / MAP_CONFIG.tileSize);
    const tileC = Math.floor(pos.x / MAP_CONFIG.tileSize);
    const dir = flowField.getDirection(tileR, tileC);
    if (dir) { moveX = dir.dx; moveY = dir.dy; }
  }

  // Blend separation
  moveX += sep.x * SEPARATION_CONFIG.weight;
  moveY += sep.y * SEPARATION_CONFIG.weight;
  const len = Math.sqrt(moveX * moveX + moveY * moveY);
  if (len > 0) { moveX /= len; moveY /= len; }

  const speed = inf.maxSpeed * speedFactor;
  const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
  if (vel) {
    vel.vx = moveX * speed;
    vel.vy = moveY * speed;
    // Face movement direction when moving
    if (speed > 0) inf.facingAngle = Math.atan2(vel.vx, -vel.vy);
  }
  inf.speed = speed * (len > 0 ? 1 : 0);
}

function infantryEngageUpdate(
  em: EntityManager,
  id: number,
  pos: { x: number; y: number },
  inf: InfantryPartsComponent,
  ai: AIComponent,
  playerPos: { x: number; y: number },
  sep: { x: number; y: number },
  angleToPlayer: number,
  dist: number,
  dt: number,
  speedFactor: number,
): void {
  // Formation breaks during ENGAGE — infantry fights independently
  const targetSpeed = inf.maxSpeed * ai.engageSpeedFraction * speedFactor;

  // Always face the player when engaging
  inf.facingAngle = angleToPlayer;

  if (ai.engageStrafeRate > 0) {
    // Orbit + maintain preferred range
    const tangentAngle = angleToPlayer + (Math.PI / 2) * ai.strafeSign;
    let radialX = 0; let radialY = 0;
    const rangeDiff = dist - ai.preferredRange;
    if (Math.abs(rangeDiff) > ai.preferredRange * 0.1) {
      const sign = rangeDiff > 0 ? 1 : -1;
      radialX = Math.sin(angleToPlayer) * sign;
      radialY = -Math.cos(angleToPlayer) * sign;
    }
    let moveX = Math.sin(tangentAngle) + radialX * 0.5 + sep.x * SEPARATION_CONFIG.weight;
    let moveY = -Math.cos(tangentAngle) + radialY * 0.5 + sep.y * SEPARATION_CONFIG.weight;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) { moveX /= len; moveY /= len; }
    const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    if (vel) { vel.vx = moveX * targetSpeed; vel.vy = moveY * targetSpeed; }
    inf.speed = targetSpeed;
  } else if (targetSpeed > 0) {
    // Charge toward player
    let moveX = Math.sin(angleToPlayer) + sep.x * SEPARATION_CONFIG.weight;
    let moveY = -Math.cos(angleToPlayer) + sep.y * SEPARATION_CONFIG.weight;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) { moveX /= len; moveY /= len; }
    const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    if (vel) { vel.vx = moveX * targetSpeed; vel.vy = moveY * targetSpeed; }
    inf.speed = targetSpeed;
  } else {
    // Stop (sniper/grunt)
    const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    if (vel) { vel.vx = 0; vel.vy = 0; }
    inf.speed = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function aimSpread(ai: AIComponent): number {
  const spread = ai.maxSpread * (1 - ai.accuracy);
  return (Math.random() * 2 - 1) * spread;
}

function lerpAngle(from: number, to: number, maxStep: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}
