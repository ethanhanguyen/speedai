import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { resolveAnchor, getOccupiedCells } from '../tilemap/MultiTileUtils.js';
import { getObjectByName } from '../config/ObjectDatabase.js';

/**
 * Parallel HP tracker for destructible tile objects.
 * Initialized from grid + OBJECT_DEFS.hp. When HP reaches 0,
 * clears the object from the grid (ground tile remains).
 *
 * For multi-tile objects:
 * - HP is tracked only on the anchor cell
 * - Damage to continuation cells is forwarded to the anchor
 * - When destroyed, all continuation cells are cleared
 */
export class TileHPTracker {
  private hp: Map<string, number> = new Map();

  private static key(r: number, c: number): string {
    return `${r},${c}`;
  }

  /**
   * Scan grid and store initial HP for all destructible objects (anchor cells only).
   * Skips objects with interactionType — those are managed by mirror ECS entities.
   */
  init(grid: GridModel<TileCell>): void {
    this.hp.clear();
    for (const [r, c, cell] of grid) {
      if (cell && cell.object !== ObjectId.NONE && !cell.multiTileAnchor) {
        const def = OBJECT_DEFS[cell.object];
        if (!def.destructible) continue;
        // Skip interactive objects — their HP is managed by mirror entities
        const objData = getObjectByName(cell.object);
        if (objData?.interactionType) continue;
        this.hp.set(TileHPTracker.key(r, c), def.hp);
      }
    }
  }

  /** Get remaining HP at a tile (resolves anchor if continuation cell). */
  getHP(r: number, c: number, grid: GridModel<TileCell>): number {
    const anchor = resolveAnchor(r, c, grid);
    return this.hp.get(TileHPTracker.key(anchor.r, anchor.c)) ?? 0;
  }

  /** Returns true if this tile has a destructible object being tracked (resolves anchor). */
  isDestructible(r: number, c: number, grid: GridModel<TileCell>): boolean {
    const anchor = resolveAnchor(r, c, grid);
    return this.hp.has(TileHPTracker.key(anchor.r, anchor.c));
  }

  /**
   * Apply damage to a tile. Returns the remaining HP.
   * If HP reaches 0, clears the object from the grid (including all continuation cells).
   */
  damage(r: number, c: number, amount: number, grid: GridModel<TileCell>): number {
    const anchor = resolveAnchor(r, c, grid);
    const k = TileHPTracker.key(anchor.r, anchor.c);
    const current = this.hp.get(k);
    if (current === undefined) return 0;

    const remaining = Math.max(0, current - amount);
    if (remaining <= 0) {
      this.hp.delete(k);
      this.clearMultiTileObject(anchor.r, anchor.c, grid);
    } else {
      this.hp.set(k, remaining);
    }
    return remaining;
  }

  /**
   * Clear a multi-tile object from the grid (anchor + all continuation cells).
   */
  private clearMultiTileObject(anchorR: number, anchorC: number, grid: GridModel<TileCell>): void {
    const anchorCell = grid.get(anchorR, anchorC);
    if (!anchorCell) return;

    const def = OBJECT_DEFS[anchorCell.object];
    const gridSpan = def.gridSpan ?? { w: 1, h: 1 };
    const rotation = anchorCell.objectRotation ?? 0;

    // Get all occupied cells and clear them
    const occupiedCells = getOccupiedCells(anchorR, anchorC, gridSpan, rotation);
    for (const { r, c } of occupiedCells) {
      const cell = grid.get(r, c);
      if (cell) {
        cell.object = ObjectId.NONE;
        cell.objectRotation = undefined;
        cell.multiTileAnchor = undefined;
      }
    }
  }
}
