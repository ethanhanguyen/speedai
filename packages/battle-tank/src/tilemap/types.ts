/** Ground layer tile identifiers. Aligned with TERRAIN_PROPERTIES keys. */
export enum TileId {
  // Existing (alphabetical first group)
  LOOSE_SAND = 'loose_sand',
  HARDPAN = 'hardpan',
  GRAVEL = 'gravel',
  ROCKY_OUTCROP = 'rocky_outcrop',
  ASPHALT = 'asphalt',
  MUDDY_SINKHOLE = 'muddy_sinkhole',
  DUNE_SLOPE = 'dune_slope',
  SALT_FLAT = 'salt_flat',
  SCRUB_VEGETATION = 'scrub_vegetation',
  OASIS_TURF = 'oasis_turf',
  WATER = 'water',
  // New terrains
  GRASS_PLAINS = 'grass_plains',
  HILLY_GROUND = 'hilly_ground',
  FOREST_FLOOR = 'forest_floor',
  JUNGLE_UNDERBRUSH = 'jungle_underbrush',
  ICE_SNOW_FIELD = 'ice_snow_field',
  DEEP_SNOW = 'deep_snow',
  URBAN_PAVEMENT = 'urban_pavement',
  MARSH_SWAMP = 'marsh_swamp',
  DIRT_ROAD = 'dirt_road',
  BEACH_SAND = 'beach_sand',
  HILL_SLOPE = 'hill_slope',
  CANYON_FLOOR = 'canyon_floor',
  SHORELINE = 'shoreline',
  RAPIDS_DROP = 'rapids_drop',
  SADDLE_PASS = 'saddle_pass',
  DEPRESSION = 'depression',
  VALLEY_FLOOR = 'valley_floor',
  RIDGE_CREST = 'ridge_crest',
}

/** Object layer identifiers (placed on top of ground). Aligned with ObjectDatabase. */
export enum ObjectId {
  NONE = 'none',
  // Channels & water barriers
  WATER_CHANNEL = 'water_channel',
  DEEP_WADI = 'deep_wadi',
  // Natural formations
  BOULDER_FORMATION = 'boulder_formation',
  CLIFF_FACE = 'cliff_face',
  ROCK_WALL = 'rock_wall',
  ICE_WALL = 'ice_wall',
  CANYON_WALL = 'canyon_wall',
  MORAINE_RIDGE = 'moraine_ridge',
  KARST_OUTCROP = 'karst_outcrop',
  MOUNTAINSIDE = 'mountainside',
  // Elevation & terrain features
  ESCARPMENT = 'escarpment',
  RAILROAD_EMBANKMENT = 'railroad_embankment',
  // Fortifications & barriers
  CONCRETE_BARRIER = 'concrete_barrier',
  ANTI_TANK_DITCH = 'anti_tank_ditch',
  SHIPPING_CONTAINER = 'shipping_container',
  RUINED_STRUCTURE = 'ruined_structure',
  // Industrial & hazards
  OIL_DERRICK = 'oil_derrick',
  QUARRY_PIT_WALL = 'quarry_pit_wall',
  FROZEN_LAKE_EDGE = 'frozen_lake_edge',
  TANK_HULL_WRECKAGE = 'tank_hull_wreckage',
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

/** Strategic role identifiers for tactical map features. */
export enum StrategicRole {
  CHOKE_POINT = 'choke_point',
  SNIPER_LANE = 'sniper_lane',
  AMBUSH_ZONE = 'ambush_zone',
  FALLBACK_POSITION = 'fallback_position',
  FLANKING_ROUTE = 'flanking_route',
  COVER_CLUSTER = 'cover_cluster',
  HAZARD_ZONE = 'hazard_zone',
}

/** Parsed map data returned by TilemapLoader. */
export interface MapData {
  rows: number;
  cols: number;
  spawnPoints: Array<{ r: number; c: number }>;
  enemySpawns: Array<{ r: number; c: number }>;

  // Strategic features (optional, for LLM-generated maps):
  chokePoints?: Array<{ r: number; c: number; width: number }>;
  sniperLanes?: Array<{ r1: number; c1: number; r2: number; c2: number }>;
  coverClusters?: Array<{ r: number; c: number; value: number }>;
  hazardZones?: Array<{ r: number; c: number; severity: number }>;
}
