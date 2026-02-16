import { COLOR_HEX, COLOR_LIGHT, SPECIAL_COLORS } from '../components/BallData.js';
import type { BallColor, SpecialType } from '../components/BallData.js';
import { CELL_SIZE, CELL_GAP, BOARD_X, BOARD_Y, ROWS, COLS } from '../grid/Grid.js';
import { VisualConfig } from '../config/VisualConfig.js';
import type { CellTypeDef } from '../config/CellTypes.js';
import { SpriteConfig } from '../config/SpriteConfig.js';
import { FrameAnimator, type AtlasData } from '@speedai/game-engine';

export class BallRenderer {
  private atlas: AtlasData | null = null;

  /** Set atlas for sprite rendering */
  setAtlas(atlas: AtlasData | null): void {
    this.atlas = atlas;
  }

  /** Draw grid cell backgrounds (using sprite or procedural). */
  drawGridCells(ctx: CanvasRenderingContext2D): void {
    const cellFrame = this.getAtlasFrame(SpriteConfig.getUIFrame('cell'));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = BOARD_X + c * (CELL_SIZE + CELL_GAP);
        const y = BOARD_Y + r * (CELL_SIZE + CELL_GAP);

        if (cellFrame) {
          this.drawAtlasFrame(ctx, cellFrame, x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
        } else {
          // Fallback: procedural
          const cfg = VisualConfig.cell;
          ctx.fillStyle = `rgba(255,255,255,${cfg.backgroundAlpha})`;
          ctx.beginPath();
          ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, cfg.borderRadius);
          ctx.fill();
        }
      }
    }
  }

  /** Draw a ball at pixel position (cx, cy). */
  drawBall(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: BallColor | null,
    special: SpecialType = 'none',
    scale: number = 1,
    alpha: number = 1,
    time: number = 0,
    row: number = 0,
  ): void {
    if (!color) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);

    // Breathing animation
    const breatheCfg = VisualConfig.idleAnimations.breathe;
    const breatheScale = 1 + Math.sin(time * breatheCfg.speed + row * breatheCfg.rowStagger) * breatheCfg.scale;
    ctx.scale(scale * breatheScale, scale * breatheScale);

    // Sprite rendering
    if (this.atlas) {
      if (special !== 'none') {
        // Special ball: animated sprite
        const frameIndex = FrameAnimator.getLoopingFrame(
          time,
          SpriteConfig.getSpecialFrameCount(),
          SpriteConfig.getSpecialFPS()
        );
        const frameKey = SpriteConfig.getSpecialFrame(special, frameIndex);
        const frame = this.getAtlasFrame(frameKey);
        if (frame) {
          this.drawAtlasFrame(ctx, frame, 0, 0, CELL_SIZE * 0.85, CELL_SIZE * 0.85);
        } else {
          this.drawProceduralBall(ctx, color, special, time);
        }
      } else {
        // Normal ball sprite
        const frameKey = SpriteConfig.getBallFrame(color);
        const frame = this.getAtlasFrame(frameKey);
        if (frame) {
          this.drawAtlasFrame(ctx, frame, 0, 0, CELL_SIZE * 0.85, CELL_SIZE * 0.85);
        } else {
          this.drawProceduralBall(ctx, color, special, time);
        }
      }
    } else {
      // Fallback: procedural rendering
      this.drawProceduralBall(ctx, color, special, time);
    }

    ctx.restore();
  }

  /** Draw selection highlight around a cell (using sprite or procedural). */
  drawSelector(ctx: CanvasRenderingContext2D, cx: number, cy: number, pulse: number): void {
    const ringFrame = this.getAtlasFrame(SpriteConfig.getUIFrame('ring'));

    if (ringFrame) {
      ctx.save();
      const cfg = VisualConfig.selector;
      ctx.globalAlpha = cfg.alphaBase + cfg.alphaOscillation * Math.sin(pulse * cfg.pulseSpeed);
      this.drawAtlasFrame(ctx, ringFrame, cx, cy, CELL_SIZE + cfg.paddingFromCell * 2, CELL_SIZE + cfg.paddingFromCell * 2);
      ctx.restore();
    } else {
      // Fallback: procedural
      const cfg = VisualConfig.selector;
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = cfg.lineWidth;
      ctx.globalAlpha = cfg.alphaBase + cfg.alphaOscillation * Math.sin(pulse * cfg.pulseSpeed);
      const s = CELL_SIZE / 2 + cfg.paddingFromCell;
      ctx.beginPath();
      ctx.roundRect(cx - s, cy - s, s * 2, s * 2, cfg.borderRadius);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Draw obstacle visual at pixel center (cx, cy). */
  drawObstacle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    def: CellTypeDef,
    currentHp: number,
  ): void {
    const frameKey = SpriteConfig.getObstacleFrame(def.id, currentHp);
    const frame = this.getAtlasFrame(frameKey);

    if (frame) {
      // Sprite rendering
      this.drawAtlasFrame(ctx, frame, cx, cy, CELL_SIZE, CELL_SIZE);
    } else {
      // Fallback: procedural rendering
      this.drawProceduralObstacle(ctx, cx, cy, def, currentHp);
    }
  }

  /** Draw destroy animation frame */
  drawDestroyAnimation(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: BallColor,
    elapsed: number,
  ): void {
    const crackedFrames = SpriteConfig.getBallCrackedFrames(color);
    const fps = SpriteConfig.getDestroyFPS();
    const frameIndex = FrameAnimator.getOneShotFrame(elapsed, crackedFrames.length, fps);
    const frameKey = crackedFrames[frameIndex];
    const frame = this.getAtlasFrame(frameKey);

    if (frame) {
      const progress = elapsed / SpriteConfig.getDestroyDuration();
      const alpha = Math.max(0, 1 - progress * 0.5); // Fade out
      ctx.save();
      ctx.globalAlpha = alpha;
      this.drawAtlasFrame(ctx, frame, cx, cy, CELL_SIZE * 0.85, CELL_SIZE * 0.85);
      ctx.restore();
    }
  }

  // ── Private helpers ──

  private getAtlasFrame(key: string): { x: number; y: number; width: number; height: number } | null {
    if (!this.atlas || !key) return null;
    return this.atlas.frames.get(key) ?? null;
  }

  private drawAtlasFrame(
    ctx: CanvasRenderingContext2D,
    frame: { x: number; y: number; width: number; height: number },
    cx: number,
    cy: number,
    width: number,
    height: number,
  ): void {
    if (!this.atlas) return;
    ctx.drawImage(
      this.atlas.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      cx - width / 2,
      cy - height / 2,
      width,
      height
    );
  }

  private drawProceduralBall(ctx: CanvasRenderingContext2D, color: BallColor, special: SpecialType, time: number): void {
    // Rainbow hue cycling
    let displayColor = special !== 'none' ? SPECIAL_COLORS[special] : COLOR_HEX[color];
    if (special === 'rainbow') {
      const hueSpeed = VisualConfig.idleAnimations.rainbowHueSpeed;
      const hue = (time * hueSpeed) % 360;
      displayColor = hslToHex(hue, 70, 55);
    }

    const hex = displayColor;
    const light = special !== 'none' ? lighten(displayColor, VisualConfig.ball.gradient.darkenAmount) : COLOR_LIGHT[color];
    const r = VisualConfig.ball.radius;

    const gcfg = VisualConfig.ball.gradient;
    // Main gradient circle
    const grad = ctx.createRadialGradient(-r * gcfg.highlightOffsetX, -r * gcfg.highlightOffsetY, r * gcfg.highlightSize, 0, 0, r);
    grad.addColorStop(0, light);
    grad.addColorStop(gcfg.innerStop, hex);
    grad.addColorStop(1, darken(hex, gcfg.darkenAmount));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // White highlight
    const hcfg = VisualConfig.ball.highlight;
    ctx.fillStyle = `rgba(255,255,255,${hcfg.alpha})`;
    ctx.beginPath();
    ctx.ellipse(-r * hcfg.offsetX, -r * hcfg.offsetY, r * hcfg.radiusX, r * hcfg.radiusY, hcfg.rotation, 0, Math.PI * 2);
    ctx.fill();

    // Special overlays
    this.drawSpecialOverlay(ctx, special, r, hex);

    // Sparkle on special balls
    if (special !== 'none' && special !== 'rainbow') {
      this.drawSparkle(ctx, r, time);
    }
  }

  private drawProceduralObstacle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    def: CellTypeDef,
    currentHp: number,
  ): void {
    const half = CELL_SIZE / 2;
    const v = def.visual;

    ctx.save();

    if (v.mode === 'solid') {
      ctx.fillStyle = v.fillColor;
      ctx.beginPath();
      ctx.roundRect(cx - half, cy - half, CELL_SIZE, CELL_SIZE, v.borderRadius);
      ctx.fill();

      if (v.borderWidth > 0) {
        ctx.strokeStyle = v.borderColor;
        ctx.lineWidth = v.borderWidth;
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = v.fillColor;
      ctx.beginPath();
      ctx.roundRect(cx - half, cy - half, CELL_SIZE, CELL_SIZE, v.borderRadius);
      ctx.fill();

      if (v.borderWidth > 0) {
        ctx.strokeStyle = v.borderColor;
        ctx.lineWidth = v.borderWidth;
        ctx.stroke();
      }
    }

    // Crack overlay based on damage taken
    const damageTaken = def.hp - currentHp;
    if (damageTaken > 0 && v.crackAlphas.length > 0) {
      const crackIndex = Math.min(damageTaken - 1, v.crackAlphas.length - 1);
      const crackAlpha = v.crackAlphas[crackIndex];

      ctx.strokeStyle = `rgba(0,0,0,${crackAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(cx - half * 0.3, cy - half * 0.5);
      ctx.lineTo(cx + half * 0.1, cy - half * 0.1);
      ctx.lineTo(cx + half * 0.4, cy + half * 0.3);
      ctx.moveTo(cx + half * 0.1, cy - half * 0.1);
      ctx.lineTo(cx - half * 0.2, cy + half * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSpecialOverlay(ctx: CanvasRenderingContext2D, special: SpecialType, r: number, hex: string): void {
    const cfg = VisualConfig.special;

    switch (special) {
      case 'striped_h': {
        const scfg = cfg.striped;
        ctx.strokeStyle = `rgba(255,255,255,${scfg.lineAlpha})`;
        ctx.lineWidth = scfg.lineWidth;
        for (let i = -(scfg.count - 1) / 2; i <= (scfg.count - 1) / 2; i++) {
          const y = i * scfg.spacing;
          ctx.beginPath();
          const halfW = Math.sqrt(Math.max(0, r * r - y * y));
          ctx.moveTo(-halfW + scfg.edgePadding, y);
          ctx.lineTo(halfW - scfg.edgePadding, y);
          ctx.stroke();
        }
        break;
      }
      case 'striped_v': {
        const scfg = cfg.striped;
        ctx.strokeStyle = `rgba(255,255,255,${scfg.lineAlpha})`;
        ctx.lineWidth = scfg.lineWidth;
        for (let i = -(scfg.count - 1) / 2; i <= (scfg.count - 1) / 2; i++) {
          const x = i * scfg.spacing;
          ctx.beginPath();
          const halfH = Math.sqrt(Math.max(0, r * r - x * x));
          ctx.moveTo(x, -halfH + scfg.edgePadding);
          ctx.lineTo(x, halfH - scfg.edgePadding);
          ctx.stroke();
        }
        break;
      }
      case 'bomb': {
        const bcfg = cfg.bomb;
        ctx.strokeStyle = `rgba(255,255,255,${bcfg.ringAlpha})`;
        ctx.lineWidth = bcfg.ringLineWidth;
        ctx.beginPath();
        ctx.arc(0, 0, r * bcfg.ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = bcfg.crossLineWidth;
        ctx.beginPath();
        ctx.moveTo(-r * bcfg.crossSize, 0); ctx.lineTo(r * bcfg.crossSize, 0);
        ctx.moveTo(0, -r * bcfg.crossSize); ctx.lineTo(0, r * bcfg.crossSize);
        ctx.stroke();
        break;
      }
      case 'rainbow': {
        const rcfg = cfg.rainbow;
        for (let i = 0; i < rcfg.colors.length; i++) {
          const angle = (i / rcfg.colors.length) * Math.PI * 2 - Math.PI / 2;
          const nextAngle = ((i + 1) / rcfg.colors.length) * Math.PI * 2 - Math.PI / 2;
          ctx.strokeStyle = rcfg.colors[i];
          ctx.lineWidth = rcfg.lineWidth;
          ctx.beginPath();
          ctx.arc(0, 0, r * rcfg.ringRadius, angle, nextAngle);
          ctx.stroke();
        }
        break;
      }
    }
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, r: number, time: number): void {
    const cfg = VisualConfig.idleAnimations.sparkle;
    const cycle = (time * 1000) % cfg.interval;

    if (cycle > cfg.duration) return;

    const progress = cycle / cfg.duration;
    const fadeAlpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

    ctx.save();
    ctx.globalAlpha = fadeAlpha * cfg.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';

    ctx.beginPath();
    ctx.arc(0, 0, cfg.radius * (0.3 + progress * 0.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount);
  const b = Math.min(255, (num & 0xff) + (255 - (num & 0xff)) * amount);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const rr = Math.round((r + m) * 255);
  const gg = Math.round((g + m) * 255);
  const bb = Math.round((b + m) * 255);

  return `#${((1 << 24) + (rr << 16) + (gg << 8) + bb).toString(16).slice(1)}`;
}
