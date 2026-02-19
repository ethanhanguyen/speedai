import { Scene } from '@speedai/game-engine';
import type { UnifiedInput, SceneManager } from '@speedai/game-engine';
import { Button } from '@speedai/game-engine';
import { ENGINE_CONFIG } from '../config/EngineConfig.js';
import type { DifficultyLevel } from '../config/AIConfig.js';

const CW = ENGINE_CONFIG.canvas.width;
const CH = ENGINE_CONFIG.canvas.height;

const TITLE_FONT = 'bold 48px monospace';
const SUBTITLE_FONT = '14px monospace';
const DIFF_LABEL_FONT = '14px monospace';

// ---------------------------------------------------------------------------
// Module-level difficulty state (same pattern as GameOverScene stats)
// ---------------------------------------------------------------------------

let selectedDifficulty: DifficultyLevel = 'normal';

export function getSelectedDifficulty(): DifficultyLevel {
  return selectedDifficulty;
}

// ---------------------------------------------------------------------------
// Difficulty button definitions
// ---------------------------------------------------------------------------

interface DifficultyOption {
  level: DifficultyLevel;
  label: string;
  color: string;
  hoverColor: string;
  pressedColor: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { level: 'easy',   label: 'EASY',   color: '#4a7', hoverColor: '#5b8', pressedColor: '#396' },
  { level: 'normal', label: 'NORMAL', color: '#47a', hoverColor: '#58b', pressedColor: '#369' },
  { level: 'hard',   label: 'HARD',   color: '#a44', hoverColor: '#b55', pressedColor: '#933' },
];

export class MenuScene extends Scene {
  private playBtn!: Button;
  private diffButtons: Button[] = [];
  private wasPointerDown = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private input: UnifiedInput,
    private sceneManager: SceneManager,
  ) {
    super('Menu');
  }

  init(): void {
    selectedDifficulty = 'normal';

    // Difficulty buttons
    const diffBtnW = 100;
    const diffBtnH = 36;
    const diffGap = 16;
    const totalDiffW = DIFFICULTY_OPTIONS.length * diffBtnW + (DIFFICULTY_OPTIONS.length - 1) * diffGap;
    const diffStartX = (CW - totalDiffW) / 2;
    const diffY = CH / 2 + 10;

    this.diffButtons = DIFFICULTY_OPTIONS.map((opt, i) => {
      const btn = new Button({
        x: diffStartX + i * (diffBtnW + diffGap),
        y: diffY,
        width: diffBtnW,
        height: diffBtnH,
        label: opt.label,
        font: 'bold 16px monospace',
        textColor: '#fff',
        backgroundColor: opt.color,
        hoverColor: opt.hoverColor,
        pressedColor: opt.pressedColor,
        borderRadius: 6,
      });
      btn.on('click', () => {
        selectedDifficulty = opt.level;
      });
      return btn;
    });

    // Play button below difficulty row
    const btnW = 200;
    const btnH = 50;
    this.playBtn = new Button({
      x: (CW - btnW) / 2,
      y: diffY + diffBtnH + 24,
      width: btnW,
      height: btnH,
      label: 'PLAY',
      font: 'bold 24px monospace',
      textColor: '#fff',
      backgroundColor: '#4a7',
      hoverColor: '#5b8',
      pressedColor: '#396',
      borderRadius: 8,
    });
    this.playBtn.on('click', () => {
      this.sceneManager.switchTo('Garage');
    });
    this.wasPointerDown = false;
  }

  update(_dt: number): void {
    const pointer = this.input.getPointer();
    const allButtons = [...this.diffButtons, this.playBtn];

    for (const btn of allButtons) {
      btn.onPointerMove(pointer.x, pointer.y);
    }

    if (pointer.down && !this.wasPointerDown) {
      for (const btn of allButtons) {
        btn.onPointerDown(pointer.x, pointer.y);
      }
    }
    if (!pointer.down && this.wasPointerDown) {
      for (const btn of allButtons) {
        btn.onPointerUp(pointer.x, pointer.y);
      }
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
    ctx.font = TITLE_FONT;
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BATTLE TANK', CW / 2, CH / 2 - 60);

    ctx.font = SUBTITLE_FONT;
    ctx.fillStyle = '#888';
    ctx.fillText('Survive 5 waves', CW / 2, CH / 2 - 20);
    ctx.restore();

    // Difficulty label
    ctx.save();
    ctx.font = DIFF_LABEL_FONT;
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('DIFFICULTY', CW / 2, CH / 2 + 4);
    ctx.restore();

    // Difficulty buttons with selection indicator
    for (let i = 0; i < this.diffButtons.length; i++) {
      const btn = this.diffButtons[i];
      btn.draw(ctx);

      // Selection underline
      if (DIFFICULTY_OPTIONS[i].level === selectedDifficulty) {
        ctx.save();
        ctx.strokeStyle = DIFFICULTY_OPTIONS[i].color;
        ctx.lineWidth = 3;
        const bx = btn.x;
        const by = btn.y + btn.height + 3;
        ctx.beginPath();
        ctx.moveTo(bx + 8, by);
        ctx.lineTo(bx + btn.width - 8, by);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Play button
    this.playBtn.draw(ctx);
  }
}
