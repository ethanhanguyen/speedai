import type { BombType } from '../config/BombConfig.js';

export const BOMB = 'Bomb';

export type BombState = 'arming' | 'armed' | 'detonating';

export interface BombComponent {
  type: BombType;
  state: BombState;
  elapsedMs: number;  // ms accumulated in current state
  ownerId: number;
  detonated: boolean; // guard: prevent double chain detonation
}
