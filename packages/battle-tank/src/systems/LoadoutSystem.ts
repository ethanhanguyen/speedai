import { LocalStorageAdapter } from '@speedai/game-engine';
import type { LoadoutParts } from '../config/PartRegistry.js';
import { DEFAULT_LOADOUT } from '../config/PartRegistry.js';

const STORAGE_PREFIX = 'battletank_';
const LOADOUT_KEY_PREFIX = 'loadout_';
const MAX_SLOTS = 3;

const storage = new LocalStorageAdapter(STORAGE_PREFIX);

// ---------------------------------------------------------------------------
// Module-level active loadout (set from Garage, read by GameplayScene)
// ---------------------------------------------------------------------------

let activeLoadout: LoadoutParts = { ...DEFAULT_LOADOUT };

export function getActiveLoadout(): LoadoutParts {
  return activeLoadout;
}

export function setActiveLoadout(parts: LoadoutParts): void {
  activeLoadout = { ...parts };
}

// ---------------------------------------------------------------------------
// Persistent save/load (3 slots, LocalStorage)
// ---------------------------------------------------------------------------

export type SlotIndex = 0 | 1 | 2;

export async function saveLoadout(slot: SlotIndex, parts: LoadoutParts): Promise<void> {
  if (slot < 0 || slot >= MAX_SLOTS) return;
  await storage.save(`${LOADOUT_KEY_PREFIX}${slot}`, parts);
}

export async function loadLoadout(slot: SlotIndex): Promise<LoadoutParts | null> {
  if (slot < 0 || slot >= MAX_SLOTS) return null;
  return storage.load<LoadoutParts>(`${LOADOUT_KEY_PREFIX}${slot}`);
}

export async function hasLoadout(slot: SlotIndex): Promise<boolean> {
  return storage.has(`${LOADOUT_KEY_PREFIX}${slot}`);
}

export async function deleteLoadout(slot: SlotIndex): Promise<void> {
  await storage.delete(`${LOADOUT_KEY_PREFIX}${slot}`);
}

/**
 * Load a saved loadout into the active slot.
 * Returns true if a loadout was found and loaded.
 */
export async function loadIntoActive(slot: SlotIndex): Promise<boolean> {
  const parts = await loadLoadout(slot);
  if (parts) {
    setActiveLoadout(parts);
    return true;
  }
  return false;
}
