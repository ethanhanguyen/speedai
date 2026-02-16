import { ScorePopupConfig } from '../config/ScorePopupConfig.js';
import { COLOR_HEX } from '../components/BallData.js';
import type { BallColor } from '../components/BallData.js';

interface FloatingText {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  scale: number;
  color: string;
  lifetime: number;
  elapsed: number;
}

export class FloatingTextManager {
  private texts: FloatingText[] = [];

  spawn(text: string, x: number, y: number, color: BallColor, cascadeLevel: number): void {
    const fontSize = Math.min(
      ScorePopupConfig.maxFontSize,
      ScorePopupConfig.baseFontSize * Math.pow(ScorePopupConfig.scaleMultiplier, cascadeLevel - 1),
    );

    this.texts.push({
      text,
      x,
      y,
      vx: 0,
      vy: -ScorePopupConfig.floatSpeed,
      alpha: 1,
      scale: fontSize / ScorePopupConfig.baseFontSize,
      color: COLOR_HEX[color],
      lifetime: ScorePopupConfig.fadeDuration,
      elapsed: 0,
    });
  }

  update(dt: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const text = this.texts[i];
      text.elapsed += dt;
      text.x += text.vx * dt;
      text.y += text.vy * dt;

      // Fade out
      const fadeProgress = text.elapsed / text.lifetime;
      text.alpha = Math.max(0, 1 - fadeProgress);

      // Remove expired
      if (text.elapsed >= text.lifetime) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cfg = ScorePopupConfig;

    for (const text of this.texts) {
      ctx.save();

      const fontSize = cfg.baseFontSize * text.scale;
      ctx.font = `${fontSize}px ${cfg.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = text.alpha;

      // Shadow
      ctx.shadowColor = cfg.shadow.color;
      ctx.shadowBlur = cfg.shadow.blur;
      ctx.shadowOffsetX = cfg.shadow.offsetX;
      ctx.shadowOffsetY = cfg.shadow.offsetY;

      // Outline
      ctx.strokeStyle = cfg.outline.color;
      ctx.lineWidth = cfg.outline.width;
      ctx.lineJoin = 'round';
      ctx.strokeText(text.text, text.x, text.y);

      // Fill
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);

      ctx.restore();
    }
  }

  clear(): void {
    this.texts = [];
  }
}
