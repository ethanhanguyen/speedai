import type { GridModel } from '@speedai/game-engine';
import { TileId, ObjectId } from '../tilemap/types.js';
import type { TileCell, MapData } from '../tilemap/types.js';
import { CHAR_MAP } from '../tilemap/TileRegistry.js';
import type { DecorScatterConfig } from '../config/MapGenDefaults.js';

export type MapSymmetry = 'none' | 'h' | 'v' | 'quad';

export interface MapGenConfig {
  rows: number;
  cols: number;
  seed: number;
  symmetry: MapSymmetry;
  enemySpawnCount: number;
  /** Relative weights; omit a TileId to exclude it. */
  terrainWeights: Partial<Record<TileId, number>>;
  objectDensity: {
    /** Blocks per 100 interior walkable cells. */
    block: number;
    /** Containers per 100 interior walkable cells. */
    container: number;
    /** Number of straight W-wall segments placed pre-symmetry. */
    wallSegmentCount: number;
    wallSegmentLength: number;
  };
  /** Tile radius kept object-free around each spawn point. */
  spawnClearRadius: number;
}

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Weighted random pick from entries array. */
function weightedPick<T>(rng: () => number, entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r <= 0) return item;
  }
  return entries[entries.length - 1][0];
}

/** Mirror col index for horizontal symmetry. */
function mirrorC(c: number, cols: number): number { return cols - 1 - c; }
/** Mirror row index for vertical symmetry. */
function mirrorR(r: number, rows: number): number { return rows - 1 - r; }

// ---------------------------------------------------------------------------
// BFS connectivity: ensure player can reach every S spawn
// ---------------------------------------------------------------------------
function bfsReachable(
  grid: string[][],
  startR: number, startC: number,
  rows: number, cols: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startR, startC]];
  visited.add(`${startR},${startC}`);
  while (queue.length) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      const ch = grid[nr][nc];
      const cell = CHAR_MAP[ch];
      if (!cell) continue;
      // walkable if no blocking object
      const walkable = cell.object === ObjectId.NONE;
      if (!walkable) continue;
      visited.add(key);
      queue.push([nr, nc]);
    }
  }
  return visited;
}

