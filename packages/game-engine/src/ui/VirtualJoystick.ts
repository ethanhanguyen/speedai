import { EventEmitter } from '../core/EventEmitter.js';

export interface VirtualJoystickConfig {
  x: number;
  y: number;
  baseRadius?: number;
  knobRadius?: number;
  baseColor?: string;
  knobColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  deadZone?: number;
  opacity?: number;
}

export class VirtualJoystick extends EventEmitter {
  x: number;
  y: number;
  baseRadius: number;
  knobRadius: number;
  baseColor: string;
  knobColor: string;
  strokeColor: string;
  strokeWidth: number;
  deadZone: number;
  opacity: number;
  visible: boolean = true;

  private activePointerId: number | null = null;
  private knobX: number = 0;
  private knobY: number = 0;

  constructor(config: VirtualJoystickConfig) {
    super();
    this.x = config.x;
    this.y = config.y;
    this.baseRadius = config.baseRadius ?? 60;
    this.knobRadius = config.knobRadius ?? 25;
    this.baseColor = config.baseColor ?? 'rgba(255,255,255,0.3)';
    this.knobColor = config.knobColor ?? 'rgba(255,255,255,0.6)';
    this.strokeColor = config.strokeColor ?? 'rgba(255,255,255,0.5)';
    this.strokeWidth = config.strokeWidth ?? 2;
    this.deadZone = config.deadZone ?? 0.1;
    this.opacity = config.opacity ?? 0.5;
  }

  /** Normalized direction vector, each axis in [-1, 1]. Returns {x:0, y:0} when idle or within dead zone. */
  get direction(): { x: number; y: number } {
    if (this.activePointerId === null) return { x: 0, y: 0 };
    const normX = this.knobX / this.baseRadius;
    const normY = this.knobY / this.baseRadius;
    const mag = Math.sqrt(normX * normX + normY * normY);
    if (mag < this.deadZone) return { x: 0, y: 0 };
    const scale = (mag - this.deadZone) / (1 - this.deadZone);
    return { x: (normX / mag) * scale, y: (normY / mag) * scale };
  }

  get isActive(): boolean {
    return this.activePointerId !== null;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.baseRadius * this.baseRadius;
  }

  onPointerDown(px: number, py: number, pointerId: number): void {
    if (!this.visible || this.activePointerId !== null) return;
    if (!this.containsPoint(px, py)) return;
    this.activePointerId = pointerId;
    this.updateKnob(px, py);
    this.emit('start');
    this.emit('move', this.direction);
  }

  onPointerMove(px: number, py: number, pointerId: number): void {
    if (pointerId !== this.activePointerId) return;
    this.updateKnob(px, py);
    this.emit('move', this.direction);
  }

  onPointerUp(_px: number, _py: number, pointerId: number): void {
    if (pointerId !== this.activePointerId) return;
    this.knobX = 0;
    this.knobY = 0;
    this.activePointerId = null;
    this.emit('end');
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Base circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.baseColor;
    ctx.fill();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.stroke();

    // Knob
    ctx.beginPath();
    ctx.arc(this.x + this.knobX, this.y + this.knobY, this.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.knobColor;
    ctx.fill();

    ctx.restore();
  }

  private updateKnob(px: number, py: number): void {
    let dx = px - this.x;
    let dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.baseRadius) {
      dx = (dx / dist) * this.baseRadius;
      dy = (dy / dist) * this.baseRadius;
    }
    this.knobX = dx;
    this.knobY = dy;
  }
}
