import type { BallColor } from '../components/BallData.js';
import { COLOR_HEX } from '../components/BallData.js';
import { getCellTypeDef } from './CellTypes.js';

/**
 * Objective UI rendering configuration.
 */
export const ObjectiveConfig = {
  panel: {
    y: 70,            // Y position below score/moves header
    rowHeight: 28,    // Height per objective row (iconSize + gap)
    iconSize: 18,     // Icon circle diameter
    gap: 8,           // Gap between icon and label
    labelFont: 'bold 13px Arial',
    progressFont: '12px Arial',
    completedColor: '#2ecc71',
    pendingColor: 'rgba(255,255,255,0.7)',
  },
} as const;

const SPECIAL_LABELS: Record<string, string> = {
  striped_h: 'H-Stripe',
  striped_v: 'V-Stripe',
  bomb: 'Bomb',
  rainbow: 'Rainbow',
};

/** Derive display label and icon color from an objective tracker ID. */
export function getObjectiveDisplay(id: string): { label: string; color: string } {
  if (id === 'score') return { label: 'Score', color: '#f1c40f' };

  if (id.startsWith('collect_')) {
    const color = id.slice(8) as BallColor;
    return {
      label: color.charAt(0).toUpperCase() + color.slice(1),
      color: COLOR_HEX[color] || '#fff',
    };
  }

  if (id.startsWith('special_')) {
    const special = id.slice(8);
    return { label: SPECIAL_LABELS[special] || special, color: '#e0e0e0' };
  }

  if (id.startsWith('obstacle_')) {
    const type = id.slice(9);
    const def = getCellTypeDef(type);
    return { label: def?.displayName || type, color: def?.visual.fillColor || '#888' };
  }

  return { label: id, color: '#fff' };
}
