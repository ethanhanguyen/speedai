import type { EntityManager, ComponentData } from '@speedai/game-engine';
import { ComponentFactory } from '@speedai/game-engine';
import type { InfantryDef } from '../config/InfantryConfig.js';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';
import type { InfantryPartsComponent } from '../components/InfantryParts.js';
import { WEAPON } from '../components/Weapon.js';
import type { WeaponComponent } from '../components/Weapon.js';
import { WEAPON_REGISTRY } from '../config/WeaponConfig.js';

/**
 * Create an infantry entity: Position + Velocity + InfantryParts + Weapon + Health + Tag.
 * Returns entity ID. Mirrors createTank() signature for uniform wave spawner integration.
 */
export function createInfantry(
  em: EntityManager,
  x: number,
  y: number,
  def: InfantryDef,
  tags: string[],
): number {
  const weaponDef = WEAPON_REGISTRY[def.weaponId];
  if (!weaponDef) throw new Error(`Unknown infantry weapon id: ${def.weaponId}`);

  const id = em.create();

  em.addComponent(id, 'Position', ComponentFactory.position(x, y) as unknown as ComponentData);
  em.addComponent(id, 'Velocity', ComponentFactory.velocity(0, 0) as unknown as ComponentData);

  const parts: InfantryPartsComponent = {
    soldierVariant: def.soldierVariant,
    animState: 'idle',
    frameIndex: 0,
    frameElapsed: 0,
    facingAngle: 0,
    speed: 0,
    maxSpeed: def.maxSpeed,
    collisionRadius: def.collisionRadius,
    muzzleOffsetPx: def.muzzleOffsetPx,
    hitFlashElapsed: 0,
    hitFlashDuration: 0,
    hitFlashColor: '',
    shotFlashElapsed: 0,
    shotFlashDuration: 0,
  };
  em.addComponent(id, INFANTRY_PARTS, parts as unknown as ComponentData);

  const weapon: WeaponComponent = {
    def: weaponDef,
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

  return id;
}
