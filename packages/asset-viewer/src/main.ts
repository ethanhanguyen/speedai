// Phase 3 (layout), Phase 4 (tree), Phase 5 (properties) — assembled here.

import type { Manifest } from './manifest/types.js';
import { store } from './state.js';
import { UI } from './ui/styles.js';
import { AssetTree } from './ui/AssetTree.js';
import { PreviewCanvas } from './ui/PreviewCanvas.js';
import { AnimationBar } from './ui/AnimationBar.js';
import { PropertyPanel } from './ui/PropertyPanel.js';

async function init(): Promise<void> {
  const app = document.getElementById('app')!;
  app.style.cssText = `display:flex;height:100vh;overflow:hidden;background:${UI.bg};`;

  // ---- Left: asset browser ------------------------------------
  const tree = new AssetTree();
  app.appendChild(tree.element);

  // ---- Center: preview canvas + animation bar -----------------
  const center = document.createElement('div');
  center.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;';

  const previewWrap = document.createElement('div');
  previewWrap.style.cssText = 'flex:1;overflow:hidden;position:relative;';
  new PreviewCanvas(previewWrap);
  center.appendChild(previewWrap);

  const bar = new AnimationBar();
  center.appendChild(bar.element);
  app.appendChild(center);

  // ---- Right: property panel ----------------------------------
  const props = new PropertyPanel();
  app.appendChild(props.element);

  // ---- Load manifest ------------------------------------------
  try {
    const res = await fetch('/manifest.json');
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    const manifest: Manifest = await res.json();
    store.set('manifest', manifest);
    store.set('phase', 'ready');
  } catch (err) {
    store.set('phase', 'error');
    previewWrap.innerHTML = `
      <div style="
        display:flex;align-items:center;justify-content:center;
        height:100%;flex-direction:column;gap:12px;
        color:${UI.errorColor};font-family:${UI.fontMono};font-size:${UI.fontSizeMd};
        padding:32px;text-align:center;
      ">
        <span>manifest.json not found</span>
        <code style="color:${UI.textSecondary};font-size:${UI.fontSizeSm};">
          npm run build:manifest -w packages/asset-viewer
        </code>
      </div>
    `;
    console.error('[asset-viewer] manifest load failed:', err);
  }
}

function bindKeyboard(): void {
  document.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement) return;
    const asset = store.get('selectedAsset');
    const maxFrame = !asset ? 0
      : asset.type === 'sheet' ? asset.frameCount - 1
      : asset.type === 'sequence' ? asset.frames.length - 1
      : 0;
    if (e.key === ' ') {
      e.preventDefault();
      store.set('playback', store.get('playback') === 'playing' ? 'paused' : 'playing');
    } else if (e.key === 'j' || e.key === 'J') {
      store.set('playback', 'paused');
      store.set('currentFrame', (store.get('currentFrame') - 1 + maxFrame + 1) % (maxFrame + 1));
    } else if (e.key === 'k' || e.key === 'K') {
      store.set('playback', 'paused');
      store.set('currentFrame', (store.get('currentFrame') + 1) % (maxFrame + 1));
    }
  });
}

bindKeyboard();
init();
