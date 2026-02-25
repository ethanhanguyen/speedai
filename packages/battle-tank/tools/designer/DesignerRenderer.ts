import { AssetManager, CameraSystem } from '@speedai/game-engine';
import type { DesignerState } from './DesignerState.js';
import { drawGroundLayer, drawObjectLayer } from '../../src/tilemap/TilemapRenderer.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';
import { CHAR_MAP } from '../../src/tilemap/TileRegistry.js';
import { ObjectId } from '../../src/tilemap/types.js';

/** Strategic zone color definitions. */
const ZONE_COLORS = {
  chokePoints: { rgba: 'rgba(255, 200, 0, 0.15)', label: 'Choke Point', color: '#ffc800' },
  sniperLanes: { rgba: 'rgba(0, 255, 255, 0.1)', label: 'Sniper Lane', color: '#00ffff' },
  ambushZones: { rgba: 'rgba(200, 0, 200, 0.15)', label: 'Ambush Zone', color: '#c800c8' },
  hazardZones: { rgba: 'rgba(255, 50, 50, 0.2)', label: 'Hazard Zone', color: '#ff3232' },
} as const;

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

  // Draw background image if available
  if (state.backgroundImage) {
    drawBackgroundImage(ctx, state.backgroundImage, worldWidth, worldHeight);
  }

  // Draw ground layer first, then objects
  drawGroundLayer(ctx, state.grid, camera, assets);
  drawObjectLayer(ctx, state.grid, camera, assets);

  // Draw grid overlay
  if (state.showGrid) {
    drawGridOverlay(ctx, state);
  }

  // Draw strategic zones
  if (state.showStrategicZones) {
    drawStrategicZones(ctx, state, canvas);
  }

  // Draw hover highlight
  if (state.hoveredCell) {
    drawHoverHighlight(ctx, state.hoveredCell.r, state.hoveredCell.c);
  }

  // Draw selection highlight
  if (state.selectedCell) {
    drawSelection(ctx, state.selectedCell.r, state.selectedCell.c);
  }

  // Draw tile symbols at centers
  if (state.showTileSymbols) {
    drawTileSymbols(ctx, state);
  }

  // Draw validation errors
  if (state.showValidation && state.validationResult) {
    drawValidationErrors(ctx, state);
  }

  ctx.restore();
}

/**
 * Draw background image scaled to world dimensions.
 */
function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  worldWidth: number,
  worldHeight: number
): void {
  ctx.drawImage(img, 0, 0, worldWidth, worldHeight);
}

/**
 * Draw grid overlay (tile boundaries) with adaptive opacity based on zoom.
 */
function drawGridOverlay(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.grid) return;

  const tileSize = MAP_CONFIG.tileSize;
  const worldWidth = state.grid.cols * tileSize;
  const worldHeight = state.grid.rows * tileSize;

  // Adaptive opacity: lighter at higher zoom
  const opacity = Math.min(0.4, 0.15 + state.camera.zoom * 0.08);
  ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
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
 * Draw hover highlight (semi-transparent overlay).
 */
function drawHoverHighlight(ctx: CanvasRenderingContext2D, r: number, c: number): void {
  const tileSize = MAP_CONFIG.tileSize;
  const x = c * tileSize;
  const y = r * tileSize;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(x, y, tileSize, tileSize);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, tileSize, tileSize);
}

/**
 * Draw selection highlight with enhanced visibility.
 */
function drawSelection(ctx: CanvasRenderingContext2D, r: number, c: number): void {
  const tileSize = MAP_CONFIG.tileSize;
  const x = c * tileSize;
  const y = r * tileSize;

  // Outer bright border
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, tileSize, tileSize);

  // Inner subtle border
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
}

/**
 * Draw tile symbols at cell centers (from CHAR_MAP).
 */
function drawTileSymbols(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.grid) return;

  const tileSize = MAP_CONFIG.tileSize;

  ctx.font = `bold ${tileSize * 0.4}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let r = 0; r < state.grid.rows; r++) {
    for (let c = 0; c < state.grid.cols; c++) {
      const cell = state.grid.get(r, c);
      if (!cell) continue;

      // Get symbol from CHAR_MAP
      let symbol = '';
      for (const [sym, mapCell] of Object.entries(CHAR_MAP)) {
        if (
          mapCell.ground === cell.ground &&
          (cell.object === ObjectId.NONE ? mapCell.object === ObjectId.NONE : mapCell.object !== ObjectId.NONE)
        ) {
          symbol = sym;
          break;
        }
      }

      if (!symbol) {
        // Fallback to first char of object or ground
        symbol = cell.object && cell.object !== ObjectId.NONE ? cell.object[0].toUpperCase() : cell.ground[0];
      }

      const x = c * tileSize + tileSize / 2;
      const y = r * tileSize + tileSize / 2;

      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.fillText(symbol, x, y);
    }
  }
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
 * Draw strategic zones from metadata analysis + legend.
 */
function drawStrategicZones(
  ctx: CanvasRenderingContext2D,
  state: DesignerState,
  canvas: HTMLCanvasElement
): void {
  if (!state.mapMetadata?.strategicZones) return;

  const tileSize = MAP_CONFIG.tileSize;
  const zones = state.mapMetadata.strategicZones;

  // Chokepoints
  if (zones.chokePoints) {
    ctx.fillStyle = ZONE_COLORS.chokePoints.rgba;
    for (const pos of zones.chokePoints) {
      ctx.fillRect(pos.c * tileSize, pos.r * tileSize, tileSize, tileSize);
    }
  }

  // Sniper lanes
  if (zones.sniperLanes) {
    ctx.fillStyle = ZONE_COLORS.sniperLanes.rgba;
    for (const pos of zones.sniperLanes) {
      ctx.fillRect(pos.c * tileSize, pos.r * tileSize, tileSize, tileSize);
    }
  }

  // Ambush zones
  if (zones.ambushZones) {
    ctx.fillStyle = ZONE_COLORS.ambushZones.rgba;
    for (const pos of zones.ambushZones) {
      ctx.fillRect(pos.c * tileSize, pos.r * tileSize, tileSize, tileSize);
    }
  }

  // Hazard zones
  if (zones.hazardZones) {
    ctx.fillStyle = ZONE_COLORS.hazardZones.rgba;
    for (const pos of zones.hazardZones) {
      ctx.fillRect(pos.c * tileSize, pos.r * tileSize, tileSize, tileSize);
    }
  }

  // Draw legend (after restoring transform)
  ctx.restore();
  drawZoneLegend(ctx);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.camera.zoom, state.camera.zoom);
  ctx.translate(-state.camera.x, -state.camera.y);
}

/**
 * Draw zone legend in screen-space (top-left corner).
 */
function drawZoneLegend(ctx: CanvasRenderingContext2D): void {
  const padding = 12;
  const lineHeight = 18;
  const boxSize = 12;
  const gap = 6;

  const zones = Object.entries(ZONE_COLORS);
  const height = padding * 2 + zones.length * lineHeight;
  const width = 160;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(padding, padding, width, height);

  // Border
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, padding, width, height);

  // Legend items
  ctx.font = '11px monospace';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < zones.length; i++) {
    const [, { label, color }] = zones[i];
    const y = padding + 6 + i * lineHeight;

    // Color box
    ctx.fillStyle = color;
    ctx.fillRect(padding + 6, y - boxSize / 2, boxSize, boxSize);

    // Label
    ctx.fillStyle = '#ddd';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding + 6 + boxSize + gap, y);
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
