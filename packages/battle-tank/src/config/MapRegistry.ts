import { SURVIVAL_01 } from '../maps/survival_01.js';
import { ARENA_01 } from '../maps/arena_01.js';

export interface MapEntry {
  id: string;
  label: string;
  description: string;
  ascii: string;
  /** Seed used for deterministic pipe scatter pass. */
  decorSeed: number;
}

export const MAP_REGISTRY: readonly MapEntry[] = [
  {
    id: 'survival_01',
    label: 'Survival Grounds',
    description: 'Symmetric terrain. Destructible cover. 4 enemy zones.',
    ascii: SURVIVAL_01,
    decorSeed: 1,
  },
  {
    id: 'arena_01',
    label: 'Desert Arena',
    description: 'Sandy open lanes. Stone and ice patches. Tight corridors.',
    ascii: ARENA_01,
    decorSeed: 7,
  },
];

// ---------------------------------------------------------------------------
// Module-level selected map (same pattern as getSelectedDifficulty)
// ---------------------------------------------------------------------------
let _selectedMapId: string = MAP_REGISTRY[0].id;

export function getSelectedMapId(): string { return _selectedMapId; }
export function setSelectedMapId(id: string): void { _selectedMapId = id; }

export function getSelectedMap(): MapEntry {
  return MAP_REGISTRY.find(m => m.id === _selectedMapId) ?? MAP_REGISTRY[0];
}
