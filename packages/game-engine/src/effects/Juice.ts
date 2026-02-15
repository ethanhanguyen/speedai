import { ScreenShake } from './ScreenShake.js';
import { Flash } from './Flash.js';
import { SlowMotion } from './SlowMotion.js';
import { ParticleBurst } from './ParticleBurst.js';
import type { ParticleBurstConfig } from './ParticleBurst.js';

/**
 * Convenience wrapper that groups all "juice" effects together.
 */
export class Juice {
  readonly shake = new ScreenShake();
  readonly flash = new Flash();
  readonly slowMotion = new SlowMotion();
  readonly particles = new ParticleBurst();

  /** Trigger multiple effects at once for maximum impact. */
  impact(opts?: {
    shake?: { intensity: number; duration: number };
    flash?: { color: string; duration: number };
    slowMotion?: { scale: number; duration: number };
    particles?: ParticleBurstConfig;
  }): void {
    if (opts?.shake) {
      this.shake.trigger(opts.shake.intensity, opts.shake.duration);
    }
    if (opts?.flash) {
      this.flash.trigger(opts.flash.color, opts.flash.duration);
    }
    if (opts?.slowMotion) {
      this.slowMotion.trigger(opts.slowMotion.scale, opts.slowMotion.duration);
    }
    if (opts?.particles) {
      this.particles.emit(opts.particles);
    }
  }

  update(dt: number): void {
    this.shake.update(dt);
    this.flash.update(dt);
    this.slowMotion.update(dt);
    this.particles.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.shake.apply(ctx);
    this.particles.draw(ctx);
    this.flash.draw(ctx, width, height);
  }
}
