/**
 * Centralized terrain database loaded from TerrainData.json.
 * Single source of truth for all terrain mechanics, visuals, and strategic guidance.
 */

// Import JSON directly (resolveJsonModule: true in tsconfig)
import terrainDataJson from './TerrainData.json';

export type TerrainCategory = 'MOBILITY' | 'DEFENSIVE' | 'HAZARD' | 'OPEN' | 'TRANSITION';

export interface TerrainDef {
  symbol: string;
  name: string;
  displayName: string;
  category: TerrainCategory;
  clearSpeed: number;      // % of base movement speed (0.3–1.4)
  coverPercent: number;    // % damage reduction (0–0.4)
  sightBlockRange: number; // cells of vision obscured (0–3)
  dotPerTurn: number;      // HP loss per turn (0–2)
  strategicRole: string;   // Map design purpose (e.g., "Open chases, ambushes")
  historicalContext: string; // Real battle reference for flavor
  playstyleHints: string;  // Player guidance for LLM (e.g., "Poor traction, exposed")
}

/**
 * Load and validate terrain data on module init.
 */
function loadTerrainDatabase(): TerrainDef[] {
  const terrains = terrainDataJson as TerrainDef[];

  // Validate completeness
  for (const terrain of terrains) {
    if (!terrain.symbol || !terrain.name || terrain.clearSpeed === undefined) {
      throw new Error(`Invalid terrain definition: ${JSON.stringify(terrain)}`);
    }
  }

  return terrains;
}

const TERRAIN_DATA = loadTerrainDatabase();

/**
 * Get terrain by symbol (e.g., '.' for loose_sand).
 */
export function getTerrainBySymbol(symbol: string): TerrainDef | undefined {
  return TERRAIN_DATA.find((t) => t.symbol === symbol);
}

/**
 * Get terrain by name (e.g., 'loose_sand').
 */
export function getTerrainByName(name: string): TerrainDef | undefined {
  return TERRAIN_DATA.find((t) => t.name === name);
}

/**
 * Get all terrains of a strategic role (e.g., "Open chases, ambushes").
 */
export function getTerrainsByRole(role: string): TerrainDef[] {
  return TERRAIN_DATA.filter((t) => t.strategicRole.includes(role));
}

/**
 * Backward-compatible TERRAIN_PROPERTIES for existing code.
 * Maps terrain name → gameplay mechanics (without strategic/historical data).
 */
export const TERRAIN_PROPERTIES: Record<string, { clearSpeed: number; coverPercent: number; sightBlockRange: number; dotPerTurn: number }> = {};

for (const terrain of TERRAIN_DATA) {
  TERRAIN_PROPERTIES[terrain.name] = {
    clearSpeed: terrain.clearSpeed,
    coverPercent: terrain.coverPercent,
    sightBlockRange: terrain.sightBlockRange,
    dotPerTurn: terrain.dotPerTurn,
  };
}

/**
 * Get all terrain definitions (for iteration, AI generation, etc).
 */
export function getAllTerrains(): TerrainDef[] {
  return [...TERRAIN_DATA];
}

/**
 * Build a symbol-to-name map for parsing text maps.
 */
export function buildSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const terrain of TERRAIN_DATA) {
    map[terrain.symbol] = terrain.name;
  }
  return map;
}

/**
 * Build a name-to-symbol reverse map.
 */
export function buildNameToSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const terrain of TERRAIN_DATA) {
    map[terrain.name] = terrain.symbol;
  }
  return map;
}

/**
 * Get terrains by category (e.g., "DEFENSIVE", "MOBILITY").
 */
export function getTerrainsByCategory(category: TerrainCategory): TerrainDef[] {
  return TERRAIN_DATA.filter((t) => t.category === category);
}

/**
 * Get all categories with their terrain counts.
 */
export function getCategoryStats(): Record<TerrainCategory, number> {
  const stats: Record<TerrainCategory, number> = {
    MOBILITY: 0,
    DEFENSIVE: 0,
    HAZARD: 0,
    OPEN: 0,
    TRANSITION: 0,
  };
  for (const terrain of TERRAIN_DATA) {
    stats[terrain.category]++;
  }
  return stats;
}
