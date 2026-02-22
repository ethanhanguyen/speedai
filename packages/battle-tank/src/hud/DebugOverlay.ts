import { DEBUG_CONFIG } from '../config/DebugConfig.js';
import type { EntityManager } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import { AI_STATE } from '../components/AI.js';
import type { AIComponent } from '../components/AI.js';
import { PROJECTILE } from '../components/Projectile.js';
import type { WaveSpawner } from '../systems/WaveSpawner.js';

// ---------------------------------------------------------------------------
// Debug data sources — systems export lightweight snapshots here
// ---------------------------------------------------------------------------

export interface DebugDataSources {
  em: EntityManager;
  waveSpawner: WaveSpawner;
  playerId: number;
  fps: number;
}

// ---------------------------------------------------------------------------
// DebugOverlay — toggled with Backquote, renders top-left panel
// ---------------------------------------------------------------------------

export class DebugOverlay {
  private visible = false;
  private fpsHistory: number[] = [];
  private elapsed = 0;

  /** Call once per frame to check toggle key. */
  toggle(justPressed: boolean): void {
    if (!DEBUG_CONFIG.enabled) return;
    if (justPressed) this.visible = !this.visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(dt: number): void {
    this.elapsed += dt;
  }

  draw(ctx: CanvasRenderingContext2D, sources: DebugDataSources): void {
    if (!DEBUG_CONFIG.enabled || !this.visible) return;

    const { em, waveSpawner, fps } = sources;
    const cfg = DEBUG_CONFIG.overlay;

    // Track FPS (rolling 60-frame average)
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    const avgFps = Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length,
    );

    // Count entities by type
    const tankIds = em.query('Position', TANK_PARTS);
    const projIds = em.query('Position', PROJECTILE);
    const aiIds = em.query(AI_STATE);

    let playerCount = 0;
    let enemyTankCount = 0;
    for (const id of tankIds) {
      const tags = em.getComponent(id, 'Tag') as Set<string> | undefined;
      if (tags?.has('player')) playerCount++;
      else if (tags?.has('enemy')) enemyTankCount++;
    }

    // AI role breakdown
    const roleCounts: Record<string, number> = {};
    for (const id of aiIds) {
      const ai = em.getComponent(id, AI_STATE) as AIComponent | undefined;
      if (ai) {
        roleCounts[ai.role] = (roleCounts[ai.role] ?? 0) + 1;
      }
    }

    // Build text lines
    const lines: Array<{ label: string; value: string }> = [
      { label: 'FPS', value: `${avgFps}` },
      { label: 'Entities', value: `${tankIds.length + projIds.length} (tank:${tankIds.length} proj:${projIds.length})` },
      { label: 'Player', value: `${playerCount}` },
      { label: 'Enemies', value: `${enemyTankCount}` },
      { label: 'AI roles', value: Object.entries(roleCounts).map(([r, c]) => `${r}:${c}`).join(' ') || '—' },
      { label: 'Wave', value: `${waveSpawner.waveNumber} [${waveSpawner.state}]` },
      { label: 'Alive', value: `${waveSpawner.aliveCount}` },
    ];

    // Draw panel
    const x = cfg.padding;
    const y = cfg.padding;
    const lineH = cfg.lineHeight;
    const panelH = cfg.padding * 2 + lines.length * lineH;
    const panelW = cfg.maxWidth;

    ctx.save();
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(x, y, panelW, panelH);

    ctx.font = cfg.font;
    ctx.textBaseline = 'top';

    for (let i = 0; i < lines.length; i++) {
      const row = lines[i];
      const rowY = y + cfg.padding + i * lineH;

      ctx.fillStyle = cfg.labelColor;
      ctx.fillText(`${row.label}: `, x + cfg.padding, rowY);

      ctx.fillStyle = cfg.valueColor;
      const labelWidth = ctx.measureText(`${row.label}: `).width;
      ctx.fillText(row.value, x + cfg.padding + labelWidth, rowY);
    }

    ctx.restore();
  }
}
