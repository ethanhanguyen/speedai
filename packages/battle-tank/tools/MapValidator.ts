import type { GridModel } from '@speedai/game-engine';
import type { TileCell, MapData } from '../src/tilemap/types.js';
import { TileId, ObjectId } from '../src/tilemap/types.js';
import { OBJECT_DEFS } from '../src/tilemap/TileRegistry.js';
import { MAP_GEN_CONFIG } from './MapGenConfig.js';
import type { ThemePreset } from './MapGenConfig.js';
import { getAllTerrains } from '../src/config/TerrainDatabase.js';
import { getAllObjects } from '../src/config/ObjectDatabase.js';

export interface ValidationIssue {
  type: string;
  message: string;
  position?: { r: number; c: number };
}

export interface ValidationResult {
  warnings: ValidationIssue[];
}

/**
 * Validate structural integrity: cells exist, IDs valid, spawns valid, connectivity.
 * All issues are advisory warnings — never blocks saving.
 */
export function validateStructure(
  grid: GridModel<TileCell>,
  mapData: MapData
): ValidationResult {
  const warnings: ValidationIssue[] = [];

  // 1. Check all tile IDs are valid
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (!cell) {
        warnings.push({
          type: 'missing_cell',
          message: `Cell at (${r}, ${c}) is null or undefined`,
          position: { r, c },
        });
        continue;
      }

      if (!Object.values(TileId).includes(cell.ground)) {
        warnings.push({
          type: 'invalid_tile_id',
          message: `Invalid ground tile ID: ${cell.ground}`,
          position: { r, c },
        });
      }

      if (!Object.values(ObjectId).includes(cell.object)) {
        warnings.push({
          type: 'invalid_object_id',
          message: `Invalid object ID: ${cell.object}`,
          position: { r, c },
        });
      }
    }
  }

  // 2. Check spawn points exist and are on walkable terrain
  if (mapData.spawnPoints.length === 0) {
    warnings.push({
      type: 'no_player_spawn',
      message: 'Map has no player spawn point',
    });
  }

  for (const spawn of mapData.spawnPoints) {
    const cell = grid.get(spawn.r, spawn.c);
    if (!cell || !isWalkable(cell)) {
      warnings.push({
        type: 'unwalkable_spawn',
        message: `Player spawn at (${spawn.r}, ${spawn.c}) is not walkable`,
        position: spawn,
      });
    }
  }

  for (const spawn of mapData.enemySpawns) {
    const cell = grid.get(spawn.r, spawn.c);
    if (!cell || !isWalkable(cell)) {
      warnings.push({
        type: 'unwalkable_spawn',
        message: `Enemy spawn at (${spawn.r}, ${spawn.c}) is not walkable`,
        position: spawn,
      });
    }
  }

  // 3. Check spawn connectivity (BFS)
  if (MAP_GEN_CONFIG.validation.requireSpawnConnectivity && mapData.spawnPoints.length > 0) {
    const reachable = bfsReachable(grid, mapData.spawnPoints[0].r, mapData.spawnPoints[0].c);
    for (const spawn of mapData.enemySpawns) {
      const key = `${spawn.r},${spawn.c}`;
      if (!reachable.has(key)) {
        warnings.push({
          type: 'unreachable_spawn',
          message: `Enemy spawn at (${spawn.r}, ${spawn.c}) is unreachable from player spawn`,
          position: spawn,
        });
      }
    }
  }

  return { warnings };
}

/**
 * Validate gameplay metrics: walkable %, object density.
 * All issues are advisory warnings.
 */
export function validateGameplay(
  grid: GridModel<TileCell>
): ValidationResult {
  const warnings: ValidationIssue[] = [];

  let walkableCount = 0;
  let totalCells = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (cell) {
        totalCells++;
        if (isWalkable(cell)) walkableCount++;
      }
    }
  }
  const walkablePercent = walkableCount / totalCells;
  if (walkablePercent < MAP_GEN_CONFIG.validation.minWalkablePercent) {
    warnings.push({
      type: 'low_walkable_area',
      message: `Only ${(walkablePercent * 100).toFixed(1)}% walkable (min: ${MAP_GEN_CONFIG.validation.minWalkablePercent * 100}%)`,
    });
  }

  let objectCount = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (cell && cell.object !== ObjectId.NONE) {
        objectCount++;
      }
    }
  }
  const objectDensity = objectCount / totalCells;
  if (objectDensity > MAP_GEN_CONFIG.validation.maxObjectDensity) {
    warnings.push({
      type: 'high_object_density',
      message: `Object density ${(objectDensity * 100).toFixed(1)}% exceeds max ${MAP_GEN_CONFIG.validation.maxObjectDensity * 100}%`,
    });
  }

  return { warnings };
}

