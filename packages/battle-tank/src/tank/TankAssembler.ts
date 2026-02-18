import type { EntityManager, ComponentData } from '@speedai/game-engine';
import { ComponentFactory } from '@speedai/game-engine';
import type { TankDef } from '../config/TankConfig.js';
import { TANK_PARTS } from './TankParts.js';
import type { TankPartsComponent } from './TankParts.js';

/**
 * Create a composite tank entity: Position + Velocity + TankParts + Tag.
 * Returns entity ID. Reusable for player and enemies (different TankDef + tags).
 */
export function createTank(
  em: EntityManager,
  x: number,
  y: number,
  def: TankDef,
  tags: string[],
): number {
  const id = em.create();

  em.addComponent(id, 'Position', ComponentFactory.position(x, y) as unknown as ComponentData);
  em.addComponent(id, 'Velocity', ComponentFactory.velocity(0, 0) as unknown as ComponentData);

  const parts: TankPartsComponent = {
    hullKey: def.hull.spriteKey,
    trackKey: def.tracks.spriteKey,
    turretKey: def.turret.spriteKey,
    hullWidth: def.hull.width,
    hullHeight: def.hull.height,
    trackWidth: def.tracks.width,
    trackHeight: def.tracks.height,
    trackSpacing: def.tracks.spacing,
    turretWidth: def.turret.width,
    turretHeight: def.turret.height,
    turretPivotY: def.turret.pivotY,
    hullAngle: 0,
    turretAngle: 0,
    speed: 0,
    maxForwardSpeed: def.movement.maxForwardSpeed,
    maxReverseSpeed: def.movement.maxReverseSpeed,
    acceleration: def.movement.acceleration,
    deceleration: def.movement.deceleration,
    turnRate: def.movement.turnRate,
    collisionRadius: def.collisionRadius,
  };

  em.addComponent(id, TANK_PARTS, parts as unknown as ComponentData);
  em.addComponent(id, 'Tag', new Set(tags) as unknown as ComponentData);

  return id;
}
