/**
 * Centralized object/obstacle database loaded from ObjectData.json.
 * Single source of truth for all blocking obstacle mechanics, visuals, and strategic guidance.
 */

import objectDataJson from './ObjectData.json';

export type ObjectCategory = 'CHANNEL' | 'NATURAL' | 'ELEVATION' | 'FORTIFICATION' | 'INDUSTRIAL' | 'HAZARD';

export interface ObjectDef {
  symbol: string;
  name: string;
  displayName: string;
  effectsDescription: string;  // e.g., "Impassable; partial LOS block"
  strategicRole: string;       // e.g., "Map dividers", "Defensive rocks"
  historicalContext: string;   // Real battle reference
  category: ObjectCategory;
  coverPercent: number;        // % damage reduction (0–1.0)
  sightBlockRange: number;     // cells of vision blocked (0–3)
  isImpassable: boolean;       // Movement blocking flag
}

/**
 * Load and validate object data on module init.
 */
function loadObjectDatabase(): ObjectDef[] {
  const objects = objectDataJson as ObjectDef[];

  // Validate completeness
  for (const obj of objects) {
    if (!obj.symbol || !obj.name || obj.coverPercent === undefined) {
      throw new Error(`Invalid object definition: ${JSON.stringify(obj)}`);
    }
  }

  return objects;
}

const OBJECT_DATA = loadObjectDatabase();

/**
 * Get object by symbol (e.g., 'W' for water_channel).
 */
export function getObjectBySymbol(symbol: string): ObjectDef | undefined {
  return OBJECT_DATA.find((o) => o.symbol === symbol);
}

/**
 * Get object by name (e.g., 'water_channel').
 */
export function getObjectByName(name: string): ObjectDef | undefined {
  return OBJECT_DATA.find((o) => o.name === name);
}

/**
 * Get all objects of a strategic role (e.g., "Chokepoints").
 */
export function getObjectsByRole(role: string): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.strategicRole.includes(role));
}

/**
 * Get all objects of a category (e.g., "NATURAL").
 */
export function getObjectsByCategory(category: ObjectCategory): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.category === category);
}

/**
 * Get all object definitions (for iteration, AI generation, etc).
 */
export function getAllObjects(): ObjectDef[] {
  return [...OBJECT_DATA];
}

/**
 * Get all impassable objects (blocking movement).
 */
export function getImpassableObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.isImpassable);
}

/**
 * Get all passable objects (allow movement but provide cover/effects).
 */
export function getPassableObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => !o.isImpassable);
}

/**
 * Build a symbol-to-name map for parsing text maps.
 */
export function buildSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const obj of OBJECT_DATA) {
    map[obj.symbol] = obj.name;
  }
  return map;
}

/**
 * Build a name-to-symbol reverse map.
 */
export function buildNameToSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const obj of OBJECT_DATA) {
    map[obj.name] = obj.symbol;
  }
  return map;
}

/**
 * Get all categories with their object counts.
 */
export function getCategoryStats(): Record<ObjectCategory, number> {
  const stats: Record<ObjectCategory, number> = {
    CHANNEL: 0,
    NATURAL: 0,
    ELEVATION: 0,
    FORTIFICATION: 0,
    INDUSTRIAL: 0,
    HAZARD: 0,
  };
  for (const obj of OBJECT_DATA) {
    stats[obj.category]++;
  }
  return stats;
}

/**
 * Backward-compatible OBJECT_PROPERTIES export (for legacy code).
 * Maps object name → gameplay mechanics (without strategic/historical data).
 */
export const OBJECT_PROPERTIES: Record<string, { coverPercent: number; sightBlockRange: number; roleCategory?: string; isImpassable?: boolean }> = {};

for (const obj of OBJECT_DATA) {
  OBJECT_PROPERTIES[obj.name] = {
    coverPercent: obj.coverPercent,
    sightBlockRange: obj.sightBlockRange,
    roleCategory: obj.category,
    isImpassable: obj.isImpassable,
  };
}
