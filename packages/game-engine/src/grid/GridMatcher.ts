import type { GridModel } from './GridModel.js';

export type MatchPattern = 'line3' | 'line4' | 'line5' | 'L' | 'T' | 'cross';

export type ScanDirection = 'horizontal' | 'vertical' | 'diagonal';

export interface Match<T> {
  pattern: MatchPattern;
  positions: { r: number; c: number }[];
  /** Matched cells from the grid */
  cells?: T[];
  /** User-defined metadata extracted from matched cells */
  metadata?: any;
}

export interface PatternRule<T> {
  name: MatchPattern;
  /** Check if cell should participate in matching */
  matchable: (cell: T | null) => boolean;
  /** Check if two cells match each other */
  matches: (a: T, b: T) => boolean;
  /** Extract metadata for the match (e.g., reward, special type) */
  extractMetadata?: (positions: { r: number; c: number }[], cells: T[]) => any;
}

export interface GridMatcherConfig<T> {
  minMatchLength: number;
  directions: ScanDirection[];
  patterns: PatternRule<T>[];
}

type Dir = { dr: number; dc: number };

const H: Dir = { dr: 0, dc: 1 };
const V: Dir = { dr: 1, dc: 0 };

interface LineMatch<T> {
  positions: { r: number; c: number }[];
  cells: T[];
  dir: Dir;
  rule: PatternRule<T>;
  _merged?: boolean;
}

export class GridMatcher<T> {
  constructor(private config: GridMatcherConfig<T>) {}

  /** Detect all matches in the grid */
  detectMatches(grid: GridModel<T>): Match<T>[] {
    const matches: Match<T>[] = [];
    const used = Array.from({ length: grid.rows }, () => Array(grid.cols).fill(false));

    for (const rule of this.config.patterns) {
      const lines: LineMatch<T>[] = [];

      // Scan horizontal
      if (this.config.directions.includes('horizontal')) {
        lines.push(...this.findLines(grid, H, rule));
      }

      // Scan vertical
      if (this.config.directions.includes('vertical')) {
        lines.push(...this.findLines(grid, V, rule));
      }

      // Try to merge into L/T/cross patterns
      const merged = this.mergeIntoPatterns(lines, used, rule);
      matches.push(...merged);

      // Add remaining unmerged lines
      for (const line of lines) {
        if (line._merged) continue;
        const len = line.positions.length;
        const pattern: MatchPattern = len >= 5 ? 'line5' : len === 4 ? 'line4' : 'line3';
        matches.push({
          pattern,
          positions: line.positions,
          cells: line.cells,
          metadata: rule.extractMetadata?.(line.positions, line.cells),
        });
      }
    }

    return matches;
  }

  private findLines(grid: GridModel<T>, dir: Dir, rule: PatternRule<T>): LineMatch<T>[] {
    const results: LineMatch<T>[] = [];
    const visited = Array.from({ length: grid.rows }, () => Array(grid.cols).fill(false));

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (visited[r][c]) continue;
        const cell = grid.get(r, c);
        if (!rule.matchable(cell)) continue;

        const positions: { r: number; c: number }[] = [{ r, c }];
        const cells: T[] = [cell!];
        let nr = r + dir.dr;
        let nc = c + dir.dc;

        while (
          nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols
        ) {
          const nextCell = grid.get(nr, nc);
          if (!rule.matchable(nextCell) || !rule.matches(cell!, nextCell!)) break;

          positions.push({ r: nr, c: nc });
          cells.push(nextCell!);
          visited[nr][nc] = true;
          nr += dir.dr;
          nc += dir.dc;
        }
        visited[r][c] = true;

        if (positions.length >= this.config.minMatchLength) {
          results.push({ positions, cells, dir, rule });
        }
      }
    }
    return results;
  }

  private mergeIntoPatterns(lines: LineMatch<T>[], _used: boolean[][], rule: PatternRule<T>): Match<T>[] {
    const results: Match<T>[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i]._merged) continue;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j]._merged) continue;
        if (lines[i].rule !== lines[j].rule) continue;

        // Check if they're matchable
        if (!this.linesMatch(lines[i], lines[j], rule)) continue;

        // Find intersection
        const intersection = this.findIntersection(lines[i].positions, lines[j].positions);
        if (!intersection) continue;

        // Two lines intersect → L, T, or cross
        const combined = this.mergePositions(lines[i].positions, lines[j].positions);
        const allCells = [...lines[i].cells, ...lines[j].cells];
        const len1 = lines[i].positions.length;
        const len2 = lines[j].positions.length;

        let pattern: MatchPattern;
        if (len1 >= 5 || len2 >= 5 || combined.length >= 7) {
          pattern = 'cross';
        } else if (
          this.isIntersectionAtEnd(lines[i], intersection) ||
          this.isIntersectionAtEnd(lines[j], intersection)
        ) {
          pattern = 'L';
        } else {
          pattern = 'T';
        }

        results.push({
          pattern,
          positions: combined,
          cells: allCells,
          metadata: rule.extractMetadata?.(combined, allCells),
        });

        lines[i]._merged = true;
        lines[j]._merged = true;
        break;
      }
    }

    return results;
  }

  private linesMatch(a: LineMatch<T>, b: LineMatch<T>, rule: PatternRule<T>): boolean {
    if (a.cells.length === 0 || b.cells.length === 0) return false;
    return rule.matches(a.cells[0], b.cells[0]);
  }

  private findIntersection(
    a: { r: number; c: number }[],
    b: { r: number; c: number }[],
  ): { r: number; c: number } | null {
    for (const pa of a) {
      for (const pb of b) {
        if (pa.r === pb.r && pa.c === pb.c) return pa;
      }
    }
    return null;
  }

  private mergePositions(
    a: { r: number; c: number }[],
    b: { r: number; c: number }[],
  ): { r: number; c: number }[] {
    const set = new Map<string, { r: number; c: number }>();
    for (const p of a) set.set(`${p.r},${p.c}`, p);
    for (const p of b) set.set(`${p.r},${p.c}`, p);
    return [...set.values()];
  }

  private isIntersectionAtEnd(line: LineMatch<T>, point: { r: number; c: number }): boolean {
    const first = line.positions[0];
    const last = line.positions[line.positions.length - 1];
    return (
      (first.r === point.r && first.c === point.c) ||
      (last.r === point.r && last.c === point.c)
    );
  }

  /** Factory: Basic line patterns for simple color matching */
  static colorMatchPatterns<T>(
    getColor: (cell: T) => string | null,
    isMatchable: (cell: T) => boolean = () => true,
  ): PatternRule<T>[] {
    return [{
      name: 'line3',
      matchable: (cell) => cell !== null && isMatchable(cell),
      matches: (a, b) => getColor(a) === getColor(b),
    }];
  }
}
