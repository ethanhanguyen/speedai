# Battle Tank — Progress

## Phase 1: Tank on Map — COMPLETE

**Gate**: Tank drives on tiled map. Hull rotates with WASD. Turret follows mouse. Camera follows.

### What's Built

| File | Purpose |
|------|---------|
| `config/EngineConfig.ts` | Canvas 960x540, 60 FPS, 200 max entities |
| `config/MapConfig.ts` | 64px tile size |
| `config/TankConfig.ts` | `TankDef` interface + `PLAYER_TANK` (Hull_01 + Track_1 + Gun_01) |
| `tilemap/types.ts` | `TileId` (3), `ObjectId` (5), `TileCell`, `MapData` |
| `tilemap/TileRegistry.ts` | `TILE_DEFS`, `OBJECT_DEFS` (walkable/destructible/hp), `CHAR_MAP` |
| `tilemap/TilemapLoader.ts` | `parseTilemap()`: ASCII → `GridModel<TileCell>` + spawn points |
| `tilemap/TilemapRenderer.ts` | `drawTilemap()`: camera-culled two-layer rendering |
| `tank/TankParts.ts` | `TankPartsComponent`: visual + state + movement params |
| `tank/TankAssembler.ts` | `createTank()`: Position + Velocity + TankParts + Tag |
| `tank/TankRenderer.ts` | `drawTanks()`: tracks → hull → turret with independent rotations |
| `systems/TankMovementSystem.ts` | WASD drive + mouse turret aim, acceleration/deceleration |
| `systems/TileCollisionSystem.ts` | Circle-vs-tile, separate X/Y axis resolution |
| `scenes/GameplayScene.ts` | Orchestrates all: tilemap, tank, camera, input, rendering |
| `maps/survival_01.ts` | 24x18 ASCII map with walls, blocks, hedges, containers, dirt/stone |

### Decisions Made

- **Individual PNGs** (not atlas) — sprite count is ~10. Atlas deferred to Phase 2.
- **Scene-orchestrated systems** — stateless functions, not engine-registered Systems. Matches ball-crush pattern.
- **Circle collider** for tanks — rotation-independent, simpler than rotated AABB.
- **Separate-axis collision** — allows wall sliding (X and Y resolved independently).
- **0=up angle convention** — standard for top-down, matches sprite orientation.
- **No engine modifications** — everything in game package. Engine is sufficient.

### Engine Systems Used

| System | How |
|--------|-----|
| `CameraSystem` | Follow player, world bounds clamping, screen shake ready |
| `GridModel<T>` | Tilemap storage + coordinate conversion |
| `AssetManager` | Individual PNG loading |
| `ComponentFactory` | Position/Velocity creation |
| `UnifiedInput` | Keyboard polling + pointer position |
| `SceneManager` | Scene lifecycle |

### Config Surface

| Config | Controls |
|--------|----------|
| `EngineConfig.canvas.width/height` | Viewport size (960x540) |
| `MapConfig.tileSize` | Tile pixel size (64) |
| `TankConfig.PLAYER_TANK.movement.*` | Speed, acceleration, turn rate |
| `TankConfig.PLAYER_TANK.hull/tracks/turret` | Sprite keys + display dimensions |
| `TankConfig.PLAYER_TANK.collisionRadius` | Circle collider size |
| `TileRegistry.OBJECT_DEFS` | Per-object walkable/destructible/hp |
| `TileRegistry.CHAR_MAP` | ASCII char → tile definition |

### Asset Inventory

**Loaded sprites** (keys → files):
- `hull-01` → `Hull_01.png` (256x256, displayed 56x56)
- `track-1a` → `Track_1_A.png` (42x246, displayed 9x54)
- `gun-01` → `Gun_01.png` (94x212, displayed 20x46)
- `ground-01a` → `Ground_Tile_01_A.png` (grass)
- `ground-01b` → `Ground_Tile_01_B.png` (stone)
- `ground-02a` → `Ground_Tile_02_A.png` (dirt)
- `block-a01` → `Block_A_01.png`, `block-b01` → `Block_B_01.png`
- `hedge-a01` → `Hedge_A_01.png`
- `container-a` → `Container_A.png`

### Phase 2 Prep — Hooks Already In Place

- `OBJECT_DEFS` already has `destructible` and `hp` fields → ready for `DestructibleSystem`
- `TankAssembler.createTank()` accepts any `TankDef` + tags → reusable for enemies (Phase 3)
- `TileRegistry.CHAR_MAP` extensible → add new tile types without code changes
- `ObjectPoolSystem` not yet used → add for projectiles in Phase 2
- `ScreenShake`, `ParticleBurst`, `SlowMotion` available in engine → wire to damage events
- `FrameAnimator` in engine → use for explosion sequences (Pack 3 sprites)
- Camera `shake()` method ready → call on fire/impact
- `EventBus` available → decouple damage events from VFX (Phase 2 pattern)
