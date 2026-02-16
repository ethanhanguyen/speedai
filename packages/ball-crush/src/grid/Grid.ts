import type { BallColor } from '../components/BallData.js';
import { getCellTypeDef } from '../config/CellTypes.js';

export interface ObstacleData {
  type: string;   // key into CELL_TYPES registry
  hp: number;
}

export interface Cell {
  color: BallColor | null;
  special: 'none' | 'striped_h' | 'striped_v' | 'bomb' | 'rainbow';
  entityId: number;
  obstacle?: ObstacleData;
}

// Board layout constants
export const ROWS = 9;
export const COLS = 9;
export const CELL_SIZE = 44;
export const CELL_GAP = 2;
export const BOARD_X = 8;
export const BOARD_Y = 200;
export const BOARD_W = COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP; // 414
export const BOARD_H = ROWS * (CELL_SIZE + CELL_GAP) - CELL_GAP; // 414
export const BALL_SPAWN_OFFSET = -270; // Spawn new balls above viewport

export class Grid {
  cells: (Cell | null)[][] = [];

  constructor() {
    this.clear();
  }

  clear(): void {
    this.cells = [];
    for (let r = 0; r < ROWS; r++) {
      this.cells[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.cells[r][c] = null;
      }
    }
  }

  getCell(r: number, c: number): Cell | null {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return this.cells[r][c];
  }

