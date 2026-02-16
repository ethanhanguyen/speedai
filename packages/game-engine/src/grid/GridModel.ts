export enum NeighborDirection {
  FOUR_WAY = 'four_way',
  EIGHT_WAY = 'eight_way',
  HEX = 'hex',
}

export class GridModel<T> {
  readonly rows: number;
  readonly cols: number;
  readonly cellSize: number;
  readonly cellGap: number;
  private data = new Map<string, T>();

  constructor(rows: number, cols: number, cellSize: number, cellGap = 0) {
    this.rows = rows;
    this.cols = cols;
    this.cellSize = cellSize;
    this.cellGap = cellGap;
  }

  private key(r: number, c: number): string {
    return `${r},${c}`;
  }

  get(r: number, c: number): T | null {
    return this.data.get(this.key(r, c)) ?? null;
  }

  set(r: number, c: number, val: T): void {
    this.data.set(this.key(r, c), val);
  }

  clear(r: number, c: number): void {
    this.data.delete(this.key(r, c));
  }

  fill(fn: (r: number, c: number) => T): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.set(r, c, fn(r, c));
      }
    }
  }

  forEach(fn: (val: T, r: number, c: number) => void): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.get(r, c);
        if (val !== null) {
          fn(val, r, c);
        }
      }
    }
  }

  map<U>(fn: (val: T, r: number, c: number) => U): GridModel<U> {
    const result = new GridModel<U>(this.rows, this.cols, this.cellSize, this.cellGap);
    this.forEach((val, r, c) => {
      result.set(r, c, fn(val, r, c));
    });
    return result;
  }

  screenToGrid(x: number, y: number, offsetX = 0, offsetY = 0): { r: number; c: number } | null {
    const step = this.cellSize + this.cellGap;
    const localX = x - offsetX;
    const localY = y - offsetY;

    const c = Math.floor(localX / step);
    const r = Math.floor(localY / step);

    if (!this.isValid(r, c)) {
      return null;
    }

    return { r, c };
  }

  gridToScreen(r: number, c: number, offsetX = 0, offsetY = 0): { x: number; y: number } {
    const step = this.cellSize + this.cellGap;
    return {
      x: offsetX + c * step,
      y: offsetY + r * step,
    };
  }

  isValid(r: number, c: number): boolean {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  getNeighbors(r: number, c: number, direction: NeighborDirection = NeighborDirection.FOUR_WAY): Array<{ r: number; c: number }> {
    const neighbors: Array<{ r: number; c: number }> = [];

    if (direction === NeighborDirection.FOUR_WAY) {
      const offsets = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of offsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (this.isValid(nr, nc)) {
          neighbors.push({ r: nr, c: nc });
        }
      }
    } else if (direction === NeighborDirection.EIGHT_WAY) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (this.isValid(nr, nc)) {
            neighbors.push({ r: nr, c: nc });
          }
        }
      }
    } else if (direction === NeighborDirection.HEX) {
      const evenRow = r % 2 === 0;
      const offsets = evenRow
        ? [
            [-1, -1],
            [-1, 0],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
          ]
        : [
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, 0],
            [1, 1],
          ];
      for (const [dr, dc] of offsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (this.isValid(nr, nc)) {
          neighbors.push({ r: nr, c: nc });
        }
      }
    }

    return neighbors;
  }

  adjacentTo(a: { r: number; c: number }, b: { r: number; c: number }, direction: NeighborDirection = NeighborDirection.FOUR_WAY): boolean {
    const neighbors = this.getNeighbors(a.r, a.c, direction);
    return neighbors.some(n => n.r === b.r && n.c === b.c);
  }

  *[Symbol.iterator](): Iterator<[number, number, T]> {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.get(r, c);
        if (val !== null) {
          yield [r, c, val];
        }
      }
    }
  }
}
