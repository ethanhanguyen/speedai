/** State passed to HudRenderer each frame. */
export interface GameHUDState {
  hp: { current: number; max: number };
  coins: number;
  kills: number;
  wave: number;
  waveState: WaveState;
  chargeRatio?: number;    // 0–1 for railgun charge bar (undefined = no charge weapon)
  heatRatio?: number;      // 0–1 for laser heat bar (undefined = no laser equipped)
  weaponName?: string;     // current weapon display name
  activeBombType?: string; // current bomb type label
  switchProgress?: {       // defined while switching weapons
    ratio: number;         // 0–1 progress through current phase
    phase: 'stowing' | 'drawing';
    pendingName: string;   // name of weapon being switched to
  };
  activeEffects?: readonly import('../systems/BuffSystem.js').ActiveEffect[];
}

export type WaveState = 'idle' | 'pre_wave' | 'spawning' | 'active' | 'complete';

export type ScenePhase = 'playing' | 'game_over_transition' | 'done';

/** Difficulty selection — shared across scenes via module-level state. */
export type { DifficultyLevel } from './AIConfig.js';

/** Stats passed to GameOverScene. */
export interface GameOverStats {
  kills: number;
  coins: number;
  wave: number;
  won: boolean;
}
