// Phase 3 — Preview Canvas

import type { Asset } from '../manifest/types.js';
import { store } from '../state.js';
import { UI } from './styles.js';

export class AnimationBar {
  readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = [
      `display:flex;align-items:center;gap:8px`,
      `padding:0 12px`,
      `height:${UI.animBarHeight}`,
      `background:${UI.panelBg}`,
      `border-top:1px solid ${UI.borderColor}`,
      `flex-shrink:0`,
      `font-family:${UI.fontSans}`,
    ].join(';');

    this.element.innerHTML = this.template();
    this.bindEvents();
    this.bindStore();
  }

  // ---- Template -----------------------------------------------

  private template(): string {
    return `
      <button data-id="prev" title="Previous frame" style="${btnCss()}">⏮</button>
      <button data-id="play" title="Play / Pause"   style="${btnCss()}">▶</button>
      <button data-id="next" title="Next frame"     style="${btnCss()}">⏭</button>
      <input  data-id="scrubber" type="range" min="0" max="0" value="0" step="1"
        style="flex:1;accent-color:${UI.accentColor};cursor:pointer;" />
      <span data-id="frame-label"
        style="color:${UI.textSecondary};font-size:${UI.fontSizeSm};font-family:${UI.fontMono};min-width:52px;text-align:right;">
        0 / 0
      </span>
      <label style="color:${UI.textSecondary};font-size:${UI.fontSizeSm};">fps</label>
      <input data-id="fps" type="number" min="1" max="60" value="${store.get('fps')}"
        style="width:44px;background:${UI.bg};border:1px solid ${UI.borderColor};color:${UI.textPrimary};padding:2px 4px;font-size:${UI.fontSizeSm};border-radius:3px;text-align:center;" />
    `;
  }

  // ---- Helpers ------------------------------------------------

  private q<T extends HTMLElement>(id: string): T {
    return this.element.querySelector<T>(`[data-id="${id}"]`)!;
  }

  private maxFrames(asset: Asset | null): number {
    if (!asset) return 0;
    switch (asset.type) {
      case 'sprite':    return 0;
      case 'sheet':     return asset.frameCount - 1;
      case 'sequence':  return asset.frames.length - 1;
      case 'composite': return 0;
    }
  }

  // ---- Events -------------------------------------------------

  private bindEvents(): void {
    this.q<HTMLButtonElement>('play').addEventListener('click', () => {
      const next = store.get('playback') === 'playing' ? 'paused' : 'playing';
      store.set('playback', next);
    });

    this.q<HTMLButtonElement>('prev').addEventListener('click', () => {
      store.set('playback', 'paused');
      const max = this.maxFrames(store.get('selectedAsset'));
      store.set('currentFrame', (store.get('currentFrame') - 1 + max + 1) % (max + 1));
    });

    this.q<HTMLButtonElement>('next').addEventListener('click', () => {
      store.set('playback', 'paused');
      const max = this.maxFrames(store.get('selectedAsset'));
      store.set('currentFrame', (store.get('currentFrame') + 1) % (max + 1));
    });

    this.q<HTMLInputElement>('scrubber').addEventListener('input', e => {
      store.set('playback', 'paused');
      store.set('currentFrame', parseInt((e.target as HTMLInputElement).value, 10));
    });

    this.q<HTMLInputElement>('fps').addEventListener('change', e => {
      const raw = parseInt((e.target as HTMLInputElement).value, 10);
      const clamped = Math.max(1, Math.min(60, isNaN(raw) ? store.get('fps') : raw));
      store.set('fps', clamped);
      (e.target as HTMLInputElement).value = String(clamped);
    });
  }

  // ---- Store listeners ----------------------------------------

  private bindStore(): void {
    store.on('playback', state => {
      this.q<HTMLButtonElement>('play').textContent = state === 'playing' ? '⏸' : '▶';
    });

    store.on('currentFrame', frame => {
      const max = this.maxFrames(store.get('selectedAsset'));
      this.q<HTMLInputElement>('scrubber').value = String(frame);
      this.q<HTMLSpanElement>('frame-label').textContent = `${frame} / ${max}`;
    });

    store.on('selectedAsset', asset => {
      const max = this.maxFrames(asset);
      const scrubber = this.q<HTMLInputElement>('scrubber');
      scrubber.max = String(max);
      scrubber.value = '0';
      this.q<HTMLSpanElement>('frame-label').textContent = `0 / ${max}`;
    });

    store.on('fps', fps => {
      this.q<HTMLInputElement>('fps').value = String(fps);
    });
  }
}

function btnCss(): string {
  return `background:none;border:none;color:${UI.textPrimary};font-size:13px;cursor:pointer;padding:4px 6px;border-radius:3px;`;
}
