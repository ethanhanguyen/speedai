/**
 * Survival Map 01 — 24x18 grid.
 *
 * Legend (see TileRegistry CHAR_MAP):
 *   .  grass        d  dirt          s  stone floor
 *   B  block        H  hedge         C  container
 *   W  wall         P  player spawn  S  enemy spawn
 */
export const SURVIVAL_01 = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WS...d.....ss.....d..S.W',
  'W..C...H.........H...C.W',
  'W......H..........H....W',
  'W.dd.......BB.......dd.W',
  'W.dd..C....BB....C..dd.W',
  'W..........ss..........W',
  'W...H................H.W',
  'W.......C..P...C.......W',
  'W...H................H.W',
  'W..........ss..........W',
  'W.dd..C....BB....C..dd.W',
  'W.dd.......BB.......dd.W',
  'W......H..........H....W',
  'W..C...H.........H...C.W',
  'WS...d.....ss.....d..S.W',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n');
