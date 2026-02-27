/** Object rotation angles (degrees). */
export enum Rotation {
  DEG_0 = 0,
  DEG_90 = 90,
  DEG_180 = 180,
  DEG_270 = 270,
}

export const MAP_CONFIG = {
  tileSize: 64, // pixels per tile side

  /** Default terrain for empty/unknown cells (mockup fallback, erase tool). */
  DEFAULT_GROUND: 'loose_sand' as const,
  /** Default terrain for cleared cells (erase/clear tool). */
  CLEAR_GROUND: 'grass_plains' as const,

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

  /** Per-tile object transform bounds (designer sliders). */
  OBJECT_TRANSFORM: {
    minScale: 0.25,
    maxScale: 2.0,
    defaultScale: 1.0,
    scaleStep: 0.05,
    maxOffset: 0.5,      // normalized to tileSize (±half tile)
    offsetStep: 0.05,
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

  /** Designer map controls (keyboard bindings). */
  KEY_BINDINGS: {
    PAN_MODIFIER: ' ',        // Space key for pan
    ZOOM_MODIFIER: 'Control', // Ctrl/Cmd for zoom
    RESET_ZOOM: 'Ctrl+0',
    PRESET_ZOOM_50: 'Ctrl+1',
    PRESET_ZOOM_100: 'Ctrl+2',
    PRESET_ZOOM_200: 'Ctrl+3',
    ARROW_PAN_SPEED: 50,      // pixels per arrow key press
    ARROW_PAN_FAST_MULT: 3,   // multiplier with Shift
  },

  /** Designer canvas rendering (grid, selection, hover, symbols). */
  DESIGNER_RENDERING: {
    gridBaseOpacity: 0.15,        // min grid line opacity
    gridZoomScale: 0.08,          // opacity increase per zoom unit
    gridMaxOpacity: 0.4,          // clamped ceiling
    gridColorRGB: '100, 200, 255',   // RGB triplet for rgba() composition
    hoverFill: 'rgba(255, 255, 255, 0.08)',
    hoverStroke: 'rgba(255, 255, 255, 0.2)',
    selectionColor: '#00ff88',
    selectionOuterWidth: 2.5,
    selectionInnerInset: 3,       // px inset for inner border
    selectionInnerAlpha: 0.5,
    symbolFontScale: 0.4,         // relative to tileSize
    symbolColor: 'rgba(200, 200, 200, 0.5)',
    warningColor: '#ffaa33',
    warningLineWidth: 2,
    emptyCanvasColor: '#1a1a1a',
    emptyTextColor: '#666',
  },

  /** Per-tile particle effect presets and editor bounds. */
  PARTICLE_EFFECTS: {
    presets: {
      smoke: {
        rate: 12,
        speed: 30,
        spread: 0.8,
        direction: -Math.PI / 2,
        lifetime: 2.0,
        lifetimeVariance: 0.4,
        size: 10,
        sizeOverLife: [0.5, 2.0] as [number, number],
        colorOverLife: ['#888888', '#aaaaaa', '#cccccc'],
        gravity: -8,
        damping: 0.96,
        turbulence: 15,
        blendMode: 'source-over' as const,
        alphaOverLife: [0.7, 0] as [number, number],
        shape: 'circle' as const,
      },
      fire: {
        rate: 25,
        speed: 50,
        spread: 0.6,
        direction: -Math.PI / 2,
        lifetime: 0.8,
        lifetimeVariance: 0.2,
        size: 8,
        sizeOverLife: [1.0, 0.3] as [number, number],
        colorOverLife: ['#FFD700', '#FF6600', '#FF3300', '#331100'],
        gravity: -20,
        damping: 0.98,
        turbulence: 30,
        blendMode: 'lighter' as const,
        alphaOverLife: [1.0, 0] as [number, number],
        shape: 'circle' as const,
      },
      dust: {
        rate: 8,
        speed: 15,
        spread: Math.PI * 2,
        direction: -Math.PI / 2,
        lifetime: 3.0,
        lifetimeVariance: 0.8,
        size: 6,
        sizeOverLife: [0.8, 1.5] as [number, number],
        colorOverLife: ['#aa9966', '#ccbb88'],
        gravity: 2,
        damping: 0.94,
        turbulence: 10,
        blendMode: 'source-over' as const,
        alphaOverLife: [0.5, 0] as [number, number],
        shape: 'circle' as const,
      },
      sparks: {
        rate: 15,
        speed: 120,
        spread: 1.2,
        direction: -Math.PI / 2,
        lifetime: 0.5,
        lifetimeVariance: 0.15,
        size: 3,
        sizeOverLife: [1.0, 0.2] as [number, number],
        colorOverLife: ['#FFFF00', '#FF8800', '#FF4400'],
        gravity: 80,
        damping: 0.99,
        turbulence: 0,
        blendMode: 'lighter' as const,
        alphaOverLife: [1.0, 0] as [number, number],
        shape: 'streak' as const,
      },
      steam: {
        rate: 10,
        speed: 25,
        spread: 0.5,
        direction: -Math.PI / 2,
        lifetime: 1.5,
        lifetimeVariance: 0.3,
        size: 12,
        sizeOverLife: [0.3, 2.5] as [number, number],
        colorOverLife: ['#dddddd', '#eeeeee'],
        gravity: -12,
        damping: 0.95,
        turbulence: 20,
        blendMode: 'source-over' as const,
        alphaOverLife: [0.6, 0] as [number, number],
        shape: 'circle' as const,
      },
    },
    /** Editor slider bounds for per-tile effect tuning. */
    tileBounds: {
      minSizeMultiplier: 0.25,
      maxSizeMultiplier: 3.0,
      defaultSizeMultiplier: 1.0,
      sizeStep: 0.1,
      maxOffset: 0.5,
      offsetStep: 0.05,
    },
  },

  /** Designer control hints panel (screen-space, bottom-right). */
  CONTROL_HINTS: {
    enabled: true,
    padding: 12,              // px from bottom-right edge
    width: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(100, 200, 255, 0.3)',
    textColor: '#ddd',
    fontSize: 11,
    lineHeight: 18,
  },
};
