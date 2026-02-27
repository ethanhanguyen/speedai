import { AssetManager } from '@speedai/game-engine';
import { createInitialState } from './DesignerState.js';
import type { DesignerState } from './DesignerState.js';
import { renderDesigner, screenToGrid } from './DesignerRenderer.js';
import {
  loadMap,
  saveMapToJSON,
  exportToTypeScript,
  undo,
  redo,
  setGround,
  setObject,
  paintTile,
  toggleDecor,
  clearTile,
  rotateObject,
  rotateObjectCCW,
  updateObjectProperty,
  updateObjectTransform,
  setParticleEffect,
} from './DesignerActions.js';
import { MAP_CONFIG } from '../../src/config/MapConfig.js';
import { TileId, ObjectId, DecorId, ParticleEffectId } from '../../src/tilemap/types.js';
import type { TileParticleEffect } from '../../src/tilemap/types.js';
import { TileParticleLayer } from '../../src/vfx/TileParticleLayer.js';
import {
  renderObjectProfile,
  renderTerrainProfile,
} from './ArchetypeProfile.js';

// Global state
let state: DesignerState = createInitialState();
let assets: AssetManager;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

// Background image URL (tracked for revocation on re-load)
let backgroundImageUrl: string | null = null;

// Live particle preview layer
let tileParticles: TileParticleLayer | null = null;
let lastFrameTime = 0;

// Mouse state
let isDragging = false;
let isPanning = false;
let isSpacePanning = false;
let lastMousePos = { x: 0, y: 0 };

// Keyboard state
let keysPressed = new Set<string>();

/**
 * Detect if input device is trackpad or mouse.
 */
function detectInputDevice(): void {
  const handler = (e: WheelEvent) => {
    // deltaMode 0 = pixels (trackpad smooth scroll), 1 = lines (mouse wheel)
    if (e.deltaMode === 1) {
      state.isTrackpad = false; // Mouse (line-based scroll)
    } else if (e.deltaMode === 0) {
      // Pixel mode: trackpads send many small deltas, mice send large discrete ones
      state.isTrackpad = Math.abs(e.deltaY) < 50 && !Number.isInteger(e.deltaY);
    }
    window.removeEventListener('wheel', handler);
  };
  window.addEventListener('wheel', handler, { once: true, passive: true });
}

/**
 * Initialize designer.
 */
