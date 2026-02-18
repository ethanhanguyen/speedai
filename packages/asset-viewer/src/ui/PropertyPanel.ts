// Phase 5 — Property Panel

import type { Asset } from '../manifest/types.js';
import { store } from '../state.js';
import { UI } from './styles.js';

export class PropertyPanel {
  readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = [
      `width:${UI.propsWidth}`,
      `min-width:${UI.propsWidth}`,
      `background:${UI.panelBg}`,
      `border-left:1px solid ${UI.borderColor}`,
      `display:flex`,
      `flex-direction:column`,
      `overflow:hidden`,
      `font-family:${UI.fontSans}`,
      `font-size:${UI.fontSizeSm}`,
      `color:${UI.textPrimary}`,
    ].join(';');

    this.element.appendChild(this.buildHeader());
    const body = document.createElement('div');
    body.dataset.id = 'body';
    body.style.cssText = 'flex:1;overflow-y:auto;padding:10px;';
    body.innerHTML = this.emptyHtml();
    this.element.appendChild(body);

    store.on('selectedAsset', asset => this.update(asset));
    store.on('currentFrame', frame => {
      const span = this.element.querySelector<HTMLSpanElement>('[data-role="cur-frame"]');
      if (span) span.textContent = String(frame);
    });
    store.on('scale', scale => {
      const span = this.element.querySelector<HTMLSpanElement>('[data-role="scale"]');
      if (span) span.textContent = `${(scale * 100).toFixed(0)}%`;
    });
  }

  // ---- Header -------------------------------------------------

  private buildHeader(): HTMLElement {
    const h = document.createElement('div');
    h.style.cssText = [
      `height:${UI.headerHeight}`,
      `display:flex`,
      `align-items:center`,
      `padding:0 10px`,
      `border-bottom:1px solid ${UI.borderColor}`,
      `flex-shrink:0`,
      `color:${UI.textSecondary}`,
      `font-size:${UI.fontSizeSm}`,
      `letter-spacing:0.05em`,
    ].join(';');
    h.textContent = 'PROPERTIES';
    return h;
  }

  // ---- Update -------------------------------------------------

  private update(asset: Asset | null): void {
    const body = this.element.querySelector<HTMLElement>('[data-id="body"]')!;
    body.innerHTML = asset ? this.assetHtml(asset) : this.emptyHtml();
  }

  private emptyHtml(): string {
    return `<div style="color:${UI.textSecondary};margin-top:20px;text-align:center;">No asset selected</div>`;
  }

  private assetHtml(asset: Asset): string {
    const rows: string[] = [];

    rows.push(propRow('Type',  `<code>${asset.type}</code>`));
    rows.push(propRow('Scale', `<span data-role="scale">${(store.get('scale') * 100).toFixed(0)}%</span>`));

    switch (asset.type) {
      case 'sprite':
        rows.push(propRow('Size',   `${asset.width} × ${asset.height} px`));
        break;

      case 'sheet':
        rows.push(propRow('Sheet',  `${asset.sheetWidth} × ${asset.sheetHeight} px`));
        rows.push(propRow('Frame',  `${asset.frameWidth} × ${asset.frameHeight} px`));
        rows.push(propRow('Frames', `<span data-role="cur-frame">${store.get('currentFrame')}</span> / ${asset.frameCount - 1}`));
        rows.push(propRow('FPS',    String(asset.fps)));
        break;

      case 'sequence':
        rows.push(propRow('Frame',  `${asset.frameWidth} × ${asset.frameHeight} px`));
        rows.push(propRow('Frames', `<span data-role="cur-frame">${store.get('currentFrame')}</span> / ${asset.frames.length - 1}`));
        rows.push(propRow('FPS',    String(asset.fps)));
        break;

      case 'composite':
        rows.push(propRow('Canvas', `${asset.canvasWidth} × ${asset.canvasHeight} px`));
        rows.push(propRow('Layers', String(asset.layers.length)));
        rows.push(this.layerListHtml(asset.layers));
        break;
    }

    if (asset.tags.length > 0) {
      const chips = asset.tags
        .map(t => `<span style="display:inline-block;background:${UI.tagBg};color:${UI.tagText};padding:1px 5px;border-radius:3px;margin:1px;">${t}</span>`)
        .join('');
      rows.push(propRow('Tags', chips));
    }

    rows.push(propRow('ID', `<code style="font-size:9px;word-break:break-all;color:${UI.textSecondary};">${asset.id}</code>`));

    return `
      <div style="font-weight:600;margin-bottom:10px;font-size:${UI.fontSizeMd};">${asset.label}</div>
      <table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>
    `;
  }

  private layerListHtml(layers: readonly import('../manifest/types.js').CompositeLayer[]): string {
    const items = [...layers]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map(l => `<li style="padding:1px 0;">${l.label}</li>`)
      .join('');
    return `<tr><td colspan="2"><ul style="list-style:none;padding:0;color:${UI.textSecondary};margin-top:4px;">${items}</ul></td></tr>`;
  }
}

function propRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:3px 10px 3px 0;color:${UI.textSecondary};white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:3px 0;word-break:break-word;">${value}</td>
    </tr>
  `;
}
