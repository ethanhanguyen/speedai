// Phase 2 — Renderers

import type { SequenceAsset } from '../manifest/types.js';
import type { DrawOptions, LoadState, Renderer } from './Renderer.js';
import { toDevUrl } from '../manifest/urls.js';

export class SequenceRenderer implements Renderer {
  readonly asset: SequenceAsset;
  loadState: LoadState = 'idle';
  private readonly images: HTMLImageElement[] = [];

  constructor(asset: SequenceAsset) {
    this.asset = asset;
  }

  get frameCount(): number { return this.asset.frames.length; }
  get naturalWidth(): number { return this.asset.frameWidth; }
  get naturalHeight(): number { return this.asset.frameHeight; }

  load(): Promise<void> {
    if (this.loadState === 'ready') return Promise.resolve();
    this.loadState = 'loading';
    const promises = this.asset.frames.map((src, i) =>
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { this.images[i] = img; resolve(); };
        img.onerror = () => reject(new Error(`SequenceRenderer: failed to load frame ${i}: ${src}`));
        img.src = toDevUrl(src);
      }),
    );
    return Promise.all(promises)
      .then(() => { this.loadState = 'ready'; })
      .catch(err => { this.loadState = 'error'; throw err; });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    frame: number,
    cx: number,
    cy: number,
    scale: number,
    _options?: DrawOptions,
  ): void {
    const f = Math.max(0, Math.min(frame, this.frameCount - 1));
    const img = this.images[f];
    if (!img) return;
    const dw = this.asset.frameWidth * scale;
    const dh = this.asset.frameHeight * scale;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  }
}
