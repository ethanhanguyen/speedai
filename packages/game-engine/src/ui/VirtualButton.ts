import { EventEmitter } from '../core/EventEmitter.js';

export interface VirtualButtonConfig {
  x: number;
  y: number;
  radius?: number;
  label?: string;
  font?: string;
  color?: string;
  pressedColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textColor?: string;
  opacity?: number;
  pressedScale?: number;
}

export class VirtualButton extends EventEmitter {
  x: number;
  y: number;
  radius: number;
  label: string;
  font: string;
  color: string;
  pressedColor: string;
  strokeColor: string;
  strokeWidth: number;
  textColor: string;
  opacity: number;
  pressedScale: number;
  visible: boolean = true;

  private activePointerId: number | null = null;
  private _isPressed: boolean = false;

  constructor(config: VirtualButtonConfig) {
    super();
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius ?? 30;
    this.label = config.label ?? '';
    this.font = config.font ?? 'bold 18px sans-serif';
    this.color = config.color ?? 'rgba(255,255,255,0.3)';
    this.pressedColor = config.pressedColor ?? 'rgba(255,255,255,0.6)';
    this.strokeColor = config.strokeColor ?? 'rgba(255,255,255,0.5)';
    this.strokeWidth = config.strokeWidth ?? 2;
    this.textColor = config.textColor ?? '#fff';
    this.opacity = config.opacity ?? 0.5;
    this.pressedScale = config.pressedScale ?? 0.9;
  }

  get isPressed(): boolean {
    return this._isPressed;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  onPointerDown(px: number, py: number, pointerId: number): void {
    if (!this.visible || this.activePointerId !== null) return;
    if (!this.containsPoint(px, py)) return;
    this.activePointerId = pointerId;
    this._isPressed = true;
    this.emit('press');
  }

  onPointerMove(px: number, py: number, pointerId: number): void {
    if (pointerId !== this.activePointerId) return;
    if (this._isPressed && !this.containsPoint(px, py)) {
      this._isPressed = false;
      this.activePointerId = null;
      this.emit('release');
    }
  }

  onPointerUp(_px: number, _py: number, pointerId: number): void {
    if (pointerId !== this.activePointerId) return;
    if (this._isPressed) {
      this._isPressed = false;
      this.activePointerId = null;
      this.emit('release');
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    const scale = this._isPressed ? this.pressedScale : 1;
    const r = this.radius * scale;
    const fill = this._isPressed ? this.pressedColor : this.color;

    // Circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.stroke();

    // Label
    if (this.label) {
      ctx.fillStyle = this.textColor;
      ctx.font = this.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x, this.y);
    }

    ctx.restore();
  }
}
