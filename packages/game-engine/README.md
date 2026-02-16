# @aspect/game-engine

Zero-dependency game engine with ECS architecture and swappable backends. Target: 65%+ code reuse, 65%+ faster dev across game types.

## Install

```bash
npm install @speedai/game-engine
```

Optional peer dependencies:

```bash
npm install matter-js  # Physics (MatterAdapter)
npm install howler      # Audio (HowlerAdapter)
```

## Features

- **ECS Architecture** — Entity-Component-System for clean separation of data/logic
- **Zero Dependencies** — Core engine has no runtime deps (optional: howler, matter-js)
- **TypeScript** — Full type safety with generics
- **Swappable Backends** — Interface-based: swap renderer/physics/sound/input
- **Mobile-First** — Touch, gestures, virtual controls (joystick, buttons, d-pad)
- **Performance** — Object pooling, sprite batching, fixed timestep
- **Social** — Leaderboards, achievements, challenges, sharing
- **Grid Utilities** — GridModel<T> for match-3/puzzle, WeightedPicker for loot/spawns

## Quick Start

```typescript
import {
  Engine,
  CanvasRenderer,
  UnifiedInput,
  Scene,
  TweenSystem,
  ScoreSystem,
  Easing,
  ComponentType,
  ComponentFactory,
} from '@speedai/game-engine';

const engine = new Engine({
  canvas: '#game',
  width: 800,
  height: 600,
  renderer: new CanvasRenderer(),
  input: new UnifiedInput(),
  debug: true,
});

engine.addSystem(new TweenSystem());
engine.addSystem(new ScoreSystem({ basePoints: 10, comboMultiplier: 1.5 }));

class MyScene extends Scene {
  private renderer!: CanvasRenderer;

  init() {
    this.renderer = engine.renderer as CanvasRenderer;
    const player = this.createEntity();
    this.entityManager.addComponent(player, ComponentType.Position, ComponentFactory.position(400, 300));
    this.entityManager.addComponent(player, ComponentType.Sprite, ComponentFactory.sprite('player', 64, 64));
  }

  update(dt: number) {
    // game logic
  }

  render(_alpha: number) {
    this.renderer.drawRect(0, 0, 800, 600, '#1a1a2e');
  }
}

engine.setScene(new MyScene('gameplay'));
engine.start();
```

## Architecture

```
Entity (ID) ← Components (data) ← Systems (logic)
```

- **Entity**: unique numeric ID (not an object)
- **Component**: pure data structs (Position, Sprite, Velocity, etc.)
- **System**: stateless logic operating on component queries each frame

## Modules

### Core

| Export | Description |
|--------|-------------|
| `Engine` | Game loop (fixed timestep), lifecycle, error handling |
| `EntityManager` | Create/destroy entities, add/remove/query components |
| `System` | Base class for all systems |
| `EventEmitter` | Lightweight pub/sub |
| `ComponentType` | String constants for built-in component types |
| `ComponentFactory` | Factory functions for default component data |
| `ComponentPool<T>` | Object pool to avoid GC pressure |

### Adapters

| Export | Description |
|--------|-------------|
| `CanvasRenderer` | Canvas 2D renderer with sprite batching, atlas support |
| `SimplePhysics` | Lightweight AABB physics (no dependencies) |
| `UnifiedInput` | Keyboard + mouse + touch + gestures |
| `HowlerAdapter` | Sound via Howler.js (peer dep, graceful fallback) |

### Systems

| Export | Description |
|--------|-------------|
| `TweenSystem` | Animations with 12 easing functions |
| `ScoreSystem` | Points, combos, multipliers, high score |
| `LivesSystem` | Hearts/lives with optional time-based regen |
| `TimerSystem` | Named countdown timers with events |
| `ObjectPoolSystem` | Entity recycling via named pools |
| `CameraSystem` | Follow target, smooth movement, shake, zoom |
| `CollisionSystem` | AABB overlap detection with enter/exit events |

### UI Kit

| Export | Description |
|--------|-------------|
| `Button` | Interactive button with hover/press states |
| `ProgressBar` | Horizontal fill bar |
| `Modal` | Overlay dialog |
| `Toast` | Timed notification popups |
| `StarRating` | 1–N star display |
| `Text` | Styled text with shadow support |
| `VirtualJoystick` | Analog stick with dead zone, multi-touch |
| `VirtualButton` | Circular action button (A/B style), multi-touch |
| `DPad` | 4-direction cross pad with diagonal via multi-touch |

### Effects

| Export | Description |
|--------|-------------|
| `ScreenShake` | Decaying random offset |
| `SlowMotion` | Time scale modifier |
| `ParticleBurst` | One-shot particle explosion (pooled) |
| `Flash` | Full-screen color flash |
| `Juice` | Convenience wrapper grouping all effects |

