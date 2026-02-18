// Phase 1 — Manifest System
// All numeric thresholds and string patterns live here. No magic numbers elsewhere.

/** Current manifest format version. Bump when the shape of Manifest changes. */
export const MANIFEST_VERSION = 1 as const;

/** Default animation playback rate used unless the asset overrides it. */
export const DEFAULT_ANIMATION_FPS = 10 as const;

/** Canvas size used for composite asset previews (e.g. hull + tracks + turret). */
export const COMPOSITE_CANVAS_PX = 512 as const;

/**
 * Frame dimensions for Pack 5 soldier sprite sheets.
 * Each frame is a square tile of this size within a horizontal strip.
 */
export const SOLDIER_FRAME_PX = 128 as const;

/**
 * Minimum number of files with the same detected base name required
 * before a directory's contents are classified as an animation sequence
 * rather than a set of individually-named sprites.
 */
export const SEQUENCE_MIN_FRAMES = 2 as const;

/**
 * Zero-padded three-digit sequence pattern.
 * Matches: "Bomb_Idle_A_007.png" → base = "Bomb_Idle_A", index = 7
 * Used by Pack 1 and Pack 2 animation frames.
 */
export const PADDED_SEQUENCE_RE = /^(.+)_(\d{3})\.png$/i;

/**
 * Simple incrementing-number sequence pattern (non-padded).
 * Matches: "Explosion_7.png" → base = "Explosion_", index = 7
 * Used by Pack 3 explosion frames.
 */
export const SIMPLE_SEQUENCE_RE = /^(.*?)(\d+)\.png$/i;

/**
 * Exact base names (no extension) that identify a horizontal sprite sheet
 * where frameWidth === frameHeight === SOLDIER_FRAME_PX.
 * Any file whose name (minus extension) appears in this set is classified
 * as a SheetAsset rather than a SpriteAsset.
 */
export const SPRITE_SHEET_NAMES: ReadonlySet<string> = new Set([
  'Idle',
  'Walk',
  'Run',
  'Shot_1',
  'Shot_2',
  'Recharge',
  'Grenade',
  'Attack',
  'Attacck', // known typo in Pack 5 — filename must match exactly
  'Hurt',
  'Dead',
  'Explosion',
  'Smoke',
]);

// ---- Preview canvas appearance ----

/** Cell size in pixels for the transparency checkerboard background. */
export const CHECKER_SIZE_PX = 12 as const;

/** Light cell color of the checkerboard. */
export const CHECKER_LIGHT = '#c8c8c8' as const;

/** Dark cell color of the checkerboard. */
export const CHECKER_DARK = '#909090' as const;

// ---- Zoom limits ----

export const ZOOM_MIN = 0.1 as const;
export const ZOOM_MAX = 8 as const;
export const ZOOM_STEP_IN = 1.1 as const;
export const ZOOM_STEP_OUT = 0.9 as const;
