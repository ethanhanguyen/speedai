import type { GridModel } from '@speedai/game-engine';
import type { TileCell, MapData, TileId, ObjectId, DecorId } from '../../src/tilemap/types.js';
import type { ValidationResult } from '../MapValidator.js';

/** Available editing tools. */
export type Tool = 'select' | 'paint' | 'erase' | 'fill' | 'rect';

/** Snapshot for undo/redo. */
export interface GridSnapshot {
  grid: GridModel<TileCell>;
  timestamp: number;
}

/** Complete designer state. */
export interface DesignerState {
  // Map data
  mapData: MapData | null;
  grid: GridModel<TileCell> | null;

  // UI state
  selectedCell: { r: number; c: number } | null;
  camera: { x: number; y: number; zoom: number };
  activeTool: Tool;

  // Palette (what to paint)
  paintGround: TileId;
  paintObject: ObjectId;
  paintRotation: number;
  paintDecors: DecorId[];

  // History (undo/redo)
  history: GridSnapshot[];
  historyIndex: number;
  maxHistory: number;

  // Validation
  validationResult: ValidationResult | null;

  // Background image (optional)
  backgroundImage: HTMLImageElement | null;

  // UI flags
  showGrid: boolean;
  showValidation: boolean;

  // Load state
  loadError: string | null;
}

/** Create initial empty state. */
export function createInitialState(): DesignerState {
  return {
    mapData: null,
    grid: null,
    selectedCell: null,
    camera: { x: 0, y: 0, zoom: 1 },
    activeTool: 'select',
    paintGround: 'grass_plains' as TileId,
    paintObject: 'none' as ObjectId,
    paintRotation: 0,
    paintDecors: [],
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    validationResult: null,
    backgroundImage: null,
    showGrid: true,
    showValidation: true,
    loadError: null,
  };
}
