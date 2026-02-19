/**
 * Survival Map 01 — 24x18 grid.
 *
 * Terrain chars (see TileRegistry CHAR_MAP):
 *   .  grass   d  dirt    s  stone   m  mud    a  sand
 *   i  ice     w  water   p  puddle
 *   B  block   C  container   W  wall
 *   P  player spawn   S  enemy spawn
 */
export const SURVIVAL_01 = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WS.a.d.....ss.....d.aS.W',
  'W..C.......ww........C.W',
  'W.a.......B.ww.B.....a.W',
  'W.dd..m....BB......mdd.W',
  'W.dd..C..p.BB.p..C..dd.W',
  'W.....m....ss....m.....W',
  'W..........ii..........W',
  'W.......C..P...C.......W',
  'W..........ii..........W',
  'W.....m....ss....m.....W',
  'W.dd..C..p.BB.p..C..dd.W',
  'W.dd..m....BB......mdd.W',
  'W.a.......B.ww.B.....a.W',
  'W..C.......ww........C.W',
  'WS.a.d.....ss.....d.aS.W',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n');
