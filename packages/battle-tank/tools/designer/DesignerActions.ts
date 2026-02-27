import { GridModel } from '@speedai/game-engine';
import type { DesignerState, GridSnapshot } from './DesignerState.js';
import { TileId, ObjectId, DecorId } from '../../src/tilemap/types.js';
import type { TileCell, TileParticleEffect } from '../../src/tilemap/types.js';
import { OBJECT_DEFS, CHAR_MAP } from '../../src/tilemap/TileRegistry.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';
import { validateGrid } from '../MapValidator.js';
import { resolveAnchor, getOccupiedCells } from '../../src/tilemap/MultiTileUtils.js';
import { analyzeMapDetails } from '../../src/tilemap/MapDetailsAnalyzer.js';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

/**
 * Snapshot current (post-mutation) grid state into history.
 * Called AFTER mutations so undo restores the correct state.
 */
export function pushHistory(state: DesignerState): void {
  if (!state.grid) return;

  const snapshot: GridSnapshot = {
    grid: cloneGrid(state.grid),
    timestamp: Date.now(),
  };

  // Truncate forward history if we're not at the end
  state.history = state.history.slice(0, state.historyIndex + 1);

  // Add new snapshot
  state.history.push(snapshot);

  // Limit history size
  if (state.history.length > state.maxHistory) {
    state.history.shift();
  } else {
    state.historyIndex++;
  }
}

/**
 * Undo last action.
 */
export function undo(state: DesignerState): void {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.grid = cloneGrid(state.history[state.historyIndex].grid);
    revalidate(state);
  }
}

/**
 * Redo last undone action.
 */
export function redo(state: DesignerState): void {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.grid = cloneGrid(state.history[state.historyIndex].grid);
    revalidate(state);
  }
}

/** Run advisory validation if map data is present. */
function revalidate(state: DesignerState): void {
  if (state.mapData && state.grid) {
    state.validationResult = validateGrid(state.grid, state.mapData);
  }
}

// ---------------------------------------------------------------------------
// Bare mutators (no history, no validation — used by compound actions)
// ---------------------------------------------------------------------------

/** Set ground tile at position (bare). */
function applySetGround(grid: GridModel<TileCell>, r: number, c: number, tileId: TileId): void {
  const cell = grid.get(r, c);
  if (cell) {
    cell.ground = tileId;
    grid.set(r, c, cell);
  }
}

/**
 * Set object at position, multi-tile aware (bare).
 * Returns Result for bounds checking.
 */
function applySetObject(
  grid: GridModel<TileCell>,
  r: number,
  c: number,
  objId: ObjectId,
  rotation: number
): Result<void> {
  // 1. Resolve anchor if continuation cell selected
  const cell = grid.get(r, c);
  if (!cell) {
    return { ok: false, error: 'Invalid cell' };
  }

  let anchorR = r;
  let anchorC = c;
  if (cell.multiTileAnchor) {
    const anchor = resolveAnchor(r, c, grid);
    if (anchor) {
      anchorR = anchor.r;
      anchorC = anchor.c;
    }
  }

  // 2. Clear old object at anchor (if exists)
  clearMultiTileObject(grid, anchorR, anchorC);

  // 3. Place new object
  if (objId !== ObjectId.NONE) {
    const objDef = OBJECT_DEFS[objId];
    const gridSpan = objDef.gridSpan ?? { w: 1, h: 1 };

    // Swap w/h for 90/270 degree rotations
    const span = (rotation === 90 || rotation === 270)
      ? { w: gridSpan.h, h: gridSpan.w }
      : gridSpan;

    // Check if fits
    for (let dr = 0; dr < span.h; dr++) {
      for (let dc = 0; dc < span.w; dc++) {
        const nr = anchorR + dr;
        const nc = anchorC + dc;
        if (!grid.isValid(nr, nc)) {
          return { ok: false, error: 'Object extends beyond grid bounds' };
        }
      }
    }

    // Place anchor
    const anchorCell = grid.get(anchorR, anchorC)!;
    anchorCell.object = objId;
    anchorCell.objectRotation = rotation;
    delete anchorCell.multiTileAnchor;
    grid.set(anchorR, anchorC, anchorCell);

    // Place continuations
    for (let dr = 0; dr < span.h; dr++) {
      for (let dc = 0; dc < span.w; dc++) {
        if (dr === 0 && dc === 0) continue; // Skip anchor
        const nr = anchorR + dr;
        const nc = anchorC + dc;
        const contCell = grid.get(nr, nc)!;
        contCell.object = ObjectId.NONE;
        contCell.multiTileAnchor = { r: anchorR, c: anchorC };
        delete contCell.objectRotation;
        grid.set(nr, nc, contCell);
      }
    }
  }

  return { ok: true, value: undefined };
}

