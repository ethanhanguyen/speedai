import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from './types.js';

/**
 * Centralized utilities for multi-tile object operations.
 * Single source of truth for rotation-aware dimension calculation,
 * cell enumeration, and anchor resolution.
 */

/**
 * Get dimensions accounting for rotation.
 * 90° and 270° rotations swap width and height.
 */
export function getRotatedDimensions(
  gridSpan: { w: number; h: number },
  rotation: number,
): { w: number; h: number } {
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  // 90° and 270° swap dimensions
  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return { w: gridSpan.h, h: gridSpan.w };
  }

  // 0° and 180° keep original dimensions
  return { w: gridSpan.w, h: gridSpan.h };
}

/**
 * Get all grid cells occupied by a multi-tile object.
 * Returns array of {r, c} coordinates including the anchor.
 *
 * Note: Currently assumes axis-aligned placement (rotation affects visual only,
 * not grid footprint). For true rotated grid occupancy, this would need to
 * calculate based on rotated dimensions.
 */
export function getOccupiedCells(
  anchorR: number,
  anchorC: number,
  gridSpan: { w: number; h: number },
  rotation: number = 0,
): Array<{ r: number; c: number }> {
  const cells: Array<{ r: number; c: number }> = [];

  // Grid footprint uses original gridSpan (not rotated)
  // Visual rotation happens in renderer, but grid cells remain axis-aligned
  for (let dr = 0; dr < gridSpan.h; dr++) {
    for (let dc = 0; dc < gridSpan.w; dc++) {
      cells.push({ r: anchorR + dr, c: anchorC + dc });
    }
  }

  return cells;
}

/**
 * Resolve anchor coordinates from any cell (continuation or anchor).
 * If cell is a continuation, returns anchor coords; otherwise returns input coords.
 */
export function resolveAnchor(
  r: number,
  c: number,
  grid: GridModel<TileCell>,
): { r: number; c: number } {
  const cell = grid.get(r, c);
  if (cell?.multiTileAnchor) {
    return { r: cell.multiTileAnchor.r, c: cell.multiTileAnchor.c };
  }
  return { r, c };
}

/**
 * Check if a cell is a continuation cell (not an anchor).
 */
export function isContinuationCell(cell: TileCell | null): boolean {
  return cell?.multiTileAnchor !== undefined;
}
