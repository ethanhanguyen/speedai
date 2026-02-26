import { GridModel } from '@speedai/game-engine';
import type { DesignerState, GridSnapshot } from './DesignerState.js';
import { TileId, ObjectId, DecorId } from '../../src/tilemap/types.js';
import type { TileCell, MapData } from '../../src/tilemap/types.js';
import { OBJECT_DEFS, CHAR_MAP } from '../../src/tilemap/TileRegistry.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';
import { validateGrid } from '../MapValidator.js';
import { resolveAnchor, getOccupiedCells } from '../../src/tilemap/MultiTileUtils.js';
import { analyzeMapDetails } from '../../src/tilemap/MapDetailsAnalyzer.js';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Build mockup symbol → ObjectId lookup from CHAR_MAP.
 */
function getMockupLookup(): Map<string, ObjectId> {
  const lookup = new Map<string, ObjectId>();
  for (const [symbol, cell] of Object.entries(CHAR_MAP)) {
    if (cell.object !== ObjectId.NONE) {
      lookup.set(symbol, cell.object);
    }
  }
  return lookup;
}

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
      grid.set(r, c, gridData[r][c]);
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
  state.history = [];
  state.historyIndex = -1;
  state.validationResult = validateGrid(grid, state.mapData);
  centerCameraOnMap(state, grid);
  state.selectedCell = null;

  return { ok: true, value: undefined };
}

/**
 * Load generate-map format (with flat obstacles array).
 * Converts to internal grid representation.
 */
function loadGenerateMapFormat(state: DesignerState, data: any): Result<void> {
  const { rows, cols, obstacles, spawnPoints, enemySpawns, backgroundImage } = data;

  if (!rows || !cols) {
    return { ok: false, error: 'Missing rows or cols in map data' };
  }

  // Build 2D grid from flat obstacles array
  const grid = new GridModel<TileCell>(rows, cols, MAP_CONFIG.tileSize, 0);

  // Fill all cells with default terrain
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.set(r, c, {
        ground: TileId.LOOSE_SAND,
        object: ObjectId.NONE,
      });
    }
  }

  // Build mockup → ObjectId lookup
  const mockupLookup = getMockupLookup();

  // Place obstacles from flat array
  for (const obstacle of obstacles || []) {
    const cell = grid.get(obstacle.r, obstacle.c);
    if (cell && obstacle.r >= 0 && obstacle.r < rows && obstacle.c >= 0 && obstacle.c < cols) {
      // Resolve ObjectId from mockup symbol or use directly if already ObjectId
      let objectId: ObjectId = ObjectId.NONE;
      if (obstacle.type) {
        objectId = mockupLookup.get(obstacle.type) ?? (obstacle.type as ObjectId);
      }
      grid.set(obstacle.r, obstacle.c, {
        ...cell,
        object: objectId,
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
  state.history = [];
  state.historyIndex = -1;
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
 * Export map to TypeScript format (like survival_01.ts).
 */
export function exportToTypeScript(state: DesignerState, mapName: string): string {
  if (!state.grid || !state.mapData) {
    throw new Error('No map loaded');
  }

  // Generate ASCII mockup
  const lines: string[] = [];
  for (let r = 0; r < state.grid.rows; r++) {
    let line = '';
    for (let c = 0; c < state.grid.cols; c++) {
      const cell = state.grid.get(r, c)!;
      // Simple char map (extend as needed)
      if (cell.object !== 'none') {
        line += cell.object[0].toUpperCase();
      } else {
        line += cell.ground[0];
      }
    }
    lines.push(`  '${line}',`);
  }

  return `export const ${mapName.toUpperCase()}_MAP = [\n${lines.join('\n')}\n];\n`;
}

/**
 * Push current state to history (for undo).
 */
export function pushHistory(state: DesignerState): void {
  if (!state.grid) return;

  // Clone grid
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
    if (state.mapData) {
      state.validationResult = validateGrid(state.grid!, state.mapData);
    }
  }
}

/**
 * Redo last undone action.
 */
export function redo(state: DesignerState): void {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.grid = cloneGrid(state.history[state.historyIndex].grid);
    if (state.mapData) {
      state.validationResult = validateGrid(state.grid!, state.mapData);
    }
  }
}

/**
 * Set ground tile at position.
 */
export function setGround(state: DesignerState, r: number, c: number, tileId: TileId): void {
  if (!state.grid) return;

  pushHistory(state);
  const cell = state.grid.get(r, c);
  if (cell) {
    cell.ground = tileId;
    state.grid.set(r, c, cell);
  }

  if (state.mapData) {
    state.validationResult = validateGrid(state.grid, state.mapData);
  }
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

  pushHistory(state);

  // 1. Resolve anchor if continuation cell selected
  const cell = state.grid.get(r, c);
  if (!cell) {
    return { ok: false, error: 'Invalid cell' };
  }

  let anchorR = r;
  let anchorC = c;
  if (cell.multiTileAnchor) {
    const anchor = resolveAnchor(r, c, state.grid);
    if (anchor) {
      anchorR = anchor.r;
      anchorC = anchor.c;
    }
  }

  // 2. Clear old object at anchor (if exists)
  clearMultiTileObject(state.grid, anchorR, anchorC);

  // 3. Place new object
  if (objId !== 'none') {
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
        if (!state.grid.isValid(nr, nc)) {
          return { ok: false, error: 'Object extends beyond grid bounds' };
        }
      }
    }

    // Place anchor
    const anchorCell = state.grid.get(anchorR, anchorC)!;
    anchorCell.object = objId;
    anchorCell.objectRotation = rotation;
    delete anchorCell.multiTileAnchor;
    state.grid.set(anchorR, anchorC, anchorCell);

    // Place continuations
    for (let dr = 0; dr < span.h; dr++) {
      for (let dc = 0; dc < span.w; dc++) {
        if (dr === 0 && dc === 0) continue; // Skip anchor
        const nr = anchorR + dr;
        const nc = anchorC + dc;
        const contCell = state.grid.get(nr, nc)!;
        contCell.object = ObjectId.NONE;
        contCell.multiTileAnchor = { r: anchorR, c: anchorC };
        delete contCell.objectRotation;
        state.grid.set(nr, nc, contCell);
      }
    }
  }

  if (state.mapData) {
    state.validationResult = validateGrid(state.grid, state.mapData);
  }

  return { ok: true, value: undefined };
}

