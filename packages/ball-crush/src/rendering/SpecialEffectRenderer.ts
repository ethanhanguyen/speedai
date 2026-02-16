import { LayoutConfig } from '../config/LayoutConfig.js';
import { AnimationConfig } from '../config/AnimationConfig.js';
import { VisualConfig } from '../config/VisualConfig.js';

type EffectType = 'hbeam' | 'vbeam' | 'ring' | 'colorburst';

interface Effect {
  type: EffectType;
  x: number;
  y: number;
  elapsed: number;
  duration: number;
  color: string;
  params: Record<string, unknown>;
}

export class SpecialEffectRenderer {
  private effects: Effect[] = [];

  addHBeam(x: number, y: number, rowWidth: number, color: string, duration = AnimationConfig.effects.beamDuration): void {
    this.effects.push({
      type: 'hbeam', x, y, elapsed: 0, duration, color,
      params: { rowWidth },
    });
  }

  addVBeam(x: number, y: number, colHeight: number, color: string, duration = AnimationConfig.effects.beamDuration): void {
    this.effects.push({
      type: 'vbeam', x, y, elapsed: 0, duration, color,
      params: { colHeight },
    });
  }

  addRing(x: number, y: number, maxRadius: number, color: string, duration = AnimationConfig.effects.ringDuration): void {
    this.effects.push({
      type: 'ring', x, y, elapsed: 0, duration, color,
      params: { maxRadius },
    });
  }

  addColorBurst(x: number, y: number, targets: { x: number; y: number }[], color: string, duration = AnimationConfig.effects.colorBurstDuration): void {
    this.effects.push({
      type: 'colorburst', x, y, elapsed: 0, duration, color,
      params: { targets },
    });
  }

  get isActive(): boolean {
    return this.effects.length > 0;
  }

  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].elapsed += dt;
      if (this.effects[i].elapsed >= this.effects[i].duration) {
        this.effects.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const fx of this.effects) {
      const t = Math.min(1, fx.elapsed / fx.duration);
      ctx.save();
      switch (fx.type) {
        case 'hbeam': this.drawHBeam(ctx, fx, t); break;
        case 'vbeam': this.drawVBeam(ctx, fx, t); break;
        case 'ring': this.drawRing(ctx, fx, t); break;
        case 'colorburst': this.drawColorBurst(ctx, fx, t); break;
      }
      ctx.restore();
    }
  }

  private drawHBeam(ctx: CanvasRenderingContext2D, fx: Effect, t: number): void {
    const cfg = VisualConfig.effects.beam;
    const rowWidth = fx.params.rowWidth as number;
    // Beam expands fast then fades
    const expandT = Math.min(1, t * AnimationConfig.effects.expandSpeed);
    const halfWidth = rowWidth * expandT * 0.5;
    const beamHeight = LayoutConfig.grid.cellSize * cfg.heightMultiplier * (1 - t * cfg.heightShrink);
    const alpha = t < AnimationConfig.effects.fadeEarlyThreshold ? 1 : 1 - (t - AnimationConfig.effects.fadeEarlyThreshold) / AnimationConfig.effects.fadeEarlyDuration;

    ctx.globalAlpha = alpha * cfg.alphaMain;
    const gradient = ctx.createLinearGradient(fx.x - halfWidth, fx.y, fx.x + halfWidth, fx.y);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(cfg.gradientStopInner, fx.color);
    gradient.addColorStop(cfg.gradientStopOuter, fx.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(fx.x - halfWidth, fx.y - beamHeight / 2, halfWidth * 2, beamHeight);

    // Core white line
    ctx.globalAlpha = alpha * cfg.alphaCore;
    ctx.fillStyle = '#fff';
    const coreHeight = cfg.coreBaseWidth + beamHeight * cfg.coreWidthMultiplier;
    ctx.fillRect(fx.x - halfWidth, fx.y - coreHeight / 2, halfWidth * 2, coreHeight);
  }

  private drawVBeam(ctx: CanvasRenderingContext2D, fx: Effect, t: number): void {
    const cfg = VisualConfig.effects.beam;
    const colHeight = fx.params.colHeight as number;
    const expandT = Math.min(1, t * AnimationConfig.effects.expandSpeed);
    const halfHeight = colHeight * expandT * 0.5;
    const beamWidth = LayoutConfig.grid.cellSize * cfg.heightMultiplier * (1 - t * cfg.heightShrink);
    const alpha = t < AnimationConfig.effects.fadeEarlyThreshold ? 1 : 1 - (t - AnimationConfig.effects.fadeEarlyThreshold) / AnimationConfig.effects.fadeEarlyDuration;

    ctx.globalAlpha = alpha * cfg.alphaMain;
    const gradient = ctx.createLinearGradient(fx.x, fx.y - halfHeight, fx.x, fx.y + halfHeight);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(cfg.gradientStopInner, fx.color);
    gradient.addColorStop(cfg.gradientStopOuter, fx.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(fx.x - beamWidth / 2, fx.y - halfHeight, beamWidth, halfHeight * 2);

    // Core white line
    ctx.globalAlpha = alpha * cfg.alphaCore;
    ctx.fillStyle = '#fff';
    const coreWidth = cfg.coreBaseWidth + beamWidth * cfg.coreWidthMultiplier;
    ctx.fillRect(fx.x - coreWidth / 2, fx.y - halfHeight, coreWidth, halfHeight * 2);
  }

  private drawRing(ctx: CanvasRenderingContext2D, fx: Effect, t: number): void {
    const cfg = VisualConfig.effects.ring;
    const maxRadius = fx.params.maxRadius as number;
    const radius = maxRadius * t;
    const alpha = t < AnimationConfig.effects.fadeLateThreshold ? 1 : 1 - (t - AnimationConfig.effects.fadeLateThreshold) / AnimationConfig.effects.fadeLateDuration;
    const lineWidth = LayoutConfig.grid.cellSize * cfg.lineWidthMultiplier * (1 - t * cfg.lineWidthShrink);

    // Outer ring
    ctx.globalAlpha = alpha * cfg.alphaRing;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow fill
    ctx.globalAlpha = alpha * cfg.alphaFill;
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawColorBurst(ctx: CanvasRenderingContext2D, fx: Effect, t: number): void {
    const cfg = VisualConfig.effects.colorBurst;
    const targets = fx.params.targets as { x: number; y: number }[];
    const alpha = t < AnimationConfig.effects.burstFadeThreshold ? 1 : 1 - (t - AnimationConfig.effects.burstFadeThreshold) / AnimationConfig.effects.burstFadeDuration;
    const progress = Math.min(1, t * AnimationConfig.effects.burstReachProgress);

    ctx.globalAlpha = alpha * cfg.alpha;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = cfg.lineWidth;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = cfg.shadowBlur;

    for (const target of targets) {
      const dx = target.x - fx.x;
      const dy = target.y - fx.y;

      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      // Smooth curve with slight bend
      const midX = fx.x + dx * 0.5 + (dy * cfg.curveBend);
      const midY = fx.y + dy * 0.5 - (dx * cfg.curveBend);
      const endX = fx.x + dx * progress;
      const endY = fx.y + dy * progress;
      ctx.quadraticCurveTo(
        fx.x + (midX - fx.x) * progress,
        fx.y + (midY - fx.y) * progress,
        endX, endY,
      );
      ctx.stroke();

      // Small circle at tip
      if (progress > cfg.tipCircleThreshold) {
        ctx.globalAlpha = alpha * cfg.tipCircleAlpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(endX, endY, cfg.tipCircleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * cfg.alpha;
      }
    }

    ctx.shadowBlur = 0;
  }
}
