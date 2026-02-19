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
