import type { IRenderer, IScene, SpriteComponent, EntityId } from '../../core/types.js';

interface RenderCommand {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  alpha: number;
  anchorX: number;
  anchorY: number;
  zIndex: number;
  textureId: number;
  image: CanvasImageSource | null;
  key: string;
}

export class CanvasRenderer implements IRenderer {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private pixelRatio: number = 1;
  private _drawCalls: number = 0;
  private batchQueue: RenderCommand[] = [];
  private readonly MAX_BATCH = 1000;

  /** Texture cache: key -> image source (HTMLImageElement, ImageBitmap, etc.) */
  private textures: Map<string, CanvasImageSource> = new Map();

  /** Dirty entity tracking for partial redraws */
  private dirtyEntities: Set<EntityId> = new Set();

  /** Atlas frames for spritesheet support */
  private atlasFrames: Map<string, { image: CanvasImageSource; sx: number; sy: number; sw: number; sh: number }> = new Map();

  get drawCalls(): number {
    return this._drawCalls;
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  registerTexture(key: string, image: CanvasImageSource): void {
    this.textures.set(key, image);
  }

  registerAtlasFrame(
    key: string,
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): void {
    this.atlasFrames.set(key, { image, sx, sy, sw, sh });
  }

  render(_scene: IScene, _alpha: number): void {
    this._drawCalls = 0;
    this.ctx.clearRect(0, 0, this.width, this.height);
    // Scene-level rendering is delegated to scene.render()
    // The engine calls scene.render(alpha) after this
    this.dirtyEntities.clear();
  }

  /** Batch sprites by texture for fewer draw calls. */
  batch(sprites: SpriteComponent[]): void {
    // Sort by z-index, then by textureId
    const sorted = sprites
      .filter(s => s.visible)
      .sort((a, b) => a.zIndex !== b.zIndex ? a.zIndex - b.zIndex : a.textureId - b.textureId);

    let currentTexture = -1;
    for (const sprite of sorted) {
      if (sprite.textureId !== currentTexture || this.batchQueue.length >= this.MAX_BATCH) {
        this.flushBatch();
        currentTexture = sprite.textureId;
      }
      this.batchQueue.push({
        x: 0,
        y: 0,
        width: sprite.width,
        height: sprite.height,
        scaleX: sprite.scaleX,
        scaleY: sprite.scaleY,
        rotation: sprite.rotation,
        alpha: sprite.alpha,
        anchorX: sprite.anchorX,
        anchorY: sprite.anchorY,
        zIndex: sprite.zIndex,
        textureId: sprite.textureId,
        image: this.textures.get(sprite.key) ?? null,
        key: sprite.key,
      });
    }
    this.flushBatch();
  }

  /** Draw a sprite at a given position. Convenience for scene rendering. */
  drawSprite(key: string, x: number, y: number, width: number, height: number, opts?: {
    rotation?: number;
    alpha?: number;
    scaleX?: number;
    scaleY?: number;
    anchorX?: number;
    anchorY?: number;
  }): void {
    const atlas = this.atlasFrames.get(key);
    const img = atlas?.image ?? this.textures.get(key);
    if (!img) return;

    const { rotation = 0, alpha = 1, scaleX = 1, scaleY = 1, anchorX = 0.5, anchorY = 0.5 } = opts ?? {};

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    if (rotation) this.ctx.rotate(rotation);
    this.ctx.scale(scaleX, scaleY);

    const dx = -width * anchorX;
    const dy = -height * anchorY;

    if (atlas) {
      this.ctx.drawImage(atlas.image, atlas.sx, atlas.sy, atlas.sw, atlas.sh, dx, dy, width, height);
    } else {
      this.ctx.drawImage(img, dx, dy, width, height);
    }

    this.ctx.restore();
    this._drawCalls++;
  }

  /** Draw a rect (useful for debug / UI). */
  drawRect(x: number, y: number, w: number, h: number, color: string, fill = true): void {
    this.ctx.save();
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, w, h);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(x, y, w, h);
    }
    this.ctx.restore();
    this._drawCalls++;
  }

  /** Draw text. */
  drawText(text: string, x: number, y: number, opts?: {
    font?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  }): void {
    this.ctx.save();
    this.ctx.font = opts?.font ?? '16px sans-serif';
    this.ctx.fillStyle = opts?.color ?? '#000';
    this.ctx.textAlign = opts?.align ?? 'left';
    this.ctx.textBaseline = opts?.baseline ?? 'top';
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
    this._drawCalls++;
  }

  /** Draw a circle. */
  drawCircle(x: number, y: number, radius: number, color: string, fill = true): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
    this.ctx.restore();
    this._drawCalls++;
  }

  /** Get the raw 2D context for advanced drawing. */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  setDirty(entityId: EntityId): void {
    this.dirtyEntities.add(entityId);
  }

  dispose(): void {
    this.textures.clear();
    this.atlasFrames.clear();
    this.batchQueue.length = 0;
    this.dirtyEntities.clear();
  }

  private flushBatch(): void {
    if (this.batchQueue.length === 0) return;
    for (const cmd of this.batchQueue) {
      if (!cmd.image) continue;
      this.ctx.save();
      this.ctx.globalAlpha = cmd.alpha;
      this.ctx.translate(cmd.x, cmd.y);
      if (cmd.rotation) this.ctx.rotate(cmd.rotation);
      this.ctx.scale(cmd.scaleX, cmd.scaleY);
      const dx = -cmd.width * cmd.anchorX;
      const dy = -cmd.height * cmd.anchorY;
      this.ctx.drawImage(cmd.image, dx, dy, cmd.width, cmd.height);
      this.ctx.restore();
    }
    this._drawCalls++;
    this.batchQueue.length = 0;
  }
}
