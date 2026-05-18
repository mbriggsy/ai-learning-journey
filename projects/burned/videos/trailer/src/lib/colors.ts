/**
 * BURNED palette — Pendleton briefing-room aesthetic.
 *
 * Snapshot from `src/client/shared/tokens/primitives.css` at Phase 0
 * Unit 0.5 spike time. Spike uses approximate hex inline; Phase 4
 * inherits these constants as the single trailer-side source of truth.
 *
 * Naming mirrors BURNED's color-{name}-{shade} scale to keep the
 * mental model consistent.
 */
export const PALETTE = {
  // Teal scale (board chrome, ink)
  teal2: '#0c2024',
  teal4: '#163338',
  teal11: '#a0c5ca',
  teal12: '#d7f1f5',

  // Ochre / signal-orange scale (stamps, signal chrome)
  ochre7: '#805032',
  ochre9: '#947226',
  ochre10: '#c98a5c',
  ochre11: '#edb182',
  ochre12: '#ffe9b9',

  // Cream scale (paper, briefing-room background)
  cream2: '#19160f',
  cream5: '#433a2c',
  cream11: '#d0c3a5',
  cream12: '#f6ebce',

  // Mono
  black: '#000000',
  white: '#ffffff',
} as const
