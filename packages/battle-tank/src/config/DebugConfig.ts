// ---------------------------------------------------------------------------
// Debug configuration — all debug features gated behind `enabled`
// ---------------------------------------------------------------------------

export const DEBUG_CONFIG = {
  /** Master toggle — set to false for production builds. */
  enabled: true,

  /** Key code to toggle the debug overlay HUD. */
  toggleKey: 'Backquote',

  // --- Overlay panel ---
  overlay: {
    /** Background fill behind debug text. */
    bgColor: 'rgba(0, 0, 0, 0.65)',
    /** Text color for labels. */
    labelColor: '#aaa',
    /** Text color for values. */
    valueColor: '#0f0',
    /** Font for all debug text. */
    font: '11px monospace',
    /** Padding inside the overlay panel (px). */
    padding: 8,
    /** Line height for debug text rows (px). */
    lineHeight: 14,
    /** Panel max width (px). */
    maxWidth: 260,
  },

  // --- World-space debug draws (toggled independently) ---
  /** Draw A* paths as colored dots on world. */
  drawPaths: false,
  /** Draw fire range / preferred range circles around AI entities. */
  drawRanges: false,
  /** Draw flow field direction arrows. */
  drawFlowField: false,
  /** Draw sniper LOS lines + cover target markers. */
  drawLOS: false,
};

export type DebugConfig = typeof DEBUG_CONFIG;