### Grid & Utilities

| Export | Description |
|--------|-------------|
| `GridModel<T>` | Generic 2D grid: get/set/clear/fill/forEach/map, screen↔grid conversion, neighbor queries (4-way/8-way/hex), iterator support |
| `GridMatcher<T>` | Configurable pattern detection (line/L/T/cross), generic matching rules, metadata extraction |
| `GridGravity` | Static helpers: `compact(grid, direction)` returns FallMove[], `refill(grid, generator)` returns RefillEntry[] |
| `GridInput<T>` | Grid-aware input wrapper: onCellTap/Swipe/Drag callbacks, selection state, adjacency validation |
| `GridRenderer<T>` | Base grid renderer: cell backgrounds, selection highlights, debug overlay, override `drawCell()` for custom content |
| `WeightedPicker<T>` | Weighted random selection with `pick(items, weightFn)` / `pickN()`, optional history tracking via `withHistory(maxHistory)` |
| `ObjectiveTracker` | Per-level objective tracking: `add(def)`, `increment(id, amount)`, `allComplete()`, `getAll()` |
| `NeighborDirection` | Enum: FOUR_WAY, EIGHT_WAY, HEX |

### Persistence

| Export | Description |
|--------|-------------|
| `LocalStorageAdapter` | Save/load via localStorage |
| `CloudSaveAdapter` | Cloud sync with local fallback |

### Analytics

| Export | Description |
|--------|-------------|
| `EventBus` | Global game event bus with logging |
| `PerformanceMonitor` | Frame time sampling and jank detection |

### Social

| Export | Description |
|--------|-------------|
| `LeaderboardManager` | Submit scores, fetch rankings (cached) |
| `AchievementManager` | Track/unlock configurable achievements |
| `ChallengeManager` | Daily/weekly/seasonal challenges |
| `ProfileManager` | User profiles with caching |
| `SharingManager` | Share links, clipboard, Web Share API |

## Engine Config

```typescript
const engine = new Engine({
  canvas: '#game',               // HTMLCanvasElement or selector
  width: 800,                    // Viewport width
  height: 600,                   // Viewport height
  renderer: new CanvasRenderer(),
  physics: new SimplePhysics(),  // or null
  sound: new HowlerAdapter(),   // or null
  input: new UnifiedInput(),    // or null
  targetFPS: 60,
  maxEntities: 10_000,
  debug: true,                   // or DebugConfig object
  pauseOnBlur: true,
  autoResize: true,
});
```

## Game Loop

Fixed timestep for deterministic physics, variable timestep for smooth rendering:

```
┌─────────────────────────────────────────┐
│  requestAnimationFrame                  │
│  ├── accumulate frame time              │
│  ├── while (accumulator >= fixedDt)     │
│  │   ├── input.update()                 │
│  │   ├── physics.step(dt)               │
│  │   ├── systems.update(dt)             │
│  │   └── scene.update(dt)               │
│  └── renderer.render(scene, alpha)      │
└─────────────────────────────────────────┘
```

## Easing Functions

Available via `Easing`:

```
linear, easeInQuad, easeOutQuad, easeInOutQuad,
easeInCubic, easeOutCubic, easeInOutCubic,
easeOutBack, easeInBack, easeOutElastic, easeOutBounce
```

## Asset Loading

```typescript
import { AssetManager } from '@aspect/game-engine';

const assets = new AssetManager();
assets.on('progress', (loaded, total) => console.log(`${loaded}/${total}`));

await assets.loadAll([
  { key: 'player', type: 'image', src: '/sprites/player.png' },
  { key: 'music', type: 'audio', src: '/audio/theme.mp3' },
  { key: 'levels', type: 'json', src: '/data/levels.json' },
  { key: 'sprites', type: 'atlas', src: '/sprites/atlas.json' },
]);

const img = assets.getImage('player');
```

## Scene Management

```typescript
import { Scene, SceneManager } from '@aspect/game-engine';

class MenuScene extends Scene {
  init() { /* setup */ }
  update(dt: number) { /* logic */ }
  render(alpha: number) { /* draw */ }
  destroy() { super.destroy(); }
}

const scenes = new SceneManager(engine.entities);
scenes.register(new MenuScene('menu'));
scenes.register(new GameplayScene('gameplay'));

scenes.switchTo('menu');
scenes.switchTo('gameplay');  // destroys menu, inits gameplay
scenes.push('pause');          // overlay, pauses gameplay
scenes.pop();                  // removes pause, resumes gameplay
```

## Social Integration

