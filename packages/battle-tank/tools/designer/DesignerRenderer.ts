import { AssetManager, CameraSystem } from '@speedai/game-engine';
import type { DesignerState } from './DesignerState.js';
import { drawGroundLayer, drawObjectLayer } from '../../src/tilemap/TilemapRenderer.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';

/**
 * Render designer view (reuses game's tilemap renderer for WYSIWYG).
 */
export function renderDesigner(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: DesignerState,
  assets: AssetManager
): void {
  if (!state.grid) return;

  // Clear
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Save context
  ctx.save();

  // Apply camera transform
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.camera.zoom, state.camera.zoom);
  ctx.translate(-state.camera.x, -state.camera.y);

  // Create temporary camera system for rendering
  const worldWidth = state.grid.cols * MAP_CONFIG.tileSize;
  const worldHeight = state.grid.rows * MAP_CONFIG.tileSize;
  const camera = new CameraSystem({
    viewportWidth: canvas.width,
    viewportHeight: canvas.height,
    worldWidth,
    worldHeight,
    zoom: state.camera.zoom,
  });
  camera.x = state.camera.x;
  camera.y = state.camera.y;

  // Draw ground layer first, then objects
  drawGroundLayer(ctx, state.grid, camera, assets);
  drawObjectLayer(ctx, state.grid, camera, assets);

  // Draw grid overlay
  if (state.showGrid) {
    drawGridOverlay(ctx, state);
  }

  // Draw selection highlight
  if (state.selectedCell) {
    drawSelection(ctx, state.selectedCell.r, state.selectedCell.c);
  }

  // Draw validation errors
  if (state.showValidation && state.validationResult) {
    drawValidationErrors(ctx, state);
  }

  ctx.restore();
}

/**
 * Draw grid overlay (tile boundaries).
 */
function drawGridOverlay(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.grid) return;

  const tileSize = MAP_CONFIG.tileSize;
  const worldWidth = state.grid.cols * tileSize;
  const worldHeight = state.grid.rows * tileSize;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1 / state.camera.zoom;

  // Vertical lines
  for (let c = 0; c <= state.grid.cols; c++) {
    const x = c * tileSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, worldHeight);
    ctx.stroke();
  }

  // Horizontal lines
  for (let r = 0; r <= state.grid.rows; r++) {
    const y = r * tileSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(worldWidth, y);
    ctx.stroke();
  }
}

/**
 * Draw selection highlight.
 */
function drawSelection(ctx: CanvasRenderingContext2D, r: number, c: number): void {
  const tileSize = MAP_CONFIG.tileSize;
  const x = c * tileSize;
  const y = r * tileSize;

  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, tileSize, tileSize);
}

/**
 * Draw validation error indicators.
 */
function drawValidationErrors(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.validationResult) return;

  const tileSize = MAP_CONFIG.tileSize;

  for (const error of state.validationResult.errors) {
    if (error.position) {
      const x = error.position.c * tileSize;
      const y = error.position.r * tileSize;

      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileSize, tileSize);

      // Draw X
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + tileSize - 4, y + tileSize - 4);
      ctx.moveTo(x + tileSize - 4, y + 4);
      ctx.lineTo(x + 4, y + tileSize - 4);
      ctx.stroke();
    }
  }
}

/**
 * Convert screen coordinates to grid position.
 */
export function screenToGrid(
  state: DesignerState,
  canvas: HTMLCanvasElement,
  screenX: number,
  screenY: number
): { r: number; c: number } | null {
  if (!state.grid) return null;

  // Convert screen to world
  const worldX = (screenX - canvas.width / 2) / state.camera.zoom + state.camera.x;
  const worldY = (screenY - canvas.height / 2) / state.camera.zoom + state.camera.y;

  const tileSize = MAP_CONFIG.tileSize;
  const c = Math.floor(worldX / tileSize);
  const r = Math.floor(worldY / tileSize);

  if (r >= 0 && r < state.grid.rows && c >= 0 && c < state.grid.cols) {
    return { r, c };
  }

  return null;
}
