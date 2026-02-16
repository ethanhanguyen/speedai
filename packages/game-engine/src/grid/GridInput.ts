import type { IInputManager } from '../core/types.js';
import type { GridModel } from './GridModel.js';

export interface CellTapEvent {
  r: number;
  c: number;
}

export interface CellSwipeEvent {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface CellDragEvent {
  r: number;
  c: number;
  startR: number;
  startC: number;
}

export type CellTapCallback = (event: CellTapEvent) => void;
export type CellSwipeCallback = (event: CellSwipeEvent) => void;
export type CellDragCallback = (event: CellDragEvent) => void;

export interface GridInputConfig {
  /** Grid offset in screen coordinates */
  offsetX?: number;
  offsetY?: number;
  /** Require adjacency for swipe events */
  requireAdjacent?: boolean;
}

export class GridInput<T> {
  private selectedCell: { r: number; c: number } | null = null;
  private wasPointerDown = false;
  private dragStartCell: { r: number; c: number } | null = null;

  private tapCallbacks: CellTapCallback[] = [];
  private swipeCallbacks: CellSwipeCallback[] = [];
  private dragCallbacks: CellDragCallback[] = [];

  constructor(
    private input: IInputManager,
    private grid: GridModel<T>,
    private config: GridInputConfig = {},
  ) {
    this.config.offsetX ??= 0;
    this.config.offsetY ??= 0;
    this.config.requireAdjacent ??= true;
  }

  /** Register callback for cell tap events */
  onCellTap(callback: CellTapCallback): void {
    this.tapCallbacks.push(callback);
  }

  /** Register callback for cell swipe events */
  onCellSwipe(callback: CellSwipeCallback): void {
    this.swipeCallbacks.push(callback);
  }

  /** Register callback for cell drag events */
  onCellDrag(callback: CellDragCallback): void {
    this.dragCallbacks.push(callback);
  }

  /** Update input state (call each frame) */
  update(): void {
    const pointer = this.input.getPointer();
    const justPressed = pointer.down && !this.wasPointerDown;
    const justReleased = !pointer.down && this.wasPointerDown;

    if (justPressed) {
      const cell = this.grid.screenToGrid(pointer.x, pointer.y, this.config.offsetX, this.config.offsetY);
      if (cell) {
        this.dragStartCell = { r: cell.r, c: cell.c };
        this.emitTap(cell.r, cell.c);
      }
    }

    if (pointer.down && this.dragStartCell) {
      const cell = this.grid.screenToGrid(pointer.x, pointer.y, this.config.offsetX, this.config.offsetY);
      if (cell && (cell.r !== this.dragStartCell.r || cell.c !== this.dragStartCell.c)) {
        this.emitDrag(cell.r, cell.c);

        // Check for swipe
        if (this.isValidSwipe(this.dragStartCell, cell)) {
          this.emitSwipe(this.dragStartCell, cell);
          this.dragStartCell = null;
        }
      }
    }

    if (justReleased) {
      this.dragStartCell = null;
    }

    this.wasPointerDown = pointer.down;
  }

  /** Get currently selected cell */
  getSelectedCell(): { r: number; c: number } | null {
    return this.selectedCell;
  }

  /** Set selected cell */
  setSelectedCell(r: number, c: number): void {
    this.selectedCell = { r, c };
  }

  /** Clear selection */
  clearSelection(): void {
    this.selectedCell = null;
  }

  /** Check if two cells are adjacent */
  isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return this.grid.adjacentTo({ r: r1, c: c1 }, { r: r2, c: c2 });
  }

  private isValidSwipe(
    from: { r: number; c: number },
    to: { r: number; c: number },
  ): boolean {
    if (!this.config.requireAdjacent) return true;
    return this.isAdjacent(from.r, from.c, to.r, to.c);
  }

  private emitTap(r: number, c: number): void {
    for (const callback of this.tapCallbacks) {
      callback({ r, c });
    }
  }

  private emitSwipe(from: { r: number; c: number }, to: { r: number; c: number }): void {
    const direction = this.getSwipeDirection(from, to);
    for (const callback of this.swipeCallbacks) {
      callback({ fromR: from.r, fromC: from.c, toR: to.r, toC: to.c, direction });
    }
  }

  private emitDrag(r: number, c: number): void {
    if (!this.dragStartCell) return;
    for (const callback of this.dragCallbacks) {
      callback({ r, c, startR: this.dragStartCell.r, startC: this.dragStartCell.c });
    }
  }

  private getSwipeDirection(
    from: { r: number; c: number },
    to: { r: number; c: number },
  ): 'up' | 'down' | 'left' | 'right' {
    const dr = to.r - from.r;
    const dc = to.c - from.c;

    if (Math.abs(dr) > Math.abs(dc)) {
      return dr > 0 ? 'down' : 'up';
    } else {
      return dc > 0 ? 'right' : 'left';
    }
  }
}
