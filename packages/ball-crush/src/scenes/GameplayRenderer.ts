import type { Grid } from '../grid/Grid.js';
import type { BallRenderer } from '../rendering/BallRenderer.js';
import type { SpecialEffectRenderer } from '../rendering/SpecialEffectRenderer.js';
import type { FloatingTextManager } from '../rendering/FloatingText.js';
import type { ParticleBurst, ScreenShake, Flash, Toast, ProgressBar, ObjectiveState } from '@speedai/game-engine';
import type { EntityManager } from '@speedai/game-engine';
import type { GameState } from './GameplayStateMachine.js';
import { ROWS, COLS, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, CELL_SIZE, CELL_GAP } from '../grid/Grid.js';
import { HintConfig } from '../config/HintConfig.js';
import { VisualConfig } from '../config/VisualConfig.js';
import { getCellTypeDef } from '../config/CellTypes.js';
import { ObjectiveConfig, getObjectiveDisplay } from '../config/ObjectiveConfig.js';

export interface RenderContext {
  grid: Grid;
  entityMap: (number | null)[][];
  entityManager: EntityManager;
  ballRenderer: BallRenderer;
  specialFx: SpecialEffectRenderer;
  floatingText: FloatingTextManager;
  particles: ParticleBurst;
  shake: ScreenShake;
  flash: Flash;
  toast: Toast;
  progressBar: ProgressBar;
  level: number;
  score: number;
  totalScore: number;
  movesLeft: number;
  targetScore: number;
  state: GameState;
  selectedCell: { r: number; c: number } | null;
  selectionTime: number;
  hintCells: { r1: number; c1: number; r2: number; c2: number } | null;
  hintLevel: 'none' | 'subtle' | 'strong';
  comboGlowIntensity: number;
  time: number;
  objectives: ObjectiveState[];
  showObjectivesPanel: boolean;
}

