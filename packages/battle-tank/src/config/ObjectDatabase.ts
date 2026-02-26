/**
 * Centralized object/obstacle database loaded from ObjectData.json.
 * Single source of truth for all blocking obstacle mechanics, visuals, and strategic guidance.
 */

import objectDataJson from './ObjectData.json';
import { getObjectArchetype } from './ArchetypeDatabase.js';

export type ObjectCategory = 'CHANNEL' | 'NATURAL' | 'ELEVATION' | 'FORTIFICATION' | 'INDUSTRIAL' | 'HAZARD';

export interface ObjectDef {
  symbol: string;
  name: string;
  displayName: string;
  effectsDescription: string;  // e.g., "Impassable; partial LOS block"
  strategicRole: string;       // e.g., "Map dividers", "Defensive rocks"
  historicalContext: string;   // Real battle reference
  category: ObjectCategory;
  archetypeId: string;         // Maps to ObjectArchetype for gameplay mechanics
  coverPercent: number;        // % damage reduction (0–1.0)
  sightBlockRange: number;     // cells of vision blocked (0–3)
  isImpassable: boolean;       // Movement blocking flag
  isDestructible?: boolean;    // Can be destroyed (gameplay mechanic)
  spriteAvailable?: boolean;   // Sprite rendering available
  spriteDir?: string;          // Sprite directory (e.g., "obstacles")
  spriteFile?: string;         // Base sprite filename (without state/environment)
  damageStates?: string[];     // Available damage states (e.g., ["perfect", "half", "destroyed"])
  environmentVariants?: string[]; // Available environment variants (e.g., ["night", "winter"])
  isVisualOverlay?: boolean;   // Decoration overlay (not for terrain structure generation)
  // Gameplay fields (optional, defaults applied by buildObjectDefsMap)
  hp?: number;                          // Default: Infinity if isImpassable, 1 if isDestructible, 0 otherwise
  blockProjectile?: boolean;            // Default: isImpassable || coverPercent >= 0.5
  gridSpan?: { w: number; h: number };  // Default: { w: 1, h: 1 }
  orientations?: number[];              // Default: [0]
  displaySize?: { w: number; h: number }; // Default: gridSpan * tileSize (computed at runtime)
  pivot?: { x: number; y: number };     // Default: { x: 0.5, y: 0.5 }
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
 * Get all structural objects (for terrain generation; excludes visual overlays).
 */
export function getStructuralObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.isVisualOverlay !== true);
}

/**
 * Get all visual overlay objects (decorations; passable, placed post-generation).
 */
export function getVisualOverlayObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.isVisualOverlay === true);
}

/**
 * Get all objects with sprite rendering available.
 */
export function getSpriteObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.spriteAvailable === true);
}

/**
 * Get all objects without sprite rendering (prerendered).
 */
export function getPrerenderedObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.spriteAvailable !== true);
}

/**
 * Get all destructible objects.
 */
export function getDestructibleObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.isDestructible === true);
}

/**
 * Get all indestructible objects.
 */
export function getIndestructibleObjects(): ObjectDef[] {
  return OBJECT_DATA.filter((o) => o.isDestructible !== true);
}

/**
 * Get gameplay stats for object via its archetype.
 * Returns canonical archetype values, not generation-type values.
 */
export function getObjectGameplayStats(objectName: string): { coverPercent: number; sightBlockRange: number; isImpassable: boolean } | undefined {
  const obj = getObjectByName(objectName);
  if (!obj) return undefined;

  const archetype = getObjectArchetype(obj.archetypeId);
  if (!archetype) return undefined;

  return {
    coverPercent: archetype.coverPercent,
    sightBlockRange: archetype.sightBlockRange,
    isImpassable: archetype.isImpassable,
  };
}

/**
 * Get sprite path for object with environment/damage state.
 * Returns path like: /sprites/obstacles/concrete_bunker_perfect.png
 * Handles fallback: night_winter_state → night_state → winter_state → state
 */
