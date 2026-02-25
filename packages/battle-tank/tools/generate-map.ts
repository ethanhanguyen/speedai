#!/usr/bin/env node
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GridModel } from '@speedai/game-engine';
import { buildTileSchema } from './schema/SchemaLoader.js';
import { validateGrid } from './MapValidator.js';
import { MAP_GEN_CONFIG } from './MapGenConfig.js';
import { MAP_CONFIG } from '../src/config/MapConfig.js';
import { OBJECT_DEFS, TILE_DEFS, CHAR_MAP } from '../src/tilemap/TileRegistry.js';
import type { TileCell, MapData } from '../src/tilemap/types.js';
import { ObjectId } from '../src/tilemap/types.js';
import { getAllTerrains } from '../src/config/TerrainDatabase.js';
import { getStructuralObjects } from '../src/config/ObjectDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GeneratedMap {
  mockup: string;
  rows: number;
  cols: number;

  // Explicit semantic fields (flat arrays):
  obstacles?: Array<{ r: number; c: number; type: string; rotation?: number }>;

  // Strategic features (optional):
  chokePoints?: Array<{ r: number; c: number; width: number }>;
  sniperLanes?: Array<{ r1: number; c1: number; r2: number; c2: number }>;
  coverClusters?: Array<{ r: number; c: number; value: number }>;
  hazardZones?: Array<{ r: number; c: number; severity: number }>;

  spawnPoints: Array<{ r: number; c: number }>;
  enemySpawns: Array<{ r: number; c: number }>;
  metadata: {
    prompt: string;
    theme: string;
    designIntention?: string;
    generated: string;
  };
}

program
  .name('generate-map')
  .description('Generate a Battle Tank map using LLM')
  .requiredOption('-p, --prompt <text>', 'Map generation prompt (e.g., "desert siege, 24x18, 4 spawns")')
  .option('-k, --api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)')
  .option('-n, --name <name>', 'Output filename (default: auto-generated from prompt)')
  .option('-o, --output-dir <path>', 'Output directory (default: config.output.outputDir)')
  .parse();

const options = program.opts();

// Category definitions for distribution analysis
const CATEGORY_MAP: Record<string, string> = {
  loose_sand: 'OPEN',
  grass_plains: 'OPEN',
  hardpan: 'OPEN',
  beach_sand: 'OPEN',
  oasis_turf: 'OPEN',
  valley_floor: 'OPEN',

  asphalt: 'MOBILITY',
  dirt_road: 'MOBILITY',
  salt_flat: 'MOBILITY',
  urban_pavement: 'MOBILITY',

  rocky_outcrop: 'DEFENSIVE',
  scrub_vegetation: 'DEFENSIVE',
  jungle_underbrush: 'DEFENSIVE',
  forest_floor: 'DEFENSIVE',
  canyon_floor: 'DEFENSIVE',

  muddy_sinkhole: 'HAZARD',
  marsh_swamp: 'HAZARD',
  deep_snow: 'HAZARD',
  rapids_drop: 'HAZARD',

  gravel: 'TRANSITION',
  hilly_ground: 'TRANSITION',
  ice_snow_field: 'TRANSITION',
  dune_slope: 'TRANSITION',
  hill_slope: 'TRANSITION',
  shoreline: 'TRANSITION',
  saddle_pass: 'TRANSITION',
  depression: 'TRANSITION',
  ridge_crest: 'TRANSITION',
};

/**
 * Build symbol → TileCell lookup from CHAR_MAP.
 */
function buildSymbolToTileLookup(): Map<string, TileCell> {
  const lookup = new Map<string, TileCell>();
  for (const [symbol, cell] of Object.entries(CHAR_MAP)) {
    if (!['1', '2'].includes(symbol)) {
      lookup.set(symbol, cell);
    }
  }
  return lookup;
}

/**
 * Parse mockup string and populate grid with terrain + objects.
 * Mockup format: space-separated symbols per row, newline-separated rows.
 */