/**
 * Validate both structure and gameplay (combined convenience function).
 */
export function validateGrid(
  grid: GridModel<TileCell>,
  mapData: MapData
): ValidationResult {
  const structResult = validateStructure(grid, mapData);
  const gameplayResult = validateGameplay(grid);

  return {
    warnings: [...structResult.warnings, ...gameplayResult.warnings],
  };
}

/** Check if a cell is walkable (no blocking object). */
function isWalkable(cell: TileCell): boolean {
  const objDef = OBJECT_DEFS[cell.object];
  return objDef?.walkable ?? true;
}

/**
 * Validate theme compliance: forbidden and non-preferred symbols.
 * All issues are advisory warnings.
 */
export function validateThemeCompliance(
  grid: GridModel<TileCell>,
  theme: ThemePreset
): ValidationResult {
  const warnings: ValidationIssue[] = [];

  // Build symbol→name lookups from databases
  const terrainByName = new Map<string, string>();
  for (const t of getAllTerrains()) {
    terrainByName.set(t.name, t.symbol);
  }
  const objectByName = new Map<string, string>();
  for (const o of getAllObjects()) {
    objectByName.set(o.name, o.symbol);
  }

  const forbiddenTerrainSymbols = new Set(theme.forbiddenSymbols ?? []);
  const forbiddenObjectSymbols = new Set(theme.forbiddenObjectSymbols ?? []);
  const preferredTerrainSymbols = new Set(theme.terrainSymbols);
  const preferredObjectSymbols = new Set(theme.objectSymbols);

  // Collect unique terrain/object types used in grid
  const usedTerrains = new Set<string>();
  const usedObjects = new Set<string>();
  const seenForbidden = new Set<string>();

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (!cell) continue;

      const terrainSymbol = terrainByName.get(cell.ground);
      if (terrainSymbol) {
        usedTerrains.add(terrainSymbol);

        // Forbidden terrain (deduplicate: report once per type)
        if (forbiddenTerrainSymbols.has(terrainSymbol)) {
          const key = `forbidden_terrain:${cell.ground}`;
          if (!seenForbidden.has(key)) {
            seenForbidden.add(key);
            warnings.push({
              type: 'forbidden_terrain',
              message: `Forbidden terrain '${cell.ground}' (${terrainSymbol}) for theme '${theme.name}'`,
              position: { r, c },
            });
          }
        }
      }

      if (cell.object !== ObjectId.NONE) {
        const objectSymbol = objectByName.get(cell.object);
        if (objectSymbol) {
          usedObjects.add(objectSymbol);

          // Forbidden object (deduplicate: report once per type)
          if (forbiddenObjectSymbols.has(objectSymbol)) {
            const key = `forbidden_object:${cell.object}`;
            if (!seenForbidden.has(key)) {
              seenForbidden.add(key);
              warnings.push({
                type: 'forbidden_object',
                message: `Forbidden object '${cell.object}' (${objectSymbol}) for theme '${theme.name}'`,
                position: { r, c },
              });
            }
          }
        }
      }
    }
  }

  // Count non-preferred types (only if theme has preferred lists)
  const { maxNonPreferredTerrains, maxNonPreferredObjects } = MAP_GEN_CONFIG.themeEnforcement;

  if (preferredTerrainSymbols.size > 0) {
    const nonPreferredTerrains = [...usedTerrains].filter(s => !preferredTerrainSymbols.has(s));
    if (nonPreferredTerrains.length > maxNonPreferredTerrains) {
      warnings.push({
        type: 'excess_non_preferred_terrain',
        message: `${nonPreferredTerrains.length} non-preferred terrain types used (max ${maxNonPreferredTerrains}): ${nonPreferredTerrains.join(', ')}`,
      });
    }
  }

  if (preferredObjectSymbols.size > 0) {
    const nonPreferredObjects = [...usedObjects].filter(s => !preferredObjectSymbols.has(s));
    if (nonPreferredObjects.length > maxNonPreferredObjects) {
      warnings.push({
        type: 'excess_non_preferred_object',
        message: `${nonPreferredObjects.length} non-preferred object types used (max ${maxNonPreferredObjects}): ${nonPreferredObjects.join(', ')}`,
      });
    }
  }

  return { warnings };
}

/** BFS to find all reachable cells from start position. */
function bfsReachable(
  grid: GridModel<TileCell>,
  startR: number,
  startC: number
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ r: number; c: number }> = [{ r: startR, c: startC }];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;

      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;

      const cell = grid.get(nr, nc);
      if (!cell || !isWalkable(cell)) continue;

      visited.add(key);
      queue.push({ r: nr, c: nc });
    }
  }

  return visited;
}
