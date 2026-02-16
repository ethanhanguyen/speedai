import type { BallColor, SpecialType } from '../components/BallData.js';
import { ALL_COLORS } from '../components/BallData.js';

export interface ObstaclePlacement {
  type: string;
  r: number;
  c: number;
  hp: number;
}

export type ObjectiveType = 'collect_color' | 'activate_special' | 'clear_obstacle' | 'score';

export interface ObjectiveDef {
  type: ObjectiveType;
  target: number;
  color?: BallColor;         // for collect_color
  specialType?: SpecialType;  // for activate_special
  obstacleType?: string;      // for clear_obstacle
}

export interface LevelDef {
  level: number;
  colors: BallColor[];
  moves: number;
  targetScore: number;
  obstacles?: ObstaclePlacement[];
  objectives?: ObjectiveDef[];
}

// ── Placement helpers ──
function ice(r: number, c: number): ObstaclePlacement { return { type: 'ice', r, c, hp: 1 }; }
function stone(r: number, c: number): ObstaclePlacement { return { type: 'stone', r, c, hp: 2 }; }

// ── Color palettes ──
const C4: BallColor[] = ['red', 'blue', 'green', 'yellow'];
const C5: BallColor[] = ['red', 'blue', 'green', 'yellow', 'purple'];
const C6: BallColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

/**
 * 20-level progression table.
 *
 * Phase 1 (1-3):   Tutorial — score only, 4 colors, generous moves
 * Phase 2 (4-6):   Color Objectives — collect_color introduced, 4-5 colors
 * Phase 3 (7-10):  Ice — ice obstacles + clear_obstacle objectives
 * Phase 4 (11-14): Stone — stone obstacles, column partitioning
 * Phase 5 (15-18): Combination — mixed obstacles + multi-objective
 * Phase 6 (19-20): Expert — dense obstacles, tight moves
 */
