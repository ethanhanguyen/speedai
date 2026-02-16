import { Scene, Button } from '@speedai/game-engine';

export class MenuScene extends Scene {
  private playButton!: Button;
  private wasPointerDown = false;
  private time = 0;

  constructor() {
    super('Menu');
  }

  init(): void {
    this.time = 0;

    this.playButton = new Button({
      x: 215 - 70,
      y: 420,
      width: 140,
      height: 55,
      label: 'Play',
      font: 'bold 28px Arial',
      backgroundColor: '#e74c3c',
      hoverColor: '#c0392b',
      textColor: '#ffffff',
      borderRadius: 12,
    });

    this.playButton.on('click', () => this.emit('changeScene', 'Gameplay'));
  }

  update(dt: number): void {
    this.time += dt;
    const engine = (globalThis as any).gameEngine;
    if (engine?.input) {
      const pointer = engine.input.getPointer();
      this.playButton.onPointerMove(pointer.x, pointer.y);
      if (pointer.down && !this.wasPointerDown) {
        this.playButton.onPointerDown(pointer.x, pointer.y);
      }
      if (!pointer.down && this.wasPointerDown) {
        this.playButton.onPointerUp(pointer.x, pointer.y);
      }
      this.wasPointerDown = pointer.down;
    }
  }

  render(_alpha: number): void {
    const canvas = document.querySelector('#game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, 750);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(0.5, '#16213e');
    bg.addColorStop(1, '#0f3460');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 430, 750);

    // Animated floating balls in background
    this.drawDecoBalls(ctx);

    // Title
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 4;
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleY = 200 + Math.sin(this.time * 2) * 5;
    ctx.strokeText('Ball Crush', 215, titleY);
    ctx.fillText('Ball Crush', 215, titleY);

    // Subtitle
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Match 3 or more balls!', 215, 260);
    ctx.restore();

    this.playButton.draw(ctx);
  }

  private drawDecoBalls(ctx: CanvasRenderingContext2D): void {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
    for (let i = 0; i < 12; i++) {
      const phase = i * 1.3 + this.time * 0.5;
      const x = 215 + Math.sin(phase * 0.7 + i) * 150;
      const y = 375 + Math.cos(phase * 0.5 + i * 0.8) * 250;
      const r = 10 + Math.sin(phase) * 3;
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  destroy(): void {
    this.playButton.clear();
    this.destroyAllEntities();
  }
}
