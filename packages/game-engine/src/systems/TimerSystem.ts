import { System } from '../core/System.js';
import { EventEmitter } from '../core/EventEmitter.js';

export interface TimerConfig {
  id: string;
  duration: number;
  repeat?: boolean;
  autoStart?: boolean;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
}

interface ActiveTimer {
  id: string;
  duration: number;
  remaining: number;
  repeat: boolean;
  paused: boolean;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
}

/**
 * Manages multiple named timers (countdown, cooldown, events).
 */
export class TimerSystem extends System {
  readonly events = new EventEmitter();
  private timers: Map<string, ActiveTimer> = new Map();

  constructor() {
    super('TimerSystem', [], 150);
  }

  add(config: TimerConfig): void {
    this.timers.set(config.id, {
      id: config.id,
      duration: config.duration,
      remaining: config.duration,
      repeat: config.repeat ?? false,
      paused: config.autoStart === false,
      onTick: config.onTick,
      onComplete: config.onComplete,
    });
  }

  remove(id: string): void {
    this.timers.delete(id);
  }

  pause(id: string): void {
    const timer = this.timers.get(id);
    if (timer) timer.paused = true;
  }

  resume(id: string): void {
    const timer = this.timers.get(id);
    if (timer) timer.paused = false;
  }

  reset(id: string): void {
    const timer = this.timers.get(id);
    if (timer) timer.remaining = timer.duration;
  }

  getRemaining(id: string): number {
    return this.timers.get(id)?.remaining ?? 0;
  }

  getProgress(id: string): number {
    const timer = this.timers.get(id);
    if (!timer) return 0;
    return 1 - timer.remaining / timer.duration;
  }

  update(dt: number): void {
    for (const timer of this.timers.values()) {
      if (timer.paused) continue;

      timer.remaining -= dt;
      timer.onTick?.(Math.max(0, timer.remaining));
      this.events.emit('tick', timer.id, Math.max(0, timer.remaining));

      if (timer.remaining <= 0) {
        timer.onComplete?.();
        this.events.emit('complete', timer.id);

        if (timer.repeat) {
          timer.remaining += timer.duration;
        } else {
          timer.paused = true;
          timer.remaining = 0;
        }
      }
    }
  }

  dispose(): void {
    this.timers.clear();
    this.events.clear();
  }
}
