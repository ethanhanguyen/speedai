/** Ground layer tile identifiers. */
export enum TileId {
  GRASS = 'grass',
  DIRT = 'dirt',
  STONE = 'stone',
}

/** Object layer identifiers (placed on top of ground). */
export enum ObjectId {
  NONE = 'none',
  BLOCK = 'block',
  HEDGE = 'hedge',
  CONTAINER = 'container',
  WALL = 'wall',
}

/** A single cell in the tilemap: one ground + optional object. */
export interface TileCell {
  ground: TileId;
  object: ObjectId;
}

/** Parsed map data returned by TilemapLoader. */
export interface MapData {
  rows: number;
  cols: number;
  spawnPoints: Array<{ r: number; c: number }>;
  enemySpawns: Array<{ r: number; c: number }>;
}
