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

---

## Phase 2: Shoot & Destroy — COMPLETE

**Gate**: Fire Medium Cannon. Bullets hit containers. Containers explode and drop coins. Screen shakes.

### What's Built

| File | Purpose |
|------|---------|
| `config/WeaponConfig.ts` | `WeaponDef` interface + `GUN_01` (20 dmg, 3/s ROF, 400 px/s) |
| `config/CombatConfig.ts` | Pool size (40), explosion/impact/smoke/damage configs, HP thresholds |
| `components/Projectile.ts` | `ProjectileComponent` {weaponDef, ownerId, elapsed} |
| `components/Weapon.ts` | `WeaponComponent` {def, cooldownRemaining} |
| `combat/WeaponSystem.ts` | `updateWeapons()`: cooldown tick + fire on click; `tryFire()`: spawn at muzzle tip |
| `combat/ProjectileSystem.ts` | `updateProjectiles()`: move, TTL, grid collision → `'projectile:hit'` event |
| `combat/ProjectileRenderer.ts` | `drawProjectiles()`: shell sprites rotated to velocity direction |
| `combat/DamageSystem.ts` | `initDamageListeners()`: EventBus → HP deduction → `'tile:damaged'`/`'tile:destroyed'` |
| `combat/TileHPTracker.ts` | Parallel HP map for destructible tiles, clears grid cell at 0 HP |
| `vfx/VFXManager.ts` | EventBus listener: muzzle flash + impact + explosion animations + damage numbers |
| `vfx/DamageStateRenderer.ts` | Hull orange tint at 50% HP, smoke particles at 25% HP |
| `hud/HudRenderer.ts` | Screen-space HP bar (ProgressBar), color shifts green → yellow → red |
| `tank/TankUtils.ts` | `getTurretTip()`: muzzle world position from turret angle + pivot |

### Modified from Phase 1

| File | Change |
|------|--------|
| `config/TankConfig.ts` | Added `weapon: WeaponDef` + `maxHP` to `TankDef` |
| `tilemap/TileRegistry.ts` | Added `blockProjectile` flag to `ObjectDef` |
| `tank/TankAssembler.ts` | Now adds Weapon + Health components alongside TankParts |
| `scenes/GameplayScene.ts` | Wires combat systems, VFX, HUD into update/render loop |
| `main.ts` | Adds ObjectPoolSystem, EventBus, loads 19 new effect sprites |

### Engine Changes

- Added `HealthComponent` interface to `game-engine/src/core/types.ts`
- Added `ComponentFactory.health(current, max)` to `game-engine/src/core/Component.ts`
- `ComponentType.Health` was already declared — now has matching type + factory

### Decisions Made

- **Event-driven pipeline**: `EventBus` decouples collision → damage → VFX. Clean separation of concerns.
- **Tile HP as parallel tracker** — not entity promotion. Grid cells stay in `GridModel`, HP tracked in `Map<string, number>`.
- **Separate Weapon component** — not crammed into TankParts. Prepares for Phase 4 weapon swapping.
- **`blockProjectile` flag on ObjectDef** — collision behavior is data-driven, not hardcoded per object type.
- **Grid-based projectile collision** — point check at projectile position. AABB entity collision deferred to Phase 3.
- **Procedural fallback for VFX** — if sprite not loaded, ProjectileRenderer draws yellow rectangle. ParticleBurst used for all particle effects.

### Engine Systems Used

| System | How |
|--------|-----|
| `ObjectPoolSystem` | Projectile entity recycling (pool: `'projectile'`, max 40) |
| `EventBus` | Decouple: weapon:fired → projectile:hit → tile:damaged/destroyed |
| `CameraSystem.shake()` | On fire (2px/0.1s) and on hit (3px/0.08s) |
| `ParticleBurst` | Impact sparks, destruction particles, smoke at low HP |
| `FrameAnimator` | One-shot frame indexing for muzzle flash, impact, explosion |
| `ProgressBar` | HP bar in HUD |
| `ComponentFactory.health()` | Player HP (100/100) |

### Config Surface (new in Phase 2)

| Config | Controls |
|--------|----------|
| `WeaponConfig.GUN_01.damage/fireRate/projectileSpeed` | Weapon balance |
| `WeaponConfig.GUN_01.shakeOnFire/shakeOnHit` | Per-weapon juice tuning |
| `WeaponConfig.GUN_01.muzzleFlash.*` | Muzzle flash animation params |
| `CombatConfig.projectilePoolSize` | Max concurrent projectiles |
| `CombatConfig.explosion/impact.*` | VFX sprite sequences + display size |
| `CombatConfig.damageNumber.*` | Floating text speed, fade, font |
| `CombatConfig.damageStates.cracked/smoking` | HP thresholds for visual states |
| `TankConfig.PLAYER_TANK.maxHP` | Player starting health |
| `TileRegistry.OBJECT_DEFS[*].blockProjectile` | Which objects stop bullets |

### Asset Inventory (new in Phase 2)

- `medium-shell` → `Medium_Shell.png` (projectile)
- `muzzle-flash-0..3` → `Sprite_Fire_Shots_Shot_A_000..003.png` (4 frames)
- `impact-0..3` → `Sprite_Fire_Shots_Impact_A_000..003.png` (4 frames)
- `explosion-0..8` → `Sprite_Effects_Explosion_000..008.png` (9 frames)

**Pack 6 available (craftpix-513237) — not yet integrated:**
- Gold coin animation: 30-frame source → use frames 1, 5, 9, 13, 17, 21, 25, 29 (every 4th = 8 frames, full 360° spin)
- Copy `Gold_1.png..Gold_29.png` (every 4th) to `public/sprites/coins/` as `Gold_1..8.png`
- Silver/Bronze not used — no tiered value system in design
- `CoinSystem.draw()` currently renders procedural gold circles; upgrade in Phase 3 task 3.7 using `FrameAnimator` (looping, ~10 FPS)

### Phase 2 Fixes (post-implementation)

| Fix | Root Cause | Solution |
|-----|-----------|----------|
| Projectile trajectory invisible | Shell is 8×16 world-px at 400 px/s — too small/fast to notice | Added 20px yellow-orange tracer line in `ProjectileRenderer.ts` drawn behind each shell |
| Track renders black | `createPattern`+`DOMMatrix` tiles in absolute canvas-space, ignoring local rotate/translate | Replaced with `clip`+`drawImage` + wrap-around second draw in `TankRenderer.ts` |
| Track direction wrong | Used `Math.abs(speed)` — offset always increased regardless of direction | Switched to signed `speed` with double-modulo: `((offset + speed*dt) % h + h) % h` |
| No coin drops | `tile:destroyed` event fired but nothing consumed it | Added `CoinSystem.ts`: spawns 3 coins on destruction, auto-collects on proximity, HUD count |

---

## Phase 3: Enemies & Game Loop — COMPLETE

**Gate**: Play 5-wave Survival. Grunts chase and shoot. Kills drop coins. Death → results → restart.

### What's Built

| File | Purpose |
|------|---------|
| `config/AIConfig.ts` | AI behavior params (fire range 200px, 40% accuracy, spread, timers) |
| `config/WaveConfig.ts` | 5-wave table (3→10 grunts), inter-wave delay, spawn safe radius |
| `config/GameStateTypes.ts` | `GameHUDState`, `GameOverStats`, `WaveState` types |
| `components/AI.ts` | `AIComponent` {state, role, fireRange, accuracy, maxSpread, timers} |
| `ai/FlowField.ts` | Dijkstra BFS flood → direction vector per walkable tile |
| `ai/AISystem.ts` | `updateAI()` — IDLE/CHASE/ENGAGE state machine, flow field nav |
| `combat/EntityCollisionSystem.ts` | Projectile-vs-tank circle collision check |
| `combat/EntityDamageSystem.ts` | Entity HP deduction → `entity:damaged`/`entity:killed` events |
| `systems/WaveSpawner.ts` | Wave lifecycle: IDLE→PRE_WAVE→SPAWNING→ACTIVE→COMPLETE |
| `scenes/MenuScene.ts` | Title "BATTLE TANK" + Play button |
| `scenes/GameOverScene.ts` | VICTORY/GAME OVER + stats + Play Again/Menu buttons |

### Modified from Phase 2

| File | Change |
|------|--------|
| `tilemap/types.ts` | Added `enemySpawns` to `MapData` |
| `tilemap/TileRegistry.ts` | Added `'S'` enemy spawn char to `CHAR_MAP` |
| `tilemap/TilemapLoader.ts` | Collects `'S'` chars into `meta.enemySpawns` |
| `maps/survival_01.ts` | 4 `S` markers at corners |
| `config/TankConfig.ts` | Added `GRUNT_TANK` def (100 speed, 60 HP) |
| `config/CombatConfig.ts` | Added `coin` (sprites, anim, pickup particles), `enemyTint`, `killSlowMo` |
| `combat/WeaponSystem.ts` | Cooldown tick for ALL weapon entities, not just player |
| `combat/CoinSystem.ts` | Animated sprites via FrameAnimator, pickup VFX event, enemy kill drops |
| `vfx/VFXManager.ts` | Entity kill/damage VFX, turret pop-off, coin pickup particles |
| `hud/HudRenderer.ts` | Wave indicator, kill count, wave banner, `GameHUDState` interface |
| `tank/TankRenderer.ts` | Enemy hull red tint overlay |
| `scenes/GameplayScene.ts` | Wires AI, waves, SlowMotion, entity collision, scene transitions |
| `main.ts` | 3 scenes (Menu→Gameplay→GameOver), coin sprite loading |

### Engine Changes

- **SlowMotion** now used (was deferred) — kill slow-mo on enemy death
- **Button** now used — menu/game-over UI
- No engine source modifications

### Decisions Made

- **Flow field (not A\*)** — single Dijkstra flood serves all enemies. Recomputes when player moves ≥2 tiles. A* deferred to Phase 6 per-role pathfinding.
- **Circle collision for entity hits** — rotation-independent, matches existing tile collision approach.
- **Event-driven entity damage** — `projectile:hit:entity` → `entity:damaged`/`entity:killed`. Same pattern as tile damage pipeline.
- **`setTimeout` for scene transition** — brief delay (500ms death, 1s victory) lets final VFX play before switching.
- **Shared `setGameOverStats()`** — mutable module-level state for cross-scene data. Simple; proper scene-data passing deferred to when SceneManager supports it.
- **Real dt for VFX, slow-mo dt for gameplay** — particles/animations stay smooth during slow-mo; only movement/combat slows down.
- **Animated coins** — 8-frame Gold sprite loop at 10 FPS via `FrameAnimator.getLoopingFrame()`. Procedural fallback if sprites missing.

### Engine Systems Used

| System | How |
|--------|-----|
| `SlowMotion` | 300ms at 0.3x on enemy kill |
| `Button` | Menu "PLAY", GameOver "PLAY AGAIN" / "MENU" |
| `FrameAnimator.getLoopingFrame()` | Coin sprite animation |
| `ParticleBurst` | Coin pickup golden particles, turret pop-off |
| All Phase 1–2 systems | Unchanged |