function populateGridFromMockup(
  grid: GridModel<TileCell>,
  mockup: string,
  symbolToTile: Map<string, TileCell>
): void {
  const rows = mockup.trim().split('\n');
  for (let r = 0; r < rows.length && r < grid.rows; r++) {
    const symbols = rows[r].trim().split(/\s+/);
    for (let c = 0; c < symbols.length && c < grid.cols; c++) {
      const symbol = symbols[c];
      const tileCell = symbolToTile.get(symbol);
      if (tileCell) {
        grid.set(r, c, { ...tileCell });
      } else {
        // Fallback to loose_sand if symbol not found
        grid.set(r, c, { ground: 'loose_sand' as any, object: 'none' as any });
      }
    }
  }
}

function detectThemeFromPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('desert') || lowerPrompt.includes('sand') || lowerPrompt.includes('north africa')) {
    return 'north_africa';
  }
  if (lowerPrompt.includes('snow') || lowerPrompt.includes('winter') || lowerPrompt.includes('eastern front') || lowerPrompt.includes('russia')) {
    return 'eastern_front';
  }
  if (lowerPrompt.includes('jungle') || lowerPrompt.includes('island') || lowerPrompt.includes('pacific') || lowerPrompt.includes('beach')) {
    return 'pacific';
  }
  if (lowerPrompt.includes('urban') || lowerPrompt.includes('city') || lowerPrompt.includes('street') || lowerPrompt.includes('stalingrad')) {
    return 'urban';
  }
  return 'mixed';
}

