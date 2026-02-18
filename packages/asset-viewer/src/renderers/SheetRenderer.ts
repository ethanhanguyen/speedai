// Phase 2 — Renderers

import type { SheetAsset } from '../manifest/types.js';
import type { DrawOptions, LoadState, Renderer } from './Renderer.js';
import { toDevUrl } from '../manifest/urls.js';

export class SheetRenderer implements Renderer {
  readonly asset: SheetAsset;
  loadState: LoadState = 'idle';
  private img: HTMLImageElement | null = null;

  constructor(asset: SheetAsset) {
    this.asset = asset;
  }

  get frameCount(): number { return this.asset.frameCount; }
  get naturalWidth(): number { return this.asset.frameWidth; }
  get naturalHeight(): number { return this.asset.frameHeight; }

  load(): Promise<void> {
    if (this.loadState === 'ready') return Promise.resolve();
    this.loadState = 'loading';
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.img = img; this.loadState = 'ready'; resolve(); };
      img.onerror = () => {
        this.loadState = 'error';
        reject(new Error(`SheetRenderer: failed to load ${this.asset.src}`));
      };
      img.src = toDevUrl(this.asset.src);
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    frame: number,
    cx: number,
    cy: number,
    scale: number,
    _options?: DrawOptions,
  ): void {
    if (!this.img) return;
    const { frameWidth, frameHeight, frameCount } = this.asset;
    const f = Math.max(0, Math.min(frame, frameCount - 1));
    const dw = frameWidth * scale;
    const dh = frameHeight * scale;
    ctx.drawImage(
      this.img,
      f * frameWidth, 0, frameWidth, frameHeight,
      cx - dw / 2, cy - dh / 2, dw, dh,
    );
  }
}