### Config Surface (new in Phase 3)

| Config | Controls |
|--------|----------|
| `AIConfig.grunt.*` | Fire range, accuracy, spread, reaction/retarget timers |
| `AIConfig.flowField.recomputeThreshold` | Tiles before flow field recompute |
| `AIConfig.disengageMultiplier` | Hysteresis for ENGAGE→CHASE |
| `WaveConfig.WAVE_TABLE[n].*` | Per-wave count, spawn delay, tank def |
| `WaveConfig.WAVE_CONFIG.*` | Inter-wave delay, spawn safe radius |
| `CombatConfig.coin.*` | Sprite keys, anim fps, display size, drop/pickup params |
| `CombatConfig.enemyTint` | Enemy hull overlay color |
| `CombatConfig.killSlowMo.*` | Kill slow-mo scale + duration |
| `TankConfig.GRUNT_TANK.*` | Enemy tank stats (speed, HP, weapon) |

### Asset Inventory (new in Phase 3)

- `coin-0..7` → `coins/Gold_1..8.png` (8-frame spin loop, source: Pack 6 every 4th frame)

### Phase 4 Prep — Hooks Already In Place

- `FlowField` can be extended with terrain costs for Phase 5
- `EntityCollisionSystem` + `EntityDamageSystem` generic — work for any projectile/tank combo

---

## Phase 3.5: AI Role Diversity & Difficulty — COMPLETE

**Gate**: 4 distinct enemy roles with different behaviors. Difficulty selector on menu. Enemies no longer stack.

### What's Built

| File | Purpose |
|------|---------|
| `config/AIConfig.ts` | `AIBehaviorProfile`, `AI_PROFILES` (4 roles), `DifficultyModifiers`, `WaveScaling`, `InstanceVariance`, `SEPARATION_CONFIG` |
| `components/AI.ts` | Extended `AIRole` union (grunt/flanker/sniper/rusher), `strafeSign`, resolved profile fields on `AIComponent` |
| `ai/resolveAIProfile.ts` | Pure fn: base × difficulty × wave ± variance → resolved `AIBehaviorProfile` |
| `ai/AISystem.ts` | Profile-driven CHASE/ENGAGE behavior, separation steering, fire-on-move |
| `config/WeaponConfig.ts` | `SNIPER_GUN` (40 dmg, 0.8 ROF), `MACHINE_GUN` (8 dmg, 8 ROF) |
| `config/TankConfig.ts` | `FLANKER_TANK` (fast, 50 HP), `SNIPER_TANK` (slow, 40 HP), `RUSHER_TANK` (very fast, 40 HP) |
| `config/WaveConfig.ts` | `WaveEnemy[]` per wave, mixed compositions, `spawnJitterFraction` |
| `config/CombatConfig.ts` | `roleTints: Record<AIRole, string>` replaces single `enemyTint` |
| `systems/WaveSpawner.ts` | Round-robin spawn points, jitter, `resolveAIProfile()` call, difficulty param |
| `tank/TankRenderer.ts` | Per-role tint lookup from `AIComponent.role` |
| `scenes/MenuScene.ts` | Difficulty selector (Easy/Normal/Hard buttons), `getSelectedDifficulty()` |
| `scenes/GameplayScene.ts` | Passes `getSelectedDifficulty()` to `WaveSpawner` |

### Roles

| Role | Behavior | Weapon | Tint |
|------|----------|--------|------|
| **grunt** | Chase → stop → inaccurate volley | Medium Cannon | Red |
| **flanker** | Offset approach → circle-strafe → shoot while orbiting | Machine Gun | Yellow |
| **sniper** | Chase to long range → camp → precise slow shots | Sniper Cannon | Blue |
| **rusher** | Full-speed charge → never stops → spray at point-blank | Machine Gun | Green |

### Profile Resolution Pipeline

```
AIBehaviorProfile (base, per-role from AI_PROFILES)
  × DifficultyModifiers (easy/normal/hard multipliers)
  × WaveScaling (accuracy + reaction time per wave index)
  ± InstanceVariance (±15% on numeric fields)
  = final AIComponent values (written once at spawn)
```

### Bug Fixes

| Fix | Root Cause | Solution |
|-----|-----------|----------|
| Enemies stack on same position | `spawnEnemy()` always picked farthest spawn point | Round-robin spawn points + `spawnJitterFraction` random offset |
| Enemies clump on flow field paths | All enemies follow identical flow field at same speed | Separation steering: repulsion within `SEPARATION_CONFIG.radius`, blended into movement |

### Decisions Made

- **No new FSM states** — same IDLE/CHASE/ENGAGE, behavior parameterized by profile fields.
- **No engine changes** — all game-level logic. AI is game-specific.
- **Profile resolved at spawn, not runtime** — zero per-frame overhead. Values baked into `AIComponent`.
- **Module-level difficulty state** — same cross-scene pattern as `gameOverStats`.
- **Shuffled spawn queue** — roles interleaved per wave, not grouped.

### Config Surface (new in Phase 3.5)

| Config | Controls |
|--------|----------|
| `AI_PROFILES[role].*` | Base behavior per role (fireRange, accuracy, engageSpeedFraction, engageStrafeRate, etc.) |
| `DIFFICULTY_MODIFIERS[level].*` | Accuracy, reactionTime, engageSpeedFraction, fireRate multipliers |
| `WAVE_SCALING.*` | Per-wave accuracy boost + reaction time reduction |
| `INSTANCE_VARIANCE.range` | ±% randomization on numeric profile fields |
| `SEPARATION_CONFIG.radius/weight` | Enemy separation steering |
| `WAVE_CONFIG.spawnJitterFraction` | Spawn position randomization |
| `COMBAT_CONFIG.roleTints[role]` | Per-role hull tint color |
| `TankConfig.FLANKER/SNIPER/RUSHER_TANK.*` | Per-role tank stats |
| `WeaponConfig.SNIPER_GUN/MACHINE_GUN.*` | Per-role weapon stats |

---

## Phase 4: All Weapons & Damage Pipeline — COMPLETE

**Gate**: Swap between 8 weapons (keys 1–8). Each has distinct projectile, VFX, and feel.

### What's Built

| File | Purpose |
|------|---------|
| `config/WeaponConfig.ts` | `WeaponBehavior` union, `DamageType`, `WeaponDef` extended; GUN_01–08; `WEAPON_REGISTRY`; `PLAYER_WEAPONS` |
| `config/ArmorConfig.ts` | `ArmorKitId`, `DamageType`, `ARMOR_TABLE` (4×3 multiplier matrix) |
| `config/BombConfig.ts` | `BombType`, `BombDef`, `BOMB_DEFS` (3 types); key constants |
| `config/CombatConfig.ts` | Added: `trajectoryPreview`, `howitzerIndicator`, `laserBeam`, `chargeBar`, `bomb`, `splashParticles` |
| `config/TankConfig.ts` | Added `armorKit?` to `TankDef`; new defs: `HEAVY_GRUNT_TANK`, `ARMORED_SNIPER_TANK`, `CAGE_RUSHER_TANK` |
| `config/WaveConfig.ts` | 8 waves (3 new); waves 6–8 use armored tank variants |
| `config/GameStateTypes.ts` | Added `chargeRatio?`, `weaponName?`, `activeBombType?` to `GameHUDState` |
| `components/Projectile.ts` | Added `lifetimeOverride?`, `bouncesRemaining`, `piercesRemaining`, `hitEntities`, `splashTarget?` |
| `components/Weapon.ts` | Added `chargeElapsed`, `isCharging`, `shotCount` |
| `components/ArmorKit.ts` | `ArmorKitComponent { kitId }` |
| `components/Beam.ts` | `BeamComponent` (laser VFX; held by HitscanSystem, not entity manager) |
| `components/Bomb.ts` | `BombComponent { type, state, elapsedMs, ownerId, detonated }` |
| `combat/WeaponSystem.ts` | Full rewrite: per-behavior fire dispatch (hitscan/charge/splash/ballistic); weapon switch 1–8; bomb placement B; bomb cycle [ ] |
| `combat/ProjectileSystem.ts` | Bounce (reflect + emit `projectile:bounce`); splash detonation on expire/tile-hit (`splash:detonated`) |
| `combat/EntityCollisionSystem.ts` | Pierce support (`piercesRemaining`); `hitEntities` guard; passes `shotVx/shotVy` |
| `combat/EntityDamageSystem.ts` | Armor multiplier lookup; knockback impulse; `splash:entity:hit` listener |
| `combat/SplashSystem.ts` | AoE damage on `splash:detonated`; howitzer landing indicators (pulsing circle) |
| `combat/HitscanSystem.ts` | Raycast march; beam entity lifetime; `drawBeams()` (3-layer laser) |
| `combat/BombSystem.ts` | Placement; arm/fuse/proximity/remote state machine; chain reaction; `drawBombs()` |
| `combat/TrajectoryPreviewSystem.ts` | Simulate bounce trajectory; draw dotted preview line for Rifled Gun |
| `combat/ProjectileRenderer.ts` | Wires trajectory preview, howitzer indicator, beams, bombs into draw pass |
| `vfx/VFXManager.ts` | Added: `projectile:bounce`, `splash:detonated`, `bomb:exploded` listeners |
| `hud/HudRenderer.ts` | Weapon name, bomb type, railgun charge bar |
| `tank/TankAssembler.ts` | Adds `ArmorKitComponent` from `TankDef.armorKit`; initializes new Weapon fields |
| `scenes/GameplayScene.ts` | Wires SplashSystem, HitscanSystem, BombSystem; `WEAPON_KEY_STATE`; charge ratio in HUD |

### Weapon Summary

| Key | Weapon | Behavior | Damage type |
|-----|--------|----------|-------------|
| 1 | Medium Cannon | ballistic | kinetic |
| 2 | Machine Gun | ballistic + ±5° spread + tracer/4 | kinetic |
| 3 | Heavy Cannon | ballistic + 80px knockback | kinetic |
| 4 | Rifled Gun | ballistic + 2 bounces + dotted preview | kinetic |
| 5 | Howitzer | splash 120px AoE + indicator | explosive |
| 6 | Laser | hitscan raycast + 3-layer beam 80ms | energy |
| 7 | Shotgun | ballistic 5 pellets ±15° 250px range | kinetic |
| 8 | Railgun | charge 180ms + pierce 2 + cyan beam | energy |

### Armor Kit System

| Kit | Kinetic | Explosive | Energy |
|-----|---------|-----------|--------|
| none | 1.0 | 1.0 | 1.0 |
| reactive | 1.0 | 0.4 | 0.9 |
| composite | 0.6 | 0.7 | 0.8 |
| cage | 0.9 | 0.3 | 1.1 |

Enemy variants with armor: `HEAVY_GRUNT_TANK` (reactive), `ARMORED_SNIPER_TANK` (composite), `CAGE_RUSHER_TANK` (cage). Introduced in waves 6–8.

### Decisions Made

