import { Scene, SlowMotion } from '@speedai/game-engine';
import type {
  AssetManager, CameraSystem, UnifiedInput, GridModel,
  ObjectPoolSystem, EventBus, HealthComponent, SceneManager as SceneManagerType,
} from '@speedai/game-engine';
import type { TileCell, MapData } from '../tilemap/types.js';
import { parseTilemap } from '../tilemap/TilemapLoader.js';
import { drawTilemap } from '../tilemap/TilemapRenderer.js';
import { createTank } from '../tank/TankAssembler.js';
import { drawTanks } from '../tank/TankRenderer.js';
import { InfantryRenderer } from '../tank/InfantryRenderer.js';
import { updateTankMovement, updateTankVFXState } from '../systems/TankMovementSystem.js';
import { updateInfantryVFXState } from '../systems/InfantryMovementSystem.js';
import { resolveCollisionsAndMove } from '../systems/TileCollisionSystem.js';
import { updateWeapons } from '../combat/WeaponSystem.js';
import { updateProjectiles } from '../combat/ProjectileSystem.js';
import { ProjectileRenderer } from '../combat/ProjectileRenderer.js';
import { checkEntityCollisions } from '../combat/EntityCollisionSystem.js';
import { initEntityDamageListeners } from '../combat/EntityDamageSystem.js';
import { TileHPTracker } from '../combat/TileHPTracker.js';
import { initDamageListeners } from '../combat/DamageSystem.js';
import { SplashSystem } from '../combat/SplashSystem.js';
import { HitscanSystem } from '../combat/HitscanSystem.js';
import { BombSystem } from '../combat/BombSystem.js';
import { VFXManager } from '../vfx/VFXManager.js';
import { DamageStateRenderer } from '../vfx/DamageStateRenderer.js';
import { DropSystem } from '../systems/DropSystem.js';
import { BuffSystem } from '../systems/BuffSystem.js';
import { HudRenderer } from '../hud/HudRenderer.js';
import { FlowField } from '../ai/FlowField.js';
import { updateAI } from '../ai/AISystem.js';
import { WaveSpawner } from '../systems/WaveSpawner.js';
import { setGameOverStats } from './GameOverScene.js';
import { PROJECTILE } from '../components/Projectile.js';
import { WEAPON } from '../components/Weapon.js';
import type { WeaponComponent } from '../components/Weapon.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { getSelectedMap } from '../config/MapRegistry.js';
import { applyDecorPasses } from '../maps/MapGenerator.js';
import { DECOR_SCATTER_CONFIG } from '../config/MapGenDefaults.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { MiniMapRenderer } from '../hud/MiniMapRenderer.js';
import { assembleLoadout, getLoadoutTerrainCosts } from '../config/PartRegistry.js';
import type { TerrainCosts } from '../config/PartRegistry.js';
import { getActiveLoadout } from '../systems/LoadoutSystem.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { ITEM_EFFECTS, ITEM_POLARITY } from '../config/DropConfig.js';
import type { DropItemType } from '../config/DropConfig.js';
import { TIMED_BUFF_DEFS, BUFF_HUD, BUFF_AURA_COLORS } from '../config/BuffConfig.js';
import type { ActiveEffect } from '../systems/BuffSystem.js';
import type { GameHUDState, ScenePhase } from '../config/GameStateTypes.js';
import { getSelectedDifficulty } from './MenuScene.js';
import type { BombType } from '../config/BombConfig.js';

/** Per-scene key state for weapon/bomb switching edge detection. */
const WEAPON_KEY_STATE = new Set<string>();

