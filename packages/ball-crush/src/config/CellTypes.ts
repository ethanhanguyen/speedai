/**
 * Data-driven cell type definitions for obstacles/blockers.
 *
 * Game designers: add new obstacle types by adding entries to CELL_TYPES.
 * All game logic reads behavior flags — no code changes needed for new types.
 */

export interface CellTypeEffects {
  shakeIntensity: number;
  shakeDuration: number;
  particles: {
    count: number;
    speed: number;
    lifetime: number;
    size: number;
    colors: string[];
  };
}

export interface CellTypeDef {
  id: string;
  displayName: string;
  hp: number;

  // ── Behavior flags (game logic reads THESE, never id) ──
  immovable: boolean;       // doesn't fall with gravity
  matchable: boolean;       // ball inside can participate in color matches
  swappable: boolean;       // player can select/swap this cell
  containsBall: boolean;    // has a ball underneath (revealed on destroy)

  // ── What damages it ──
  damage: {
    adjacentMatch: number;  // HP lost per adjacent match cleared
    specialHit: number;     // HP lost when hit by special activation
  };

  // ── Visual descriptor (renderer reads this generically) ──
  visual: {
    mode: 'solid' | 'overlay'; // solid = replaces ball; overlay = drawn on top
    fillColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    /** Alpha of crack overlay at each damage stage. Index 0 = first hit, etc. */
    crackAlphas: number[];
  };

  // ── Effects on hit / destroy ──
  effects: {
    hit: CellTypeEffects;
    destroy: CellTypeEffects;
  };
}

/**
 * Registry of all cell types.
 * To add a new obstacle: add an entry here + reference it in level configs.
 */
export const CELL_TYPES: Record<string, CellTypeDef> = {
  stone: {
    id: 'stone',
    displayName: 'Stone',
    hp: 2,
    immovable: true,
    matchable: false,
    swappable: false,
    containsBall: false,
    damage: { adjacentMatch: 1, specialHit: 1 },
    visual: {
      mode: 'solid',
      fillColor: '#7f8c8d',
      borderColor: '#5a6568',
      borderWidth: 2,
      borderRadius: 6,
      crackAlphas: [0.4],
    },
    effects: {
      hit: {
        shakeIntensity: 2,
        shakeDuration: 0.15,
        particles: { count: 4, speed: 80, lifetime: 0.3, size: 2, colors: ['#7f8c8d', '#95a5a6'] },
      },
      destroy: {
        shakeIntensity: 3,
        shakeDuration: 0.2,
        particles: { count: 8, speed: 120, lifetime: 0.5, size: 3, colors: ['#7f8c8d', '#95a5a6', '#bdc3c7'] },
      },
    },
  },

  ice: {
    id: 'ice',
    displayName: 'Ice',
    hp: 1,
    immovable: false,
    matchable: false,
    swappable: false,
    containsBall: true,
    damage: { adjacentMatch: 1, specialHit: 1 },
    visual: {
      mode: 'overlay',
      fillColor: 'rgba(173,216,230,0.45)',
      borderColor: '#87ceeb',
      borderWidth: 1.5,
      borderRadius: 6,
      crackAlphas: [],
    },
    effects: {
      hit: {
        shakeIntensity: 1,
        shakeDuration: 0.1,
        particles: { count: 3, speed: 60, lifetime: 0.3, size: 2, colors: ['#87ceeb', '#b0e0e6'] },
      },
      destroy: {
        shakeIntensity: 2,
        shakeDuration: 0.15,
        particles: { count: 6, speed: 100, lifetime: 0.4, size: 3, colors: ['#87ceeb', '#b0e0e6', '#e0f7fa'] },
      },
    },
  },
};

/** Look up a cell type definition. Returns undefined for unknown types. */
export function getCellTypeDef(type: string): CellTypeDef | undefined {
  return CELL_TYPES[type];
}