- **AI stays ballistic-only in Phase 4.** Hitscan/splash/charge are player-only. AI uses existing GUN_01/SNIPER_GUN/MACHINE_GUN — `AISystem` unchanged.
- **Howitzer target = dynamic lifetime.** `tryFire` computes `dist(turretTip, cursor) / speed` — shell lands at cursor. Max lifetime acts as range cap.
- **Pierce via `hitEntities: Set<number>`.** Added to `ProjectileComponent`; `EntityCollisionSystem` skips already-pierced targets. Projectile lives until `piercesRemaining === 0`.
- **Bounce axis detection via prev/curr tile comparison.** Separate X/Y axis check determines which velocity component to negate. Falls back to corner (both negate) if diagonal.
- **Bomb placed as entity** (Position + BombComponent). `BombSystem` owns the state machine. Chain reaction is breadth-first within `detonate()` recursion, guarded by `detonated` flag.
- **`WEAPON_KEY_STATE`** — module-level `Set<string>` cleared on scene init. Edge-detects key transitions without needing `isKeyJustPressed` API.
- **No engine changes** — all game-package. Engine was sufficient.

### Config Surface (new in Phase 4)

| Config | Controls |
|--------|----------|
| `WeaponConfig.PLAYER_WEAPONS[n].*` | Per-weapon stats, behavior params, VFX |
| `ArmorConfig.ARMOR_TABLE[kit][type]` | Damage multiplier matrix |
| `BombConfig.BOMB_DEFS[type].*` | Per-bomb timing, radius, chain params |
| `CombatConfig.trajectoryPreview.*` | Dotted line segments, dot spacing |
| `CombatConfig.howitzerIndicator.*` | Pulse frequency, radius, colors |
| `CombatConfig.laserBeam.layers[]` | Width + color per concentric layer |
| `CombatConfig.chargeBar.*` | Railgun charge bar position/colors |
| `TankConfig.HEAVY_GRUNT/ARMORED_SNIPER/CAGE_RUSHER.*` | Armored enemy stats |

---

## Phase 4.5: Projectile Feel & Hit Reactions — COMPLETE

**Gate**: Firing each weapon looks and feels distinct. Receiving hits has visual + physical feedback. Damaged tanks smoke realistically.

### What's Built

| Area | Detail |
|------|--------|
| **Per-weapon tracer** | `tracerStyle` on `WeaponDef`: color, glow (shadowColor/blur), length, width — unique per gun |
| **In-flight trail** | `trailConfig` on `WeaponDef`: particle burst emitted at configurable interval — Heavy Cannon smoke, Howitzer embers, Railgun cyan sparks |
| **Barrel recoil** | `recoilPx` + `recoilSpring` on `WeaponDef`; `recoilOffset`/`recoilVelocity` on `TankPartsComponent`; spring-damped in `updateTankVFXState()` |
| **Loading ring** | `loadingRing` on `WeaponDef`: world-space arc at muzzle tip showing cooldown progress; flashes readyColor at 0 cooldown |
| **Railgun charge glow** | World-space radial glow at muzzle tip scaling with `chargeRatio`; pulses at `readyFlashHz` when fully charged |
| **Charge buildup tremor** | `weapon:charging` event fired per-frame; `ShakeDef.buildup` applies growing camera shake during hold |
| **`ShakeDef` extended** | `decay?: 'linear'|'quadratic'` envelope; `buildup?: {rampPerSec, maxIntensity}` |
| **Per-type impact particles** | `CombatConfig.damageTypeImpact[DamageType]` overrides base `impactParticles` colors/speed/count on hit |
| **Hull flash on hit** | `CombatConfig.hitFlash[DamageType]`: white=kinetic, orange=explosive, cyan=energy; fades over `duration` |
| **Player-takes-hit shake** | `CombatConfig.playerHitShake[DamageType]`; applied in `VFXManager` on `entity:damaged` when `entityId === playerId` |
| **Universal stagger** | `WeaponDef.hitStaggerPx`: velocity impulse applied to ALL hit entities (not just Heavy Cannon); splash staggers radially |
| **Three-tier damage smoke** | `damageStates.heavySmoke` (10%) added; `DamageStateRenderer` manages 3 `ParticleBurst` instances: light gray / thick black / orange fire |

### Modified Files

| File | Change |
|------|--------|
| `WeaponConfig.ts` | `ShakeDef` + `WeaponDef` extended; `TracerStyle`, `TrailConfig`, `LoadingRingDef` interfaces; all guns filled |
| `CombatConfig.ts` | `damageTypeImpact`, `hitFlash`, `playerHitShake`, `railgunCharge`, `lightSmokeParticles`, `heavySmokeParticles`, `fireParticles`, `smokeEmitIntervals`, `defaultTracer`; `damageStates.heavySmoke` |
| `TankParts.ts` | `recoilOffset`, `recoilVelocity`, `hitFlashElapsed`, `hitFlashDuration`, `hitFlashColor` |
| `TankAssembler.ts` | Initializes new fields |
| `TankRenderer.ts` | Turret draw uses `recoilOffset`; hit flash `fillRect` overlay |
| `TankMovementSystem.ts` | `updateTankVFXState()` — recoil spring-damper + flash timer for all tanks |
| `components/Projectile.ts` | `trailAccumulatedMs` field |
| `combat/WeaponSystem.ts` | `weapon:charging` event per-frame; `recoilVelocity` kick on fire; `trailAccumulatedMs: 0` on spawn |
| `combat/ProjectileRenderer.ts` | Rewritten as class with `update()` (trail emit) + `draw()` (tracer glow, loading ring, charge glow) |
| `combat/EntityDamageSystem.ts` | Universal `hitStaggerPx`; `weaponDef` forwarded in `entity:damaged`; splash stagger radially |
| `combat/SplashSystem.ts` | `splashCenterX/Y` + `weaponDef` passed in `splash:entity:hit` |
| `vfx/VFXManager.ts` | `setPlayerId(id, em)`; `damageTypeImpact` on impacts; hit flash set on `TankPartsComponent`; player shake; `weapon:charging` tremor |
| `vfx/DamageStateRenderer.ts` | Three `ParticleBurst` instances; tier-based emit from `smokeEmitIntervals` |
| `scenes/GameplayScene.ts` | Wires `ProjectileRenderer`, `updateTankVFXState`, `vfx.setPlayerId` |

### Config Surface (new in Phase 4.5)

| Config | Controls |
|--------|----------|
| `WeaponDef.tracerStyle.*` | Per-weapon tracer color, glow, length, width |
| `WeaponDef.trailConfig.*` | Trail emit interval + particle params |
| `WeaponDef.recoilPx/recoilSpring` | Barrel kick magnitude + spring constant |
| `WeaponDef.hitStaggerPx` | Universal impulse on hit |
| `WeaponDef.loadingRing.*` | Muzzle-tip reload arc |
| `WeaponDef.shakeOnFire.decay/buildup` | Shake envelope + charge tremor |
| `CombatConfig.damageTypeImpact[type]` | Impact particle colors per damage type |
| `CombatConfig.hitFlash[type]` | Hull flash color + duration per damage type |
| `CombatConfig.playerHitShake[type]` | Camera shake when player is hit |
| `CombatConfig.railgunCharge.*` | Muzzle glow radius, alpha, pulse rate |
| `CombatConfig.lightSmokeParticles` | 25–50% HP smoke params |
| `CombatConfig.heavySmokeParticles` | 10–25% HP smoke params |
| `CombatConfig.fireParticles` | 0–10% HP fire spark params |
| `CombatConfig.smokeEmitIntervals.*` | Emit frequency per smoke tier |
| `CombatConfig.damageStates.heavySmoke` | HP threshold for critical smoke/fire |

---

## Phase 4.6: Infantry Units & Combined-Arms Squads — COMPLETE

**Gate**: 3 infantry types (MG/Shotgun/Rifled) appear from Wave 5. Organized squads with tanks. Infantry plays death animation then is removed.

### What's Built

| File | Purpose |
|------|---------|
| `config/InfantryConfig.ts` | `InfantryDef`, `InfantryAnimState`, `INFANTRY_ANIM_TABLE` (3 soldiers × 7 states), `INFANTRY_DISPLAY_SIZE`, `INFANTRY_ANIM_SPEED_THRESHOLDS`, `FORMATION_SLOTS` (4 slots), `SQUAD_CONFIG`, 3 unit defs |
| `components/InfantryParts.ts` | `InfantryPartsComponent`: soldierVariant, animState, facingAngle, speed, maxSpeed, collisionRadius, muzzleOffsetPx, hitFlash*, shotFlash* |
| `tank/InfantryAssembler.ts` | `createInfantry()` → Position + Velocity + InfantryParts + Weapon + Health + Tag |
| `tank/InfantryRenderer.ts` | Sprite sheet clipping, hit flash, death animation queue (Dead sheet plays once then entity is gone) |
| `systems/InfantryMovementSystem.ts` | `updateInfantryVFXState()` — anim state machine + timer ticks; re-exports `getInfantrySpeedFactor` |

### Modified Files

| File | Change |
|------|--------|
| `config/WeaponConfig.ts` | `unitClass: 'any'|'tank'|'infantry'` added to `WeaponDef`; 3 new infantry weapons in registry |
| `config/AIConfig.ts` | Added `SQUAD_STEERING` (slotReachRadius, formationPullStrength) |
| `components/AI.ts` | Added `squadLeadId?`, `formationDx`, `formationDy` to `AIComponent` |
| `config/WaveConfig.ts` | `SquadMemberDef`, `SquadDef`, `squads?` on `WaveEntry`; waves 5–8 use squads |
| `systems/WaveSpawner.ts` | Squad-aware queue: tank spawned first, infantry patched with actual `squadLeadId` |
| `ai/AISystem.ts` | Dual loop (tanks + infantry); squad formation steering in CHASE; breaks on ENGAGE; `tryFireInfantry` for infantry |
| `combat/WeaponSystem.ts` | `tryFireInfantry()`: facingAngle muzzle, multi-pellet, sets `shotFlashElapsed` |
| `scenes/GameplayScene.ts` | `InfantryRenderer` wired into init/update/render; `entity:killed` → death anim |
| `main.ts` | 21 infantry sprite sheets loaded |

### Unit Summary

| Soldier | Weapon | HP | Speed | Role |
|---------|--------|----|-------|------|
| Soldier_1 | Infantry MG (7 ROF, ±5°) | 35 | 190 px/s | rusher/grunt |
| Soldier_2 | Infantry Shotgun (3 pellets ±18°, 180px) | 30 | 155 px/s | flanker |
| Soldier_3 | Infantry Rifled (1 bounce) | 40 | 115 px/s | sniper |

### Squad System

```
CHASE: infantry steers → leadPos + rotate(formationOffset, lead.hullAngle)
ENGAGE: formation breaks, each unit fights independently
Lead dies: squadLeadId cleared → reverts to flow field
```

Formation slots (local-space, rotated by lead hullAngle at runtime):
- Slot 0: left-flank (−30, −20) · Slot 1: right-flank (+30, −20)
- Slot 2: far-left (−20, −42) · Slot 3: far-right (+20, −42)

### Decisions Made

