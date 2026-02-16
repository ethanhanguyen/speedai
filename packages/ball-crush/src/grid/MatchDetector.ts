import type { BallColor, SpecialType } from '../components/BallData.js';
import type { Cell } from './Grid.js';
import { ROWS, COLS } from './Grid.js';
import { getCellTypeDef } from '../config/CellTypes.js';

export type MatchPattern = 'line3' | 'line4' | 'line5' | 'L' | 'T' | 'cross';

export interface Match {
  pattern: MatchPattern;
  positions: { r: number; c: number }[];
  color: BallColor;
  specialToCreate: SpecialType;
  /** Where to place the created special (center of match). */
  specialPos: { r: number; c: number } | null;
}

type Dir = { dr: number; dc: number };

const H: Dir = { dr: 0, dc: 1 };
const V: Dir = { dr: 1, dc: 0 };

/** Scan the grid for all matches. Returns deduplicated match list. */
export function detectMatches(cells: (Cell | null)[][]): Match[] {
  const matches: Match[] = [];
  const used = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  // Find all line segments in each direction
  const lines = [
    ...findLines(cells, H),
    ...findLines(cells, V),
  ];

  // Try to merge into L/T/cross patterns
  const merged = mergeIntoPatterns(lines, used);
  matches.push(...merged);

  // Add remaining unmerged lines
  for (const line of lines) {
    if (line._merged) continue;
    const special = lineSpecial(line.positions.length, line.dir);
    matches.push({
      pattern: line.positions.length >= 5 ? 'line5' : line.positions.length === 4 ? 'line4' : 'line3',
      positions: line.positions,
      color: line.color,
      specialToCreate: special,
      specialPos: special !== 'none' ? line.positions[Math.floor(line.positions.length / 2)] : null,
    });
  }

  return matches;
}

interface LineMatch {
  positions: { r: number; c: number }[];
  color: BallColor;
  dir: Dir;
  _merged?: boolean;
}

function findLines(cells: (Cell | null)[][], dir: Dir): LineMatch[] {
  const results: LineMatch[] = [];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (visited[r][c]) continue;
      const cell = cells[r]?.[c];
      if (!cell?.color) continue;
      if (cell.special !== 'none') continue; // Special balls don't participate in color matches
      // Obstacle-covered cells can't match unless the type allows it
      if (cell.obstacle) {
        const def = getCellTypeDef(cell.obstacle.type);
        if (def && !def.matchable) continue;
      }

      const positions: { r: number; c: number }[] = [{ r, c }];
      let nr = r + dir.dr;
      let nc = c + dir.dc;
      while (
        nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
        cells[nr]?.[nc]?.color === cell.color &&
        cells[nr]?.[nc]?.special === 'none' &&
        !hasNonMatchableObstacle(cells[nr]?.[nc]) // Skip non-matchable obstacles
      ) {
        positions.push({ r: nr, c: nc });
        visited[nr][nc] = true;
        nr += dir.dr;
        nc += dir.dc;
      }
      visited[r][c] = true;

      if (positions.length >= 3) {
        results.push({ positions, color: cell.color, dir });
      }
    }
  }
  return results;
}

function lineSpecial(len: number, dir: Dir): SpecialType {
  if (len >= 5) return 'rainbow';
  if (len === 4) {
    if (dir.dr === 0) return 'striped_v'; // horizontal match → vertical stripe
    if (dir.dc === 0) return 'striped_h'; // vertical match → horizontal stripe
    return Math.random() < 0.5 ? 'striped_h' : 'striped_v'; // diagonal → random
  }
  return 'none';
}

function mergeIntoPatterns(lines: LineMatch[], _used: boolean[][]): Match[] {
  const results: Match[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]._merged) continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j]._merged) continue;
      if (lines[i].color !== lines[j].color) continue;

      // Find intersection
      const intersection = findIntersection(lines[i].positions, lines[j].positions);
      if (!intersection) continue;

      // Two lines of same color intersect → L, T, or cross
      const combined = mergePositions(lines[i].positions, lines[j].positions);
      const len1 = lines[i].positions.length;
      const len2 = lines[j].positions.length;

      let pattern: MatchPattern;
      let special: SpecialType;

      if (len1 >= 5 || len2 >= 5 || combined.length >= 7) {
        pattern = 'cross';
        special = 'rainbow';
      } else if (isIntersectionAtEnd(lines[i], intersection) || isIntersectionAtEnd(lines[j], intersection)) {
        pattern = 'L';
        special = 'bomb';
      } else {
        pattern = 'T';
        special = 'bomb';
      }

      results.push({
        pattern,
        positions: combined,
        color: lines[i].color,
        specialToCreate: special,
        specialPos: intersection,
      });

      lines[i]._merged = true;
      lines[j]._merged = true;
      break;
    }
  }

  return results;
}

function findIntersection(
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

function mergePositions(
  a: { r: number; c: number }[],
  b: { r: number; c: number }[],
): { r: number; c: number }[] {
  const set = new Map<string, { r: number; c: number }>();
  for (const p of a) set.set(`${p.r},${p.c}`, p);
  for (const p of b) set.set(`${p.r},${p.c}`, p);
  return [...set.values()];
}

function hasNonMatchableObstacle(cell: Cell | null | undefined): boolean {
  if (!cell?.obstacle) return false;
  const def = getCellTypeDef(cell.obstacle.type);
  return def ? !def.matchable : false;
}

function isIntersectionAtEnd(
  line: LineMatch,
  point: { r: number; c: number },
): boolean {
  const first = line.positions[0];
  const last = line.positions[line.positions.length - 1];
  return (first.r === point.r && first.c === point.c) ||
         (last.r === point.r && last.c === point.c);
}