/** Rotate object CW by 90° (bare). */
function applyRotateObject(grid: GridModel<TileCell>, r: number, c: number): void {
  const cell = grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;
  const currentRotation = cell.objectRotation ?? 0;
  cell.objectRotation = (currentRotation + 90) % 360;
  grid.set(r, c, cell);
}

/**
 * Clear all objects in multi-tile group at position.
 */
function clearMultiTileObject(grid: GridModel<TileCell>, r: number, c: number): void {
  const cell = grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;

  const objDef = OBJECT_DEFS[cell.object];
  if (!objDef) return;

  const rotation = cell.objectRotation ?? 0;
  const cells = getOccupiedCells(r, c, objDef.gridSpan ?? { w: 1, h: 1 }, rotation);

  for (const { r: cr, c: cc } of cells) {
    const occupiedCell = grid.get(cr, cc);
    if (occupiedCell) {
      occupiedCell.object = ObjectId.NONE;
      delete occupiedCell.multiTileAnchor;
      delete occupiedCell.objectRotation;
      grid.set(cr, cc, occupiedCell);
    }
  }
}

// ---------------------------------------------------------------------------
// Public actions (mutate → snapshot → validate)
// ---------------------------------------------------------------------------

/**
 * Set ground tile at position.
 */
export function setGround(state: DesignerState, r: number, c: number, tileId: TileId): void {
  if (!state.grid) return;
  applySetGround(state.grid, r, c, tileId);
  pushHistory(state);
  revalidate(state);
}

/**
 * Set object at position (atomic multi-tile aware).
 */
export function setObject(
  state: DesignerState,
  r: number,
  c: number,
  objId: ObjectId,
  rotation: number
): Result<void> {
  if (!state.grid) {
    return { ok: false, error: 'No grid loaded' };
  }
  const result = applySetObject(state.grid, r, c, objId, rotation);
  if (result.ok) {
    pushHistory(state);
    revalidate(state);
  }
  return result;
}

/**
 * Compound paint: set ground + optional object in one undo step.
 */
export function paintTile(
  state: DesignerState,
  r: number,
  c: number,
  ground: TileId,
  object: ObjectId,
  rotation: number
): Result<void> {
  if (!state.grid) {
    return { ok: false, error: 'No grid loaded' };
  }
  applySetGround(state.grid, r, c, ground);
  let result: Result<void> = { ok: true, value: undefined };
  if (object !== ObjectId.NONE) {
    result = applySetObject(state.grid, r, c, object, rotation);
  }
  pushHistory(state);
  revalidate(state);
  return result;
}

/**
 * Rotate object CW at selected cell (cycle 0→90→180→270→0).
 */
export function rotateObject(state: DesignerState, r: number, c: number): void {
  if (!state.grid) return;
  const cell = state.grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;
  applyRotateObject(state.grid, r, c);
  pushHistory(state);
  revalidate(state);
}

/**
 * Rotate object CCW (270° CW = 90° CCW) in one undo step.
 */
export function rotateObjectCCW(state: DesignerState, r: number, c: number): void {
  if (!state.grid) return;
  const cell = state.grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;
  for (let i = 0; i < 3; i++) applyRotateObject(state.grid, r, c);
  pushHistory(state);
  revalidate(state);
}

