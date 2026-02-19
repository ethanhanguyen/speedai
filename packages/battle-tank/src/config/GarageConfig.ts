import { ENGINE_CONFIG } from './EngineConfig.js';

const CW = ENGINE_CONFIG.canvas.width;
const CH = ENGINE_CONFIG.canvas.height;

// ---------------------------------------------------------------------------
// Layout regions (screen-space pixel rects)
// ---------------------------------------------------------------------------

export const GARAGE_LAYOUT = {
  /** Tank preview — center-left area. */
  preview: { cx: CW * 0.32, cy: CH * 0.36, radius: 80 },

  /** Radar chart — right of preview. */
  radar: { cx: CW * 0.72, cy: CH * 0.28, radius: 70 },

  /** Weight bar — below radar. */
  weightBar: { x: CW * 0.58, y: CH * 0.52, width: 240, height: 16 },

  /** P/W ratio text position. */
  pwText: { x: CW * 0.58, y: CH * 0.57 },

  /** Compare strip — below weight bar. */
  compare: { x: CW * 0.58, y: CH * 0.61, lineHeight: 14 },

  /** Part slot strip area — bottom band. */
  slots: { y: CH * 0.72, height: 80, cardWidth: 64, cardHeight: 64, gap: 8, scrollPadding: 16 },

  /** Slot category buttons — left of slot strip. */
  slotTabs: { x: 12, y: CH * 0.72, width: 80, height: 20, gap: 4 },

  /** Loadout slot buttons — top-right. */
  loadoutSlots: { x: CW - 200, y: 10, width: 52, height: 28, gap: 8 },

  /** Deploy button. */
  deploy: { x: CW - 120, y: CH - 50, width: 100, height: 36 },

  /** Back button. */
  back: { x: 12, y: CH - 50, width: 80, height: 36 },
} as const;

// ---------------------------------------------------------------------------
// Colors and fonts
// ---------------------------------------------------------------------------

export const GARAGE_STYLE = {
  bgColor: '#12121e',
  panelColor: 'rgba(255,255,255,0.04)',
  panelBorder: 'rgba(255,255,255,0.08)',

  textColor: '#e0e0e0',
  dimTextColor: '#888',
  accentColor: '#4a7',
  warningColor: '#d44',
  highlightColor: '#5bf',

  titleFont: 'bold 28px monospace',
  labelFont: '12px monospace',
  valueFont: 'bold 13px monospace',
  cardFont: '10px monospace',
  buttonFont: 'bold 14px monospace',
  categoryFont: 'bold 11px monospace',

  radar: {
    fillColor: 'rgba(74,170,119,0.25)',
    strokeColor: '#4aa7',
    hoverFillColor: 'rgba(91,187,255,0.15)',
    hoverStrokeColor: '#5bf',
    gridColor: 'rgba(255,255,255,0.08)',
    labelColor: '#aaa',
    rings: 3,
  },

  weightBar: {
    bgColor: 'rgba(255,255,255,0.1)',
    goodColor: '#4a7',
    warnColor: '#da3',
    overloadColor: '#d44',
    overloadPulseHz: 3,
  },

  compare: {
    betterColor: '#4a7',
    worseColor: '#d44',
    neutralColor: '#888',
  },

  card: {
    bgColor: 'rgba(255,255,255,0.06)',
    selectedBorder: '#4a7',
    hoverBorder: '#5bf',
    borderWidth: 2,
    borderRadius: 6,
  },
} as const;

// ---------------------------------------------------------------------------
// Slot categories
// ---------------------------------------------------------------------------

export type SlotCategory = 'hull' | 'engine' | 'track' | 'gun' | 'armor';

export const SLOT_CATEGORIES: readonly SlotCategory[] = ['hull', 'engine', 'track', 'gun', 'armor'];

export const SLOT_LABELS: Record<SlotCategory, string> = {
  hull: 'HULL',
  engine: 'ENGINE',
  track: 'TRACKS',
  gun: 'GUN',
  armor: 'ARMOR',
};

// ---------------------------------------------------------------------------
// Flavor text for compare strip
// ---------------------------------------------------------------------------

export const FLAVOR_TEXT: Partial<Record<string, string>> = {
  'hull-01': 'Nimble scout chassis — light but fragile',
  'hull-02': 'Balanced all-rounder for any role',
  'hull-03': 'Front-line enforcer with extra plating',
  'hull-04': 'Sentinel-class fortified hull',
  'hull-05': 'Unstoppable juggernaut — slow but massive HP',
  'hull-06': 'Ghost chassis — smallest profile, lowest weight',
  'hull-07': 'Reaper frame — aggressive mid-weight design',
  'hull-08': 'Titan fortress — maximum armor, maximum weight',
  'engine-light': 'Modest power, featherweight',
  'engine-standard': 'Reliable workhorse',
  'engine-heavy': 'Raw muscle — high power but heavy',
  'engine-turbo': 'Peak power-to-weight — fragile under load',
  'track-1': 'Steel treads — fast on roads, sluggish in mud',
  'track-2': 'Rubber tracks — all-terrain versatility',
  'track-3': 'Spiked treads — grip on ice, heavy',
  'track-4': 'Hover system — glides over water, premium weight',
  'gun-01': 'Balanced cannon — reliable at any range',
  'gun-03': 'Raw punch with punishing knockback',
  'gun-05': 'Area denial with explosive splash',
  'gun-06': 'Sustained beam — manage your heat',
  'gun-08': 'Piercing rail — charge for devastating strikes',
  'none': 'No armor — full speed',
  'reactive': 'Detonates incoming explosives',
  'composite': 'Broad damage reduction across all types',
  'cage': 'Spaced cage defeats shaped charges',
};
