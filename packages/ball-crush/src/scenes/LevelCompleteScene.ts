import { Scene, Button } from '@speedai/game-engine';

export class LevelCompleteScene extends Scene {
  private nextButton!: Button;
  private wasPointerDown = false;
  private score = 0;
  private level = 1;
  private bonusPoints = 0;
  private time = 0;

  constructor() {
    super('LevelComplete');
  }

  setResults(score: number, level: number, movesLeft: number): void {
    this.score = score;
    this.level = level;
    this.bonusPoints = movesLeft * 50;
  }

  init(): void {
    this.time = 0;
    this.nextButton = new Button({
      x: 215 - 80,
      y: 520,
      width: 160,
      height: 55,
      label: 'Next Level',
      font: 'bold 24px Arial',
      backgroundColor: '#2ecc71',
      hoverColor: '#27ae60',
      textColor: '#ffffff',
      borderRadius: 12,
    });
    this.nextButton.on('click', () => this.emit('nextLevel'));
  }

  update(dt: number): void {
    this.time += dt;
    const engine = (globalThis as any).gameEngine;
    if (engine?.input) {
      const pointer = engine.input.getPointer();
      this.nextButton.onPointerMove(pointer.x, pointer.y);
      if (pointer.down && !this.wasPointerDown) {
        this.nextButton.onPointerDown(pointer.x, pointer.y);
      }
      if (!pointer.down && this.wasPointerDown) {
        this.nextButton.onPointerUp(pointer.x, pointer.y);
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
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 44px Arial';
    ctx.fillText('Level Complete!', 215, 200);

    // Level
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Level ${this.level}`, 215, 280);

    // Score breakdown
    ctx.font = '22px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`Score: ${this.score}`, 215, 340);
    ctx.fillText(`Move Bonus: +${this.bonusPoints}`, 215, 380);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#2ecc71';
    ctx.fillText(`Total: ${this.score + this.bonusPoints}`, 215, 440);

    ctx.restore();
    this.nextButton.draw(ctx);
  }

  destroy(): void {
    this.nextButton.clear();
    this.destroyAllEntities();
  }
}
