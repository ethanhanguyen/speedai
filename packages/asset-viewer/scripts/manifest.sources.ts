// Phase 1 — Manifest System
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  ADD OR REMOVE ASSET DIRECTORIES HERE.                       ║
// ║  After editing, run:  npm run build:manifest                 ║
// ║  Nothing else needs to change.                               ║
// ╚══════════════════════════════════════════════════════════════╝

import type { AssetSourceConfig } from './manifest.types.js';

export const ASSET_SOURCES: readonly AssetSourceConfig[] = [
  {
    id: 'pack1',
    label: 'Pack 1 — Battle Tank Assets',
    root: '/Users/hoang/Downloads/craftpix/2d_tank_topdown/craftpix-901177-free-2d-battle-tank-game-assets',
    tags: ['pack1', 'tank'],
    includeFiles: /\.png$/i,
    excludeFiles: /\.(scml|eps|ai|txt|psd)$/i,
    // Standard-res weapon folders are superseded by the _256X256 versions.
    // Matches "Weapon_Color_A" but NOT "Weapon_Color_A_256X256".
    excludeDirs: /^Weapon_Color_[A-D]$/,
  },
  {
    id: 'pack2',
    label: 'Pack 2 — Objects & Items',
    root: '/Users/hoang/Downloads/craftpix/2d_tank_topdown/craftpix-976411-free-objects-and-items-for-2d-tank-game',
    tags: ['pack2', 'items'],
    includeFiles: /\.png$/i,
    excludeFiles: /\.(scml|eps|ai|txt|psd)$/i,
  },
  {
    id: 'pack3',
    label: 'Pack 3 — Explosion Sprites',
    root: '/Users/hoang/Downloads/craftpix/2d_tank_topdown/craftpix-net-840730-free-animated-explosion-sprite-pack/PNG',
    tags: ['pack3', 'explosion', 'vfx'],
    includeFiles: /\.png$/i,
    excludeFiles: /\.(ai|txt)$/i,
  },
  {
    id: 'pack4',
    label: 'Pack 4 — Battle Tileset',
    root: '/Users/hoang/Downloads/craftpix/2d_tank_topdown/craftpix-566611-free-battle-location-top-down-game-tileset-pack/PNG',
    tags: ['pack4', 'tileset', 'environment'],
    includeFiles: /\.png$/i,
    excludeFiles: /\.(eps|ai|txt)$/i,
  },
  // Pack 5 (soldiers) is excluded — not in current game scope.
  // To re-enable: uncomment and re-run build:manifest.
  //
  // {
  //   id: 'pack5',
  //   label: 'Pack 5 — Soldier Sprite Sheets',
  //   root: '/Users/hoang/Downloads/craftpix/2d_tank_topdown/craftpix-net-507107-free-soldier-sprite-sheets-pixel-art',
  //   tags: ['pack5', 'soldier', 'character'],
  //   includeFiles: /\.png$/i,
  //   excludeFiles: /\.(psd|txt)$/i,
  // },
];
