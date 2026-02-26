/**
 * Render compact archetype gameplay profile for quick tile comparison.
 * Format: [Passability] [Cover Bar] [Sight] [Label]
 * Objects: ✓ ████ ① wreckage
 * Terrain: 1.0× ██ ① fast_ground
 */

import {
  getObjectArchetype,
  getTerrainArchetype,
  type ObjectArchetype,
  type TerrainArchetype,
} from '../../src/config/ArchetypeDatabase.js';

/**
 * Generate object archetype profile HTML.
 */
export function renderObjectProfile(archetypeId: string, displayName: string): string {
  const archetype = getObjectArchetype(archetypeId);
  if (!archetype) return '';

  const passability = archetype.isImpassable ? '✗' : '✓';
  const coverBar = renderCoverBar(archetype.coverPercent);
  const sight = archetype.sightBlockRange > 0 ? `${archetype.sightBlockRange}` : '◯';

  return `
    <div style="font-family: monospace; font-size: 11px; color: #00ff88; letter-spacing: 0.5px; margin: 8px 0;">
      <span>${passability}</span> <span>${coverBar}</span> <span>${sight}</span> ${displayName}
    </div>
  `;
}

/**
 * Generate terrain archetype profile HTML.
 */
export function renderTerrainProfile(archetypeId: string, displayName: string): string {
  const archetype = getTerrainArchetype(archetypeId);
  if (!archetype) return '';

  const speed = archetype.clearSpeed.toFixed(2);
  const coverBar = renderCoverBar(archetype.coverPercent);
  const hazard = archetype.dotPerTurn > 0 ? `⚠${archetype.dotPerTurn}` : '◯';

  return `
    <div style="font-family: monospace; font-size: 11px; color: #00ff88; letter-spacing: 0.5px; margin: 8px 0;">
      <span>${speed}×</span> <span>${coverBar}</span> <span>${hazard}</span> ${displayName}
    </div>
  `;
}

/**
 * Render 5-char cover bar: █ = 20% coverage.
 */
function renderCoverBar(coverPercent: number): string {
  const filled = Math.round(coverPercent * 5);
  const empty = 5 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

/**
 * Return object archetype lookup.
 */
export function getObjectArchetypeInfo(
  archetypeId: string
): { passability: string; coverPercent: number; sightBlockRange: number } | null {
  const archetype = getObjectArchetype(archetypeId);
  if (!archetype) return null;
  return {
    passability: archetype.isImpassable ? 'Impassable' : 'Passable',
    coverPercent: archetype.coverPercent,
    sightBlockRange: archetype.sightBlockRange,
  };
}

/**
 * Return terrain archetype lookup.
 */
export function getTerrainArchetypeInfo(
  archetypeId: string
): {
  speed: number;
  coverPercent: number;
  sightBlockRange: number;
  hazard: number;
} | null {
  const archetype = getTerrainArchetype(archetypeId);
  if (!archetype) return null;
  return {
    speed: archetype.clearSpeed,
    coverPercent: archetype.coverPercent,
    sightBlockRange: archetype.sightBlockRange,
    hazard: archetype.dotPerTurn,
  };
}
