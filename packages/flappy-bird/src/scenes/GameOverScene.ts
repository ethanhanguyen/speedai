import { Scene, ComponentFactory, Button, LocalStorageAdapter } from '@speedai/game-engine';

const HIGH_SCORE_KEY = 'flappy_high_score';

export class GameOverScene extends Scene {
  private restartButton!: Button;
  private score = 0;
  private highScore = 0;
  private saveManager: LocalStorageAdapter;
  private wasPointerDown = false;

  constructor() {
    super('GameOver');
    this.saveManager = new LocalStorageAdapter('flappy-bird');
  }

  setScore(score: number): void {
    this.score = score;
  }

  init(): void {
    // Background
    const bg = this.createEntity();
    this.entityManager.addComponent(bg, 'Position', ComponentFactory.position(187.5, 333.5));
    this.entityManager.addComponent(bg, 'Sprite', ComponentFactory.sprite('bg', 375, 667));

    // Ground tiles (static)
    const ground1 = this.createEntity();
    this.entityManager.addComponent(ground1, 'Position', ComponentFactory.position(168, 611));
    this.entityManager.addComponent(ground1, 'Sprite', ComponentFactory.sprite('ground', 336, 112));

    const ground2 = this.createEntity();
    this.entityManager.addComponent(ground2, 'Position', ComponentFactory.position(168 + 336, 611));
    this.entityManager.addComponent(ground2, 'Sprite', ComponentFactory.sprite('ground', 336, 112));

    // Restart button
    this.restartButton = new Button({
      x: 187.5 - 70, // Center the button (x - width/2)
      y: 450,
      width: 140,
      height: 50,
      label: 'Restart',
      font: 'bold 24px Arial',
      backgroundColor: '#4CAF50',
      hoverColor: '#45a049',
      textColor: '#ffffff',
    });

    // Handle button click
    this.restartButton.on('click', () => this.emit('changeScene', 'Gameplay'));

    // Load and update high score (async, non-blocking)
    this.saveManager.load<number>(HIGH_SCORE_KEY).then(saved => {
      this.highScore = saved ?? 0;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveManager.save(HIGH_SCORE_KEY, this.highScore);
      }
    });
  }

  update(dt: number): void {
    // Handle input for button
    const engine = (globalThis as any).gameEngine;
    if (engine?.input) {
      const pointer = engine.input.getPointer();
      this.restartButton.onPointerMove(pointer.x, pointer.y);

      // Track pointer down/up
      if (pointer.down && !this.wasPointerDown) {
        this.restartButton.onPointerDown(pointer.x, pointer.y);
      }
      if (!pointer.down && this.wasPointerDown) {
        this.restartButton.onPointerUp(pointer.x, pointer.y);
      }
      this.wasPointerDown = pointer.down;
    }
  }

  render(_alpha: number): void {
    const canvas = document.querySelector('#game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    // Game Over title
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('Game Over', 187.5, 200);
    ctx.fillText('Game Over', 187.5, 200);

    // Score
    ctx.font = 'bold 32px Arial';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${this.score}`, 187.5, 300);
    ctx.fillText(`Score: ${this.score}`, 187.5, 300);

    // High score
    ctx.font = 'bold 28px Arial';
    ctx.strokeText(`Best: ${this.highScore}`, 187.5, 360);
    ctx.fillText(`Best: ${this.highScore}`, 187.5, 360);
    ctx.restore();

    this.restartButton.draw(ctx);
  }

  destroy(): void {
    this.restartButton.clear();
    // Only destroy entities, don't clear event listeners (scene is reused)
    this.destroyAllEntities();
  }
}
