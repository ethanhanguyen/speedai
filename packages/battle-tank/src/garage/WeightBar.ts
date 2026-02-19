import { GARAGE_STYLE, GARAGE_LAYOUT } from '../config/GarageConfig.js';
import { OVERLOAD_PW_THRESHOLD } from '../config/PartRegistry.js';

/**
 * Draw the weight/P/W ratio bar.
 */
export function drawWeightBar(
  ctx: CanvasRenderingContext2D,
  totalWeight: number,
  pwRatio: number,
  elapsed: number,
): void {
  const { x, y, width, height } = GARAGE_LAYOUT.weightBar;
  const wb = GARAGE_STYLE.weightBar;
  const isOverloaded = pwRatio < OVERLOAD_PW_THRESHOLD;

  // Background
  ctx.fillStyle = wb.bgColor;
  ctx.fillRect(x, y, width, height);

  // Fill — ratio clamped to [0,1] based on PW: higher PW = more fill (good)
  const fillFraction = Math.min(1, Math.max(0, pwRatio / 2.5));
  let fillColor: string;
  if (isOverloaded) {
    const pulse = Math.sin(elapsed * wb.overloadPulseHz * Math.PI * 2) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    fillColor = wb.overloadColor;
  } else if (pwRatio < 1.0) {
    fillColor = wb.warnColor;
  } else {
    fillColor = wb.goodColor;
  }

  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width * fillFraction, height);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = GARAGE_STYLE.panelBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // P/W text
  const { x: tx, y: ty } = GARAGE_LAYOUT.pwText;
  ctx.font = GARAGE_STYLE.valueFont;
  ctx.fillStyle = isOverloaded ? wb.overloadColor : GARAGE_STYLE.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`P/W ${pwRatio.toFixed(2)}  Weight: ${totalWeight}`, tx, ty);

  if (isOverloaded) {
    ctx.fillStyle = wb.overloadColor;
    ctx.fillText('OVERLOADED', tx + 200, ty);
  }
}
