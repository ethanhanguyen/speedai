/**
 * Configuration for LLM-based map generation.
 * Includes strategic category targets, theme presets, and terrain compatibility rules.
 */

export type ThemeName = 'north_africa' | 'eastern_front' | 'pacific' | 'urban' | 'mixed';

export interface CategoryTarget {
  min: number;  // % of walkable cells
  max: number;
  priority: 'high' | 'medium' | 'low';
}

export interface ThemePreset {
  name: ThemeName;
  description: string;
  terrainSymbols: string[];          // Preferred terrain symbols
  forbiddenSymbols?: string[];        // Never use
  categoryTargets: Record<string, CategoryTarget>;
}

export const MAP_GEN_CONFIG = {
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    maxTokens: 4000,
  },
  validation: {
    /** Minimum % of walkable cells (excludes walls, blocks, etc). */
    minWalkablePercent: 0.4,
    /** Maximum % of cells with blocking objects. */
    maxObjectDensity: 0.3,
    /** Ensure all enemy spawns are reachable from player spawn. */
    requireSpawnConnectivity: true,
  },
  design: {
    /** Minimum cells between player and enemy spawns. */
    minSpawnDistance: 8,
    /** Target % of walkable cells adjacent to cover (containers, walls). */
    targetCoverDensity: 0.35,
    /** Max unique ground terrain types per map (grass, water, sand, etc). */
    maxTerrainVariety: 5,
    /** Ideal walkable % (for designer feedback, not hard constraint). */
    preferredWalkablePercent: 0.55,

    /** Category-based density targets (% of map). */
    categoryTargets: {
      MOBILITY: { min: 0.15, max: 0.35, priority: 'medium' },
      DEFENSIVE: { min: 0.15, max: 0.35, priority: 'medium' },
      HAZARD: { min: 0.02, max: 0.12, priority: 'low' },
      OPEN: { min: 0.25, max: 0.45, priority: 'high' },
      TRANSITION: { min: 0.08, max: 0.25, priority: 'medium' },
    } as Record<string, CategoryTarget>,
  },

  /** Strategic feature detection thresholds. */
  strategicFeatures: {
    chokePoint: {
      /** Max width (in cells) to qualify as a choke point. */
      widthMax: 3,
      /** Minimum number of choke points to identify. */
      minCount: 2,
    },
    sniperLane: {
      /** Minimum unobstructed length (in cells) for a sniper lane. */
      minLength: 6,
      /** Minimum number of sniper lanes to identify. */
      minCount: 1,
    },
    coverCluster: {
      /** Cover value threshold (0-100) to qualify as a cluster. */
      valueThreshold: 60,
      /** Radius (in cells) around cluster center with high cover. */
      radiusCells: 2,
    },
    hazardZone: {
      /** Minimum DoT per turn to qualify as hazard. */
      dotThreshold: 5,
      /** Maximum number of hazard zones per map. */
      maxCount: 4,
    },
  },

  /** Theme presets guide coherent map generation. */
  themes: {
    north_africa: {
      name: 'north_africa',
      description: 'Desert warfare: sand, hardpan, salt flats, rocky outcrops',
      terrainSymbols: ['.', 'P', 'S', 'O', 'D', 'V'],
      forbiddenSymbols: ['f', 'j', 'n', 'i'],
      categoryTargets: {
        MOBILITY: { min: 0.25, max: 0.35, priority: 'high' },
        DEFENSIVE: { min: 0.15, max: 0.25, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.08, priority: 'low' },
        OPEN: { min: 0.30, max: 0.40, priority: 'high' },
        TRANSITION: { min: 0.10, max: 0.15, priority: 'medium' },
      },
    },
    eastern_front: {
      name: 'eastern_front',
      description: 'Steppe/winter warfare: snow, forest, gravel, grass',
      terrainSymbols: ['n', 'i', 'f', 'G', ',', '^'],
      forbiddenSymbols: ['S', 'D', 'b', 'w'],
      categoryTargets: {
        MOBILITY: { min: 0.15, max: 0.25, priority: 'medium' },
        DEFENSIVE: { min: 0.25, max: 0.35, priority: 'high' },
        HAZARD: { min: 0.05, max: 0.12, priority: 'medium' },
        OPEN: { min: 0.20, max: 0.30, priority: 'medium' },
        TRANSITION: { min: 0.15, max: 0.25, priority: 'high' },
      },
    },
    pacific: {
      name: 'pacific',
      description: 'Jungle/island warfare: jungle, beach, marsh, vegetation',
      terrainSymbols: ['j', 'b', ';', 'V', 'w', 'T'],
      forbiddenSymbols: ['n', 'i', 'r', 'A'],
      categoryTargets: {
        MOBILITY: { min: 0.08, max: 0.18, priority: 'low' },
        DEFENSIVE: { min: 0.35, max: 0.45, priority: 'high' },
        HAZARD: { min: 0.08, max: 0.15, priority: 'medium' },
        OPEN: { min: 0.15, max: 0.25, priority: 'low' },
        TRANSITION: { min: 0.10, max: 0.20, priority: 'medium' },
      },
    },
    urban: {
      name: 'urban',
      description: 'Urban combat: asphalt, concrete, ruins, urban pavement',
      terrainSymbols: ['A', 'u', 'r', 'c'],
      forbiddenSymbols: ['.', 'D', 'n', 'i', 'j'],
      categoryTargets: {
        MOBILITY: { min: 0.20, max: 0.40, priority: 'high' },
        DEFENSIVE: { min: 0.15, max: 0.25, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.08, priority: 'low' },
        OPEN: { min: 0.10, max: 0.20, priority: 'low' },
        TRANSITION: { min: 0.10, max: 0.20, priority: 'medium' },
      },
    },
    mixed: {
      name: 'mixed',
      description: 'Varied terrain: no theme restrictions, balanced categories',
      terrainSymbols: [],  // All symbols allowed
      forbiddenSymbols: [],
      categoryTargets: {
        MOBILITY: { min: 0.15, max: 0.35, priority: 'medium' },
        DEFENSIVE: { min: 0.15, max: 0.35, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.12, priority: 'low' },
        OPEN: { min: 0.25, max: 0.45, priority: 'high' },
        TRANSITION: { min: 0.08, max: 0.25, priority: 'medium' },
      },
    },
  } as Record<ThemeName, ThemePreset>,

  /** Terrain adjacency rules: prevent incompatible neighbors. */
  incompatibilities: {
    // Water variants should not touch each other excessively
    'rapids_drop': ['deep_snow', 'marsh_swamp'],
    'shoreline': ['deep_snow', 'ice_snow_field'],
    // Hazards sparse
    'deep_snow': ['rapids_drop', 'marsh_swamp', 'muddy_sinkhole'],
    'marsh_swamp': ['deep_snow', 'rapids_drop', 'ice_snow_field'],
    // Snow only in polar contexts
    'ice_snow_field': ['shoreline', 'jungle_underbrush', 'beach_sand'],
  } as Record<string, string[]>,

  output: {
    /** Directory for generated maps (relative to tools/). */
    outputDir: 'generated-maps',
    /** Maximum filename length for generated maps. */
    maxFilenameLength: 30,
  },
  logging: {
    /** Enable verbose step-by-step logging. */
    verbose: true,
  },
} as const;
