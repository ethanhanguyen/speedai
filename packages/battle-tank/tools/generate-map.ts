#!/usr/bin/env node
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GridModel } from '@speedai/game-engine';
import { buildTileSchema } from './schema/SchemaLoader.js';
import { validateStructure, validateGameplay, validateThemeCompliance, type ValidationResult } from './MapValidator.js';
import { MAP_GEN_CONFIG } from './MapGenConfig.js';
import type { ThemeName, TimeOfDay, Season, ThemePreset, Landmark } from './MapGenConfig.js';
import { MAP_CONFIG } from '../src/config/MapConfig.js';
import { OBJECT_DEFS, TILE_DEFS, CHAR_MAP } from '../src/tilemap/TileRegistry.js';
import type { TileCell, MapData } from '../src/tilemap/types.js';
import { ObjectId } from '../src/tilemap/types.js';
import { getAllTerrains } from '../src/config/TerrainDatabase.js';
import { getStructuralObjects, getAllObjects } from '../src/config/ObjectDatabase.js';
import type { ObjectDef } from '../src/config/ObjectDatabase.js';
import type { TerrainDef } from '../src/config/TerrainDatabase.js';
import {
  buildTerrainArchetypeLegend,
  buildObjectArchetypeLegend,
  getTerrainArchetypeBySymbol,
  getObjectArchetypeBySymbol,
  getDefaultTerrainType,
  getDefaultObjectType,
} from '../src/config/ArchetypeDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GeneratedMap {
  mockup: string;
  spatialDescription: string;
  rows: number;
  cols: number;

  // Explicit semantic fields (flat arrays):
  obstacles?: Array<{ r: number; c: number; type: string; rotation?: number }>;

  metadata: {
    theme: string;
    prompt?: string;
    designIntention?: string;
    generated: string;
    timeOfDay?: string;
    season?: string;
    landmarks?: string[];
  };
}

const VALID_THEMES = Object.keys(MAP_GEN_CONFIG.themes) as ThemeName[];
const VALID_TIMES = Object.keys(MAP_GEN_CONFIG.timeOfDay) as TimeOfDay[];
const VALID_SEASONS = Object.keys(MAP_GEN_CONFIG.seasons) as Season[];

program
  .name('generate-map')
  .description('Generate a Battle Tank map using LLM (generate mode) or extract mockup from image (extract mode)')
  .option('-t, --theme <name>', `Theme preset (${VALID_THEMES.join(', ')})`)
  .option('-p, --prompt <text>', 'Additional creative direction for the LLM (optional)')
  .option('-k, --api-key <key>', 'API key: Anthropic for generate, Google for extract (or set ANTHROPIC_API_KEY / GOOGLE_API_KEY env vars)')
  .option('-n, --name <name>', 'Output filename (default: auto-generated from theme)')
  .option('-o, --output-dir <path>', 'Output directory (default: config.output.outputDir)')
  .option('--time <value>', `Time of day (${VALID_TIMES.join(', ')}; default: day)`)
  .option('--season <value>', `Season (${VALID_SEASONS.join(', ')}; default: summer)`)
  .option('--landmark <ids>', 'Landmark(s): comma-separated IDs (e.g., "tobruk_fortress,desert_oasis"); omit or use --no-landmark to disable (default: auto-pick 1-3)')
  .option('--no-landmark', 'Disable landmarks (overrides default auto-pick)')
  .option('--image-path <path>', 'Path to generated image (extract mode)')
  .option('--map-json <path>', 'Path to original map JSON from generate mode (extract mode)')
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
  depression: 'DEFENSIVE',

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
  ridge_crest: 'TRANSITION',
};

/**
 * Resolve landmark selection: 'auto' picks randomly from theme, specific IDs are validated.
 * For 'mixed' theme with 'auto', picks from all themes' landmarks.
 */
function resolveLandmarks(landmarkArg: string | undefined, themePreset: ThemePreset): Landmark[] {
  if (!landmarkArg) return [];

  const { autoPickMin, autoPickMax } = MAP_GEN_CONFIG.landmarks;

  if (landmarkArg === 'auto') {
    let pool: Landmark[];
    if (themePreset.landmarks.length > 0) {
      pool = [...themePreset.landmarks];
    } else {
      // 'mixed' theme: gather from all themes
      pool = Object.values(MAP_GEN_CONFIG.themes).flatMap(t => t.landmarks);
    }
    if (pool.length === 0) return [];
    const count = autoPickMin + Math.floor(Math.random() * (autoPickMax - autoPickMin + 1));
    // Shuffle and pick
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }

  // Specific IDs: validate against theme (or all themes for mixed)
  const ids = landmarkArg.split(',').map(s => s.trim()).filter(Boolean);
  const available = themePreset.landmarks.length > 0
    ? themePreset.landmarks
    : Object.values(MAP_GEN_CONFIG.themes).flatMap(t => t.landmarks);

  const byId = new Map(available.map(l => [l.id, l]));
  const resolved: Landmark[] = [];
  for (const id of ids) {
    const landmark = byId.get(id);
    if (!landmark) {
      const validIds = available.map(l => l.id).join(', ');
      console.error(`Error: Unknown landmark '${id}'. Available for ${themePreset.name}: ${validIds}`);
      process.exit(1);
    }
    resolved.push(landmark);
  }
  return resolved;
}

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
 * Sanitize mockup by replacing forbidden symbols with default terrain.
 */
function sanitizeMockup(
  mockup: string,
  forbiddenSymbols: Set<string>,
  defaultTerrainSymbol: string
): string {
  const rows = mockup.trim().split('\n');
  return rows.map((row) => {
    const symbols = row.trim().split(/\s+/);
    return symbols.map((symbol) => {
      // If symbol is forbidden, replace with default terrain
      if (forbiddenSymbols.has(symbol)) {
        return defaultTerrainSymbol;
      }
      return symbol;
    }).join(' ');
  }).join('\n');
}

