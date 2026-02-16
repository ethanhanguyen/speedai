import type { BallColor, SpecialType } from '../components/BallData.js';
import type { Cell } from './Grid.js';
import { ROWS, COLS } from './Grid.js';

export interface ClearResult {
  positions: { r: number; c: number }[];
  /** Additional specials triggered in chain. */
  chainSpecials: { r: number; c: number; type: SpecialType }[];
}

/** Resolve activation of a special ball at (r,c). Returns extra cells to clear. */
export function resolveSpecial(
  cells: (Cell | null)[][],
  r: number,
  c: number,
  alreadyCleared: Set<string>,
  targetColor?: BallColor,
): ClearResult {
  const cell = cells[r]?.[c];
  if (!cell) return { positions: [], chainSpecials: [] };

  const result: ClearResult = { positions: [], chainSpecials: [] };
  const key = (row: number, col: number) => `${row},${col}`;

  const addCell = (row: number, col: number) => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (alreadyCleared.has(key(row, col))) return;
    alreadyCleared.add(key(row, col));
    result.positions.push({ r: row, c: col });
    // If this cell is also special, chain it
    const target = cells[row]?.[col];
    if (target && target.special !== 'none') {
      result.chainSpecials.push({ r: row, c: col, type: target.special });
    }
  };

  switch (cell.special) {
    case 'striped_h':
      for (let col = 0; col < COLS; col++) addCell(r, col);
      break;
    case 'striped_v':
      for (let row = 0; row < ROWS; row++) addCell(row, c);
      break;
    case 'bomb':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          addCell(r + dr, c + dc);
        }
      }
      break;
    case 'rainbow':
      // Clear all balls matching the target color (passed when swapped with a normal ball)
      if (targetColor) {
        resolveRainbow(cells, targetColor, alreadyCleared, result);
      }
      // Always clear the rainbow ball itself
      addCell(r, c);
      break;
  }

  return result;
}

function resolveRainbow(
  cells: (Cell | null)[][],
  targetColor: BallColor,
  alreadyCleared: Set<string>,
  result: ClearResult,
): void {
  const key = (row: number, col: number) => `${row},${col}`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c]?.color === targetColor && !alreadyCleared.has(key(r, c))) {
        alreadyCleared.add(key(r, c));
        result.positions.push({ r, c });
        if (cells[r][c]!.special !== 'none') {
          result.chainSpecials.push({ r, c, type: cells[r][c]!.special });
        }
      }
    }
  }
}

/** A single special activation with its affected cells. */
export interface SpecialActivation {
  type: SpecialType;
  r: number;
  c: number;
  affectedCells: { r: number; c: number }[];
}

/** A wave of specials that fire in parallel. Waves execute sequentially. */
export interface SpecialWave {
  activations: SpecialActivation[];
}

/**
 * Resolve a chain of specials in BFS waves.
 * Wave 0 = initial specials, Wave 1 = specials hit by Wave 0, etc.
 * Same-depth specials fire in parallel; cross-depth fire sequentially.
 */
export function resolveSpecialChain(
  cells: (Cell | null)[][],
  initialSpecials: { r: number; c: number; targetColor?: BallColor }[],
  alreadyCleared: Set<string>,
): { waves: SpecialWave[]; allToClear: Set<string> } {
  const waves: SpecialWave[] = [];

  type SpecialEntry = { r: number; c: number; type: SpecialType; targetColor?: BallColor };

  let currentSpecials: SpecialEntry[] = initialSpecials.map(s => ({
    r: s.r,
    c: s.c,
    type: cells[s.r]?.[s.c]?.special ?? 'none' as SpecialType,
    targetColor: s.targetColor,
  }));

  while (currentSpecials.length > 0) {
    const wave: SpecialWave = { activations: [] };
    const nextSpecials: SpecialEntry[] = [];

    for (const special of currentSpecials) {
      if (special.type === 'none') continue;
      const result = resolveSpecial(cells, special.r, special.c, alreadyCleared, special.targetColor);
      wave.activations.push({
        type: special.type,
        r: special.r,
        c: special.c,
        affectedCells: result.positions,
      });
      for (const cs of result.chainSpecials) {
        nextSpecials.push({ r: cs.r, c: cs.c, type: cs.type });
      }
    }

    if (wave.activations.length > 0) {
      waves.push(wave);
    }
    currentSpecials = nextSpecials;
  }

  return { waves, allToClear: alreadyCleared };
}

/**
 * Resolve a special+special combo in BFS waves.
 * Wave 0 = the combo effect itself, subsequent waves = chain specials.
 */
