import { ParticleEmitter } from '@speedai/game-engine';
import type { ParticleEmitterConfig, GridModel, CameraSystem, AssetManager } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { ParticleEffectId } from '../tilemap/types.js';
import { MAP_CONFIG } from '../config/MapConfig.js';

/**
 * Manages per-tile continuous particle emitters (smoke, fire, dust, etc.).
 * Scans grid for cells with `particleEffect`, creates/updates emitters,
 * and only ticks visible ones (camera culling).
 */
export class TileParticleLayer {
  private emitters = new Map<string, ParticleEmitter>();
  private imageResolver: ((key: string) => HTMLImageElement | undefined) | null = null;

  /** Provide sprite lookup for sprite-mode effects. */
  setImageResolver(resolver: (key: string) => HTMLImageElement | undefined): void {
    this.imageResolver = resolver;
  }

  /** Scan entire grid and create emitters for cells with particleEffect. */
  init(grid: GridModel<TileCell>): void {
    this.clear();
    const ts = MAP_CONFIG.tileSize;

    for (const [r, c, cell] of grid) {
      if (!cell?.particleEffect) continue;
      this.createEmitter(r, c, cell, ts);
    }
  }

  /** Add, update, or remove a single emitter (for runtime changes). */
  syncCell(r: number, c: number, cell: TileCell): void {
    const key = cellKey(r, c);
    const existing = this.emitters.get(key);

    if (!cell.particleEffect) {
      // Remove
      if (existing) {
        existing.clear();
        this.emitters.delete(key);
      }
      return;
    }

    // Remove old and create fresh
    if (existing) {
      existing.clear();
      this.emitters.delete(key);
    }
    this.createEmitter(r, c, cell, MAP_CONFIG.tileSize);
  }

  /** Update only visible emitters (camera culling via isVisible). */
  update(dt: number, camera: CameraSystem): void {
    const ts = MAP_CONFIG.tileSize;

    for (const [key, emitter] of this.emitters) {
      const [r, c] = parseKey(key);
      if (camera.isVisible(c * ts, r * ts, ts, ts)) {
        emitter.update(dt);
      }
    }
  }

  /** Draw all active emitters. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const emitter of this.emitters.values()) {
      if (emitter.isActive) {
        emitter.draw(ctx);
      }
    }
  }

  /** Remove all emitters. */
  clear(): void {
    for (const emitter of this.emitters.values()) {
      emitter.clear();
    }
    this.emitters.clear();
  }

  get emitterCount(): number {
    return this.emitters.size;
  }

  // ── Private ──

  private createEmitter(r: number, c: number, cell: TileCell, ts: number): void {
    const effect = cell.particleEffect!;
    const preset = MAP_CONFIG.PARTICLE_EFFECTS.presets[effect.effectId];
    if (!preset) return;

    const sizeMult = effect.sizeMultiplier ?? MAP_CONFIG.PARTICLE_EFFECTS.tileBounds.defaultSizeMultiplier;
    const ox = (effect.offsetX ?? 0) * ts;
    const oy = (effect.offsetY ?? 0) * ts;

    const config: ParticleEmitterConfig = {
      ...preset,
      size: preset.size * sizeMult,
      emitRadius: preset.shape === 'circle' ? ts * 0.2 * sizeMult : undefined,
      emitShape: 'circle',
    };

    const emitter = new ParticleEmitter();
    if (this.imageResolver) {
      emitter.setImageResolver(this.imageResolver);
    }

    const worldX = (c + 0.5) * ts + ox;
    const worldY = (r + 0.5) * ts + oy;
    emitter.start(config, worldX, worldY);

    this.emitters.set(cellKey(r, c), emitter);
  }
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function parseKey(key: string): [number, number] {
  const [r, c] = key.split(',');
  return [parseInt(r, 10), parseInt(c, 10)];
}
