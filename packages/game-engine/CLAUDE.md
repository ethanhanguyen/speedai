# @speedai/game-engine

ECS game engine. Canvas 2D. Zero runtime deps. Optional peers: `matter-js`, `howler`.

## Commands
```
npm run build          # vite build + tsc declarations
npm run test           # vitest run
npm run test:watch     # vitest
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src/
```

## Architecture

**ECS**: Entity (numeric ID) ← Components (data structs) ← Systems (logic per frame)

```
src/
├── core/        Engine, EntityManager, System, EventEmitter, ComponentType/Factory/Pool, types
├── adapters/    CanvasRenderer, SimplePhysics, UnifiedInput, HowlerAdapter
├── systems/     TweenSystem, ScoreSystem, LivesSystem, TimerSystem, ObjectPoolSystem, CameraSystem, CollisionSystem
├── scene/       Scene (base class), SceneManager (stack-based)
├── assets/      AssetManager (image/audio/json/atlas)
├── ui/          Button, ProgressBar, Modal, Toast, StarRating, Text, VirtualJoystick, VirtualButton, DPad (all canvas-drawn)
├── effects/     ScreenShake, SlowMotion, ParticleBurst, Flash, Juice (composite)
├── grid/        GridModel<T>, GridMatcher<T>, GridGravity, GridInput<T>, GridRenderer<T>
├── utils/       WeightedPicker<T> (weighted random with history tracking), ObjectiveTracker (per-level objective progress)
├── persistence/ ISaveManager, LocalStorageAdapter, CloudSaveAdapter
├── analytics/   EventBus, PerformanceMonitor, IAnalytics
├── social/      LeaderboardManager, AchievementManager, ChallengeManager, ProfileManager, SharingManager
└── index.ts     Re-exports everything
```

## Key Patterns

- **Components**: Pure data. Created via `ComponentFactory.position(x, y)`, `ComponentFactory.sprite(key, w, h)`, etc.
- **ComponentType**: String enum — `Position`, `Velocity`, `Sprite`, `PhysicsBody`, `Tween`, `Score`, `Health`, `Timer`, `Sound`, `Tag`
- **Entity lifecycle**: `scene.createEntity()` → `entityManager.addComponent(id, type, data)` → `scene.destroyEntity(id)`
- **Systems**: Extend `System`, implement `update(dt)`, registered via `engine.addSystem()`
- **Scenes**: Extend `Scene`, implement `init()`, `update(dt)`, `render(alpha)`. Managed via `SceneManager.switchTo()` / `push()` / `pop()`
- **Adapters**: All swappable via interfaces: `IRenderer`, `IPhysicsEngine`, `ISoundManager`, `IInputManager`, `ISaveManager`, `ISocialProvider`
- **Events**: `EventEmitter` pub/sub on Engine, Scene, and Systems

## Build Output
- ESM: `dist/game-engine.es.js`
- CJS: `dist/game-engine.cjs.js`
- Types: `dist/index.d.ts`
- Tree-shakeable (`sideEffects: false`)

## Quick Reference

### Core Exports
- `Engine(config)` — Game loop, lifecycle, error handling
- `Scene` — Base class: `init()`, `update(dt)`, `render(alpha)`, `destroy()`
- `EntityManager` — `createEntity()`, `destroy(id)`, `addComponent(id, type, data)`, `getComponent(id, type)`, `removeComponent(id, type)`, `query(...types)`
- `ComponentFactory` — `position(x,y)`, `velocity(x,y)`, `sprite(key,w,h)`, `physicsBody(config)`, `sound(key)`, `tag(name)`, `tween(config)`, `score(points)`, `health(current,max)`, `timer(name,duration)`
- `TweenSystem` — `tweenEntity(id, componentType, {target, from?, duration, easing?, onComplete?})`
- `Easing` — `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack`, `easeInBack`, `easeOutElastic`, `easeOutBounce`

### Grid Toolkit (match-3, puzzle, tower defense)
- `GridModel<T>(rows, cols, cellSize, cellGap)` — Generic 2D grid
  - `get(r,c)`, `set(r,c,val)`, `clear(r,c)`, `fill(fn)`, `forEach(fn)`, `map(fn)`
  - `screenToGrid(x,y,offsetX,offsetY)`, `gridToScreen(r,c,offsetX,offsetY)`
  - `isValid(r,c)`, `getNeighbors(r,c,direction)`, `adjacentTo(a,b,direction)`
  - `for (const [r, c, cell] of grid)` — iterator support
- `GridMatcher<T>(config)` — Pattern detection (line/L/T/cross)
  - `detectMatches(grid)` → `Match<T>[]` with `{pattern, positions, cells, metadata}`
  - Config: `minMatchLength`, `directions: ['horizontal'|'vertical'|'diagonal']`, `patterns: PatternRule<T>[]`
  - Factory: `GridMatcher.colorMatchPatterns(getColor, isMatchable)` for simple color matching
