// Phase 3 — Preview Canvas

import type { Asset } from '../manifest/types.js';
import { createRenderer } from '../renderers/factory.js';
import type { Renderer } from '../renderers/Renderer.js';
import { store } from '../state.js';
import {
  CHECKER_SIZE_PX,
  CHECKER_LIGHT,
  CHECKER_DARK,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP_IN,
  ZOOM_STEP_OUT,
} from '../manifest/constants.js';
import { UI } from './styles.js';

export class PreviewCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private renderer: Renderer | null = null;
  private rafId = 0;
  private lastTimestamp = 0;
  private elapsed = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `display:block;width:100%;height:100%;`;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.setupResize(container);
    this.setupZoom();
    this.bindStore();
    this.startLoop();
  }

  // ---- Setup --------------------------------------------------

  private setupResize(container: HTMLElement): void {
    const ro = new ResizeObserver(() => {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
      this.draw();
    });
    ro.observe(container);
  }

  private setupZoom(): void {
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP_IN : ZOOM_STEP_OUT;
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, store.get('scale') * factor));
      store.set('scale', parseFloat(next.toFixed(3)));
    }, { passive: false });
  }

  private bindStore(): void {
    store.on('selectedAsset', asset => this.loadAsset(asset));
    store.on('playback', state => {
      if (state === 'playing') {
        this.elapsed = 0;
        this.lastTimestamp = performance.now();
      }
    });
    store.on('currentFrame', () => {
      if (store.get('playback') === 'paused') this.draw();
    });
    store.on('scale', () => this.draw());
  }

  // ---- Asset loading ------------------------------------------

  private loadAsset(asset: Asset | null): void {
    this.renderer = null;
    store.set('currentFrame', 0);
    store.set('playback', 'paused');
    this.elapsed = 0;
    this.draw();
    if (!asset) return;
    const r = createRenderer(asset);
    r.load()
      .then(() => {
        this.renderer = r;
        if ((asset.type === 'sheet' || asset.type === 'sequence') && r.frameCount > 1) {
          store.set('fps', asset.fps);
          store.set('playback', 'playing');
        }
        this.draw();
      })
      .catch(err => console.error('PreviewCanvas: load failed', err));
  }

  // ---- Animation loop ----------------------------------------

  private startLoop(): void {
    const tick = (now: number) => {
      if (store.get('playback') === 'playing' && this.renderer && this.renderer.frameCount > 1) {
        const dt = now - this.lastTimestamp;
        this.elapsed += dt;
        const fps = store.get('fps');
        const frameDuration = 1000 / fps;
        const frame = Math.floor(this.elapsed / frameDuration) % this.renderer.frameCount;
        store.set('currentFrame', frame);
      }
      this.lastTimestamp = now;
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  // ---- Drawing ------------------------------------------------

  private draw(): void {
    const { width, height } = this.canvas;
    if (!width || !height) return;
    this.drawCheckerboard(width, height);
    const r = this.renderer;
    if (!r || r.loadState !== 'ready') return;
    r.draw(this.ctx, store.get('currentFrame'), width / 2, height / 2, store.get('scale'));
  }

  private drawCheckerboard(w: number, h: number): void {
    const s = CHECKER_SIZE_PX;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        this.ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? CHECKER_LIGHT : CHECKER_DARK;
        this.ctx.fillRect(x, y, Math.min(s, w - x), Math.min(s, h - y));
      }
    }
    // Dim overlay to make the checkerboard less visually dominant
    this.ctx.fillStyle = `${UI.bg}44`;
    this.ctx.fillRect(0, 0, w, h);
  }
}
