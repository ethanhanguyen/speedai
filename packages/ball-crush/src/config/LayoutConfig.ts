/**
 * UI layout and positioning configuration.
 * Tweak these values to adjust screen layout and spacing.
 */
export const LayoutConfig = {
  // Canvas dimensions
  canvas: {
    width: 430,
    height: 750,
  },

  // Grid layout
  grid: {
    rows: 9,
    cols: 9,
    cellSize: 44,
    cellGap: 2,
    boardX: 8,
    boardY: 200,
    ballSpawnOffset: -270, // Y offset for spawning balls above viewport
  },

  // Computed grid dimensions (for convenience)
  get boardWidth(): number {
    return this.grid.cols * (this.grid.cellSize + this.grid.cellGap) - this.grid.cellGap;
  },
  get boardHeight(): number {
    return this.grid.rows * (this.grid.cellSize + this.grid.cellGap) - this.grid.cellGap;
  },

  // UI elements
  ui: {
    header: {
      levelText: {
        x: 15,
        y: 35,
        font: 'bold 22px Arial',
        color: '#ffffff',
      },
      scoreText: {
        x: 415,
        y: 35,
        font: 'bold 22px Arial',
        color: '#ffffff',
      },
      movesText: {
        x: 215,
        y: 35,
        font: 'bold 18px Arial',
        colorNormal: 'rgba(255,255,255,0.8)',
        colorWarning: '#e74c3c',
      },
      targetText: {
        x: 215,
        y: 60,
        font: '14px Arial',
        color: 'rgba(255,255,255,0.5)',
      },
    },

    progressBar: {
      x: 15,
      y: 170,
      width: 400,
      height: 16,
      fillColorNormal: '#2ecc71',
      fillColorWarning: '#f1c40f',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderColor: 'rgba(255,255,255,0.3)',
      borderWidth: 1,
      borderRadius: 8,
    },

    progressText: {
      x: 215,
      y: 182,
      font: 'bold 11px Arial',
      color: '#fff',
    },

    toast: {
      font: 'bold 20px Arial',
      position: 'top' as const,
    },
  },

  // Background gradient
  background: {
    gradientStops: [
      { offset: 0, color: '#1a1a2e' },
      { offset: 0.5, color: '#16213e' },
      { offset: 1, color: '#0f3460' },
    ],
  },
} as const;
