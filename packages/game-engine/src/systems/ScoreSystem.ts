import { System } from '../core/System.js';
import { EventEmitter } from '../core/EventEmitter.js';

export interface ScoreConfig {
  basePoints?: number;
  comboMultiplier?: number;
  comboTimeout?: number;
  maxMultiplier?: number;
}

/**
 * Manages points, combos, multipliers, and high scores.
 */
export class ScoreSystem extends System {
  readonly events = new EventEmitter();

  private _score: number = 0;
  private _highScore: number = 0;
  private _combo: number = 0;
  private _multiplier: number = 1;
  private comboTimer: number = 0;

  private readonly basePoints: number;
  private readonly comboMultiplier: number;
  private readonly comboTimeout: number;
  private readonly maxMultiplier: number;

  constructor(config?: ScoreConfig) {
    super('ScoreSystem', [], 200);
    this.basePoints = config?.basePoints ?? 10;
    this.comboMultiplier = config?.comboMultiplier ?? 1.5;
    this.comboTimeout = config?.comboTimeout ?? 2;
    this.maxMultiplier = config?.maxMultiplier ?? 10;
  }

  get score(): number { return this._score; }
  get highScore(): number { return this._highScore; }
  get combo(): number { return this._combo; }
  get multiplier(): number { return this._multiplier; }

  /** Add points (applies current multiplier). */
  addPoints(points?: number): number {
    const earned = Math.round((points ?? this.basePoints) * this._multiplier);
    this._score += earned;
    this._combo++;
    this._multiplier = Math.min(1 + (this._combo - 1) * (this.comboMultiplier - 1), this.maxMultiplier);
    this.comboTimer = this.comboTimeout;

    this.events.emit('score', this._score, earned);
    if (this._combo > 1) {
      this.events.emit('combo', this._combo, this._multiplier);
    }
    if (this._score > this._highScore) {
      this._highScore = this._score;
      this.events.emit('highScore', this._highScore);
    }
    return earned;
  }

  /** Reset combo (e.g. on miss). */
  breakCombo(): void {
    if (this._combo > 0) {
      this.events.emit('comboBreak', this._combo);
    }
    this._combo = 0;
    this._multiplier = 1;
    this.comboTimer = 0;
  }

  /** Reset score for a new game. */
  reset(): void {
    this._score = 0;
    this._combo = 0;
    this._multiplier = 1;
    this.comboTimer = 0;
  }

  setHighScore(value: number): void {
    this._highScore = value;
  }

  update(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.breakCombo();
      }
    }
  }

  dispose(): void {
    this.events.clear();
  }
}