```typescript
import {
  LeaderboardManager,
  AchievementManager,
  type ISocialProvider,
  type AchievementConfig,
} from '@speedai/game-engine';

// Implement ISocialProvider for your backend (Firebase, Supabase, etc.)
const provider: ISocialProvider = new MyFirebaseProvider(config);

const leaderboards = new LeaderboardManager(provider);
await leaderboards.submit('global', {
  metricType: 'points',
  value: 9500,
  timestamp: Date.now(),
});

const achievements: AchievementConfig[] = [
  { id: 'first_win', name: 'First Win', description: 'Win a game', icon: '🏆',
    condition: { type: 'games_played', value: 1 } },
];
const achManager = new AchievementManager(provider, achievements);
const unlocked = await achManager.check({ score: 9500, gamesPlayed: 1, streakDays: 0, levelCompleted: 1, custom: {} });
```

## Grid-Based Games

Match-3, puzzle, tower defense:

```typescript
import { GridModel, NeighborDirection, WeightedPicker } from '@speedai/game-engine';

// Create grid
const grid = new GridModel<CellData>(8, 8, 64, 4); // rows, cols, cellSize, gap
grid.fill((r, c) => ({ color: 'red', type: 'normal' }));

// Access
grid.set(2, 3, { color: 'blue', type: 'special' });
const cell = grid.get(2, 3);

// Coordinate conversion
const { r, c } = grid.screenToGrid(mouseX, mouseY, boardOffsetX, boardOffsetY);
const { x, y } = grid.gridToScreen(2, 3, boardOffsetX, boardOffsetY);

// Neighbors
const neighbors = grid.getNeighbors(2, 3, NeighborDirection.FOUR_WAY);
const isAdjacent = grid.adjacentTo({r: 2, c: 3}, {r: 2, c: 4});

// Iteration
for (const [r, c, cell] of grid) {
  console.log(`Cell at (${r},${c}):`, cell);
}

// Weighted random (e.g., loot drops, enemy spawns, ball colors)
const picker = new WeightedPicker<string>();
picker.withHistory(3); // penalize recent picks

const colors = ['red', 'blue', 'green'];
const color = picker.pick(colors, c => {
  let weight = 1.0;
  if (c === 'red') weight *= 2.0; // red 2x more likely
  return weight;
});

// Pattern matching (match-3, bejeweled)
import { GridMatcher } from '@speedai/game-engine';

const matcher = new GridMatcher({
  minMatchLength: 3,
  directions: ['horizontal', 'vertical'],
  patterns: GridMatcher.colorMatchPatterns(
    cell => cell?.color,
    cell => cell?.special === 'none'
  ),
});
const matches = matcher.detectMatches(grid);

// Gravity and refill
import { GridGravity } from '@speedai/game-engine';

const fallMoves = GridGravity.compact(grid, 'down');
fallMoves.forEach(m => animateFall(m.fromR, m.fromC, m.toR, m.toC));

const refills = GridGravity.refill(grid, (r, c) => ({ color: randomColor() }));
refills.forEach(e => spawnBall(e.r, e.c, e.spawnOffset));

// Grid input handling
import { GridInput } from '@speedai/game-engine';

const gridInput = new GridInput(unifiedInput, grid, { offsetX: 10, offsetY: 200 });
gridInput.onCellTap(({ r, c }) => console.log('Tapped cell:', r, c));
gridInput.onCellSwipe(({ fromR, fromC, toR, toC }) => swapCells(fromR, fromC, toR, toC));
// Call in update loop: gridInput.update();

// Grid rendering
import { GridRenderer } from '@speedai/game-engine';

class MyRenderer extends GridRenderer<CellData> {
  drawCell(ctx, grid, r, c, cell) {
    if (!cell) return;
    const { x, y } = grid.gridToScreen(r, c, 10, 200);
    ctx.fillStyle = cell.color;
    ctx.fillRect(x - 20, y - 20, 40, 40);
  }
}
const renderer = new MyRenderer({ offsetX: 10, offsetY: 200 });
renderer.drawCellBackgrounds(ctx, grid);
renderer.drawAllCells(ctx, grid);
renderer.drawSelection(ctx, grid, 2, 3, performance.now());
```

## Interfaces

All adapters are interface-based and swappable:

- `IRenderer` — rendering backend
- `IPhysicsEngine` — physics backend
- `ISoundManager` — audio backend
- `IInputManager` — input backend
- `ISaveManager` — persistence backend
- `ISocialProvider` — social/leaderboard backend

## Build

```bash
npm run build        # ESM + CJS output
npm run typecheck    # Type checking
npm run test         # Unit tests
npm run test:coverage
```

## Bundle Size

| Module | Size (min+gzip) |
|--------|-----------------|
| Core (Engine, ECS) | ~3.5KB |
| Full bundle | ~18KB |
| + matter-js | +25KB (peer dep) |
| + howler | +10KB (peer dep) |