async function main() {
  // Load API key with priority: CLI > process.env > .env file
  let apiKey = options.apiKey;
  if (!apiKey && process.env.ANTHROPIC_API_KEY) {
    apiKey = process.env.ANTHROPIC_API_KEY;
  } else if (!apiKey) {
    // Try to load from .env file in monorepo root
    try {
      const envPath = path.join(__dirname, '../../../.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const match = envContent.match(/ANTHROPIC_API_KEY\s*=\s*(.+)/);
      if (match) {
        apiKey = match[1].trim();
      }
    } catch {
      // .env file not found or unreadable, continue
    }
  }

  if (!apiKey) {
    console.error('Error: Anthropic API key required. Use --api-key or set ANTHROPIC_API_KEY env var.');
    process.exit(1);
  }

  const schema = buildTileSchema();
  const anthropic = new Anthropic({ apiKey });

  const userPrompt = options.prompt;
  const detectedTheme = detectThemeFromPrompt(userPrompt);
  const systemPrompt = buildSystemPrompt(schema, detectedTheme);

  // Structured logging for debugging
  console.error('[DEBUG] Map Generation Request');
  console.error(`  Prompt: ${userPrompt}`);
  console.error(`  Detected Theme: ${detectedTheme}`);
  console.error(`  Model: ${MAP_GEN_CONFIG.llm.model}`);
  console.error(`  Max Tokens: ${MAP_GEN_CONFIG.llm.maxTokens}`);
  console.error('');

  const response = await anthropic.messages.create({
    model: MAP_GEN_CONFIG.llm.model,
    max_tokens: MAP_GEN_CONFIG.llm.maxTokens,
    temperature: MAP_GEN_CONFIG.llm.temperature,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userPrompt,
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from LLM');
  }

  // Log response preview for debugging
  // const preview = content.text.substring(0, 200).replace(/\n/g, ' ');
  // console.error(`[DEBUG] Response Preview: ${preview}...`);
  // console.error('');

  const generatedMap = parseMapResponse(content.text, options.prompt);

  const mapData: MapData = {
    rows: generatedMap.rows,
    cols: generatedMap.cols,
    spawnPoints: generatedMap.spawnPoints,
    enemySpawns: generatedMap.enemySpawns,
    chokePoints: generatedMap.chokePoints,
    sniperLanes: generatedMap.sniperLanes,
    coverClusters: generatedMap.coverClusters,
    hazardZones: generatedMap.hazardZones,
  };

  const grid = new GridModel<TileCell>(
    generatedMap.rows,
    generatedMap.cols,
    MAP_CONFIG.tileSize,
    0
  );

  // Build reverse lookups from CHAR_MAP
  const symbolToTile = buildSymbolToTileLookup();

  // Parse mockup to populate grid with terrain + objects
  populateGridFromMockup(grid, generatedMap.mockup, symbolToTile);

  // Apply obstacles array (for explicit object placement/rotation)
  for (const obstacle of generatedMap.obstacles || []) {
    const cell = grid.get(obstacle.r, obstacle.c);
    if (cell) {
      grid.set(obstacle.r, obstacle.c, {
        ...cell,
        object: obstacle.type as any,
        objectRotation: obstacle.rotation,
      });
    }
  }

  const validation = validateGrid(grid, mapData);

  if (validation.errors.length > 0) {
    console.error('\n❌ Validation errors:');
    for (const err of validation.errors) {
      console.error(`  - ${err.message}${err.position ? ` at (${err.position.r},${err.position.c})` : ''}`);
    }
  }

  if (validation.warnings.length > 0) {
    console.warn('\n⚠️  Validation warnings:');
    for (const warn of validation.warnings) {
      console.warn(`  - ${warn.message}`);
    }
  }

  if (!validation.valid) {
    console.error('\nMap validation failed. Not saving.');
    process.exit(1);
  }

  const stats = calculateMapStats(grid, mapData);
  const enrichedMetadata = enrichMetadata(grid, stats, generatedMap, detectedTheme);

  // Update generatedMap metadata with enriched data
  generatedMap.metadata = enrichedMetadata;

  const outputName = options.name || generateFilename(options.prompt);
  const outputDir = options.outputDir || path.join(__dirname, MAP_GEN_CONFIG.output.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  // Save mockup as text file
  const mockupPath = path.join(outputDir, `${outputName}.txt`);
  await fs.writeFile(mockupPath, generatedMap.mockup);

  // Save full map data as JSON
  const jsonPath = path.join(outputDir, `${outputName}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(generatedMap, null, 2));

  // Save symbol reference for designers
  const symbolRef = buildSymbolReference();
  const symbolPath = path.join(outputDir, `${outputName}_symbols.json`);
  await fs.writeFile(symbolPath, JSON.stringify(symbolRef, null, 2));

  // Generate image prompt for Nano banana image generator
  const imagePrompt = generateImagePrompt(generatedMap, enrichedMetadata);
  const imagePromptPath = path.join(outputDir, `${outputName}_image_prompt.txt`);
  await fs.writeFile(imagePromptPath, imagePrompt);

  console.log(`✅ Mockup saved: ${mockupPath}`);
  console.log(`✅ Map data saved: ${jsonPath}`);
  console.log(`✅ Symbol reference saved: ${symbolPath}`);
  console.log(`✅ Image prompt saved: ${imagePromptPath}`);
}

function buildSystemPrompt(schema: any, themeName: string = 'mixed'): string {
  const { minSpawnDistance, targetCoverDensity, maxTerrainVariety, preferredWalkablePercent, categoryTargets } = MAP_GEN_CONFIG.design;
  const themePreset = MAP_GEN_CONFIG.themes[themeName as keyof typeof MAP_GEN_CONFIG.themes] || MAP_GEN_CONFIG.themes.mixed;

  // Build terrain symbols map from CHAR_MAP (simplified for clarity)
  const terrainSymbols: Record<string, string> = {};
  for (const [char, cell] of Object.entries(CHAR_MAP)) {
    if (cell.object === 'none' && !['1', '2'].includes(char)) {
      terrainSymbols[char] = cell.ground;
    }
  }

  // Build object symbols map from CHAR_MAP (simplified for clarity)
  const objectSymbols: Record<string, string> = {};
  for (const [char, cell] of Object.entries(CHAR_MAP)) {
    if (cell.object !== 'none' && !['1', '2'].includes(char)) {
      objectSymbols[char] = cell.object;
    }
  }

  // Build dynamic terrain legend grouped by category
  const allTerrains = getAllTerrains();
  const terrainsByCategory: Record<string, typeof allTerrains> = {
    MOBILITY: [],
    DEFENSIVE: [],
    HAZARD: [],
    OPEN: [],
    TRANSITION: [],
  };
  for (const terrain of allTerrains) {
    terrainsByCategory[terrain.category].push(terrain);
  }
  const terrainLegend = Object.entries(terrainsByCategory)
    .map(([category, terrains]) => {
      const rows = terrains
        .map((terrain) => {
          return `${terrain.symbol},${terrain.name},${(terrain.clearSpeed * 100).toFixed(0)}%,${(terrain.coverPercent * 100).toFixed(0)}%,${terrain.sightBlockRange},${terrain.dotPerTurn},"${terrain.strategicRole}","${terrain.playstyleHints}"`;
        })
        .join('\n');
      return `[${category}]\n${rows}`;
    })
    .join('\n\n');

  // Build object legend from ObjectDatabase with full tactical metadata (structural objects only)
  const structuralObjects = getStructuralObjects();
  const objectLegend = structuralObjects
    .map((obj: any) => {
      return `${obj.symbol},${obj.displayName},"${obj.effectsDescription}","${obj.strategicRole}","${obj.historicalContext}",${(obj.coverPercent * 100).toFixed(0)}%,${obj.sightBlockRange}`;
    })
    .join('\n');

  // Category density targets explanation (handle empty or undefined gracefully)
  const categoryTargetsStr = Object.entries(categoryTargets ?? {})
    .map(([cat, target]: [string, { min: number; max: number; priority: string }]) => {
      return `- ${cat}: ${(target.min * 100).toFixed(0)}–${(target.max * 100).toFixed(0)}% (${target.priority})`;
    })
    .join('\n');

  // New: Combined symbol reference for quick lookup
  const symbolReference = `TERRAIN SYMBOLS: ${Object.entries(terrainSymbols).map(([sym, name]) => `${sym}=${name}`).join(', ')}\nOBJECT SYMBOLS: ${Object.entries(objectSymbols).map(([sym, name]) => `${sym}=${name}`).join(', ')}`;

  return `You are a Battle Tank map generator AI. Your task is to generate tactical, grid-based maps for a top-down tank combat game, ensuring balanced, thematic, and playable designs.

**TILE SCHEMA** (defines grid structure):
${JSON.stringify(schema, null, 2)}

**SYMBOL REFERENCE** (for mockup grid; use these exactly):
${symbolReference}

**GROUND TERRAIN LEGEND** (by category; use for balancing tactical elements):
Columns: Symbol, Type, Clear Speed %, Cover %, Sight Block Range, DoT/Turn, Strategic Role, Playstyle Hints
${terrainLegend}

**BLOCKING OBJECTS LEGEND** (tactical obstacles; place on terrain):
Columns: Symbol, Display Name, Effects Description, Strategic Role, Historical Context, Cover %, Sight Block Range
${objectLegend}

**SPAWN MARKERS** (meta symbols; place on walkable terrain only):
- 1: Player spawn
- 2: Enemy spawn
Number of spawns: 1 player spawn, 2-4 enemy spawns (adjust based on map size for balance).

**CATEGORY-BASED DESIGN FRAMEWORK** (group terrains by role for strategic depth):
- MOBILITY (fast, low cover): e.g., asphalt, dirt_road → Sniper lanes, assaults, high-risk areas.
- DEFENSIVE (slow, high cover): e.g., rocky_outcrop, jungle_underbrush → Hull-down positions, ambushes.
- HAZARD (penalties): e.g., muddy_sinkhole, marsh_swamp → Bottlenecks, tension; use sparingly (≤10%).
- OPEN (neutral): e.g., loose_sand, grass_plains → Maneuvers, open battles.
- TRANSITION (medium): e.g., gravel, dune_slope → Bridges between zones, skirmishes, elevation.

**CATEGORY DENSITY TARGETS** (approximate % of walkable area; prioritize HIGH first):
${categoryTargetsStr || 'Default: Balance evenly across categories.'}

**OBJECT PLACEMENT STRATEGY** (reinforce terrain zones):
- CHANNEL (W, ~): Divide regions, force detours.
- NATURAL (R, X, Y): Defensive walls, cliffs.
- ELEVATION (E, p, M): High ground, snipers.
- FORTIFICATION (F, _, C): Barriers, chokepoints.
- INDUSTRIAL (Q, D): Thematic ruins, variety.
- HAZARD (Z, T, U): Avoidance zones.
Match objects to theme and role. Do NOT confuse terrains with objects (e.g., rocky_outcrop is ground terrain, not an object).

**THEME GUIDANCE** (${themeName.toUpperCase()}):
- Description: ${themePreset.description}
- Preferred terrains: ${themePreset.terrainSymbols.join(', ')}
- Forbidden: ${themePreset.forbiddenSymbols?.join(', ') || 'None'}

**DESIGN CONSTRAINTS** (must enforce):
1. **Connectivity**: All spawns connected via walkable paths. Min distance between spawns: ${minSpawnDistance} cells.
2. **Balance**: Follow category targets; max ${maxTerrainVariety} unique terrains.
3. **Cover**: ~${(targetCoverDensity * 100).toFixed(0)}% walkable cells near cover.
4. **Sight & Flow**: Mix exposed lanes with sheltered paths; multiple approaches.
5. **Stats Targets**:
   - Walkable %: ~${(preferredWalkablePercent * 100).toFixed(0)}% (min ${(MAP_GEN_CONFIG.validation.minWalkablePercent * 100).toFixed(0)}%).
   - Object density: ≤${(MAP_GEN_CONFIG.validation.maxObjectDensity * 100).toFixed(0)}%.
   - Variety: ≤${maxTerrainVariety} terrain types.

**STRATEGIC FEATURES** (identify and list in output using thresholds):
1. Choke Points: Narrow passages (≤${MAP_GEN_CONFIG.strategicFeatures.chokePoint.widthMax} cells wide; min ${MAP_GEN_CONFIG.strategicFeatures.chokePoint.minCount}).
2. Sniper Lanes: Long unobstructed lines (≥${MAP_GEN_CONFIG.strategicFeatures.sniperLane.minLength} cells; min ${MAP_GEN_CONFIG.strategicFeatures.sniperLane.minCount}).
3. Cover Clusters: Dense areas (value ≥${MAP_GEN_CONFIG.strategicFeatures.coverCluster.valueThreshold}; radius ${MAP_GEN_CONFIG.strategicFeatures.coverCluster.radiusCells} cells).
4. Hazard Zones: High DoT (≥${MAP_GEN_CONFIG.strategicFeatures.hazardZone.dotThreshold}/turn; max ${MAP_GEN_CONFIG.strategicFeatures.hazardZone.maxCount}).

**OUTPUT REQUIREMENTS** (strictly follow; output ONLY valid JSON, no extra text/reasoning/markdown):
{
  "mockup": "Multi-line string: Visual text grid (rows x cols exact; symbols space-separated per row, e.g., '. . G 1'). Use symbols from legends. Default terrain: loose_sand ('.').",
  "rows": number,
  "cols": number,
  "obstacles": [{"r": number (0-based row), "c": number (0-based col), "type": string (object name), "rotation": number (0/90/180/270 if applicable)} , ...],  // Only non-default blocking objects
  "chokePoints": [{"r": number, "c": number, "width": number}, ...],
  "sniperLanes": [{"r1": number, "c1": number, "r2": number, "c2": number}, ...],
  "coverClusters": [{"r": number, "c": number, "value": number}, ...],
  "hazardZones": [{"r": number, "c": number, "severity": number}, ...],
  "spawnPoints": [{"r": number, "c": number}, ...],  // Player spawns (1)
  "enemySpawns": [{"r": number, "c": number}, ...],  // Enemy spawns (2)
  "metadata": {
    "theme": string (descriptive name),
    "prompt": string (user's original prompt),
    "designIntention": string (2-3 sentences: zone roles, category distribution, playstyle)
  }
}
- Spawns: On high clear-speed terrain; ensure connectivity.
- Features: Reference real map positions with tactical value.
- Grid: Flat representation; minimize JSON size by omitting defaults.

**EXAMPLE** (10x8 desert; symbols: . = loose_sand, P = hardpan, G = gravel, W = water, C = shipping_container, R = boulder_formation, 1/2 = spawns):
". . . . . . . .\n. . G G . . . .\n. 2 . . . . C .\n. . P P W W . .\n. . P P W W . .\n. . . . C . R .\n. . . . R R . .\n. 1 . . . . . 2\n. . . . . . . .\n. . . . . . . ."`;
}

function parseMapResponse(text: string, originalPrompt: string): GeneratedMap {
  // Extract JSON from response (expect valid JSON directly, no markdown or reasoning)
  let jsonText = text.trim();

  // Try markdown code blocks first
  const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Failed to parse LLM response as JSON: ${(e as Error).message}`);
  }

  // Ensure metadata structure
  if (!parsed.metadata) {
    parsed.metadata = {};
  }
  parsed.metadata.prompt = originalPrompt;
  parsed.metadata.generated = new Date().toISOString();

  // Validate mockup is a non-empty string
  if (!parsed.mockup || typeof parsed.mockup !== 'string') {
    throw new Error('Mockup must be a non-empty string with visual grid');
  }

  return parsed;
}

function generateFilename(prompt: string): string {
  // Convert prompt to filename (lowercase, replace spaces with underscores, keep alphanumeric)
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, MAP_GEN_CONFIG.output.maxFilenameLength);
}


interface MapStats {
  totalCells: number;
  walkableCells: number;
  walkablePercent: number;
  terrainCounts: Record<string, number>;
  totalObjects: number;
  objectCounts: Record<string, number>;
  decorCount: number;
  playerSpawns: Array<{ r: number; c: number }>;
  enemySpawns: Array<{ r: number; c: number }>;
}

interface CategoryDistribution {
  MOBILITY: number;
  DEFENSIVE: number;
  HAZARD: number;
  OPEN: number;
  TRANSITION: number;
}

interface EnrichedMetadata {
  theme: string;
  prompt: string;
  designIntention: string;
  mapSize: { rows: number; cols: number };
  walkablePercent: number;
  terrainVariety: number;
  objectDensity: number;
  strategicFeatures: {
    chokePoints: number;
    sniperLanes: number;
    coverClusters: number;
    hazardZones: number;
  };
  categoryDistribution: CategoryDistribution;
  playstyleProfile: string;
  sightControl: number;
  generated: string;
}

function calculateMapStats(grid: GridModel<TileCell>, mapData: MapData): MapStats {
  const terrainCounts: Record<string, number> = {};
  const objectCounts: Record<string, number> = {};
  let walkableCells = 0;
  let decorCount = 0;

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.get(r, c);
      if (!cell) continue;

      // Count terrain
      const terrainName = cell.ground;
      terrainCounts[terrainName] = (terrainCounts[terrainName] ?? 0) + 1;

      // Count objects
      if (cell.object !== ObjectId.NONE) {
        const objName = cell.object;
        objectCounts[objName] = (objectCounts[objName] ?? 0) + 1;
      } else {
        walkableCells++;
      }

      // Count decors
      if (cell.decors && cell.decors.length > 0) {
        decorCount += cell.decors.length;
      }
    }
  }

  const totalCells = grid.rows * grid.cols;
  const totalObjects = totalCells - walkableCells;

  return {
    totalCells,
    walkableCells,
    walkablePercent: walkableCells / totalCells,
    terrainCounts,
    totalObjects,
    objectCounts,
    decorCount,
    playerSpawns: mapData.spawnPoints,
    enemySpawns: mapData.enemySpawns,
  };
}

