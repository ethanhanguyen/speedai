import type { EntityManager, GridModel, ComponentData } from '@speedai/game-engine';
import type { EventBus, ObjectPoolSystem } from '@speedai/game-engine';
import { PROJECTILE } from '../components/Projectile.js';
import type { ProjectileComponent } from '../components/Projectile.js';
import type { TileCell } from '../tilemap/types.js';
import { ObjectId } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { MAP_CONFIG } from '../config/MapConfig.js';

/**
 * Move projectiles, handle lifetime, tile collisions, bounce, and splash detonation.
 * Emits:
 *   'projectile:hit'       — ballistic hits a blocking tile
 *   'splash:detonated'     — splash projectile detonates (tile hit or expired)
 *   'projectile:bounce'    — rifled projectile bounces off a wall
 */
export function updateProjectiles(
  em: EntityManager,
  pool: ObjectPoolSystem,
  tilemap: GridModel<TileCell>,
  eventBus: EventBus,
  dt: number,
): void {
  const ids = em.query('Position', 'Velocity', PROJECTILE);

  for (const id of ids) {
    const pos  = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
    const vel  = em.getComponent(id, 'Velocity') as { vx: number; vy: number } | undefined;
    const proj = em.getComponent(id, PROJECTILE)  as ProjectileComponent       | undefined;
    if (!pos || !vel || !proj) continue;

    proj.elapsed += dt;
    const speed = Math.hypot(vel.vx, vel.vy);
    proj.distanceTraveled += speed * dt;

    // Range check — despawn without damage when max range exceeded
    const beh = proj.weaponDef.behavior;
    if (beh.kind === 'ballistic' && beh.maxRangePx && proj.distanceTraveled >= beh.maxRangePx) {
      releaseProjectile(em, pool, id);
      continue;
    }

    const lifetime = proj.lifetimeOverride ?? proj.weaponDef.projectileLifetime;

    if (proj.elapsed >= lifetime) {
      // Expired — splash detonates at current position
      if (proj.weaponDef.behavior.kind === 'splash') {
        eventBus.fire('splash:detonated', {
          x: pos.x,
          y: pos.y,
          splashRadiusPx: (proj.weaponDef.behavior as { kind: 'splash'; splashRadiusPx: number }).splashRadiusPx,
          damage: proj.weaponDef.damage,
          ownerId: proj.ownerId,
          weaponDef: proj.weaponDef,
        });
      }
      releaseProjectile(em, pool, id);
      continue;
    }

    // Move
    pos.x += vel.vx * dt;
    pos.y += vel.vy * dt;

    const ts  = MAP_CONFIG.tileSize;
    const col = Math.floor(pos.x / ts);
    const row = Math.floor(pos.y / ts);
    const cell = tilemap.get(row, col);

    // Out of map bounds
    if (!cell) {
      releaseProjectile(em, pool, id);
      continue;
    }

    // Tile collision (resolve multi-tile anchor if needed)
    const objectId = resolveObjectId(tilemap, cell);
    if (objectId !== ObjectId.NONE) {
      const def = OBJECT_DEFS[objectId];
      if (def.blockProjectile) {
        // For multi-tile objects, use anchor coords for damage tracking
        const { r: anchorR, c: anchorC } = resolveAnchorCoords(tilemap, cell, row, col);
        handleTileHit(em, pool, tilemap, eventBus, id, pos, vel, proj, anchorR, anchorC, def.destructible);
      }
    }
  }
}

