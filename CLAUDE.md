# SpeedAI Monorepo

## Structure
- `packages/game-engine/` — `@speedai/game-engine`: ECS game engine (Canvas 2D, zero-dep)
- `packages/flappy-bird/` — `@speedai/flappy-bird`: Flappy Bird implementation
- `packages/ball-crush/` — `@speedai/ball-crush`: Ball Crush (match-3) implementation
- `packages/battle-tank/` — `@speedai/battle-tank`: Top-down tank game (tilemap, composite sprites)
- `packages/demo/` — `@speedai/demo`: Arcade landing page (game tiles)
- `GAME_SPEC.template.md` — Template for specifying new games
- `GAME_SPEC_flappybird.md` — Flappy Bird game specification
- `plan_phases.md` — Battle Tank phased implementation plan

## Commands (run from repo root)
**Game Engine:**
- Build: `npm run build -w packages/game-engine`
- Test: `npm run test -w packages/game-engine`
- Typecheck: `npm run typecheck -w packages/game-engine`

**Flappy Bird:**
- Dev: `npm run dev -w packages/flappy-bird`
- Build: `npm run build -w packages/flappy-bird`
- Preview: `npm run preview -w packages/flappy-bird`
- Typecheck: `npm run typecheck -w packages/flappy-bird`

**Ball Crush:**
- Dev: `npm run dev -w packages/ball-crush`
- Build: `npm run build -w packages/ball-crush`
- Preview: `npm run preview -w packages/ball-crush`
- Typecheck: `npm run typecheck -w packages/ball-crush`

**Battle Tank:**
- Dev: `npm run dev -w packages/battle-tank`
- Build: `npm run build -w packages/battle-tank`
- Preview: `npm run preview -w packages/battle-tank`
- Typecheck: `npm run typecheck -w packages/battle-tank`
- Map Designer: `npm run designer -w packages/battle-tank` → http://localhost:5174
- Generate Map (LLM): `npm run generate-map -w packages/battle-tank -- --theme <name> [--prompt "<extra>"] [--time <tod>] [--season <s>] [--landmark <ids>] [--no-landmark] --api-key <key>`
  - Themes: `north_africa`, `eastern_front`, `pacific`, `urban`, `mediterranean`, `western_front`, `mixed`
  - Time: `dawn`, `day` (default), `dusk`, `night`
  - Season: `spring`, `summer` (default), `autumn`, `winter`
  - Landmark: Auto-picks 1-3 random landmarks by default. Specify IDs (e.g., `--landmark tobruk_fortress,desert_oasis`) for specific landmarks. Use `--no-landmark` to disable. Each theme has 8 landmarks.
- Extract Map from Image: `npm run generate-map -w packages/battle-tank -- --image-path <path> --map-json <path> --api-key <google-key>`
  - Debug logging: API setup, response structure, text extraction methods, JSON parsing steps

**Demo (Arcade Landing Page):**
- Dev: `npm run dev -w packages/demo`
- Build: `npm run build -w packages/demo`

## Map Details Level

**MapMetadata** (`src/tilemap/types.ts`) captures terrain/object distributions, strategic zones, and LLM hints:
- `terrainCoverage` — breakdown by terrain name with counts & percentages
- `objectsByCategory` — object distribution by ObjectDatabase category
- `strategicZones` — auto-detected: chokePoints, ambushZones, hazardZones
- `backgroundImage` — path to prebaked JPEG (from JSON or file load)
- `hints` — LLM generation hints derived from metadata

**Designer** features:
- Reads metadata from JSON (generate-map output) via `MapDetailsAnalyzer.analyzeMapDetails()`
- Right panel shows terrain coverage & object counts
- "Show Zones" button toggles strategic zone overlays (color-coded legend in top-left)
- Background image renders behind tilemap
- **Object Properties Editor:** Select object → edit rotation (E/Q keys or dropdown), isImpassable/isDestructible/isVisualOverlay (checkboxes), clearSpeed, strategicRole
- Property overrides stored per-tile in `cell.objectProperties` (editor-only, for fine-tuning)

**Map Exports** include metadata in `.ts` exports for game use.

**Map Generation** (`generate-map.ts`) — two-mode workflow:

