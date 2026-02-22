import type { GridModel } from '@speedai/game-engine';
import type { TileCell, MapData } from '../src/tilemap/types.js';
import { TileId, ObjectId } from '../src/tilemap/types.js';
import { OBJECT_DEFS } from '../src/tilemap/TileRegistry.js';
import { MAP_GEN_CONFIG } from './MapGenConfig.js';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  type: string;
  message: string;
  position?: { r: number; c: number };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Validate a generated map against schema and gameplay requirements.
 */
export function validateGrid(
  grid: GridModel<TileCell>,
  mapData: MapData
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Check all tile IDs are valid
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (!cell) {
        errors.push({
          severity: 'error',
          type: 'missing_cell',
          message: `Cell at (${r}, ${c}) is null or undefined`,
          position: { r, c },
        });
        continue;
      }

      // Check ground tile ID
      if (!Object.values(TileId).includes(cell.ground)) {
        errors.push({
          severity: 'error',
          type: 'invalid_tile_id',
          message: `Invalid ground tile ID: ${cell.ground}`,
          position: { r, c },
        });
      }

      // Check object ID
      if (!Object.values(ObjectId).includes(cell.object)) {
        errors.push({
          severity: 'error',
          type: 'invalid_object_id',
          message: `Invalid object ID: ${cell.object}`,
          position: { r, c },
        });
      }
    }
  }

  // 2. Check spawn points exist and are on walkable terrain
  if (mapData.spawnPoints.length === 0) {
    errors.push({
      severity: 'error',
      type: 'no_player_spawn',
      message: 'Map has no player spawn point',
    });
  }

  for (const spawn of mapData.spawnPoints) {
    const cell = grid.get(spawn.r, spawn.c);
    if (!cell || !isWalkable(cell)) {
      errors.push({
        severity: 'error',
        type: 'unwalkable_spawn',
        message: `Player spawn at (${spawn.r}, ${spawn.c}) is not walkable`,
        position: spawn,
      });
    }
  }

  for (const spawn of mapData.enemySpawns) {
    const cell = grid.get(spawn.r, spawn.c);
    if (!cell || !isWalkable(cell)) {
      errors.push({
        severity: 'error',
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
        errors.push({
          severity: 'error',
          type: 'unreachable_spawn',
          message: `Enemy spawn at (${spawn.r}, ${spawn.c}) is unreachable from player spawn`,
          position: spawn,
        });
      }
    }
  }

  // 4. Check walkable percentage
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
      severity: 'warning',
      type: 'low_walkable_area',
      message: `Only ${(walkablePercent * 100).toFixed(1)}% walkable (min: ${MAP_GEN_CONFIG.validation.minWalkablePercent * 100}%)`,
    });
  }

  // 5. Check object density
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
      severity: 'warning',
      type: 'high_object_density',
      message: `Object density ${(objectDensity * 100).toFixed(1)}% exceeds max ${MAP_GEN_CONFIG.validation.maxObjectDensity * 100}%`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Check if a cell is walkable (no blocking object). */
function isWalkable(cell: TileCell): boolean {
  const objDef = OBJECT_DEFS[cell.object];
  return objDef?.walkable ?? true;
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