- **Separate entity class**: `InfantryParts` instead of `TankParts`. AISystem queries both independently.
- **Omnidirectional movement**: No hull rotation. `facingAngle` follows velocity (chase) or angleToPlayer (engage).
- **`unitClass` enforces weapon restrictions** at data level — no runtime checks.
- **Squad patching**: infantry in queue carry `squadLeadId: -1`, patched to real entity ID immediately after tank lead spawns. No registry needed.
- **Formation rotation**: offsets are lead-local, rotated by `lead.hullAngle` each frame.
- **Death animation via renderer queue**: `entity:killed` → read components before `em.destroy()` → push `DeathAnim` → plays Dead sheet once at world pos.
- **No engine changes.**

### Config Surface (new in Phase 4.6)

| Config | Controls |
|--------|----------|
| `InfantryConfig.INFANTRY_ANIM_TABLE[v][state]` | Frames + FPS per soldier per anim |
| `InfantryConfig.INFANTRY_DISPLAY_SIZE` | Rendered px size (32) |
| `InfantryConfig.FORMATION_SLOTS[n]` | Local-space formation offsets |
| `InfantryConfig.*_UNIT.*` | Per-unit stats |
| `AIConfig.SQUAD_STEERING` | Formation pull + slot snap radius |
| `WeaponConfig.INFANTRY_*.*` | Infantry weapon stats + `unitClass:'infantry'` |
| `WaveConfig.WAVE_TABLE[n].squads[]` | Squad composition per wave |

### Asset Inventory (new in Phase 4.6)

Pack 5 (`craftpix-net-507107`) — 21 sprite sheets, 128×128 px per frame, horizontal layout

| Keys | Files |
|------|-------|
| `infantry-s1-{idle,walk,run,shot,reload,hurt,dead}` | `Soldier_1/*.png` |
| `infantry-s2-{idle,walk,run,shot,reload,hurt,dead}` | `Soldier_2/*.png` |
| `infantry-s3-{idle,walk,run,shot,reload,hurt,dead}` | `Soldier_3/*.png` |

---

## Phase 4.7: Drop Item & Buff/Debuff System — COMPLETE

**Gate**: 14 item types drop from enemies with weighted pools. 5 timed buffs + 4 timed debuffs with HUD icons. Spawn pop animation. Magnet radius buffable.

### What's Built

| File | Purpose |
|------|---------|
| `config/DropConfig.ts` | `DropItemType` (14 types), `ITEM_POLARITY`, `ITEM_DISPLAY` (sprite keys for craftpix Bonus_Items), weighted `DROP_TABLES` with `bonusPool[]`, `DROP_PHYSICS` (incl. spawn anim, bob, pulse), `ITEM_EFFECTS` (instant: hp/hp_debuff/nuke) |
| `config/BuffConfig.ts` | `BuffStat` (6 modifiable stats), `TimedBuffDef`, `TIMED_BUFF_DEFS` (9 timed effects), `BUFF_HUD` display config |
| `systems/BuffSystem.ts` | `ActiveEffect`, `BuffSystem` class: `applyEffect()`, `getModifier(stat)`, `getActiveEffects()`, `isActive()` |

### Modified Files

| File | Change |
|------|--------|
| `config/GameStateTypes.ts` | Added `activeEffects?` to `GameHUDState` |
| `systems/DropSystem.ts` | Rewritten: weighted `bonusPool` pick, `BuffSystem` magnet modifier, spawn pop animation (ease-out scale-in), pulse for timed items, bob from config |
| `systems/TankMovementSystem.ts` | Added optional `BuffSystem` param; applies `speed` + `turnRate` modifiers to player |
| `combat/WeaponSystem.ts` | Added optional `BuffSystem` param; applies `fireRate` modifier to player cooldown tick |
| `combat/EntityCollisionSystem.ts` | Passes `ownerId` in `projectile:hit:entity` event |
| `combat/EntityDamageSystem.ts` | Added `playerId?` + `BuffSystem?` params; applies `damage` modifier (attacker=player) + `incomingDamage` modifier (target=player); removed old TankParts shield check |
| `vfx/VFXManager.ts` | Changed `coin:collected` → `item:picked` listener |
| `hud/HudRenderer.ts` | Added `AssetManager` param; draws active effect icons (top-right) with radial cooldown overlay + colored borders |
| `scenes/GameplayScene.ts` | Wires `BuffSystem`; `handleItemPickup()` dispatches instant effects (hp/ammo/nuke/hp_debuff) and timed buffs/debuffs; passes `buffSystem` to movement/weapon/damage systems |
| `main.ts` | Loads 22 new sprites (13 world drops + 9 HUD icons); removed 6 old icon loads |

### Deleted Files

| File | Reason |
|------|--------|
| `combat/CoinSystem.ts` | Superseded by `DropSystem` (dead code since Phase 4.5) |
| `public/sprites/icons/icon_*.png` (6 files) | Replaced by craftpix Bonus_Items assets |

### Item Types

| Type | Polarity | Sprite | Effect |
|------|----------|--------|--------|
| `coin` | instant | Gold_1..8 (animated) | Currency counter |
| `hp` | instant | HP_Bonus.png | Restore 25 HP |
| `ammo` | instant | Ammunition_Bonus.png | Reset weapon cooldown |
| `nuke` | instant | Nuke_Bonus.png | Kill all enemies |
| `hp_debuff` | instant | HP_Debuff.png | Lose 15 HP |
| `shield` | buff | Shield_Bonus.png | 5s, incoming ×0.1 |
| `attack` | buff | Attack_Bonus.png | 8s, damage ×1.5 |
| `speed` | buff | Speed_Bonus.png | 6s, speed ×1.3 |
| `magnet` | buff | Magnet_Bonus.png | 10s, magnet ×2.5 |
| `armor` | buff | Armor_Bonus.png | 8s, incoming ×0.5 |
| `speed_debuff` | debuff | Speed_Debuff.png | 4s, speed ×0.6 |
| `armor_debuff` | debuff | Armor_Debuff.png | 5s, incoming ×1.5 |
| `ammo_debuff` | debuff | Ammunition_Debuff.png | 3s, fireRate ×0.4 |
| `mobility_debuff` | debuff | Mobility_Debuff.png | 4s, turnRate ×0.5 |

### Drop Tables (weighted pools)

| Source | Coins | Bonus Chance | Pool |
|--------|-------|-------------|------|
| grunt | 3 | 30% | hp(3), ammo(2) |
| flanker | 2 | 25% | speed(3), ammo(2) |
| sniper | 4 | 35% | attack(2), ammo(3) |
| rusher | 2 | 20% | hp(2), speed(2) |
| heavy_grunt | 3 | 30% | shield(2), armor(2), speed_debuff(1) |
| armored_sniper | 4 | 35% | attack(3), nuke(1), armor_debuff(1) |
| cage_rusher | 2 | 30% | shield(2), magnet(2), mobility_debuff(1) |
| tile | 2 | 0% | (none) |

### Decisions Made

- **Weighted pool, not single entry**: Each source has a `bonusPool: BonusDropEntry[]` with weights. One roll picks from the pool. More flexible than the old single-bonus system.
- **BuffSystem is player-only**: One instance, not per-entity. Enemies never receive buffs. Zero overhead for AI.
- **Modifier multiplication**: Multiple effects on the same stat multiply together (e.g. shield + armor = 0.1 × 0.5 = 0.05 incoming). Stacking rule is `'refresh'` (restart timer) for all current effects.
- **Spawn pop animation**: Items scale from 0→1 over `spawnAnimDurationS` with ease-out quad. Timed items also pulse (sine scale oscillation) to visually distinguish from instant pickups.
- **Shield visual kept on TankParts**: `shieldElapsed/shieldDuration` still set for `TankRenderer` cyan overlay. BuffSystem handles the actual damage reduction.
- **Nuke is instant kill**: `ITEM_EFFECTS.nuke.damage = 9999`. Iterates all enemies, sets HP to 0, fires `entity:killed`. Only drops from armored_sniper at weight 1 (rare).
- **No per-weapon ammo**: Old `ammoBox` + `WEAPON_AMMO_ICON_KEYS` removed. `ammo` now resets all weapon cooldowns. Simpler and matches the asset pack (single Ammunition_Bonus.png).
- **No engine changes**.

### Config Surface (new in Phase 4.7)

| Config | Controls |
|--------|----------|
| `DropConfig.ITEM_DISPLAY[type].*` | Per-item sprite key, color, size, pulseAmplitude |
| `DropConfig.DROP_TABLES[source].*` | Coins, bonusChance, weighted bonusPool |
| `DropConfig.DROP_PHYSICS.*` | TTL, magnet, friction, scatter, spawnAnim, bob, pulse |
| `DropConfig.ITEM_EFFECTS.*` | Instant effect values (hp.amount, hp_debuff.damage, nuke.damage, shield.damageReduction) |
| `BuffConfig.TIMED_BUFF_DEFS[type].*` | Duration, magnitude, stat, stacking, iconKey, polarity |
| `BuffConfig.BUFF_HUD.*` | Icon size, gap, position, overlay/border colors |

---

## Phase 4.8: Buff/Debuff Visibility — COMPLETE

**Gate**: Player always knows when a buff/debuff is active via 3 independent feedback layers.

### Problem Fixed

20px corner icons were invisible during combat. Player had zero in-world signal that an effect was running.

### Three-Layer Feedback System

| Layer | When | What |
|-------|------|------|
| **Pickup notification** | Moment of acquisition | Colored float text above tank: `+SHIELD`, `-SLOWED` etc. Fades over 1.5s. |
| **World aura** | While active | Concentric colored rings around player hull (one per effect, radius offsets). Shield=cyan, attack=orange, speed=yellow, armor=blue, magnet=magenta; debuffs=red. |
| **Screen vignette** | While active | Radial gradient overlay at screen edges — green (buff) and/or red (debuff). Both layers visible simultaneously. |
| **Icon blink** | Final 20% of duration | HUD icons oscillate alpha at 4 Hz to signal imminent expiry. |
| **Larger icons** | Always | 20 → 32 px. Now visible at a glance. |

### Files Changed

| File | Change |
|------|--------|
| `config/BuffConfig.ts` | `label` field on `TimedBuffDef` + TIMED_BUFF_DEFS; added `expiryBlinkThreshold`, `blinkHz`, `vignetteAlpha/BuffColor/DebuffColor`, `auraRadius/Alpha/LineWidth` to `BUFF_HUD`; `iconSize` 20→32; new exports `BUFF_AURA_COLORS`, `BUFF_NOTIFY` |
| `vfx/VFXManager.ts` | `FloatingLabel` list; `item:picked` handler emits colored label above player for timed items |
| `hud/HudRenderer.ts` | `elapsed` accumulator for blink; `drawVignette()` (radial gradient per polarity); icon blink via `sin(elapsed × blinkHz)`; `draw()` takes `canvasHeight` param |
| `scenes/GameplayScene.ts` | `drawPlayerAura()` pure fn; called in world-space render after `drawTanks()`; `hud.draw()` passes `canvas.height` |

### Config Surface (new in Phase 4.8)