**Mode 1: Generate** (`--theme`):
- `--theme` selects a theme preset (terrain/object preferred & forbidden lists, category targets)
- Optional `--prompt` adds extra creative direction on top of the theme
- `--time` / `--season` control environment conditions (lighting, palette, surface effects) for image prompt
- Landmarks **auto-pick 1-3 by default**; specify IDs (e.g., `--landmark tobruk_fortress,desert_oasis`) or `--no-landmark` to disable. Landmarks are compositional recipes — clusters of existing terrain+object symbols forming recognizable WWII-era structures. Each theme has 8 landmarks.
- LLM generates mockup (text grid) + `spatialDescription` (region-by-region layout narrative for image gen)
- Image prompt includes: `spatialDescription`, visual element descriptors (terrain types, prebaked objects, sprite exclusions), environment conditions, theme-aware natural variation hints, landmark visual hints
- All validation is advisory (warnings only, never blocks saving)
- Outputs: mockup (.txt), JSON (map data + spatialDescription), symbol reference, image prompt

**Mode 2: Extract** (`--image-path` + `--map-json`):
- Takes generated image + original JSON from Mode 1
- Gemini 2.5 Pro vision analyzes image → produces **archetype mockup** (17 symbols: 9 terrain + 8 object)
- Converts archetype symbols to default generation types via `ArchetypeDatabase` (e.g., `.` → `grass`, `W` → `rock_wall`)
- Original mockup provided as alignment reference; spawn positions preserved
- Advisory validation (structure + gameplay only) — theme validation skipped (archetypes are theme-agnostic)
- Re-computes metadata from extracted mockup
- Outputs: `{name}_archetype.txt` (raw vision), `{name}_extracted.txt` (converted), `{name}_extracted.json`
- Requires `GOOGLE_API_KEY` env var or `--api-key`
- Paths resolve in order: absolute → relative-to-cwd → relative-to-monorepo-root → relative-to-tools-dir. Examples:
  - From repo root: `npm run generate-map -w packages/battle-tank -- --image-path packages/battle-tank/tools/generated-maps/map.jpeg --map-json packages/battle-tank/tools/generated-maps/map.json --api-key <key>`
  - From tools dir: `npm run generate-map -w packages/battle-tank -- --image-path generated-maps/map.jpeg --map-json generated-maps/map.json --api-key <key>`
- Benefits: simpler vocabulary for vision LLM (17 vs 54 types), more reliable extraction, theme-agnostic defaults

**Typical workflow:** Generate (fast) → external image gen → Extract (archetype-based) → load in Designer

## Designer UI

**Left Panel (Tools & Palette):**
- **Tools** (always visible): Select, Paint, Erase, Fill, Rect
- **Palette** (visible when map loaded): Ground/Object/Rotation dropdowns — these configure what the Paint tool applies
- **Shortcuts** (visible when map loaded): Keyboard reference (Ctrl+Z, G, Wheel, etc)

Palette is hidden when no map loaded to keep UI clean & focused (Tools only).

**Right Panel (Inspector & Map Details):**
- **Map Info**: Dimensions, "Show Zones" button for strategic zone overlay
- **Map Details**: Terrain & object distribution from MapMetadata
- **Inspector**: Edit selected cell (position, ground, object, rotation, properties)
- **Archetype Profile**: Compact gameplay profile card shows passability (✓/✗), cover bar (█░░░░), sight block range, hazard/speed. Quick visual for tile comparison (e.g., passable vs. blocking paths)
- **Object Properties**: Edit per-cell overrides (isImpassable, isDestructible, clearSpeed, strategicRole) when object is selected

## Designer Workflow: Adding Objects to Maps

**Quick Start (3 steps):**
1. Load a map (Button: Load, accept `.json` + optional `.jpg/.png`)
2. Select Paint tool, pick Terrain + Object from Palette dropdowns, set Rotation
3. Click/drag on canvas to paint

**To add new terrain or object types:**
1. Add entry to `src/config/TerrainData.json` (terrain) or `src/config/ObjectData.json` (object)
2. Rebuild or refresh designer — dropdowns populate automatically from JSON
3. No UI code changes needed (data-driven architecture)

**Advanced editing (Select tool):**
- Click cell to select, edit in Inspector panel (right side)
- Rotate with E (clockwise) / Q (counter-clockwise)
- Toggle properties: Impassable, Destructible, Visual Overlay
- Override clearSpeed & strategicRole per-tile

Palette dropdowns are generated at runtime from JSON configs — new items appear automatically without code changes.

## Two-Layer Terrain & Object System

### Generation Layer (54 types)
**Source:** `TerrainData.json` (26 entries) + `ObjectData.json` (28 entries)
- Full variety for creative map generation (LLM uses all types)
- Each entry includes `archetypeId` field pointing to gameplay archetype
- Used by: map generator, theme presets, landmarks, designer editing