- `GridGravity` — Static helpers for gravity/refill
  - `compact(grid, direction)` → `FallMove[]` with `{fromR, fromC, toR, toC}`
  - `refill(grid, generator, direction)` → `RefillEntry[]` with `{r, c, spawnOffset}`
  - `findEmptyPositions(grid)` → `{r,c}[]`
- `GridInput<T>(input, grid, config)` — Grid-aware input wrapper
  - `onCellTap(callback)`, `onCellSwipe(callback)`, `onCellDrag(callback)`
  - `setSelectedCell(r,c)`, `clearSelection()`, `isAdjacent(r1,c1,r2,c2)`
  - Config: `offsetX/Y`, `requireAdjacent`
- `GridRenderer<T>(config)` — Base grid renderer
  - `drawCellBackgrounds(ctx, grid)`, `drawSelection(ctx, grid, r, c, pulse)`
  - `drawDebugOverlay(ctx, grid)`, `drawAllCells(ctx, grid)`
  - Override `drawCell(ctx, grid, r, c, cell)` for custom cell rendering
  - Config: `cellBackground{color,alpha,borderRadius}`, `selection{color,lineWidth,padding,pulseSpeed}`, `debug{enabled,showRowCol}`
- `WeightedPicker<T>()` — Weighted random selection
  - `pick(items, weightFn)`, `pickN(items, n, weightFn)`, `withHistory(maxHistory)`
- `ObjectiveTracker` — Per-level objective progress tracking
  - `add({id, target})`, `increment(id, amount?)`, `isComplete(id)`, `allComplete()`
  - `getProgress(id)` → 0–1, `get(id)` → `ObjectiveState`, `getAll()` → `ObjectiveState[]`
  - `reset()` (zero all), `clear()` (remove all)
- `NeighborDirection` — Enum: `FOUR_WAY`, `EIGHT_WAY`, `HEX`

### Systems
- `ScoreSystem(config)` — `getScore()`, `addPoints(n)`, `resetCombo()`, config: `basePoints`, `comboMultiplier`, `comboTimeout`
- `LivesSystem(config)` — `getLives()`, `damage()`, `heal()`, `isDead()`, config: `startingLives`, `maxLives`, `regenEnabled`, `regenInterval`
- `TimerSystem` — `start(name, duration, onComplete?)`, `pause(name)`, `resume(name)`, `getRemainingTime(name)`, `isRunning(name)`
- `CollisionSystem` — `onCollision(entityA, entityB, callback)`, emits `CollisionEvent`
- `CameraSystem(config)` — `follow(entityId)`, `shake(intensity, duration)`, `setZoom(scale)`, config: `followTarget`, `smoothing`, `bounds`
- `ObjectPoolSystem(config)` — `spawn(poolName, componentData)`, `despawn(entityId)`, config: `pools: [{name, maxSize, prefab}]`

### UI (Canvas-rendered)
- `Button(config)` — `isHovered`, `isPressed`, `onClick(fn)`, `draw(ctx)`
- `ProgressBar(config)` — `value` (0–1), `fillColor`, `draw(ctx)`
- `Toast(config)` — `show(message, duration)`, `draw(ctx,w,h)`
- `VirtualJoystick(config)` — `getVector()`, `draw(ctx)`, supports multi-touch
- `VirtualButton(config)` — `isPressed`, `draw(ctx)`, multi-touch
- `DPad(config)` — `getDirection()` returns `DPadDirection`, multi-touch for diagonals

### Effects
- `ScreenShake` — `trigger(intensity, duration)`, `apply(ctx)`, `update(dt)`
- `ParticleBurst` — `emit({x,y,count,speed,lifetime,size,colors?})`, `draw(ctx)`, pooled
- `Flash` — `trigger(color, duration)`, `draw(ctx,w,h)`
- `SlowMotion` — `activate(scale, duration)`, `getTimeScale()`

### EventBus
- `eventBus.fire(name, data)`, `eventBus.on(name, callback)`
- Decouples game logic from presentation (shake/particles/audio)
- Event-driven architecture for effects and analytics

### Input
- `UnifiedInput` — `getPointer()` → `{x,y,down}`, `getKey(code)`, `onGesture(type, callback)`
- Gestures: `swipe`, `pinch`, `rotate`, `longpress`

### Assets
- `AssetManager` — `loadAll(entries)`, `getImage(key)`, `getAudio(key)`, `getJSON(key)`, `on('progress', fn)`

## Code Style
- Strict TS: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- All imports use `.js` extension
- No default exports — named exports only
- Interfaces prefixed with `I` (IRenderer, ISaveManager, etc.)
- Config types suffixed with `Config` (ScoreConfig, CameraConfig, etc.)
