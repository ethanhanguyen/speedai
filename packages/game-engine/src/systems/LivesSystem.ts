import { System } from '../core/System.js';
import { EventEmitter } from '../core/EventEmitter.js';

export interface LivesConfig {
  maxLives?: number;
  startLives?: number;
  regenTime?: number;
}

/**
 * Manages lives/hearts with optional time-based regeneration.
 */
export class LivesSystem extends System {
  readonly events = new EventEmitter();

  private _lives: number;
  private _maxLives: number;
  private regenTime: number;
  private regenTimer: number = 0;

  constructor(config?: LivesConfig) {
    super('LivesSystem', [], 200);
    this._maxLives = config?.maxLives ?? 5;
    this._lives = config?.startLives ?? this._maxLives;
    this.regenTime = config?.regenTime ?? 0;
  }

  get lives(): number { return this._lives; }
  get maxLives(): number { return this._maxLives; }
  get isAlive(): boolean { return this._lives > 0; }

  /** Time in seconds until next life regenerates (0 if full or no regen). */
  get timeToNextLife(): number {
    if (this.regenTime <= 0 || this._lives >= this._maxLives) return 0;
    return this.regenTime - this.regenTimer;
  }

  loseLife(): void {
    if (this._lives <= 0) return;
    this._lives--;
    this.events.emit('loseLife', this._lives);
    if (this._lives === 0) {
      this.events.emit('gameOver');
    }
  }

  gainLife(count = 1): void {
    const prev = this._lives;
    this._lives = Math.min(this._lives + count, this._maxLives);
    if (this._lives > prev) {
      this.events.emit('gainLife', this._lives);
    }
  }

  setLives(count: number): void {
    this._lives = Math.max(0, Math.min(count, this._maxLives));
  }

  reset(): void {
    this._lives = this._maxLives;
    this.regenTimer = 0;
  }

  update(dt: number): void {
    if (this.regenTime > 0 && this._lives < this._maxLives) {
      this.regenTimer += dt;
      if (this.regenTimer >= this.regenTime) {
        this.regenTimer -= this.regenTime;
        this.gainLife();
      }
    }
  }

  dispose(): void {
    this.events.clear();
  }
}
