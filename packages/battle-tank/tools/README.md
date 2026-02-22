# Battle Tank Map Designer Tools

Tile-based map tools for designers: schema export, LLM generation, and visual editor.

## 1. Tile Schema

**Live schema generation** from TileRegistry:
```ts
import { buildTileSchema } from './schema/SchemaLoader.js';
const schema = buildTileSchema();
```

Schema includes: tiles, objects, decors, charMap, constraints (no drift, always current).

## 2. LLM Map Generator

Generate maps using Claude:
```bash
npm run generate-map -- \
  --prompt "winter fortress, 20x20, quad symmetry, 4 spawns" \
  --api-key <ANTHROPIC_API_KEY>
```

Output: `generated-maps/<name>.json` + `.mockup.txt`

**Features**:
- Schema-driven prompts (ensures valid tile IDs)
- Post-generation validation (spawn connectivity, density checks)
- ASCII mockup preview
- Configurable via `MapGenConfig.ts`

## 3. Designer Page

**Launch**:
```bash
npm run designer
```

Navigate to http://localhost:5174

**Workflow**:
1. **Load**: Upload `.json` map or select from generated maps
2. **Edit**: Select tool (select/paint/erase/fill/rect) → modify tiles
3. **Validate**: Auto-validates connectivity, density, symmetry
4. **Save**: Exports `.json` (auto-updates on save)
5. **Export**: Generate `.ts` file for game

**Tools**:
- **Select** (◉): Click tile → inspect/edit individual cell
- **Paint** (🖌): Drag to apply current palette (ground + object)
- **Erase** (⌫): Drag to clear objects (ground → grass)
- **Fill** (⬚): Flood-fill similar ground tiles
- **Rect** (▭): Drag to apply to rectangular region

**Keyboard Shortcuts**:
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Ctrl+S`: Save
- `G`: Toggle grid overlay
- `Mid-Drag`: Pan camera
- `Wheel`: Zoom

**Inspector Panel**:
- Shows selected tile position
- Ground dropdown (TileId enum)
- Object dropdown (ObjectId enum) + rotation
- Decors multi-select
- Validation status

## Architecture

**No magic numbers**: All sizes from `MapConfig.tileSize`, counts from `MapGenConfig`

**No hard-coded states**: Uses `TileId`/`ObjectId`/`DecorId` enums

**Atomic operations**: Multi-tile objects placed/cleared atomically (no partial states)

**Undo/redo**: 50-step history stack, grid deep-cloned per snapshot

**WYSIWYG**: Designer uses game's `TilemapRenderer` (1:1 preview)

**Validation**: Same `MapValidator` used by LLM generator and designer

## Files

```
tools/
├── schema/
│   ├── TileSchema.ts          # Schema type definitions
│   └── SchemaLoader.ts        # buildTileSchema()
├── designer/
│   ├── index.html             # UI layout
│   ├── DesignerState.ts       # State model + types
│   ├── DesignerActions.ts     # Mutations (atomic)
│   ├── DesignerRenderer.ts    # Canvas rendering
│   ├── main.ts                # Init + event loop
│   └── vite.config.ts         # Vite config for designer
├── generate-map.ts            # LLM CLI
├── MapGenConfig.ts            # LLM parameters
├── MapValidator.ts            # Validation logic
└── generated-maps/            # LLM outputs
```

## Configuration

**`MapGenConfig.ts`**:
- `llm.model`: Claude model ID
- `llm.temperature`: Creativity (0.7)
- `validation.minWalkablePercent`: Min open space (0.4)
- `validation.maxObjectDensity`: Max blocking objects (0.3)
- `validation.requireSpawnConnectivity`: Ensure reachable spawns

**`TileRegistry.ts`**:
- Tile/object/decor definitions (visual + gameplay)
- Char map for ASCII mockups
- Multi-tile gridSpan, orientations

## Validation Rules

**Errors** (block save/export):
- Invalid tile/object IDs
- Spawn points on unwalkable terrain
- Unreachable enemy spawns (BFS from player spawn)

**Warnings** (allow save):
- Low walkable area (< 40%)
- High object density (> 30%)

## Future Enhancements

- Flood fill tool implementation
- Rectangle selection tool
- Pre-rendered image overlay
- Item placement layer
- Export to multiple formats (JSON runtime loading)
- Local LLM support (Ollama)