/**
 * Toggle decor at position.
 */
export function toggleDecor(state: DesignerState, r: number, c: number, decorId: DecorId): void {
  if (!state.grid) return;

  const cell = state.grid.get(r, c);
  if (!cell) return;

  if (!cell.decors) {
    cell.decors = [decorId];
  } else {
    const idx = cell.decors.indexOf(decorId);
    if (idx >= 0) {
      cell.decors.splice(idx, 1);
    } else {
      cell.decors.push(decorId);
    }
  }

  state.grid.set(r, c, cell);
  pushHistory(state);
}

/**
 * Update a single object property override.
 */
export function updateObjectProperty(
  state: DesignerState,
  r: number,
  c: number,
  propName: string,
  value: any
): void {
  if (!state.grid) return;

  const cell = state.grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;

  if (!cell.objectProperties) {
    cell.objectProperties = {};
  }
  (cell.objectProperties as any)[propName] = value;
  state.grid.set(r, c, cell);
  pushHistory(state);
  revalidate(state);
}

/**
 * Update object transform (scale/offset) on a tile.
 */
export function updateObjectTransform(
  state: DesignerState,
  r: number,
  c: number,
  transform: { scale?: number; offsetX?: number; offsetY?: number } | undefined,
): void {
  if (!state.grid) return;

  const cell = state.grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;

  cell.objectTransform = transform;
  state.grid.set(r, c, cell);
  pushHistory(state);
}

/**
 * Clear tile (reset to default terrain, no object, no decors).
 */
export function clearTile(state: DesignerState, r: number, c: number): void {
  if (!state.grid) return;

  const cell = state.grid.get(r, c);
  if (!cell) return;

  // Clear multi-tile object (resolve anchor if continuation cell)
  if (cell.multiTileAnchor) {
    const anchor = resolveAnchor(r, c, state.grid);
    if (anchor) clearMultiTileObject(state.grid, anchor.r, anchor.c);
  } else if (cell.object !== ObjectId.NONE) {
    clearMultiTileObject(state.grid, r, c);
  }

  // Reset cell to defaults
  cell.ground = MAP_CONFIG.CLEAR_GROUND as TileId;
  cell.object = ObjectId.NONE;
  cell.decors = [];
  delete cell.objectProperties;
  delete cell.objectTransform;
  delete cell.objectRotation;
  delete cell.multiTileAnchor;
  delete cell.particleEffect;
  state.grid.set(r, c, cell);

  pushHistory(state);
  revalidate(state);
}

// ---------------------------------------------------------------------------
// Map loading
// ---------------------------------------------------------------------------

/**
 * Load a map from JSON file content.
 * Handles both native format (with grid 2D array) and generate-map format (with obstacles array).
 */
