import { TIMED_BUFF_DEFS, type BuffStat, type TimedBuffDef } from '../config/BuffConfig.js';
import type { DropItemType } from '../config/DropConfig.js';

// ---------------------------------------------------------------------------
// Active effect instance
// ---------------------------------------------------------------------------

export interface ActiveEffect {
  type: DropItemType;
  remainingS: number;
  durationS: number;
  magnitude: number;
  stat: BuffStat;
  iconKey: string;
  polarity: 'buff' | 'debuff';
}

// ---------------------------------------------------------------------------
// BuffSystem — tracks active timed effects for the player
// ---------------------------------------------------------------------------

/**
 * Player-only system. Tracks active timed buff/debuff effects.
 * Consumers call `getModifier(stat)` to get the combined multiplier.
 */
export class BuffSystem {
  private effects: ActiveEffect[] = [];

  /** Apply a timed effect. If already active and stacking='refresh', resets timer. */
  applyEffect(itemType: DropItemType): void {
    const def: TimedBuffDef | undefined = TIMED_BUFF_DEFS[itemType];
    if (!def) return;

    const existing = this.effects.find(e => e.type === itemType);
    if (existing) {
      if (def.stacking === 'refresh') {
        existing.remainingS = def.durationS;
        existing.magnitude = def.magnitude;
      }
      // 'ignore' → do nothing
      return;
    }

    this.effects.push({
      type: itemType,
      remainingS: def.durationS,
      durationS: def.durationS,
      magnitude: def.magnitude,
      stat: def.stat,
      iconKey: def.iconKey,
      polarity: def.polarity,
    });
  }

  /** Tick all active effects; remove expired ones. */
  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].remainingS -= dt;
      if (this.effects[i].remainingS <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  /**
   * Returns combined multiplier for a stat.
   * Multiple effects on the same stat are multiplied together.
   * Returns 1.0 if no effects modify this stat.
   */
  getModifier(stat: BuffStat): number {
    let result = 1;
    for (const eff of this.effects) {
      if (eff.stat === stat) result *= eff.magnitude;
    }
    return result;
  }

  /** Check if a specific effect type is currently active. */
  isActive(itemType: DropItemType): boolean {
    return this.effects.some(e => e.type === itemType);
  }

  /** Snapshot of active effects for HUD rendering. */
  getActiveEffects(): readonly ActiveEffect[] {
    return this.effects;
  }

  reset(): void {
    this.effects.length = 0;
  }
}
