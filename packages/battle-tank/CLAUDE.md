# @speedai/battle-tank

Top-down tank survival game. Tilemap world, composite tank sprites + animated infantry units, WASD + mouse controls. Click to fire. 8-wave survival with AI enemies, combined-arms squads, 8 player weapons, armor system, and 3 bomb types.

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
├── main.ts              Entry: engine, assets, 3 scenes, ObjectPoolSystem, EventBus, game loop
├── config/
│   ├── EngineConfig.ts  Canvas 960x540, FPS, entity cap
│   ├── MapConfig.ts     Tile size (64px)
│   ├── TankConfig.ts    TankDef (hull/tracks/turret/weapon/movement/armorKit?) + PLAYER_TANK + 7 enemy defs (3 armored)
│   ├── InfantryConfig.ts InfantryDef, InfantryAnimState, INFANTRY_ANIM_TABLE (3 soldiers × 7 states), FORMATION_SLOTS, SQUAD_CONFIG, 3 unit defs (MG/Shotgun/Rifled)
│   ├── WeaponConfig.ts  WeaponBehavior union + UnitClass ('any'|'tank'|'infantry') + WeaponDef + GUN_01-08 + AI guns + 3 infantry weapons + WEAPON_REGISTRY + PLAYER_WEAPONS
│   ├── CombatConfig.ts  Pool size, VFX configs, trajectoryPreview, howitzerIndicator, laserBeam, chargeBar, bomb, splashParticles, roleTints, killSlowMo, gameOverTransition
│   ├── ArmorConfig.ts   DamageType ('kinetic'|'explosive'|'energy'), ArmorKitId, ARMOR_TABLE (4×3 multiplier matrix)
│   ├── BombConfig.ts    BombType, BombDef, BOMB_DEFS, BOMB_PLACE_KEY, BOMB_CYCLE_KEYS
│   ├── AIConfig.ts      AIBehaviorProfile, AI_PROFILES (4 roles), DifficultyModifiers, WaveScaling, InstanceVariance, SEPARATION_CONFIG, SQUAD_STEERING
│   ├── WaveConfig.ts    WaveEnemy, SquadMemberDef, SquadDef, WaveEntry (enemies + squads?), WAVE_TABLE (8 waves; squads from wave 2), WAVE_CONFIG
│   ├── DropConfig.ts    DropItemType (14 types: coin/hp/ammo/nuke/hp_debuff + 5 buffs + 4 debuffs), ITEM_DISPLAY, ITEM_POLARITY, weighted DROP_TABLES, DROP_PHYSICS, ITEM_EFFECTS
│   ├── BuffConfig.ts    BuffStat, TimedBuffDef (+ label field), TIMED_BUFF_DEFS (9 timed effects), BUFF_HUD (icon size/blink/vignette/aura config), BUFF_AURA_COLORS, BUFF_NOTIFY
│   └── GameStateTypes.ts GameHUDState (hp/coins/kills/wave/chargeRatio?/weaponName?/activeBombType?/activeEffects?), GameOverStats, WaveState
├── components/
│   ├── Projectile.ts    ProjectileComponent {weaponDef, ownerId, elapsed, lifetimeOverride?, bouncesRemaining, piercesRemaining, hitEntities, splashTarget?}
│   ├── Weapon.ts        WeaponComponent {def, cooldownRemaining, chargeElapsed, isCharging, shotCount}
│   ├── AI.ts            AIComponent {state, role, resolved profile fields, strafeSign, squadLeadId?, formationDx, formationDy}
│   ├── InfantryParts.ts InfantryPartsComponent {soldierVariant, animState, facingAngle, speed, maxSpeed, collisionRadius, muzzleOffsetPx, hitFlash*, shotFlash*}
│   ├── ArmorKit.ts      ArmorKitComponent {kitId: ArmorKitId}
│   ├── Beam.ts          BeamComponent (laser VFX, held by HitscanSystem not EntityManager)
│   └── Bomb.ts          BombComponent {type, state: BombState, elapsedMs, ownerId, detonated}
├── tilemap/
│   ├── types.ts         TileId, ObjectId, TileCell, MapData (incl enemySpawns)
│   ├── TileRegistry.ts  TILE_DEFS, OBJECT_DEFS, CHAR_MAP (P=player, S=enemy spawn)
│   ├── TilemapLoader.ts parseTilemap() → GridModel<TileCell> + MapData
│   └── TilemapRenderer.ts drawTilemap() — camera-culled, two-layer
├── tank/
│   ├── TankParts.ts         TankPartsComponent — recoilOffset/recoilVelocity (spring-damper) + hitFlash*
│   ├── TankAssembler.ts     createTank() → Position+Velocity+TankParts+Weapon+Health+Tag+(ArmorKit)
│   ├── TankRenderer.ts      drawTanks() — tracks → hull → per-role tint → turret (recoilOffset) → hit flash
│   ├── TankUtils.ts         getTurretTip() — muzzle world position
│   ├── InfantryAssembler.ts createInfantry() → Position+Velocity+InfantryParts+Weapon+Health+Tag
│   └── InfantryRenderer.ts  InfantryRenderer class — sprite sheet clipping, hit flash, DeathAnim queue
├── ai/
│   ├── FlowField.ts     Dijkstra flood → direction grid, recompute-on-move
│   ├── AISystem.ts      updateAI() — dual loop (tanks + infantry); FSM shared; squad formation steering in CHASE; flow-field fallback when lead dies
│   └── resolveAIProfile.ts  Pure fn: base × difficulty × wave ± variance → resolved AIBehaviorProfile
├── combat/
│   ├── WeaponSystem.ts  updateWeapons() + tryFireInfantry() — all fire modes; weapon switch 1-8; bombs; emits weapon:charging per-frame during charge; kicks recoil on fire
│   ├── ProjectileSystem.ts updateProjectiles() — move, bounce reflection, TTL/tile hit → EventBus
│   ├── ProjectileRenderer.ts Class: update() trail emission; draw() — per-weapon tracer+glow, loading ring, railgun charge glow, trajectory preview, howitzer indicator, laser beams, bombs
│   ├── EntityCollisionSystem.ts checkEntityCollisions() — pierce-aware circle test; marks hitEntities
│   ├── EntityDamageSystem.ts initEntityDamageListeners(em, eventBus, playerId?, buffSystem?) — armor multiplier + buff modifiers (damage/incomingDamage) + universal hitStaggerPx; splash stagger radially
│   ├── DamageSystem.ts  initDamageListeners() — tile HP → tile:damaged/destroyed events
│   ├── TileHPTracker.ts Parallel HP map for destructible tiles
│   ├── SplashSystem.ts  Class: howitzer landing indicators + splash:detonated → AoE entity damage
│   ├── HitscanSystem.ts Class: raycast (4px steps) → ActiveBeam list → drawBeams() multi-layer
│   ├── BombSystem.ts    Class: placeBomb(), state machine (arming→armed→detonating), chain detonation, clearAll()
│   └── TrajectoryPreviewSystem.ts Pure fn drawTrajectoryPreview() — simulated bounce path dots
├── vfx/
│   ├── VFXManager.ts    Muzzle flash, impact (per damageType particles), explosion, turret pop-off, damage numbers, coin pickup, buff/debuff pickup float labels; setPlayerId() for hit flash + player camera shake; weapon:charging → buildup tremor
│   └── DamageStateRenderer.ts Three-tier: hull tint ≤50% HP; light smoke ≤25%; thick black smoke + fire sparks ≤10%
├── hud/
│   └── HudRenderer.ts   HP bar, wave indicator, kill count, coin count, wave banner, active buff/debuff icons (32px, radial cooldown, expiry blink), screen-edge vignette
├── systems/
│   ├── TankMovementSystem.ts WASD → hull rotation + speed (with BuffSystem speed/turnRate modifiers); mouse → turret angle; updateTankVFXState() — recoil spring-damper + hit flash timer for all tanks
│   ├── InfantryMovementSystem.ts updateInfantryVFXState() — anim state machine, frame advance, timer ticks; re-exports getDamageSpeedFactor
│   ├── TileCollisionSystem.ts Separate-axis tile collision (circle vs grid)
│   ├── DropSystem.ts    World drops: coins + 13 item types; weighted bonus pools; magnet pull (buffable); spawn pop animation; TTL despawn; fires item:picked
│   ├── BuffSystem.ts    Player-only timed effects tracker; applyEffect/getModifier/getActiveEffects; consumed by TankMovement/Weapon/EntityDamage/Drop/HUD systems
│   └── WaveSpawner.ts   Wave lifecycle, round-robin spawns, jitter, resolveAIProfile; squad blocks: tank spawns first, infantry patched with real squadLeadId
├── scenes/
│   ├── MenuScene.ts     Title + difficulty selector + Play button
│   ├── GameplayScene.ts Orchestrates all systems, AI, waves, SlowMotion
│   └── GameOverScene.ts Stats display + Play Again / Menu buttons
└── maps/
    └── survival_01.ts   24x18 ASCII map with 4 enemy spawn points
