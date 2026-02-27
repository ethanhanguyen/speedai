import { AssetManager, CameraSystem } from '@speedai/game-engine';
import type { DesignerState } from './DesignerState.js';
import { drawGroundLayer, drawObjectLayer } from '../../src/tilemap/TilemapRenderer.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';
import { CHAR_MAP } from '../../src/tilemap/TileRegistry.js';
import { ObjectId } from '../../src/tilemap/types.js';
import type { TileParticleLayer } from '../../src/vfx/TileParticleLayer.js';

/** Strategic zone color definitions. */
const ZONE_COLORS = {
  chokePoints: { rgba: 'rgba(255, 200, 0, 0.15)', label: 'Choke Point', color: '#ffc800' },
  ambushZones: { rgba: 'rgba(200, 0, 200, 0.15)', label: 'Ambush Zone', color: '#c800c8' },
  hazardZones: { rgba: 'rgba(255, 50, 50, 0.2)', label: 'Hazard Zone', color: '#ff3232' },
} as const;

/** Shorthand for designer rendering config. */
const DR = () => MAP_CONFIG.DESIGNER_RENDERING;

/**
 * Render designer view (reuses game's tilemap renderer for WYSIWYG).
 */
export function renderDesigner(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: DesignerState,
  assets: AssetManager,
  tileParticles?: TileParticleLayer,
): void {
  if (!state.grid) return;

  const cfg = DR();

  // Clear
  ctx.fillStyle = cfg.emptyCanvasColor;
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
    drawBackgroundImage(ctx, state.backgroundImage, worldWidth, worldHeight, state.backgroundImageOpacity);
  }

  // Draw ground layer first, then objects, then particle effects
  drawGroundLayer(ctx, state.grid, camera, assets);
  drawObjectLayer(ctx, state.grid, camera, assets);
  if (tileParticles) {
    tileParticles.draw(ctx);
  }

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

  // Draw validation warnings
  if (state.showValidation && state.validationResult) {
    drawValidationWarnings(ctx, state);
  }

  ctx.restore();

  // Draw control hints (screen-space, bottom-right)
  if (state.showControlHints) {
    drawControlHints(ctx, canvas, state);
  }
}

/**
 * Draw background image scaled to world dimensions with opacity.
 */
function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  worldWidth: number,
  worldHeight: number,
  opacity: number
): void {
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, 0, 0, worldWidth, worldHeight);
  ctx.globalAlpha = 1;
}

/**
 * Draw grid overlay (tile boundaries) with adaptive opacity based on zoom.
 */
function drawGridOverlay(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.grid) return;

  const cfg = DR();
  const tileSize = MAP_CONFIG.tileSize;
  const worldWidth = state.grid.cols * tileSize;
  const worldHeight = state.grid.rows * tileSize;

  // Adaptive opacity: lighter at higher zoom
  const opacity = Math.min(cfg.gridMaxOpacity, cfg.gridBaseOpacity + state.camera.zoom * cfg.gridZoomScale);
  ctx.strokeStyle = `rgba(${cfg.gridColorRGB}, ${opacity})`;
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
  const cfg = DR();
  const tileSize = MAP_CONFIG.tileSize;
  const x = c * tileSize;
  const y = r * tileSize;

  ctx.fillStyle = cfg.hoverFill;
  ctx.fillRect(x, y, tileSize, tileSize);

  ctx.strokeStyle = cfg.hoverStroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, tileSize, tileSize);
}

/**
 * Draw selection highlight with enhanced visibility.
 */
function drawSelection(ctx: CanvasRenderingContext2D, r: number, c: number): void {
  const cfg = DR();
  const tileSize = MAP_CONFIG.tileSize;
  const x = c * tileSize;
  const y = r * tileSize;

  // Outer bright border
  ctx.strokeStyle = cfg.selectionColor;
  ctx.lineWidth = cfg.selectionOuterWidth;
  ctx.strokeRect(x, y, tileSize, tileSize);

  // Inner subtle border
  const inset = cfg.selectionInnerInset;
  ctx.globalAlpha = cfg.selectionInnerAlpha;
  ctx.strokeStyle = cfg.selectionColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
  ctx.globalAlpha = 1;
}

/**
 * Draw tile symbols at cell centers (from CHAR_MAP).
 */
function drawTileSymbols(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.grid) return;

  const cfg = DR();
  const tileSize = MAP_CONFIG.tileSize;

  ctx.font = `bold ${tileSize * cfg.symbolFontScale}px monospace`;
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

      ctx.fillStyle = cfg.symbolColor;
      ctx.fillText(symbol, x, y);
    }
  }
}

/**
 * Draw validation warning indicators.
 */
function drawValidationWarnings(ctx: CanvasRenderingContext2D, state: DesignerState): void {
  if (!state.validationResult) return;

  const cfg = DR();
  const tileSize = MAP_CONFIG.tileSize;

  for (const warning of state.validationResult.warnings) {
    if (warning.position) {
      const x = warning.position.c * tileSize;
      const y = warning.position.r * tileSize;

      ctx.strokeStyle = cfg.warningColor;
      ctx.lineWidth = cfg.warningLineWidth;
      ctx.strokeRect(x, y, tileSize, tileSize);
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
 * Draw control hints panel (screen-space, bottom-right corner).
 * Adapts content based on device detection and zoom level.
 */
function drawControlHints(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: DesignerState
): void {
  const cfg = MAP_CONFIG.CONTROL_HINTS;
  const padding = cfg.padding;
  const lineHeight = cfg.lineHeight;
  const width = cfg.width;

  // Build hints based on context
  const hints: string[] = [];

  if (!state.grid) {
    // No map loaded
    hints.push('Space+Drag: Pan');
    hints.push('Ctrl+Wheel: Zoom');
    hints.push('Ctrl+0: Reset Zoom');
  } else {
    // Map loaded - show device-specific hints
    if (state.isTrackpad === true) {
      hints.push('Space+Drag: Pan (trackpad)');
      hints.push('Ctrl+Wheel: Zoom');
    } else if (state.isTrackpad === false) {
      hints.push('Space+Drag or Mid-Drag: Pan');
      hints.push('Wheel or Ctrl+Wheel: Zoom');
    } else {
      // Unknown device - show all options
      hints.push('Space+Drag or Mid-Drag: Pan');
      hints.push('Wheel: Zoom');
    }

    hints.push(`Arrow Keys: Pan | Shift+Arrow: Fast`);
    hints.push(`Ctrl+1/2/3: 50%/100%/200% | Ctrl+0: Reset`);
    hints.push(`Zoom: ${Math.round(state.camera.zoom * 100)}%`);
  }

  const height = cfg.fontSize * 1.2 + lineHeight * hints.length + cfg.padding * 2;
  const x = canvas.width - width - padding;
  const y = canvas.height - height - padding;

  // Background
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.strokeStyle = cfg.borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Text
  ctx.font = `${cfg.fontSize}px monospace`;
  ctx.fillStyle = cfg.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < hints.length; i++) {
    const hintY = y + cfg.padding + i * lineHeight;
    ctx.fillText(hints[i], x + cfg.padding, hintY);
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
