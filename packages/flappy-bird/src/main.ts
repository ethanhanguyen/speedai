import {
  Engine,
  CanvasRenderer,
  SimplePhysics,
  UnifiedInput,
  AssetManager,
  SceneManager,
} from '@speedai/game-engine';
import { BirdPhysicsSystem } from './systems/BirdPhysicsSystem.js';
import { ScrollSystem } from './systems/ScrollSystem.js';
import { PipeSpawnerSystem } from './systems/PipeSpawnerSystem.js';
import { VelocityIntegrationSystem } from './systems/VelocityIntegrationSystem.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameplayScene } from './scenes/GameplayScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

async function main() {
  // Create canvas
  const canvas = document.querySelector('#game') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element #game not found');
  }

  // Initialize engine
  const physics = new SimplePhysics();
  physics.gravity = { x: 0, y: 980 };

  const engine = new Engine({
    canvas,
    width: 375,
    height: 667,
    renderer: new CanvasRenderer(),
    physics,
    input: new UnifiedInput(canvas),
    targetFPS: 60,
    maxEntities: 50,
    debug: false,
    pauseOnBlur: true,
    autoResize: true,
  });

  // Store engine reference globally for input access
  (globalThis as any).gameEngine = engine;

  // Load assets
  const assetManager = new AssetManager();
  await assetManager.loadImage('bird', '/src/assets/sprites/bird.png');
  await assetManager.loadImage('pipe', '/src/assets/sprites/pipe.png');
  await assetManager.loadImage('ground', '/src/assets/sprites/ground.png');
  await assetManager.loadImage('bg', '/src/assets/sprites/bg.png');

  // Process sprites: remove white backgrounds and downscale to display size
  await assetManager.processImage('bird', { maxWidth: 34, maxHeight: 24, removeBg: {} });
  await assetManager.processImage('pipe', { maxWidth: 52, maxHeight: 320, removeBg: {} });
  await assetManager.processImage('ground', { maxWidth: 336, maxHeight: 112, removeBg: {} });
  await assetManager.processImage('bg', { maxWidth: 375, maxHeight: 667 });

  // Add systems
  const pipeSpawner = new PipeSpawnerSystem();
  engine.addSystem(new VelocityIntegrationSystem());
  engine.addSystem(new BirdPhysicsSystem());
  engine.addSystem(new ScrollSystem());
  engine.addSystem(pipeSpawner);

  // Setup scenes
  const sceneManager = new SceneManager(engine.entities);
  const menuScene = new MenuScene();
  const gameplayScene = new GameplayScene(pipeSpawner);
  const gameOverScene = new GameOverScene();

  sceneManager.register(menuScene);
  sceneManager.register(gameplayScene);
  sceneManager.register(gameOverScene);

  // Scene transitions
  menuScene.on('changeScene', (...args: unknown[]) => sceneManager.switchTo(args[0] as string));
  gameplayScene.on('changeScene', (...args: unknown[]) => sceneManager.switchTo(args[0] as string));
  gameplayScene.on('gameOver', (...args: unknown[]) => gameOverScene.setScore(args[0] as number));
  gameOverScene.on('changeScene', (...args: unknown[]) => sceneManager.switchTo(args[0] as string));

  // Start with menu
  sceneManager.switchTo('Menu');

  // Game loop
  engine.start();
  let lastTime = performance.now();

  function gameLoop(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Update current scene
    sceneManager.current?.update(dt);

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render sprites
    const allEntities = engine.entities.query('Position', 'Sprite');
    for (const id of allEntities) {
      const pos = engine.entities.getComponent(id, 'Position') as { x: number; y: number };
      const sprite = engine.entities.getComponent(id, 'Sprite') as any;

      if (!sprite.visible) continue;

      const img = assetManager.getImage(sprite.key);
      if (img) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(sprite.rotation);
        ctx.scale(sprite.scaleX, sprite.scaleY);
        ctx.globalAlpha = sprite.alpha;
        ctx.drawImage(
          img,
          -sprite.width * sprite.anchorX,
          -sprite.height * sprite.anchorY,
          sprite.width,
          sprite.height
        );
        ctx.restore();
      }
    }

    // Render current scene
    sceneManager.current?.render(0);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main().catch(console.error);
