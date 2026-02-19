export type DamageType = 'kinetic' | 'explosive' | 'energy';

export type ArmorKitId = 'none' | 'reactive' | 'composite' | 'cage';

/**
 * Damage multiplier per armorKit × damageType.
 * 1.0 = full damage, 0.4 = 60% reduction, 1.3 = 30% vulnerability.
 */
export const ARMOR_TABLE: Record<ArmorKitId, Record<DamageType, number>> = {
  none:      { kinetic: 1.0, explosive: 1.0,  energy: 1.0 },
  // Reactive plates detonate incoming explosive, bad vs kinetic railgun
  reactive:  { kinetic: 1.0, explosive: 0.4,  energy: 0.9 },
  // Ceramic composite absorbs all types partially
  composite: { kinetic: 0.6, explosive: 0.7,  energy: 0.8 },
  // Spaced cage defeats shaped charges (explosive), useless vs energy
  cage:      { kinetic: 0.9, explosive: 0.3,  energy: 1.1 },
};