export function loadMap(state: DesignerState, jsonContent: string): Result<void> {
  try {
    const data = JSON.parse(jsonContent);

    // Detect format
    if (data.grid) {
      // Native designer format
      return loadNativeFormat(state, data);
    } else if (data.obstacles !== undefined || (data.rows && data.cols)) {
      // Generate-map format
      return loadGenerateMapFormat(state, data);
    } else {
      return { ok: false, error: 'Unknown map format' };
    }
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Load native designer format (with pre-built grid 2D array).
 */
function loadNativeFormat(state: DesignerState, data: any): Result<void> {
  const { rows, cols, grid: gridData, spawnPoints, enemySpawns, backgroundImage } = data;

  const grid = new GridModel<TileCell>(rows, cols, MAP_CONFIG.tileSize, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (gridData[r]?.[c]) {
        grid.set(r, c, gridData[r][c]);
      }
    }
  }

  state.grid = grid;
  state.mapData = {
    rows,
    cols,
    spawnPoints,
    enemySpawns,
  };
  state.mapMetadata = analyzeMapDetails(grid, backgroundImage);

  // Push initial state so undo can return to freshly-loaded map
  state.history = [{ grid: cloneGrid(grid), timestamp: Date.now() }];
  state.historyIndex = 0;
  state.validationResult = validateGrid(grid, state.mapData);
  centerCameraOnMap(state, grid);
  state.selectedCell = null;

  return { ok: true, value: undefined };
}

/**
 * Parse mockup string into grid (populates terrain and objects from symbols).
 * Mockup format: space-separated symbols per row, newline-separated rows.
 * Returns true on success, false if mockup is invalid/missing.
 */
function parseMockupToGrid(
  grid: GridModel<TileCell>,
  mockup: string | undefined,
  rows: number,
  cols: number
): boolean {
  if (!mockup || typeof mockup !== 'string') {
    return false;
  }

  const defaultCell = (): TileCell => ({ ground: MAP_CONFIG.DEFAULT_GROUND as TileId, object: ObjectId.NONE });

  const mockupRows = mockup.trim().split('\n');
  if (mockupRows.length !== rows) {
    console.warn(`Mockup has ${mockupRows.length} rows but expected ${rows}. Using partial data.`);
  }

  for (let r = 0; r < rows && r < mockupRows.length; r++) {
    const symbols = mockupRows[r].trim().split(/\s+/);
    if (symbols.length !== cols) {
      console.warn(`Row ${r} has ${symbols.length} cols but expected ${cols}. Using partial data.`);
    }

    for (let c = 0; c < cols && c < symbols.length; c++) {
      const symbol = symbols[c];

      // Skip spawn markers (1, 2) - they're handled separately via spawnPoints
      if (symbol === '1' || symbol === '2') {
        grid.set(r, c, defaultCell());
        continue;
      }

      const charCell = CHAR_MAP[symbol];
      if (charCell) {
        grid.set(r, c, { ...charCell });
      } else {
        console.warn(`Unknown symbol '${symbol}' at (${r},${c}). Using default terrain.`);
        grid.set(r, c, defaultCell());
      }
    }
  }

  // Fill any remaining cells with default terrain
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid.get(r, c)) {
        grid.set(r, c, defaultCell());
      }
    }
  }

  return true;
}

/**
 * Load generate-map format (with mockup string and optional obstacles array).
 * Converts to internal grid representation.
 */
function loadGenerateMapFormat(state: DesignerState, data: any): Result<void> {
  const { rows, cols, mockup, obstacles, spawnPoints, enemySpawns, backgroundImage } = data;

  if (!rows || !cols) {
    return { ok: false, error: 'Missing rows or cols in map data' };
  }

  const grid = new GridModel<TileCell>(rows, cols, MAP_CONFIG.tileSize, 0);

  // Parse mockup string to populate terrain and objects
  const mockupParsed = parseMockupToGrid(grid, mockup, rows, cols);

  if (!mockupParsed) {
    // Fallback: fill with default terrain if mockup missing/invalid
    console.warn('Mockup field missing or invalid. Filling with default terrain.');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid.set(r, c, { ground: MAP_CONFIG.DEFAULT_GROUND as TileId, object: ObjectId.NONE });
      }
    }
  }

  // Apply obstacles array (for explicit rotation/positioning overrides)
  // This mirrors generate-map.ts behavior at lines 364-377
  const validObjectIds = new Set(Object.values(ObjectId));
  for (const obstacle of obstacles || []) {
    if (!validObjectIds.has(obstacle.type as ObjectId)) {
      console.warn(`Invalid obstacle type '${obstacle.type}' at (${obstacle.r},${obstacle.c}). Skipping.`);
      continue;
    }

    const cell = grid.get(obstacle.r, obstacle.c);
    if (cell && obstacle.r >= 0 && obstacle.r < rows && obstacle.c >= 0 && obstacle.c < cols) {
      grid.set(obstacle.r, obstacle.c, {
        ...cell,
        object: obstacle.type as ObjectId,
        objectRotation: obstacle.rotation ?? 0,
      });
    }
  }

  state.mapData = {
    rows,
    cols,
    spawnPoints: spawnPoints || [],
    enemySpawns: enemySpawns || [],
  };

  state.grid = grid;
  state.mapMetadata = analyzeMapDetails(grid, backgroundImage);

  // Push initial state so undo can return to freshly-loaded map
  state.history = [{ grid: cloneGrid(grid), timestamp: Date.now() }];
  state.historyIndex = 0;
  state.validationResult = validateGrid(grid, state.mapData);
  centerCameraOnMap(state, grid);
  state.selectedCell = null;

  return { ok: true, value: undefined };
}