/**
 * Parse mockup string and populate grid with terrain + objects.
 * Mockup format: space-separated symbols per row, newline-separated rows.
 * Replaces forbidden ground terrains with the theme-appropriate default.
 */
function populateGridFromMockup(
  grid: GridModel<TileCell>,
  mockup: string,
  symbolToTile: Map<string, TileCell>,
  defaultTerrainSymbol: string = '.',
  forbiddenTerrainNames?: Set<string>
): void {
  // Get the default tile cell using the default symbol
  const defaultTileCell = symbolToTile.get(defaultTerrainSymbol) ||
    { ground: 'loose_sand' as any, object: 'none' as any };

  // Get the default ground terrain (from the default terrain symbol)
  const defaultGround = defaultTileCell.ground;

  if (forbiddenTerrainNames && forbiddenTerrainNames.size > 0) {
    console.error(`[DEBUG] populateGridFromMockup: defaultTerrainSymbol='${defaultTerrainSymbol}', defaultGround='${defaultGround}'`);
  }

  const rows = mockup.trim().split('\n');
  for (let r = 0; r < rows.length && r < grid.rows; r++) {
    const symbols = rows[r].trim().split(/\s+/);
    for (let c = 0; c < symbols.length && c < grid.cols; c++) {
      const symbol = symbols[c];
      let tileCell = symbolToTile.get(symbol);
      if (tileCell) {
        // If the ground is forbidden (e.g., object with loose_sand ground), replace it
        if (forbiddenTerrainNames && forbiddenTerrainNames.has(tileCell.ground)) {
          if (r === 2 && c === 2) {
            console.error(`[DEBUG] At (2,2): replacing ground '${tileCell.ground}' with '${defaultGround}'`);
          }
          tileCell = { ...tileCell, ground: defaultGround };
        }
        grid.set(r, c, { ...tileCell });
      } else {
        // Fallback to default terrain symbol if symbol not found
        grid.set(r, c, { ...defaultTileCell });
      }
    }
  }

  // Fill any remaining uninitialized cells with default terrain
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (!grid.get(r, c)) {
        grid.set(r, c, { ...defaultTileCell });
      }
    }
  }
}

/**
 * Resolve an API key by name. Priority: CLI flag > env var > .env file in monorepo root.
 */