export class GameplayRenderer {
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, context: RenderContext): void {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, 750);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(0.5, '#16213e');
    bg.addColorStop(1, '#0f3460');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 430, 750);

    ctx.save();
    context.shake.apply(ctx);

    // Last-move vignette (B5)
    if (context.movesLeft === 1) {
      this.renderVignette(ctx, context);
    }

    // UI Header
    this.renderUI(ctx, context);

    // Objectives panel
    if (context.showObjectivesPanel) {
      this.renderObjectives(ctx, context);
    }

    // Grid cells
    context.ballRenderer.drawGridCells(ctx);

    // Border glow (combo escalation)
    if (context.comboGlowIntensity > 0) {
      this.renderBorderGlow(ctx, context.comboGlowIntensity);
    }

    // Solid obstacles (drawn instead of balls)
    this.renderSolidObstacles(ctx, context);

    // Balls
    this.renderBalls(ctx, context);

    // Overlay obstacles (drawn on top of balls — e.g. ice)
    this.renderOverlayObstacles(ctx, context);

    // Selection highlight
    if (context.selectedCell && context.state === 'IDLE') {
      const pos = context.grid.gridToScreen(context.selectedCell.r, context.selectedCell.c);
      context.ballRenderer.drawSelector(ctx, pos.x, pos.y, context.selectionTime);
    }

    // Hint arrow (strong hint only)
    if (context.hintCells && context.hintLevel === 'strong' && context.state === 'IDLE') {
      this.renderHintArrow(ctx, context);
    }

    // Special effects overlay (beams, rings, lightning) — inside shake context
    context.specialFx.draw(ctx);

    ctx.restore();

    // Effects overlay
    context.particles.draw(ctx);
    context.floatingText.draw(ctx);
    context.flash.draw(ctx, 430, 750);
    context.toast.draw(ctx, 430, 750);
  }

  private renderUI(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    ctx.save();
    ctx.textAlign = 'left';

    // Level
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`Level ${context.level}`, 15, 35);

    // Score
    ctx.textAlign = 'right';
    ctx.fillText(`${context.score + context.totalScore}`, 415, 35);

    // Moves (with pulse on last move - B5)
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Arial';
    let moveAlpha = 1.0;
    if (context.movesLeft === 1) {
      const pulseSpeed = VisualConfig.lastMove.pulseSpeed;
      moveAlpha = 0.6 + 0.4 * Math.abs(Math.sin(context.time * pulseSpeed));
    }
    ctx.fillStyle = context.movesLeft <= 5 ? '#e74c3c' : 'rgba(255,255,255,0.8)';
    ctx.globalAlpha = moveAlpha;
    ctx.fillText(`${context.movesLeft} moves`, 215, 35);
    ctx.globalAlpha = 1.0;

    if (!context.showObjectivesPanel) {
      // Target (only when no explicit objectives)
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`Target: ${context.targetScore}`, 215, 60);

      // Progress bar
      context.progressBar.value = Math.min(1, context.score / context.targetScore);
      if (context.score >= context.targetScore * 0.8) {
        context.progressBar.fillColor = '#f1c40f';
      } else {
        context.progressBar.fillColor = '#2ecc71';
      }
      context.progressBar.draw(ctx);

      // Progress text
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(
        `${Math.min(context.score, context.targetScore)} / ${context.targetScore}`,
        215, 182,
      );
    }

    ctx.restore();
  }

  private renderObjectives(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    const cfg = ObjectiveConfig.panel;
    let y = cfg.y;

    for (const obj of context.objectives) {
      const display = getObjectiveDisplay(obj.id);
      const complete = obj.current >= obj.target;
      const centerY = y + cfg.iconSize / 2;

      // Icon circle
      ctx.beginPath();
      ctx.arc(15 + cfg.iconSize / 2, centerY, cfg.iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = complete ? cfg.completedColor : display.color;
      ctx.fill();

      // Label
      ctx.font = cfg.labelFont;
      ctx.textAlign = 'left';
      ctx.fillStyle = complete ? cfg.completedColor : cfg.pendingColor;
      ctx.fillText(display.label, 15 + cfg.iconSize + cfg.gap, centerY + 4);

      // Progress or checkmark
      ctx.textAlign = 'right';
      if (complete) {
        ctx.fillStyle = cfg.completedColor;
        ctx.font = 'bold 14px Arial';
        ctx.fillText('\u2713', 415, centerY + 5);
      } else {
        ctx.font = cfg.progressFont;
        ctx.fillStyle = cfg.pendingColor;
        ctx.fillText(`${obj.current}/${obj.target}`, 415, centerY + 4);
      }

      y += cfg.rowHeight;
    }
  }

  private renderBalls(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const eid = context.entityMap[r][c];
        if (eid === null) continue;

        const cell = context.grid.getCell(r, c);
        if (!cell?.color) continue;

        // Skip solid obstacles (they have no ball to draw)
        if (cell.obstacle) {
          const def = getCellTypeDef(cell.obstacle.type);
          if (def && def.visual.mode === 'solid') continue;
        }

        const pos = context.entityManager.getComponent(eid, 'Position') as { x: number; y: number } | undefined;
        const sprite = context.entityManager.getComponent(eid, 'Sprite') as {
          scaleX: number; scaleY: number; alpha: number;
        } | undefined;

        if (!pos || !sprite) continue;

        context.ballRenderer.drawBall(
          ctx,
          pos.x,
          pos.y,
          cell.color,
          cell.special,
          sprite.scaleX,
          sprite.alpha,
          context.time,
          r,
        );
      }
    }
  }

  private renderSolidObstacles(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = context.grid.getCell(r, c);
        if (!cell?.obstacle) continue;
        const def = getCellTypeDef(cell.obstacle.type);
        if (!def || def.visual.mode !== 'solid') continue;

        const x = BOARD_X + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        const y = BOARD_Y + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        context.ballRenderer.drawObstacle(ctx, x, y, def, cell.obstacle.hp);
      }
    }
  }

  private renderOverlayObstacles(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = context.grid.getCell(r, c);
        if (!cell?.obstacle) continue;
        const def = getCellTypeDef(cell.obstacle.type);
        if (!def || def.visual.mode !== 'overlay') continue;

        const x = BOARD_X + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        const y = BOARD_Y + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        context.ballRenderer.drawObstacle(ctx, x, y, def, cell.obstacle.hp);
      }
    }
  }

  private renderHintArrow(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    if (!context.hintCells) return;

    const { r1, c1, r2, c2 } = context.hintCells;
    const pos1 = context.grid.gridToScreen(r1, c1);
    const pos2 = context.grid.gridToScreen(r2, c2);

    const cfg = HintConfig.arrow;

    ctx.save();

    // Draw curved arrow with glow
    ctx.shadowBlur = cfg.glowBlur;
    ctx.shadowColor = cfg.glowColor;
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = cfg.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate control point for bezier curve
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const controlX = (pos1.x + pos2.x) / 2 + perpX * distance * cfg.curveAmount;
    const controlY = (pos1.y + pos2.y) / 2 + perpY * distance * cfg.curveAmount;

    // Draw curved line
    ctx.beginPath();
    ctx.moveTo(pos1.x, pos1.y);
    ctx.quadraticCurveTo(controlX, controlY, pos2.x, pos2.y);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(pos2.y - controlY, pos2.x - controlX);
    const headSize = cfg.arrowHeadSize;
    ctx.beginPath();
    ctx.moveTo(pos2.x, pos2.y);
    ctx.lineTo(
      pos2.x - headSize * Math.cos(angle - Math.PI / 6),
      pos2.y - headSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(pos2.x, pos2.y);
    ctx.lineTo(
      pos2.x - headSize * Math.cos(angle + Math.PI / 6),
      pos2.y - headSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();

    ctx.restore();
  }

  private renderBorderGlow(ctx: CanvasRenderingContext2D, intensity: number): void {
    const cfg = VisualConfig.borderGlow;

    ctx.save();

    // Interpolate color from low to high based on intensity
    const r1 = parseInt(cfg.colorLow.slice(1, 3), 16);
    const g1 = parseInt(cfg.colorLow.slice(3, 5), 16);
    const b1 = parseInt(cfg.colorLow.slice(5, 7), 16);
    const r2 = parseInt(cfg.colorHigh.slice(1, 3), 16);
    const g2 = parseInt(cfg.colorHigh.slice(3, 5), 16);
    const b2 = parseInt(cfg.colorHigh.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * intensity);
    const g = Math.round(g1 + (g2 - g1) * intensity);
    const b = Math.round(b1 + (b2 - b1) * intensity);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.strokeStyle = color;
    ctx.lineWidth = cfg.width;
    ctx.shadowBlur = cfg.blurRadius;
    ctx.shadowColor = color;
    ctx.globalAlpha = intensity;

    // Draw border around game board
    ctx.strokeRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

    ctx.restore();
  }

  private renderVignette(ctx: CanvasRenderingContext2D, context: RenderContext): void {
    const cfg = VisualConfig.lastMove;
    const width = 430;
    const height = 750;

    ctx.save();

    // Create radial gradient from center to edges
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.8;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(0,0,0,0)`);
    gradient.addColorStop(0.6, `rgba(0,0,0,0)`);
    gradient.addColorStop(1, `rgba(0,0,0,${cfg.vignetteAlpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}
