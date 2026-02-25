import { TileId, ObjectId } from '../tilemap/types.js';

export const MAP_SELECT_CONFIG = {
  card: {
    width: 320,
    height: 220,
    gap: 40,
    paddingX: 16,
    paddingY: 14,
    borderRadius: 8,
    thumbnailHeight: 120,
  },
  thumbnail: {
    /** Pixels per tile cell when rendering the map preview. */
    cellPx: 4,
  },
  colors: {
    bg: '#12121e',
    cardBg: '#1e1e32',
    cardHover: '#252540',
    cardSelected: '#2a2a50',
    selectedBorder: '#88aaff',
    defaultBorder: '#333355',
    title: '#ffffff',
    description: '#9999bb',
    mapLabel: '#ccccff',
  },
  /** Colors used in map thumbnails and mini-map. Single source of truth. */
  tileColors: {
    [TileId.LOOSE_SAND]:        '#b0955a',
    [TileId.HARDPAN]:           '#c4a86a',
    [TileId.GRAVEL]:            '#8a7a6a',
    [TileId.ROCKY_OUTCROP]:     '#555566',
    [TileId.ASPHALT]:           '#4a4a55',
    [TileId.MUDDY_SINKHOLE]:    '#4a3a20',
    [TileId.DUNE_SLOPE]:        '#c8a858',
    [TileId.SALT_FLAT]:         '#d8d0b8',
    [TileId.SCRUB_VEGETATION]:  '#5a7a3a',
    [TileId.OASIS_TURF]:        '#4a8a3a',
    [TileId.GRASS_PLAINS]:      '#3a5c2a',
    [TileId.HILLY_GROUND]:      '#6a7a4a',
    [TileId.FOREST_FLOOR]:      '#2a4a1a',
    [TileId.JUNGLE_UNDERBRUSH]: '#1a3a0a',
    [TileId.ICE_SNOW_FIELD]:    '#a0c8e0',
    [TileId.DEEP_SNOW]:         '#d8e8f0',
    [TileId.URBAN_PAVEMENT]:    '#5a5a6a',
    [TileId.MARSH_SWAMP]:       '#3a5888',
    [TileId.DIRT_ROAD]:         '#7a5c3a',
    [TileId.BEACH_SAND]:        '#d8c888',
    [TileId.HILL_SLOPE]:        '#7a8a5a',
    [TileId.CANYON_FLOOR]:      '#8a6a4a',
    [TileId.SHORELINE]:         '#6a8aaa',
    [TileId.RAPIDS_DROP]:       '#2a50a0',
    [TileId.SADDLE_PASS]:       '#9a8a6a',
    [TileId.DEPRESSION]:        '#5a6a4a',
    [TileId.VALLEY_FLOOR]:      '#7a9a5a',
    [TileId.RIDGE_CREST]:       '#8a8a7a',
  } as Record<TileId, string>,
  objectColors: {
    [ObjectId.NONE]:               '',           // transparent — show terrain
    [ObjectId.BOULDER_FORMATION]:  '#888888',
    [ObjectId.SHIPPING_CONTAINER]: '#cc8833',
    [ObjectId.ROCK_WALL]:          '#444455',
    [ObjectId.TANK_HULL_WRECKAGE]: '#aaaaaa',
  } as Record<ObjectId, string>,
  /** Spawn dot colors in thumbnail. */
  spawnColors: {
    player: '#00ff88',
    enemy:  '#ff4444',
  },
} as const;
