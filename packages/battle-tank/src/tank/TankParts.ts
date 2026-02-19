/** Custom component type name for EntityManager. */
export const TANK_PARTS = 'TankParts';

/** Runtime state + visual config for a composite tank entity. */
export interface TankPartsComponent {
  // Visual keys (for asset lookup)
  hullKey: string;
  trackKey: string;
  turretKey: string;

  // Visual dimensions (px); hullWidth derived at render time from sprite natural aspect ratio
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
  trackOffset: number;    // accumulated scroll offset (px), wraps at trackHeight

  // Movement params (copied from TankDef at creation, read-only by convention)
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  deceleration: number;
  turnRate: number;
  turretTurnRate: number;   // rad/s — max turret rotation speed

  // Collision
  collisionRadius: number;

  // Recoil — spring-damper barrel kick on fire
  recoilOffset: number;    // current offset in px along barrel axis (0 = rest)
  recoilVelocity: number;  // px/s (positive = recoiling away from muzzle)

  // Hit flash — brief color overlay when taking damage
  hitFlashElapsed: number;  // seconds since last hit (resets on each hit)
  hitFlashDuration: number; // total duration of the flash (from CombatConfig.hitFlash)
  hitFlashColor: string;    // rgba color string; '' = no flash active

  // Shield — temporary damage reduction from 'shield' item pickup
  shieldElapsed: number;   // seconds since shield was activated (0 = inactive)
  shieldDuration: number;  // total shield duration in seconds (0 = inactive)

  // Weapon-switch fade — alpha driven by WeaponSystem during stow/draw phases
  turretAlpha: number;     // 0..1; 1 = fully visible (normal); managed by WeaponSystem

  // Weapon-switch pivot sweep — additive angular offset from aim angle
  // 0 = on target; non-zero during stow (sweeps away) and draw (returns to aim)
  turretSwitchAngle: number; // radians
}
