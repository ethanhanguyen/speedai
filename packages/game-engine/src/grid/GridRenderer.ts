import type { GridModel } from './GridModel.js';

export interface GridRendererConfig {
  /** Cell background style */
  cellBackground?: {
    color?: string;
    alpha?: number;
    borderRadius?: number;
  };
  /** Selection highlight style */
  selection?: {
    color?: string;
    lineWidth?: number;
    padding?: number;
    borderRadius?: number;
    pulseSpeed?: number;
    alphaBase?: number;
    alphaOscillation?: number;
  };
  /** Debug overlay style */
  debug?: {
    enabled?: boolean;
    font?: string;
    color?: string;
    showRowCol?: boolean;
  };
  /** Grid offset in screen coordinates */
  offsetX?: number;
  offsetY?: number;
}

interface ResolvedConfig {
  cellBackground: {
    color: string;
    alpha: number;
    borderRadius: number;
  };
  selection: {
    color: string;
    lineWidth: number;
    padding: number;
    borderRadius: number;
    pulseSpeed: number;
    alphaBase: number;
    alphaOscillation: number;
  };
  debug: {
    enabled: boolean;
    font: string;
    color: string;
    showRowCol: boolean;
  };
  offsetX: number;
  offsetY: number;
}

export class GridRenderer<T> {
  private config: ResolvedConfig;

  constructor(config: GridRendererConfig = {}) {
    this.config = {
      cellBackground: {
        color: config.cellBackground?.color ?? '#ffffff',
        alpha: config.cellBackground?.alpha ?? 0.1,
        borderRadius: config.cellBackground?.borderRadius ?? 4,
      },
      selection: {
        color: config.selection?.color ?? '#ffffff',
        lineWidth: config.selection?.lineWidth ?? 3,
        padding: config.selection?.padding ?? 4,
        borderRadius: config.selection?.borderRadius ?? 6,
        pulseSpeed: config.selection?.pulseSpeed ?? 6,
        alphaBase: config.selection?.alphaBase ?? 0.5,
        alphaOscillation: config.selection?.alphaOscillation ?? 0.3,
      },
      debug: {
        enabled: config.debug?.enabled ?? false,
        font: config.debug?.font ?? '10px monospace',
        color: config.debug?.color ?? '#00ff00',
        showRowCol: config.debug?.showRowCol ?? true,
      },
      offsetX: config.offsetX ?? 0,
      offsetY: config.offsetY ?? 0,
    };
  }

  /** Draw cell background grid */
  drawCellBackgrounds(ctx: CanvasRenderingContext2D, grid: GridModel<T>): void {
    const cfg = this.config.cellBackground;
    const step = grid.cellSize + grid.cellGap;

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const x = this.config.offsetX + c * step;
        const y = this.config.offsetY + r * step;

        ctx.fillStyle = `rgba(${this.hexToRgb(cfg.color)},${cfg.alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, grid.cellSize, grid.cellSize, cfg.borderRadius);
        ctx.fill();
      }
    }
  }

  /** Draw selection highlight with pulse animation */
  drawSelection(
    ctx: CanvasRenderingContext2D,
    grid: GridModel<T>,
    r: number,
    c: number,
    pulse: number,
  ): void {
    const cfg = this.config.selection;
    const { x, y } = grid.gridToScreen(r, c, this.config.offsetX, this.config.offsetY);
    const halfSize = grid.cellSize / 2 + cfg.padding;

    ctx.save();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = cfg.lineWidth;
    ctx.globalAlpha = cfg.alphaBase + cfg.alphaOscillation * Math.sin(pulse * cfg.pulseSpeed);
    ctx.beginPath();
    ctx.roundRect(
      x - halfSize,
      y - halfSize,
      halfSize * 2,
      halfSize * 2,
      cfg.borderRadius,
    );
    ctx.stroke();
    ctx.restore();
  }

  /** Draw debug overlay (row/col numbers) */
  drawDebugOverlay(ctx: CanvasRenderingContext2D, grid: GridModel<T>): void {
    if (!this.config.debug.enabled) return;

    const cfg = this.config.debug;
    const step = grid.cellSize + grid.cellGap;

    ctx.save();
    ctx.font = cfg.font;
    ctx.fillStyle = cfg.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (cfg.showRowCol) {
          const x = this.config.offsetX + c * step + grid.cellSize / 2;
          const y = this.config.offsetY + r * step + grid.cellSize / 2;
          ctx.fillText(`${r},${c}`, x, y);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Override this method to customize cell rendering.
   * Called for each cell in the grid.
   */
  drawCell(
    _ctx: CanvasRenderingContext2D,
    _grid: GridModel<T>,
    _r: number,
    _c: number,
    _cell: T | null,
  ): void {
    // Default: no-op (users override this)
    // Example override:
    // const { x, y } = grid.gridToScreen(r, c, this.config.offsetX, this.config.offsetY);
    // ctx.fillStyle = '#ff0000';
    // ctx.fillRect(x - 10, y - 10, 20, 20);
  }

  /**
   * Draw all cells using the custom drawCell override.
   */
  drawAllCells(ctx: CanvasRenderingContext2D, grid: GridModel<T>): void {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.get(r, c);
        this.drawCell(ctx, grid, r, c, cell);
      }
    }
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '255,255,255';
    return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
  }
}
