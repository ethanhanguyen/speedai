// Phase 2 — Renderers

import type { CompositeAsset, CompositeLayer } from '../manifest/types.js';
import type { DrawOptions, LoadState, Renderer } from './Renderer.js';
import { toDevUrl } from '../manifest/urls.js';

export class CompositeRenderer implements Renderer {
  readonly asset: CompositeAsset;
  loadState: LoadState = 'idle';
  private readonly images = new Map<string, HTMLImageElement>();

  constructor(asset: CompositeAsset) {
    this.asset = asset;
  }

  get frameCount(): number { return 1; }
  get naturalWidth(): number { return this.asset.canvasWidth; }
  get naturalHeight(): number { return this.asset.canvasHeight; }

  load(): Promise<void> {
    if (this.loadState === 'ready') return Promise.resolve();
    this.loadState = 'loading';
    const promises = this.asset.layers.map(layer =>
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { this.images.set(layer.id, img); resolve(); };
        img.onerror = () => reject(new Error(`CompositeRenderer: failed to load layer "${layer.id}"`));
        img.src = toDevUrl(layer.src);
      }),
    );
    return Promise.all(promises)
      .then(() => { this.loadState = 'ready'; })
      .catch(err => { this.loadState = 'error'; throw err; });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    _frame: number,
    cx: number,
    cy: number,
    scale: number,
    options?: DrawOptions,
  ): void {
    const sorted = [...this.asset.layers].sort((a: CompositeLayer, b: CompositeLayer) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      const img = this.images.get(layer.id);
      if (!img) continue;
      const angle = options?.layerAngles?.[layer.id] ?? 0;
      const lx = cx + layer.offsetX * scale;
      const ly = cy + layer.offsetY * scale;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle);
      ctx.drawImage(img, -dw * layer.pivotX, -dh * layer.pivotY, dw, dh);
      ctx.restore();
    }
  }
}
