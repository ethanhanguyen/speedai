// Phase 3 — Preview Canvas
// All UI constants in one place. No color/size literals scattered in component files.

export const UI = {
  // Colors
  bg:           '#1e1e1e',
  panelBg:      '#252526',
  borderColor:  '#3c3c3c',
  textPrimary:  '#cccccc',
  textSecondary:'#888888',
  accentColor:  '#007acc',
  hoverBg:      '#2a2d2e',
  selectedBg:   '#094771',
  errorColor:   '#f44336',
  tagBg:        '#3c3c3c',
  tagText:      '#cccccc',

  // Typography
  fontMono: "'SF Mono', 'Fira Code', Consolas, monospace",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSizeSm: '11px',
  fontSizeMd: '13px',

  // Layout
  browserWidth:  '260px',
  propsWidth:    '220px',
  animBarHeight: '44px',
  headerHeight:  '36px',
} as const;
