import { Scene, Button, LocalStorageAdapter } from '@speedai/game-engine';

const SAVE_PREFIX = 'ball-crush';
const HIGH_SCORE_KEY = 'high_score';
const HIGH_LEVEL_KEY = 'high_level';

export class GameOverScene extends Scene {
  private restartButton!: Button;
  private wasPointerDown = false;
  private score = 0;
  private level = 1;
  private highScore = 0;
  private highLevel = 0;
  private saveManager: LocalStorageAdapter;

  constructor() {
    super('GameOver');
    this.saveManager = new LocalStorageAdapter(SAVE_PREFIX);
  }

  setResults(score: number, level: number): void {
    this.score = score;
    this.level = level;
  }

  init(): void {
    this.restartButton = new Button({
      x: 215 - 80,
      y: 520,
      width: 160,
      height: 55,
      label: 'Play Again',
      font: 'bold 24px Arial',
      backgroundColor: '#e74c3c',
      hoverColor: '#c0392b',
      textColor: '#ffffff',
      borderRadius: 12,
    });
    this.restartButton.on('click', () => this.emit('changeScene', 'Menu'));

    // Load and update high scores
    Promise.all([
      this.saveManager.load<number>(HIGH_SCORE_KEY),
      this.saveManager.load<number>(HIGH_LEVEL_KEY),
    ]).then(([savedScore, savedLevel]) => {
      this.highScore = savedScore ?? 0;
      this.highLevel = savedLevel ?? 0;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveManager.save(HIGH_SCORE_KEY, this.highScore);
      }
      if (this.level > this.highLevel) {
        this.highLevel = this.level;
        this.saveManager.save(HIGH_LEVEL_KEY, this.highLevel);
      }
    });
  }

  update(dt: number): void {
    const engine = (globalThis as any).gameEngine;
    if (engine?.input) {
      const pointer = engine.input.getPointer();
      this.restartButton.onPointerMove(pointer.x, pointer.y);
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

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, 430, 750);

    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 44px Arial';
    ctx.fillText('Game Over', 215, 200);

    // Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Score: ${this.score}`, 215, 300);

    ctx.font = '22px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`Level Reached: ${this.level}`, 215, 350);

    // High scores
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Best Score: ${this.highScore}`, 215, 420);
    ctx.fillText(`Best Level: ${this.highLevel}`, 215, 460);

    ctx.restore();
    this.restartButton.draw(ctx);
  }

  destroy(): void {
    this.restartButton.clear();
    this.destroyAllEntities();
  }
}
