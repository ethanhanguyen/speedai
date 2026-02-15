export interface TextConfig {
  x: number;
  y: number;
  text: string;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

export class Text {
  x: number;
  y: number;
  text: string;
  font: string;
  color: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  maxWidth: number;
  shadow: { color: string; blur: number; offsetX: number; offsetY: number } | null;
  visible: boolean = true;
  alpha: number = 1;

  constructor(config: TextConfig) {
    this.x = config.x;
    this.y = config.y;
    this.text = config.text;
    this.font = config.font ?? '16px sans-serif';
    this.color = config.color ?? '#000';
    this.align = config.align ?? 'left';
    this.baseline = config.baseline ?? 'top';
    this.maxWidth = config.maxWidth ?? 0;
    this.shadow = config.shadow ?? null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;

    if (this.shadow) {
      ctx.shadowColor = this.shadow.color;
      ctx.shadowBlur = this.shadow.blur;
      ctx.shadowOffsetX = this.shadow.offsetX;
      ctx.shadowOffsetY = this.shadow.offsetY;
    }

    if (this.maxWidth > 0) {
      ctx.fillText(this.text, this.x, this.y, this.maxWidth);
    } else {
      ctx.fillText(this.text, this.x, this.y);
    }

    ctx.restore();
  }
}
