/**
 * Full-screen flash effect (e.g. damage, power-up).
 */
export class Flash {
  private color: string = '#fff';
  private duration: number = 0;
  private timer: number = 0;
  private active: boolean = false;

  get isActive(): boolean {
    return this.active;
  }

  trigger(color: string, duration: number): void {
    this.color = color;
    this.duration = duration;
    this.timer = 0;
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.active) return;
    const alpha = 1 - this.timer / this.duration;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
