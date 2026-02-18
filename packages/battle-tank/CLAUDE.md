# @speedai/battle-tank

Top-down tank game. Tilemap world, composite tank sprites, WASD + mouse controls.

## Commands
```
npm run dev        # vite dev server (port 3003)
npm run build      # vite build
npm run preview    # vite preview
npm run typecheck  # tsc --noEmit
```

## Architecture

```
src/
├── main.ts              Entry point: engine init, asset loading, game loop
├── config/
│   ├── EngineConfig.ts  Canvas 960x540, FPS, entity cap
│   ├── MapConfig.ts     Tile size (64px)
│   └── TankConfig.ts    TankDef interface + PLAYER_TANK preset
├── tilemap/
│   ├── types.ts         TileId, ObjectId, TileCell, MapData
│   ├── TileRegistry.ts  TILE_DEFS, OBJECT_DEFS, CHAR_MAP (data tables)
│   ├── TilemapLoader.ts parseTilemap(ascii, tileSize) → GridModel<TileCell> + MapData
│   └── TilemapRenderer.ts drawTilemap() — camera-culled, two-layer (ground + objects)
├── tank/
│   ├── TankParts.ts     TankPartsComponent interface + TANK_PARTS component name
│   ├── TankAssembler.ts createTank(em, x, y, def, tags) → entity ID
│   └── TankRenderer.ts  drawTanks() — tracks → hull → turret, per-part rotation
├── systems/
│   ├── TankMovementSystem.ts WASD → hull rotation + speed; mouse → turret angle
│   └── TileCollisionSystem.ts Separate-axis tile collision (circle vs grid)
├── scenes/
│   └── GameplayScene.ts  Orchestrates tilemap + tank + camera + input
└── maps/
    └── survival_01.ts    24x18 ASCII map
```

## Key Patterns

- **No magic numbers**: All constants in `config/`. Tile behavior in `TileRegistry.ts` data tables.
- **Composite entity**: Tank is one entity with Position + Velocity + TankParts. Renderer draws parts independently.
- **Scene-orchestrated**: Systems are stateless functions called from `GameplayScene.update()`, not engine-registered.
- **Camera-aware**: `CameraSystem` follows player. Tilemap renders only visible tiles. Tank renders in world space.
- **Angle convention**: 0 = up (north), positive = clockwise. `vx = sin(angle) * speed`, `vy = -cos(angle) * speed`.
- **Tile collision**: Circle collider, separate X/Y axis resolution. Walkability from `OBJECT_DEFS` lookup.
- **ComponentData casting**: Engine's `ComponentData` requires `[key: string]: unknown`. Use `as unknown as ComponentData` for custom components.

## Assets

Individual PNGs in `public/sprites/` (no atlas yet — deferred to Phase 2 when sprite count grows).

Source: craftpix packs in `~/Downloads/craftpix/2d_tank_topdown/`:
- Pack 1 (tanks): hulls 256x256, tracks 42x246, guns 94x212
- Pack 4 (tiles): ground 256x256, blocks 256x128, hedges/containers 256x256

All scaled via `drawImage()` to config dimensions (hull 56px, tile 64px).

## Engine Usage

Uses from `@speedai/game-engine`: Engine, CanvasRenderer, UnifiedInput, AssetManager, SceneManager, CameraSystem, GridModel, ComponentFactory.

Does NOT use: SimplePhysics, CollisionSystem, TweenSystem, ObjectPoolSystem (will use in later phases).
