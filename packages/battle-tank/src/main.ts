import {
  Engine,
  CanvasRenderer,
  UnifiedInput,
  AssetManager,
  SceneManager,
  CameraSystem,
} from '@speedai/game-engine';
import { ENGINE_CONFIG } from './config/EngineConfig.js';
import { GameplayScene } from './scenes/GameplayScene.js';

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

  // --- Assets (individual PNGs, atlas deferred to Phase 2) ---
  const assets = new AssetManager();
  await Promise.all([
    // Tank
    assets.loadImage('hull-01', '/sprites/hulls/Hull_01.png'),
    assets.loadImage('track-1a', '/sprites/tracks/Track_1_A.png'),
    assets.loadImage('gun-01', '/sprites/weapons/Gun_01.png'),
    // Ground tiles
    assets.loadImage('ground-01a', '/sprites/tiles/Ground_Tile_01_A.png'),
    assets.loadImage('ground-01b', '/sprites/tiles/Ground_Tile_01_B.png'),
    assets.loadImage('ground-02a', '/sprites/tiles/Ground_Tile_02_A.png'),
    // Objects
    assets.loadImage('block-a01', '/sprites/tiles/Block_A_01.png'),
    assets.loadImage('block-b01', '/sprites/tiles/Block_B_01.png'),
    assets.loadImage('hedge-a01', '/sprites/tiles/Hedge_A_01.png'),
    assets.loadImage('container-a', '/sprites/tiles/Container_A.png'),
  ]);

  // --- Camera ---
  const camera = new CameraSystem({
    viewportWidth: ENGINE_CONFIG.canvas.width,
    viewportHeight: ENGINE_CONFIG.canvas.height,
  });
  engine.addSystem(camera);

  // --- Scenes ---
  const input = engine.input as UnifiedInput;
  const sceneManager = new SceneManager(engine.entities);
  const gameplay = new GameplayScene(canvas, assets, camera, input);
  sceneManager.register(gameplay);
  sceneManager.switchTo('Gameplay');

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
