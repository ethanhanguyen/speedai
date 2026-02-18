/** Custom component type name for EntityManager. */
export const TANK_PARTS = 'TankParts';

/** Runtime state + visual config for a composite tank entity. */
export interface TankPartsComponent {
  // Visual keys (for asset lookup)
  hullKey: string;
  trackKey: string;
  turretKey: string;

  // Visual dimensions (px)
  hullWidth: number;
  hullHeight: number;
  trackWidth: number;
  trackHeight: number;
  trackSpacing: number;   // distance from center to each track center
  turretWidth: number;
  turretHeight: number;
  turretPivotY: number;   // 0–1, pivot from top of turret sprite

  // State (mutated by systems)
  hullAngle: number;      // radians, 0 = up (north), positive = clockwise
  turretAngle: number;    // radians, same convention
  speed: number;          // current scalar speed (px/s), positive = forward

  // Movement params (copied from TankDef at creation, read-only by convention)
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  deceleration: number;
  turnRate: number;

  // Collision
  collisionRadius: number;
}
