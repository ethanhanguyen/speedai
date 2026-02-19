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
    [TileId.GRASS]:  '#3a5c2a',
    [TileId.DIRT]:   '#7a5c3a',
    [TileId.STONE]:  '#555566',
    [TileId.MUD]:    '#4a3a20',
    [TileId.SAND]:   '#b0955a',
    [TileId.ICE]:    '#a0c8e0',
    [TileId.WATER]:  '#2a50a0',
    [TileId.PUDDLE]: '#3a5888',
  } as Record<TileId, string>,
  objectColors: {
    [ObjectId.NONE]:      '',           // transparent — show terrain
    [ObjectId.BLOCK]:     '#888888',
    [ObjectId.CONTAINER]: '#cc8833',
    [ObjectId.WALL]:      '#444455',
    [ObjectId.HEDGEHOG]:  '#aaaaaa',
  } as Record<ObjectId, string>,
  /** Spawn dot colors in thumbnail. */
  spawnColors: {
    player: '#00ff88',
    enemy:  '#ff4444',
  },
} as const;
