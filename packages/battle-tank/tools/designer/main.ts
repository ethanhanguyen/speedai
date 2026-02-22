import { AssetManager } from '@speedai/game-engine';
import { createInitialState } from './DesignerState.js';
import type { DesignerState } from './DesignerState.js';
import { renderDesigner, screenToGrid } from './DesignerRenderer.js';
import {
  loadMap,
  saveMapToJSON,
  exportToTypeScript,
  pushHistory,
  undo,
  redo,
  setGround,
  setObject,
  toggleDecor,
  clearTile,
} from './DesignerActions.js';
import { TileId, ObjectId, DecorId } from '../../src/tilemap/types.js';

// Global state
let state: DesignerState = createInitialState();
let assets: AssetManager;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

// Mouse state
let isDragging = false;
let isPanning = false;
let lastMousePos = { x: 0, y: 0 };

/**
 * Initialize designer.
 */
export async function init() {
  console.log('Initializing Battle Tank Map Designer...');

  // Create asset manager
  assets = new AssetManager();

  // Load assets (minimal set for preview)
  const assetManifest = buildAssetManifest();
  const loadPromises: Promise<any>[] = [];
  for (const [key, path] of Object.entries(assetManifest.images)) {
    loadPromises.push(assets.loadImage(key, path));
  }
  await Promise.all(loadPromises);

  // Setup canvas
  canvas = document.getElementById('designer-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  // Resize canvas to viewport
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Setup UI event listeners
  setupEventListeners();

  // Start render loop
  requestAnimationFrame(render);

  console.log('Designer ready!');
}

/**
 * Render loop.
 */
function render() {
  if (state.grid) {
    renderDesigner(ctx, canvas, state, assets);
  } else {
    // Show empty state
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Load a map to begin editing', canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(render);
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

  // UI buttons
  document.getElementById('btn-load')?.addEventListener('click', onLoadClick);
  document.getElementById('btn-save')?.addEventListener('click', onSaveClick);
  document.getElementById('btn-export')?.addEventListener('click', onExportClick);
  document.getElementById('btn-undo')?.addEventListener('click', () => undo(state));
  document.getElementById('btn-redo')?.addEventListener('click', () => redo(state));

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
}

/**
 * Mouse down handler.
 */
function onMouseDown(e: MouseEvent) {
  lastMousePos = { x: e.clientX, y: e.clientY };

  if (e.button === 1) {
    // Middle button: pan
    isPanning = true;
    e.preventDefault();
  } else if (e.button === 0) {
    // Left button: tool action
    const gridPos = screenToGrid(state, canvas, e.offsetX, e.offsetY);
    if (gridPos) {
      handleToolAction(gridPos.r, gridPos.c);
      isDragging = true;
    }
  }
}

/**
 * Mouse move handler.
 */
function onMouseMove(e: MouseEvent) {
  const dx = e.clientX - lastMousePos.x;
  const dy = e.clientY - lastMousePos.y;
  lastMousePos = { x: e.clientX, y: e.clientY };

  if (isPanning) {
    state.camera.x -= dx / state.camera.zoom;
    state.camera.y -= dy / state.camera.zoom;
  } else if (isDragging && (state.activeTool === 'paint' || state.activeTool === 'erase')) {
    const gridPos = screenToGrid(state, canvas, e.offsetX, e.offsetY);
    if (gridPos) {
      handleToolAction(gridPos.r, gridPos.c);
    }
  }
}

/**
 * Mouse up handler.
 */
function onMouseUp() {
  isDragging = false;
  isPanning = false;
}

/**
 * Wheel handler (zoom).
 */
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  state.camera.zoom = Math.max(0.1, Math.min(3, state.camera.zoom * zoomFactor));
}

/**
 * Keyboard handler.
 */
function onKeyDown(e: KeyboardEvent) {
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
    }
  } else if (e.key === 'g' || e.key === 'G') {
    state.showGrid = !state.showGrid;
  }
}

/**
 * Handle tool action at grid position.
 */
function handleToolAction(r: number, c: number) {
  if (!state.grid) return;

  switch (state.activeTool) {
    case 'select':
      state.selectedCell = { r, c };
      updateInspector();
      break;

    case 'paint':
      setGround(state, r, c, state.paintGround);
      if (state.paintObject !== 'none') {
        setObject(state, r, c, state.paintObject, state.paintRotation);
      }
      break;

    case 'erase':
      clearTile(state, r, c);
      break;

    case 'fill':
      // TODO: Implement flood fill
      console.log('Fill tool not yet implemented');
      break;

    case 'rect':
      // TODO: Implement rect tool
      console.log('Rect tool not yet implemented');
      break;
  }
}

/**
 * Load map from file.
 */
function onLoadClick() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const content = await file.text();
      const result = loadMap(state, content);
      if (result.ok) {
        console.log('Map loaded successfully');
        updateInspector();
      } else {
        alert(`Error loading map: ${(result as { ok: false; error: string }).error}`);
      }
    }
  };
  input.click();
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
 * Update inspector panel with selected cell info.
 */
function updateInspector() {
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

  // Update object select
  const objectSelect = document.getElementById('inspector-object') as HTMLSelectElement;
  if (objectSelect) {
    objectSelect.value = cell.object;
  }
}

/**
 * Build minimal asset manifest for preview.
 */
function buildAssetManifest() {
  const prefix = '/sprites';
  return {
    images: {
      // Ground tiles
      'ground-01a': `${prefix}/ground/Ground_Tile_01_A.png`,
      'ground-01b': `${prefix}/ground/Ground_Tile_01_B.png`,
      'ground-02a': `${prefix}/ground/Ground_Tile_02_A.png`,
      'ground-winter': `${prefix}/ground/Ground_Tile_Dirty_Road_Winter_1.png`,
      'ground-water': `${prefix}/ground/Ground_Tile_Water_1.png`,
      // Objects
      'block-a01': `${prefix}/environment/Block_A_01.png`,
      'block-b01': `${prefix}/environment/Block_B_01.png`,
      'container-a': `${prefix}/environment/Container_A.png`,
      'container-b': `${prefix}/environment/Container_B.png`,
      'container-c': `${prefix}/environment/Container_C.png`,
      'container-d': `${prefix}/environment/Container_D.png`,
      'hedgehog-a': `${prefix}/environment/Czech_Hedgehog_A_1.png`,
      'hedgehog-b': `${prefix}/environment/Czech_Hedgehog_B_1.png`,
      // Decors (minimal set)
      'decor-blast-1': `${prefix}/decor/Decor_Destruction_Dirt_1.png`,
      'decor-puddle-1': `${prefix}/decor/Decor_Puddle_1.png`,
      'decor-border-a': `${prefix}/decor/Decor_Border_A_1.png`,
    },
    audio: {},
  };
}

// Auto-init on load
window.addEventListener('DOMContentLoaded', init);
