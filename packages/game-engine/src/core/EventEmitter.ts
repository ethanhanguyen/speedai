import type { EventCallback } from './types.js';

/**
 * Lightweight event emitter used throughout the engine.
 */
export class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  once(event: string, callback: EventCallback): void {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(...args);
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
