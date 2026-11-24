/**
 * The non-colour silhouettes (back-nine-design §2): the six outcome-state glyphs and the three grade glyphs, as path
 * data (`verdictSignal.tsx` and `GradeSignal.tsx` draw them; their headers hold the why, and `colorblind.test.tsx`
 * holds them pairwise distinct). Moved out of those two components by Act 6's RC0, unchanged.
 */
import type { OutcomeState } from '@shared/model'
import type { GradeSignalState } from './recommendationView'

/** One state's glyph: a set of stroked SVG path `d` commands, plus optional filled dots (the
 *  indeterminate ellipsis). Drawn on a 24×24 grid, `currentColor` ink, round caps/joins. */
export interface VerdictGlyph {
  readonly paths: readonly string[]
  readonly dots?: readonly (readonly [number, number])[]
}

/**
 * The six glyphs — a COHERENT set read as "how the money's future moves":
 *   on-track       ✓ a check — it lands safe
 *   over-funded    an arrow climbing INTO a ceiling cap — more than enough, near the top of scale
 *   borderline     a level beam on a fulcrum — balanced right on the line
 *   off-track      a line drifting DOWN with an arrowhead — sliding off
 *   already-failing a drop onto a floor baseline — the money meets the floor ($0)
 *   indeterminate  an ellipsis — not enough entered to say yet
 * Each is a distinct overall FORM (check / capped-up-arrow / beam+fulcrum / down-arrow / drop-to-
 * floor / dots) so the silhouettes survive the color-blind read. The cold-read is the final
 * silhouette oracle (the reviewer is the exact user this channel serves).
 */
export const VERDICT_GLYPH: Record<OutcomeState, VerdictGlyph> = {
  'on-track': { paths: ['M4 12.5 l5 5 L20 6.5'] },
  'over-funded': { paths: ['M5 5 h14', 'M12 20 V9.5', 'M7.5 14 L12 9.5 16.5 14'] },
  borderline: { paths: ['M4 11 h16', 'M9 16.5 L12 11 15 16.5 Z'] },
  'off-track': { paths: ['M5 7 L17 17', 'M17 17 h-5.5', 'M17 17 v-5.5'] },
  'already-failing': { paths: ['M12 4 V14', 'M8 10 L12 14 16 10', 'M5 19 h14'] },
  indeterminate: { paths: [], dots: [[6, 12], [12, 12], [18, 12]] },
} as const

/**
 * The three glyphs — a COHERENT set read as "how sure is this call":
 *   confident  a forward double-chevron — a clear lean toward one path
 *   coin-flip  a coin on its divide — it could land either way
 *   ungraded   an ellipsis — we couldn't say how close this call is
 * Each is a distinct overall FORM so the silhouettes survive the color-blind read (drawn on a 24×24
 * grid, `currentColor` ink, round caps/joins). The cold-read is the final silhouette oracle.
 */
export const GRADE_GLYPH: Record<GradeSignalState, VerdictGlyph> = {
  confident: { paths: ['M6 5 L13 12 L6 19', 'M13 5 L20 12 L13 19'] },
  'coin-flip': { paths: ['M12 4 A8 8 0 1 1 12 20 A8 8 0 1 1 12 4', 'M4 12 h16'] },
  ungraded: { paths: [], dots: [[6, 12], [12, 12], [18, 12]] },
} as const