```

## Key Patterns

- **No magic numbers**: All constants in `config/`. Tile behavior in `TileRegistry.ts`. Weapon stats in `WeaponConfig.ts`. AI params in `AIConfig.ts`. Wave table in `WaveConfig.ts`. VFX params in `CombatConfig.ts`. Armor multipliers in `ArmorConfig.ts`. Bomb params in `BombConfig.ts`. Drop items + weighted tables + physics in `DropConfig.ts`. Timed buff/debuff defs in `BuffConfig.ts`.
- **Event-driven pipeline**: `EventBus` decouples collision → damage → VFX → game state. Events: `weapon:fired`, `weapon:charging`, `projectile:hit`, `projectile:hit:entity` (incl. ownerId), `projectile:bounce`, `splash:detonated`, `splash:entity:hit`, `tile:damaged`, `tile:destroyed`, `entity:damaged`, `entity:killed`, `bomb:exploded`, `item:picked` (itemType, x, y), `wave:starting`, `wave:active`, `wave:clear`, `game:won`.
- **WeaponBehavior dispatch**: `updateWeapons()` switches on `behavior.kind`. `hitscan` → `HitscanSystem.fire()`. `charge` → tracks `isCharging`/`chargeElapsed`, fires on mouse-up. `splash` → `tryFire()` with cursor-derived `splashTarget` + dynamic `lifetimeOverride`. `ballistic` → `tryFire()` with pellet loop.
- **Composite entity**: Tank = Position + Velocity + TankParts + Weapon + Health + Tag + (ArmorKit if armored). Infantry = Position + Velocity + InfantryParts + Weapon + Health + Tag. Enemies additionally have AIComponent.
- **Scene-orchestrated**: Systems are stateless functions called from `GameplayScene.update()`, not engine-registered.
- **Scene flow**: Menu → Gameplay → GameOver → (Gameplay or Menu). `SceneManager.switchTo()`.
- **Object pooling**: `ObjectPoolSystem` for projectile recycling (pool: `'projectile'`).
- **Flow field AI**: Dijkstra BFS from player position. Direction vectors per walkable tile. Recomputes when player moves ≥2 tiles. All roles share one flow field; offset applied per-entity.
- **AI role system**: 4 roles (grunt/flanker/sniper/rusher) with distinct behaviors. Same FSM (IDLE/CHASE/ENGAGE), parameterized by `AIBehaviorProfile`. Flankers orbit, snipers camp far, rushers charge. `fireOnMove` allows shooting during CHASE.
- **Profile resolution pipeline**: `resolveAIProfile(role, difficulty, waveIndex)` composes base profile × difficulty multipliers × wave scaling ± instance variance. Called once at spawn, result stored on `AIComponent`. Zero runtime overhead.
- **Difficulty system**: Easy/Normal/Hard selected in MenuScene. Affects accuracy, reaction time, engage speed, fire rate via `DIFFICULTY_MODIFIERS`.
- **Separation steering**: AI entities repel each other within `SEPARATION_CONFIG.radius`. Blended into movement direction. Prevents clumping on shared flow field paths.
- **Spawn distribution**: Round-robin spawn points + `spawnJitterFraction` random offset. Fixes enemies stacking at same position.
- **Armor multiplier**: On `projectile:hit:entity`, `EntityDamageSystem` looks up `ArmorKitComponent.kitId` → `ARMOR_TABLE[kitId][damageType]`. Damage = raw × multiplier. Splash damage always uses `'explosive'` type.
- **Pierce**: `ProjectileComponent.piercesRemaining` + `hitEntities: Set<number>`. On pierce, entity is added to set and projectile continues. Checked in `EntityCollisionSystem` before processing hit.
- **Bounce**: `ProjectileComponent.bouncesRemaining`. On tile hit, axis detected by comparing prev vs curr tile row/col; velocity reflected, `projectile:bounce` emitted, projectile continues.
- **Howitzer dynamic lifetime**: At fire-time: `lifetimeOverride = dist(turretTip, cursor) / speed` (capped by `projectileLifetime`). Stored on `ProjectileComponent`.
- **Weapon key edge detection**: Module-level `WEAPON_KEY_STATE: Set<string>` tracks which digit keys were down last frame. Cleared on scene init/destroy. Avoids holding a key switching weapons repeatedly.
- **AI stays ballistic-only**: AI always uses `behavior.kind === 'ballistic'` weapons. Hitscan/splash/charge are player-only.
- **UnitClass weapon restriction**: `WeaponDef.unitClass: 'any'|'tank'|'infantry'`. Enforced at fire-time — `updateWeapons()` skips non-matching entities. Heavy Cannon/Howitzer/Laser/Railgun are `'tank'`; infantry weapons are `'infantry'`.
- **Infantry animation**: `InfantryPartsComponent` drives state (`idle/walk/run/shot/reload/hurt/dead`). `updateInfantryVFXState()` ticks timers + advances sprite sheet frame. Shot priority overrides movement state.
- **Squad formation**: Infantry patched with `squadLeadId` + local-space `formationDx/formationDy` (from `FORMATION_SLOTS`). In CHASE, formation offset rotated by `lead.hullAngle` each frame → world target. On lead death, `squadLeadId` cleared → fallback to flow field.
- **Death animation queue**: `entity:killed` fires synchronously before `em.destroy()`. `InfantryRenderer.onEntityKilled()` reads components, pushes `DeathAnim` to renderer's dying list. Entity removed immediately; death frames play from renderer queue.
- **Infantry muzzle**: No turret — muzzle = `pos + [sin(facingAngle), −cos(facingAngle)] × muzzleOffsetPx`. `facingAngle` follows velocity (CHASE) or aimAngle (ENGAGE).
- **Separation uses combined pool**: `allEnemyPositions` includes both tanks and infantry. Prevents tank/infantry clumping on shared flow field.
- **Bomb state machine**: `BombComponent.state` cycles arming → armed → detonating. `BombSystem.update()` drives transitions. Chain detonation is BFS within `detonate()`, guarded by `detonated` flag.
- **SlowMotion on kill**: `SlowMotion.trigger(scale, duration)` from engine. Applied to gameplay dt only; VFX uses real dt.
- **Animated coins**: 8-frame Gold sprite loop via `FrameAnimator.getLoopingFrame()`. Golden `ParticleBurst` on pickup via `item:picked` event.
- **Drop item system**: 14 item types (coin + 4 instant + 5 timed buffs + 4 timed debuffs). Weighted bonus pools per enemy source. Spawn pop animation (ease-out scale-in). Timed items pulse to distinguish from instant. Magnet radius buffable via `BuffSystem.getModifier('magnetRadius')`.
- **Buff/debuff system**: `BuffSystem` tracks `ActiveEffect[]` for player. `applyEffect(type)` → adds or refreshes by stacking rule. `getModifier(stat)` returns combined multiplier. Consumed by movement (speed/turnRate), weapons (fireRate), damage (incomingDamage/damage), drops (magnetRadius). HUD shows 32px icons with radial cooldown overlay + expiry blink. Screen-edge vignette (green=buff, red=debuff). World-space aura rings around player hull (per-effect, indexed radius). Pickup triggers colored float label above player.
- **Buff visibility (3-layer)**: (1) Pickup: `item:picked` → VFXManager emits `FloatingLabel` at player position using `TimedBuffDef.label`. (2) Active: `drawPlayerAura()` in world-space; `drawVignette()` in screen-space. (3) Expiry: icon alpha blinks via `sin(elapsed × blinkHz)` when `remaining/duration < expiryBlinkThreshold`.
- **Item pickup handler**: `GameplayScene.handleItemPickup()` dispatches by polarity: timed → `buffSystem.applyEffect()`, instant → direct effect (hp restore, ammo reset, nuke screen-clear, hp_debuff damage).
- **Per-role tint**: `COMBAT_CONFIG.roleTints[role]` — grunt=red, flanker=yellow, sniper=blue, rusher=green. Drawn over enemy hull in `TankRenderer`.
- **Angle convention**: 0 = up (north), positive = clockwise.
- **ComponentData casting**: Use `as unknown as ComponentData` for custom components.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move tank |
| Mouse | Aim turret |
| Left click / hold | Fire (charge weapons: hold to charge, release to fire) |
| 1–8 | Switch weapon |
| B | Place bomb (current type) |
| [ / ] | Cycle bomb type (proximity → timed → remote) |
| R (remote bomb) | Detonate all remote bombs |

## Assets

Individual PNGs in `public/sprites/`:
- `hulls/` — Hull_01
- `tracks/` — Track_1_A
- `weapons/` — Gun_01
- `tiles/` — Ground tiles, Block, Hedge, Container, Wall
- `effects/` — Medium_Shell, muzzle flash (4), impact (4), explosion (9)
- `coins/` — Gold_1..8.png (8-frame spin loop)
- `icons/` — 13 `*_Bonus/*_Debuff.png` (world drops, 128x128), 9 `*_Icon.png` (HUD status), Coin_A/B.png
- `infantry/Soldier_1/` — Idle, Walk, Run, Shot_1, Recharge, Hurt, Dead (MG unit)
- `infantry/Soldier_2/` — same set (Shotgun unit)
- `infantry/Soldier_3/` — same set (Rifled unit)

Source: craftpix packs in `~/Downloads/craftpix/2d_tank_topdown/`; icons from `craftpix-976411`; infantry from `craftpix-net-507107`

## Engine Usage

Uses: Engine, CanvasRenderer, UnifiedInput, AssetManager, SceneManager, CameraSystem, GridModel, ComponentFactory, ObjectPoolSystem, EventBus, ParticleBurst, FrameAnimator, ProgressBar, Button, SlowMotion.

Does NOT use: SimplePhysics, CollisionSystem, TweenSystem, Juice, ScoreSystem.
