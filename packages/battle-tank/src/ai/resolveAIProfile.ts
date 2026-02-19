import type { AIRole } from '../components/AI.js';
import type { AIBehaviorProfile, DifficultyLevel } from '../config/AIConfig.js';
import {
  AI_PROFILES,
  DIFFICULTY_MODIFIERS,
  WAVE_SCALING,
  INSTANCE_VARIANCE,
} from '../config/AIConfig.js';

/**
 * Resolve final AI behavior values for a specific enemy spawn.
 *
 * Pipeline: base profile × difficulty × wave scaling ± instance variance.
 * Called once at spawn time — result is written into AIComponent fields.
 */
export function resolveAIProfile(
  role: AIRole,
  difficulty: DifficultyLevel,
  waveIndex: number,
): AIBehaviorProfile {
  const base = AI_PROFILES[role];
  const mods = DIFFICULTY_MODIFIERS[difficulty];

  // Start from base, apply difficulty multipliers
  const resolved: AIBehaviorProfile = {
    fireRange: base.fireRange,
    preferredRange: base.preferredRange,
    accuracy: clamp01(base.accuracy * mods.accuracy + WAVE_SCALING.accuracyPerWave * waveIndex),
    maxSpread: base.maxSpread,
    reactionTime: Math.max(0.05, base.reactionTime * mods.reactionTime + WAVE_SCALING.reactionTimePerWave * waveIndex),
    retargetInterval: base.retargetInterval,
    engageSpeedFraction: clamp01(base.engageSpeedFraction * mods.engageSpeedFraction),
    engageStrafeRate: base.engageStrafeRate,
    chaseOffsetAngle: base.chaseOffsetAngle,
    fireOnMove: base.fireOnMove,
  };

  // Per-instance randomization — ±range on numeric fields
  const v = INSTANCE_VARIANCE.range;
  resolved.fireRange *= variance(v);
  resolved.preferredRange *= variance(v);
  resolved.accuracy = clamp01(resolved.accuracy * variance(v));
  resolved.maxSpread *= variance(v);
  resolved.reactionTime = Math.max(0.05, resolved.reactionTime * variance(v));
  resolved.retargetInterval = Math.max(0.05, resolved.retargetInterval * variance(v));
  resolved.engageSpeedFraction = clamp01(resolved.engageSpeedFraction * variance(v));
  resolved.engageStrafeRate *= variance(v);

  return resolved;
}

/** Random multiplier in [1 - range, 1 + range]. */
function variance(range: number): number {
  return 1 + (Math.random() * 2 - 1) * range;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
