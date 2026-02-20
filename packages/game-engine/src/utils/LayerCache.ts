/**
 * LayerCache — bake a static draw pass to an offscreen canvas once,
 * then composite a viewport slice per frame.
 *
 * Typical use: static tilemap ground/decor layers that never change at runtime.
 * The object layer (destructibles, dynamic entities) remains per-frame.
 */

export interface LayerCacheConfig {
  /** Full world width in px. */
  worldWidth: number;
  /** Full world height in px. */
  worldHeight: number;
}

/** Baked static layer. Call `drawSlice` every frame. */
export interface LayerCache {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
}

/**
 * Create an offscreen canvas and call `drawFn` immediately to bake content.
 * The caller's `drawFn` receives the offscreen 2D context.
 */
export function bakeLayer(
  config: LayerCacheConfig,
  drawFn: (ctx: CanvasRenderingContext2D) => void,
): LayerCache {
  const canvas = document.createElement('canvas');
  canvas.width = config.worldWidth;
  canvas.height = config.worldHeight;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  drawFn(ctx);
  return { canvas, ctx };
}

/**
 * Draw the visible viewport slice of a baked LayerCache onto a live canvas context.
 * `cameraX/Y` is the world-space center of the viewport.
 * `screenWidth/Height` is the canvas size in screen pixels.
 *
 * IMPORTANT: `ctx` must NOT have camera transform applied yet.
 * This function draws in screen space, filling (0,0) to (screenWidth, screenHeight).
 */
export function drawLayerSlice(
  ctx: CanvasRenderingContext2D,
  cache: LayerCache,
  cameraX: number,
  cameraY: number,
  viewportWidthWorld: number,
  viewportHeightWorld: number,
  screenWidth: number,
  screenHeight: number,
): void {
  // Source rect in world-space (top-left corner of the visible viewport)
  const sx = cameraX - viewportWidthWorld / 2;
  const sy = cameraY - viewportHeightWorld / 2;
  // Destination is screen-space (0, 0) filling the entire canvas
  ctx.drawImage(
    cache.canvas,
    sx, sy, viewportWidthWorld, viewportHeightWorld,
    0, 0, screenWidth, screenHeight,
  );
}