| Config | Controls |
|--------|----------|
| `TimedBuffDef.label` | Pickup notification text per effect |
| `BUFF_HUD.expiryBlinkThreshold` | Fraction of duration at which icon starts blinking (0.2) |
| `BUFF_HUD.blinkHz` | Icon blink frequency (4 Hz) |
| `BUFF_HUD.vignetteAlpha` | Screen edge overlay transparency (0.18) |
| `BUFF_HUD.vignetteBuffColor/DebuffColor` | Vignette tint per polarity |
| `BUFF_HUD.auraRadius/Alpha/LineWidth` | World-space ring size/opacity/thickness |
| `BUFF_HUD.iconSize` | HUD icon px size (now 32) |
| `BUFF_AURA_COLORS[type]` | Per-effect aura color overrides |
| `BUFF_NOTIFY.font/floatSpeed/fadeTime/yOffsetPx` | Pickup float text appearance |

### Decisions Made

- **No new components** — all visualization reads `buffSystem.getActiveEffects()` directly.
- **Pure function** for `drawPlayerAura()` — single-use, lives in `GameplayScene.ts`, no new file.
- **Float label at player position** — VFXManager reads player `Position` component via stored `em` + `playerId`. More accurate than item world position (magnet can collect from distance).
- **Both vignette polarities visible simultaneously** — draws two gradient layers if mixed active.
- **Aura rings offset by index** (`auraRadius + i × 6`) — stacked rings visible when multiple effects active, no overlap.

### Asset Inventory (new in Phase 4.8)

### Asset Inventory (new in Phase 4.7)

Pack 7 (`craftpix-976411`) — 128×128 px, all RGBA

**World drops** (`drop-*` keys):
- `drop-hp` → `HP_Bonus.png`, `drop-ammo` → `Ammunition_Bonus.png`, `drop-nuke` → `Nuke_Bonus.png`
- `drop-shield` → `Shield_Bonus.png`, `drop-attack` → `Attack_Bonus.png`, `drop-speed` → `Speed_Bonus.png`
- `drop-magnet` → `Magnet_Bonus.png`, `drop-armor` → `Armor_Bonus.png`
- `drop-hp-debuff` → `HP_Debuff.png`, `drop-speed-debuff` → `Speed_Debuff.png`
- `drop-armor-debuff` → `Armor_Debuff.png`, `drop-ammo-debuff` → `Ammunition_Debuff.png`
- `drop-mobility-debuff` → `Mobility_Debuff.png`

**HUD icons** (`icon-*` keys):
- `icon-hp`, `icon-ammo`, `icon-nuke`, `icon-shield`, `icon-attack`, `icon-speed`, `icon-magnet`, `icon-armor`, `icon-mobility`

---

## Phase 4.9: Laser Overhaul — COMPLETE

**Gate**: Laser is a realistic hold-to-fire continuous beam with heat management, bloom, and overheat feedback.

### Problem Fixed

Click-fire laser was identical in feel to a fast cannon. No resource to manage, no visual differentiation, 80ms beam.

### What Changed

| Area | Before | After |
|------|--------|-------|
| **Fire mode** | Click → instant 60 dmg | Hold → 60 DPS ticked at 100ms intervals |
| **Cooldown** | Simple 1s timer | Heat bar: fills over 3s fire, drains at 0.6×, 2s lockout at max |
| **Beam visual** | Static width, 80ms fade | Width blooms with heat, flickers at 28Hz, fades on release |
| **Muzzle glow** | None | Radial entry glow scales with heat ratio |
| **Terminus glow** | None | Impact point glow intensifies with heat |
| **Barrel tint** | None | Cyan hull overlay active while firing |
| **Camera shake** | Fixed 2px on click | Buildup tremor grows with heat via existing `ShakeDef.buildup` |
| **HUD** | Nothing | Heat bar (cyan→orange gradient, flashes red on overheat) |
| **Screen vignette** | None | Cyan edge glow ramps in above 60% heat |

### Files Changed

| File | Change |
|------|--------|
| `config/WeaponConfig.ts` | `hitscan` behavior: `continuousMode`, `damageTickIntervalMs`, `heatCapacity`, `heatPerSec`, `cooldownPerSec`, `overheatLockoutSec`; `GUN_06` updated + `buildup` shake |
| `config/CombatConfig.ts` | `laserBeam`: bloom multipliers, flicker, muzzle/terminus glow, barrel tint, vignette alpha; new `laserHeatBar` config |
| `config/GameStateTypes.ts` | Added `heatRatio?` to `GameHUDState` |
| `components/Weapon.ts` | Added `heatCurrent`, `isOverheated`, `overheatElapsed`, `laserFiring` |
| `combat/HitscanSystem.ts` | `fireContinuous()` — raycast + damage accumulation + live beam; `stopContinuous()`; `drawBeams()` with bloom/flicker/glows |
| `combat/WeaponSystem.ts` | Replaced hitscan block with heat state machine; barrelTint per frame; `weapon:charging` for shake; weapon-switch resets heat |
| `hud/HudRenderer.ts` | `drawLaserHeatBar()` (gradient fill + overheat flash); `drawLaserVignette()` (cyan edge glow) |
| `tank/TankAssembler.ts` | Init heat fields on `WeaponComponent` |
| `tank/InfantryAssembler.ts` | Same — infantry assembler also creates WeaponComponent |
| `scenes/GameplayScene.ts` | `heatRatio` computed from weapon component, passed to `GameHUDState` |

### Decisions Made

- **Damage ticking at 100ms** — not per-frame. Prevents 60 VFX events/sec (floating numbers, impact particles). Total DPS is identical; only batching differs.
- **`damageTickIntervalMs` on behavior** — weapon-specific. A future laser variant can use a different rate.
- **Single live beam** — replaced per-click push-to-array. `stopContinuous()` moves it to the decaying array for fade-out.
- **`weapon:charging` reused** — drives existing `ShakeDef.buildup` mechanism in VFXManager. No new event needed.
- **Overheat fires `weapon:fired`** — reuses muzzle flash VFX as overheat burst. No new event.
- **No engine changes.**

### Config Surface (new in Phase 4.9)

| Config | Controls |
|--------|----------|
| `WeaponConfig.GUN_06.behavior.heatCapacity` | Seconds of continuous fire before lockout (3.0) |
| `WeaponConfig.GUN_06.behavior.heatPerSec` | Heat per second while firing |
| `WeaponConfig.GUN_06.behavior.cooldownPerSec` | Heat removed per second when idle |
| `WeaponConfig.GUN_06.behavior.overheatLockoutSec` | Forced lockout duration |
| `WeaponConfig.GUN_06.behavior.damageTickIntervalMs` | Damage event batch rate |
| `CombatConfig.laserBeam.minWidthMultiplier/maxWidthMultiplier` | Beam bloom range |
| `CombatConfig.laserBeam.flickerHz/flickerAmplitudePx` | Beam width oscillation |
| `CombatConfig.laserBeam.muzzleGlowMaxRadius/Alpha` | Entry glow at beam origin |
| `CombatConfig.laserBeam.terminusGlowMaxRadius/Alpha` | Impact point glow |
| `CombatConfig.laserBeam.barrelTintColor` | Hull tint color while firing |
| `CombatConfig.laserBeam.overheatVignetteMaxAlpha` | Screen edge glow peak alpha |
| `CombatConfig.laserHeatBar.*` | Heat bar position, colors, flash rate |

---

## Phase 5: Garage & Loadouts — COMPLETE

**Gate**: Open Garage, swap hull/engine/tracks/gun/armor. See stats update. Deploy into Survival with chosen loadout.

### What's Built

| File | Purpose |
|------|---------|
| `config/PartRegistry.ts` | HullDef (8), EngineDef (4), TrackDef (4, with TerrainCosts), ArmorPartDef (4), LoadoutParts, RadarStats; `assembleLoadout()` → TankDef via P/W ratio; `computeRadarStats()`, `computeTotalWeight()`, `getLoadoutTerrainCosts()` |
| `config/GarageConfig.ts` | `GARAGE_LAYOUT` pixel rects, `GARAGE_STYLE` colors/fonts, `SLOT_CATEGORIES`, `SLOT_LABELS`, `FLAVOR_TEXT` |
| `systems/LoadoutSystem.ts` | Module-level active loadout (get/set); `LocalStorageAdapter` persistence (3 slots: save/load/has/delete) |
| `garage/RadarChart.ts` | `drawRadarChart()` — 6-axis radar (SPD/ACC/FPW/ROF/ARM/HND), grid rings, current + hover polygons |
| `garage/WeightBar.ts` | `drawWeightBar()` — gradient bar + overload pulse + P/W text |
| `garage/CompareStrip.ts` | `drawCompareStrip()` — stat deltas (▲ green / ▼ red / — neutral) + flavor text |
| `garage/TankPreview.ts` | `drawTankPreview()` — renders tracks → hull → turret from loadout parts at angle/scale |
| `scenes/GarageScene.ts` | Full garage: preview (drag-rotate), category tabs, card strip (scroll), radar, weight, compare, 3 save/load slots, deploy/back |

### Modified Files

| File | Change |
|------|--------|
| `config/WeaponConfig.ts` | Added `TurretVisual`, `turret: TurretVisual`, `weight: number` to `WeaponDef`; per-weapon turret sprites (Gun_01-08) and shell sprites |
| `config/TankConfig.ts` | `TankDef.turret` now `TurretVisual`; all defs derive turret from `weapon.turret` |
| `tilemap/types.ts` | Extended `TileId` with MUD, SAND, ICE, WATER, PUDDLE |
| `tilemap/TileRegistry.ts` | Added `TileTint` interface; 5 new terrain entries (tint overlays for mud/sand/puddle); new char codes (m/a/i/w/p) |
| `tilemap/TilemapRenderer.ts` | Tint overlay rendering after base sprite draw |
| `maps/survival_01.ts` | Updated 24x18 map with terrain variety (water/ice/mud/sand/puddle) |
| `ai/FlowField.ts` | BFS → weighted Dijkstra with binary min-heap; optional `TerrainCosts` param |
| `systems/TankMovementSystem.ts` | Added optional `tilemap` + `terrainCosts` params; terrain speed multiplier from tile under tank |
| `scenes/GameplayScene.ts` | Uses `assembleLoadout(getActiveLoadout())` for player tank; passes terrain costs to movement + flow field |
| `scenes/MenuScene.ts` | PLAY → Garage (was Gameplay) |
| `scenes/GameOverScene.ts` | Added GARAGE button (3-button row) |
| `main.ts` | Registers GarageScene; loads 7 hulls, 7 tracks, 7 guns, 7 shells, 2 tile sprites |

### Part Registries

**Hulls** (8): Scout (80 HP, wt 8), Vanguard (100, 12), Enforcer (130, 16), Sentinel (150, 20), Juggernaut (200, 28), Phantom (70, 6), Reaper (110, 14), Titan (250, 34)

**Engines** (4): Light (60 pwr, wt 4), Standard (100, 8), Heavy (160, 14), Turbo (200, 10)

**Tracks** (4): Narrow Steel (handling 0.7), Wide Rubber (0.85), Spiked Treads (0.6), Hover Pads (0.95) — each with unique TerrainCosts per TileId

