/**
 * Arena Map 01 — "Desert Compound" — 24x18 grid.
 *
 * Multi-tile objects:
 *   B = 2x2 block (anchor top-left)
 *   C = 1x2 container (anchor top, vertical)
 *   + = continuation cell
 *
 * Battlefield layout:
 *   - Desert combat zone (sand/stone dominant)
 *   - Concrete roads (ice = slippery paths)
 *   - Central control point (player spawn on dirt crossroads)
 *   - Symmetrical compound layout
 *   - Container storage along walls
 *   - Block defensive positions at key corners
 *   - Sand open areas = long-range engagement zones
 *   - Stone hardcover near center
 *
 * Terrain chars (see TileRegistry CHAR_MAP):
 *   .  grass   d  dirt    s  stone   m  mud    a  sand
 *   i  ice     w  water   p  puddle
 *   B+ block (2x2)   C+ container (1x2)   W wall   H hedgehog
 *   P  player spawn   S  enemy spawn
 */
export const ARENA_01 = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WSC.aa.B+.ii.B+.aa.C.SW',
  'W.+.aa.++.ii.++.aa.+...W',
  'W.sss.....dd.....sss...W',
  'Wa.C.B+.dddddd.B+.C.a..W',
  'Wa.+.++.d.ss.d.++.+...aW',
  'W.......d.ss.d.........W',
  'W.B+i...ddssdd...iB+...W',
  'W.++iC....P....C.i++...W',
  'W...i+...dsssd...+i....W',
  'W.......d.ss.d.........W',
  'Wa.C.B+.d.ss.d.B+.C...aW',
  'Wa.+.++.dddddd.++.+.a..W',
  'W.sss.....dd.....sss...W',
  'W.C.aa.B+.ii.B+.aa.C...W',
  'WS+.aa.++.ii.++.aa.+.SW',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n');
