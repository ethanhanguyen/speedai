import type { RadarStats } from '../config/PartRegistry.js';
import { RADAR_LABELS } from '../config/PartRegistry.js';
import { GARAGE_STYLE, GARAGE_LAYOUT, FLAVOR_TEXT } from '../config/GarageConfig.js';

/**
 * Draw the compare strip: stat deltas + flavor text for a hovered part swap.
 */
export function drawCompareStrip(
  ctx: CanvasRenderingContext2D,
  currentStats: RadarStats,
  hoveredStats: RadarStats,
  hoveredPartId: string,
): void {
  const { x, y, lineHeight } = GARAGE_LAYOUT.compare;
  const cs = GARAGE_STYLE.compare;
  const currentArr = [currentStats.spd, currentStats.acc, currentStats.fpw, currentStats.rof, currentStats.arm, currentStats.hnd];
  const hoveredArr = [hoveredStats.spd, hoveredStats.acc, hoveredStats.fpw, hoveredStats.rof, hoveredStats.arm, hoveredStats.hnd];

  ctx.save();
  ctx.font = GARAGE_STYLE.valueFont;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < RADAR_LABELS.length; i++) {
    const delta = hoveredArr[i] - currentArr[i];
    const ly = y + i * lineHeight;

    // Label
    ctx.fillStyle = GARAGE_STYLE.dimTextColor;
    ctx.fillText(RADAR_LABELS[i], x, ly);

    // Delta value with arrow
    if (Math.abs(delta) < 0.005) {
      ctx.fillStyle = cs.neutralColor;
      ctx.fillText('  —', x + 32, ly);
    } else if (delta > 0) {
      ctx.fillStyle = cs.betterColor;
      ctx.fillText(`  ▲ +${(delta * 100).toFixed(0)}%`, x + 32, ly);
    } else {
      ctx.fillStyle = cs.worseColor;
      ctx.fillText(`  ▼ ${(delta * 100).toFixed(0)}%`, x + 32, ly);
    }
  }

  // Flavor text
  const flavor = FLAVOR_TEXT[hoveredPartId];
  if (flavor) {
    const flavorY = y + RADAR_LABELS.length * lineHeight + 6;
    ctx.font = GARAGE_STYLE.cardFont;
    ctx.fillStyle = GARAGE_STYLE.dimTextColor;
    ctx.fillText(flavor, x, flavorY);
  }

  ctx.restore();
}
