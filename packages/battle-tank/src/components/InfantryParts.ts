import type { InfantryAnimState } from '../config/InfantryConfig.js';

/** Custom component type name for EntityManager. */
export const INFANTRY_PARTS = 'InfantryParts';

/** Runtime state + visual config for an infantry entity. */
export interface InfantryPartsComponent {
  soldierVariant: 1 | 2 | 3;

  // Animation state machine
  animState: InfantryAnimState;
  frameIndex: number;
  frameElapsed: number;    // seconds elapsed since last frame advance

  // Movement (omnidirectional — no hull/turret split)
  facingAngle: number;     // radians, 0 = up (north), positive = clockwise; same convention as tanks
  speed: number;           // current scalar speed px/s

  // Movement params (from InfantryDef, read-only by convention)
  maxSpeed: number;
  collisionRadius: number;
  muzzleOffsetPx: number;  // fire origin distance from center along facingAngle

  // Hit flash — brief color overlay when taking damage
  hitFlashElapsed: number;
  hitFlashDuration: number;
  hitFlashColor: string;   // rgba color; '' = no flash active

  // Shot feedback — drives 'shot' → 'reload' anim sequence after firing
  shotFlashElapsed: number;  // countdown; > 0 = currently in shot/reload animation
  shotFlashDuration: number; // total duration (shot anim + reload anim)
}