export async function init() {
  console.log('Initializing Battle Tank Map Designer...');

  // Detect input device on first interaction
  detectInputDevice();

  // Create asset manager
  assets = new AssetManager();

  // Load assets (minimal set for preview)
  const assetManifest = await buildAssetManifest();
  const loadPromises: Promise<any>[] = [];
  for (const [key, path] of Object.entries(assetManifest.images)) {
    loadPromises.push(assets.loadImage(key, path));
  }
  // Use allSettled to continue even if some sprites are missing (variants may not exist)
  const results = await Promise.allSettled(loadPromises);
  const failedCount = results.filter(r => r.status === 'rejected').length;
  if (failedCount > 0) {
    console.warn(`Designer: ${failedCount} sprites failed to load (expected for missing variants)`);
  }

  // Populate terrain and object dropdowns from data configs
  await populateDropdowns();

  // Setup canvas
  canvas = document.getElementById('designer-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  // Resize canvas to viewport
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Setup UI event listeners
  setupEventListeners();

  // Initialize panel visibility
  updatePanelVisibility();

  // Start render loop
  requestAnimationFrame(render);

  console.log('Designer ready!');
}

/**
 * Render loop.
 */
function render(timestamp: number) {
  const dt = lastFrameTime > 0 ? Math.min((timestamp - lastFrameTime) / 1000, 0.1) : 0;
  lastFrameTime = timestamp;

  if (state.grid) {
    // Update live particle preview
    if (tileParticles) {
      tileParticles.update(dt, getDummyCamera());
    }

    renderDesigner(ctx, canvas, state, assets, tileParticles ?? undefined);
  } else {
    // Show empty state
    const dr = MAP_CONFIG.DESIGNER_RENDERING;
    ctx.fillStyle = dr.emptyCanvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dr.emptyTextColor;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Load a map to begin editing', canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(render);
}

/** Create a minimal camera-like object for TileParticleLayer culling in designer. */
function getDummyCamera(): any {
  return {
    x: state.camera.x,
    y: state.camera.y,
    zoom: state.camera.zoom,
    getTransform() {
      return {
        viewportWidth: canvas.width,
        viewportHeight: canvas.height,
        zoom: state.camera.zoom,
      };
    },
    isVisible(wx: number, wy: number, ww: number, wh: number): boolean {
      const halfW = (canvas.width / 2) / state.camera.zoom;
      const halfH = (canvas.height / 2) / state.camera.zoom;
      return !(
        wx + ww < state.camera.x - halfW ||
        wx > state.camera.x + halfW ||
        wy + wh < state.camera.y - halfH ||
        wy > state.camera.y + halfH
      );
    },
  };
}

/**
 * Resize canvas to fill viewport.
 */
function resizeCanvas() {
  const container = document.getElementById('viewport')!;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

/**
 * Setup all UI event listeners.
 */
function setupEventListeners() {
  // Canvas mouse events
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Keyboard shortcuts
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // UI buttons
  document.getElementById('btn-load')?.addEventListener('click', onLoadClick);
  document.getElementById('btn-save')?.addEventListener('click', onSaveClick);
  document.getElementById('btn-export')?.addEventListener('click', onExportClick);
  document.getElementById('btn-undo')?.addEventListener('click', () => undo(state));
  document.getElementById('btn-redo')?.addEventListener('click', () => redo(state));
  document.getElementById('btn-toggle-zones')?.addEventListener('click', onToggleZonesClick);
  document.getElementById('btn-toggle-symbols')?.addEventListener('click', onToggleSymbolsClick);

  // Background opacity slider
  document.getElementById('bg-opacity-slider')?.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    state.backgroundImageOpacity = value / 100;
    const valueEl = document.getElementById('bg-opacity-value');
    if (valueEl) valueEl.textContent = `${value}%`;
  });

  // Clear hovered cell on mouse leave
  canvas.addEventListener('mouseleave', () => {
    state.hoveredCell = null;
  });

  // Tool buttons
  const tools: Array<typeof state.activeTool> = ['select', 'paint', 'erase', 'fill', 'rect'];
  tools.forEach((tool) => {
    document.getElementById(`tool-${tool}`)?.addEventListener('click', () => {
      state.activeTool = tool;
      updateToolUI();
    });
  });

  // Palette inputs
  document.getElementById('palette-ground')?.addEventListener('change', (e) => {
    state.paintGround = (e.target as HTMLSelectElement).value as TileId;
  });

  document.getElementById('palette-object')?.addEventListener('change', (e) => {
    state.paintObject = (e.target as HTMLSelectElement).value as ObjectId;
  });

  document.getElementById('palette-rotation')?.addEventListener('change', (e) => {
    state.paintRotation = parseInt((e.target as HTMLSelectElement).value);
  });

  // Inspector inputs (edit selected cell)
  document.getElementById('inspector-ground')?.addEventListener('change', (e) => {
    if (state.selectedCell && state.grid) {
      const tileId = (e.target as HTMLSelectElement).value as TileId;
      setGround(state, state.selectedCell.r, state.selectedCell.c, tileId);
    }
  });

  document.getElementById('inspector-object')?.addEventListener('change', async (e) => {
    if (state.selectedCell && state.grid) {
      const objId = (e.target as HTMLSelectElement).value as ObjectId;
      setObject(state, state.selectedCell.r, state.selectedCell.c, objId, state.paintRotation);
      await updateInspector();
    }
  });

  // Object property checkboxes
  const propCheckboxes = ['isImpassable', 'isDestructible', 'isVisualOverlay'];
  for (const prop of propCheckboxes) {
    document.getElementById(`prop-${prop}`)?.addEventListener('change', async (e) => {
      if (state.selectedCell && state.grid) {
        const checked = (e.target as HTMLInputElement).checked;
        updateObjectProperty(state, state.selectedCell.r, state.selectedCell.c, prop, checked);
        await updateInspector();
      }
    });
  }

  // Object property inputs (clearSpeed, strategicRole)
  document.getElementById('prop-clearSpeed')?.addEventListener('change', (e) => {
    if (state.selectedCell && state.grid) {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updateObjectProperty(state, state.selectedCell.r, state.selectedCell.c, 'clearSpeed', val);
    }
  });

  document.getElementById('prop-strategicRole')?.addEventListener('change', (e) => {
    if (state.selectedCell && state.grid) {
      const val = (e.target as HTMLInputElement).value;
      updateObjectProperty(state, state.selectedCell.r, state.selectedCell.c, 'strategicRole', val);
    }
  });

  // Object transform sliders
  const transformFields = ['scale', 'offsetX', 'offsetY'] as const;
  for (const field of transformFields) {
    document.getElementById(`transform-${field}`)?.addEventListener('input', (e) => {
      if (!state.selectedCell || !state.grid) return;
      const raw = parseInt((e.target as HTMLInputElement).value);
      const normalized = raw / 100;
      const valueEl = document.getElementById(`transform-${field}-value`);
      if (valueEl) valueEl.textContent = normalized.toFixed(2);

      const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
      if (!cell || cell.object === ObjectId.NONE) return;

      const current = cell.objectTransform ?? {};
      updateObjectTransform(state, state.selectedCell.r, state.selectedCell.c, {
        ...current,
        [field]: normalized,
      });
    });
  }

  document.getElementById('btn-reset-transform')?.addEventListener('click', () => {
    if (!state.selectedCell || !state.grid) return;
    updateObjectTransform(state, state.selectedCell.r, state.selectedCell.c, undefined);
    updateTransformPanel();
  });

  // Inspector rotation
  document.getElementById('inspector-rotation')?.addEventListener('change', async (e) => {
    if (state.selectedCell && state.grid) {
      const rotation = parseInt((e.target as HTMLSelectElement).value);
      const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
      if (cell && cell.object !== ObjectId.NONE) {
        setObject(state, state.selectedCell.r, state.selectedCell.c, cell.object, rotation);
        await updateInspector();
      }
    }
  });

  // Particle effect type dropdown
  document.getElementById('particle-effect-type')?.addEventListener('change', (e) => {
    if (!state.selectedCell || !state.grid) return;
    const value = (e.target as HTMLSelectElement).value;
    if (!value) {
      setParticleEffect(state, state.selectedCell.r, state.selectedCell.c, undefined);
    } else {
      const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
      const existing = cell?.particleEffect;
      setParticleEffect(state, state.selectedCell.r, state.selectedCell.c, {
        effectId: value as ParticleEffectId,
        sizeMultiplier: existing?.sizeMultiplier,
        offsetX: existing?.offsetX,
        offsetY: existing?.offsetY,
      });
    }
    syncParticleEmitter();
  });

  // Particle size slider
  document.getElementById('particle-size')?.addEventListener('input', (e) => {
    if (!state.selectedCell || !state.grid) return;
    const raw = parseInt((e.target as HTMLInputElement).value);
    const normalized = raw / 100;
    const valueEl = document.getElementById('particle-size-value');
    if (valueEl) valueEl.textContent = normalized.toFixed(2);

    const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
    if (!cell?.particleEffect) return;

    setParticleEffect(state, state.selectedCell.r, state.selectedCell.c, {
      ...cell.particleEffect,
      sizeMultiplier: normalized,
    });
    syncParticleEmitter();
  });

  // Particle offset sliders
  const particleOffsetFields = ['offsetX', 'offsetY'] as const;
  for (const field of particleOffsetFields) {
    document.getElementById(`particle-${field}`)?.addEventListener('input', (e) => {
      if (!state.selectedCell || !state.grid) return;
      const raw = parseInt((e.target as HTMLInputElement).value);
      const normalized = raw / 100;
      const valueEl = document.getElementById(`particle-${field}-value`);
      if (valueEl) valueEl.textContent = normalized.toFixed(2);

      const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
      if (!cell?.particleEffect) return;

      setParticleEffect(state, state.selectedCell.r, state.selectedCell.c, {
        ...cell.particleEffect,
        [field]: normalized,
      });
      syncParticleEmitter();
    });
  }

  // Clear particle effect button
  document.getElementById('btn-clear-particle')?.addEventListener('click', () => {
    if (!state.selectedCell || !state.grid) return;
    setParticleEffect(state, state.selectedCell.r, state.selectedCell.c, undefined);
    syncParticleEmitter();
    updateParticlePanel();
  });
}

/**
 * Mouse down handler.
 */
async function onMouseDown(e: MouseEvent) {
  lastMousePos = { x: e.clientX, y: e.clientY };

  if (e.button === 1) {
    // Middle button: pan
    isPanning = true;
    e.preventDefault();
  } else if (e.button === 0) {
    // Left button: check for Space+drag pan first
    if (keysPressed.has(' ')) {
      isSpacePanning = true;
      e.preventDefault();
    } else {
      // Tool action
      const gridPos = screenToGrid(state, canvas, e.offsetX, e.offsetY);
      if (gridPos) {
        await handleToolAction(gridPos.r, gridPos.c);
        isDragging = true;
      }
    }
  }
}

/**
 * Mouse move handler.
 */
async function onMouseMove(e: MouseEvent) {
  const dx = e.clientX - lastMousePos.x;
  const dy = e.clientY - lastMousePos.y;
  lastMousePos = { x: e.clientX, y: e.clientY };

  // Track hovered cell for highlight
  const gridPos = screenToGrid(state, canvas, e.offsetX, e.offsetY);
  state.hoveredCell = gridPos;

  if (isPanning || isSpacePanning) {
    state.camera.x -= dx / state.camera.zoom;
    state.camera.y -= dy / state.camera.zoom;
  } else if (isDragging && (state.activeTool === 'paint' || state.activeTool === 'erase')) {
    if (gridPos) {
      await handleToolAction(gridPos.r, gridPos.c);
    }
  }
}

/**
 * Mouse up handler.
 */
function onMouseUp() {
  isDragging = false;
  isPanning = false;
  isSpacePanning = false;
}

/**
 * Wheel handler (zoom).
 * Works with: plain wheel (mouse), Ctrl+wheel (trackpad-friendly).
 */
function onWheel(e: WheelEvent) {
  const isCtrlWheel = e.ctrlKey || e.metaKey;

  // Trackpad detected: require Ctrl for zoom
  if (state.isTrackpad === true && !isCtrlWheel) return;

  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  state.camera.zoom = Math.max(0.1, Math.min(3, state.camera.zoom * zoomFactor));
}

/**
 * Track key releases for Space+drag detection.
 */
function onKeyUp(e: KeyboardEvent) {
  keysPressed.delete(e.key);
}

/**
 * Keyboard handler.
 */
async function onKeyDown(e: KeyboardEvent) {
  // Track pressed keys for Space+drag detection
  keysPressed.add(e.key);

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault();
      undo(state);
    } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      redo(state);
    } else if (e.key === 's') {
      e.preventDefault();
      onSaveClick();
    } else if (e.key === '0') {
      // Ctrl+0: Reset zoom to 100%
      e.preventDefault();
      state.camera.zoom = 1.0;
    } else if (e.key === '1') {
      // Ctrl+1: Zoom to 50%
      e.preventDefault();
      state.camera.zoom = 0.5;
    } else if (e.key === '2') {
      // Ctrl+2: Zoom to 100%
      e.preventDefault();
      state.camera.zoom = 1.0;
    } else if (e.key === '3') {
      // Ctrl+3: Zoom to 200%
      e.preventDefault();
      state.camera.zoom = 2.0;
    }
  } else if (e.key === 'g' || e.key === 'G') {
    state.showGrid = !state.showGrid;
  } else if (e.key === 'e' || e.key === 'E') {
    // Rotate object clockwise
    if (state.selectedCell && state.grid) {
      e.preventDefault();
      rotateObject(state, state.selectedCell.r, state.selectedCell.c);
      await updateInspector();
    }
  } else if (e.key === 'q' || e.key === 'Q') {
    // Rotate object counter-clockwise (single undo step)
    if (state.selectedCell && state.grid) {
      e.preventDefault();
      rotateObjectCCW(state, state.selectedCell.r, state.selectedCell.c);
      await updateInspector();
    }
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // Arrow keys: pan
    e.preventDefault();
    const { ARROW_PAN_SPEED, ARROW_PAN_FAST_MULT } = MAP_CONFIG.KEY_BINDINGS;
    const speed = e.shiftKey ? ARROW_PAN_SPEED * ARROW_PAN_FAST_MULT : ARROW_PAN_SPEED;
    const panDist = speed / state.camera.zoom;

    if (e.key === 'ArrowUp') state.camera.y -= panDist;
    else if (e.key === 'ArrowDown') state.camera.y += panDist;
    else if (e.key === 'ArrowLeft') state.camera.x -= panDist;
    else if (e.key === 'ArrowRight') state.camera.x += panDist;
  }
}