function enrichMetadata(
  grid: GridModel<TileCell>,
  stats: MapStats,
  generatedMap: GeneratedMap,
  theme: string
): EnrichedMetadata {
  // Compute terrain variety
  const terrainVariety = Object.keys(stats.terrainCounts).length;

  // Compute object density
  const objectDensity = stats.totalObjects / stats.totalCells;

  // Compute category distribution
  const categoryDist: CategoryDistribution = {
    MOBILITY: 0,
    DEFENSIVE: 0,
    HAZARD: 0,
    OPEN: 0,
    TRANSITION: 0,
  };

  for (const [terrain, count] of Object.entries(stats.terrainCounts)) {
    const category = CATEGORY_MAP[terrain as keyof typeof CATEGORY_MAP] || 'OPEN';
    categoryDist[category as keyof CategoryDistribution] += count;
  }

  // Normalize to percentages
  const totalTerrainCells = Object.values(categoryDist).reduce((a, b) => a + b, 0);
  if (totalTerrainCells > 0) {
    for (const key of Object.keys(categoryDist)) {
      categoryDist[key as keyof CategoryDistribution] = Math.round(
        (categoryDist[key as keyof CategoryDistribution] / totalTerrainCells) * 100
      );
    }
  }

  // Compute sight control (sniper lanes vs cover clusters ratio)
  const sniperLaneCount = generatedMap.sniperLanes?.length ?? 0;
  const coverClusterCount = generatedMap.coverClusters?.length ?? 0;
  const sightControl = coverClusterCount > 0 ? sniperLaneCount / coverClusterCount : sniperLaneCount;

  // Determine playstyle profile based on category distribution
  let playstyleProfile = '';
  if (categoryDist.DEFENSIVE > 50) {
    playstyleProfile = 'Defensive fortress with hull-down positions and ambush corridors';
  } else if (categoryDist.MOBILITY > 50) {
    playstyleProfile = 'Aggressive open-field tactics with sniper lanes and direct assaults';
  } else if (categoryDist.HAZARD > 20) {
    playstyleProfile = 'High-tension route-finding with hazard avoidance and tactical detours';
  } else if (categoryDist.TRANSITION > 40) {
    playstyleProfile = 'Mixed-engagement skirmish terrain with varied elevation and medium cover';
  } else {
    playstyleProfile = 'Balanced gameplay with open maneuvers and defensive clusters';
  }

  return {
    theme,
    prompt: generatedMap.metadata?.prompt || '',
    designIntention: generatedMap.metadata?.designIntention || '',
    mapSize: { rows: grid.rows, cols: grid.cols },
    walkablePercent: Math.round(stats.walkablePercent * 100),
    terrainVariety,
    objectDensity: Math.round(objectDensity * 100),
    strategicFeatures: {
      chokePoints: generatedMap.chokePoints?.length ?? 0,
      sniperLanes: sniperLaneCount,
      coverClusters: coverClusterCount,
      hazardZones: generatedMap.hazardZones?.length ?? 0,
    },
    categoryDistribution: categoryDist,
    playstyleProfile,
    sightControl: Math.round(sightControl * 100) / 100,
    generated: new Date().toISOString(),
  };
}

