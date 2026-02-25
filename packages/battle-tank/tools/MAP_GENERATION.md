# Map Generation Module

LLM-based map generator for Battle Tank using Claude AI to create tactical, grid-based combat maps.

## Quick Start

```bash
npm run generate-map -w packages/battle-tank -- --prompt "desert siege, 24x18, 4 spawns" --api-key YOUR_API_KEY
```

**Output:** Generates `.json`, `.txt` (mockup), `_symbols.json`, and `_image_prompt.txt` in `tools/generated-maps/`.

## Usage

```bash
npm run generate-map -- --prompt "<description>" [--api-key <key>] [--name <filename>] [--output-dir <path>]
```

### Options
- `--prompt` (required): Map design brief (e.g., "dense urban 12x12 with 2 spawns")
- `--api-key`: Anthropic API key (defaults to `ANTHROPIC_API_KEY` env or `.env`)
- `--name`: Output filename (auto-generated from prompt if omitted)
- `--output-dir`: Save location (default: `tools/generated-maps/`)

## Core Concepts

### Themes
Auto-detected from prompt. Preset configurations:
- **north_africa**: Desert, sand, hardpan, rocky outcrops
- **eastern_front**: Snow, forest, gravel, grass
- **pacific**: Jungle, beach, marsh, vegetation
- **urban**: Asphalt, concrete, ruins
- **mixed**: No restrictions, balanced categories

### Terrain Categories
Group by tactical role for balanced design:
- **OPEN**: Loose_sand, grass_plains, beach_sand → Maneuvers, open combat
- **MOBILITY**: Asphalt, dirt_road, salt_flat → Sniper lanes, assaults
- **DEFENSIVE**: Rocky_outcrop, jungle, forest → Hull-down, ambushes
- **HAZARD**: Muddy_sinkhole, marsh, deep_snow → Bottlenecks (sparse)
- **TRANSITION**: Gravel, dune_slope, hill_slope → Elevation, mixed engagement

### Strategic Features
LLM identifies and marks:
- **Choke Points**: Narrow passages (≤3 cells wide)
- **Sniper Lanes**: Unobstructed sight lines (≥6 cells)
- **Cover Clusters**: Dense defensive areas (value ≥60)
- **Hazard Zones**: High DoT terrain (≥5 damage/turn)

## Configuration

**File:** `MapGenConfig.ts`

Key settings:
- **llm.model**: Claude Sonnet 4.5 (4000 token max)
- **validation.minWalkablePercent**: 40% (playable area)
- **design.minSpawnDistance**: 8 cells (spawn separation)
- **design.maxTerrainVariety**: 5 terrain types max
- **output.outputDir**: `tools/generated-maps/`

Category density targets (% of walkable area):
```
MOBILITY:  15–35% (high priority)
DEFENSIVE: 15–35%
OPEN:      25–45% (highest priority)
HAZARD:     2–12% (low priority)
TRANSITION: 8–25%
```

## Map Data Format

Generated `map.json` contains:
```json
{
  "mockup": "Text grid visualization: newline-separated rows, space-separated symbols per row (e.g., '. . G 1'). Symbols = terrain + objects from CHAR_MAP.",
  "rows": 20,
  "cols": 24,
  "spawnPoints": [{"r": 2, "c": 3}],        // Player spawn (1)
  "enemySpawns": [{"r": 17, "c": 3}, ...], // Enemy spawns (2–4)
  "obstacles": [{"r": 5, "c": 8, "type": "C", "rotation": 0}],  // type = mockup symbol (e.g. "C" for shipping_container); used to override/refine mockup placement
  "chokePoints": [{"r": 10, "c": 12, "width": 2}],
  "sniperLanes": [{"r1": 0, "c1": 5, "r2": 15, "c2": 5}],
  "coverClusters": [{"r": 8, "c": 10, "value": 75}],
  "hazardZones": [{"r": 12, "c": 14, "severity": 8}],
  "metadata": {
    "theme": "north_africa",
    "prompt": "Original user prompt",
    "designIntention": "Playstyle summary",
    "mapSize": {"rows": 20, "cols": 24},
    "walkablePercent": 55,
    "categoryDistribution": {"MOBILITY": 28, "DEFENSIVE": 20, "OPEN": 35, "TRANSITION": 15, "HAZARD": 2},
    "playstyleProfile": "Aggressive open-field tactics with sniper lanes"
  }
}
```

**Mockup Parsing:** The generator now extracts **both terrain and object symbols** from the mockup grid. Terrain symbols populate ground tiles; object symbols create obstacles. The `obstacles` array provides explicit placement/rotation overrides. The designer parser (`DesignerActions.ts` + `populate GridFromMockup`) resolves all symbols to TileIds/ObjectIds via CHAR_MAP lookup.

