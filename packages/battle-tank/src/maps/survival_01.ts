/**
 * Survival Map 01 — "Winter Outpost" — 24x18 grid.
 *
 * Multi-tile objects:
 *   B = 2x2 block (anchor top-left)
 *   C = 1x2 container (anchor top, vertical)
 *   + = continuation cell
 *
 * Battlefield layout:
 *   - Central fortified compound (stone/ice roads)
 *   - Frozen pond (west) blocks direct approach
 *   - Mud zones around water (realistic drainage)
 *   - Dirt supply roads connecting spawn to frontline
 *   - 4 enemy spawn corners (classic siege scenario)
 *   - Container storage along perimeter walls
 *   - Block clusters provide defensive cover
 *
 * Terrain chars (see TileRegistry CHAR_MAP):
 *   .  grass   d  dirt    s  stone   m  mud    a  sand
 *   i  ice     w  water   p  puddle
 *   B+ block (2x2)   C+ container (1x2)   W wall
 *   P  player spawn   S  enemy spawn
 */
export const SURVIVAL_01 = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WS..C.d.....ss.....d.C.SW',
  'W...+.d....ssss....d.+..W',
  'Wwwm.dd...issi...dd.mwwW',
  'Wwwm.C....issi....C.mwwW',
  'Wmm..+d...ssss...d+...mmW',
  'W.....dd........dd.....W',
  'W.B+...d...B+...d...B+.W',
  'W.++C..dd..P..dd..C.++.W',
  'W.....d....B+....d.....W',
  'W......dd..++..dd......W',
  'Wmm..C...d.ss.d...C..mmW',
  'Wwwm.+...d.ss.d...+.mwwW',
  'Wwwm.dd...issi...dd.mwwW',
  'W.B+.d....ssss....d.B+.W',
  'W.++.d.....ss.....d.++.W',
  'WS..C..................SW',
  'W...+..................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n');