function generateImagePrompt(generatedMap: GeneratedMap, metadata: EnrichedMetadata): string {
  const terrainDesc = buildTerrainDescription(metadata);
  const objectDesc = buildObjectDescription(generatedMap);

  // Optional: You can enrich these helpers further if needed (e.g., add density qualifiers)
  const themeStyle = metadata.theme.toLowerCase().includes('desert') 
    ? 'arid desert wasteland, sun-bleached sand dunes, cracked earth, sparse dry scrub'
    : metadata.theme.toLowerCase().includes('urban') 
      ? 'ruined post-apocalyptic city, concrete debris, shattered asphalt, rusted rebar'
      : metadata.theme.toLowerCase().includes('forest') || metadata.theme.toLowerCase().includes('jungle')
        ? 'dense tropical/jungle overgrowth, muddy underbrush, tangled vines, moss-covered rocks'
        : 'mixed tactical battlefield environment matching theme';

  return `Ultra-detailed photo-realistic top-down aerial satellite reconnaissance view of a modern tank battlefield map, strict exact spatial layout matching the provided mockup grid (${metadata.mapSize.rows}×${metadata.mapSize.cols} cells), perfect orthographic projection, zero perspective distortion, no visible grid lines or overlays whatsoever --ar ${metadata.mapSize.cols}:${metadata.mapSize.rows} --stylize 250 --q 2

EXACT SPATIAL LAYOUT ONLY — FOLLOW MOCKUP POSITIONS, SHAPES, AND RELATIONSHIPS PRECISELY, BUT RENDER AS SEAMLESS NATURAL TERRAIN WITH NO VISIBLE GRID, NO CHECKERBOARD, NO SQUARES, NO LINES, NO OVERLAY:
${generatedMap.mockup}

THEME & ATMOSPHERE: ${metadata.theme} — ${metadata.designIntention}
Highly realistic ${themeStyle}, dramatic natural daylight, subtle 45-degree sun angle with soft realistic shadows, volumetric lighting if fitting, dusty/hazy military recon aesthetic, completely seamless ground without artificial divisions

TERRAIN DETAILS:
${terrainDesc}
Rich photorealistic ground textures: detailed cracked earth, gravel, grass, mud, erosion, natural color gradients and transitions — seamless blending between cells, no hard edges, no visible grid or tiling artifacts

OBJECTS & TACTICAL FEATURES:
${objectDesc}
Detailed realistic military obstacles: rusted containers, jagged rocks, wrecked vehicles, barriers, ditches — naturally integrated into terrain, no artificial outlines or grids

HIGHLIGHTED ELEMENTS:
- Player spawn zone(s): subtle glowing golden/blue marker or faint HUD-style indicator only
- Enemy spawn zone(s): subtle red/orange indicator only
- Tactical features (choke points, sniper lanes, cover clusters, hazards) emphasized through realistic terrain variation, shadows, and wear — never through lines or overlays

TECHNICAL REQUIREMENTS — CRITICAL:
- Perfect top-down orthographic view, no tilt, no distortion
- Hyper-detailed natural textures across entire frame
- Seamless, continuous battlefield surface — NO visible grid lines, NO checkerboard pattern, NO square borders, NO overlaid mesh, NO tiling artifacts, NO artificial divisions between cells
- Cohesive cinematic military photo realism, sharp focus everywhere
- No text, no logos, no watermarks, no HUD except subtle spawn indicators, no anachronisms

--style raw --v 6 --no grid, grid lines, checkerboard, squares, tiled pattern, overlay, mesh, visible cells, borders, lines dividing terrain`;
}

