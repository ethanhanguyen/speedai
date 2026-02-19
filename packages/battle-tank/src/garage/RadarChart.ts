import type { RadarStats } from '../config/PartRegistry.js';
import { RADAR_LABELS } from '../config/PartRegistry.js';
import { GARAGE_STYLE } from '../config/GarageConfig.js';

const TWO_PI = Math.PI * 2;
const AXES = RADAR_LABELS.length;
const ANGLE_STEP = TWO_PI / AXES;
const START_ANGLE = -Math.PI / 2; // 0-axis points up

/**
 * Draw a 6-axis radar chart.
 * @param current  Filled polygon (selected loadout).
 * @param hovered  Optional outline polygon (hovered part swap preview).
 */
export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  current: RadarStats,
  hovered?: RadarStats,
): void {
  const rs = GARAGE_STYLE.radar;
  const values = [current.spd, current.acc, current.fpw, current.rof, current.arm, current.hnd];
  const hoverValues = hovered
    ? [hovered.spd, hovered.acc, hovered.fpw, hovered.rof, hovered.arm, hovered.hnd]
    : undefined;

  ctx.save();

  // Grid rings
  for (let ring = 1; ring <= rs.rings; ring++) {
    const r = radius * (ring / rs.rings);
    ctx.beginPath();
    for (let i = 0; i <= AXES; i++) {
      const a = START_ANGLE + i * ANGLE_STEP;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = rs.gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < AXES; i++) {
    const a = START_ANGLE + i * ANGLE_STEP;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.strokeStyle = rs.gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Hover polygon (outline only)
  if (hoverValues) {
    drawPolygon(ctx, cx, cy, radius, hoverValues, rs.hoverFillColor, rs.hoverStrokeColor);
  }

  // Current polygon (filled)
  drawPolygon(ctx, cx, cy, radius, values, rs.fillColor, rs.strokeColor);

  // Axis labels
  ctx.font = GARAGE_STYLE.labelFont;
  ctx.fillStyle = rs.labelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < AXES; i++) {
    const a = START_ANGLE + i * ANGLE_STEP;
    const lx = cx + Math.cos(a) * (radius + 14);
    const ly = cy + Math.sin(a) * (radius + 14);
    ctx.fillText(RADAR_LABELS[i], lx, ly);
  }

  ctx.restore();
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  values: number[],
  fillColor: string,
  strokeColor: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < AXES; i++) {
    const a = START_ANGLE + i * ANGLE_STEP;
    const r = radius * Math.max(0.02, values[i]); // min 2% so polygon is always visible
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}
