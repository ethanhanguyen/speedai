import type { WeaponDef } from '../config/WeaponConfig.js';

export const PROJECTILE = 'Projectile';

export interface ProjectileComponent {
  weaponDef: WeaponDef;
  ownerId: number;
  elapsed: number;            // seconds since spawn
  distanceTraveled: number;   // world px traveled since spawn (for maxRangePx enforcement)
  lifetimeOverride?: number;  // overrides weaponDef.projectileLifetime (splash dynamic range)
  bouncesRemaining: number;   // 0 = no bounce; initialized from behavior.bouncesMax
  piercesRemaining: number;   // 0 = no pierce; initialized from behavior.piercesMax
  hitEntities: Set<number>;   // prevent re-hitting same entity after pierce
  splashTarget?: { x: number; y: number }; // howitzer landing position (for indicator)
  trailAccumulatedMs: number; // ms since last trail particle burst (for trailConfig)
}
