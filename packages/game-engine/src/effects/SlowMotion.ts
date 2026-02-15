/**
 * Slow-motion effect that modifies engine time scale.
 */
export class SlowMotion {
  private targetScale: number = 1;
  private currentScale: number = 1;
  private duration: number = 0;
  private timer: number = 0;
  private active: boolean = false;

  /** Current time scale multiplier (apply to engine.timeScale). */
  get scale(): number {
    return this.currentScale;
  }

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Trigger slow-motion.
   * @param scale Time scale (0.1 = 10x slower, 0.5 = 2x slower)
   * @param duration Duration in seconds
   */
  trigger(scale: number, duration: number): void {
    this.targetScale = scale;
    this.duration = duration;
    this.timer = 0;
    this.active = true;
    this.currentScale = scale;
  }

  update(dt: number): void {
    if (!this.active) return;

    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
      this.currentScale = 1;
      return;
    }

    // Ease back to normal in the last 20% of duration
    const remaining = 1 - this.timer / this.duration;
    if (remaining < 0.2) {
      const t = 1 - remaining / 0.2;
      this.currentScale = this.targetScale + (1 - this.targetScale) * t;
    }
  }
}