function handleTileHit(
  em: EntityManager,
  pool: ObjectPoolSystem,
  tilemap: GridModel<TileCell>,
  eventBus: EventBus,
  id: number,
  pos: { x: number; y: number },
  vel: { vx: number; vy: number },
  proj: ProjectileComponent,
  row: number,
  col: number,
  isDestructible: boolean,
): void {
  const behavior = proj.weaponDef.behavior;

  if (behavior.kind === 'splash') {
    eventBus.fire('splash:detonated', {
      x: pos.x,
      y: pos.y,
      splashRadiusPx: behavior.splashRadiusPx,
      damage: proj.weaponDef.damage,
      ownerId: proj.ownerId,
      weaponDef: proj.weaponDef,
    });
    releaseProjectile(em, pool, id);
    return;
  }

  if (behavior.kind === 'ballistic' && behavior.bouncesMax && proj.bouncesRemaining > 0) {
    // Reflect off wall — determine which axis
    const ts = MAP_CONFIG.tileSize;
    const px = pos.x - vel.vx * 0.016; // one step back (approx)
    const py = pos.y - vel.vy * 0.016;

    const prevCol = Math.floor(px / ts);
    const prevRow = Math.floor(py / ts);

    const hitSide = determineHitAxis(prevRow, prevCol, row, col, tilemap);
    if (hitSide === 'x') vel.vx = -vel.vx;
    else if (hitSide === 'y') vel.vy = -vel.vy;
    else { vel.vx = -vel.vx; vel.vy = -vel.vy; }

    // Step out of the wall
    pos.x += vel.vx * 0.016;
    pos.y += vel.vy * 0.016;

    proj.bouncesRemaining--;
    eventBus.fire('projectile:bounce', { x: pos.x, y: pos.y, weaponDef: proj.weaponDef });
    return;
  }

  // Standard ballistic tile hit
  eventBus.fire('projectile:hit', {
    projectileId: id,
    x: pos.x, y: pos.y,
    tileRow: row, tileCol: col,
    damage: proj.weaponDef.damage,
    isDestructible,
    weaponDef: proj.weaponDef,
  });
  releaseProjectile(em, pool, id);
}

/**
 * Resolve the actual ObjectId for a cell, following multi-tile anchor if present.
 */
function resolveObjectId(tilemap: GridModel<TileCell>, cell: TileCell): ObjectId {
  if (cell.multiTileAnchor) {
    const anchor = tilemap.get(cell.multiTileAnchor.r, cell.multiTileAnchor.c);
    return anchor?.object ?? ObjectId.NONE;
  }
  return cell.object;
}

/**
 * Resolve anchor coordinates for a cell (for multi-tile objects).
 */
function resolveAnchorCoords(
  tilemap: GridModel<TileCell>,
  cell: TileCell,
  r: number,
  c: number,
): { r: number; c: number } {
  if (cell.multiTileAnchor) {
    return cell.multiTileAnchor;
  }
  return { r, c };
}

/** Determine which axis the projectile hit by checking neighbors. */
function determineHitAxis(
  prevRow: number, prevCol: number,
  hitRow: number, hitCol: number,
  tilemap: GridModel<TileCell>,
): 'x' | 'y' | 'corner' {
  const ts  = MAP_CONFIG.tileSize;
  const movedX = prevCol !== hitCol;
  const movedY = prevRow !== hitRow;

  if (movedX && !movedY) return 'x';
  if (movedY && !movedX) return 'y';

  // Diagonal — check which neighbor is passable
  const cellSameRow = tilemap.get(prevRow, hitCol);
  const cellSameCol = tilemap.get(hitRow, prevCol);
  const xBlocked = !cellSameRow || (cellSameRow.object !== ObjectId.NONE && OBJECT_DEFS[cellSameRow.object].blockProjectile);
  const yBlocked = !cellSameCol || (cellSameCol.object !== ObjectId.NONE && OBJECT_DEFS[cellSameCol.object].blockProjectile);
  if (xBlocked && !yBlocked) return 'x';
  if (yBlocked && !xBlocked) return 'y';
  return 'corner';
}

function releaseProjectile(em: EntityManager, pool: ObjectPoolSystem, id: number): void {
  em.removeComponent(id, 'Position');
  em.removeComponent(id, 'Velocity');
  em.removeComponent(id, PROJECTILE);
  pool.release('projectile', id);
}
