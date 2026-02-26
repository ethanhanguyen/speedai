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
  rotateObject,
  updateObjectProperty,
} from './DesignerActions.js';
import { TileId, ObjectId, DecorId } from '../../src/tilemap/types.js';
import {
  renderObjectProfile,
  renderTerrainProfile,
} from './ArchetypeProfile.js';

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

  // Populate terrain and object dropdowns from data configs
  populateDropdowns();

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

  document.getElementById('inspector-object')?.addEventListener('change', (e) => {
    if (state.selectedCell && state.grid) {
      const objId = (e.target as HTMLSelectElement).value as ObjectId;
      setObject(state, state.selectedCell.r, state.selectedCell.c, objId, state.paintRotation);
      updateInspector();
    }
  });

  // Object property checkboxes
  const propCheckboxes = ['isImpassable', 'isDestructible', 'isVisualOverlay'];
  for (const prop of propCheckboxes) {
    document.getElementById(`prop-${prop}`)?.addEventListener('change', (e) => {
      if (state.selectedCell && state.grid) {
        const checked = (e.target as HTMLInputElement).checked;
        updateObjectProperty(state, state.selectedCell.r, state.selectedCell.c, prop, checked);
        updateInspector();
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

  // Inspector rotation
  document.getElementById('inspector-rotation')?.addEventListener('change', (e) => {
    if (state.selectedCell && state.grid) {
      const rotation = parseInt((e.target as HTMLSelectElement).value);
      const cell = state.grid.get(state.selectedCell.r, state.selectedCell.c);
      if (cell && cell.object !== 'none') {
        setObject(state, state.selectedCell.r, state.selectedCell.c, cell.object, rotation);
        updateInspector();
      }
    }
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

  // Track hovered cell for highlight
  const gridPos = screenToGrid(state, canvas, e.offsetX, e.offsetY);
  state.hoveredCell = gridPos;

  if (isPanning) {
    state.camera.x -= dx / state.camera.zoom;
    state.camera.y -= dy / state.camera.zoom;
  } else if (isDragging && (state.activeTool === 'paint' || state.activeTool === 'erase')) {
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
  } else if (e.key === 'e' || e.key === 'E') {
    // Rotate object clockwise
    if (state.selectedCell && state.grid) {
      e.preventDefault();
      rotateObject(state, state.selectedCell.r, state.selectedCell.c);
      updateInspector();
    }
  } else if (e.key === 'q' || e.key === 'Q') {
    // Rotate object counter-clockwise
    if (state.selectedCell && state.grid) {
      e.preventDefault();
      // Rotate 3 times to go counter-clockwise
      for (let i = 0; i < 3; i++) {
        rotateObject(state, state.selectedCell.r, state.selectedCell.c);
      }
      updateInspector();
    }
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
    updatePanelVisibility();
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
function updateInspector() {
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
  updateTerrainProfilePanel(cell);

  // Update object select
  const objectSelect = document.getElementById('inspector-object') as HTMLSelectElement;
  if (objectSelect) {
    objectSelect.value = cell.object;
  }

  // Update object properties section
  updateObjectPropertiesPanel(cell);
}

/**
 * Update terrain archetype profile display.
 */
function updateTerrainProfilePanel(cell: any) {
  const profileEl = document.getElementById('terrain-archetype-profile');
  if (!profileEl) return;

  try {
    const terrainDataJson = require('../../src/config/TerrainData.json') as any;
    const terrainDef = terrainDataJson.find((t: any) => t.name === cell.ground);

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
 * Update object properties panel based on selected cell.
 */
function updateObjectPropertiesPanel(cell: any) {
  const propsPanel = document.getElementById('object-properties-panel');
  if (!propsPanel) return;

  // Hide if no object
  if (cell.object === 'none') {
    propsPanel.style.display = 'none';
    return;
  }

  propsPanel.style.display = 'block';

  // Get object definition from database
  let objDef: any = null;
  try {
    const objectDataJson = require('../../src/config/ObjectData.json') as any;
    objDef = objectDataJson.find((o: any) => o.name === cell.object);
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
function buildAssetManifest() {
  const images: Record<string, string> = {};

  try {
    const objectDataJson = require('../../src/config/ObjectData.json') as any[];
    for (const obj of objectDataJson) {
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
