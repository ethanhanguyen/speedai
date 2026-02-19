import type { EventBus, GridModel, HealthComponent } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import type { TileHPTracker } from './TileHPTracker.js';

/**
 * Listens to 'projectile:hit' events and resolves damage.
 * Emits: 'tile:damaged', 'tile:destroyed' for VFX to react to.
 */
export function initDamageListeners(
  eventBus: EventBus,
  tileHP: TileHPTracker,
  tilemap: GridModel<TileCell>,
): void {
  eventBus.on('projectile:hit', (event: unknown) => {
    const e = event as {
      data?: {
        tileRow: number;
        tileCol: number;
        damage: number;
        isDestructible: boolean;
        x: number;
        y: number;
      };
    };
    const data = e.data ?? (e as any);
    if (!data || !data.isDestructible) return;

    const remaining = tileHP.damage(data.tileRow, data.tileCol, data.damage, tilemap);

    if (remaining <= 0) {
      eventBus.fire('tile:destroyed', {
        row: data.tileRow,
        col: data.tileCol,
        x: data.x,
        y: data.y,
      });
    } else {
      eventBus.fire('tile:damaged', {
        row: data.tileRow,
        col: data.tileCol,
        x: data.x,
        y: data.y,
        remaining,
        damage: data.damage,
      });
    }
  });
}