function buildTerrainDescription(metadata: EnrichedMetadata): string {
  const lines: string[] = [];
  for (const [category, percent] of Object.entries(metadata.categoryDistribution)) {
    lines.push(`- ${category}: ${percent}%`);
  }
  return lines.join('\n');
}

function buildObjectDescription(generatedMap: GeneratedMap): string {
  const lines: string[] = [];
  if (generatedMap.obstacles && generatedMap.obstacles.length > 0) {
    lines.push(`Objects: ${generatedMap.obstacles.length} obstacles distributed across map`);
  }
  if (generatedMap.chokePoints && generatedMap.chokePoints.length > 0) {
    lines.push(`Choke Points: ${generatedMap.chokePoints.length} narrow passages`);
  }
  if (generatedMap.sniperLanes && generatedMap.sniperLanes.length > 0) {
    lines.push(`Sniper Lanes: ${generatedMap.sniperLanes.length} long sight lines`);
  }
  if (generatedMap.hazardZones && generatedMap.hazardZones.length > 0) {
    lines.push(`Hazard Zones: ${generatedMap.hazardZones.length} dangerous areas`);
  }
  if (generatedMap.spawnPoints.length > 0) {
    lines.push(`Player Spawn: 1 location (marked as gold)`);
  }
  if (generatedMap.enemySpawns.length > 0) {
    lines.push(`Enemy Spawns: ${generatedMap.enemySpawns.length} locations (marked as red/blue)`);
  }
  return lines.length > 0 ? lines.join('\n') : 'Minimal obstacles, open terrain';
}

