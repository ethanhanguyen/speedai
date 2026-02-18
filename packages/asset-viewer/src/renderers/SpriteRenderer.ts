// Phase 2 — Renderers

import type { SpriteAsset } from '../manifest/types.js';
import type { DrawOptions, LoadState, Renderer } from './Renderer.js';
import { toDevUrl } from '../manifest/urls.js';

export class SpriteRenderer implements Renderer {
  readonly asset: SpriteAsset;
  loadState: LoadState = 'idle';
  private img: HTMLImageElement | null = null;

  constructor(asset: SpriteAsset) {
    this.asset = asset;
  }

  get frameCount(): number { return 1; }
  get naturalWidth(): number { return this.asset.width; }
  get naturalHeight(): number { return this.asset.height; }

  load(): Promise<void> {
    if (this.loadState === 'ready') return Promise.resolve();
    this.loadState = 'loading';
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.img = img; this.loadState = 'ready'; resolve(); };
      img.onerror = () => {
        this.loadState = 'error';
        reject(new Error(`SpriteRenderer: failed to load ${this.asset.src}`));
      };
      img.src = toDevUrl(this.asset.src);
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    _frame: number,
    cx: number,
    cy: number,
    scale: number,
    _options?: DrawOptions,
  ): void {
    if (!this.img) return;
    const dw = this.asset.width * scale;
    const dh = this.asset.height * scale;
    ctx.drawImage(this.img, cx - dw / 2, cy - dh / 2, dw, dh);
  }
}