async function resolveApiKey(envVarName: string): Promise<string | undefined> {
  if (options.apiKey) return options.apiKey;
  if (process.env[envVarName]) return process.env[envVarName];
  try {
    const envPath = path.join(__dirname, '../../../.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${envVarName}\\s*=\\s*(.+)`));
    if (match) return match[1].trim();
  } catch {
    // .env file not found or unreadable
  }
  return undefined;
}

/**
 * Get a safe default terrain symbol for a theme (not forbidden).
 */
function getThemeDefaultTerrain(themePreset: ThemePreset): string {
  // If theme specifies preferred terrains, use the first one as default
  if (themePreset.terrainSymbols.length > 0) {
    return themePreset.terrainSymbols[0];
  }
  // Otherwise, use 'loose_sand' (safe for mixed theme)
  return '.';
}

/**
 * Build and validate a grid from a GeneratedMap, returning grid + mapData + validation result.
 */
function buildAndValidateGrid(generatedMap: GeneratedMap, themePreset?: ThemePreset) {
  // Extract spawn positions from mockup symbols
  const spawnPoints: Array<{ r: number; c: number }> = [];
  const enemySpawns: Array<{ r: number; c: number }> = [];
  const mockupRows = generatedMap.mockup.trim().split('\n');
  for (let r = 0; r < mockupRows.length; r++) {
    const symbols = mockupRows[r].trim().split(/\s+/);
    for (let c = 0; c < symbols.length; c++) {
      if (symbols[c] === '1') spawnPoints.push({ r, c });
      else if (symbols[c] === '2') enemySpawns.push({ r, c });
    }
  }

  const mapData: MapData = {
    rows: generatedMap.rows,
    cols: generatedMap.cols,
    spawnPoints,
    enemySpawns,
  };

  const grid = new GridModel<TileCell>(
    generatedMap.rows,
    generatedMap.cols,
    MAP_CONFIG.tileSize,
    0
  );

  const symbolToTile = buildSymbolToTileLookup();
  const defaultTerrainSymbol = themePreset ? getThemeDefaultTerrain(themePreset) : '.';

  // Sanitize mockup: replace any forbidden symbols with default terrain
  let sanitizedMockup = generatedMap.mockup;
  let forbiddenTerrainNames: Set<string> = new Set();
  if (themePreset && themePreset.forbiddenSymbols && themePreset.forbiddenSymbols.length > 0) {
    const forbiddenSet = new Set(themePreset.forbiddenSymbols);
    sanitizedMockup = sanitizeMockup(sanitizedMockup, forbiddenSet, defaultTerrainSymbol);
    // Build a set of forbidden terrain names (not symbols)
    for (const sym of forbiddenSet) {
      const cell = symbolToTile.get(sym);
      if (cell && cell.object === 'none') {
        forbiddenTerrainNames.add(cell.ground);
      }
    }
    // Also add any terrain names that correspond to forbidden symbols
    const allTerrains = getAllTerrains();
    for (const terrain of allTerrains) {
      if (forbiddenSet.has(terrain.symbol)) {
        forbiddenTerrainNames.add(terrain.name);
      }
    }
    console.error(`[DEBUG] Sanitized mockup: replaced forbidden symbols ${Array.from(forbiddenSet).join(',')} with '${defaultTerrainSymbol}'`);
    console.error(`[DEBUG] Forbidden terrain names: ${Array.from(forbiddenTerrainNames).join(',')}`);
  }

  populateGridFromMockup(grid, sanitizedMockup, symbolToTile, defaultTerrainSymbol, forbiddenTerrainNames);

  // Debug: check a few cells
  if (forbiddenTerrainNames.size > 0) {
    const cell = grid.get(2, 2);
    console.error(`[DEBUG] Grid at (2,2): ground='${cell?.ground}', object='${cell?.object}'`);
  }

  // Apply obstacles array (for explicit object placement/rotation)
  const validObjectIds = new Set(Object.values(ObjectId));
  for (const obstacle of generatedMap.obstacles || []) {
    if (!validObjectIds.has(obstacle.type as ObjectId)) {
      console.error(`[WARN] Skipping invalid obstacle type '${obstacle.type}' at (${obstacle.r},${obstacle.c}) — not a valid ObjectId`);
      continue;
    }
    const cell = grid.get(obstacle.r, obstacle.c);
    if (cell) {
      grid.set(obstacle.r, obstacle.c, {
        ...cell,
        object: obstacle.type as ObjectId,
        objectRotation: obstacle.rotation,
      });
    }
  }

  return { grid, mapData };
}

function logValidation(validation: ValidationResult): void {
  if (validation.warnings.length > 0) {
    console.warn('\n⚠️  Validation warnings:');
    for (const warn of validation.warnings) {
      console.warn(`  - ${warn.message}${warn.position ? ` at (${warn.position.r},${warn.position.c})` : ''}`);
    }
  }
}

/**
 * Extract mode: Use vision LLM to generate a refined mockup from a generated image.
 */
async function runExtractMode() {
  const { imagePath, mapJson } = options;
  if (!imagePath || !mapJson) {
    console.error('Error: Extract mode requires both --image-path and --map-json flags.');
    process.exit(1);
  }

  const googleApiKey = await resolveApiKey('GOOGLE_API_KEY');
  if (!googleApiKey) {
    console.error('Error: Google API key required for extract mode. Use --api-key or set GOOGLE_API_KEY env var.');
    process.exit(1);
  }

  // Resolve paths: absolute → as-is; relative → try cwd, then monorepo root, then script dir
  const findMonorepoRoot = (): string => {
    let dir = __dirname;
    while (dir !== path.dirname(dir)) {
      const pkgPath = path.join(dir, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) return dir;
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  };

  const monorepoRoot = findMonorepoRoot();

  const resolvePath = (inputPath: string): string => {
    if (path.isAbsolute(inputPath)) return inputPath;
    const cwdResolved = path.resolve(process.cwd(), inputPath);
    if (existsSync(cwdResolved)) return cwdResolved;
    // Try relative to monorepo root (for npm -w workspace commands)
    const monorepoResolved = path.resolve(monorepoRoot, inputPath);
    if (existsSync(monorepoResolved)) return monorepoResolved;
    // Try relative to script directory (tools/) as fallback
    return path.resolve(__dirname, inputPath);
  };

  const resolvedImagePath = resolvePath(imagePath);
  const resolvedMapJsonPath = resolvePath(mapJson);

  // Load original map JSON
  const originalJson = JSON.parse(await fs.readFile(resolvedMapJsonPath, 'utf-8')) as GeneratedMap;

  // Load image as base64
  const imageBuffer = await fs.readFile(resolvedImagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Build archetype legend for vision prompt (17 types instead of 54)
  const terrainLegend = buildTerrainArchetypeLegend();
  const objectLegend = buildObjectArchetypeLegend();

  const visionPrompt = `You are a military cartography AI. Analyze this top-down aerial battlefield image and produce a precise mockup grid using ARCHETYPE symbols.

TASK: Generate a ${originalJson.rows}×${originalJson.cols} text grid (space-separated symbols per row, newline-separated rows) that maps visible terrain and objects to the archetype legend below.

TERRAIN ARCHETYPES:
${terrainLegend}

OBJECT ARCHETYPES (uppercase letters):
${objectLegend}
(Use space ' ' for empty cells with no objects)

SPAWN MARKERS:
1 = player spawn
2 = enemy spawn

ORIGINAL MOCKUP (alignment reference — refine based on what the image actually shows):
${originalJson.mockup}

RULES:
- Output dimensions MUST be exactly ${originalJson.rows} rows × ${originalJson.cols} columns
- Use archetype symbols from the legend above (e.g., '.' for fast ground, 'W' for walls)
- Combine terrain + object symbols in each cell (e.g., '. W' = fast ground + wall)
- Use space ' ' for cells with terrain only (no objects)
- Preserve spawn positions from the original mockup (1 and 2 markers)
- Default terrain: . (fast_ground)
- Output ONLY valid JSON: {"mockup": "...the grid..."}
- No explanation, no markdown, no extra text`;

  console.error('[DEBUG] Vision Extraction');
  console.error(`  Image: ${resolvedImagePath}`);
  console.error(`  Map JSON: ${resolvedMapJsonPath}`);
  console.error(`  Grid: ${originalJson.rows}×${originalJson.cols}`);
  console.error(`  Model: ${MAP_GEN_CONFIG.vision.model}`);
  console.error('');

  const genAI = new GoogleGenAI({ apiKey: googleApiKey });

  // Pre-call logging
  console.error('[DEBUG] API Call Setup');
  console.error(`  API Key: ${googleApiKey ? `present (${googleApiKey.length} chars)` : 'MISSING'}`);
  console.error(`  Image size: ${imageBuffer.length} bytes`);
  console.error(`  Prompt length: ${visionPrompt.length} chars`);
  console.error(`  MIME type: ${mimeType}`);
  console.error('');

  const response = await genAI.models.generateContent({
    model: MAP_GEN_CONFIG.vision.model,
    contents: [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: visionPrompt },
    ],
    config: {
      maxOutputTokens: MAP_GEN_CONFIG.vision.maxTokens,
      temperature: MAP_GEN_CONFIG.vision.temperature,
    },
  });

  // Post-call logging: inspect response structure
  console.error('[DEBUG] API Response Received');
  console.error(`  Response type: ${typeof response}`);
  console.error(`  Response keys: ${response ? Object.keys(response).join(', ') : 'null'}`);
  if (response && typeof response === 'object') {
    console.error(`  Has .text: ${typeof (response as any).text}`);
    console.error(`  Has .response: ${typeof (response as any).response}`);
    if ((response as any).response) {
      console.error(`  .response keys: ${Object.keys((response as any).response).join(', ')}`);
      console.error(`  .response.text type: ${typeof (response as any).response.text}`);
    }
    if ((response as any).candidates) {
      console.error(`  Candidates count: ${(response as any).candidates?.length || 0}`);
    }
  }
  console.error('');

  // Try multiple access patterns to get text (prioritize full response over preview)
  let responseText: string | undefined;
  try {
    // Pattern 1 (BEST): candidates[0].content.parts[0].text - full response
    if ((response as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = (response as any).candidates[0].content.parts[0].text;
      console.error('[DEBUG] Extracted text via: candidates[0].content.parts[0].text');
    }
    // Pattern 2: response.text() method
    else if (typeof (response as any).text === 'function') {
      responseText = (response as any).text();
      console.error('[DEBUG] Extracted text via: response.text() method');
    }
    // Pattern 3: response.response.text() method
    else if ((response as any).response && typeof (response as any).response.text === 'function') {
      responseText = (response as any).response.text();
      console.error('[DEBUG] Extracted text via: response.response.text() method');
    }
    // Pattern 4 (FALLBACK): response.text property - may be truncated preview
    else if (typeof (response as any).text === 'string') {
      responseText = (response as any).text;
      console.error('[DEBUG] Extracted text via: response.text property (WARNING: may be truncated)');
    }
  } catch (e) {
    console.error(`[DEBUG] Error extracting text: ${(e as Error).message}`);
  }

  if (!responseText) {
    console.error('[DEBUG] Failed to extract text from response. Full response:');
    console.error(JSON.stringify(response, null, 2));
    throw new Error('Empty response from vision LLM');
  }

  console.error('[DEBUG] Text Extraction Success');
  console.error(`  Text length: ${responseText.length} chars`);
  console.error(`  First 200 chars: ${responseText.substring(0, 200)}`);
  console.error('');

  // Parse vision response
  let extractedMockup: string;
  try {
    console.error('[DEBUG] Parsing JSON Response');
    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      console.error('  Detected markdown code fence, extracting JSON block');
      jsonText = jsonMatch[1].trim();
    } else {
      console.error('  No markdown fence detected, parsing raw text');
    }
    console.error(`  JSON text length: ${jsonText.length} chars`);
    console.error(`  JSON preview: ${jsonText.substring(0, 100)}...`);

    const parsed = JSON.parse(jsonText);
    console.error(`  Parsed successfully. Keys: ${Object.keys(parsed).join(', ')}`);

    extractedMockup = parsed.mockup;
    if (extractedMockup) {
      console.error(`  Mockup extracted: ${extractedMockup.split('\n').length} lines`);
    }
    console.error('');
  } catch (e) {
    console.error(`[DEBUG] JSON Parse Error: ${(e as Error).message}`);
    console.error(`  Failed text: ${responseText.substring(0, 500)}`);
    throw new Error(`Failed to parse vision response as JSON: ${(e as Error).message}`);
  }

  if (!extractedMockup || typeof extractedMockup !== 'string') {
    throw new Error('Vision response must contain a non-empty mockup string');
  }

  console.error('[DEBUG] Converting archetype mockup to generation types');
  console.error(`  Archetype mockup (first 200 chars): ${extractedMockup.substring(0, 200)}`);

  // Convert archetype symbols to default generation type symbols
  const generationMockup = convertArchetypeMockupToGenerationTypes(extractedMockup);

  console.error(`  Generation mockup (first 200 chars): ${generationMockup.substring(0, 200)}`);
  console.error('');

  // Replace mockup in original map data with converted generation type mockup
  const refinedMap: GeneratedMap = { ...originalJson, mockup: generationMockup };

  // Validation (advisory — always saves)
  // Note: Skip theme validation for archetype-based extracts (archetypes are theme-agnostic)
  const themeName = (originalJson.metadata?.theme || 'mixed') as ThemeName;
  const themePreset = MAP_GEN_CONFIG.themes[themeName];
  const { grid, mapData } = buildAndValidateGrid(refinedMap, themePreset);

  logValidation(validateStructure(grid, mapData));
  logValidation(validateGameplay(grid));
  // Theme validation skipped - archetypes map to neutral defaults, not theme-specific types
  console.log('ℹ️  Theme validation skipped (extract mode uses theme-agnostic archetypes)');

  const stats = calculateMapStats(grid);
  const enrichedMetadata = enrichMetadata(grid, stats, refinedMap, themeName);
  refinedMap.metadata = enrichedMetadata;

  // Determine output paths
  const baseName = path.basename(resolvedMapJsonPath, '.json');
  const outputDir = options.outputDir || path.dirname(resolvedMapJsonPath);

  // Save archetype mockup (raw from vision LLM) for debugging
  const archetypeMockupPath = path.join(outputDir, `${baseName}_archetype.txt`);
  await fs.writeFile(archetypeMockupPath, extractedMockup);

  // Save generation type mockup (converted for game use)
  const extractedMockupPath = path.join(outputDir, `${baseName}_extracted.txt`);
  await fs.writeFile(extractedMockupPath, generationMockup);

  const extractedJsonPath = path.join(outputDir, `${baseName}_extracted.json`);
  await fs.writeFile(extractedJsonPath, JSON.stringify(refinedMap, null, 2));

  console.log(`✅ Archetype mockup saved: ${archetypeMockupPath}`);
  console.log(`✅ Extracted mockup saved: ${extractedMockupPath}`);
  console.log(`✅ Extracted map data saved: ${extractedJsonPath}`);
}

/**
 * Generate mode: Use text LLM to generate map from theme.
 */
async function runGenerateMode() {
  const themeName = options.theme as ThemeName;
  if (!themeName) {
    console.error(`Error: Generate mode requires --theme flag. Valid themes: ${VALID_THEMES.join(', ')}`);
    process.exit(1);
  }
  if (!VALID_THEMES.includes(themeName)) {
    console.error(`Error: Unknown theme '${themeName}'. Valid themes: ${VALID_THEMES.join(', ')}`);
    process.exit(1);
  }

  const timeOfDay = (options.time || 'day') as TimeOfDay;
  if (!VALID_TIMES.includes(timeOfDay)) {
    console.error(`Error: Unknown time '${timeOfDay}'. Valid: ${VALID_TIMES.join(', ')}`);
    process.exit(1);
  }

  const season = (options.season || 'summer') as Season;
  if (!VALID_SEASONS.includes(season)) {
    console.error(`Error: Unknown season '${season}'. Valid: ${VALID_SEASONS.join(', ')}`);
    process.exit(1);
  }

  const apiKey = await resolveApiKey('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('Error: Anthropic API key required. Use --api-key or set ANTHROPIC_API_KEY env var.');
    process.exit(1);
  }

  const schema = buildTileSchema();
  const anthropic = new Anthropic({ apiKey });

  const themePreset = MAP_GEN_CONFIG.themes[themeName];
  // Default to 'auto' unless --no-landmark flag is set or specific IDs provided
  const landmarkArg = options.landmark === false ? undefined : (options.landmark || 'auto');
  const selectedLandmarks = resolveLandmarks(landmarkArg, themePreset);
  const systemPrompt = buildSystemPrompt(schema, themePreset, selectedLandmarks);

  // User prompt: theme description + optional additional direction
  const additionalPrompt = options.prompt || '';
  const landmarkNames = selectedLandmarks.map(l => l.label).join(', ');
  let userPrompt = `Generate a ${themeName} map.`;
  if (selectedLandmarks.length > 0) {
    userPrompt += ` Include these landmarks: ${landmarkNames}.`;
  }
  if (additionalPrompt) {
    userPrompt += ` Additional direction: ${additionalPrompt}`;
  }

  console.error('[DEBUG] Map Generation Request');
  console.error(`  Theme: ${themeName}`);
  console.error(`  Time: ${timeOfDay}`);
  console.error(`  Season: ${season}`);
  console.error(`  Landmarks: ${selectedLandmarks.length > 0 ? selectedLandmarks.map(l => l.id).join(', ') : '(none)'}`);
  console.error(`  Additional prompt: ${additionalPrompt || '(none)'}`);
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

  const generatedMap = parseMapResponse(content.text, themeName, additionalPrompt, timeOfDay, season);
  if (selectedLandmarks.length > 0) {
    generatedMap.metadata.landmarks = selectedLandmarks.map(l => l.id);
  }

  const { grid, mapData } = buildAndValidateGrid(generatedMap, themePreset);
  logValidation(validateStructure(grid, mapData));

  const stats = calculateMapStats(grid);
  const enrichedMetadata = enrichMetadata(grid, stats, generatedMap, themeName, timeOfDay, season);
  generatedMap.metadata = enrichedMetadata;

  const outputName = options.name || `${themeName}_${Date.now()}`;
  const outputDir = options.outputDir || path.join(__dirname, MAP_GEN_CONFIG.output.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const mockupPath = path.join(outputDir, `${outputName}.txt`);
  await fs.writeFile(mockupPath, generatedMap.mockup);

  const jsonPath = path.join(outputDir, `${outputName}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(generatedMap, null, 2));

  const symbolRef = buildSymbolReference();
  const symbolPath = path.join(outputDir, `${outputName}_symbols.json`);
  await fs.writeFile(symbolPath, JSON.stringify(symbolRef, null, 2));

  const imagePrompt = generateImagePrompt(generatedMap, enrichedMetadata, stats, selectedLandmarks);
  const imagePromptPath = path.join(outputDir, `${outputName}_image_prompt.txt`);
  await fs.writeFile(imagePromptPath, imagePrompt);

  console.log(`✅ Mockup saved: ${mockupPath}`);
  console.log(`✅ Map data saved: ${jsonPath}`);
  console.log(`✅ Symbol reference saved: ${symbolPath}`);
  console.log(`✅ Image prompt saved: ${imagePromptPath}`);
}

async function main() {
  const isExtractMode = !!(options.imagePath || options.mapJson);

  if (isExtractMode) {
    await runExtractMode();
  } else {
    await runGenerateMode();
  }
}

function buildSystemPrompt(schema: any, themePreset: ThemePreset, landmarks: Landmark[] = []): string {
  const { minSpawnDistance, targetCoverDensity, maxTerrainVariety, preferredWalkablePercent, categoryTargets } = MAP_GEN_CONFIG.design;
  const { maxNonPreferredTerrains, maxNonPreferredObjects } = MAP_GEN_CONFIG.themeEnforcement;

  // Determine the default terrain symbol for this theme
  const defaultTerrainSymbol = getThemeDefaultTerrain(themePreset);

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

  // Build dynamic terrain legend grouped by category, filtering out forbidden symbols for this theme
  const allTerrains = getAllTerrains();
  const forbiddenTerrainSet = new Set(themePreset.forbiddenSymbols || []);
  const terrainsByCategory: Record<string, typeof allTerrains> = {
    MOBILITY: [],
    DEFENSIVE: [],
    HAZARD: [],
    OPEN: [],
    TRANSITION: [],
  };
  for (const terrain of allTerrains) {
    if (!forbiddenTerrainSet.has(terrain.symbol)) {
      terrainsByCategory[terrain.category].push(terrain);
    }
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
  // Filter out forbidden object symbols for this theme
  const forbiddenObjectSet = new Set(themePreset.forbiddenObjectSymbols || []);
  const structuralObjects = getStructuralObjects();
  const objectLegend = structuralObjects
    .filter((obj: any) => !forbiddenObjectSet.has(obj.symbol))
    .map((obj: any) => {
      return `${obj.symbol},${obj.displayName},"${obj.effectsDescription}","${obj.strategicRole}","${obj.historicalContext}",${(obj.coverPercent * 100).toFixed(0)}%,${obj.sightBlockRange}`;
    })
    .join('\n');

  // Category density targets explanation (handle empty or undefined gracefully)
  const themeTargets = themePreset.categoryTargets;
  const categoryTargetsStr = Object.entries(themeTargets ?? categoryTargets ?? {})
    .map(([cat, target]: [string, { min: number; max: number; priority: string }]) => {
      return `- ${cat}: ${(target.min * 100).toFixed(0)}–${(target.max * 100).toFixed(0)}% (${target.priority})`;
    })
    .join('\n');

  // New: Combined symbol reference for quick lookup (filtered to exclude forbidden symbols)
  const allowedTerrainSymbols = Object.entries(terrainSymbols)
    .filter(([sym]) => !forbiddenTerrainSet.has(sym))
    .map(([sym, name]) => `${sym}=${name}`)
    .join(', ');
  const allowedObjectSymbols = Object.entries(objectSymbols)
    .filter(([sym]) => !forbiddenObjectSet.has(sym))
    .map(([sym, name]) => `${sym}=${name}`)
    .join(', ');
  const symbolReference = `TERRAIN SYMBOLS: ${allowedTerrainSymbols}\nOBJECT SYMBOLS: ${allowedObjectSymbols}`;

  // Theme-specific terrain/object guidance
  const preferredTerrainList = themePreset.terrainSymbols.length > 0
    ? themePreset.terrainSymbols.join(', ')
    : 'All terrain symbols allowed';
  const forbiddenTerrainList = themePreset.forbiddenSymbols?.length
    ? themePreset.forbiddenSymbols.join(', ')
    : 'None';
  const preferredObjectList = themePreset.objectSymbols.length > 0
    ? themePreset.objectSymbols.join(', ')
    : 'All object symbols allowed';
  const forbiddenObjectList = themePreset.forbiddenObjectSymbols?.length
    ? themePreset.forbiddenObjectSymbols.join(', ')
    : 'None';

  // Build forbidden terrain symbol mappings for explicit warning
  const forbiddenTerrainWarning = themePreset.forbiddenSymbols?.length
    ? `⛔ STRICTLY FORBIDDEN symbols (MUST NOT appear anywhere in mockup): ${themePreset.forbiddenSymbols.map((sym) => {
        const terrainName = CHAR_MAP[sym]?.ground || 'unknown';
        return `${sym}(${terrainName})`;
      }).join(', ')}`
    : '';

  const forbiddenObjectWarning = themePreset.forbiddenObjectSymbols?.length
    ? `⛔ STRICTLY FORBIDDEN object symbols (MUST NOT appear anywhere in mockup): ${themePreset.forbiddenObjectSymbols.map((sym) => {
        const objectName = CHAR_MAP[sym]?.object || 'unknown';
        return `${sym}(${objectName})`;
      }).join(', ')}`
    : '';

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

**⛔ CRITICAL: SYMBOL USAGE CONSTRAINT FOR THIS THEME**
You MUST ONLY use terrain symbols from the TERRAIN SYMBOLS section above. Do NOT use any terrain types not explicitly listed there. This theme forbids: ${forbiddenTerrainList}. Using any forbidden symbol will cause validation failure.
For default/empty areas, use this symbol: '${defaultTerrainSymbol}' (${CHAR_MAP[defaultTerrainSymbol]?.ground || 'terrain'})

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

**THEME: ${themePreset.name.toUpperCase()}**:
- Description: ${themePreset.description}
- Preferred terrains: ${preferredTerrainList}
- Forbidden terrains: ${forbiddenTerrainList}
- Preferred objects: ${preferredObjectList}
- Forbidden objects: ${forbiddenObjectList}
- Use PRIMARILY from the preferred lists. You may include up to ${maxNonPreferredTerrains} non-preferred terrain types and ${maxNonPreferredObjects} non-preferred object types if tactically essential — justify in designIntention. Forbidden types must NEVER appear.
${forbiddenTerrainWarning ? '\n' + forbiddenTerrainWarning : ''}
${forbiddenObjectWarning ? '\n' + forbiddenObjectWarning : ''}
${landmarks.length > 0 ? `
**LANDMARKS** (compose these as recognizable spatial clusters using existing symbols):
${landmarks.map(l => `- ${l.label}: ${l.composition}`).join('\n')}
Place each landmark as a coherent multi-cell region. Mention landmark placement in spatialDescription using compass directions. Landmarks should integrate naturally with surrounding terrain — they are focal points, not isolated patches.
` : ''}
**DESIGN CONSTRAINTS** (must enforce):
1. **Connectivity**: All spawns connected via walkable paths. Min distance between spawns: ${minSpawnDistance} cells.
2. **Balance**: Follow category targets; max ${maxTerrainVariety} unique terrains.
3. **Cover**: ~${(targetCoverDensity * 100).toFixed(0)}% walkable cells near cover.
4. **Sight & Flow**: Mix exposed lanes with sheltered paths; multiple approaches.
5. **Stats Targets**:
   - Walkable %: ~${(preferredWalkablePercent * 100).toFixed(0)}% (min ${(MAP_GEN_CONFIG.validation.minWalkablePercent * 100).toFixed(0)}%).
   - Object density: ≤${(MAP_GEN_CONFIG.validation.maxObjectDensity * 100).toFixed(0)}%.
   - Variety: ≤${maxTerrainVariety} terrain types.

**SPATIAL DESCRIPTION** (critical for image generation — describe map as a military aerial briefing):
- Describe region-by-region using compass directions (NW, NE, SW, SE, center, edges)
- Include: terrain types and transitions, object clusters and landmarks, elevation changes, strategic zones
- Example: "Northern ridge: rocky outcrops forming defensive wall with hull-down positions. Center: open hardpan road running N-S flanked by scattered containers. SE corner: marshy depression creating natural hazard. Player spawn in SW behind boulder cluster; enemy spawns along eastern edge behind fortifications."
- Be specific about spatial relationships, distances, and visual character

**OUTPUT REQUIREMENTS** (strictly follow; output ONLY valid JSON, no extra text/reasoning/markdown):
{
  "mockup": "Multi-line string: Visual text grid (rows x cols exact; symbols space-separated per row, e.g., '. . G 1'). Use ONLY symbols from the TERRAIN SYMBOLS and OBJECT SYMBOLS lists above. Default/filler terrain symbol for empty spaces: '${defaultTerrainSymbol}'. If any forbidden symbols appear, the map will fail validation.",
  "spatialDescription": "Detailed region-by-region spatial narrative of the map layout for image generation. Describe terrain zones, object placement, landmarks, and strategic features using compass directions. Written as if briefing a military aerial photographer.",
  "rows": number,
  "cols": number,
  "obstacles": [{"r": number (0-based row), "c": number (0-based col), "type": string (object name), "rotation": number (0/90/180/270 if applicable)} , ...],  // Only non-default blocking objects
  "metadata": {
    "theme": string (descriptive name),
    "prompt": string (user's original prompt, if any),
    "designIntention": string (2-3 sentences: zone roles, category distribution, playstyle)
  }
}
- Spawns: On high clear-speed terrain; ensure connectivity.
- Features: Reference real map positions with tactical value.
- Grid: Flat representation; minimize JSON size by omitting defaults.

**EXAMPLE** (10x8 desert; symbols: . = loose_sand, P = hardpan, G = gravel, W = water, C = shipping_container, R = boulder_formation, 1/2 = spawns):
". . . . . . . .\n. . G G . . . .\n. 2 . . . . C .\n. . P P W W . .\n. . P P W W . .\n. . . . C . R .\n. . . . R R . .\n. 1 . . . . . 2\n. . . . . . . .\n. . . . . . . ."

For urban maps, the default would be different: A = asphalt, u = urban_pavement, r = dirt_road, etc.`;
}

function parseMapResponse(text: string, themeName: string, additionalPrompt: string, timeOfDay: TimeOfDay, season: Season): GeneratedMap {
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
  parsed.metadata.theme = themeName;
  parsed.metadata.prompt = additionalPrompt || undefined;
  parsed.metadata.timeOfDay = timeOfDay;
  parsed.metadata.season = season;
  parsed.metadata.generated = new Date().toISOString();

  // Validate mockup is a non-empty string
  if (!parsed.mockup || typeof parsed.mockup !== 'string') {
    throw new Error('Mockup must be a non-empty string with visual grid');
  }

  // Default spatialDescription if missing
  if (!parsed.spatialDescription || typeof parsed.spatialDescription !== 'string') {
    parsed.spatialDescription = '';
  }

  return parsed;
}

interface MapStats {
  totalCells: number;
  walkableCells: number;
  walkablePercent: number;
  terrainCounts: Record<string, number>;
  totalObjects: number;
  objectCounts: Record<string, number>;
  decorCount: number;
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
  prompt?: string;
  designIntention: string;
  mapSize: { rows: number; cols: number };
  walkablePercent: number;
  terrainVariety: number;
  objectDensity: number;
  categoryDistribution: CategoryDistribution;
  playstyleProfile: string;
  timeOfDay: string;
  season: string;
  landmarks?: string[];
  generated: string;
}

function calculateMapStats(grid: GridModel<TileCell>): MapStats {
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
  };
}

function enrichMetadata(
  grid: GridModel<TileCell>,
  stats: MapStats,
  generatedMap: GeneratedMap,
  theme: string,
  timeOfDay: string = 'day',
  season: string = 'summer'
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
    prompt: generatedMap.metadata?.prompt || undefined,
    designIntention: generatedMap.metadata?.designIntention || '',
    mapSize: { rows: grid.rows, cols: grid.cols },
    walkablePercent: Math.round(stats.walkablePercent * 100),
    terrainVariety,
    objectDensity: Math.round(objectDensity * 100),
    categoryDistribution: categoryDist,
    playstyleProfile,
    timeOfDay,
    season,
    generated: new Date().toISOString(),
  };
}

/**
 * Build visual elements description for image prompt.
 * Describes terrains and prebaked objects in natural prose.
 * Sprite objects are excluded (they overlay at runtime).
 */
function buildVisualElementsSection(stats: MapStats): string {
  // Build lookup maps from databases
  const allTerrains = getAllTerrains();
  const terrainByName = new Map<string, TerrainDef>();
  for (const t of allTerrains) {
    terrainByName.set(t.name, t);
  }

  const allObjects = getAllObjects();
  const objectByName = new Map<string, ObjectDef>();
  for (const o of allObjects) {
    objectByName.set(o.name, o);
  }

  // Terrains: build prose list with role/context
  const terrainList: string[] = [];
  for (const terrainName of Object.keys(stats.terrainCounts)) {
    const def = terrainByName.get(terrainName);
    if (def) {
      terrainList.push(`${def.displayName} (${def.historicalContext})`);
    }
  }

  // Prebaked structures: these MUST render into the image, not as overlays
  const prebakedStructures: string[] = [];
  for (const objectName of Object.keys(stats.objectCounts)) {
    const def = objectByName.get(objectName);
    if (!def) continue;
    if (!def.spriteAvailable) {
      prebakedStructures.push(`${def.displayName} — ${def.effectsDescription}`);
    }
  }

  // Compose natural prose
  let prose = `The ground features ${terrainList.join(', ')}.`;

  if (prebakedStructures.length > 0) {
    prose += ` Built structures embedded in terrain: ${prebakedStructures.join('; ')}.`;
  }

  return prose;
}

/**
 * Build environment condition description for image prompt.
 * Converts time + season config to prose narrative.
 */
function buildConditionHints(timeOfDay: TimeOfDay, season: Season): string {
  const timePreset = MAP_GEN_CONFIG.timeOfDay[timeOfDay];
  const seasonPreset = MAP_GEN_CONFIG.seasons[season];

  return `${timePreset.lighting} Colors shift toward ${timePreset.palette}. ${seasonPreset.atmosphere} ${seasonPreset.surfaceEffects}`;
}

function generateImagePrompt(generatedMap: GeneratedMap, metadata: EnrichedMetadata, stats: MapStats, landmarks: Landmark[] = []): string {
  const timeOfDay = (metadata.timeOfDay || 'day') as TimeOfDay;
  const season = (metadata.season || 'summer') as Season;
  const visualElements = buildVisualElementsSection(stats);
  const conditionHints = buildConditionHints(timeOfDay, season);
  const randomnessHints = buildNaturalRandomnessHints(metadata);

  // Landmark focal points as natural prose
  const landmarkIntro = landmarks.length > 0
    ? `Key landmarks: ${landmarks.map(l => `${l.label} (${l.imageHint})`).join('; ')}.`
    : '';

  return `Create a top-down aerial photograph of a WWII-era tank battlefield, shot from directly overhead. The view spans a ${metadata.mapSize.rows}×${metadata.mapSize.cols} grid area.

SPATIAL LAYOUT:
${generatedMap.spatialDescription}

${landmarkIntro}

TERRAIN & STRUCTURES:
${visualElements}

ENVIRONMENT & LIGHTING:
${conditionHints}

DESIGN INTENT:
${metadata.designIntention}

TONE: Military reconnaissance photography. Render with natural texture detail and organic variation — ${randomnessHints.toLowerCase()}

STRICT IMAGE RESTRICTIONS — the output MUST NOT contain ANY of the following:
- NO grid lines, cell borders, tile outlines, or any visible grid structure
- NO row numbers, column numbers, coordinates, or numeric labels of any kind
- NO text, letters, symbols, legends, keys, or annotations
- NO logos, watermarks, UI elements, or overlays
- NO map markers, spawn indicators, or abstract icons
The image must look like a pure aerial photograph — seamless, organic terrain with zero artificial markings.`;
}


function buildNaturalRandomnessHints(metadata: EnrichedMetadata): string {
  const theme = metadata.theme.toLowerCase();

  if (theme.includes('desert') || theme.includes('north_africa')) {
    return `wind-swept sand drifts, dust patterns, shifting shadows, cracked salt, sun-bleached color, erosion channels, natural weathering.`;
  }
  if (theme.includes('urban')) {
    return `weathered concrete, rust streaks, debris, broken pavement, shadowed rubble, aged material discoloration.`;
  }
  if (theme.includes('snow') || theme.includes('winter') || theme.includes('eastern')) {
    return `uneven snow drifts, ice melt patterns, frost shadows, packed compression marks, dark soil patches, wind scour.`;
  }
  if (theme.includes('jungle') || theme.includes('forest') || theme.includes('pacific')) {
    return `dappled shadows, vegetation density shifts, moss irregularity, soil erosion, organic color gradients, leaf litter.`;
  }
  if (theme.includes('mediterranean')) {
    return `sun-baked limestone, terraced erosion, olive tree shadows, dry creek beds, weathered stone, wild herb patches.`;
  }
  if (theme.includes('western')) {
    return `hedgerow shadows, plowed fields, cobblestone patches, orchard scatter, stone bridge moss, aged structures.`;
  }

  return `irregular weathering, texture gradients, color shifts from wear, shadow irregularities, organic material distribution.`;
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

/**
 * Convert archetype mockup (17 symbols) to generation type mockup (54 symbols).
 * Maps archetype symbols to default generation types, then finds corresponding CHAR_MAP symbols.
 */
function convertArchetypeMockupToGenerationTypes(archetypeMockup: string): string {
  const lines = archetypeMockup.trim().split('\n');
  const convertedLines: string[] = [];

  // Build reverse CHAR_MAP: terrain+object -> symbol
  const reverseCharMap = new Map<string, string>();
  for (const [symbol, cell] of Object.entries(CHAR_MAP)) {
    const key = `${cell.ground}|${cell.object}`;
    reverseCharMap.set(key, symbol);
  }

  for (const line of lines) {
    const cells = line.trim().split(/\s+/);
    const convertedCells: string[] = [];

    for (const cellSymbol of cells) {
      // Handle spawn markers (pass through unchanged)
      if (cellSymbol === '1' || cellSymbol === '2') {
        convertedCells.push(cellSymbol);
        continue;
      }

      // Parse archetype cell: may be single terrain symbol or terrain+object (e.g., '. W')
      const parts = cellSymbol.split('');
      let terrainSymbol = parts[0] || '.';
      let objectSymbol = parts.length > 1 ? parts[1] : ' ';

      // Get archetype IDs from symbols
      const terrainArchetype = getTerrainArchetypeBySymbol(terrainSymbol);
      const objectArchetype = objectSymbol !== ' ' ? getObjectArchetypeBySymbol(objectSymbol) : null;

      // Get default generation types
      const defaultTerrain = terrainArchetype ? getDefaultTerrainType(terrainArchetype.id) : 'grass';
      const defaultObject = objectArchetype ? getDefaultObjectType(objectArchetype.id) : 'none';

      // Look up corresponding symbol in CHAR_MAP
      const key = `${defaultTerrain}|${defaultObject}`;
      const generationSymbol = reverseCharMap.get(key);

      if (generationSymbol) {
        convertedCells.push(generationSymbol);
      } else {
        // Fallback: try terrain-only lookup
        const terrainOnlyKey = `${defaultTerrain}|none`;
        const fallbackSymbol = reverseCharMap.get(terrainOnlyKey) || '.';
        convertedCells.push(fallbackSymbol);
      }
    }

    convertedLines.push(convertedCells.join(' '));
  }

  return convertedLines.join('\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
