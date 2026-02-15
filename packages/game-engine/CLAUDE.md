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

## Code Style
- Strict TS: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- All imports use `.js` extension
- No default exports — named exports only
- Interfaces prefixed with `I` (IRenderer, ISaveManager, etc.)
- Config types suffixed with `Config` (ScoreConfig, CameraConfig, etc.)
