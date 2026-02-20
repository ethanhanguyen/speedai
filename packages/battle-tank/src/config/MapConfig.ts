/** Object rotation angles (degrees). */
export enum Rotation {
  DEG_0 = 0,
  DEG_90 = 90,
  DEG_180 = 180,
  DEG_270 = 270,
}

export const MAP_CONFIG = {
  tileSize: 64, // pixels per tile side

  /** Tile texture coherence (Tier A rotation + Tier B transitions). */
  TILE_COHERENCE: {
    hashRowPrime:    31,    // row weight in per-cell rotation hash
    hashColPrime:    17,    // col weight in per-cell rotation hash
    transitionWidth: 16,    // px — blend strip width at each terrain seam (1/4 tile)
    transitionAlpha: 0.65,  // peak opacity of the blended neighbor edge at the seam
  },

  /** Multi-tile object defaults. */
  MULTI_TILE: {
    continuationChar: '+',                    // ASCII marker for continuation cells
    defaultPivot: { x: 0.5, y: 0.5 },        // center pivot (0-1 normalized)
  },

  /** Mini-map overlay (top-right corner, screen-space). */
  MINI_MAP: {
    size: 180,           // px — square display size
    margin: 12,          // px from canvas top-right edge
    opacity: 0.85,
    borderWidth: 2,
    borderColor: '#aabbff',
    backgroundColor: '#0a0a12',
    playerDotRadius: 4,
    enemyDotRadius: 3,
    playerColor: '#00ff88',
    /** Enemy dot colors are read from COMBAT_CONFIG.roleTints at draw time. */
  },
};