**Guns** (5 player): Medium Cannon (wt 10), Heavy Cannon (18), Howitzer (20), Laser (14), Railgun (16)

**Armor** (4): None (wt 0), Reactive (10), Composite (14), Cage (8)

### P/W Ratio System

```
totalWeight = hull + engine + track + gun + armor
pwRatio = clamp(engine.power / totalWeight, 0.3, 2.5)
maxForwardSpeed = BASE_FORWARD_SPEED × pwRatio   (BASE = 150 px/s)
acceleration    = BASE_ACCELERATION × pwRatio     (BASE = 300 px/s²)
turnRate        = BASE_TURN_RATE × track.handling  (BASE = π rad/s)
```

### Terrain Cost System

Each `TrackDef` has `terrainCosts: Record<TileId, number>` — multiplier on speed (1.0 = normal, <1 = penalty).
- `TankMovementSystem`: reads tile under tank center → applies multiplier to maxSpeed
- `FlowField.compute()`: edge cost = `1.0 / terrainMultiplier` (lower speed → higher traversal cost)
- Synthetic terrains (mud/sand/puddle) use tint overlays over base sprites; ice/water have dedicated sprites

### Scene Flow

```
Menu → Garage → Gameplay → GameOver → (Gameplay | Garage | Menu)
```

### Decisions Made

- **Zero engine modifications** — `LocalStorageAdapter`, `Button`, `GridModel` already existed.
- **P/W ratio, not flat stats** — single parameter (power/weight) drives all movement. Intuitive cause-and-effect.
- **Terrain costs on TrackDef, not global** — different tracks handle terrain differently. Hover Pads ignore water, Spiked Treads handle ice.
- **Tint overlays for synthetic terrains** — mud/sand/puddle reuse base tile sprites + `ctx.fillRect` overlay. Avoids needing dedicated sprite per terrain.
- **FlowField → weighted Dijkstra** — inline binary min-heap (~30 lines). Edge cost = inverse terrain multiplier. Falls back to uniform cost when no terrain costs provided.
- **`TurretVisual` on WeaponDef** — each weapon owns its turret sprite. No separate turret registry needed.
- **Canvas UI (no DOM)** — card strip with clipping, drag-scroll, hover compare. Consistent with existing scenes.
- **3 save slots** — `LocalStorageAdapter` with prefix `battletank_loadout_N`.

### Config Surface (new in Phase 5)

| Config | Controls |
|--------|----------|
| `PartRegistry.HULL_REGISTRY[id].*` | Per-hull HP, weight, collision radius, display size |
| `PartRegistry.ENGINE_REGISTRY[id].*` | Per-engine power + weight |
| `PartRegistry.TRACK_REGISTRY[id].*` | Per-track handling, weight, terrainCosts per TileId |
| `PartRegistry.ARMOR_REGISTRY[id].*` | Per-armor weight (damage multipliers in ArmorConfig) |
| `PartRegistry.DEFAULT_LOADOUT` | Starting loadout IDs |
| `PartRegistry.OVERLOAD_PW_THRESHOLD` | P/W below this shows overload warning (0.5) |
| `GarageConfig.GARAGE_LAYOUT.*` | Pixel positions/sizes for all UI elements |
| `GarageConfig.GARAGE_STYLE.*` | Colors, fonts, radar config |
| `GarageConfig.FLAVOR_TEXT[partId]` | Tooltip descriptions per part |
| `WeaponDef.turret.*` | Per-weapon turret sprite + dimensions |
| `WeaponDef.weight` | Per-weapon weight |
| `TileRegistry.TileTint` | Overlay color + alpha for synthetic terrains |

### Asset Inventory (new in Phase 5)

**Hulls**: `hull-02..08` → `Hull_02..08.png` (7 new, 256x256)
**Tracks**: `track-1b`, `track-2a/2b`, `track-3a/3b`, `track-4a/4b` → `Track_*_A/B.png` (7 new, 42x246)
**Guns**: `gun-02..08` → `Gun_02..08.png` (7 new, varying sizes)
**Shells**: `light-shell`, `heavy-shell`, `sniper-shell`, `grenade-shell`, `shotgun-shells`, `plasma`, `laser-beam` (7 new, 128x128)
**Tiles**: `ground-snow` → `Ground_Tile_Snow_1.png`, `ground-water` → `Ground_Tile_Water_1.png` (2 new)

---

## Phase 5.1 — Garage Refinements

**Gun centroid fix** (`TankPreview.ts`): Removed incorrect `pivotOffsetY` formula; turret now drawn as `top = -(h * pivotY)` so pivot lands exactly at tank center. Matches `TankRenderer.ts` gameplay formula.

**Track attachment** (`PartRegistry.ts`, `TankConfig.ts`, `TankPreview.ts`): `spacing` removed from `TrackDef`; `trackOffsetX` added to `HullDef` (≈ hull.width/2 − 1, flush with hull edge). Tracks now attach correctly for all hull sizes (26–32px range vs old constant 22). `assembleLoadout()` passes `hull.trackOffsetX` as `TankDef.tracks.spacing`. Hardcoded AI tanks updated to 27 (hull-01, 56px).

**Engine trade-offs** (`PartRegistry.ts`): Added `speedMult`/`accelMult` to `EngineDef`. Breaks P/W cap homogeneity — light hulls with Turbo no longer identical to Standard. Trade-offs: Light = responsive/slow-top; Standard = balanced; Heavy = raw horsepower/sluggish; Turbo = highest top speed/turbo lag. `assembleLoadout()` applies both multipliers independently.

**Hull differentiation** (`PartRegistry.ts`): Phantom HP 70→55, weight 6→5 (extreme glass cannon). Scout HP 80→95 (reliable entry-level fast hull). Clear risk/reward split.

**ARM normalization** (`PartRegistry.ts`): Replaced hardcoded floor `0.3` with `ARMOR_NORM_FLOOR` derived from actual `ARMOR_TABLE` minimum avgMult. Best armor (composite) now maps to 1.0 ARM on radar; no armor = 0. Scale auto-adjusts when new kits are added.

---

## Phase 5.2 — Tile Transition Fix

**Problem**: Transitions drew a semi-opaque flat-color rectangle (`blendColor`) over tile sprites. GRASS→DIRT showed a brown wash, not a texture blend.

**Fix**: Sprite-based alpha masking via `OffscreenCanvas` + `destination-in` compositing. The neighbor's actual texture is faded in at the seam edge. Extended from 4 cardinal to 8 directions (added NE/NW/SE/SW corner blends with radial gradients).

| File | Change |
|------|--------|
| `config/MapConfig.ts` | Added `tileTransitionMaxAlpha` (peak seam opacity, replaces implicit color alpha) |
| `tilemap/TileRegistry.ts` | Removed `blendColor` from `TileDef`; no longer needed |
| `tilemap/TilemapRenderer.ts` | 8-dir sprite-blend loop; `OffscreenCanvas(ts,ts)` cached module-level; `destination-in` gradient masking |

**Config surface**: `MAP_CONFIG.tileTransitionMaxAlpha` (default `0.88`), `MAP_CONFIG.tileTransitionWidth` (unchanged, controls strip/corner size).

---

## Phase 5.3 — Mechanical Weapon Switching

**Gate**: Pressing a weapon key starts a two-phase transition (stow → draw) with barrel animation. Can't fire during switch.

### State machine

```
none → (key press) → stowing → (switchOutMs) → drawing → (switchInMs) → none
```

| Phase | What happens |
|-------|-------------|
| **stowing** | Large recoil kick on current barrel (snap back). `weapon.def` unchanged — turret still shows current gun. |
| **def swap** | At stow→draw boundary: `weapon.def = pendingDef`, barrel set to draw-start offset. |
| **drawing** | Overdamped spring decays offset → 0 (barrel extends forward). |
| **ready** | `switchPhase = 'none'`, fire enabled. |

### Edge cases

| Input during switch | Result |
|--------------------|--------|
| Same key mid-stow | Cancel — return to current weapon |
| Different key mid-stow | Redirect — update `pendingDef`, restart stow timer |
| Any key mid-draw | Abort draw, begin stowing new weapon |

### Files changed

| File | Change |
|------|--------|
| `config/WeaponConfig.ts` | `switchOutMs` + `switchInMs` on `WeaponDef`; `WEAPON_SWITCH_CONFIG` (`stowRecoilMult`, `drawOffsetMult`, `drawMinOffsetPx`) |
| `components/Weapon.ts` | `switchPhase: WeaponSwitchPhase`, `switchElapsedMs`, `pendingDef` |
| `tank/TankAssembler.ts` | Init new fields |
| `tank/InfantryAssembler.ts` | Init new fields |
| `combat/WeaponSystem.ts` | `beginStow()` helper; key-press block drives state machine; advance phase each frame; blocks fire during switch |
| `config/GameStateTypes.ts` | `switchProgress?: { ratio, phase, pendingName }` on `GameHUDState` |
| `scenes/GameplayScene.ts` | Computes `switchProgress` from weapon component |
| `hud/HudRenderer.ts` | Shows `→ pendingName…` (stowing=dim) or active name (drawing=bright) + progress bar (yellow=stow, green=draw) |

### Config surface

| Config | Controls |
|--------|----------|
| `WeaponDef.switchOutMs` | Time to retract current barrel (ms). Range: 160 (infantry) – 560 (railgun) |
| `WeaponDef.switchInMs` | Time to extend new barrel (ms). Range: 180 – 640 |
| `WEAPON_SWITCH_CONFIG.stowRecoilMult` | Stow kick = `recoilPx × mult / 0.016` velocity units |
| `WEAPON_SWITCH_CONFIG.drawOffsetMult` | Draw start = `recoilPx × mult` px behind rest |
| `WEAPON_SWITCH_CONFIG.drawMinOffsetPx` | Floor on draw offset (for low-recoil weapons like Laser) |

### Decisions made

- **Reuse existing spring-damper** (`recoilOffset`/`recoilVelocity` in `TankPartsComponent`) — zero new render code; animation is free.
- **Stow kick = velocity** → peak offset ≈ `recoilPx × stowRecoilMult` (same derivation as fire recoil). Heavy guns retract more dramatically.
- **Draw kick = offset** (`recoilOffset = drawOffset; recoilVelocity = 0`) → overdamped spring (damping=1.4) slides barrel forward without oscillation. New weapon's `recoilSpring` controls draw snap speed.
- **Def swap at stow→draw boundary** — old turret sprite stays visible while retracting; new sprite appears when barrel is already behind hull (minimises jarring swap).
- **No engine changes.**

### Bug Fixes (post-implementation)

| Fix | Root Cause | Solution |
|-----|-----------|----------|
| Turret sprite never changes on switch | `weapon.def` was swapped at stow→draw boundary but `TankPartsComponent.turretKey/Width/Height/PivotY` were never updated; renderer reads those stale fields | Copy `weapon.def.turret.*` into `tank.*` immediately after def swap in `WeaponSystem.ts` |
| Keys 6–8 unreachable | `WEAPON_SWITCH_KEYS` only declared `Digit1`–`Digit5` (5 entries) despite 8 player weapons | Extended to `Digit1`–`Digit8` |

