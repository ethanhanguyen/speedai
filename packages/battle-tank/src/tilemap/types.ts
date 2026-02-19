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
  BLAST_TRAIL_1 = 'blast_trail_1',
  BLAST_TRAIL_2 = 'blast_trail_2',
  BLAST_TRAIL_3 = 'blast_trail_3',
  BLAST_TRAIL_4 = 'blast_trail_4',
  BLAST_TRAIL_5 = 'blast_trail_5',
  BLAST_TRAIL_6 = 'blast_trail_6',
  BORDER_A = 'border_a',
  BORDER_B = 'border_b',
  BORDER_C = 'border_c',
  PUDDLE_1 = 'puddle_1',
  PUDDLE_2 = 'puddle_2',
  PUDDLE_3 = 'puddle_3',
  PUDDLE_4 = 'puddle_4',
  PUDDLE_5 = 'puddle_5',
  PUDDLE_6 = 'puddle_6',
}

/** A single cell in the tilemap: one ground + optional object + optional decor. */
export interface TileCell {
  ground: TileId;
  object: ObjectId;
  /** Decoration overlay — render-only, no gameplay effect. */
  decor?: DecorId;
}

/** Parsed map data returned by TilemapLoader. */
export interface MapData {
  rows: number;
  cols: number;
  spawnPoints: Array<{ r: number; c: number }>;
  enemySpawns: Array<{ r: number; c: number }>;
}
