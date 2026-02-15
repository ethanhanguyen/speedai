import { EventEmitter } from '../core/EventEmitter.js';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  font?: string;
  textColor?: string;
  backgroundColor?: string;
  hoverColor?: string;
  pressedColor?: string;
  disabledColor?: string;
  borderRadius?: number;
  icon?: string;
}

export class Button extends EventEmitter {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  font: string;
  textColor: string;
  backgroundColor: string;
  hoverColor: string;
  pressedColor: string;
  disabledColor: string;
  borderRadius: number;
  icon: string;

  visible: boolean = true;
  enabled: boolean = true;
  private hovered: boolean = false;
  private pressed: boolean = false;

  constructor(config: ButtonConfig) {
    super();
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.label = config.label ?? '';
    this.font = config.font ?? '16px sans-serif';
    this.textColor = config.textColor ?? '#fff';
    this.backgroundColor = config.backgroundColor ?? '#4a90d9';
    this.hoverColor = config.hoverColor ?? '#5a9fe9';
    this.pressedColor = config.pressedColor ?? '#3a80c9';
    this.disabledColor = config.disabledColor ?? '#888';
    this.borderRadius = config.borderRadius ?? 8;
    this.icon = config.icon ?? '';
  }

  /** Test if a point is inside the button. */
  containsPoint(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  /** Call from input handler: pointer moved. */
  onPointerMove(px: number, py: number): void {
    if (!this.enabled || !this.visible) return;
    const was = this.hovered;
    this.hovered = this.containsPoint(px, py);
    if (this.hovered && !was) this.emit('hover');
    if (!this.hovered && was) this.emit('hoverEnd');
  }

  /** Call from input handler: pointer pressed. */
  onPointerDown(px: number, py: number): void {
    if (!this.enabled || !this.visible) return;
    if (this.containsPoint(px, py)) {
      this.pressed = true;
      this.emit('press');
    }
  }

  /** Call from input handler: pointer released. */
  onPointerUp(px: number, py: number): void {
    if (this.pressed && this.containsPoint(px, py)) {
      this.emit('click');
    }
    this.pressed = false;
  }

  /** Render the button on a 2D context. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    let color: string;
    if (!this.enabled) color = this.disabledColor;
    else if (this.pressed) color = this.pressedColor;
    else if (this.hovered) color = this.hoverColor;
    else color = this.backgroundColor;

    // Background
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // Label
    if (this.label) {
      ctx.fillStyle = this.textColor;
      ctx.font = this.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
    }
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
