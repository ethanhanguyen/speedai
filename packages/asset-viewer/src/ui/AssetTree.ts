// Phase 4 — Asset Browser

import type { Asset, AssetFolder, AssetType, Manifest } from '../manifest/types.js';
import { store } from '../state.js';
import { UI } from './styles.js';

// Icon per asset type — no switch fallthrough risks since every type is listed.
const TYPE_ICONS: Readonly<Record<AssetType, string>> = {
  sprite:    '◻',
  sheet:     '▦',
  sequence:  '▶',
  composite: '⊞',
};

export class AssetTree {
  readonly element: HTMLElement;
  private selectedId: string | null = null;
  private allRows: HTMLElement[] = [];

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = [
      `width:${UI.browserWidth}`,
      `min-width:${UI.browserWidth}`,
      `background:${UI.panelBg}`,
      `border-right:1px solid ${UI.borderColor}`,
      `display:flex`,
      `flex-direction:column`,
      `overflow:hidden`,
      `font-family:${UI.fontSans}`,
      `font-size:${UI.fontSizeMd}`,
      `color:${UI.textPrimary}`,
    ].join(';');

    this.element.appendChild(this.buildHeader());
    const scroll = document.createElement('div');
    scroll.style.cssText = 'flex:1;overflow-y:auto;';
    this.element.appendChild(scroll);

    const manifest = store.get('manifest');
    if (manifest) this.renderTree(scroll, manifest);
    store.on('manifest', m => { if (m) this.renderTree(scroll, m); });
    store.on('selectedAsset', asset => this.applySelection(asset?.id ?? null));
    store.on('filterText', () => this.applyFilter());
  }

  // ---- Header with search -------------------------------------

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = [
      `display:flex`,
      `align-items:center`,
      `gap:6px`,
      `padding:0 8px`,
      `height:${UI.headerHeight}`,
      `border-bottom:1px solid ${UI.borderColor}`,
      `flex-shrink:0`,
    ].join(';');

    header.innerHTML = `
      <span style="color:${UI.textSecondary};font-size:12px;">🔍</span>
      <input data-id="search" placeholder="Filter assets…" autocomplete="off"
        style="flex:1;background:${UI.bg};border:1px solid ${UI.borderColor};color:${UI.textPrimary};
               padding:3px 6px;font-size:${UI.fontSizeSm};border-radius:3px;outline:none;" />
    `;

    header.querySelector<HTMLInputElement>('[data-id="search"]')!
      .addEventListener('input', e => {
        store.set('filterText', (e.target as HTMLInputElement).value.trim().toLowerCase());
      });

    return header;
  }

  // ---- Tree rendering -----------------------------------------

  private renderTree(container: HTMLElement, manifest: Manifest): void {
    container.innerHTML = '';
    this.allRows = [];
    for (const folder of manifest.folders) {
      container.appendChild(this.buildFolder(folder, 0));
    }
  }

  private buildFolder(folder: AssetFolder, depth: number): HTMLElement {
    const wrap = document.createElement('div');

    const headerEl = document.createElement('div');
    headerEl.style.cssText = [
      `display:flex`,
      `align-items:center`,
      `padding:3px 8px 3px ${8 + depth * 14}px`,
      `cursor:pointer`,
      `user-select:none`,
      `color:${UI.textSecondary}`,
      `font-size:${UI.fontSizeSm}`,
    ].join(';');
    headerEl.innerHTML = `<span data-arrow style="margin-right:4px;font-size:10px;">▶</span>${folder.label}`;

    const body = document.createElement('div');
    body.style.display = 'none';
    let expanded = false;

    headerEl.addEventListener('click', () => {
      expanded = !expanded;
      body.style.display = expanded ? '' : 'none';
      headerEl.querySelector<HTMLSpanElement>('[data-arrow]')!.textContent = expanded ? '▼' : '▶';
    });

    for (const item of folder.items) {
      if ('items' in item) {
        body.appendChild(this.buildFolder(item as AssetFolder, depth + 1));
      } else {
        const row = this.buildRow(item as Asset, depth + 1);
        body.appendChild(row);
        this.allRows.push(row);
      }
    }

    wrap.appendChild(headerEl);
    wrap.appendChild(body);
    return wrap;
  }

  private buildRow(asset: Asset, depth: number): HTMLElement {
    const row = document.createElement('div');
    row.dataset.assetId = asset.id;
    row.dataset.label = asset.label.toLowerCase();
    row.dataset.type = asset.type;
    row.style.cssText = [
      `display:flex`,
      `align-items:center`,
      `gap:5px`,
      `padding:2px 8px 2px ${8 + depth * 14}px`,
      `cursor:pointer`,
      `user-select:none`,
      `overflow:hidden`,
    ].join(';');

    const icon = TYPE_ICONS[asset.type];
    row.innerHTML = `
      <span style="font-size:10px;color:${UI.textSecondary};flex-shrink:0;">${icon}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${asset.label}</span>
    `;

    row.addEventListener('pointerenter', () => {
      if (asset.id !== this.selectedId) row.style.background = UI.hoverBg;
    });
    row.addEventListener('pointerleave', () => {
      if (asset.id !== this.selectedId) row.style.background = '';
    });
    row.addEventListener('click', () => {
      store.set('selectedAsset', asset);
      store.set('playback', 'paused');
      store.set('currentFrame', 0);
    });

    return row;
  }

  // ---- Selection ----------------------------------------------

  private applySelection(id: string | null): void {
    if (this.selectedId) {
      const prev = this.element.querySelector<HTMLElement>(`[data-asset-id="${this.selectedId}"]`);
      if (prev) prev.style.background = '';
    }
    this.selectedId = id;
    if (id) {
      const el = this.element.querySelector<HTMLElement>(`[data-asset-id="${id}"]`);
      if (el) {
        el.style.background = UI.selectedBg;
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ---- Filtering ----------------------------------------------

  private applyFilter(): void {
    const text = store.get('filterText');
    for (const row of this.allRows) {
      const label = row.dataset.label ?? '';
      const visible = !text || label.includes(text);
      row.style.display = visible ? '' : 'none';
    }
  }
}
