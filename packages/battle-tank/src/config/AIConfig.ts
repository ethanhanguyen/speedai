import type { AIRole } from '../components/AI.js';

// ---------------------------------------------------------------------------
// Behavior profile — template per role, resolved at spawn via resolveAIProfile
// ---------------------------------------------------------------------------

export interface AIBehaviorProfile {
  fireRange: number;            // px — CHASE→ENGAGE transition
  preferredRange: number;       // px — ideal distance to maintain in ENGAGE
  accuracy: number;             // 0–1 (higher = tighter aim)
  maxSpread: number;            // radians — max deviation at 0% accuracy
  reactionTime: number;         // seconds before first shot after entering ENGAGE
  retargetInterval: number;     // seconds between turret angle updates
  engageSpeedFraction: number;  // 0 = stop, 1 = full maxForwardSpeed
  engageStrafeRate: number;     // rad/s — orbit speed around player (0 = none)
  chaseOffsetAngle: number;     // radians — approach offset from direct path
  fireOnMove: boolean;          // can fire during CHASE state
}

export const AI_PROFILES: Record<AIRole, AIBehaviorProfile> = {
  grunt: {
    fireRange: 200,
    preferredRange: 180,
    accuracy: 0.4,
    maxSpread: Math.PI / 6,
    reactionTime: 0.5,
    retargetInterval: 0.3,
    engageSpeedFraction: 0,
    engageStrafeRate: 0,
    chaseOffsetAngle: 0,
    fireOnMove: false,
  },
  flanker: {
    fireRange: 180,
    preferredRange: 150,
    accuracy: 0.35,
    maxSpread: Math.PI / 5,
    reactionTime: 0.3,
    retargetInterval: 0.2,
    engageSpeedFraction: 0.6,
    engageStrafeRate: Math.PI * 0.5,   // 90 deg/s orbit
    chaseOffsetAngle: Math.PI / 4,     // 45° flank approach
    fireOnMove: true,
  },
  sniper: {
    fireRange: 350,
    preferredRange: 320,
    accuracy: 0.85,
    maxSpread: Math.PI / 12,
    reactionTime: 0.8,
    retargetInterval: 0.5,
    engageSpeedFraction: 0,
    engageStrafeRate: 0,
    chaseOffsetAngle: 0,
    fireOnMove: false,
  },
  rusher: {
    fireRange: 120,
    preferredRange: 60,
    accuracy: 0.25,
    maxSpread: Math.PI / 4,
    reactionTime: 0.15,
    retargetInterval: 0.15,
    engageSpeedFraction: 1.0,
    engageStrafeRate: 0,
    chaseOffsetAngle: 0,
    fireOnMove: true,
  },
};

// ---------------------------------------------------------------------------
// Difficulty scaling — multipliers applied to base profile at spawn
// ---------------------------------------------------------------------------

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export interface AIProfileMultipliers {
  accuracy: number;
  reactionTime: number;
  engageSpeedFraction: number;
  fireRate: number; // applied to weapon cooldown inverse
}

export const DIFFICULTY_MODIFIERS: Record<DifficultyLevel, AIProfileMultipliers> = {
  easy:   { accuracy: 0.7,  reactionTime: 1.4, engageSpeedFraction: 0.8, fireRate: 0.7 },
  normal: { accuracy: 1.0,  reactionTime: 1.0, engageSpeedFraction: 1.0, fireRate: 1.0 },
  hard:   { accuracy: 1.3,  reactionTime: 0.7, engageSpeedFraction: 1.2, fireRate: 1.3 },
};

// ---------------------------------------------------------------------------
// Wave-progressive scaling — additive per wave index (0-based)
// ---------------------------------------------------------------------------

export const WAVE_SCALING = {
  accuracyPerWave: 0.03,       // +3% accuracy each wave
  reactionTimePerWave: -0.04,  // 40 ms faster each wave
};

// ---------------------------------------------------------------------------
// Per-instance randomization — prevents synchronized behavior among same-role
// ---------------------------------------------------------------------------

export const INSTANCE_VARIANCE = {
  range: 0.15, // ±15% on numeric profile fields
};

// ---------------------------------------------------------------------------
// Separation steering — prevents clumping on shared flow field paths
// ---------------------------------------------------------------------------

export const SEPARATION_CONFIG = {
  radius: 50,    // px — check distance
  weight: 0.6,   // blend strength against flow direction
};

// ---------------------------------------------------------------------------
// Flow field
// ---------------------------------------------------------------------------

export const FLOW_FIELD_CONFIG = {
  recomputeThreshold: 2, // tiles moved before recompute
};

/** Hysteresis multiplier: enemy leaves ENGAGE when distance > fireRange * this. */
export const DISENGAGE_MULTIPLIER = 1.2;

// ---------------------------------------------------------------------------
// Squad formation — organized combined-arms movement
// ---------------------------------------------------------------------------

export const SQUAD_STEERING = {
  /** px — if infantry is within this distance of formation slot, steering is minimal */
  slotReachRadius: 20,
  /** How fast infantry accelerates toward formation slot (fraction of maxSpeed per second) */
  formationPullStrength: 2.5,
};
