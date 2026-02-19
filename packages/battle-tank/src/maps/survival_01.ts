/**
 * Survival Map 01 — 24x18 grid.
 *
 * Legend (see TileRegistry CHAR_MAP):
 *   .  grass        d  dirt          s  stone floor
 *   B  block        H  hedge         C  container
 *   W  wall         P  player spawn  S  enemy spawn
 */
/**
 * Survival Map 01 — 24x18 grid.
 *
 * Terrain chars (see TileRegistry CHAR_MAP):
 *   .  grass   d  dirt    s  stone   m  mud    a  sand
 *   i  ice     w  water   p  puddle
 *   B  block   H  hedge   C  container   W  wall
 *   P  player spawn   S  enemy spawn
 */
export const SURVIVAL_01 = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WS.a.d.....ss.....d.aS.W',
  'W..C...H...ww....H...C.W',
  'W.a....H...ww.....H..a.W',
  'W.dd..m....BB......mdd.W',
  'W.dd..C..p.BB.p..C..dd.W',
  'W.....m....ss....m.....W',
  'W...H......ii.......H..W',
  'W.......C..P...C.......W',
  'W...H......ii.......H..W',
  'W.....m....ss....m.....W',
  'W.dd..C..p.BB.p..C..dd.W',
  'W.dd..m....BB......mdd.W',
  'W.a....H...ww.....H..a.W',
  'W..C...H...ww....H...C.W',
  'WS.a.d.....ss.....d.aS.W',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n');
