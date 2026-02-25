import { GridModel } from '@speedai/game-engine';
import type { TileCell, MapData } from './types.js';
import { CHAR_MAP, OBJECT_DEFS } from './TileRegistry.js';
import { TileId, ObjectId } from './types.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { getOccupiedCells } from './MultiTileUtils.js';

const SPAWN_CHAR = 'P';
const ENEMY_SPAWN_CHAR = 'S';
const DEFAULT_CELL: TileCell = { ground: TileId.LOOSE_SAND, object: ObjectId.NONE };

/**
 * Parse an ASCII map string into a GridModel<TileCell> + metadata.
 *
 * Format: one char per cell, rows separated by newlines.
 * Leading/trailing blank lines are stripped.
 * Cols/rows derived from content (no header needed).
 *
 * Multi-tile objects:
 * - Anchor char (e.g., 'B', 'C') marks top-left cell
 * - '+' marks continuation cells
 * - Continuation cells reference anchor via multiTileAnchor
 */
export function parseTilemap(ascii: string, tileSize: number): { grid: GridModel<TileCell>; meta: MapData } {
  const lines = ascii.split('\n').filter(line => line.length > 0);
  const rows = lines.length;
  const cols = Math.max(...lines.map(l => l.length));

  const grid = new GridModel<TileCell>(rows, cols, tileSize, 0);
  const spawnPoints: Array<{ r: number; c: number }> = [];
  const enemySpawns: Array<{ r: number; c: number }> = [];
  const processedCells = new Set<string>(); // Track cells already filled by multi-tile objects

  for (let r = 0; r < rows; r++) {
    const line = lines[r];
    for (let c = 0; c < cols; c++) {
      const cellKey = `${r},${c}`;
      if (processedCells.has(cellKey)) continue; // Skip cells already claimed by multi-tile object

      const ch = c < line.length ? line[c] : '.';

      // Handle continuation cells (backtrack to find anchor)
      if (ch === MAP_CONFIG.MULTI_TILE.continuationChar) {
        const anchor = findAnchorCell(lines, r, c, processedCells);
        if (anchor) {
          const anchorDef = CHAR_MAP[anchor.char];
          grid.set(r, c, {
            ground: anchorDef.ground,
            object: ObjectId.NONE,
            multiTileAnchor: { r: anchor.r, c: anchor.c },
          });
          processedCells.add(cellKey);
        } else {
          // No anchor found — treat as empty
          grid.set(r, c, { ...DEFAULT_CELL });
        }
        continue;
      }

      // Track spawn points
      if (ch === SPAWN_CHAR) {
        spawnPoints.push({ r, c });
      } else if (ch === ENEMY_SPAWN_CHAR) {
        enemySpawns.push({ r, c });
      }

      // Get tile definition
      const def = CHAR_MAP[ch];
      if (!def) {
        grid.set(r, c, { ...DEFAULT_CELL });
        continue;
      }

      const objectDef = OBJECT_DEFS[def.object];
      const gridSpan = objectDef.gridSpan ?? { w: 1, h: 1 };
      const orientations = objectDef.orientations ?? [0];

      // Pick rotation (deterministic hash based on position)
      const rotation = orientations[((r * 31 + c * 17) >>> 0) % orientations.length];

      // Set anchor cell
      grid.set(r, c, {
        ground: def.ground,
        object: def.object,
        objectRotation: rotation,
      });
      processedCells.add(cellKey);

      // Mark continuation cells for multi-tile objects
      if (gridSpan.w > 1 || gridSpan.h > 1) {
        const occupiedCells = getOccupiedCells(r, c, gridSpan, rotation);
        for (const { r: nr, c: nc } of occupiedCells) {
          if (nr === r && nc === c) continue; // Skip anchor (already set)
          if (nr >= rows || nc >= cols) continue;
          const contKey = `${nr},${nc}`;
          grid.set(nr, nc, {
            ground: def.ground,
            object: ObjectId.NONE,
            multiTileAnchor: { r, c },
          });
          processedCells.add(contKey);
        }
      }
    }
  }

  return {
    grid,
    meta: { rows, cols, spawnPoints, enemySpawns },
  };
}

/**
 * Find the anchor cell for a continuation marker by backtracking up/left.
 * Returns the anchor position and character, or null if not found.
 */
function findAnchorCell(
  lines: string[],
  r: number,
  c: number,
  processedCells: Set<string>,
): { r: number; c: number; char: string } | null {
  const CONT = MAP_CONFIG.MULTI_TILE.continuationChar;

  // Search up
  for (let sr = r - 1; sr >= 0; sr--) {
    const ch = lines[sr][c] ?? '.';
    if (ch !== CONT) {
      const def = CHAR_MAP[ch];
      if (def && def.object !== ObjectId.NONE) {
        return { r: sr, c, char: ch };
      }
      break;
    }
  }

  // Search left
  for (let sc = c - 1; sc >= 0; sc--) {
    const ch = lines[r][sc] ?? '.';
    if (ch !== CONT) {
      const def = CHAR_MAP[ch];
      if (def && def.object !== ObjectId.NONE) {
        return { r, c: sc, char: ch };
      }
      break;
    }
  }

  return null;
}
