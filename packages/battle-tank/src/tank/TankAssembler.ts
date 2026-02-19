import type { EntityManager, ComponentData } from '@speedai/game-engine';
import { ComponentFactory } from '@speedai/game-engine';
import type { TankDef } from '../config/TankConfig.js';
import { TANK_PARTS } from './TankParts.js';
import type { TankPartsComponent } from './TankParts.js';
import { WEAPON } from '../components/Weapon.js';
import type { WeaponComponent } from '../components/Weapon.js';
import { ARMOR_KIT } from '../components/ArmorKit.js';
import type { ArmorKitComponent } from '../components/ArmorKit.js';

/**
 * Create a composite tank entity: Position + Velocity + TankParts + Weapon + Health + Tag.
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
    trackOffset: 0,
    maxForwardSpeed: def.movement.maxForwardSpeed,
    maxReverseSpeed: def.movement.maxReverseSpeed,
    acceleration: def.movement.acceleration,
    deceleration: def.movement.deceleration,
    turnRate: def.movement.turnRate,
    turretTurnRate: def.movement.turretTurnRate,
    collisionRadius: def.collisionRadius,
    recoilOffset: 0,
    recoilVelocity: 0,
    hitFlashElapsed: 0,
    hitFlashDuration: 0,
    hitFlashColor: '',
    shieldElapsed: 0,
    shieldDuration: 0,
  };

  em.addComponent(id, TANK_PARTS, parts as unknown as ComponentData);

  const weapon: WeaponComponent = {
    def: def.weapon,
    cooldownRemaining: 0,
    chargeElapsed: 0,
    isCharging: false,
    shotCount: 0,
    heatCurrent: 0,
    isOverheated: false,
    overheatElapsed: 0,
    laserFiring: false,
  };
  em.addComponent(id, WEAPON, weapon as unknown as ComponentData);

  em.addComponent(id, 'Health', ComponentFactory.health(def.maxHP) as unknown as ComponentData);
  em.addComponent(id, 'Tag', new Set(tags) as unknown as ComponentData);

  if (def.armorKit && def.armorKit !== 'none') {
    const armor: ArmorKitComponent = { kitId: def.armorKit };
    em.addComponent(id, ARMOR_KIT, armor as unknown as ComponentData);
  }

  return id;
}
