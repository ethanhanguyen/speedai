export const MAP_CONFIG = {
  tileSize: 64, // pixels per tile side

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
