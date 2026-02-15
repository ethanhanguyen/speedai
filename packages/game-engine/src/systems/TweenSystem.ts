import { System } from '../core/System.js';
import type { EntityId } from '../core/types.js';

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t: number) => {
    const c = 1.70158;
    return 1 + (t - 1) * (t - 1) * ((c + 1) * (t - 1) + c);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  },
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeInBack: (t: number) => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
} as const;

export interface TweenConfig {
  target: Record<string, number>;
  from?: Record<string, number>;
  duration: number;
  easing?: EasingFn;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  onUpdate?: (values: Record<string, number>) => void;
  onComplete?: () => void;
}

interface ActiveTween {
  entityId: EntityId | null;
  component: string | null;
  target: Record<string, number>;
  from: Record<string, number>;
  current: Record<string, number>;
  duration: number;
  elapsed: number;
  delay: number;
  easing: EasingFn;
  repeat: number;
  repeatCount: number;
  yoyo: boolean;
  forward: boolean;
  onUpdate?: (values: Record<string, number>) => void;
  onComplete?: () => void;
  dead: boolean;
}

export class TweenSystem extends System {
  private tweens: ActiveTween[] = [];

  constructor() {
    super('TweenSystem', [], 100);
  }

  /** Tween component data on an entity. */
  tweenEntity(entityId: EntityId, component: string, config: TweenConfig): ActiveTween {
    const compData = this.entities.getComponent(entityId, component);
    const from: Record<string, number> = {};
    for (const key of Object.keys(config.target)) {
      from[key] = config.from?.[key] ?? (compData as Record<string, number>)?.[key] ?? 0;
    }
    const tween = this.createTween(config, from);
    tween.entityId = entityId;
    tween.component = component;
    this.tweens.push(tween);
    return tween;
  }

  /** Tween arbitrary values (no entity attached). */
  tween(config: TweenConfig): ActiveTween {
    const from: Record<string, number> = {};
    for (const key of Object.keys(config.target)) {
      from[key] = config.from?.[key] ?? 0;
    }
    const tween = this.createTween(config, from);
    this.tweens.push(tween);
    return tween;
  }

  /** Cancel all tweens for an entity. */
  cancelEntity(entityId: EntityId): void {
    for (const tween of this.tweens) {
      if (tween.entityId === entityId) tween.dead = true;
    }
  }

  /** Cancel all tweens. */
  cancelAll(): void {
    for (const tween of this.tweens) {
      tween.dead = true;
    }
  }

  get activeTweenCount(): number {
    return this.tweens.filter(t => !t.dead).length;
  }

  update(dt: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tween = this.tweens[i];
      if (tween.dead) {
        this.tweens.splice(i, 1);
        continue;
      }

      // Delay
      if (tween.delay > 0) {
        tween.delay -= dt;
        continue;
      }

      tween.elapsed += dt;
      let t = Math.min(tween.elapsed / tween.duration, 1);
      if (!tween.forward) t = 1 - t;

      const eased = tween.easing(t);

      // Interpolate
      for (const key of Object.keys(tween.target)) {
        tween.current[key] = tween.from[key] + (tween.target[key] - tween.from[key]) * eased;
      }

      // Apply to entity component if attached
      if (tween.entityId !== null && tween.component) {
        const comp = this.entities.getComponent(tween.entityId, tween.component);
        if (comp) {
          for (const key of Object.keys(tween.current)) {
            (comp as Record<string, number>)[key] = tween.current[key];
          }
        }
      }

      tween.onUpdate?.(tween.current);

      // Complete?
      if (tween.elapsed >= tween.duration) {
        if (tween.yoyo) {
          tween.forward = !tween.forward;
          tween.elapsed = 0;
          if (tween.forward) {
            tween.repeatCount++;
            if (tween.repeat >= 0 && tween.repeatCount > tween.repeat) {
              tween.dead = true;
              tween.onComplete?.();
            }
          }
        } else if (tween.repeat < 0 || tween.repeatCount < tween.repeat) {
          tween.elapsed = 0;
          tween.repeatCount++;
        } else {
          tween.dead = true;
          tween.onComplete?.();
        }
      }
    }
  }

  dispose(): void {
    this.tweens.length = 0;
  }

  private createTween(config: TweenConfig, from: Record<string, number>): ActiveTween {
    return {
      entityId: null,
      component: null,
      target: { ...config.target },
      from: { ...from },
      current: { ...from },
      duration: config.duration,
      elapsed: 0,
      delay: config.delay ?? 0,
      easing: config.easing ?? Easing.linear,
      repeat: config.repeat ?? 0,
      repeatCount: 0,
      yoyo: config.yoyo ?? false,
      forward: true,
      onUpdate: config.onUpdate,
      onComplete: config.onComplete,
      dead: false,
    };
  }
}
