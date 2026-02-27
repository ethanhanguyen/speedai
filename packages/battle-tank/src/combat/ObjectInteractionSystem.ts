import type { EntityManager, EventBus } from '@speedai/game-engine';
import { TILE_OBJECT_LINK } from './TileObjectLink.js';
import type { TileObjectLinkComponent } from './TileObjectLink.js';
import { MAP_CONFIG } from '../config/MapConfig.js';

/** Proximity radius (in pixels) for triggering interactions. */
const INTERACTION_RADIUS = MAP_CONFIG.tileSize * 1.5;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;

/**
 * Checks proximity between the player and interactive tile objects.
 * Fires `object:interact` events when the player enters interaction range.
 */
export function updateObjectInteractions(
  em: EntityManager,
  playerId: number,
  eventBus: EventBus,
): void {
  const playerPos = em.getComponent(playerId, 'Position') as { x: number; y: number } | undefined;
  if (!playerPos) return;

  const linked = em.query(TILE_OBJECT_LINK, 'Position');

  for (const id of linked) {
    const link = em.getComponent(id, TILE_OBJECT_LINK) as TileObjectLinkComponent | undefined;
    const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
    if (!link || !pos) continue;

    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= INTERACTION_RADIUS_SQ) {
      eventBus.fire('object:interact', {
        entityId: id,
        anchorR: link.anchorR,
        anchorC: link.anchorC,
        objectId: link.objectId,
        interactionType: link.interactionType,
        distanceSq: distSq,
      });
    }
  }
}
