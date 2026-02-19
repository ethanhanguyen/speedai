/**
 * Arena Map 01 — 24x18 grid. Generated with ARENA_GEN_CONFIG (seed 7), then hand-tuned.
 *
 * Terrain chars (see TileRegistry CHAR_MAP):
 *   .  grass   d  dirt    s  stone   m  mud    a  sand
 *   i  ice     w  water   p  puddle
 *   B  block   C  container   W  wall
 *   P  player spawn   S  enemy spawn
 *
 * To regenerate from scratch:
 *   import { generateMap } from './MapGenerator.js';
 *   import { ARENA_GEN_CONFIG } from '../config/MapGenDefaults.js';
 *   console.log(generateMap(ARENA_GEN_CONFIG, 7));
 */
export const ARENA_01 = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WS.s.s.B..aa..B.s.s..SW',
  'W.......B....B.........W',
  'W.s..B......B...B..s...W',
  'W....C..ii.....ii..C...W',
  'W.s........ss.........sW',
  'W...B..C...ss...C..B...W',
  'W.a....B...dd...B....a.W',
  'W.......C..P...C.......W',
  'W.a....B...dd...B....a.W',
  'W...B..C...ss...C..B...W',
  'W.s........ss.........sW',
  'W....C..ii.....ii..C...W',
  'W.s..B......B...B..s...W',
  'W.......B....B.........W',
  'WS.s.s.B..aa..B.s.s..SW',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n');