const LEVEL_TABLE: LevelDef[] = [
  // ── Phase 1: Tutorial (score only) ──
  { level: 1, colors: C4, moves: 30, targetScore: 1000 },
  { level: 2, colors: C4, moves: 28, targetScore: 1500 },
  { level: 3, colors: C4, moves: 28, targetScore: 2000 },

  // ── Phase 2: Color Objectives ──
  {
    level: 4, colors: C4, moves: 28, targetScore: 2500,
    objectives: [
      { type: 'collect_color', target: 15, color: 'red' },
      { type: 'score', target: 2500 },
    ],
  },
  {
    level: 5, colors: C5, moves: 26, targetScore: 3000,
    objectives: [
      { type: 'collect_color', target: 20, color: 'blue' },
      { type: 'score', target: 3000 },
    ],
  },
  {
    level: 6, colors: C5, moves: 25, targetScore: 3500,
    objectives: [
      { type: 'collect_color', target: 15, color: 'green' },
      { type: 'collect_color', target: 15, color: 'yellow' },
    ],
  },

  // ── Phase 3: Ice Introduction ──
  {
    level: 7, colors: C5, moves: 28, targetScore: 3000,
    obstacles: [ice(3, 4), ice(4, 3), ice(4, 5), ice(5, 4)],
    objectives: [
      { type: 'clear_obstacle', target: 4, obstacleType: 'ice' },
      { type: 'score', target: 3000 },
    ],
  },
  {
    level: 8, colors: C5, moves: 26, targetScore: 3500,
    obstacles: [ice(3, 2), ice(3, 4), ice(3, 6), ice(5, 2), ice(5, 4), ice(5, 6)],
    objectives: [
      { type: 'clear_obstacle', target: 6, obstacleType: 'ice' },
      { type: 'score', target: 3500 },
    ],
  },
  {
    level: 9, colors: C5, moves: 25, targetScore: 4000,
    obstacles: [ice(1, 1), ice(1, 7), ice(3, 3), ice(3, 5), ice(5, 3), ice(5, 5), ice(7, 1), ice(7, 7)],
    objectives: [
      { type: 'clear_obstacle', target: 8, obstacleType: 'ice' },
      { type: 'collect_color', target: 20, color: 'red' },
    ],
  },
  {
    level: 10, colors: C5, moves: 24, targetScore: 4500,
    obstacles: [
      ice(2, 2), ice(2, 3), ice(2, 4), ice(2, 5), ice(2, 6),
      ice(6, 2), ice(6, 3), ice(6, 4), ice(6, 5), ice(6, 6),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 10, obstacleType: 'ice' },
      { type: 'score', target: 4500 },
    ],
  },

  // ── Phase 4: Stone Introduction ──
  {
    level: 11, colors: C5, moves: 26, targetScore: 4000,
    obstacles: [stone(4, 3), stone(4, 5)],
    objectives: [
      { type: 'clear_obstacle', target: 2, obstacleType: 'stone' },
      { type: 'score', target: 4000 },
    ],
  },
  {
    level: 12, colors: C5, moves: 25, targetScore: 4500,
    obstacles: [stone(2, 4), stone(3, 4), stone(5, 4), stone(6, 4)],
    objectives: [
      { type: 'clear_obstacle', target: 4, obstacleType: 'stone' },
      { type: 'collect_color', target: 20, color: 'purple' },
    ],
  },
  {
    level: 13, colors: C6, moves: 24, targetScore: 5000,
    obstacles: [
      stone(3, 2), stone(3, 6), stone(5, 2), stone(5, 6),
      ice(2, 4), ice(4, 3), ice(4, 5), ice(6, 4),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 4, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 4, obstacleType: 'ice' },
    ],
  },
  {
    level: 14, colors: C6, moves: 23, targetScore: 5500,
    obstacles: [stone(1, 4), stone(3, 2), stone(3, 6), stone(5, 2), stone(5, 6), stone(7, 4)],
    objectives: [
      { type: 'clear_obstacle', target: 6, obstacleType: 'stone' },
      { type: 'score', target: 5500 },
    ],
  },

  // ── Phase 5: Combination ──
  {
    level: 15, colors: C6, moves: 24, targetScore: 5500,
    obstacles: [
      stone(2, 2), stone(2, 6), stone(6, 2), stone(6, 6),
      ice(3, 3), ice(3, 5), ice(4, 4), ice(5, 3), ice(5, 5), ice(4, 7),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 4, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 6, obstacleType: 'ice' },
      { type: 'collect_color', target: 25, color: 'blue' },
    ],
  },
  {
    level: 16, colors: C6, moves: 22, targetScore: 6000,
    obstacles: [
      stone(0, 4), stone(4, 0), stone(4, 8), stone(8, 4),
      ice(2, 2), ice(2, 6), ice(3, 4), ice(4, 4), ice(5, 2), ice(5, 6), ice(6, 3), ice(6, 5),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 4, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 8, obstacleType: 'ice' },
      { type: 'score', target: 6000 },
    ],
  },
  {
    level: 17, colors: C6, moves: 22, targetScore: 6500,
    obstacles: [
      stone(1, 4), stone(3, 1), stone(3, 7), stone(5, 1), stone(5, 7), stone(7, 4),
      ice(2, 3), ice(2, 5), ice(4, 3), ice(4, 5), ice(6, 3), ice(6, 5),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 6, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 6, obstacleType: 'ice' },
      { type: 'activate_special', target: 3, specialType: 'bomb' },
    ],
  },
  {
    level: 18, colors: C6, moves: 20, targetScore: 7000,
    obstacles: [
      stone(2, 2), stone(2, 6), stone(4, 0), stone(4, 8), stone(6, 2), stone(6, 6),
      ice(1, 4), ice(3, 3), ice(3, 5), ice(4, 4), ice(5, 3), ice(5, 5), ice(7, 3), ice(7, 5),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 6, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 8, obstacleType: 'ice' },
      { type: 'score', target: 7000 },
    ],
  },

  // ── Phase 6: Expert ──
  {
    level: 19, colors: C6, moves: 20, targetScore: 7500,
    obstacles: [
      stone(1, 2), stone(1, 6), stone(3, 0), stone(3, 8), stone(5, 0), stone(5, 8), stone(7, 2), stone(7, 6),
      ice(2, 3), ice(2, 5), ice(3, 4), ice(4, 2), ice(4, 4), ice(4, 6), ice(5, 4), ice(6, 3), ice(6, 5), ice(7, 4),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 8, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 10, obstacleType: 'ice' },
      { type: 'collect_color', target: 25, color: 'red' },
    ],
  },
  {
    level: 20, colors: C6, moves: 18, targetScore: 8000,
    obstacles: [
      stone(0, 4), stone(2, 1), stone(2, 7), stone(4, 0), stone(4, 8), stone(6, 1), stone(6, 7), stone(8, 4),
      ice(1, 3), ice(1, 5), ice(3, 3), ice(3, 4), ice(3, 5), ice(5, 3), ice(5, 4), ice(5, 5), ice(7, 3), ice(7, 5),
    ],
    objectives: [
      { type: 'clear_obstacle', target: 8, obstacleType: 'stone' },
      { type: 'clear_obstacle', target: 10, obstacleType: 'ice' },
      { type: 'score', target: 8000 },
    ],
  },
];

export function getLevelConfig(level: number): LevelDef {
  if (level <= LEVEL_TABLE.length) {
    return LEVEL_TABLE[level - 1];
  }
  // Procedural progression for levels beyond 20
  const extraLevels = level - LEVEL_TABLE.length;
  return {
    level,
    colors: ALL_COLORS.slice(0),
    moves: Math.max(15, 18 - Math.floor(extraLevels / 3)),
    targetScore: 8000 + extraLevels * 1500,
  };
}
