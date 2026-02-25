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
 * Load map from file(s).
 * Accepts multiple files: map.json, map.jpg/png, map_symbols.json
 * Auto-pairs files by basename.
 */
function onLoadClick() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.json,.jpg,.jpeg,.png';
  input.onchange = async (e) => {
    try {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) {
        console.log('No files selected');
        return;
      }

      console.log('Files received:', files.map(f => f.name));

      // Group files by basename
      const filesByBase = new Map<string, File[]>();
      for (const file of files) {
        const base = file.name.replace(/\.(json|jpg|jpeg|png)$/i, '').replace(/_symbols$/, '');
        if (!filesByBase.has(base)) {
          filesByBase.set(base, []);
        }
        filesByBase.get(base)!.push(file);
      }

      console.log('Grouped files:', Array.from(filesByBase.keys()));

      // Load first map found
      for (const [basename, baseFiles] of filesByBase) {
        const jsonFile = baseFiles.find(f => f.name.endsWith('.json'));
        const imageFile = baseFiles.find(f => /\.(jpg|jpeg|png)$/i.test(f.name));

        if (jsonFile) {
          console.log('Loading map:', basename, 'with files:', jsonFile.name, imageFile?.name);
          await loadMapWithFiles(state, jsonFile, imageFile);
          break;
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error during file load';
      console.error('File load handler error:', err);
      state.loadError = errorMsg;
      alert(`Error: ${errorMsg}`);
    }
  };
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
      console.error('Map load failed:', errorMsg);
      alert(`Error loading map: ${errorMsg}`);
      return;
    }

    state.loadError = null;

    // Load background image if provided
    if (imageFile) {
      const imgUrl = URL.createObjectURL(imageFile);
      const img = new Image();
      img.onload = () => {
        state.backgroundImage = img;
        console.log('Background image loaded:', imageFile.name, `(${img.width}x${img.height})`);
      };
      img.onerror = () => {
        console.error('Failed to load background image:', imageFile.name);
        state.backgroundImage = null;
      };
      img.src = imgUrl;
    } else {
      state.backgroundImage = null;
    }

    console.log('Map loaded successfully from', jsonFile.name);
    updateInspector();
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
 * Update inspector panel with selected cell info.
 */
function updateInspector() {
  updateMapStatus();

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
 * Build asset manifest for tilemap preview.
 * Paths match src/main.ts asset loading.
 */
function buildAssetManifest() {
  return {
    images: {
      // Ground tiles
      'ground-01a': '/sprites/tiles/Ground_Tile_Dirty_Road_1.png',
      'ground-01b': '/sprites/tiles/Ground_Tile_Grass_1.png',
      'ground-02a': '/sprites/tiles/Ground_Tile_Dirty_Road_2.png',
      'ground-winter': '/sprites/tiles/Ground_Tile_Dirty_Road_Winter_1.png',
      'ground-water': '/sprites/tiles/Ground_Tile_Water_1.png',
      // Objects
      'block-a01': '/sprites/tiles/Block_A_01.png',
      'block-b01': '/sprites/tiles/Block_B_01.png',
      'container-a': '/sprites/tiles/Container_A.png',
      'container-b': '/sprites/tiles/Container_B.png',
      'container-c': '/sprites/tiles/Container_C.png',
      'container-d': '/sprites/tiles/Container_D.png',
      'hedgehog-a': '/sprites/tiles/Czech_Hdgehog_A.png',
      'hedgehog-b': '/sprites/tiles/Czech_Hdgehog_B.png',
      // Decor (minimal set)
      'decor-border-a': '/sprites/decor/Border_A.png',
      'decor-puddle-1': '/sprites/decor/Puddle_01.png',
    },
    audio: {},
  };
}

// Auto-init on load
window.addEventListener('DOMContentLoaded', init);
