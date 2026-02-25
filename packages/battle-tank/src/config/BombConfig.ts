import type { ExplosionType } from './CombatConfig.js';

export type BombType = 'proximity' | 'timed' | 'remote';

export interface BombDef {
  type: BombType;
  damage: number;
  splashRadiusPx: number;
  armMs: number;           // ms before bomb arms after placement
  fuseMs?: number;         // ms until auto-detonate (timed only)
  chainRadiusPx?: number;  // px — propagates to other armed bombs in radius (remote only)
  triggerRadiusPx?: number; // px — proximity trigger distance (proximity only)
  explosionType?: ExplosionType; // bomb/laser/plasma/nuclear; defaults to 'bomb'
}

export const BOMB_DEFS: Record<BombType, BombDef> = {
  proximity: {
    type: 'proximity',
    damage: 80,
    splashRadiusPx: 100,
    armMs: 1000,
    triggerRadiusPx: 60,
  },
  timed: {
    type: 'timed',
    damage: 100,
    splashRadiusPx: 120,
    armMs: 500,
    fuseMs: 3000,
  },
  remote: {
    type: 'remote',
    damage: 90,
    splashRadiusPx: 110,
    armMs: 200,
    chainRadiusPx: 150,
  },
};

/** Display size of placed bomb entity (px). */
export const BOMB_DISPLAY_SIZE = 16;

/** Key to place current bomb type. */
export const BOMB_PLACE_KEY = 'KeyB';

/** Keys to cycle bomb types (prev/next). */
export const BOMB_CYCLE_KEYS = { prev: 'BracketLeft', next: 'BracketRight' };