  setCell(r: number, c: number, cell: Cell | null): void {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      this.cells[r][c] = cell;
    }
  }

  /** Place obstacles onto the grid from level config. Call before fillRandom(). */
  initObstacles(obstacles: { type: string; r: number; c: number; hp: number }[]): void {
    for (const obs of obstacles) {
      const def = getCellTypeDef(obs.type);
      if (!def) continue;
      const obstacle: ObstacleData = { type: obs.type, hp: obs.hp };
      if (def.containsBall) {
        // Ball underneath — will be filled by fillRandom()
        // Mark cell with obstacle so fillRandom knows to add a ball here
        this.cells[obs.r][obs.c] = { color: null, special: 'none', entityId: -1, obstacle };
      } else {
        // Solid obstacle — no ball (e.g. stone)
        this.cells[obs.r][obs.c] = { color: null, special: 'none', entityId: -1, obstacle };
      }
    }
  }

  /** Convert grid row/col to screen pixel center. */
  gridToScreen(r: number, c: number): { x: number; y: number } {
    return {
      x: BOARD_X + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
      y: BOARD_Y + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
    };
  }

  /** Convert screen pixel to grid row/col (or null if outside). */
  screenToGrid(sx: number, sy: number): { row: number; col: number } | null {
    const c = Math.floor((sx - BOARD_X) / (CELL_SIZE + CELL_GAP));
    const r = Math.floor((sy - BOARD_Y) / (CELL_SIZE + CELL_GAP));
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    // Check we're actually within the cell (not in the gap)
    const localX = (sx - BOARD_X) % (CELL_SIZE + CELL_GAP);
    const localY = (sy - BOARD_Y) % (CELL_SIZE + CELL_GAP);
    if (localX > CELL_SIZE || localY > CELL_SIZE) return null;
    return { row: r, col: c };
  }

  /** Fill the board randomly with no pre-existing matches. Skips solid obstacle cells. */
  fillRandom(colors: BallColor[]): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const existing = this.cells[r][c];
        // Solid obstacle (no ball) — skip
        if (existing?.obstacle) {
          const def = getCellTypeDef(existing.obstacle.type);
          if (def && !def.containsBall) continue;
          // containsBall obstacle — fill with a random ball + keep obstacle
          let color: BallColor;
          let attempts = 0;
          do {
            color = colors[Math.floor(Math.random() * colors.length)];
            attempts++;
          } while (attempts < 50 && this.wouldMatch(r, c, color));
          existing.color = color;
          continue;
        }

        let color: BallColor;
        let attempts = 0;
        do {
          color = colors[Math.floor(Math.random() * colors.length)];
          attempts++;
        } while (attempts < 50 && this.wouldMatch(r, c, color));

        this.cells[r][c] = { color, special: 'none', entityId: -1 };
      }
    }
  }

  /** Check if a cell is swappable (not an obstacle or obstacle allows swapping). */
  isCellSwappable(r: number, c: number): boolean {
    const cell = this.getCell(r, c);
    if (!cell) return false;
    if (cell.obstacle) {
      const def = getCellTypeDef(cell.obstacle.type);
      return def ? def.swappable : false;
    }
    return true;
  }

  /** Check if placing `color` at (r,c) would create a 3+ match. */
  private wouldMatch(r: number, c: number, color: BallColor): boolean {
    // Check horizontal
    let hCount = 1;
    if (c >= 1 && this.matchableColorAt(r, c - 1) === color) {
      hCount++;
      if (c >= 2 && this.matchableColorAt(r, c - 2) === color) hCount++;
    }
    if (hCount >= 3) return true;

    // Check vertical
    let vCount = 1;
    if (r >= 1 && this.matchableColorAt(r - 1, c) === color) {
      vCount++;
      if (r >= 2 && this.matchableColorAt(r - 2, c) === color) vCount++;
    }
    if (vCount >= 3) return true;

    // Check diagonal (\)
    let d1Count = 1;
    if (r >= 1 && c >= 1 && this.matchableColorAt(r - 1, c - 1) === color) {
      d1Count++;
      if (r >= 2 && c >= 2 && this.matchableColorAt(r - 2, c - 2) === color) d1Count++;
    }
    if (d1Count >= 3) return true;

    // Check diagonal (/)
    let d2Count = 1;
    if (r >= 1 && c + 1 < COLS && this.matchableColorAt(r - 1, c + 1) === color) {
      d2Count++;
      if (r >= 2 && c + 2 < COLS && this.matchableColorAt(r - 2, c + 2) === color) d2Count++;
    }
    if (d2Count >= 3) return true;

    return false;
  }

  /** Get color of cell only if it can participate in matches (no non-matchable obstacles). */
  private matchableColorAt(r: number, c: number): BallColor | null {
    const cell = this.cells[r]?.[c];
    if (!cell?.color) return null;
    if (cell.obstacle) {
      const def = getCellTypeDef(cell.obstacle.type);
      if (def && !def.matchable) return null;
    }
    return cell.color;
  }

  /** Check if two cells are adjacent (4-directional). */
  isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  /** Swap two cells in the grid model. */
  swap(r1: number, c1: number, r2: number, c2: number): void {
    const temp = this.cells[r1][c1];
    this.cells[r1][c1] = this.cells[r2][c2];
    this.cells[r2][c2] = temp;
  }

  /** Check if any valid moves exist on the board. */
  hasValidMoves(colors: BallColor[]): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.isCellSwappable(r, c)) continue;
        // Try swap right
        if (c + 1 < COLS && this.isCellSwappable(r, c + 1)) {
          this.swap(r, c, r, c + 1);
          if (this.hasMatchAt(r, c) || this.hasMatchAt(r, c + 1)) {
            this.swap(r, c, r, c + 1);
            return true;
          }
          this.swap(r, c, r, c + 1);
        }
        // Try swap down
        if (r + 1 < ROWS && this.isCellSwappable(r + 1, c)) {
          this.swap(r, c, r + 1, c);
          if (this.hasMatchAt(r, c) || this.hasMatchAt(r + 1, c)) {
            this.swap(r, c, r + 1, c);
            return true;
          }
          this.swap(r, c, r + 1, c);
        }
      }
    }
    return false;
  }

  /** Find one valid move for hint system. Returns null if no valid moves. */
  findValidMove(): { r1: number; c1: number; r2: number; c2: number } | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.isCellSwappable(r, c)) continue;
        // Try swap right
        if (c + 1 < COLS && this.isCellSwappable(r, c + 1)) {
          this.swap(r, c, r, c + 1);
          if (this.hasMatchAt(r, c) || this.hasMatchAt(r, c + 1)) {
            this.swap(r, c, r, c + 1);
            return { r1: r, c1: c, r2: r, c2: c + 1 };
          }
          this.swap(r, c, r, c + 1);
        }
        // Try swap down
        if (r + 1 < ROWS && this.isCellSwappable(r + 1, c)) {
          this.swap(r, c, r + 1, c);
          if (this.hasMatchAt(r, c) || this.hasMatchAt(r + 1, c)) {
            this.swap(r, c, r + 1, c);
            return { r1: r, c1: c, r2: r + 1, c2: c };
          }
          this.swap(r, c, r + 1, c);
        }
      }
    }
    return null;
  }

  /** Check if position (r,c) is part of any 3+ match (H, V, or diagonal). */
  private hasMatchAt(r: number, c: number): boolean {
    const color = this.matchableColorAt(r, c);
    if (!color) return false;

    // Horizontal
    let count = 1;
    for (let i = c - 1; i >= 0 && this.matchableColorAt(r, i) === color; i--) count++;
    for (let i = c + 1; i < COLS && this.matchableColorAt(r, i) === color; i++) count++;
    if (count >= 3) return true;

    // Vertical
    count = 1;
    for (let i = r - 1; i >= 0 && this.matchableColorAt(i, c) === color; i--) count++;
    for (let i = r + 1; i < ROWS && this.matchableColorAt(i, c) === color; i++) count++;
    if (count >= 3) return true;

    // Diagonal (\)
    count = 1;
    for (let i = 1; r - i >= 0 && c - i >= 0 && this.matchableColorAt(r - i, c - i) === color; i++) count++;
    for (let i = 1; r + i < ROWS && c + i < COLS && this.matchableColorAt(r + i, c + i) === color; i++) count++;
    if (count >= 3) return true;

    // Diagonal (/)
    count = 1;
    for (let i = 1; r - i >= 0 && c + i < COLS && this.matchableColorAt(r - i, c + i) === color; i++) count++;
    for (let i = 1; r + i < ROWS && c - i >= 0 && this.matchableColorAt(r + i, c - i) === color; i++) count++;
    if (count >= 3) return true;

    return false;
  }

  /** Reshuffle the board preserving specials. Obstacles stay in place. */
  reshuffle(colors: BallColor[]): void {
    // Collect all non-null, non-obstacle cells for shuffling
    const movableCells: { cell: Cell; r: number; c: number }[] = [];
    const obstaclePositions = new Set<string>();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.cells[r][c];
        if (cell?.obstacle) {
          obstaclePositions.add(`${r},${c}`);
        } else if (cell) {
          movableCells.push({ cell, r, c });
        }
      }
    }

    // Fisher-Yates shuffle on movable cells only
    for (let i = movableCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tempCell = movableCells[i].cell;
      movableCells[i].cell = movableCells[j].cell;
      movableCells[j].cell = tempCell;
    }

    // Place back — only non-obstacle positions
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (obstaclePositions.has(`${r},${c}`)) continue;
        this.cells[r][c] = movableCells[idx++]?.cell ?? null;
      }
    }

    // If still no valid moves, just regenerate (keeping obstacles)
    if (!this.hasValidMoves(colors)) {
      // Clear only non-obstacle cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!obstaclePositions.has(`${r},${c}`)) {
            this.cells[r][c] = null;
          }
        }
      }
      this.fillRandom(colors);
    }
  }
}
