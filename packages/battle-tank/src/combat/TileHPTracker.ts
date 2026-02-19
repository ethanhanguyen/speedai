import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';

/**
 * Parallel HP tracker for destructible tile objects.
 * Initialized from grid + OBJECT_DEFS.hp. When HP reaches 0,
 * clears the object from the grid (ground tile remains).
 */
export class TileHPTracker {
  private hp: Map<string, number> = new Map();

  private static key(r: number, c: number): string {
    return `${r},${c}`;
  }

  /** Scan grid and store initial HP for all destructible objects. */
  init(grid: GridModel<TileCell>): void {
    this.hp.clear();
    for (const [r, c, cell] of grid) {
      if (cell && cell.object !== ObjectId.NONE) {
        const def = OBJECT_DEFS[cell.object];
        if (def.destructible) {
          this.hp.set(TileHPTracker.key(r, c), def.hp);
        }
      }
    }
  }

  /** Get remaining HP at a tile. Returns 0 for non-tracked tiles. */
  getHP(r: number, c: number): number {
    return this.hp.get(TileHPTracker.key(r, c)) ?? 0;
  }

  /** Returns true if this tile has a destructible object being tracked. */
  isDestructible(r: number, c: number): boolean {
    return this.hp.has(TileHPTracker.key(r, c));
  }

  /**
   * Apply damage to a tile. Returns the remaining HP.
   * If HP reaches 0, clears the object from the grid.
   */
  damage(r: number, c: number, amount: number, grid: GridModel<TileCell>): number {
    const k = TileHPTracker.key(r, c);
    const current = this.hp.get(k);
    if (current === undefined) return 0;

    const remaining = Math.max(0, current - amount);
    if (remaining <= 0) {
      this.hp.delete(k);
      const cell = grid.get(r, c);
      if (cell) {
        cell.object = ObjectId.NONE;
      }
    } else {
      this.hp.set(k, remaining);
    }
    return remaining;
  }
}
