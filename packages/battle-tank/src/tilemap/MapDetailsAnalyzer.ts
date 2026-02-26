/**
 * Analyze map grid to compute metadata: terrain coverage, object distribution,
 * strategic zones, and LLM generation hints.
 */

import type { GridModel } from '@speedai/game-engine';
import type { TileCell, MapMetadata } from './types.js';
import { getTerrainByName, getAllTerrains } from '../config/TerrainDatabase.js';
import { getObjectByName, getAllObjects, getObjectsByCategory } from '../config/ObjectDatabase.js';
import type { ObjectCategory } from '../config/ObjectDatabase.js';

export function analyzeMapDetails(
  grid: GridModel<TileCell>,
  backgroundImagePath?: string
): MapMetadata {
  const terrainCoverage = computeTerrainCoverage(grid);
  const objectsByCategory = computeObjectDistribution(grid);
  const strategicZones = detectStrategicZones(grid);
  const hints = generateLLMHints(terrainCoverage, objectsByCategory);

  return {
    terrainCoverage,
    objectsByCategory,
    totalObjects: Object.values(objectsByCategory).reduce((a, b) => a + b, 0),
    strategicZones,
    backgroundImage: backgroundImagePath,
    hints,
  };
}

/**
 * Count terrain tiles and compute percentage of map coverage.
 */
function computeTerrainCoverage(grid: GridModel<TileCell>): Record<string, { count: number; percentage: number }> {
  const coverage: Record<string, number> = {};
  const allTerrains = getAllTerrains();

  // Initialize all terrain counts to 0
  for (const terrain of allTerrains) {
    coverage[terrain.name] = 0;
  }

  // Count tiles
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (cell) {
        const terrainName = cell.ground;
        coverage[terrainName] = (coverage[terrainName] || 0) + 1;
      }
    }
  }

  // Convert to percentages and filter zeros
  const result: Record<string, { count: number; percentage: number }> = {};
  const totalTiles = grid.rows * grid.cols;

  for (const [name, count] of Object.entries(coverage)) {
    if (count > 0) {
      result[name] = {
        count,
        percentage: Math.round((count / totalTiles) * 100 * 10) / 10, // 1 decimal
      };
    }
  }

  return result;
}

/**
 * Count objects by ObjectDatabase category.
 */
function computeObjectDistribution(grid: GridModel<TileCell>): Record<string, number> {
  const distribution: Record<string, number> = {};
  const allObjects = getAllObjects();

  // Initialize all categories to 0
  const allCategories = new Set<ObjectCategory>();
  for (const obj of allObjects) {
    allCategories.add(obj.category);
  }
  for (const cat of allCategories) {
    distribution[cat] = 0;
  }

  // Count objects (skip NONE)
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (cell && cell.object !== 'none') {
        const objDef = getObjectByName(cell.object);
        if (objDef) {
          distribution[objDef.category] = (distribution[objDef.category] || 0) + 1;
        }
      }
    }
  }

  // Remove zero entries
  for (const [key, val] of Object.entries(distribution)) {
    if (val === 0) delete distribution[key];
  }

  return distribution;
}

/**
 * Detect strategic zones by analyzing terrain/object patterns.
 */
function detectStrategicZones(
  grid: GridModel<TileCell>
): MapMetadata['strategicZones'] {
  const chokePoints: Array<{ r: number; c: number }> = [];
  const ambushZones: Array<{ r: number; c: number }> = [];
  const hazardZones: Array<{ r: number; c: number }> = [];

  // Scan grid for patterns
  for (let r = 1; r < grid.rows - 1; r++) {
    for (let c = 1; c < grid.cols - 1; c++) {
      const cell = grid.get(r, c);
      if (!cell) continue;

      const terrain = getTerrainByName(cell.ground);
      const object = cell.object !== 'none' ? getObjectByName(cell.object) : null;

      // Chokepoint: high cover around tile
      if (object?.coverPercent === 1 || (terrain && terrain.coverPercent > 0.3)) {
        const neighborCover = countNeighborCover(grid, r, c);
        if (neighborCover >= 3) {
          chokePoints.push({ r, c });
        }
      }

      // Ambush zone: high cover with surrounding hazards
      if (
        (object?.coverPercent === 1 || (terrain && terrain.coverPercent > 0.25)) &&
        hasHazardNeighbors(grid, r, c)
      ) {
        ambushZones.push({ r, c });
      }

      // Hazard zone: DoT terrain or destructible objects
      if ((terrain && terrain.dotPerTurn > 0) || object?.isDestructible) {
        hazardZones.push({ r, c });
      }
    }
  }

  return {
    chokePoints: chokePoints.length > 0 ? chokePoints : undefined,
    ambushZones: ambushZones.length > 0 ? ambushZones : undefined,
    hazardZones: hazardZones.length > 0 ? hazardZones : undefined,
  };
}

/**
 * Count neighbors with cover >= 0.5.
 */
function countNeighborCover(grid: GridModel<TileCell>, r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols) {
        const cell = grid.get(nr, nc);
        if (cell) {
          const terrain = getTerrainByName(cell.ground);
          const object = cell.object !== 'none' ? getObjectByName(cell.object) : null;
          if ((terrain && terrain.coverPercent >= 0.5) || object?.coverPercent === 1) {
            count++;
          }
        }
      }
    }
  }
  return count;
}

/**
 * Check if neighbors contain hazards (DoT or dangerous terrain).
 */
function hasHazardNeighbors(grid: GridModel<TileCell>, r: number, c: number): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols) {
        const cell = grid.get(nr, nc);
        if (cell) {
          const terrain = getTerrainByName(cell.ground);
          if (terrain && terrain.dotPerTurn > 0) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Generate LLM hints from metadata distributions.
 */
function generateLLMHints(
  terrainCoverage: Record<string, { count: number; percentage: number }>,
  objectsByCategory: Record<string, number>
): string[] {
  const hints: string[] = [];

  // Terrain composition
  const terrains = Object.entries(terrainCoverage)
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 3)
    .map((e) => e[0]);
  if (terrains.length > 0) {
    hints.push(`Primary terrains: ${terrains.join(', ')}`);
  }

  // Object density
  const totalObjects = Object.values(objectsByCategory).reduce((a, b) => a + b, 0);
  const density =
    totalObjects > 20 ? 'High obstacle density' : totalObjects > 5 ? 'Moderate obstacles' : 'Sparse obstacles';
  hints.push(density);

  // Strategic indicators
  if (objectsByCategory['FORTIFICATION']) {
    hints.push('Defense-oriented layout with fortifications');
  }
  if (objectsByCategory['NATURAL']) {
    hints.push('Natural terrain barriers—varied engagement ranges');
  }
  if (objectsByCategory['HAZARD']) {
    hints.push('Hazardous terrain—environmental damage present');
  }

  return hints;
}
