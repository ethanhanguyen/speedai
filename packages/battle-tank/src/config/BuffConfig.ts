// ---------------------------------------------------------------------------
// Timed buff/debuff definitions
// ---------------------------------------------------------------------------

/** Stat keys that timed effects can modify. */
export type BuffStat =
  | 'speed'           // movement speed multiplier
  | 'turnRate'        // hull turn rate multiplier
  | 'fireRate'        // weapon fire rate multiplier
  | 'damage'          // outgoing damage multiplier
  | 'incomingDamage'  // incoming damage multiplier (< 1 = reduction)
  | 'magnetRadius';   // drop magnet radius multiplier

export type BuffStacking = 'refresh' | 'ignore';

export interface TimedBuffDef {
  /** Seconds the effect lasts. */
  durationS: number;
  /** Multiplier applied to the stat (e.g. 1.5 = +50%). */
  magnitude: number;
  /** Which stat this effect modifies. */
  stat: BuffStat;
  /** What happens when the same type is picked up while active. */
  stacking: BuffStacking;
  /** Sprite key for the HUD icon (`*_Icon.png`). */
  iconKey: string;
  /** Whether this is a positive or negative effect. */
  polarity: 'buff' | 'debuff';
  /** Short label shown as pickup notification (e.g. 'SHIELD', 'SLOWED'). */
  label: string;
}

// ---------------------------------------------------------------------------
// Timed effect definitions — keyed by DropItemType (only timed items here)
// ---------------------------------------------------------------------------

export const TIMED_BUFF_DEFS: Record<string, TimedBuffDef> = {
  // --- Buffs ---
  shield:   { durationS: 5,  magnitude: 0.1,  stat: 'incomingDamage', stacking: 'refresh', iconKey: 'icon-shield',   polarity: 'buff',   label: 'SHIELD'     },
  attack:   { durationS: 8,  magnitude: 1.5,  stat: 'damage',         stacking: 'refresh', iconKey: 'icon-attack',   polarity: 'buff',   label: 'ATK UP'     },
  speed:    { durationS: 6,  magnitude: 1.3,  stat: 'speed',          stacking: 'refresh', iconKey: 'icon-speed',    polarity: 'buff',   label: 'SPEED UP'   },
  magnet:   { durationS: 10, magnitude: 2.5,  stat: 'magnetRadius',   stacking: 'refresh', iconKey: 'icon-magnet',   polarity: 'buff',   label: 'MAGNET'     },
  armor:    { durationS: 8,  magnitude: 0.5,  stat: 'incomingDamage', stacking: 'refresh', iconKey: 'icon-armor',    polarity: 'buff',   label: 'ARMOR UP'   },

  // --- Debuffs ---
  speed_debuff:    { durationS: 4, magnitude: 0.6, stat: 'speed',          stacking: 'refresh', iconKey: 'icon-speed',    polarity: 'debuff', label: 'SLOWED'     },
  armor_debuff:    { durationS: 5, magnitude: 1.5, stat: 'incomingDamage', stacking: 'refresh', iconKey: 'icon-armor',    polarity: 'debuff', label: 'ARMOR DOWN' },
  ammo_debuff:     { durationS: 3, magnitude: 0.4, stat: 'fireRate',       stacking: 'refresh', iconKey: 'icon-ammo',     polarity: 'debuff', label: 'GUN JAMMED' },
  mobility_debuff: { durationS: 4, magnitude: 0.5, stat: 'turnRate',       stacking: 'refresh', iconKey: 'icon-mobility', polarity: 'debuff', label: 'STUCK'      },
} as const;

// ---------------------------------------------------------------------------
// HUD display config for active effects
// ---------------------------------------------------------------------------

export const BUFF_HUD = {
  /** Icon size in screen-space px. */
  iconSize: 32,
  /** Gap between icons. */
  iconGap: 6,
  /** Y offset from top of screen. */
  y: 16,
  /** X offset from right edge. */
  rightMargin: 16,
  /** Radial cooldown overlay color. */
  cooldownOverlay: 'rgba(0, 0, 0, 0.55)',
  /** Border color for buff / debuff. */
  buffBorder: '#44ff44',
  debuffBorder: '#ff4444',
  /** Border width. */
  borderWidth: 2,
  /** Blink when remaining fraction drops below this. */
  expiryBlinkThreshold: 0.2,
  /** Blink frequency in Hz. */
  blinkHz: 4,
  /** Screen-edge vignette alpha (per polarity layer). */
  vignetteAlpha: 0.18,
  vignetteBuffColor: '#44ff88',
  vignetteDebuffColor: '#ff4444',
  /** World-space player aura ring. */
  auraRadius: 40,
  auraAlpha: 0.22,
  auraLineWidth: 3,
} as const;

/** Per-effect world aura color; unlisted types fall back to polarity color. */
export const BUFF_AURA_COLORS: Partial<Record<string, string>> = {
  shield:   '#44ffff',
  attack:   '#ff8800',
  speed:    '#ffff44',
  armor:    '#88aaff',
  magnet:   '#ff44ff',
};

/** Config for buff/debuff pickup float text (drawn in world space). */
export const BUFF_NOTIFY = {
  font: 'bold 13px monospace',
  floatSpeed: 55,  // px/s upward
  fadeTime: 1.5,   // seconds
  yOffsetPx: 30,   // start above player centre
} as const;
