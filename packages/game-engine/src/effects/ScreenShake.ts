/**
 * Standalone screen shake effect (use when CameraSystem is not needed).
 */
export class ScreenShake {
  offsetX: number = 0;
  offsetY: number = 0;

  private intensity: number = 0;
  private duration: number = 0;
  private timer: number = 0;
  private active: boolean = false;

  trigger(intensity: number, duration: number): void {
    this.intensity = intensity;
    this.duration = duration;
    this.timer = 0;
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;

    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const decay = 1 - this.timer / this.duration;
    this.offsetX = (Math.random() * 2 - 1) * this.intensity * decay;
    this.offsetY = (Math.random() * 2 - 1) * this.intensity * decay;
  }

  /** Apply shake offset to canvas context before rendering. */
  apply(ctx: CanvasRenderingContext2D): void {
    if (this.active) {
      ctx.translate(this.offsetX, this.offsetY);
    }
  }
}
