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
- Generate Map (LLM): `npm run generate-map -w packages/battle-tank -- --prompt "<goals>" --api-key <key>`

**Demo (Arcade Landing Page):**
- Dev: `npm run dev -w packages/demo`
- Build: `npm run build -w packages/demo`

## Map Details Level

**MapMetadata** (`src/tilemap/types.ts`) captures terrain/object distributions, strategic zones, and LLM hints:
- `terrainCoverage` — breakdown by terrain name with counts & percentages
- `objectsByCategory` — object distribution by ObjectDatabase category
- `strategicZones` — auto-detected: chokePoints, sniperLanes, ambushZones, hazardZones
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

**Map Generation** (`generate-map.ts`):
- Generates image prompt with symbol legend (maps symbol → terrain/object name) for image generator context
- Outputs: mockup (text grid), JSON (map data), symbol reference, image prompt

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

## Data-Driven Object & Terrain System

**Single source of truth:** `TerrainData.json` and `ObjectData.json` are the ONLY canonical references for tile/object types.
- Any `TileId` or `ObjectId` not present in those files must not exist in enums, registries, or consuming code
- `OBJECT_DEFS` is generated at load time by `buildObjectDefsMap()` in `ObjectDatabase.ts` — no manual sync needed
- `CHAR_MAP` is generated at load time by `buildCharMap()` in `TileRegistry.ts` from both JSON files
- **Designer dropdowns are dynamically populated** from `TerrainData.json` (terrain) and `ObjectData.json` (objects) — new entries appear automatically

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