export function getSpritePath(
  obj: ObjectDef,
  state?: string,
  environment?: string,
  season?: string
): string | null {
  if (!obj.spriteAvailable || !obj.spriteDir || !obj.spriteFile) {
    return null;
  }

  const variants: string[] = [];

  if (state) {
    // Try all combinations with environment/season
    if (environment && season) {
      variants.push(`${obj.spriteFile}_${environment}_${season}_${state}`);
    }
    if (environment) {
      variants.push(`${obj.spriteFile}_${environment}_${state}`);
    }
    if (season) {
      variants.push(`${obj.spriteFile}_${season}_${state}`);
    }
    variants.push(`${obj.spriteFile}_${state}`);
  } else {
    // No state (static objects like wreckage)
    if (environment && season) {
      variants.push(`${obj.spriteFile}_${environment}_${season}`);
    }
    if (environment) {
      variants.push(`${obj.spriteFile}_${environment}`);
    }
    if (season) {
      variants.push(`${obj.spriteFile}_${season}`);
    }
    variants.push(obj.spriteFile);
  }

  // Return first variant (caller will check existence)
  return `/sprites/${obj.spriteDir}/${variants[0]}.png`;
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

// ---------------------------------------------------------------------------
// Data-driven builders for TileRegistry OBJECT_DEFS
// ---------------------------------------------------------------------------

/**
 * Build spriteVariants array from damageStates or environmentVariants.
 * e.g., barrel + ["blue","red","yellow"] → ["barrel_blue","barrel_red","barrel_yellow"]
 * e.g., concrete_bunker + ["perfect","half","destroyed"] → ["concrete_bunker_perfect",...]
 */
export function buildSpriteVariants(obj: ObjectDef): string[] | undefined {
  if (!obj.spriteAvailable || !obj.spriteFile) return undefined;

  if (obj.environmentVariants && obj.environmentVariants.length > 0) {
    return obj.environmentVariants.map(v => `${obj.spriteFile}_${v}`);
  }
  if (obj.damageStates && obj.damageStates.length > 0) {
    return obj.damageStates.map(s => `${obj.spriteFile}_${s}`);
  }
  return undefined;
}

/**
 * TileRegistry-compatible object definition (rendering + gameplay).
 * Generated from ObjectData.json by buildObjectDefsMap().
 */
export interface TileObjectDef {
  spriteKey: string;
  spriteVariants?: string[];
  walkable: boolean;
  destructible: boolean;
  hp: number;
  blockProjectile: boolean;
  gridSpan?: { w: number; h: number };
  orientations?: number[];
  displaySize?: { w: number; h: number };
  pivot?: { x: number; y: number };
}

/**
 * Build the OBJECT_DEFS map from ObjectData.json.
 * Returns Record<objectName, TileObjectDef> including an entry for 'none'.
 * This is the single source of truth — TileRegistry imports this directly.
 */
export function buildObjectDefsMap(): Record<string, TileObjectDef> {
  const map: Record<string, TileObjectDef> = {
    none: {
      spriteKey: '',
      walkable: true,
      destructible: false,
      hp: 0,
      blockProjectile: false,
    },
  };

  for (const obj of OBJECT_DATA) {
    const variants = buildSpriteVariants(obj);
    const isDestructible = obj.isDestructible ?? false;

    // spriteKey: first variant if variants exist, else object name if sprite available, else '' (skip rendering)
    let spriteKey = '';
    if (obj.spriteAvailable && obj.spriteFile) {
      spriteKey = variants ? variants[0] : obj.name;
    }

    map[obj.name] = {
      spriteKey,
      spriteVariants: variants,
      walkable: !obj.isImpassable,
      destructible: isDestructible,
      hp: obj.hp ?? (obj.isImpassable ? Infinity : (isDestructible ? 1 : 0)),
      blockProjectile: obj.blockProjectile ?? (obj.isImpassable || obj.coverPercent >= 0.5),
      gridSpan: obj.gridSpan,
      orientations: obj.orientations,
      displaySize: obj.displaySize,
      pivot: obj.pivot,
    };
  }

  return map;
}
