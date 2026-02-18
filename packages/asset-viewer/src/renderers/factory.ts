// Phase 2 — Renderers

import type { Asset } from '../manifest/types.js';
import type { Renderer } from './Renderer.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { SheetRenderer } from './SheetRenderer.js';
import { SequenceRenderer } from './SequenceRenderer.js';
import { CompositeRenderer } from './CompositeRenderer.js';

/**
 * Create the correct Renderer subclass for a given asset.
 * The switch is exhaustive — TypeScript will error if a new AssetType
 * is added to the union without adding a corresponding case here.
 */
export function createRenderer(asset: Asset): Renderer {
  switch (asset.type) {
    case 'sprite':    return new SpriteRenderer(asset);
    case 'sheet':     return new SheetRenderer(asset);
    case 'sequence':  return new SequenceRenderer(asset);
    case 'composite': return new CompositeRenderer(asset);
  }
}
