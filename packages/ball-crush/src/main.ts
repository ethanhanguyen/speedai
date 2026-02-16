import {
  Engine,
  CanvasRenderer,
  SimplePhysics,
  UnifiedInput,
  SceneManager,
  TweenSystem,
  AssetManager,
} from '@speedai/game-engine';
import { MenuScene } from './scenes/MenuScene.js';
import { GameplayScene } from './scenes/GameplayScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

async function main() {
  const canvas = document.querySelector('#game') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element #game not found');

  // Load assets
  const assetManager = new AssetManager();
  assetManager.on('progress', (...args: unknown[]) => {
    const loaded = args[0] as number;
    const total = args[1] as number;
    console.log(`Loading assets: ${loaded}/${total}`);
  });

  await assetManager.loadAll([
    { key: 'atlas', type: 'atlas', src: '/atlas.json' },
  ]);

  // No processing needed - sprites are already transparent
  // await assetManager.processAtlas('atlas', {
  //   removeBg: { color: [255, 255, 255], tolerance: 30 }
  // });

  const atlas = assetManager.getAtlas('atlas');
  console.log('✓ Atlas loaded:', atlas?.frames.size, 'frames');

  const physics = new SimplePhysics();
  physics.gravity = { x: 0, y: 1200 };

  const engine = new Engine({
    canvas,
    width: 430,
    height: 750,
    renderer: new CanvasRenderer(),
    physics,
    input: new UnifiedInput(canvas),
    targetFPS: 60,
    maxEntities: 200,
    debug: false,
    pauseOnBlur: true,
    autoResize: true,
  });

  (globalThis as any).gameEngine = engine;

  // Add TweenSystem
  const tweenSystem = new TweenSystem();
  engine.addSystem(tweenSystem);

  // Scenes
  const sceneManager = new SceneManager(engine.entities);
  const menuScene = new MenuScene();
  const gameplayScene = new GameplayScene(tweenSystem, atlas ?? null);
  const levelCompleteScene = new LevelCompleteScene();
  const gameOverScene = new GameOverScene();

  sceneManager.register(menuScene);
  sceneManager.register(gameplayScene);
  sceneManager.register(levelCompleteScene);
  sceneManager.register(gameOverScene);

  // Track level/score state
  let currentLevel = 1;
  let totalScore = 0;

  // Scene transitions
  menuScene.on('changeScene', () => {
    currentLevel = 1;
    totalScore = 0;
    gameplayScene.setLevel(1);
    gameplayScene.setTotalScore(0);
    sceneManager.switchTo('Gameplay');
  });

  gameplayScene.on('levelComplete', (...args: unknown[]) => {
    const score = args[0] as number;
    const level = args[1] as number;
    const movesLeft = args[2] as number;
    totalScore = score;
    levelCompleteScene.setResults(score, level, movesLeft);
    sceneManager.switchTo('LevelComplete');
  });

  gameplayScene.on('gameOver', (...args: unknown[]) => {
    const score = args[0] as number;
    const level = args[1] as number;
    totalScore = score;
    gameOverScene.setResults(score, level);
    sceneManager.switchTo('GameOver');
  });

  levelCompleteScene.on('nextLevel', () => {
    currentLevel++;
    gameplayScene.setLevel(currentLevel);
    gameplayScene.setTotalScore(totalScore);
    sceneManager.switchTo('Gameplay');
  });

  gameOverScene.on('changeScene', () => {
    sceneManager.switchTo('Menu');
  });

  // Start
  sceneManager.switchTo('Menu');
  engine.start();

  let lastTime = performance.now();

  function gameLoop(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Update systems (TweenSystem)
    tweenSystem.update(dt);

    // Update current scene
    sceneManager.current?.update(dt);

    // Clear and render
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render current scene
    sceneManager.current?.render(0);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main().catch(console.error);
