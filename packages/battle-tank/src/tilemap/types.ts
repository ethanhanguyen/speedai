/** Ground layer tile identifiers. */
export enum TileId {
  GRASS = 'grass',
  DIRT = 'dirt',
  STONE = 'stone',
  MUD = 'mud',
  SAND = 'sand',
  ICE = 'ice',
  WATER = 'water',
  PUDDLE = 'puddle',
}

/** Object layer identifiers (placed on top of ground). */
export enum ObjectId {
  NONE = 'none',
  BLOCK = 'block',
  CONTAINER = 'container',
  WALL = 'wall',
  HEDGEHOG = 'hedgehog',
}

/**
 * Decoration layer identifiers.
 * Purely visual — no collision, HP, or terrain effect.
 * Rendered between ground and object layers.
 */
export enum DecorId {
  // Blast trails (scatter on stone ground)
  BLAST_1 = 'blast_1',
  BLAST_2 = 'blast_2',
  BLAST_3 = 'blast_3',
  BLAST_4 = 'blast_4',
  BLAST_5 = 'blast_5',
  BLAST_6 = 'blast_6',
  // Border decorations (perimeter cells)
  BORDER_A = 'border_a',
  BORDER_B = 'border_b',
  BORDER_C = 'border_c',
  // Puddles (scatter on dirt/mud ground)
  PUDDLE_1 = 'puddle_1',
  PUDDLE_2 = 'puddle_2',
  PUDDLE_3 = 'puddle_3',
  PUDDLE_4 = 'puddle_4',
  PUDDLE_5 = 'puddle_5',
  PUDDLE_6 = 'puddle_6',
}

/** A single cell in the tilemap: one ground + optional object + optional decors. */
export interface TileCell {
  ground: TileId;
  object: ObjectId;
  /** Decoration overlays — render-only, no gameplay effect. Can have multiple per tile. */
  decors?: DecorId[];
  /** If this cell is a continuation of a multi-tile object, points to anchor cell. */
  multiTileAnchor?: { r: number; c: number };
  /** Rotation in degrees (0, 90, 180, 270). Only set on anchor cells. */
  objectRotation?: number;
}

/** Parsed map data returned by TilemapLoader. */
export interface MapData {
  rows: number;
  cols: number;
  spawnPoints: Array<{ r: number; c: number }>;
  enemySpawns: Array<{ r: number; c: number }>;
}