/** Carve a straight path from (r1,c1) to (r2,c2) by clearing blocking objects. */
function carvePath(grid: string[][], r1: number, c1: number, r2: number, c2: number): void {
  let r = r1, c = c1;
  while (r !== r2 || c !== c2) {
    const ch = grid[r][c];
    const cell = CHAR_MAP[ch];
    if (cell && cell.object !== ObjectId.NONE) {
      // Replace with open ground of same terrain
      const groundChar = Object.entries(CHAR_MAP).find(
        ([k, v]) => v.ground === cell.ground && v.object === ObjectId.NONE,
      )?.[0] ?? '.';
      grid[r][c] = groundChar;
    }
    if (r !== r2) r += r < r2 ? 1 : -1;
    else c += c < c2 ? 1 : -1;
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a map ASCII string compatible with `parseTilemap()`.
 *
 * Designer workflow:
 *   1. Call `generateMap(config, seed)` with a fixed seed.
 *   2. Copy the printed string to a `.ts` map file and hand-edit freely.
 *   3. Or register the generator call directly in MapRegistry for live generation.
 */
export function generateMap(cfg: MapGenConfig, seedOverride?: number): string {
  const rng = makePrng(seedOverride ?? cfg.seed);
  const { rows, cols, symmetry } = cfg;

  // Build terrain weight table
  const terrainEntries = Object.entries(cfg.terrainWeights).filter(([, w]) => w > 0) as [TileId, number][];

  // Char lookup: TileId → open-ground char
  const tileToChar: Partial<Record<TileId, string>> = {};
  for (const [ch, cell] of Object.entries(CHAR_MAP)) {
    if (cell.object === ObjectId.NONE && !(ch === 'P') && !(ch === 'S')) {
      tileToChar[cell.ground as TileId] = ch;
    }
  }

  // Initialize grid (all open grass)
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill('.'));

  // Border walls
  for (let c = 0; c < cols; c++) { grid[0][c] = 'W'; grid[rows-1][c] = 'W'; }
  for (let r = 0; r < rows; r++) { grid[r][0] = 'W'; grid[r][cols-1] = 'W'; }

  // --- Determine working quadrant bounds (pre-symmetry) ---
  // For 'quad': fill top-left quadrant only; for 'h': fill left half; 'v': top half.
  const wR = symmetry === 'v' || symmetry === 'quad' ? Math.floor(rows / 2) : rows - 1;
  const wC = symmetry === 'h' || symmetry === 'quad' ? Math.floor(cols / 2) : cols - 1;

  // --- Terrain fill ---
  if (terrainEntries.length > 0) {
    for (let r = 1; r < wR; r++) {
      for (let c = 1; c < wC; c++) {
        const tile = weightedPick(rng, terrainEntries);
        const ch = tileToChar[tile] ?? '.';
        grid[r][c] = ch;
      }
    }
  }

  // --- Wall segments (straight lines) ---
  for (let i = 0; i < cfg.objectDensity.wallSegmentCount; i++) {
    const r = 1 + Math.floor(rng() * (wR - 2));
    const c = 1 + Math.floor(rng() * (wC - 2));
    const horiz = rng() < 0.5;
    for (let j = 0; j < cfg.objectDensity.wallSegmentLength; j++) {
      const tr = horiz ? r : Math.min(r + j, wR - 1);
      const tc = horiz ? Math.min(c + j, wC - 1) : c;
      if (tr > 0 && tr < rows - 1 && tc > 0 && tc < cols - 1) grid[tr][tc] = 'W';
    }
  }

  // --- Object placement (blocks + containers) ---
  const interior: [number, number][] = [];
  for (let r = 1; r < wR; r++) for (let c = 1; c < wC; c++) {
    if (CHAR_MAP[grid[r][c]]?.object === ObjectId.NONE) interior.push([r, c]);
  }
  const blockCount = Math.round((interior.length * cfg.objectDensity.block) / 100);
  const contCount  = Math.round((interior.length * cfg.objectDensity.container) / 100);
  // Shuffle a slice of interior cells for object placement
  const shuffled = [...interior].sort(() => rng() - 0.5);
  for (let i = 0; i < Math.min(blockCount, shuffled.length); i++) {
    const [r, c] = shuffled[i];
    const terrain = CHAR_MAP[grid[r][c]].ground;
    const groundCh = tileToChar[terrain] ?? '.';
    grid[r][c] = 'B';
    // Place on terrain (blocks share terrain char — handled by CHAR_MAP)
    // Actually CHAR_MAP 'B' maps to GRASS; so keep 'B' as-is (ground is grass under block)
    void groundCh;
  }
  for (let i = blockCount; i < Math.min(blockCount + contCount, shuffled.length); i++) {
    const [r, c] = shuffled[i];
    grid[r][c] = 'C';
  }

  // --- Apply symmetry ---
  const applySymmetry = (r: number, c: number, ch: string) => {
    const mir = (rr: number, cc: number) => {
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return;
      if (grid[rr][cc] !== 'W' && grid[rr][cc] !== 'P' && grid[rr][cc] !== 'S') {
        grid[rr][cc] = ch;
      }
    };
    if (symmetry === 'h' || symmetry === 'quad') mir(r, mirrorC(c, cols));
    if (symmetry === 'v' || symmetry === 'quad') mir(mirrorR(r, rows), c);
    if (symmetry === 'quad') mir(mirrorR(r, rows), mirrorC(c, cols));
  };

  if (symmetry !== 'none') {
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        applySymmetry(r, c, grid[r][c]);
      }
    }
  }

  // --- Player spawn (center) ---
  const pR = Math.floor(rows / 2);
  const pC = Math.floor(cols / 2);
  grid[pR][pC] = 'P';

  // --- Enemy spawns (corners / edges, round-robin) ---
  const spawnCandidates: [number, number][] = [
    [1, 1], [1, cols - 2], [rows - 2, 1], [rows - 2, cols - 2],
    [1, Math.floor(cols / 2)], [rows - 2, Math.floor(cols / 2)],
    [Math.floor(rows / 2), 1], [Math.floor(rows / 2), cols - 2],
  ];
  const spawnCount = Math.min(cfg.enemySpawnCount, spawnCandidates.length);
  const spawnPoints: [number, number][] = [];
  for (let i = 0; i < spawnCount; i++) {
    const [sr, sc] = spawnCandidates[i];
    grid[sr][sc] = 'S';
    spawnPoints.push([sr, sc]);
    // Clear radius around spawn
    for (let dr = -cfg.spawnClearRadius; dr <= cfg.spawnClearRadius; dr++) {
      for (let dc = -cfg.spawnClearRadius; dc <= cfg.spawnClearRadius; dc++) {
        const nr = sr + dr, nc = sc + dc;
        if (nr <= 0 || nr >= rows-1 || nc <= 0 || nc >= cols-1) continue;
        if (grid[nr][nc] !== 'S' && grid[nr][nc] !== 'P' && grid[nr][nc] !== 'W') {
          grid[nr][nc] = '.';
        }
      }
    }
  }

  // Clear radius around player spawn
  for (let dr = -cfg.spawnClearRadius; dr <= cfg.spawnClearRadius; dr++) {
    for (let dc = -cfg.spawnClearRadius; dc <= cfg.spawnClearRadius; dc++) {
      const nr = pR + dr, nc = pC + dc;
      if (nr <= 0 || nr >= rows-1 || nc <= 0 || nc >= cols-1) continue;
      if (grid[nr][nc] !== 'P' && grid[nr][nc] !== 'W') grid[nr][nc] = '.';
    }
  }

  // --- BFS connectivity: carve paths if any spawn is unreachable ---
  const reachable = bfsReachable(grid, pR, pC, rows, cols);
  for (const [sr, sc] of spawnPoints) {
    if (!reachable.has(`${sr},${sc}`)) {
      carvePath(grid, pR, pC, sr, sc);
    }
  }

  return grid.map(row => row.join('')).join('\n');
}

