import type { EntityManager, GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { MAP_CONFIG } from '../config/MapConfig.js';

/**
 * Separate-axis tile collision resolution.
 * Moves entities by velocity * dt, checking walkability per axis.
 * Prevents tunneling by splitting X and Y movement.
 */
export function resolveCollisionsAndMove(
  em: EntityManager,
  tilemap: GridModel<TileCell>,
  dt: number,
): void {
  const ids = em.query('Position', 'Velocity', TANK_PARTS);

  for (const id of ids) {
    const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
    const vel = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    const tank = em.getComponent(id, TANK_PARTS) as TankPartsComponent | undefined;
    if (!pos || !vel || !tank) continue;
    const radius = tank.collisionRadius;

    // --- X axis ---
    const nextX = pos.x + vel.vx * dt;
    if (isAreaWalkable(tilemap, nextX, pos.y, radius)) {
      pos.x = nextX;
    } else {
      vel.vx = 0;
      tank.speed = 0;
    }

    // --- Y axis ---
    const nextY = pos.y + vel.vy * dt;
    if (isAreaWalkable(tilemap, pos.x, nextY, radius)) {
      pos.y = nextY;
    } else {
      vel.vy = 0;
      tank.speed = 0;
    }
  }
}

/**
 * Check whether a circle at (cx, cy) with given radius
 * overlaps any non-walkable tile.
 */
function isAreaWalkable(
  tilemap: GridModel<TileCell>,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  const ts = MAP_CONFIG.tileSize;
  const minCol = Math.floor((cx - radius) / ts);
  const maxCol = Math.floor((cx + radius) / ts);
  const minRow = Math.floor((cy - radius) / ts);
  const maxRow = Math.floor((cy + radius) / ts);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = tilemap.get(r, c);
      // Out of bounds = not walkable
      if (!cell) return false;
      if (cell.object !== ObjectId.NONE) {
        const def = OBJECT_DEFS[cell.object];
        if (!def.walkable) return false;
      }
    }
  }
  return true;
}
