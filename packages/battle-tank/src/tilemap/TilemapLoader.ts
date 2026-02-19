import { GridModel } from '@speedai/game-engine';
import type { TileCell, MapData } from './types.js';
import { CHAR_MAP } from './TileRegistry.js';
import { TileId, ObjectId } from './types.js';

const SPAWN_CHAR = 'P';
const ENEMY_SPAWN_CHAR = 'S';
const DEFAULT_CELL: TileCell = { ground: TileId.GRASS, object: ObjectId.NONE };

/**
 * Parse an ASCII map string into a GridModel<TileCell> + metadata.
 *
 * Format: one char per cell, rows separated by newlines.
 * Leading/trailing blank lines are stripped.
 * Cols/rows derived from content (no header needed).
 */
export function parseTilemap(ascii: string, tileSize: number): { grid: GridModel<TileCell>; meta: MapData } {
  const lines = ascii.split('\n').filter(line => line.length > 0);
  const rows = lines.length;
  const cols = Math.max(...lines.map(l => l.length));

  const grid = new GridModel<TileCell>(rows, cols, tileSize, 0);
  const spawnPoints: Array<{ r: number; c: number }> = [];
  const enemySpawns: Array<{ r: number; c: number }> = [];

  for (let r = 0; r < rows; r++) {
    const line = lines[r];
    for (let c = 0; c < cols; c++) {
      const ch = c < line.length ? line[c] : '.';

      if (ch === SPAWN_CHAR) {
        spawnPoints.push({ r, c });
      } else if (ch === ENEMY_SPAWN_CHAR) {
        enemySpawns.push({ r, c });
      }

      const def = CHAR_MAP[ch];
      grid.set(r, c, def ? { ground: def.ground, object: def.object } : { ...DEFAULT_CELL });
    }
  }

  return {
    grid,
    meta: { rows, cols, spawnPoints, enemySpawns },
  };
}
