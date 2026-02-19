import type { TankDef } from './TankConfig.js';
import type { AIRole } from '../components/AI.js';
import {
  GRUNT_TANK, FLANKER_TANK, SNIPER_TANK, RUSHER_TANK,
  HEAVY_GRUNT_TANK, ARMORED_SNIPER_TANK, CAGE_RUSHER_TANK,
} from './TankConfig.js';

// ---------------------------------------------------------------------------
// Wave enemy entries (individual, non-squad)
// ---------------------------------------------------------------------------

export interface WaveEnemy {
  tankDef: TankDef;
  role: AIRole;
  count: number;
}

// ---------------------------------------------------------------------------
// Wave entry
// ---------------------------------------------------------------------------

export interface WaveEntry {
  enemies: WaveEnemy[];
  spawnDelay: number;
}

// ---------------------------------------------------------------------------
// Wave table — 8 waves
// ---------------------------------------------------------------------------

export const WAVE_TABLE: WaveEntry[] = [
  // Wave 1 — grunts only (tutorial)
  {
    enemies: [{ tankDef: GRUNT_TANK, role: 'grunt', count: 3 }],
    spawnDelay: 1.0,
  },
  // Wave 2 — more grunts
  {
    enemies: [{ tankDef: GRUNT_TANK, role: 'grunt', count: 5 }],
    spawnDelay: 0.8,
  },
  // Wave 3 — introduce flankers
  {
    enemies: [
      { tankDef: GRUNT_TANK,   role: 'grunt',   count: 4 },
      { tankDef: FLANKER_TANK, role: 'flanker', count: 2 },
    ],
    spawnDelay: 0.7,
  },
  // Wave 4 — add snipers
  {
    enemies: [
      { tankDef: GRUNT_TANK,   role: 'grunt',   count: 3 },
      { tankDef: FLANKER_TANK, role: 'flanker', count: 2 },
      { tankDef: SNIPER_TANK,  role: 'sniper',  count: 2 },
    ],
    spawnDelay: 0.6,
  },
  // Wave 5 — rushers join
  {
    enemies: [
      { tankDef: GRUNT_TANK,   role: 'grunt',   count: 3 },
      { tankDef: FLANKER_TANK, role: 'flanker', count: 2 },
      { tankDef: RUSHER_TANK,  role: 'rusher',  count: 2 },
    ],
    spawnDelay: 0.6,
  },
  // Wave 6 — heavy grunts
  {
    enemies: [
      { tankDef: HEAVY_GRUNT_TANK, role: 'grunt',   count: 3 },
      { tankDef: FLANKER_TANK,     role: 'flanker', count: 2 },
      { tankDef: RUSHER_TANK,      role: 'rusher',  count: 2 },
    ],
    spawnDelay: 0.5,
  },
  // Wave 7 — armored variants
  {
    enemies: [
      { tankDef: HEAVY_GRUNT_TANK,    role: 'grunt',   count: 2 },
      { tankDef: ARMORED_SNIPER_TANK, role: 'sniper',  count: 2 },
      { tankDef: CAGE_RUSHER_TANK,    role: 'rusher',  count: 2 },
      { tankDef: FLANKER_TANK,        role: 'flanker', count: 2 },
    ],
    spawnDelay: 0.5,
  },
  // Wave 8 — elite mix
  {
    enemies: [
      { tankDef: HEAVY_GRUNT_TANK,    role: 'grunt',   count: 3 },
      { tankDef: ARMORED_SNIPER_TANK, role: 'sniper',  count: 2 },
      { tankDef: CAGE_RUSHER_TANK,    role: 'rusher',  count: 3 },
      { tankDef: FLANKER_TANK,        role: 'flanker', count: 2 },
    ],
    spawnDelay: 0.4,
  },
];

export const WAVE_CONFIG = {
  interWaveDelay: 3.0,       // seconds between waves
  spawnSafeRadius: 150,      // px — don't spawn within this distance of player
  spawnJitterFraction: 0.3,  // ±fraction of tileSize offset at spawn
};