/**
 * Clear all objects in multi-tile group at position.
 */
function clearMultiTileObject(grid: GridModel<TileCell>, r: number, c: number): void {
  const cell = grid.get(r, c);
  if (!cell || cell.object === 'none') return;

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

/**
 * Toggle decor at position.
 */
export function toggleDecor(state: DesignerState, r: number, c: number, decorId: DecorId): void {
  if (!state.grid) return;

  pushHistory(state);
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
}

/**
 * Rotate object at selected cell (cycle 0→90→180→270→0).
 */
export function rotateObject(state: DesignerState, r: number, c: number): void {
  if (!state.grid) return;

  const cell = state.grid.get(r, c);
  if (!cell || cell.object === ObjectId.NONE) return;

  pushHistory(state);
  const currentRotation = cell.objectRotation ?? 0;
  const newRotation = (currentRotation + 90) % 360;
  cell.objectRotation = newRotation;
  state.grid.set(r, c, cell);

  if (state.mapData) {
    state.validationResult = validateGrid(state.grid, state.mapData);
  }
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

  pushHistory(state);
  if (!cell.objectProperties) {
    cell.objectProperties = {};
  }
  (cell.objectProperties as any)[propName] = value;
  state.grid.set(r, c, cell);

  if (state.mapData) {
    state.validationResult = validateGrid(state.grid, state.mapData);
  }
}

/**
 * Clear tile (reset to grass_plains, no object, no decors).
 */
export function clearTile(state: DesignerState, r: number, c: number): void {
  if (!state.grid) return;

  pushHistory(state);
  setObject(state, r, c, ObjectId.NONE, 0);
  const cell = state.grid.get(r, c);
  if (cell) {
    cell.ground = TileId.GRASS_PLAINS;
    cell.decors = [];
    delete cell.objectProperties;
    state.grid.set(r, c, cell);
  }

  if (state.mapData) {
    state.validationResult = validateGrid(state.grid, state.mapData);
  }
}

/**
 * Clone grid for history.
 */
function cloneGrid(grid: GridModel<TileCell>): GridModel<TileCell> {
  const clone = new GridModel<TileCell>(grid.rows, grid.cols, grid.cellSize, grid.cellGap);
  grid.forEach((cell, r, c) => {
    clone.set(r, c, {
      ...cell,
      decors: cell.decors ? [...cell.decors] : undefined,
      objectProperties: cell.objectProperties ? { ...cell.objectProperties } : undefined,
    });
  });
  return clone;
}