---

## Phase 5.4: Armor Deflection System — COMPLETE

**Gate**: Kinetic rounds ricochet off angled armor. Front hull is harder than rear. Heavy weapons overmatch regardless.

### What's Built

| File | Purpose |
|------|---------|
| `config/ArmorConfig.ts` | `ArmorZoneDef`, `DeflectionDef`, `ArmorKitDef`, `ARMOR_KIT_DEFS` (4 kits × zone multipliers + ricochet rules) |
| `combat/EntityDamageSystem.ts` | Zone lookup + angle-of-incidence + ricochet gate before HP deduction |
| `vfx/VFXManager.ts` | `projectile:deflected` → silver `ParticleBurst` + "RICO" floating label |
| `config/CombatConfig.ts` | `deflection.ricochetParticles` + label text/color |

### Mechanics

**Three-layer pipeline** (applied in order, `projectile:hit:entity` path only; splash is unaffected):

```
1. Zone mult   — where on hull the shell lands (front < side < rear)
2. Ricochet    — kinetic + glancing (incidence > threshold) + below overmatch → zero damage
3. Final eff   = baseDamage × ARMOR_TABLE[kit][type] × zoneMult × buffMods
```

**Zone detection**:
```
outwardNormal = atan2(hitY − tankCY, hitX − tankCX)
frontDiff     = |wrap(outwardNormal − (hullAngle − π/2))|
zone = front  if frontDiff < frontArcDeg°
       rear   if frontDiff > 180° − rearArcDeg°
       side   otherwise
```

**Incidence angle** (0°=head-on, 90°=glancing):
```
incidenceRad = |wrap(projAngle − (outwardNormal + π))|
incidenceRad -= normalizationDeg  (kinetic only, clamp ≥ 0)
```

**Ricochet condition** (all three must hold):
1. `damageType === 'kinetic'`
2. `weapon.damage < kit.deflection.overmatchDamage`
3. `incidenceRad > kit.deflection.ricochetAngleDeg × π/180`

### Per-Kit Values

| Kit | frontMult | sideMult | rearMult | ricochetAngle | overmatch | normalize |
|-----|-----------|----------|----------|---------------|-----------|-----------|
| none | 0.90 | 1.00 | 1.20 | 72° | 60 | 3° |
| reactive | 0.80 | 1.00 | 1.30 | 70° | 65 | 3° |
| composite | 0.70 | 0.85 | 1.10 | 65° | 70 | 5° |
| cage | 0.85 | 0.95 | 1.20 | 68° | 50 | 2° |

Heavy Cannon (80 dmg) overmatches cage. Railgun (100 dmg) overmatches all kits. Machine gun (8 dmg) ricochets off composite front at steep angles.

### Decisions Made

- **Splash path unchanged** — explosions engulf from all angles; no ricochet gate on `splash:entity:hit`.
- **Energy/explosive never ricochet** — `dmgType === 'kinetic'` guard. Laser and Howitzer always penetrate.
- **`hullAngle - π/2` conversion** — maps 0=up game convention to screen atan2 convention. Same formula for tanks and infantry (`facingAngle`).
- **Ricochet fires `projectile:deflected` then returns** — projectile already consumed by `EntityCollisionSystem`; returning early skips all HP/stagger/event logic.
- **No engine changes.**

### Config Surface (new in Phase 5.4)

| Config | Controls |
|--------|----------|
| `ArmorConfig.ARMOR_KIT_DEFS[kit].zones.*` | Per-kit zone multipliers + arc angles |
| `ArmorConfig.ARMOR_KIT_DEFS[kit].deflection.ricochetAngleDeg` | Glancing angle threshold per kit |
| `ArmorConfig.ARMOR_KIT_DEFS[kit].deflection.overmatchDamage` | Damage floor to bypass deflection |
| `ArmorConfig.ARMOR_KIT_DEFS[kit].deflection.normalizationDeg` | AP self-orientation benefit per kit |
| `CombatConfig.deflection.ricochetParticles.*` | Silver spark burst params |
| `CombatConfig.deflection.ricochetLabelText/Color` | "RICO" floating text appearance |

---

## Phase 5.5: Pivot-Sweep Weapon Switch Animation — COMPLETE

**Gate**: Weapon switching uses a deliberate angular pivot sweep instead of a recoil-axis animation.

### Problem Fixed

Phase 5.3 used barrel recoil (spring-damper along barrel axis) as the primary stow animation. Recoil is an involuntary Newton-3rd reaction from propellant gas — using it for a deliberate equipment swap conflated two mechanically distinct events into one identical feel.

### What Changed

| Area | Before | After |
|------|--------|-------|
| **Stow primary motion** | Recoil kick along barrel axis (same as firing) | Turret sweeps `switchPivotDeg` degrees off aim (smoothstep curve) |
| **Draw primary motion** | Spring extends barrel forward | Turret returns from pivot to aim (ease-out quadratic) + barrel spring settle |
| **Stow recoil** | `stowRecoilMult = 2.0` (dominant) | `stowRecoilMult = 0.8` (complementary snap only) |
| **Easing** | Spring (same feel for both phases) | Stow = smoothstep (mechanical traversal); Draw = ease-out (settling) |

### Two-Axis Animation

```
Stow:  pivot sweeps off aim (smoothstep)  +  small barrel snap kick
Draw:  pivot returns to aim (ease-out)    +  barrel spring extends
```

### Files Changed

| File | Change |
|------|--------|
| `config/WeaponConfig.ts` | `switchPivotDeg` on `WeaponDef`; `pivotDir` on `WEAPON_SWITCH_CONFIG`; `stowRecoilMult` 2.0 → 0.8 |
| `tank/TankParts.ts` | `turretSwitchAngle: number` — additive offset on turret aim angle |
| `tank/TankAssembler.ts` | Init `turretSwitchAngle: 0` |
| `combat/WeaponSystem.ts` | `beginStow()` resets angle; stow advances smoothstep; draw advances ease-out; cancel/redirect reset to 0 |
| `tank/TankRenderer.ts` | `drawAngle = turretAngle + turretSwitchAngle` |

### Config Surface (new)

| Config | Controls |
|--------|----------|
| `WeaponDef.switchPivotDeg` | Degrees swept during stow/draw (per weapon; heavy guns sweep more) |
| `WEAPON_SWITCH_CONFIG.pivotDir` | 1 = CW sweep, −1 = CCW |
| `WEAPON_SWITCH_CONFIG.stowRecoilMult` | Complementary snap magnitude (reduced from 2.0 to 0.8) |

### Per-Weapon Values

| Weapon | `switchPivotDeg` |
|--------|-----------------|
| Medium Cannon | 20° |
| Machine Gun (GUN_02) | 15° |
| Heavy Cannon | 40° |
| Rifled Gun | 22° |
| Howitzer | 45° |
| Laser | 25° |
| Shotgun (GUN_07) | 18° |
| Railgun | 35° |
| Sniper Cannon (AI) | 25° |
| Autocannon (AI) | 18° |
| Machine Gun (AI) | 18° |
| Infantry MG/Shotgun/Rifled | 12°–16° |

### Decisions Made

- **Smoothstep stow, ease-out draw** — different curves give each phase a distinct mechanical character. Spring is reserved for fire recoil only.
- **`turretSwitchAngle` is additive** — composable with `turretAngle`; zero overhead when `switchPhase === 'none'` (renderer still reads 0).
- **Reset on cancel/redirect** — angle snaps to 0 so a mid-switch correction doesn't visually compound.
- **No engine changes.**

---

## Phase 5.6: Map Selection, Mini-map & Map Generator — COMPLETE

**Gate**: Map selection screen before deploy. Mini-map overlay during play. Hedge tiles removed. Map generator module for designer workflow.

### What's Built

| File | Purpose |
|------|---------|
| `maps/MapGenerator.ts` | `generateMap(config, seed?)` — seeded mulberry32 PRNG, terrain fill, symmetry fold, BFS connectivity guarantee, player/enemy spawn placement |
| `config/MapGenDefaults.ts` | `SURVIVAL_GEN_CONFIG` + `ARENA_GEN_CONFIG` named presets (no magic numbers) |
| `maps/arena_01.ts` | Desert Arena map (generated with seed 7, hand-tuned) |
| `config/MapRegistry.ts` | `MapEntry`, `MAP_REGISTRY` (2 maps), `getSelectedMapId/setSelectedMapId/getSelectedMap` |
| `config/MapSelectConfig.ts` | Layout, thumbnail cell size, tile/object colors (single source for MapSelect + MiniMap), spawn dot colors |
| `scenes/MapSelectScene.ts` | Card grid: OffscreenCanvas thumbnails, hover/click selection, BACK→Garage, DEPLOY→Gameplay |
| `hud/MiniMapRenderer.ts` | `init(grid, cols, rows)` pre-renders 1px/cell OffscreenCanvas; `draw()` blits + scales to top-right, overlays player/enemy dots |
| `config/MapConfig.ts` | Added `MINI_MAP` config object (size, margin, opacity, dot radii, colors) |

### Modified Files

| File | Change |
|------|--------|
| `tilemap/types.ts` | Removed `HEDGE` from `ObjectId` |
| `tilemap/TileRegistry.ts` | Removed `[ObjectId.HEDGE]` from `OBJECT_DEFS`; removed `'H'` from `CHAR_MAP` |
| `maps/survival_01.ts` | Replaced all `H` → `C` (container); updated legend |
| `scenes/GarageScene.ts` | DEPLOY → `switchTo('MapSelect')` |
| `scenes/GameplayScene.ts` | Reads `getSelectedMap().ascii` instead of hardcoded `SURVIVAL_01`; wires `MiniMapRenderer` |
| `main.ts` | Registers `MapSelectScene`; removed `hedge-a01` asset load |

### Scene Flow

```
Menu → Garage → MapSelect → Gameplay → GameOver → (Gameplay | Garage | Menu)
```

### Map Generator Designer Workflow

Three usage levels:
1. **Direct ASCII edit** — open any `.ts` map file, edit chars. Legend in file header.
2. **Generator as scaffold** — call `generateMap(preset, seed)` → copy output to a new `.ts` file → hand-tune.
3. **Tune presets** — modify `MapGenDefaults.ts` (terrain weights, density, symmetry) to produce new families.

Generator guarantees: border walls, player/enemy spawn clear radius, BFS connectivity (carves path if blocked), optional quad/h/v symmetry for balanced layouts.

### Decisions Made

- **`MAP_SELECT_CONFIG.tileColors/objectColors` is single source** for both MapSelect thumbnails and MiniMapRenderer. No duplicated color tables.
- **OffscreenCanvas 1px/cell** for mini-map static layer — pre-rendered once in `init()`, blitted every frame. Zero per-frame tile iteration cost.
- **Mulberry32 PRNG** (4 lines) — fast, zero-dep, reproducible from seed. Standard in game dev.
- **BFS carve** — if any enemy spawn is unreachable from player after object placement, carvePath clears a straight path. Guarantees playability.
- **Hedge removed cleanly** — `ObjectId.HEDGE` deleted from enum; `H` char removed from `CHAR_MAP`. All `H` in `survival_01` replaced with `C`.
- **`MapSelectScene` selects map on card click** (not DEPLOY click) — selection persists if player backs out to Garage to swap loadout.
- **`getSelectedMap()` module-level** — same cross-scene pattern as `getSelectedDifficulty()`.
- **No engine changes.**

