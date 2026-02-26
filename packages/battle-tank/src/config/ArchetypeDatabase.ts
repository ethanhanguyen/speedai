/**
 * Archetype database for consolidated gameplay mechanics.
 * Terrains and objects map to 9+8 archetypes respectively via archetypeId field.
 * Archetype stats are canonical; terrains/objects are generation-time variants.
 */

import terrainArchetypesJson from './TerrainArchetypes.json';
import objectArchetypesJson from './ObjectArchetypes.json';

export interface TerrainArchetype {
  id: string;
  displayName: string;
  symbol: string;
  defaultType: string;
  clearSpeed: number;
  coverPercent: number;
  sightBlockRange: number;
  dotPerTurn: number;
  description: string;
}

export interface ObjectArchetype {
  id: string;
  displayName: string;
  symbol: string;
  defaultType: string;
  coverPercent: number;
  sightBlockRange: number;
  isImpassable: boolean;
  description: string;
}

/**
 * Load terrain archetypes on module init.
 */
function loadTerrainArchetypes(): TerrainArchetype[] {
  const archetypes = terrainArchetypesJson as TerrainArchetype[];

  for (const archetype of archetypes) {
    if (!archetype.id || !archetype.symbol || !archetype.defaultType || archetype.clearSpeed === undefined) {
      throw new Error(`Invalid terrain archetype: ${JSON.stringify(archetype)}`);
    }
  }

  return archetypes;
}

/**
 * Load object archetypes on module init.
 */
function loadObjectArchetypes(): ObjectArchetype[] {
  const archetypes = objectArchetypesJson as ObjectArchetype[];

  for (const archetype of archetypes) {
    if (!archetype.id || !archetype.symbol || !archetype.defaultType || archetype.isImpassable === undefined) {
      throw new Error(`Invalid object archetype: ${JSON.stringify(archetype)}`);
    }
  }

  return archetypes;
}

const TERRAIN_ARCHETYPES = loadTerrainArchetypes();
const OBJECT_ARCHETYPES = loadObjectArchetypes();

/**
 * Get terrain archetype by ID (e.g., 'fast_ground').
 */
export function getTerrainArchetype(id: string): TerrainArchetype | undefined {
  return TERRAIN_ARCHETYPES.find((a) => a.id === id);
}

/**
 * Get object archetype by ID (e.g., 'wall').
 */
export function getObjectArchetype(id: string): ObjectArchetype | undefined {
  return OBJECT_ARCHETYPES.find((a) => a.id === id);
}

/**
 * Get all terrain archetypes.
 */
export function getAllTerrainArchetypes(): TerrainArchetype[] {
  return [...TERRAIN_ARCHETYPES];
}

/**
 * Get all object archetypes.
 */
export function getAllObjectArchetypes(): ObjectArchetype[] {
  return [...OBJECT_ARCHETYPES];
}

/**
 * Build archetype ID → stats map for terrain.
 */
export function buildTerrainArchetypeMap(): Record<string, TerrainArchetype> {
  const map: Record<string, TerrainArchetype> = {};
  for (const archetype of TERRAIN_ARCHETYPES) {
    map[archetype.id] = archetype;
  }
  return map;
}

/**
 * Build archetype ID → stats map for objects.
 */
export function buildObjectArchetypeMap(): Record<string, ObjectArchetype> {
  const map: Record<string, ObjectArchetype> = {};
  for (const archetype of OBJECT_ARCHETYPES) {
    map[archetype.id] = archetype;
  }
  return map;
}

/**
 * Get terrain archetype by symbol (e.g., '.' → 'fast_ground').
 */
export function getTerrainArchetypeBySymbol(symbol: string): TerrainArchetype | undefined {
  return TERRAIN_ARCHETYPES.find((a) => a.symbol === symbol);
}

/**
 * Get object archetype by symbol (e.g., 'W' → 'wall').
 */
export function getObjectArchetypeBySymbol(symbol: string): ObjectArchetype | undefined {
  return OBJECT_ARCHETYPES.find((a) => a.symbol === symbol);
}

/**
 * Build symbol → archetype ID map for terrain (for extract mode).
 */
export function buildTerrainSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const archetype of TERRAIN_ARCHETYPES) {
    map[archetype.symbol] = archetype.id;
  }
  return map;
}

/**
 * Build symbol → archetype ID map for objects (for extract mode).
 */
export function buildObjectSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const archetype of OBJECT_ARCHETYPES) {
    map[archetype.symbol] = archetype.id;
  }
  return map;
}

/**
 * Get default generation type for terrain archetype.
 */
export function getDefaultTerrainType(archetypeId: string): string | undefined {
  const archetype = getTerrainArchetype(archetypeId);
  return archetype?.defaultType;
}

/**
 * Get default generation type for object archetype.
 */
export function getDefaultObjectType(archetypeId: string): string | undefined {
  const archetype = getObjectArchetype(archetypeId);
  return archetype?.defaultType;
}

/**
 * Build archetype legend for extract mode (terrain).
 * Returns formatted string for vision LLM prompt.
 */
export function buildTerrainArchetypeLegend(): string {
  return TERRAIN_ARCHETYPES
    .map((a) => `${a.symbol} = ${a.displayName} (${a.id})`)
    .join('\n');
}

/**
 * Build archetype legend for extract mode (objects).
 * Returns formatted string for vision LLM prompt.
 */
export function buildObjectArchetypeLegend(): string {
  return OBJECT_ARCHETYPES
    .map((a) => `${a.symbol} = ${a.displayName} (${a.id})`)
    .join('\n');
}
