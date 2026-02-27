import type { ObjectId } from '../tilemap/types.js';

/** Component type constant for ECS registration. */
export const TILE_OBJECT_LINK = 'TileObjectLink';

/**
 * Links an ECS entity to a static tilemap object.
 * The tilemap cell remains the source of truth for collision/pathfinding;
 * the entity mirrors interaction state (HP, interaction triggers).
 */
export interface TileObjectLinkComponent {
  /** Grid row of the anchor cell. */
  anchorR: number;
  /** Grid column of the anchor cell. */
  anchorC: number;
  /** Object type from tilemap. */
  objectId: ObjectId;
  /** Interaction behaviour — matches ObjectData.json `interactionType`. */
  interactionType: string;
}
