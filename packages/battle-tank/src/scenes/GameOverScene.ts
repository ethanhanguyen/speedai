import { Scene } from '@speedai/game-engine';
import type { UnifiedInput, SceneManager } from '@speedai/game-engine';
import { Button } from '@speedai/game-engine';
import type { GameOverStats } from '../config/GameStateTypes.js';
import { ENGINE_CONFIG } from '../config/EngineConfig.js';

const CW = ENGINE_CONFIG.canvas.width;
const CH = ENGINE_CONFIG.canvas.height;

/** Shared mutable stats — set before switching to this scene. */
let pendingStats: GameOverStats = { kills: 0, coins: 0, wave: 0, won: false };

export function setGameOverStats(stats: GameOverStats): void {
  pendingStats = stats;
}

export class GameOverScene extends Scene {
  private stats: GameOverStats = pendingStats;
  private playAgainBtn!: Button;
  private garageBtn!: Button;
  private menuBtn!: Button;
  private wasPointerDown = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private input: UnifiedInput,
    private sceneManager: SceneManager,
  ) {
    super('GameOver');
  }

  init(): void {
    this.stats = { ...pendingStats };
    const btnW = 150;
    const btnH = 44;
    const gap = 16;
    const totalW = btnW * 3 + gap * 2;
    const startX = (CW - totalW) / 2;
    const btnY = CH / 2 + 60;

    this.playAgainBtn = new Button({
      x: startX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: 'PLAY AGAIN',
      font: 'bold 18px monospace',
      backgroundColor: '#4a7',
      hoverColor: '#5b8',
      pressedColor: '#396',
      borderRadius: 6,
    });
    this.playAgainBtn.on('click', () => {
      this.sceneManager.switchTo('Gameplay');
    });

    this.garageBtn = new Button({
      x: startX + btnW + gap,
      y: btnY,
      width: btnW,
      height: btnH,
      label: 'GARAGE',
      font: 'bold 18px monospace',
      backgroundColor: '#47a',
      hoverColor: '#58b',
      pressedColor: '#369',
      borderRadius: 6,
    });
    this.garageBtn.on('click', () => {
      this.sceneManager.switchTo('Garage');
    });

    this.menuBtn = new Button({
      x: startX + (btnW + gap) * 2,
      y: btnY,
      width: btnW,
      height: btnH,
      label: 'MENU',
      font: 'bold 18px monospace',
      backgroundColor: '#555',
      hoverColor: '#666',
      pressedColor: '#444',
      borderRadius: 6,
    });
    this.menuBtn.on('click', () => {
      this.sceneManager.switchTo('Menu');
    });

    this.wasPointerDown = false;
  }

  update(_dt: number): void {
    const pointer = this.input.getPointer();
    const allButtons = [this.playAgainBtn, this.garageBtn, this.menuBtn];
    for (const btn of allButtons) btn.onPointerMove(pointer.x, pointer.y);

    if (pointer.down && !this.wasPointerDown) {
      for (const btn of allButtons) btn.onPointerDown(pointer.x, pointer.y);
    }
    if (!pointer.down && this.wasPointerDown) {
      for (const btn of allButtons) btn.onPointerUp(pointer.x, pointer.y);
    }
    this.wasPointerDown = pointer.down;
  }

  render(_alpha: number): void {
    const ctx = this.canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CW, CH);

    // Title
    ctx.save();
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = this.stats.won ? '#4a7' : '#c44';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.stats.won ? 'VICTORY' : 'GAME OVER', CW / 2, CH / 2 - 80);

    // Stats
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ddd';
    const lines = [
      `Wave reached: ${this.stats.wave}`,
      `Enemies killed: ${this.stats.kills}`,
      `Coins collected: ${this.stats.coins}`,
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, CW / 2, CH / 2 - 20 + i * 24);
    });
    ctx.restore();

    // Buttons
    this.playAgainBtn.draw(ctx);
    this.garageBtn.draw(ctx);
    this.menuBtn.draw(ctx);
  }
}
