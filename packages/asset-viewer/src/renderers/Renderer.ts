// Phase 2 — Renderers

import type { Asset } from '../manifest/types.js';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface DrawOptions {
  /**
   * Per-layer rotation angles in radians, keyed by layer ID.
   * Used by CompositeRenderer; ignored by all other renderers.
   */
  readonly layerAngles?: Readonly<Record<string, number>>;
}

export interface Renderer {
  readonly asset: Asset;
  readonly loadState: LoadState;
  /** Total number of animation frames. Static assets return 1. */
  readonly frameCount: number;
  /** Natural width of a single frame in pixels. */
  readonly naturalWidth: number;
  /** Natural height of a single frame in pixels. */
  readonly naturalHeight: number;

  load(): Promise<void>;

  /**
   * Draw the asset centered at (cx, cy) using the given scale.
   * @param frame  0-based frame index. Clamped to [0, frameCount-1].
   * @param cx     Canvas X coordinate for the center of the drawn image.
   * @param cy     Canvas Y coordinate for the center of the drawn image.
   * @param scale  Uniform scale factor applied to the natural dimensions.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    frame: number,
    cx: number,
    cy: number,
    scale: number,
    options?: DrawOptions,
  ): void;
}
