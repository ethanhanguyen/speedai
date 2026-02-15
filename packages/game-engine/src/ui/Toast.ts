export interface ToastConfig {
  duration?: number;
  font?: string;
  textColor?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  position?: 'top' | 'bottom';
}

interface ActiveToast {
  message: string;
  remaining: number;
  alpha: number;
}

export class Toast {
  private queue: ActiveToast[] = [];
  private config: Required<ToastConfig>;

  constructor(config?: ToastConfig) {
    this.config = {
      duration: config?.duration ?? 2,
      font: config?.font ?? '16px sans-serif',
      textColor: config?.textColor ?? '#fff',
      backgroundColor: config?.backgroundColor ?? 'rgba(0,0,0,0.8)',
      padding: config?.padding ?? 12,
      borderRadius: config?.borderRadius ?? 6,
      position: config?.position ?? 'top',
    };
  }

  show(message: string, duration?: number): void {
    this.queue.push({
      message,
      remaining: duration ?? this.config.duration,
      alpha: 1,
    });
  }

  update(dt: number): void {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const toast = this.queue[i];
      toast.remaining -= dt;
      if (toast.remaining < 0.3) {
        toast.alpha = Math.max(0, toast.remaining / 0.3);
      }
      if (toast.remaining <= 0) {
        this.queue.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const { font, textColor, backgroundColor, padding, borderRadius, position } = this.config;

    let yOffset = position === 'top' ? 20 : canvasHeight - 20;

    for (const toast of this.queue) {
      ctx.save();
      ctx.globalAlpha = toast.alpha;
      ctx.font = font;

      const metrics = ctx.measureText(toast.message);
      const tw = metrics.width + padding * 2;
      const th = 24 + padding * 2;
      const tx = (canvasWidth - tw) / 2;
      const ty = position === 'top' ? yOffset : yOffset - th;

      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, borderRadius);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toast.message, canvasWidth / 2, ty + th / 2);

      ctx.restore();

      yOffset += position === 'top' ? th + 8 : -(th + 8);
    }
  }
}
