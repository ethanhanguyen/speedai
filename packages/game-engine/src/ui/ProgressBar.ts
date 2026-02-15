export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export class ProgressBar {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  visible: boolean = true;

  private _value: number = 0;

  constructor(config: ProgressBarConfig) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.backgroundColor = config.backgroundColor ?? '#333';
    this.fillColor = config.fillColor ?? '#4a90d9';
    this.borderColor = config.borderColor ?? '#555';
    this.borderWidth = config.borderWidth ?? 2;
    this.borderRadius = config.borderRadius ?? 4;
  }

  get value(): number { return this._value; }
  set value(v: number) { this._value = Math.max(0, Math.min(1, v)); }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();

    // Background
    ctx.fillStyle = this.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // Fill
    const fillWidth = this.width * this._value;
    if (fillWidth > 0) {
      ctx.fillStyle = this.fillColor;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, fillWidth, this.height, this.borderRadius);
      ctx.fill();
    }

    // Border
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.stroke();
    }

    ctx.restore();
  }
}
