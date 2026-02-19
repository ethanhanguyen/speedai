import type { TankPartsComponent } from './TankParts.js';

export interface WorldPoint {
  x: number;
  y: number;
}

/**
 * Get the world position of the turret muzzle tip.
 * Turret pivotY is fraction from top — muzzle distance = turretHeight * turretPivotY.
 */
export function getTurretTip(
  pos: { x: number; y: number },
  tank: TankPartsComponent,
): WorldPoint {
  const muzzleDistance = tank.turretHeight * tank.turretPivotY;
  return {
    x: pos.x + Math.sin(tank.turretAngle) * muzzleDistance,
    y: pos.y - Math.cos(tank.turretAngle) * muzzleDistance,
  };
}