// ---------------------------------------------------------------------------
// Post-load decor + hedgehog scatter passes
// ---------------------------------------------------------------------------

/**
 * Apply three environment passes to a parsed GridModel after `parseTilemap()`.
 *
 * Pass 1 — Border decor: scatter decorative borders on perimeter cells.
 * Pass 2 — Contextual decor: ground-type-driven and wall-adjacency-driven decor.
 * Pass 3 — Hedgehog scatter: place ObjectId.HEDGEHOG on open interior cells.
 *
 * All probabilities and pools are config-driven via `DecorScatterConfig`.
 * The seed produces a deterministic result for a given map + seed pair.
 */
export function applyDecorPasses(
  grid: GridModel<TileCell>,
  meta: MapData,
  config: DecorScatterConfig,
  seed: number,
): void {
  const rng = makePrng(seed);
  const { rows, cols } = meta;
  const allSpawns = [...meta.spawnPoints, ...meta.enemySpawns];

  // --- Pass 1: Border decor ---
  if (config.border.decors.length > 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r !== 0 && r !== rows - 1 && c !== 0 && c !== cols - 1) continue;
        const cell = grid.get(r, c);
        if (!cell || cell.object !== ObjectId.NONE) continue;
        if (rng() < config.border.probability) {
          const pool = config.border.decors;
          const decor = pool[Math.floor(rng() * pool.length)];
          grid.set(r, c, { ...cell, decor });
        }
      }
    }
  }

  // --- Pass 2: Contextual interior scatter ---
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const cell = grid.get(r, c);
      if (!cell || cell.object !== ObjectId.NONE || cell.decor !== undefined) continue;

      const adjacentToWall = hasAdjacentObject(grid, r, c, rows, cols, config.nearWall.adjacentObjects);

      if (adjacentToWall && config.nearWall.decors.length > 0 && rng() < config.nearWall.probability) {
        const pool = config.nearWall.decors;
        const decor = pool[Math.floor(rng() * pool.length)];
        grid.set(r, c, { ...cell, decor });
      } else {
        const groundCfg = config.byGround[cell.ground];
        if (groundCfg && groundCfg.decors.length > 0 && rng() < groundCfg.probability) {
          const decor = groundCfg.decors[Math.floor(rng() * groundCfg.decors.length)];
          grid.set(r, c, { ...cell, decor });
        }
      }
    }
  }

  // --- Pass 3: Hedgehog scatter ---
  const { probability, minDistFromSpawn } = config.hedgehog;
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const cell = grid.get(r, c);
      if (!cell || cell.object !== ObjectId.NONE || cell.ground === TileId.WATER) continue;

      const tooClose = allSpawns.some(s => Math.abs(s.r - r) + Math.abs(s.c - c) < minDistFromSpawn);
      if (tooClose) continue;

      if (rng() < probability) {
        grid.set(r, c, { ...cell, object: ObjectId.HEDGEHOG });
      }
    }
  }
}

function hasAdjacentObject(
  grid: GridModel<TileCell>,
  r: number, c: number,
  rows: number, cols: number,
  objectTypes: ObjectId[],
): boolean {
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const neighbor = grid.get(nr, nc);
    if (neighbor && objectTypes.includes(neighbor.object)) return true;
  }
  return false;
}
