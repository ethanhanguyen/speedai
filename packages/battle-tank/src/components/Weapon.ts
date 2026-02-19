import type { WeaponDef } from '../config/WeaponConfig.js';

export const WEAPON = 'Weapon';

export interface WeaponComponent {
  def: WeaponDef;
  cooldownRemaining: number; // seconds until next fire allowed
  chargeElapsed: number;     // ms accumulated while holding (charge weapons)
  isCharging: boolean;       // true while mouse held for charge weapon
  shotCount: number;         // cumulative shots fired (for tracerEvery logic)
  // Laser continuous-mode heat state
  heatCurrent: number;       // 0 = cold, heatCapacity = overheated
  isOverheated: boolean;     // true during forced lockout period
  overheatElapsed: number;   // seconds since overheat triggered
  laserFiring: boolean;      // true while laser beam is active this frame
}