/**
 * Center camera on map bounds.
 */
function centerCameraOnMap(state: DesignerState, grid: GridModel<TileCell>): void {
  const mapCenterX = (grid.cols * MAP_CONFIG.tileSize) / 2;
  const mapCenterY = (grid.rows * MAP_CONFIG.tileSize) / 2;
  state.camera = { x: mapCenterX, y: mapCenterY, zoom: 1 };
}

// ---------------------------------------------------------------------------
// Save / Export
// ---------------------------------------------------------------------------

/**
 * Save current map to JSON string.
 */
export function saveMapToJSON(state: DesignerState): string {
  if (!state.grid || !state.mapData) {
    throw new Error('No map loaded');
  }

  const gridData: TileCell[][] = [];
  for (let r = 0; r < state.grid.rows; r++) {
    const row: TileCell[] = [];
    for (let c = 0; c < state.grid.cols; c++) {
      row.push(state.grid.get(r, c)!);
    }
    gridData.push(row);
  }

  return JSON.stringify({
    ...state.mapData,
    grid: gridData,
    metadata: {
      modified: new Date().toISOString(),
    },
  }, null, 2);
}

/**
 * Export map to TypeScript format.
 * Uses reverse CHAR_MAP lookup for unambiguous symbol mapping.
 */
export function exportToTypeScript(state: DesignerState, mapName: string): string {
  if (!state.grid || !state.mapData) {
    throw new Error('No map loaded');
  }

  // Build reverse lookup: (ground,object) → symbol
  const reverseMap = new Map<string, string>();
  for (const [symbol, cell] of Object.entries(CHAR_MAP)) {
    const key = `${cell.ground}|${cell.object}`;
    // First symbol wins (CHAR_MAP order is canonical)
    if (!reverseMap.has(key)) {
      reverseMap.set(key, symbol);
    }
  }

  const lines: string[] = [];
  for (let r = 0; r < state.grid.rows; r++) {
    const symbols: string[] = [];
    for (let c = 0; c < state.grid.cols; c++) {
      const cell = state.grid.get(r, c)!;
      const key = `${cell.ground}|${cell.object}`;
      symbols.push(reverseMap.get(key) ?? '?');
    }
    lines.push(`  '${symbols.join(' ')}',`);
  }

  return `export const ${mapName.toUpperCase()}_MAP = [\n${lines.join('\n')}\n];\n`;
}

/**
 * Set or clear particle effect on a tile.
 */
export function setParticleEffect(
  state: DesignerState,
  r: number,
  c: number,
  effect: TileParticleEffect | undefined,
): void {
  if (!state.grid) return;

  const cell = state.grid.get(r, c);
  if (!cell) return;

  if (effect) {
    cell.particleEffect = { ...effect };
  } else {
    delete cell.particleEffect;
  }
  state.grid.set(r, c, cell);
  pushHistory(state);
  revalidate(state);
}

// ---------------------------------------------------------------------------
// Grid cloning
// ---------------------------------------------------------------------------

/**
 * Clone grid for history.
 */
function cloneGrid(grid: GridModel<TileCell>): GridModel<TileCell> {
  const clone = new GridModel<TileCell>(grid.rows, grid.cols, grid.cellSize, grid.cellGap);
  grid.forEach((cell, r, c) => {
    clone.set(r, c, {
      ...cell,
      decors: cell.decors ? [...cell.decors] : undefined,
      objectTransform: cell.objectTransform ? { ...cell.objectTransform } : undefined,
      objectProperties: cell.objectProperties ? { ...cell.objectProperties } : undefined,
      particleEffect: cell.particleEffect ? { ...cell.particleEffect } : undefined,
    });
  });
  return clone;
}
