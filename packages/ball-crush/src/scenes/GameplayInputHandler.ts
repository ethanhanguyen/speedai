import type { Grid } from '../grid/Grid.js';
import type { AnimationManager } from '../rendering/AnimationManager.js';

export type InputAction =
  | { type: 'none' }
  | { type: 'select'; r: number; c: number }
  | { type: 'deselect'; r: number; c: number }
  | { type: 'swap'; r1: number; c1: number; r2: number; c2: number };

export class GameplayInputHandler {
  private selectedCell: { r: number; c: number } | null = null;
  private wasPointerDown = false;
  selectionTime = 0;

  handleInput(
    input: any,
    grid: Grid,
    entityMap: (number | null)[][],
    animManager: AnimationManager,
  ): InputAction {
    if (!input) return { type: 'none' };

    const pointer = input.getPointer();
    const justPressed = pointer.down && !this.wasPointerDown;
    this.wasPointerDown = pointer.down;

    if (!justPressed) return { type: 'none' };

    const cell = grid.screenToGrid(pointer.x, pointer.y);
    if (!cell) {
      this.clearSelection(entityMap, animManager);
      return { type: 'none' };
    }

    if (!this.selectedCell) {
      // First selection — reject non-swappable cells (obstacles)
      if (grid.getCell(cell.row, cell.col)?.color && grid.isCellSwappable(cell.row, cell.col)) {
        this.selectedCell = { r: cell.row, c: cell.col };
        this.selectionTime = 0;
        const eid = entityMap[cell.row][cell.col];
        if (eid !== null) animManager.animatePulse(eid);
        return { type: 'select', r: cell.row, c: cell.col };
      }
    } else if (cell.row === this.selectedCell.r && cell.col === this.selectedCell.c) {
      // Deselect
      const eid = entityMap[cell.row][cell.col];
      if (eid !== null) animManager.stopPulse(eid);
      const r = this.selectedCell.r;
      const c = this.selectedCell.c;
      this.selectedCell = null;
      return { type: 'deselect', r, c };
    } else if (grid.isAdjacent(this.selectedCell.r, this.selectedCell.c, cell.row, cell.col)) {
      // Swap with adjacent — reject if target is not swappable
      if (!grid.isCellSwappable(cell.row, cell.col)) {
        return { type: 'none' };
      }
      const eid = entityMap[this.selectedCell.r][this.selectedCell.c];
      if (eid !== null) animManager.stopPulse(eid);
      const r1 = this.selectedCell.r;
      const c1 = this.selectedCell.c;
      const r2 = cell.row;
      const c2 = cell.col;
      this.selectedCell = null;
      return { type: 'swap', r1, c1, r2, c2 };
    } else {
      // Select new cell — reject non-swappable
      const oldEid = entityMap[this.selectedCell.r][this.selectedCell.c];
      if (oldEid !== null) animManager.stopPulse(oldEid);
      if (grid.getCell(cell.row, cell.col)?.color && grid.isCellSwappable(cell.row, cell.col)) {
        this.selectedCell = { r: cell.row, c: cell.col };
        this.selectionTime = 0;
        const eid = entityMap[cell.row][cell.col];
        if (eid !== null) animManager.animatePulse(eid);
        return { type: 'select', r: cell.row, c: cell.col };
      } else {
        this.selectedCell = null;
        return { type: 'none' };
      }
    }

    return { type: 'none' };
  }

  clearSelection(entityMap: (number | null)[][], animManager: AnimationManager): void {
    if (this.selectedCell) {
      const eid = entityMap[this.selectedCell.r][this.selectedCell.c];
      if (eid !== null) animManager.stopPulse(eid);
    }
    this.selectedCell = null;
  }

  getSelectedCell(): { r: number; c: number } | null {
    return this.selectedCell;
  }
}