### Config Surface (new in Phase 5.6)

| Config | Controls |
|--------|----------|
| `MapGenConfig.*` | Rows/cols, seed, symmetry, enemy spawn count, terrain weights, object density, spawn clear radius |
| `SURVIVAL_GEN_CONFIG / ARENA_GEN_CONFIG` | Named presets for each map family |
| `MAP_SELECT_CONFIG.card.*` | Card width/height/gap/padding/thumbnail height |
| `MAP_SELECT_CONFIG.thumbnail.cellPx` | Pixels per tile cell in map preview (4) |
| `MAP_SELECT_CONFIG.tileColors[TileId]` | Mini-map + thumbnail tile colors |
| `MAP_SELECT_CONFIG.objectColors[ObjectId]` | Mini-map + thumbnail object overlay colors |
| `MAP_CONFIG.MINI_MAP.*` | Size, margin, opacity, border, dot radii/colors |

### Asset Inventory (Phase 5.6)

- `Hedge_A_01.png` — **removed** (no longer loaded or referenced)

---

## Phase 5.7: Decorative Layer, Container Variants & Hedgehog Obstacles — COMPLETE

**Gate**: Three-layer tilemap (ground → decor → object). Decor is render-only. Container sprites vary by position. Czech Hedgehog as impassable object. All placed by procedural post-load scatter passes.

### What's Built

| File | Purpose |
|------|---------|
| `tilemap/types.ts` | `DecorId` enum (20 variants), `ObjectId.HEDGEHOG`, `TileCell.decor?: DecorId` |
| `tilemap/TileRegistry.ts` | `DecorDef` interface (spriteKey + scale?), `DECOR_DEFS`, `ObjectDef.spriteVariants?`, container variants + hedgehog in `OBJECT_DEFS`, `CHAR_MAP['H']` |
| `tilemap/TilemapRenderer.ts` | Third render pass (decor, centered+scaled); `resolveObjectSprite()` position-hash variant picker |
| `config/MapGenDefaults.ts` | `DecorScatterConfig` + sub-interfaces, `DECOR_SCATTER_CONFIG` |
| `maps/MapGenerator.ts` | `applyDecorPasses()` — 3 passes: border decor, contextual scatter, hedgehog placement |
| `config/MapRegistry.ts` | `MapEntry.decorSeed` — per-map deterministic scatter seed |
| `config/MapSelectConfig.ts` | Added `objectColors[ObjectId.HEDGEHOG]` |
| `scenes/GameplayScene.ts` | Calls `applyDecorPasses()` after `parseTilemap()` for all maps |
| `main.ts` | Loads 30 new sprites: 6 blast trails, 3 borders, 5 pipes, 6 puddles (decor); 2 hedgehog, 3 container variants (objects) |
| `public/sprites/decor/` | 20 decor PNGs from craftpix-976411 Decor_Items |
| `public/sprites/tiles/` | Container_B/C/D.png, Czech_Hdgehog_A/B.png |

### Three-Layer Architecture

| Layer | Field | Absence | Gameplay effect | Render order |
|-------|-------|---------|-----------------|--------------|
| Ground | `TileCell.ground` | mandatory | terrain cost, walkability | bottom |
| Decor | `TileCell.decor?` | `undefined` | **none** | middle |
| Object | `TileCell.object` | `ObjectId.NONE` | collision, HP, projectile block | top |

Key distinction: `DecorDef` has no `walkable/hp/blockProjectile` — zero gameplay flags by design. `ObjectDef.spriteVariants?` is visual only; gameplay flags stay on the single `ObjectId`.

### applyDecorPasses — Three Passes

| Pass | Scope | What |
|------|-------|------|
| 1 Border | Perimeter cells with no object | Random border decor at configured probability |
| 2 Scatter | Interior open cells | Ground-type context (stone→blast trails, dirt/mud→puddles) + wall adjacency (WALL/BLOCK→pipes) |
| 3 Hedgehog | Interior open non-water cells | `ObjectId.HEDGEHOG` at configured probability, suppressed within `minDistFromSpawn` tiles of any spawn |

### Container Variant Selection

`resolveObjectSprite(def, r, c, mapCols)` → `spriteVariants[(r × mapCols + c) % variants.length]`

Deterministic by cell position. No extra storage on `TileCell`. All container variants share identical gameplay flags.

### Decisions Made

- **`decor?: DecorId` not `DecorId.NONE` sentinel** — absence is typed absence, not a value. Keeps enum clean; no phantom entry needed.
- **`applyDecorPasses` is post-parse** — MapGenerator still outputs plain ASCII. Decor is a load-time step, not baked into map files. Handcrafted and generated maps use identical pipeline.
- **`decorSeed` on `MapEntry`** — each map has a fixed, config-visible decor seed. Deterministic across reloads without hard-coding seeds in scene code.
- **Position-hash variant selection** — no extra per-cell storage, no RNG at render time, deterministic per cell.
- **Hedgehog spawn-clear suppression** — same `minDistFromSpawn` guard as spawn radius, keeps fight zones uncluttered.
- **No engine changes.**

### Config Surface (new in Phase 5.7)

| Config | Controls |
|--------|----------|
| `DecorScatterConfig.border.probability` | Border decor density (0.35) |
| `DecorScatterConfig.byGround[TileId].*` | Per-ground decor pool + probability |
| `DecorScatterConfig.nearWall.probability` | Pipe scatter density near walls (0.20) |
| `DecorScatterConfig.nearWall.adjacentObjects` | Which object types trigger pipe placement |
| `DecorScatterConfig.hedgehog.probability` | Hedgehog density (0.035) |
| `DecorScatterConfig.hedgehog.minDistFromSpawn` | Suppression radius in tiles (3) |
| `MapEntry.decorSeed` | Per-map decor scatter seed |
| `DECOR_DEFS[DecorId].scale` | Per-decor render scale (puddles 0.70) |

### Asset Inventory (new in Phase 5.7)

Source: `craftpix-976411` Decor_Items

**Decor** (`/sprites/decor/`):
- `decor-blast-1..6` → `Blast_Trail_01..06.png`
- `decor-border-a/b/c` → `Border_A/B/C.png`
- `decor-puddle-1..6` → `Puddle_01..06.png`

**Objects** (`/sprites/tiles/`):
- `container-b/c/d` → `Container_B/C/D.png`
- `hedgehog-a/b` → `Czech_Hdgehog_A/B.png`

---

## Phase 6: Air Units — PENDING

**Gate**: Scout + combat helicopters from Wave 7. Bombing plane flythrough from Wave 8. All air units fly over terrain. Player can engage with any weapon.

### Task List

| # | Task | Files |
|---|------|-------|
| 1 | `AirUnitComponent` + tag `'air'` | `components/AirUnit.ts` |
| 2 | `DEPTH.AIR` render layer | `config/EngineConfig.ts` |
| 3 | `targetLayer` on `WeaponDef`; guard `EntityCollisionSystem` | `config/WeaponConfig.ts`, `combat/EntityCollisionSystem.ts` |
| 4 | Guard `TileCollisionSystem` on tag `'air'` | `systems/TileCollisionSystem.ts` |
| 5 | `AIMovementMode.DIRECT` in `AIComponent`; `AirAISystem` FSM | `components/AI.ts`, `ai/AirAISystem.ts` |
| 6 | All 3 unit defs + all numeric constants | `config/AirUnitConfig.ts` |
| 7 | Entity builder + renderer (shadow → body → blade) | `tank/AirUnitAssembler.ts`, `tank/AirUnitRenderer.ts` |
| 8 | `BombSystem.placeBomb()` + `sourceFaction` for enemy bombs | `combat/BombSystem.ts` |
| 9 | `AirWaveEvent` type; wave 7+ entries | `config/WaveConfig.ts`, `systems/WaveSpawner.ts` |
| 10 | Load airforce assets | `main.ts` |
| 11 | Update docs | `CLAUDE.md`, `PROGRESS.md` |

### Architecture Decisions

**`AirUnitComponent`**: `{ altitude: number, bladeAngle: number, movementMode: 'hover'|'flythrough' }`. Tag `'air'` is the universal system guard.

**System guards** (tag `'air'`):
- `TileCollisionSystem` — early-exit if entity has tag `'air'` (flies over all terrain)
- `EntityCollisionSystem` — check projectile `targetLayer` vs entity tag before registering hit
- `FlowField` / `AISystem` — skipped for `'air'`; `AirAISystem` handles movement via direct vectors

**`targetLayer: 'ground'|'air'|'all'`** on `WeaponDef`. Default `'all'` (player weapons hit air units). AI ballistic weapons use `'ground'`.

**Rendering stack per air unit**:
1. Shadow: body sprite, configurable alpha, offset by `altitude × shadowXFactor / shadowYFactor` from `AirUnitConfig`, `depth = DEPTH.GROUND`
2. Body: `depth = DEPTH.AIR`
3. Blade: rotated by `bladeAngle` (incremented `bladeRPM × dt` each frame), `depth = DEPTH.AIR + 1`

**Helicopter FSM**: `PATROL → HOVER → ATTACK → RETREAT`. Direct-vector movement to waypoints; no flow field needed.

**Bombing plane**: `FLYTHROUGH` only — linear path from off-screen edge to opposite edge; drops enemy bombs at `bombDropIntervalMs`; entity destroyed on exit. Triggered as `AirWaveEvent`, not a persistent unit.

**Enemy bombs**: `BombSystem.placeBomb()` gets `sourceFaction: 'player'|'enemy'` param. Enemy proximity bombs use existing player-position scan; targeted at player.

### New Files

| File | Purpose |
|------|---------|
| `src/components/AirUnit.ts` | `AirUnitComponent` data struct |
| `src/config/AirUnitConfig.ts` | All 3 unit defs + blade RPM, altitude, shadow factors, bomb drop interval, flythrough speed, wave thresholds |
| `src/ai/AirAISystem.ts` | Helicopter FSM (PATROL/HOVER/ATTACK/RETREAT) + plane flythrough path logic |
| `src/tank/AirUnitAssembler.ts` | Entity builder: Position + Velocity + AirUnit + Health + Weapon + Tag `'air'` |
| `src/tank/AirUnitRenderer.ts` | Shadow → body → blade draw pass |

### Asset Inventory (Phase 6)

Source: `/Users/hoang/Downloads/airforce/`

| Key | File | Unit |
|-----|------|------|
| `heli-scout-body` | `helicopter_scout_body_1.png` | Scout Helicopter |
| `heli-scout-blade` | `helicopter_scout_blade_1.png` | Scout Helicopter blade |
| `heli-combat-body` | `helicopter_combat_body_1.png` | Combat Helicopter |
| `heli-combat-blade` | `helicopter_combat_blade_1.png` | Combat Helicopter blade |
| `bombing-plane` | `bombing_plane_1.png` | Bombing Plane |
