import { EventEmitter } from '../core/EventEmitter.js';

export interface ModalConfig {
  width: number;
  height: number;
  title?: string;
  overlayColor?: string;
  backgroundColor?: string;
  titleFont?: string;
  titleColor?: string;
  borderRadius?: number;
}

export class Modal extends EventEmitter {
  width: number;
  height: number;
  title: string;
  overlayColor: string;
  backgroundColor: string;
  titleFont: string;
  titleColor: string;
  borderRadius: number;
  visible: boolean = false;

  constructor(config: ModalConfig) {
    super();
    this.width = config.width;
    this.height = config.height;
    this.title = config.title ?? '';
    this.overlayColor = config.overlayColor ?? 'rgba(0,0,0,0.5)';
    this.backgroundColor = config.backgroundColor ?? '#fff';
    this.titleFont = config.titleFont ?? 'bold 24px sans-serif';
    this.titleColor = config.titleColor ?? '#333';
    this.borderRadius = config.borderRadius ?? 12;
  }

  show(): void {
    this.visible = true;
    this.emit('show');
  }

  hide(): void {
    this.visible = false;
    this.emit('hide');
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.visible) return;

    ctx.save();

    // Overlay
    ctx.fillStyle = this.overlayColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Modal background
    const x = (canvasWidth - this.width) / 2;
    const y = (canvasHeight - this.height) / 2;
    ctx.fillStyle = this.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x, y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // Title
    if (this.title) {
      ctx.fillStyle = this.titleColor;
      ctx.font = this.titleFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(this.title, canvasWidth / 2, y + 20);
    }

    ctx.restore();
  }
}
