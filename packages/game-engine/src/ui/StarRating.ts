export interface StarRatingConfig {
  x: number;
  y: number;
  maxStars?: number;
  starSize?: number;
  gap?: number;
  filledColor?: string;
  emptyColor?: string;
}

export class StarRating {
  x: number;
  y: number;
  maxStars: number;
  starSize: number;
  gap: number;
  filledColor: string;
  emptyColor: string;
  visible: boolean = true;

  private _stars: number = 0;

  constructor(config: StarRatingConfig) {
    this.x = config.x;
    this.y = config.y;
    this.maxStars = config.maxStars ?? 3;
    this.starSize = config.starSize ?? 32;
    this.gap = config.gap ?? 8;
    this.filledColor = config.filledColor ?? '#FFD700';
    this.emptyColor = config.emptyColor ?? '#555';
  }

  get stars(): number { return this._stars; }
  set stars(v: number) { this._stars = Math.max(0, Math.min(this.maxStars, v)); }

  get totalWidth(): number {
    return this.maxStars * this.starSize + (this.maxStars - 1) * this.gap;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    for (let i = 0; i < this.maxStars; i++) {
      const sx = this.x + i * (this.starSize + this.gap);
      const filled = i < this._stars;
      ctx.save();
      ctx.fillStyle = filled ? this.filledColor : this.emptyColor;
      drawStar(ctx, sx + this.starSize / 2, this.y + this.starSize / 2, this.starSize / 2);
      ctx.restore();
    }
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const points = 5;
  const inner = r * 0.4;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
