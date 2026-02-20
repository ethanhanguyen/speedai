import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { MAP_SELECT_CONFIG } from '../config/MapSelectConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { AI_STATE } from '../components/AI.js';
import type { AIComponent } from '../components/AI.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';

const MM = MAP_CONFIG.MINI_MAP;

export class MiniMapRenderer {
  private mapCanvas: HTMLCanvasElement | null = null;
  private mapCols = 0;
  private mapRows = 0;

  /**
   * Call once after parseTilemap. Pre-renders the static map layer to an
   * offscreen canvas (1px per tile cell); blitted + scaled each frame.
   */
  init(grid: GridModel<TileCell>, cols: number, rows: number): void {
    this.mapCols = cols;
    this.mapRows = rows;

    const oc = document.createElement('canvas');
    oc.width = cols;
    oc.height = rows;
    const octx = oc.getContext('2d')!;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid.get(r, c);
        if (!cell) continue;

        // Ground color
        const tileColor = MAP_SELECT_CONFIG.tileColors[cell.ground];
        octx.fillStyle = tileColor;
        octx.fillRect(c, r, 1, 1);

        // Object overlay
        if (cell.object !== ObjectId.NONE) {
          const objColor = MAP_SELECT_CONFIG.objectColors[cell.object];
          if (objColor) {
            octx.fillStyle = objColor;
            octx.fillRect(c, r, 1, 1);
          }
        }
      }
    }

    this.mapCanvas = oc;
  }

  /**
   * Draw mini-map to top-right corner of the canvas each frame.
   * @param em  Engine EntityManager (via `this.entityManager` in the scene).
   * @param playerId  Player entity ID.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    em: { query(...components: string[]): number[]; getComponent(id: number, type: string): unknown },
    playerId: number,
  ): void {
    if (!this.mapCanvas || this.mapCols === 0) return;

    const size = MM.size;
    const margin = MM.margin;
    const x = canvasW - size - margin;
    const y = margin;

    ctx.save();
    ctx.globalAlpha = MM.opacity;

    // Background
    ctx.fillStyle = MM.backgroundColor;
    ctx.fillRect(x, y, size, size);

    // Map texture
    ctx.drawImage(this.mapCanvas, x, y, size, size);

    // Border
    ctx.strokeStyle = MM.borderColor;
    ctx.lineWidth = MM.borderWidth;
    ctx.strokeRect(x, y, size, size);

    ctx.globalAlpha = 1;

    // Helper: world pos → mini-map screen pos
    const ts = MAP_CONFIG.tileSize;
    const worldW = this.mapCols * ts;
    const worldH = this.mapRows * ts;
    const toMx = (wx: number) => x + (wx / worldW) * size;
    const toMy = (wy: number) => y + (wy / worldH) * size;

    // Enemy tank dots
    const tankIds = em.query('Position', TANK_PARTS, AI_STATE);
    for (const id of tankIds) {
      const ai = em.getComponent(id, AI_STATE) as AIComponent | undefined;
      const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      if (!pos || !ai) continue;
      const color = COMBAT_CONFIG.roleTints[ai.role] ?? '#ff4444';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toMx(pos.x), toMy(pos.y), MM.enemyDotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemy infantry dots
    const infantryIds = em.query('Position', INFANTRY_PARTS, AI_STATE);
    for (const id of infantryIds) {
      const ai = em.getComponent(id, AI_STATE) as AIComponent | undefined;
      const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      if (!pos || !ai) continue;
      const color = COMBAT_CONFIG.roleTints[ai.role] ?? '#ff4444';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toMx(pos.x), toMy(pos.y), MM.enemyDotRadius - 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player dot (drawn last — always on top)
    const playerPos = em.getComponent(playerId, 'Position') as { x: number; y: number } | undefined;
    if (playerPos) {
      ctx.fillStyle = MM.playerColor;
      ctx.beginPath();
      ctx.arc(toMx(playerPos.x), toMy(playerPos.y), MM.playerDotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