## Visual Overlays

Generated maps contain **structural obstacles only** (terrain-defining objects). Visual overlay objects (decorative/passable items like ammo crates, barrels, wreckage) are placed separately via the Designer tool or secondary decoration pass, since they require visible ground texture underneath.

## Symbol Reference

**Terrain** (ground layer, space-separated in mockup):
- `.` = loose_sand
- `P` = hardpan
- `G` = gravel
- `A` = asphalt
- `S` = salt_flat
- `n` = deep_snow
- `f` = forest_floor
- `j` = jungle_underbrush
- `w` = marsh_swamp
- (See `_symbols.json` for full legend)

**Objects** (structural obstacles, used in obstacles `type` field):
- `R` = boulder_formation
- `C` = shipping_container
- `W` = water_channel
- `F` = concrete_barrier
- `B` = concrete_bunker
- `c` = container_bunker
- `s` = sandbag_bunker
- `E` = escarpment
- `M` = moraine_ridge
- `K` = karst_outcrop
- `I` = ice_wall
- `Y` = canyon_wall
- `Z` = frozen_lake_edge
- `Q` = quarry_pit_wall
- `#` = rock_wall
- `_` = anti_tank_ditch
- `/` = mountainside
- `p` = railroad_embankment
- `~` = deep_wadi
- `X` = cliff_face
- (See `_symbols.json` for full legend)

**Visual Overlay Objects** (decoration overlays, placed post-generation on any terrain):
- `T` = tank_hull_wreckage (destructible)
- `H` = helicopter_wreckage (destructible)
- `D` = oil_derrick (destructible)
- `U` = ruined_structure (destructible)
- `A` = ammo_crate
- `v` = barrel (multi-variant: blue/red/yellow)
- `*` = dynamite_box (destructible)

**Spawn Markers** (meta):
- `1` = Player spawn
- `2` = Enemy spawn

## Validation

Maps are validated before saving:
- ✓ All spawns on walkable terrain
- ✓ Connectivity from player to all enemy spawns (BFS)
- ✓ Min 40% walkable cells
- ✓ Max 30% object density
- ⚠ Warnings for low cover or excessive terrain variety

Validation failures prevent save; warnings allow generation with feedback.

## Workflow

1. **Prompt → Theme Detection**: Keywords (desert, urban, jungle, snow) auto-identify theme
2. **Schema Building**: Terrain/object legends + category targets injected into system prompt
3. **LLM Generation**: Claude generates JSON mockup + strategic features
4. **Parsing**: Extract JSON, validate structure; resolve obstacle symbols → ObjectIds via CHAR_MAP
5. **Validation**: Check walkability, connectivity, density
6. **Enrichment**: Compute stats (category distribution, playstyle profile, sight control)
7. **Output**: Save `.json`, `.txt` mockup, symbol reference, and image prompt

## Customization

### Adjust Theme Presets
Edit `MapGenConfig.ts` `themes` object:
- Change `forbiddenSymbols` to restrict terrain usage
- Modify `categoryTargets` to emphasize roles
- Add new theme with custom `terrainSymbols`

### Change Design Constraints
Edit `design` in `MapGenConfig.ts`:
- `minSpawnDistance`: Increase for larger separation
- `targetCoverDensity`: Increase for more defensive play
- `maxTerrainVariety`: Limit unique terrain types

### Modify LLM Parameters
Edit `llm` in `MapGenConfig.ts`:
- `temperature`: 0–1 (higher = more creative, lower = consistent)
- `maxTokens`: Increase for larger/complex maps

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No API key" | Set `ANTHROPIC_API_KEY` env var or use `--api-key` |
| Validation fails | Check error location; may need simpler prompt or larger map |
| Low walkable % | Ask for more open terrain in prompt |
| Boring layout | Increase temperature (default 0.7) in config |

## VFX & Effects

Destruction of generated obstacles triggers explosion animations automatically:
- **Tile destruction** → Plasma explosion (generic, destructible obstacles)
- **Obstacle destruction events** → Sprite animation + particle effects
- **Explosion types** (bomb/laser/plasma/nuclear) auto-selected by damage type

No map configuration needed — VFX respond to game events (tile:destroyed, splash:detonated, entity:killed).

## Files
- `generate-map.ts` — CLI entry point
- `MapGenConfig.ts` — Configuration & themes
- `MapValidator.ts` — Validation logic
- `schema/SchemaLoader.ts` — Tile schema builder
- `generated-maps/` — Output directory
