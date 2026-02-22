/**
 * Gameplay mechanics extracted from terrain & object design tables.
 * Used by map generation, pathfinding, movement, and sight calculations.
 *
 * DEPRECATED: Import from TerrainDatabase.ts instead. This file is kept for backward compatibility.
 */

export interface TerrainProperties {
  clearSpeed: number;     // % of base movement speed (0.3–1.4)
  coverPercent: number;   // % damage reduction (0–0.40)
  sightBlockRange: number; // cells of vision obscured (0–3)
  dotPerTurn: number;     // HP loss per turn (0–2)
}

export interface ObjectProperties {
  coverPercent: number;   // % damage reduction (typically 1.0 for blockers)
  sightBlockRange: number; // cells vision blocked (typically 0 for full blockers)
  roleCategory: string;   // theme: Channel, FOB, Natural, Hazard, Elevation, Industrial
}

/**
 * Ground terrain types with gameplay mechanics.
 * Loaded from TerrainDatabase.ts (backed by TerrainData.json).
 */
export { TERRAIN_PROPERTIES } from './TerrainDatabase.js';

/**
 * Blocking obstacle types (impassable, full cover, sight-blocking).
 * All are 100% cover, but sightBlockRange varies by design role.
 */
export const OBJECT_PROPERTIES: Record<string, ObjectProperties> = {
  'water_channel': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Channel' },
  'shipping_container': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'FOB' },
  'boulder_formation': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Natural' },
  'cliff_face': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Hazard' },
  'ruined_structure': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'FOB' },
  'tank_hull_wreckage': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Hazard' },
  'deep_wadi': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Channel' },
  'escarpment': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Elevation' },
  'concrete_barrier': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'FOB' },
  'oil_derrick': { coverPercent: 1.0, sightBlockRange: 0, roleCategory: 'Industrial' },
};
