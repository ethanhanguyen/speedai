import {
  Engine,
  CanvasRenderer,
  UnifiedInput,
  AssetManager,
  SceneManager,
  CameraSystem,
  ObjectPoolSystem,
  EventBus,
} from '@speedai/game-engine';
import { ENGINE_CONFIG } from './config/EngineConfig.js';
import { COMBAT_CONFIG } from './config/CombatConfig.js';
import { GameplayScene } from './scenes/GameplayScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { GarageScene } from './scenes/GarageScene.js';
import { MapSelectScene } from './scenes/MapSelectScene.js';

async function main() {
  const canvas = document.querySelector('#game') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element #game not found');

  // --- Engine ---
  const engine = new Engine({
    canvas,
    width: ENGINE_CONFIG.canvas.width,
    height: ENGINE_CONFIG.canvas.height,
    renderer: new CanvasRenderer(),
    input: new UnifiedInput(canvas),
    targetFPS: ENGINE_CONFIG.targetFPS,
    maxEntities: ENGINE_CONFIG.maxEntities,
    debug: false,
    pauseOnBlur: true,
    autoResize: true,
  });

  // --- Assets ---
  const assets = new AssetManager();
  await Promise.all([
    // Hulls (8)
    assets.loadImage('hull-01', '/sprites/hulls/Hull_01.png'),
    assets.loadImage('hull-02', '/sprites/hulls/Hull_02.png'),
    assets.loadImage('hull-03', '/sprites/hulls/Hull_03.png'),
    assets.loadImage('hull-04', '/sprites/hulls/Hull_04.png'),
    assets.loadImage('hull-05', '/sprites/hulls/Hull_05.png'),
    assets.loadImage('hull-06', '/sprites/hulls/Hull_06.png'),
    assets.loadImage('hull-07', '/sprites/hulls/Hull_07.png'),
    assets.loadImage('hull-08', '/sprites/hulls/Hull_08.png'),
    // Tracks (8 — 4 types × A/B variants)
    assets.loadImage('track-1a', '/sprites/tracks/Track_1_A.png'),
    assets.loadImage('track-1b', '/sprites/tracks/Track_1_B.png'),
    assets.loadImage('track-2a', '/sprites/tracks/Track_2_A.png'),
    assets.loadImage('track-2b', '/sprites/tracks/Track_2_B.png'),
    assets.loadImage('track-3a', '/sprites/tracks/Track_3_A.png'),
    assets.loadImage('track-3b', '/sprites/tracks/Track_3_B.png'),
    assets.loadImage('track-4a', '/sprites/tracks/Track_4_A.png'),
    assets.loadImage('track-4b', '/sprites/tracks/Track_4_B.png'),
    // Guns (8)
    assets.loadImage('gun-01', '/sprites/weapons/Gun_01.png'),
    assets.loadImage('gun-02', '/sprites/weapons/Gun_02.png'),
    assets.loadImage('gun-03', '/sprites/weapons/Gun_03.png'),
    assets.loadImage('gun-04', '/sprites/weapons/Gun_04.png'),
    assets.loadImage('gun-05', '/sprites/weapons/Gun_05.png'),
    assets.loadImage('gun-06', '/sprites/weapons/Gun_06.png'),
    assets.loadImage('gun-07', '/sprites/weapons/Gun_07.png'),
    assets.loadImage('gun-08', '/sprites/weapons/Gun_08.png'),
    // Ground tiles (placeholder — kept for tile layer rendering)
    assets.loadImage('ground-01a', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('ground-01b', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('ground-02a', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('ground-winter', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('ground-water', '/sprites/obstacles/tank_hull_wreckage.png'),
    // Obstacles
    assets.loadImage('concrete_bunker_perfect', '/sprites/obstacles/concrete_bunker_perfect.png'),
    assets.loadImage('concrete_bunker_half', '/sprites/obstacles/concrete_bunker_half.png'),
    assets.loadImage('concrete_bunker_destroyed', '/sprites/obstacles/concrete_bunker_destroyed.png'),
    assets.loadImage('container_bunker_perfect', '/sprites/obstacles/container_bunker_perfect.png'),
    assets.loadImage('container_bunker_half', '/sprites/obstacles/container_bunker_half.png'),
    assets.loadImage('container_bunker_destroyed', '/sprites/obstacles/container_bunker_destroyed.png'),
    assets.loadImage('sandbag_bunker_perfect', '/sprites/obstacles/sandbag_bunker_perfect.png'),
    assets.loadImage('sandbag_bunker_half', '/sprites/obstacles/sandbag_bunker_half.png'),
    assets.loadImage('sandbag_bunker_destroyed', '/sprites/obstacles/sandbag_bunker_destroyed.png'),
    assets.loadImage('tank_hull_wreckage', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('helicopter_wreckage', '/sprites/obstacles/helicopter_wreckage.png'),
    assets.loadImage('ammo_crate_base', '/sprites/obstacles/ammo_crate_base.png'),
    assets.loadImage('ammo_crate_legend', '/sprites/obstacles/ammo_crate_legend.png'),
    assets.loadImage('ammo_crate_premium', '/sprites/obstacles/ammo_crate_premium.png'),
    assets.loadImage('barrel_blue', '/sprites/obstacles/barrel_blue.png'),
    assets.loadImage('barrel_red', '/sprites/obstacles/barrel_red.png'),
    assets.loadImage('barrel_yellow', '/sprites/obstacles/barrel_yellow.png'),
    assets.loadImage('dynamite_box', '/sprites/obstacles/dynamite_box.png'),
    // Legacy object keys (mapped to obstacles for compatibility)
    assets.loadImage('block-a01', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('block-b01', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('container-a', '/sprites/obstacles/container_bunker_perfect.png'),
    assets.loadImage('container-b', '/sprites/obstacles/container_bunker_perfect.png'),
    assets.loadImage('container-c', '/sprites/obstacles/container_bunker_perfect.png'),
    assets.loadImage('container-d', '/sprites/obstacles/container_bunker_perfect.png'),
    assets.loadImage('hedgehog-a',  '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('hedgehog-b',  '/sprites/obstacles/tank_hull_wreckage.png'),
    // Legacy decor keys (no longer used — kept for safety)
    assets.loadImage('decor-blast-1', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-blast-2', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-blast-3', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-blast-4', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-blast-5', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-blast-6', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-border-a', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-border-b', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-border-c', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-puddle-1', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-puddle-2', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-puddle-3', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-puddle-4', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-puddle-5', '/sprites/obstacles/tank_hull_wreckage.png'),
    assets.loadImage('decor-puddle-6', '/sprites/obstacles/tank_hull_wreckage.png'),
    // Projectile shells (7 types)
    assets.loadImage('medium-shell',   '/sprites/effects/Medium_Shell.png'),
    assets.loadImage('light-shell',    '/sprites/effects/Light_Shell.png'),
    assets.loadImage('heavy-shell',    '/sprites/effects/Heavy_Shell.png'),
    assets.loadImage('sniper-shell',   '/sprites/effects/Sniper_Shell.png'),
    assets.loadImage('grenade-shell',  '/sprites/effects/Granade_Shell.png'),
    assets.loadImage('shotgun-shells', '/sprites/effects/Shotgun_Shells.png'),
    assets.loadImage('plasma',         '/sprites/effects/Plasma.png'),
    assets.loadImage('laser-beam',     '/sprites/effects/Laser.png'),
    // Muzzle flash (4 frames)
    assets.loadImage('muzzle-flash-0', '/sprites/effects/Sprite_Fire_Shots_Shot_A_000.png'),
    assets.loadImage('muzzle-flash-1', '/sprites/effects/Sprite_Fire_Shots_Shot_A_001.png'),
    assets.loadImage('muzzle-flash-2', '/sprites/effects/Sprite_Fire_Shots_Shot_A_002.png'),
    assets.loadImage('muzzle-flash-3', '/sprites/effects/Sprite_Fire_Shots_Shot_A_003.png'),
    // Impact (4 frames)
    assets.loadImage('impact-0', '/sprites/effects/Sprite_Fire_Shots_Impact_A_000.png'),
    assets.loadImage('impact-1', '/sprites/effects/Sprite_Fire_Shots_Impact_A_001.png'),
    assets.loadImage('impact-2', '/sprites/effects/Sprite_Fire_Shots_Impact_A_002.png'),
    assets.loadImage('impact-3', '/sprites/effects/Sprite_Fire_Shots_Impact_A_003.png'),
    // Bomb explosions (10 frames)
    assets.loadImage('explosion-bomb-0', '/sprites/effects/explosion_bomb_000.png'),
    assets.loadImage('explosion-bomb-1', '/sprites/effects/explosion_bomb_001.png'),
    assets.loadImage('explosion-bomb-2', '/sprites/effects/explosion_bomb_002.png'),
    assets.loadImage('explosion-bomb-3', '/sprites/effects/explosion_bomb_003.png'),
    assets.loadImage('explosion-bomb-4', '/sprites/effects/explosion_bomb_004.png'),
    assets.loadImage('explosion-bomb-5', '/sprites/effects/explosion_bomb_005.png'),
    assets.loadImage('explosion-bomb-6', '/sprites/effects/explosion_bomb_006.png'),
    assets.loadImage('explosion-bomb-7', '/sprites/effects/explosion_bomb_007.png'),
    assets.loadImage('explosion-bomb-8', '/sprites/effects/explosion_bomb_008.png'),
    assets.loadImage('explosion-bomb-9', '/sprites/effects/explosion_bomb_009.png'),
    // Laser explosions (11 frames)
    assets.loadImage('explosion-laser-0', '/sprites/effects/explosion_laser_000.png'),
    assets.loadImage('explosion-laser-1', '/sprites/effects/explosion_laser_001.png'),
    assets.loadImage('explosion-laser-2', '/sprites/effects/explosion_laser_002.png'),
    assets.loadImage('explosion-laser-3', '/sprites/effects/explosion_laser_003.png'),
    assets.loadImage('explosion-laser-4', '/sprites/effects/explosion_laser_004.png'),
    assets.loadImage('explosion-laser-5', '/sprites/effects/explosion_laser_005.png'),
    assets.loadImage('explosion-laser-6', '/sprites/effects/explosion_laser_006.png'),
    assets.loadImage('explosion-laser-7', '/sprites/effects/explosion_laser_007.png'),
    assets.loadImage('explosion-laser-8', '/sprites/effects/explosion_laser_008.png'),
    assets.loadImage('explosion-laser-9', '/sprites/effects/explosion_laser_009.png'),
    assets.loadImage('explosion-laser-10', '/sprites/effects/explosion_laser_010.png'),
    // Plasma explosions (10 frames)
    assets.loadImage('explosion-plasma-0', '/sprites/effects/explosion_plasma_000.png'),
    assets.loadImage('explosion-plasma-1', '/sprites/effects/explosion_plasma_001.png'),
    assets.loadImage('explosion-plasma-2', '/sprites/effects/explosion_plasma_002.png'),
    assets.loadImage('explosion-plasma-3', '/sprites/effects/explosion_plasma_003.png'),
    assets.loadImage('explosion-plasma-4', '/sprites/effects/explosion_plasma_004.png'),
    assets.loadImage('explosion-plasma-5', '/sprites/effects/explosion_plasma_005.png'),
    assets.loadImage('explosion-plasma-6', '/sprites/effects/explosion_plasma_006.png'),
    assets.loadImage('explosion-plasma-7', '/sprites/effects/explosion_plasma_007.png'),
    assets.loadImage('explosion-plasma-8', '/sprites/effects/explosion_plasma_008.png'),
    assets.loadImage('explosion-plasma-9', '/sprites/effects/explosion_plasma_009.png'),
    // Nuclear explosions (11 frames) — reserved for future airplane nuclear bomb
    assets.loadImage('explosion-nuclear-0', '/sprites/effects/explosion_nuclear_000.png'),
    assets.loadImage('explosion-nuclear-1', '/sprites/effects/explosion_nuclear_001.png'),
    assets.loadImage('explosion-nuclear-2', '/sprites/effects/explosion_nuclear_002.png'),
    assets.loadImage('explosion-nuclear-3', '/sprites/effects/explosion_nuclear_003.png'),
    assets.loadImage('explosion-nuclear-4', '/sprites/effects/explosion_nuclear_004.png'),
    assets.loadImage('explosion-nuclear-5', '/sprites/effects/explosion_nuclear_005.png'),
    assets.loadImage('explosion-nuclear-6', '/sprites/effects/explosion_nuclear_006.png'),
    assets.loadImage('explosion-nuclear-7', '/sprites/effects/explosion_nuclear_007.png'),
    assets.loadImage('explosion-nuclear-8', '/sprites/effects/explosion_nuclear_008.png'),
    assets.loadImage('explosion-nuclear-9', '/sprites/effects/explosion_nuclear_009.png'),
    assets.loadImage('explosion-nuclear-10', '/sprites/effects/explosion_nuclear_010.png'),
    // Coin animation (8 frames)
    assets.loadImage('coin-0', '/sprites/coins/Gold_1.png'),
    assets.loadImage('coin-1', '/sprites/coins/Gold_2.png'),
    assets.loadImage('coin-2', '/sprites/coins/Gold_3.png'),
    assets.loadImage('coin-3', '/sprites/coins/Gold_4.png'),
    assets.loadImage('coin-4', '/sprites/coins/Gold_5.png'),
    assets.loadImage('coin-5', '/sprites/coins/Gold_6.png'),
    assets.loadImage('coin-6', '/sprites/coins/Gold_7.png'),
    assets.loadImage('coin-7', '/sprites/coins/Gold_8.png'),
    // Infantry sprite sheets — Pack 5 (Soldier_1=MG, Soldier_2=Shotgun, Soldier_3=Rifled)
    assets.loadImage('infantry-s1-idle',   '/sprites/infantry/Soldier_1/Idle.png'),
    assets.loadImage('infantry-s1-walk',   '/sprites/infantry/Soldier_1/Walk.png'),
    assets.loadImage('infantry-s1-run',    '/sprites/infantry/Soldier_1/Run.png'),
    assets.loadImage('infantry-s1-shot',   '/sprites/infantry/Soldier_1/Shot_1.png'),
    assets.loadImage('infantry-s1-reload', '/sprites/infantry/Soldier_1/Recharge.png'),
    assets.loadImage('infantry-s1-hurt',   '/sprites/infantry/Soldier_1/Hurt.png'),
    assets.loadImage('infantry-s1-dead',   '/sprites/infantry/Soldier_1/Dead.png'),
    assets.loadImage('infantry-s2-idle',   '/sprites/infantry/Soldier_2/Idle.png'),
    assets.loadImage('infantry-s2-walk',   '/sprites/infantry/Soldier_2/Walk.png'),
    assets.loadImage('infantry-s2-run',    '/sprites/infantry/Soldier_2/Run.png'),
    assets.loadImage('infantry-s2-shot',   '/sprites/infantry/Soldier_2/Shot_1.png'),
    assets.loadImage('infantry-s2-reload', '/sprites/infantry/Soldier_2/Recharge.png'),
    assets.loadImage('infantry-s2-hurt',   '/sprites/infantry/Soldier_2/Hurt.png'),
    assets.loadImage('infantry-s2-dead',   '/sprites/infantry/Soldier_2/Dead.png'),
    assets.loadImage('infantry-s3-idle',   '/sprites/infantry/Soldier_3/Idle.png'),
    assets.loadImage('infantry-s3-walk',   '/sprites/infantry/Soldier_3/Walk.png'),
    assets.loadImage('infantry-s3-run',    '/sprites/infantry/Soldier_3/Run.png'),
    assets.loadImage('infantry-s3-shot',   '/sprites/infantry/Soldier_3/Shot_1.png'),
    assets.loadImage('infantry-s3-reload', '/sprites/infantry/Soldier_3/Recharge.png'),
    assets.loadImage('infantry-s3-hurt',   '/sprites/infantry/Soldier_3/Hurt.png'),
    assets.loadImage('infantry-s3-dead',   '/sprites/infantry/Soldier_3/Dead.png'),

    // Drop world sprites (*_Bonus.png / *_Debuff.png)
    assets.loadImage('drop-hp',              '/sprites/icons/HP_Bonus.png'),
    assets.loadImage('drop-ammo',            '/sprites/icons/Ammunition_Bonus.png'),
    assets.loadImage('drop-nuke',            '/sprites/icons/Nuke_Bonus.png'),
    assets.loadImage('drop-shield',          '/sprites/icons/Shield_Bonus.png'),
    assets.loadImage('drop-attack',          '/sprites/icons/Attack_Bonus.png'),
    assets.loadImage('drop-speed',           '/sprites/icons/Speed_Bonus.png'),
    assets.loadImage('drop-magnet',          '/sprites/icons/Magnet_Bonus.png'),
    assets.loadImage('drop-armor',           '/sprites/icons/Armor_Bonus.png'),
    assets.loadImage('drop-hp-debuff',       '/sprites/icons/HP_Debuff.png'),
    assets.loadImage('drop-speed-debuff',    '/sprites/icons/Speed_Debuff.png'),
    assets.loadImage('drop-armor-debuff',    '/sprites/icons/Armor_Debuff.png'),
    assets.loadImage('drop-ammo-debuff',     '/sprites/icons/Ammunition_Debuff.png'),
    assets.loadImage('drop-mobility-debuff', '/sprites/icons/Mobility_Debuff.png'),
    // HUD buff/debuff icons (*_Icon.png)
    assets.loadImage('icon-hp',       '/sprites/icons/HP_Icon.png'),
    assets.loadImage('icon-ammo',     '/sprites/icons/Ammunition_Icon.png'),
    assets.loadImage('icon-nuke',     '/sprites/icons/Nuke_Icon.png'),
    assets.loadImage('icon-shield',   '/sprites/icons/Shield_Icon.png'),
    assets.loadImage('icon-attack',   '/sprites/icons/Attack_Icon.png'),
    assets.loadImage('icon-speed',    '/sprites/icons/Speed_Icon.png'),
    assets.loadImage('icon-magnet',   '/sprites/icons/Magnet_Icon.png'),
    assets.loadImage('icon-armor',    '/sprites/icons/Armor_Icon.png'),
    assets.loadImage('icon-mobility', '/sprites/icons/Mobility_Icon.png'),

    // Boss sprites (Phase 6)
    assets.loadImage('hull-warden',       '/sprites/bosses/Hull_Warden.png'),
    assets.loadImage('gun-warden',        '/sprites/bosses/Gun_Warden.png'),
    assets.loadImage('hull-scorpion',     '/sprites/bosses/Hull_Scorpion.png'),
    assets.loadImage('gun-scorpion',      '/sprites/bosses/Gun_Scorpion.png'),
    assets.loadImage('hull-fortress',     '/sprites/bosses/Hull_Fortress.png'),
    assets.loadImage('gun-fortress',      '/sprites/bosses/Gun_Fortress.png'),
    // Air unit sprites (Phase 6)
    assets.loadImage('heli-scout-body',   '/sprites/airforce/helicopter_scout_body_1.png'),
    assets.loadImage('heli-scout-blade',  '/sprites/airforce/helicopter_scout_blade_1.png'),
    assets.loadImage('heli-combat-body',  '/sprites/airforce/helicopter_combat_body_1.png'),
    assets.loadImage('heli-combat-blade', '/sprites/airforce/helicopter_combat_blade_1.png'),
    assets.loadImage('bomber-plane',      '/sprites/airforce/bombing_plane_1.png'),
  ]);

  // --- Camera ---
  const camera = new CameraSystem({
    viewportWidth: ENGINE_CONFIG.canvas.width,
    viewportHeight: ENGINE_CONFIG.canvas.height,
  });
  engine.addSystem(camera);

  // --- Object Pool (projectiles) ---
  const pool = new ObjectPoolSystem();
  engine.addSystem(pool);
  pool.registerPool({
    name: 'projectile',
    maxSize: COMBAT_CONFIG.projectilePoolSize,
    components: [],
  });

  // --- Event Bus ---
  const eventBus = new EventBus();

  // --- Scenes ---
  const input = engine.input as UnifiedInput;
  const sceneManager = new SceneManager(engine.entities);

  const menu = new MenuScene(canvas, input, sceneManager);
  const garage = new GarageScene(canvas, assets, input, sceneManager);
  const mapSelect = new MapSelectScene(canvas, input, sceneManager);
  const gameplay = new GameplayScene(canvas, assets, camera, input, pool, eventBus, sceneManager);
  const gameOver = new GameOverScene(canvas, input, sceneManager);

  sceneManager.register(menu);
  sceneManager.register(garage);
  sceneManager.register(mapSelect);
  sceneManager.register(gameplay);
  sceneManager.register(gameOver);
  sceneManager.switchTo('Menu');

  // --- Game loop ---
  engine.start();
  let lastTime = performance.now();

  function gameLoop(time: number) {
    const dt = Math.min((time - lastTime) / 1000, ENGINE_CONFIG.maxDeltaTime);
    lastTime = time;

    sceneManager.current?.update(dt);

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sceneManager.current?.render(0);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main().catch(console.error);