/**
 * Handle tool action at grid position.
 */
async function handleToolAction(r: number, c: number) {
  if (!state.grid) return;

  switch (state.activeTool) {
    case 'select':
      state.selectedCell = { r, c };
      await updateInspector();
      break;

    case 'paint':
      paintTile(state, r, c, state.paintGround, state.paintObject, state.paintRotation);
      break;

    case 'erase':
      clearTile(state, r, c);
      break;

    case 'fill':
    case 'rect':
      // Disabled in UI — no-op until implemented
      break;
  }
}

/**
 * Load map from file(s).
 * Accepts multiple files: map.json, map.jpg/png, map_symbols.json
 * Auto-pairs files by basename.
 */
function onLoadClick() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.json,.jpg,.jpeg,.png';
  input.style.display = 'none';

  input.addEventListener('change', async (e) => {
    try {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;

      // Group files by basename (strip extension and suffixes like _extracted, _archetype, _symbols)
      const filesByBase = new Map<string, File[]>();
      for (const file of files) {
        const base = file.name
          .replace(/\.(json|jpg|jpeg|png)$/i, '')
          .replace(/_(extracted|archetype|symbols)$/, '');
        if (!filesByBase.has(base)) {
          filesByBase.set(base, []);
        }
        filesByBase.get(base)!.push(file);
      }

      // Load first map found
      for (const [basename, baseFiles] of filesByBase) {
        const jsonFile = baseFiles.find(f => f.name.endsWith('.json'));
        const imageFile = baseFiles.find(f => /\.(jpg|jpeg|png)$/i.test(f.name));

        if (jsonFile) {
          await loadMapWithFiles(state, jsonFile, imageFile);
          break;
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error during file load';
      console.error('File load error:', err);
      state.loadError = errorMsg;
      alert(`Error: ${errorMsg}`);
    } finally {
      document.body.removeChild(input);
    }
  });

  document.body.appendChild(input);
  input.click();
}

/**
 * Load map JSON and optional background image.
 */
async function loadMapWithFiles(
  state: DesignerState,
  jsonFile: File,
  imageFile?: File
): Promise<void> {
  try {
    const jsonContent = await jsonFile.text();
    const result = loadMap(state, jsonContent);

    if (!result.ok) {
      const errorMsg = (result as { ok: false; error: string }).error;
      state.loadError = errorMsg;
      alert(`Error loading map: ${errorMsg}`);
      return;
    }

    state.loadError = null;

    // Revoke previous background image URL to prevent memory leak
    if (backgroundImageUrl) {
      URL.revokeObjectURL(backgroundImageUrl);
      backgroundImageUrl = null;
    }

    // Load background image if provided
    if (imageFile) {
      backgroundImageUrl = URL.createObjectURL(imageFile);
      const img = new Image();
      img.onload = () => {
        state.backgroundImage = img;
      };
      img.onerror = () => {
        state.backgroundImage = null;
      };
      img.src = backgroundImageUrl;
    } else {
      state.backgroundImage = null;
    }

    initTileParticles();
    updatePanelVisibility();
    await updateInspector();
  } catch (err: any) {
    state.loadError = err.message;
    console.error('Exception loading map:', err);
    alert(`Error: ${err.message}`);
  }
}

/**
 * Save map to file.
 */
function onSaveClick() {
  if (!state.grid) {
    alert('No map loaded');
    return;
  }

  const json = saveMapToJSON(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export map to TypeScript.
 */
function onExportClick() {
  if (!state.grid) {
    alert('No map loaded');
    return;
  }

  const mapName = prompt('Enter map name:', 'custom');
  if (!mapName) return;

  const ts = exportToTypeScript(state, mapName);
  const blob = new Blob([ts], { type: 'text/typescript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mapName}_map.ts`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Update tool UI to reflect active tool.
 */
function updateToolUI() {
  const tools: Array<typeof state.activeTool> = ['select', 'paint', 'erase', 'fill', 'rect'];
  tools.forEach((tool) => {
    const btn = document.getElementById(`tool-${tool}`);
    if (btn) {
      btn.classList.toggle('active', tool === state.activeTool);
    }
  });
}

/**
 * Update map status display.
 */
function updateMapStatus() {
  const statusEl = document.getElementById('map-status');
  if (!statusEl || !state.grid) return;

  const info: string[] = [];
  info.push(`${state.grid.rows}×${state.grid.cols}`);

  if (state.backgroundImage) {
    info.push('+ background');
  }

  if (state.mapData?.spawnPoints?.length) {
    info.push(`${state.mapData.spawnPoints.length} spawns`);
  }

  statusEl.textContent = info.join(' · ');
}

/**
 * Update panel visibility based on map state.
 * Hide Palette and Shortcuts when no map loaded to keep UI clean.
 */
function updatePanelVisibility() {
  const paletteSection = document.querySelector('#left-panel > .panel-section:nth-child(2)');
  const shortcutsSection = document.querySelector('#left-panel > .panel-section:nth-child(3)');

  const isMapLoaded = state.grid !== null;

  if (paletteSection) {
    (paletteSection as HTMLElement).style.display = isMapLoaded ? 'block' : 'none';
  }
  if (shortcutsSection) {
    (shortcutsSection as HTMLElement).style.display = isMapLoaded ? 'block' : 'none';
  }
}

/**
 * Update inspector panel with selected cell info.
 */
async function updateInspector() {
  updateMapStatus();
  updateMapDetails();

  if (!state.grid || !state.selectedCell) return;

  const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
  if (!cell) return;

  const posText = document.getElementById('inspector-position');
  if (posText) {
    posText.textContent = `(${state.selectedCell.r}, ${state.selectedCell.c})`;
  }

  // Update ground select
  const groundSelect = document.getElementById('inspector-ground') as HTMLSelectElement;
  if (groundSelect) {
    groundSelect.value = cell.ground;
  }

  // Update terrain archetype profile
  await updateTerrainProfilePanel(cell);

  // Update object select
  const objectSelect = document.getElementById('inspector-object') as HTMLSelectElement;
  if (objectSelect) {
    objectSelect.value = cell.object;
  }

  // Update transform sliders
  updateTransformPanel();

  // Update object properties section
  await updateObjectPropertiesPanel(cell);

  // Update particle effect panel
  updateParticlePanel();
}

/**
 * Update terrain archetype profile display.
 */
async function updateTerrainProfilePanel(cell: any) {
  const profileEl = document.getElementById('terrain-archetype-profile');
  if (!profileEl) return;

  try {
    const terrainDataJson = await import('../../src/config/TerrainData.json');
    const terrains = (terrainDataJson as any).default as any[];
    const terrainDef = terrains.find((t: any) => t.name === cell.ground);

    if (terrainDef && terrainDef.archetypeId) {
      profileEl.innerHTML = renderTerrainProfile(terrainDef.archetypeId, terrainDef.displayName);
    } else {
      profileEl.innerHTML = '';
    }
  } catch (e) {
    console.warn('Failed to load terrain profile:', e);
    profileEl.innerHTML = '';
  }
}

/**
 * Update object transform panel (scale/offset sliders).
 */
function updateTransformPanel() {
  const panel = document.getElementById('object-transform-panel');
  if (!panel) return;

  if (!state.grid || !state.selectedCell) {
    panel.style.display = 'none';
    return;
  }

  const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
  if (!cell || cell.object === ObjectId.NONE) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  const t = cell.objectTransform;

  const scaleSlider = document.getElementById('transform-scale') as HTMLInputElement;
  const offsetXSlider = document.getElementById('transform-offsetX') as HTMLInputElement;
  const offsetYSlider = document.getElementById('transform-offsetY') as HTMLInputElement;

  const scaleVal = t?.scale ?? 1.0;
  const offsetXVal = t?.offsetX ?? 0;
  const offsetYVal = t?.offsetY ?? 0;

  if (scaleSlider) scaleSlider.value = String(Math.round(scaleVal * 100));
  if (offsetXSlider) offsetXSlider.value = String(Math.round(offsetXVal * 100));
  if (offsetYSlider) offsetYSlider.value = String(Math.round(offsetYVal * 100));

  const scaleLabel = document.getElementById('transform-scale-value');
  const offsetXLabel = document.getElementById('transform-offsetX-value');
  const offsetYLabel = document.getElementById('transform-offsetY-value');

  if (scaleLabel) scaleLabel.textContent = scaleVal.toFixed(2);
  if (offsetXLabel) offsetXLabel.textContent = offsetXVal.toFixed(2);
  if (offsetYLabel) offsetYLabel.textContent = offsetYVal.toFixed(2);
}

/**
 * Update object properties panel based on selected cell.
 */
async function updateObjectPropertiesPanel(cell: any) {
  const propsPanel = document.getElementById('object-properties-panel');
  if (!propsPanel) return;

  // Hide if no object
  if (cell.object === ObjectId.NONE) {
    propsPanel.style.display = 'none';
    return;
  }

  propsPanel.style.display = 'block';

  // Get object definition from database
  let objDef: any = null;
  try {
    const objectDataJson = await import('../../src/config/ObjectData.json');
    const objects = (objectDataJson as any).default as any[];
    objDef = objects.find((o: any) => o.name === cell.object);
  } catch (e) {
    console.warn('Failed to load ObjectData:', e);
  }

  // Display basic info (read-only)
  if (objDef) {
    const categoryEl = document.getElementById('prop-category');
    if (categoryEl) categoryEl.textContent = objDef.category || '-';

    const roleEl = document.getElementById('prop-role');
    if (roleEl) roleEl.textContent = objDef.strategicRole || '-';

    // Display archetype profile
    if (objDef.archetypeId) {
      const profileEl = document.getElementById('archetype-profile-object');
      if (profileEl) {
        profileEl.innerHTML = renderObjectProfile(objDef.archetypeId, objDef.displayName);
      }
    }
  }

  // Display rotation
  const rotationSelect = document.getElementById('inspector-rotation') as HTMLSelectElement;
  if (rotationSelect) {
    rotationSelect.value = String(cell.objectRotation ?? 0);
  }

  // Update boolean checkboxes
  const props = cell.objectProperties || {};
  const checkboxes = ['isImpassable', 'isDestructible', 'isVisualOverlay'];
  for (const prop of checkboxes) {
    const checkbox = document.getElementById(`prop-${prop}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = props[prop] ?? (objDef ? (objDef as any)[prop] : false);
    }
  }

  // Update number/text fields
  const clearSpeedInput = document.getElementById('prop-clearSpeed') as HTMLInputElement;
  if (clearSpeedInput) {
    clearSpeedInput.value = String(props.clearSpeed ?? objDef?.clearSpeed ?? 0);
  }

  const roleInput = document.getElementById('prop-strategicRole') as HTMLInputElement;
  if (roleInput) {
    roleInput.value = props.strategicRole ?? objDef?.strategicRole ?? '';
  }
}

/**
 * Update map details panel with metadata.
 */
function updateMapDetails() {
  const detailsEl = document.getElementById('map-details');
  if (!detailsEl || !state.mapMetadata) return;

  const lines: string[] = [];

  // Terrain coverage (top 3)
  const terrains = Object.entries(state.mapMetadata.terrainCoverage)
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 3);
  if (terrains.length > 0) {
    lines.push('<strong>Terrain:</strong>');
    for (const [name, data] of terrains) {
      lines.push(`• ${name} (${data.percentage}%)`);
    }
  }

  // Objects by category
  if (Object.keys(state.mapMetadata.objectsByCategory).length > 0) {
    lines.push('<strong>Objects:</strong>');
    for (const [cat, count] of Object.entries(state.mapMetadata.objectsByCategory)) {
      lines.push(`• ${cat}: ${count}`);
    }
  }

  // Hints
  if (state.mapMetadata.hints.length > 0) {
    lines.push('<strong>Notes:</strong>');
    for (const hint of state.mapMetadata.hints) {
      lines.push(`• ${hint}`);
    }
  }

  detailsEl.innerHTML = lines.length > 0 ? lines.join('<br>') : '<div style="color: #888;">No data</div>';
}

/**
 * Initialize or re-initialize the tile particle layer from the current grid.
 */
function initTileParticles(): void {
  if (!state.grid) {
    tileParticles = null;
    return;
  }
  tileParticles = new TileParticleLayer();
  tileParticles.init(state.grid);
}

/**
 * Sync particle emitter for the currently selected cell after effect change.
 */
function syncParticleEmitter(): void {
  if (!tileParticles || !state.grid || !state.selectedCell) return;
  const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
  if (!cell) return;
  tileParticles.syncCell(state.selectedCell.r, state.selectedCell.c, cell);
}

/**
 * Update particle effect inspector panel for selected cell.
 */
function updateParticlePanel(): void {
  const panel = document.getElementById('particle-effect-panel');
  if (!panel) return;

  if (!state.grid || !state.selectedCell) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
  const effect = cell?.particleEffect;

  const typeSelect = document.getElementById('particle-effect-type') as HTMLSelectElement;
  if (typeSelect) typeSelect.value = effect?.effectId ?? '';

  const bounds = MAP_CONFIG.PARTICLE_EFFECTS.tileBounds;
  const sizeVal = effect?.sizeMultiplier ?? bounds.defaultSizeMultiplier;
  const oxVal = effect?.offsetX ?? 0;
  const oyVal = effect?.offsetY ?? 0;

  const sizeSlider = document.getElementById('particle-size') as HTMLInputElement;
  const oxSlider = document.getElementById('particle-offsetX') as HTMLInputElement;
  const oySlider = document.getElementById('particle-offsetY') as HTMLInputElement;

  if (sizeSlider) sizeSlider.value = String(Math.round(sizeVal * 100));
  if (oxSlider) oxSlider.value = String(Math.round(oxVal * 100));
  if (oySlider) oySlider.value = String(Math.round(oyVal * 100));

  const sizeLabel = document.getElementById('particle-size-value');
  const oxLabel = document.getElementById('particle-offsetX-value');
  const oyLabel = document.getElementById('particle-offsetY-value');

  if (sizeLabel) sizeLabel.textContent = sizeVal.toFixed(2);
  if (oxLabel) oxLabel.textContent = oxVal.toFixed(2);
  if (oyLabel) oyLabel.textContent = oyVal.toFixed(2);
}

/**
 * Toggle strategic zones overlay.
 */
function onToggleZonesClick() {
  state.showStrategicZones = !state.showStrategicZones;
  const btn = document.getElementById('btn-toggle-zones');
  if (btn) {
    btn.textContent = state.showStrategicZones ? 'Hide Zones' : 'Show Zones';
  }
}

/**
 * Toggle tile symbol display.
 */
function onToggleSymbolsClick() {
  state.showTileSymbols = !state.showTileSymbols;
  const btn = document.getElementById('btn-toggle-symbols');
  if (btn) {
    btn.textContent = state.showTileSymbols ? 'Hide Symbols' : 'Show Symbols';
  }
}

/**
 * Build asset manifest for tilemap preview.
 * Data-driven from ObjectData.json — loads variants for damageStates/environmentVariants.
 */
async function buildAssetManifest() {
  const images: Record<string, string> = {};

  try {
    const objectDataJson = await import('../../src/config/ObjectData.json');
    const objects = (objectDataJson as any).default as any[];
    for (const obj of objects) {
      if (!obj.spriteAvailable || !obj.spriteFile || !obj.spriteDir) continue;

      const variants: string[] | undefined =
        obj.environmentVariants?.map((v: string) => `${obj.spriteFile}_${v}`) ??
        obj.damageStates?.map((s: string) => `${obj.spriteFile}_${s}`);

      if (variants) {
        for (const v of variants) {
          images[v] = `/sprites/${obj.spriteDir}/${v}.png`;
        }
      } else {
        images[obj.name] = `/sprites/${obj.spriteDir}/${obj.spriteFile}.png`;
      }
    }
  } catch (e) {
    console.warn('Failed to load ObjectData for manifest:', e);
  }

  return { images, audio: {} };
}

/**
 * Populate ground (terrain) and object dropdowns from data.
 * Both are data-driven from JSON configs — new items appear automatically.
 */
async function populateDropdowns() {
  await populateGroundDropdowns();
  await populateObjectDropdowns();
}

/**
 * Populate ground (terrain) dropdowns from TerrainData.json.
 * Removes hardcoded HTML options, keeps UI in sync with canonical source.
 */
async function populateGroundDropdowns() {
  try {
    const terrainDataJson = await import('../../src/config/TerrainData.json');
    const terrains = (terrainDataJson as any).default as any[];
    const selectIds = ['palette-ground', 'inspector-ground'];

    for (const id of selectIds) {
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) continue;

      // Keep first option (if any), remove rest
      while (select.options.length > 1) select.remove(1);

      for (const terrain of terrains) {
        const option = document.createElement('option');
        option.value = terrain.name;
        option.textContent = terrain.displayName;
        select.appendChild(option);
      }
    }
  } catch (e) {
    console.warn('Failed to populate ground dropdowns:', e);
  }
}

/**
 * Populate object dropdowns from ObjectData.json.
 * Maintains data-driven approach — new objects appear automatically.
 */
async function populateObjectDropdowns() {
  try {
    const objectDataJson = await import('../../src/config/ObjectData.json');
    const objects = (objectDataJson as any).default as any[];
    const selectIds = ['palette-object', 'inspector-object'];

    for (const id of selectIds) {
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) continue;

      // Keep the first "None" option, remove the rest
      while (select.options.length > 1) select.remove(1);

      for (const obj of objects) {
        const option = document.createElement('option');
        option.value = obj.name;
        option.textContent = obj.displayName;
        select.appendChild(option);
      }
    }
  } catch (e) {
    console.warn('Failed to populate object dropdowns:', e);
  }
}

// Auto-init on load
window.addEventListener('DOMContentLoaded', init);
