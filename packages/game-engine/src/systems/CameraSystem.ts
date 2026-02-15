import { System } from '../core/System.js';
import type { EntityId, Vec2 } from '../core/types.js';

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  worldWidth?: number;
  worldHeight?: number;
  smoothing?: number;
  zoom?: number;
}

/**
 * Camera system: follow target, smooth movement, shake, zoom.
 */
export class CameraSystem extends System {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;

  private viewportWidth: number;
  private viewportHeight: number;
  private worldWidth: number;
  private worldHeight: number;
  private smoothing: number;

  private followTarget: EntityId | null = null;
  private followOffset: Vec2 = { x: 0, y: 0 };

  // Shake
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeTimer: number = 0;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  constructor(config: CameraConfig) {
    super('CameraSystem', [], 300);
    this.viewportWidth = config.viewportWidth;
    this.viewportHeight = config.viewportHeight;
    this.worldWidth = config.worldWidth ?? Infinity;
    this.worldHeight = config.worldHeight ?? Infinity;
    this.smoothing = config.smoothing ?? 0.1;
    this.zoom = config.zoom ?? 1;
  }

  /** Follow an entity. */
  follow(entityId: EntityId, offset?: Vec2): void {
    this.followTarget = entityId;
    this.followOffset = offset ?? { x: 0, y: 0 };
  }

  /** Stop following. */
  unfollow(): void {
    this.followTarget = null;
  }

  /** Move camera to a position immediately. */
  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.clamp();
  }

  /** Trigger screen shake. */
  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = 0;
  }

  /** Get camera transform (use for rendering offset). */
  getTransform(): { x: number; y: number; zoom: number } {
    return {
      x: -(this.x + this.shakeOffsetX) * this.zoom + this.viewportWidth / 2,
      y: -(this.y + this.shakeOffsetY) * this.zoom + this.viewportHeight / 2,
      zoom: this.zoom,
    };
  }

  /** Check if a world-space rect is visible. */
  isVisible(wx: number, wy: number, ww: number, wh: number): boolean {
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;
    return !(
      wx + ww < this.x - halfW ||
      wx > this.x + halfW ||
      wy + wh < this.y - halfH ||
      wy > this.y + halfH
    );
  }

  update(dt: number): void {
    // Follow target
    if (this.followTarget !== null) {
      const pos = this.entities.getComponent<{ x: number; y: number }>(this.followTarget, 'Position');
      if (pos) {
        const tx = pos.x + this.followOffset.x;
        const ty = pos.y + this.followOffset.y;
        this.x += (tx - this.x) * this.smoothing;
        this.y += (ty - this.y) * this.smoothing;
      }
    }

    // Shake
    if (this.shakeTimer < this.shakeDuration) {
      this.shakeTimer += dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const decay = 1 - progress;
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity * decay;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity * decay;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    this.clamp();
  }

  private clamp(): void {
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;
    this.x = Math.max(halfW, Math.min(this.worldWidth - halfW, this.x));
    this.y = Math.max(halfH, Math.min(this.worldHeight - halfH, this.y));
  }
}
