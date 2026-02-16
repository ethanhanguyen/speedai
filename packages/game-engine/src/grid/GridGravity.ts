import type { GridModel } from './GridModel.js';

export type GravityDirection = 'down' | 'up' | 'left' | 'right';

export interface FallMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

export interface RefillEntry {
  r: number;
  c: number;
  /** Negative offset for spawning above/outside grid */
  spawnOffset?: number;
}

export class GridGravity {
  /**
   * Compact the grid by collapsing empty cells in the specified direction.
   * Returns array of moves describing how cells fell.
   */
  static compact<T>(grid: GridModel<T>, direction: GravityDirection = 'down'): FallMove[] {
    const moves: FallMove[] = [];

    if (direction === 'down') {
      // Process each column bottom-to-top
      for (let c = 0; c < grid.cols; c++) {
        let writeRow = grid.rows - 1;
        for (let r = grid.rows - 1; r >= 0; r--) {
          const cell = grid.get(r, c);
          if (cell !== null) {
            if (r !== writeRow) {
              grid.set(writeRow, c, cell);
              grid.clear(r, c);
              moves.push({ fromR: r, fromC: c, toR: writeRow, toC: c });
            }
            writeRow--;
          }
        }
      }
    } else if (direction === 'up') {
      // Process each column top-to-bottom
      for (let c = 0; c < grid.cols; c++) {
        let writeRow = 0;
        for (let r = 0; r < grid.rows; r++) {
          const cell = grid.get(r, c);
          if (cell !== null) {
            if (r !== writeRow) {
              grid.set(writeRow, c, cell);
              grid.clear(r, c);
              moves.push({ fromR: r, fromC: c, toR: writeRow, toC: c });
            }
            writeRow++;
          }
        }
      }
    } else if (direction === 'left') {
      // Process each row left-to-right
      for (let r = 0; r < grid.rows; r++) {
        let writeCol = 0;
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.get(r, c);
          if (cell !== null) {
            if (c !== writeCol) {
              grid.set(r, writeCol, cell);
              grid.clear(r, c);
              moves.push({ fromR: r, fromC: c, toR: r, toC: writeCol });
            }
            writeCol++;
          }
        }
      }
    } else if (direction === 'right') {
      // Process each row right-to-left
      for (let r = 0; r < grid.rows; r++) {
        let writeCol = grid.cols - 1;
        for (let c = grid.cols - 1; c >= 0; c--) {
          const cell = grid.get(r, c);
          if (cell !== null) {
            if (c !== writeCol) {
              grid.set(r, writeCol, cell);
              grid.clear(r, c);
              moves.push({ fromR: r, fromC: c, toR: r, toC: writeCol });
            }
            writeCol--;
          }
        }
      }
    }

    return moves;
  }

  /**
   * Refill empty cells in the grid using the provided generator function.
   * Returns array of entries describing what was filled and where.
   */
  static refill<T>(
    grid: GridModel<T>,
    generator: (r: number, c: number) => T,
    direction: GravityDirection = 'down',
  ): RefillEntry[] {
    const entries: RefillEntry[] = [];

    if (direction === 'down') {
      // Fill from top
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          if (grid.get(r, c) === null) {
            const cell = generator(r, c);
            grid.set(r, c, cell);
            entries.push({ r, c, spawnOffset: -(grid.rows - r) });
          }
        }
      }
    } else if (direction === 'up') {
      // Fill from bottom
      for (let r = grid.rows - 1; r >= 0; r--) {
        for (let c = 0; c < grid.cols; c++) {
          if (grid.get(r, c) === null) {
            const cell = generator(r, c);
            grid.set(r, c, cell);
            entries.push({ r, c, spawnOffset: r + 1 });
          }
        }
      }
    } else if (direction === 'left') {
      // Fill from right
      for (let r = 0; r < grid.rows; r++) {
        for (let c = grid.cols - 1; c >= 0; c--) {
          if (grid.get(r, c) === null) {
            const cell = generator(r, c);
            grid.set(r, c, cell);
            entries.push({ r, c, spawnOffset: grid.cols - c });
          }
        }
      }
    } else if (direction === 'right') {
      // Fill from left
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          if (grid.get(r, c) === null) {
            const cell = generator(r, c);
            grid.set(r, c, cell);
            entries.push({ r, c, spawnOffset: -(c + 1) });
          }
        }
      }
    }

    return entries;
  }

  /**
   * Find all empty positions in the grid.
   */
  static findEmptyPositions<T>(grid: GridModel<T>): { r: number; c: number }[] {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.get(r, c) === null) {
          empty.push({ r, c });
        }
      }
    }
    return empty;
  }
}
