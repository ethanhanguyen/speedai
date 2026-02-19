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

// ---------------------------------------------------------------------------
// Phase 5.4 — Armor Deflection: zone multipliers + angle-of-incidence ricochet
// ---------------------------------------------------------------------------

/** Damage multipliers per hull zone (where the shell lands relative to facing). */
export interface ArmorZoneDef {
  /** ±degrees from hull nose counted outward from center: hits within = front zone. */
  frontArcDeg: number;
  /** ±degrees from hull tail: hits within = rear zone; remainder = side. */
  rearArcDeg:  number;
  frontMult:   number;  // < 1.0 — front is hardest
  sideMult:    number;
  rearMult:    number;  // > 1.0 — rear is softest
}

/** Ricochet/overmatch rules: when a kinetic round glances off instead of penetrating. */
export interface DeflectionDef {
  /** Incidence angle (degrees) above which ricochet triggers (0°=head-on, 90°=glancing). */
  ricochetAngleDeg: number;
  /** Base weapon damage above this bypasses all deflection (overmatch). */
  overmatchDamage:  number;
  /** AP rounds auto-normalize this many degrees of incidence angle (reduces chance). */
  normalizationDeg: number;
}

export interface ArmorKitDef {
  zones:      ArmorZoneDef;
  deflection: DeflectionDef;
}

/**
 * Per-kit zone multipliers + deflection rules.
 * Applied on top of ARMOR_TABLE: finalDamage = base × ARMOR_TABLE[kit][type] × zoneMult.
 * Ricochet check happens before any multiplication (zero damage if triggered).
 */
export const ARMOR_KIT_DEFS: Record<ArmorKitId, ArmorKitDef> = {
  none: {
    zones:      { frontArcDeg: 45, rearArcDeg: 40, frontMult: 0.90, sideMult: 1.00, rearMult: 1.20 },
    deflection: { ricochetAngleDeg: 72, overmatchDamage: 60, normalizationDeg: 3 },
  },
  reactive: {
    zones:      { frontArcDeg: 45, rearArcDeg: 40, frontMult: 0.80, sideMult: 1.00, rearMult: 1.30 },
    deflection: { ricochetAngleDeg: 70, overmatchDamage: 65, normalizationDeg: 3 },
  },
  composite: {
    zones:      { frontArcDeg: 50, rearArcDeg: 35, frontMult: 0.70, sideMult: 0.85, rearMult: 1.10 },
    deflection: { ricochetAngleDeg: 65, overmatchDamage: 70, normalizationDeg: 5 },
  },
  cage: {
    zones:      { frontArcDeg: 45, rearArcDeg: 40, frontMult: 0.85, sideMult: 0.95, rearMult: 1.20 },
    deflection: { ricochetAngleDeg: 68, overmatchDamage: 50, normalizationDeg: 2 },
  },
};