### Gameplay Layer (17 types)
**Source:** `TerrainArchetypes.json` (9 archetypes) + `ObjectArchetypes.json` (8 archetypes)
- Consolidated gameplay mechanics (canonical stats for each type)
- Used by: movement system, combat system, vision system, **extract mode mockups**
- Each archetype has distinct gameplay values (clearSpeed, coverPercent, sightBlockRange, dotPerTurn, isImpassable)
- New fields: `symbol` (single-char for mockup representation), `defaultType` (default generation type for extract mode)

**Resolution:** Runtime lookup `TerrainDatabase.getTerrainGameplayStats(name)` / `ObjectDatabase.getObjectGameplayStats(name)` returns archetype stats via `archetypeId` mapping.

**Designer Usage:**
- **UI dropdowns:** Pick from generation types (TerrainData/ObjectData) for creative flexibility
- **Archetype profiles:** Display canonical gameplay stats via `ArchetypeDatabase` lookups — enables quick comparison (passable vs. blocking, cover values, sight blocks, hazards)
- **When programmatically creating objects:** Reference archetypes only; generation types are variants for map generation

**Archetype Groupings:**

| Terrain Archetype | Gameplay Role | Generation Types (examples) |
|---|---|---|
| `fast_ground` | High-traction mobility | hardpan, grass, asphalt, dirt_road, salt_flat, urban_pavement |
| `loose_ground` | Soft terrain, reduced traction | loose_sand, beach_sand, gravel, shoreline |
| `light_cover` | Moderate concealment | scrub_vegetation, forest_floor, canyon_floor, oasis_turf |
| `heavy_cover` | Dense concealment | jungle_underbrush, rocky_outcrop |
| `slope` | Elevation gameplay | dune_slope, hilly_ground, hill_slope |
| `ice_slide` | Slippery surface | ice_snow_field |
| `bog` | Slow hazard terrain | muddy_sinkhole, marsh_swamp |
| `deep_hazard` | Extreme hazard | deep_snow, rapids_drop |
| `tactical` | Special positions | depression, ridge_crest, saddle_pass |

| Object Archetype | Gameplay Role | Generation Types (examples) |
|---|---|---|
| `wall` | Full-block impassable | water_channel, cliff_face, concrete_barrier, rock_wall, canyon_wall, etc. |
| `boulder` | Large natural formation | boulder_formation |
| `heavy_fortification` | Reinforced strongpoint | concrete_bunker |
| `light_fortification` | Field fortification | sandbag_bunker, container_bunker |
| `wreckage` | Passable battlefield debris | tank_hull_wreckage, ruined_structure, helicopter_wreckage |
| `container` | Stackable storage | shipping_container |
| `small_obstacle` | Low-cover tactical | barrel, ammo_crate, dynamite_box |
| `tall_structure` | Tall visual landmark | oil_derrick |

## Data-Driven Object & Terrain System

**Single source of truth:** `TerrainData.json` and `ObjectData.json` are the ONLY canonical references for tile/object types.
- Any `TileId` or `ObjectId` not present in those files must not exist in enums, registries, or consuming code
- `OBJECT_DEFS` is generated at load time by `buildObjectDefsMap()` in `ObjectDatabase.ts` — no manual sync needed
- `CHAR_MAP` is generated at load time by `buildCharMap()` in `TileRegistry.ts` from both JSON files
- **Designer dropdowns are dynamically populated** from `TerrainData.json` (terrain) and `ObjectData.json` (objects) — new entries appear automatically
- **Archetype resolution:** Each terrain/object maps to gameplay archetype via `archetypeId` field; stats loaded from `TerrainArchetypes.json` / `ObjectArchetypes.json`

**Sprite rendering:**
- `spriteAvailable: true` → object gets sprite rendering (e.g., `tank_hull_wreckage`)
- `spriteAvailable: false/absent` → no sprite rendered; prebaked background image handles visual
- `damageStates` / `environmentVariants` → generate sprite variant keys (e.g., `barrel_blue`, `concrete_bunker_perfect`)

**Asset loading flow:**
1. **Game** (`src/main.ts`): Loops `getAllObjects()`, loads sprites for `spriteAvailable` objects (with variant support)
2. **Designer** (`tools/designer/main.ts:buildAssetManifest()`): Same loop, same variant logic
3. **TilemapRenderer.ts** (`drawObjectLayer()`): Uses `OBJECT_DEFS[objectId].spriteKey` to fetch image from AssetManager

## Conventions
- TypeScript strict mode, ES2020 target, ESM (`"type": "module"`)
- Vite for bundling, Vitest for tests
- All imports use `.js` extension (ESM resolution)
- All terrain/object lookups via `TerrainDatabase` & `ObjectDatabase` (no hardcoded symbols)
- All object sprite references use ObjectId enum values, not string literals (e.g., `ObjectId.NONE`, not `'none'`)