export function resolveComboChain(
  cells: (Cell | null)[][],
  r1: number, c1: number,
  r2: number, c2: number,
): { waves: SpecialWave[]; allToClear: Set<string> } {
  const alreadyCleared = new Set<string>();
  const comboResult = resolveSpecialCombo(cells, r1, c1, r2, c2, alreadyCleared);

  const s1 = cells[r1]?.[c1]?.special ?? 'none';
  const s2 = cells[r2]?.[c2]?.special ?? 'none';

  // Wave 0: the combo activation (use the dominant type for visuals)
  const comboType = getComboVisualType(s1, s2);
  const wave0: SpecialWave = {
    activations: [{
      type: comboType,
      r: Math.round((r1 + r2) / 2),
      c: Math.round((c1 + c2) / 2),
      affectedCells: comboResult.positions,
    }],
  };
  const waves: SpecialWave[] = [wave0];

  // Resolve chain specials in subsequent waves
  if (comboResult.chainSpecials.length > 0) {
    let currentSpecials = comboResult.chainSpecials.map(cs => ({
      r: cs.r, c: cs.c, type: cs.type, targetColor: undefined as BallColor | undefined,
    }));

    while (currentSpecials.length > 0) {
      const wave: SpecialWave = { activations: [] };
      const nextSpecials: typeof currentSpecials = [];

      for (const special of currentSpecials) {
        if (special.type === 'none') continue;
        // For rainbow chains, pick a random board color
        let targetColor = special.targetColor;
        if (special.type === 'rainbow' && !targetColor) {
          targetColor = getRandomColorFromCells(cells);
        }
        const result = resolveSpecial(cells, special.r, special.c, alreadyCleared, targetColor);
        wave.activations.push({
          type: special.type,
          r: special.r,
          c: special.c,
          affectedCells: result.positions,
        });
        for (const cs of result.chainSpecials) {
          nextSpecials.push({ r: cs.r, c: cs.c, type: cs.type, targetColor: undefined });
        }
      }

      if (wave.activations.length > 0) {
        waves.push(wave);
      }
      currentSpecials = nextSpecials;
    }
  }

  return { waves, allToClear: alreadyCleared };
}

function getComboVisualType(s1: SpecialType, s2: SpecialType): SpecialType {
  if (s1 === 'rainbow' || s2 === 'rainbow') return 'rainbow';
  if (s1 === 'bomb' || s2 === 'bomb') return 'bomb';
  return s1; // striped
}

function getRandomColorFromCells(cells: (Cell | null)[][]): BallColor | undefined {
  const colors: BallColor[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c]?.color) colors.push(cells[r][c]!.color!);
    }
  }
  return colors.length > 0 ? colors[Math.floor(Math.random() * colors.length)] : undefined;
}

/** Resolve special+special combo when two specials are swapped. */
export function resolveSpecialCombo(
  cells: (Cell | null)[][],
  r1: number, c1: number,
  r2: number, c2: number,
  alreadyCleared: Set<string>,
): ClearResult {
  const s1 = cells[r1]?.[c1]?.special ?? 'none';
  const s2 = cells[r2]?.[c2]?.special ?? 'none';
  const result: ClearResult = { positions: [], chainSpecials: [] };
  const key = (row: number, col: number) => `${row},${col}`;

  const addCell = (row: number, col: number) => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (alreadyCleared.has(key(row, col))) return;
    alreadyCleared.add(key(row, col));
    result.positions.push({ r: row, c: col });
  };

  // Rainbow + anything = clear all of that color + activate specials of that color
  if (s1 === 'rainbow' || s2 === 'rainbow') {
    const otherR = s1 === 'rainbow' ? r2 : r1;
    const otherC = s1 === 'rainbow' ? c2 : c1;
    const targetColor = cells[otherR]?.[otherC]?.color;
    if (targetColor) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (cells[r][c]?.color === targetColor) {
            addCell(r, c);
            if (cells[r][c]!.special !== 'none') {
              result.chainSpecials.push({ r, c, type: cells[r][c]!.special });
            }
          }
        }
      }
    }
    addCell(r1, c1);
    addCell(r2, c2);
    return result;
  }

  // Bomb + Bomb = 5×5 area
  if (s1 === 'bomb' && s2 === 'bomb') {
    const cr = Math.round((r1 + r2) / 2);
    const cc = Math.round((c1 + c2) / 2);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        addCell(cr + dr, cc + dc);
      }
    }
    addCell(r1, c1);
    addCell(r2, c2);
    return result;
  }

  // Striped + Striped combos
  if ((s1 === 'striped_h' || s1 === 'striped_v') && (s2 === 'striped_h' || s2 === 'striped_v')) {
    if (s1 === 'striped_v' && s2 === 'striped_v') {
      // Both vertical: clear only target column (c2)
      for (let row = 0; row < ROWS; row++) addCell(row, c2);
    } else if (s1 === 'striped_h' && s2 === 'striped_h') {
      // Both horizontal: clear only target row (r2)
      for (let col = 0; col < COLS; col++) addCell(r2, col);
    } else {
      // Mixed: clear cross pattern (full row + full col of both)
      for (let col = 0; col < COLS; col++) addCell(r1, col);
      for (let row = 0; row < ROWS; row++) addCell(row, c1);
      for (let col = 0; col < COLS; col++) addCell(r2, col);
      for (let row = 0; row < ROWS; row++) addCell(row, c2);
    }
    addCell(r1, c1);
    addCell(r2, c2);
    return result;
  }

  // Bomb + Striped = clear 3 rows or 3 cols
  if ((s1 === 'bomb' && (s2 === 'striped_h' || s2 === 'striped_v')) ||
      (s2 === 'bomb' && (s1 === 'striped_h' || s1 === 'striped_v'))) {
    const bombR = s1 === 'bomb' ? r1 : r2;
    const bombC = s1 === 'bomb' ? c1 : c2;
    for (let dr = -1; dr <= 1; dr++) {
      for (let col = 0; col < COLS; col++) addCell(bombR + dr, col);
      for (let row = 0; row < ROWS; row++) addCell(row, bombC + dr);
    }
    addCell(r1, c1);
    addCell(r2, c2);
    return result;
  }

  return result;
}
