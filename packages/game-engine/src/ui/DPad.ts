import { EventEmitter } from '../core/EventEmitter.js';

export interface DPadDirection {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface DPadConfig {
  x: number;
  y: number;
  size?: number;
  buttonSize?: number;
  color?: string;
  activeColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  arrowColor?: string;
  opacity?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class DPad extends EventEmitter {
  x: number;
  y: number;
  size: number;
  buttonSize: number;
  color: string;
  activeColor: string;
  strokeColor: string;
  strokeWidth: number;
  arrowColor: string;
  opacity: number;
  visible: boolean = true;

  private activePointers: Map<number, DPadDirection> = new Map();
  private _direction: DPadDirection = { up: false, down: false, left: false, right: false };

  constructor(config: DPadConfig) {
    super();
    this.x = config.x;
    this.y = config.y;
    this.size = config.size ?? 120;
    this.buttonSize = config.buttonSize ?? Math.round(this.size / 3);
    this.color = config.color ?? 'rgba(255,255,255,0.3)';
    this.activeColor = config.activeColor ?? 'rgba(255,255,255,0.6)';
    this.strokeColor = config.strokeColor ?? 'rgba(255,255,255,0.5)';
    this.strokeWidth = config.strokeWidth ?? 1;
    this.arrowColor = config.arrowColor ?? '#fff';
    this.opacity = config.opacity ?? 0.5;
  }

  get direction(): DPadDirection {
    return { ...this._direction };
  }

  containsPoint(px: number, py: number): boolean {
    const r = this.getRegions();
    return pointInRect(px, py, r.up) ||
           pointInRect(px, py, r.down) ||
           pointInRect(px, py, r.left) ||
           pointInRect(px, py, r.right);
  }

  onPointerDown(px: number, py: number, pointerId: number): void {
    if (!this.visible) return;
    const dirs = this.hitTest(px, py);
    if (!dirs) return;
    this.activePointers.set(pointerId, dirs);
    this.updateDirection();
  }

  onPointerMove(px: number, py: number, pointerId: number): void {
    if (!this.activePointers.has(pointerId)) return;
    const dirs = this.hitTest(px, py);
    if (dirs) {
      this.activePointers.set(pointerId, dirs);
    } else {
      this.activePointers.delete(pointerId);
    }
    this.updateDirection();
  }

  onPointerUp(_px: number, _py: number, pointerId: number): void {
    if (!this.activePointers.has(pointerId)) return;
    this.activePointers.delete(pointerId);
    this.updateDirection();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    const regions = this.getRegions();
    const dirs: Array<{ key: keyof DPadDirection; dir: 'up' | 'down' | 'left' | 'right' }> = [
      { key: 'up', dir: 'up' },
      { key: 'down', dir: 'down' },
      { key: 'left', dir: 'left' },
      { key: 'right', dir: 'right' },
    ];

    for (const { key, dir } of dirs) {
      const rect = regions[key];
      const active = this._direction[key];

      ctx.fillStyle = active ? this.activeColor : this.color;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      // Arrow
      ctx.fillStyle = this.arrowColor;
      drawArrow(ctx, rect.x + rect.w / 2, rect.y + rect.h / 2, dir, this.buttonSize * 0.3);
    }

    ctx.restore();
  }

  private getRegions(): { up: Rect; down: Rect; left: Rect; right: Rect } {
    const bs = this.buttonSize;
    const half = this.size / 2;
    return {
      up:    { x: this.x - bs / 2, y: this.y - half,          w: bs, h: bs },
      down:  { x: this.x - bs / 2, y: this.y + half - bs,     w: bs, h: bs },
      left:  { x: this.x - half,          y: this.y - bs / 2, w: bs, h: bs },
      right: { x: this.x + half - bs,     y: this.y - bs / 2, w: bs, h: bs },
    };
  }

  private hitTest(px: number, py: number): DPadDirection | null {
    const r = this.getRegions();
    const dirs: DPadDirection = {
      up: pointInRect(px, py, r.up),
      down: pointInRect(px, py, r.down),
      left: pointInRect(px, py, r.left),
      right: pointInRect(px, py, r.right),
    };
    if (!dirs.up && !dirs.down && !dirs.left && !dirs.right) return null;
    return dirs;
  }

  private updateDirection(): void {
    const prev = this._direction;
    const next: DPadDirection = { up: false, down: false, left: false, right: false };

    for (const dirs of this.activePointers.values()) {
      if (dirs.up) next.up = true;
      if (dirs.down) next.down = true;
      if (dirs.left) next.left = true;
      if (dirs.right) next.right = true;
    }

    if (next.up !== prev.up || next.down !== prev.down ||
        next.left !== prev.left || next.right !== prev.right) {
      this._direction = next;
      this.emit('directionChange', this.direction);
    }
  }
}

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  direction: 'up' | 'down' | 'left' | 'right',
  size: number,
): void {
  const half = size / 2;
  ctx.beginPath();
  switch (direction) {
    case 'up':
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx - half, cy + half);
      ctx.lineTo(cx + half, cy + half);
      break;
    case 'down':
      ctx.moveTo(cx, cy + half);
      ctx.lineTo(cx - half, cy - half);
      ctx.lineTo(cx + half, cy - half);
      break;
    case 'left':
      ctx.moveTo(cx - half, cy);
      ctx.lineTo(cx + half, cy - half);
      ctx.lineTo(cx + half, cy + half);
      break;
    case 'right':
      ctx.moveTo(cx + half, cy);
      ctx.lineTo(cx - half, cy - half);
      ctx.lineTo(cx - half, cy + half);
      break;
  }
  ctx.closePath();
  ctx.fill();
}