function buildSymbolReference(): Record<string, any> {
  const reference: Record<string, any> = {};

  // Add terrain and object symbols from CHAR_MAP
  for (const [char, cell] of Object.entries(CHAR_MAP)) {
    if (['1', '2'].includes(char)) continue; // Skip spawn markers, add separately

    const terrain = cell.ground;
    const object = cell.object;
    const terrainDef = TILE_DEFS[terrain] as any;
    const objectDef = OBJECT_DEFS[object] as any;

    reference[char] = {
      symbol: char,
      terrain,
      object,
      ...(terrainDef && {
        terrainName: terrainDef.displayName,
        category: CATEGORY_MAP[terrain as keyof typeof CATEGORY_MAP] || 'OPEN',
        clearSpeed: terrainDef.clearSpeed,
        coverPercent: terrainDef.coverPercent,
        sightBlockRange: terrainDef.sightBlockRange,
        dotPerTurn: terrainDef.dotPerTurn,
      }),
      ...(objectDef && {
        objectName: objectDef.displayName,
        objectCover: objectDef.coverPercent,
        objectSightBlock: objectDef.sightBlockRange,
      }),
    };
  }

  // Add spawn markers
  reference['1'] = {
    symbol: '1',
    meaning: 'player_spawn',
    description: 'Starting position for player tank',
  };
  reference['2'] = {
    symbol: '2',
    meaning: 'enemy_spawn',
    description: 'Starting position for enemy tank',
  };

  return reference;
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