/** Draw concentric aura rings around the player for each active buff/debuff. */
function drawPlayerAura(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  effects: readonly ActiveEffect[],
): void {
  for (let i = 0; i < effects.length; i++) {
    const eff = effects[i];
    const color = BUFF_AURA_COLORS[eff.type]
      ?? (eff.polarity === 'buff' ? BUFF_HUD.vignetteBuffColor : BUFF_HUD.vignetteDebuffColor);
    ctx.save();
    ctx.globalAlpha = BUFF_HUD.auraAlpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = BUFF_HUD.auraLineWidth;
    ctx.beginPath();
    ctx.arc(x, y, BUFF_HUD.auraRadius + i * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class GameplayScene extends Scene {
  private tilemap!: GridModel<TileCell>;
  private mapMeta!: MapData;
  private playerId: number = -1;
  private tileHP!: TileHPTracker;
  private vfx!: VFXManager;
  private damageState!: DamageStateRenderer;
  private drops!: DropSystem;
  private buffSystem!: BuffSystem;
  private hud!: HudRenderer;
  private flowField!: FlowField;
  private waveSpawner!: WaveSpawner;
  private slowMotion!: SlowMotion;
  private splashSys!: SplashSystem;
  private hitscanSys!: HitscanSystem;
  private bombSys!: BombSystem;
  private projRenderer!: ProjectileRenderer;
  private infantryRenderer!: InfantryRenderer;
  private kills = 0;
  private phase: ScenePhase = 'playing';
  private transitionTimer = 0;
  private transitionWon = false;
  private activeBombTypeRef: { value: BombType } = { value: 'proximity' };
  private terrainCosts!: TerrainCosts;
  private miniMap!: MiniMapRenderer;

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: AssetManager,
    private camera: CameraSystem,
    private input: UnifiedInput,
    private pool: ObjectPoolSystem,
    private eventBus: EventBus,
    private sceneManager: SceneManagerType,
  ) {
    super('Gameplay');
  }

  init(): void {
    this.kills = 0;
    this.phase = 'playing';
    this.transitionTimer = 0;
    this.transitionWon = false;
    this.activeBombTypeRef = { value: 'proximity' };
    WEAPON_KEY_STATE.clear();

    const selectedMap = getSelectedMap();
    const { grid, meta } = parseTilemap(selectedMap.ascii, MAP_CONFIG.tileSize);
    applyDecorPasses(grid, meta, DECOR_SCATTER_CONFIG, selectedMap.decorSeed);
    this.tilemap = grid;
    this.mapMeta = meta;
    this.miniMap = new MiniMapRenderer();
    this.miniMap.init(grid, meta.cols, meta.rows);

    const worldW = meta.cols * MAP_CONFIG.tileSize;
    const worldH = meta.rows * MAP_CONFIG.tileSize;
    (this.camera as any).worldWidth = worldW;
    (this.camera as any).worldHeight = worldH;

    this.tileHP = new TileHPTracker();
    this.tileHP.init(this.tilemap);

    // Assemble player tank from active loadout
    const loadout = getActiveLoadout();
    const playerDef = assembleLoadout(loadout);
    this.terrainCosts = getLoadoutTerrainCosts(loadout);

    // Spawn player first so playerId is available for damage listeners
    const spawn  = meta.spawnPoints[0] ?? { r: 1, c: 1 };
    const spawnX = (spawn.c + 0.5) * MAP_CONFIG.tileSize;
    const spawnY = (spawn.r + 0.5) * MAP_CONFIG.tileSize;
    this.playerId = createTank(this.entityManager, spawnX, spawnY, playerDef, ['tank', 'player']);

    this.buffSystem = new BuffSystem();

    initDamageListeners(this.eventBus, this.tileHP, this.tilemap);
    initEntityDamageListeners(this.entityManager, this.eventBus, this.playerId, this.buffSystem);

    // Phase 4 systems
    this.splashSys  = new SplashSystem(this.eventBus);
    this.splashSys.setEntityManager(this.entityManager);
    this.hitscanSys = new HitscanSystem();
    this.bombSys    = new BombSystem(this.eventBus);

    this.vfx             = new VFXManager(this.assets, this.camera, this.eventBus);
    this.damageState     = new DamageStateRenderer();
    this.projRenderer    = new ProjectileRenderer();
    this.infantryRenderer = new InfantryRenderer();
    this.drops       = new DropSystem(this.assets, this.eventBus, this.buffSystem);
    this.hud         = new HudRenderer(this.assets);
    this.slowMotion  = new SlowMotion();
    this.flowField   = new FlowField();

    this.vfx.setPlayerId(this.playerId, this.entityManager);
    this.camera.follow(this.playerId);
    this.camera.moveTo(spawnX, spawnY);

    this.waveSpawner = new WaveSpawner(
      this.entityManager, this.eventBus,
      meta.enemySpawns, MAP_CONFIG.tileSize,
      getSelectedDifficulty(),
    );

    // --- Item pickup handler ---
    this.eventBus.on('item:picked', (event: unknown) => {
      const e = event as { data?: { itemType: DropItemType; x: number; y: number } };
      const d = (e.data ?? e) as { itemType: DropItemType; x: number; y: number };
      if (!d) return;
      this.handleItemPickup(d.itemType);
    });

    this.eventBus.on('entity:killed', (event: unknown) => {
      const e = event as { data?: { entityId?: number; tags: string[]; x?: number; y?: number } };
      const d = (e.data ?? e) as { entityId?: number; tags: string[]; x?: number; y?: number };
      if (d?.tags?.includes('enemy')) {
        this.kills++;
        this.slowMotion.trigger(COMBAT_CONFIG.killSlowMo.scale, COMBAT_CONFIG.killSlowMo.duration);
        if (d.entityId !== undefined) {
          this.infantryRenderer.onEntityKilled(this.entityManager, d.entityId, d.x ?? 0, d.y ?? 0);
        }
      }
    });

    this.eventBus.on('entity:killed', (event: unknown) => {
      const e = event as { data?: { tags: string[] } };
      const d = (e.data ?? e) as { tags: string[] };
      if (d?.tags?.includes('player')) this.endGame(false);
    });

    this.eventBus.on('wave:starting', (event: unknown) => {
      const e = event as { data?: { waveNumber: number } };
      const d = (e.data ?? e) as { waveNumber: number };
      if (d) this.hud.showWaveBanner(d.waveNumber);
    });

    this.eventBus.on('game:won', () => this.endGame(true));

    this.waveSpawner.start();
  }

  private handleItemPickup(itemType: DropItemType): void {
    const polarity = ITEM_POLARITY[itemType];

    // Timed buff/debuff → delegate to BuffSystem
    if (polarity === 'buff' || polarity === 'debuff') {
      this.buffSystem.applyEffect(itemType);

      // Shield visual on TankParts (for TankRenderer cyan overlay)
      if (itemType === 'shield') {
        const tank = this.entityManager.getComponent(this.playerId, TANK_PARTS) as TankPartsComponent | undefined;
        const def = TIMED_BUFF_DEFS[itemType];
        if (tank && def) {
          tank.shieldElapsed = 0.001; // trigger visual
          tank.shieldDuration = def.durationS;
        }
      }
      return;
    }

    // Instant effects
    switch (itemType) {
      case 'hp': {
        const health = this.entityManager.getComponent(this.playerId, 'Health') as HealthComponent | undefined;
        if (health) health.current = Math.min(health.max, health.current + ITEM_EFFECTS.hp.amount);
        break;
      }
      case 'hp_debuff': {
        const health = this.entityManager.getComponent(this.playerId, 'Health') as HealthComponent | undefined;
        if (health) {
          health.current = Math.max(1, health.current - ITEM_EFFECTS.hp_debuff.damage);
          this.eventBus.fire('entity:damaged', {
            entityId: this.playerId,
            x: 0, y: 0,
            remaining: health.current,
            damage: ITEM_EFFECTS.hp_debuff.damage,
          });
        }
        break;
      }
      case 'ammo': {
        const weapon = this.entityManager.getComponent(this.playerId, WEAPON) as WeaponComponent | undefined;
        if (weapon) weapon.cooldownRemaining = 0;
        break;
      }
      case 'nuke': {
        // Kill all enemies on the field
        for (const id of this.entityManager.query('Health', 'Tag')) {
          const tags = this.entityManager.getComponent(id, 'Tag') as Set<string> | undefined;
          if (!tags?.has('enemy')) continue;
          const health = this.entityManager.getComponent(id, 'Health') as HealthComponent | undefined;
          if (health) {
            health.current = 0;
            const pos = this.entityManager.getComponent(id, 'Position') as { x: number; y: number } | undefined;
            this.eventBus.fire('entity:killed', {
              entityId: id,
              x: pos?.x ?? 0, y: pos?.y ?? 0,
              tags: Array.from(tags),
            });
            this.entityManager.destroy(id);
          }
        }
        this.camera.shake(COMBAT_CONFIG.killSlowMo.scale, COMBAT_CONFIG.killSlowMo.duration);
        break;
      }
      // 'coin' handled directly in DropSystem (counter increment)
    }
  }

  private endGame(won: boolean): void {
    if (this.phase !== 'playing') return;
    this.phase = 'game_over_transition';
    this.transitionWon = won;
    this.transitionTimer = 0;
    const cfg = COMBAT_CONFIG.gameOverTransition[won ? 'win' : 'lose'];
    this.slowMotion.trigger(cfg.slowMoScale, cfg.duration);
    setGameOverStats({ kills: this.kills, coins: this.drops.coinsCollected, wave: this.waveSpawner.waveNumber, won });
  }

  update(dt: number): void {
    if (this.phase === 'done') return;

    if (this.phase === 'game_over_transition') {
      this.transitionTimer += dt;
      this.slowMotion.update(dt);
      this.vfx.update(dt);
      this.damageState.update(this.entityManager, dt);
      this.camera.update(dt * this.slowMotion.scale);
      const cfg = COMBAT_CONFIG.gameOverTransition[this.transitionWon ? 'win' : 'lose'];
      if (this.transitionTimer >= cfg.duration) {
        this.phase = 'done';
        this.sceneManager.switchTo('GameOver');
      }
      return;
    }

    this.slowMotion.update(dt);
    const gameDt = dt * this.slowMotion.scale;

    // 1. FlowField recompute
    const playerPos = this.entityManager.getComponent(this.playerId, 'Position') as { x: number; y: number } | undefined;
    if (playerPos) {
      const tileR = Math.floor(playerPos.y / MAP_CONFIG.tileSize);
      const tileC = Math.floor(playerPos.x / MAP_CONFIG.tileSize);
      if (this.flowField.needsRecompute(tileR, tileC)) {
        this.flowField.compute(this.tilemap, tileR, tileC, this.terrainCosts);
      }
    }

    // 2. AI
    updateAI(this.entityManager, this.flowField, this.playerId, this.pool, this.eventBus, gameDt);

    // 3. Player movement (with buff modifiers)
    updateTankMovement(this.entityManager, this.input, this.camera, gameDt, this.buffSystem, this.tilemap, this.terrainCosts);

    // 4. All weapon fire modes + switching + bombs (with buff modifiers)
    updateWeapons(
      this.entityManager, this.input, this.pool, this.eventBus,
      this.hitscanSys, this.bombSys,
      this.tilemap, this.camera,
      gameDt,
      WEAPON_KEY_STATE,
      this.activeBombTypeRef,
      this.buffSystem,
    );

    // 5. Projectile movement + tile collision
    updateProjectiles(this.entityManager, this.pool, this.tilemap, this.eventBus, gameDt);

    // 6. Projectile vs entity collision (pierce-aware)
    checkEntityCollisions(this.entityManager, this.pool, this.eventBus);

    // 7. Bomb state machine
    this.bombSys.update(this.entityManager, gameDt);

    // 8. Splash indicator tick
    this.splashSys.update(dt);

    // 9. Hitscan beam lifetime
    this.hitscanSys.update(dt);

    // 10. Tile collision resolution
    resolveCollisionsAndMove(this.entityManager, this.tilemap, gameDt);

    // 11. Camera
    this.camera.update(gameDt);

    // 12. VFX + damage states + drops + buffs + HUD
    this.vfx.update(dt);
    this.projRenderer.update(this.entityManager, dt);
    updateTankVFXState(this.entityManager, dt);
    updateInfantryVFXState(this.entityManager, dt);
    this.infantryRenderer.update(dt);
    this.damageState.update(this.entityManager, dt);
    this.drops.update(this.entityManager, dt);
    this.buffSystem.update(dt);
    this.hud.update(dt);

    // 13. Wave spawner
    if (playerPos) {
      this.waveSpawner.update(dt, playerPos.x, playerPos.y);
    }
  }

  render(_alpha: number): void {
    const ctx = this.canvas.getContext('2d')!;
    const cam = this.camera.getTransform();

    ctx.save();
    ctx.translate(Math.round(cam.x), Math.round(cam.y));
    ctx.scale(cam.zoom, cam.zoom);

    drawTilemap(ctx, this.tilemap, this.camera, this.assets);
    this.drops.draw(ctx);
    this.projRenderer.draw(
      ctx, this.entityManager, this.assets,
      this.hitscanSys, this.splashSys, this.bombSys,
      this.tilemap, this.playerId,
    );
    drawTanks(ctx, this.entityManager, this.assets);
    const auraEffects = this.buffSystem.getActiveEffects();
    if (auraEffects.length > 0) {
      const auraPos = this.entityManager.getComponent(this.playerId, 'Position') as { x: number; y: number } | undefined;
      if (auraPos) drawPlayerAura(ctx, auraPos.x, auraPos.y, auraEffects);
    }
    this.infantryRenderer.draw(ctx, this.entityManager, this.assets);
    this.damageState.drawHullTint(ctx, this.entityManager, this.assets);
    this.damageState.drawSmoke(ctx);
    this.vfx.drawWorld(ctx);

    ctx.restore();

    // Screen-space HUD
    const health = this.entityManager.getComponent(this.playerId, 'Health') as HealthComponent | undefined;
    const weapon = this.entityManager.getComponent(this.playerId, WEAPON) as WeaponComponent | undefined;

    let chargeRatio: number | undefined;
    if (weapon?.def.behavior.kind === 'charge') {
      const beh = weapon.def.behavior as { kind: 'charge'; chargeMs: number };
      chargeRatio = weapon.isCharging ? Math.min(weapon.chargeElapsed / beh.chargeMs, 1) : 0;
    }

    let heatRatio: number | undefined;
    if (weapon?.def.behavior.kind === 'hitscan') {
      const beh = weapon.def.behavior;
      if (beh.continuousMode) {
        heatRatio = weapon.heatCurrent / beh.heatCapacity;
      }
    }

    let switchProgress: GameHUDState['switchProgress'];
    if (weapon && weapon.switchPhase !== 'none') {
      const phaseMs = weapon.switchPhase === 'stowing'
        ? weapon.def.switchOutMs
        : weapon.def.switchInMs;
      switchProgress = {
        ratio:       Math.min(weapon.switchElapsedMs / phaseMs, 1),
        phase:       weapon.switchPhase,
        pendingName: weapon.pendingDef?.name ?? weapon.def.name,
      };
    }

    const hudState: GameHUDState = {
      hp:              { current: health?.current ?? 0, max: health?.max ?? 1 },
      coins:           this.drops.coinsCollected,
      kills:           this.kills,
      wave:            this.waveSpawner.waveNumber,
      waveState:       this.waveSpawner.state,
      chargeRatio,
      heatRatio,
      weaponName:      weapon?.def.name,
      activeBombType:  this.activeBombTypeRef.value,
      activeEffects:   this.buffSystem.getActiveEffects(),
      switchProgress,
    };
    this.hud.draw(ctx, this.canvas.width, this.canvas.height, hudState);
    this.miniMap.draw(ctx, this.canvas.width, this.canvas.height, this.entityManager, this.playerId);

    if (this.phase === 'game_over_transition') {
      const fadeAlpha = Math.min(1, this.transitionTimer / COMBAT_CONFIG.gameOverTransition.fadeIn);
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  destroy(): void {
    for (const id of this.entityManager.query(PROJECTILE)) {
      this.entityManager.removeComponent(id, 'Position');
      this.entityManager.removeComponent(id, 'Velocity');
      this.entityManager.removeComponent(id, PROJECTILE);
    }
    this.pool.releaseAll('projectile');
    this.bombSys.clearAll(this.entityManager);
    for (const id of this.entityManager.query('Tag')) {
      this.entityManager.destroy(id);
    }
    this.eventBus.clear();
    this.buffSystem.reset();
    WEAPON_KEY_STATE.clear();
    super.destroy();
  }
}
