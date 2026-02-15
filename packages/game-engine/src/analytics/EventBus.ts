import { EventEmitter } from '../core/EventEmitter.js';

export interface GameEvent {
  name: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Global event bus for game-wide events.
 * Acts as a centralized pub/sub and collects events for analytics.
 */
export class EventBus extends EventEmitter {
  private eventLog: GameEvent[] = [];
  private maxLogSize: number;

  constructor(maxLogSize = 1000) {
    super();
    this.maxLogSize = maxLogSize;
  }

  /** Fire a game event (logged and emitted). */
  fire(name: string, data?: Record<string, unknown>): void {
    const event: GameEvent = { name, data, timestamp: Date.now() };
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
    this.emit(name, event);
  }

  /** Get all logged events. */
  getLog(): readonly GameEvent[] {
    return this.eventLog;
  }

  /** Get events of a specific type. */
  getEvents(name: string): GameEvent[] {
    return this.eventLog.filter(e => e.name === name);
  }

  /** Drain the log (for analytics flushing). */
  drain(): GameEvent[] {
    const events = [...this.eventLog];
    this.eventLog.length = 0;
    return events;
  }

  clearLog(): void {
    this.eventLog.length = 0;
  }
}
