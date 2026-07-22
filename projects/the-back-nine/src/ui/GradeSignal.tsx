/*
 * src/ui/GradeSignal.tsx — the NON-COLOR confidence-GRADE signal (Act-4 · U16 §S3b).
 *
 * The ConfidenceGrade is the MOST trust-load-bearing signal on the recommendation surface, and the
 * reader is COLOR BLIND — so the grade is told apart by a redundant, never-color-alone stack: the grade
 * WORD (text, the primary a11y-tree signal — "A confident lean" / "A close call"), typographic weight,
 * and THIS silhouette glyph. Mirrors {@link VerdictIcon} exactly: the glyphs are drawn in pure `--ink`
 * (NO per-grade chroma — the calmest, most colorblind-honest choice, and it sidesteps the red/green
 * casino entirely; color is never even the fifth channel here).
 *
 * THE SILHOUETTE IS THE CHANNEL (back-nine-design §2): the three glyphs are pairwise-distinct OVERALL
 * FORMS (a forward double-chevron / a coin on its divide / an ellipsis), pinned by colorblind.test.tsx's
 * silhouette-distinctness arm with a planted-fail control.
 *
 * DECORATIVE BY DEFAULT (no double-announce): the glyph is `aria-hidden` when a visible grade WORD sits
 * beside it (the graded case — the word carries the state into the a11y tree as text). A STANDALONE use
 * (the ungraded case, drawn with no adjacent word) passes an explicit `label` to make it `role="img"`.
 *
 * STRING-FREE: no user-facing copy lives here; the accessible `label`, when needed, arrives as a prop
 * (routed through copy.ts), never an inline literal.
 */
import type { VerdictGlyph } from './verdictSignal'

/** The three grade signal states. `confident`/`coin-flip` are the two engine grades; `ungraded` is the
 *  honest could-not-grade state (a one-arm set / the B-floor unmet) — its own distinct silhouette. */
export type GradeSignalState = 'confident' | 'coin-flip' | 'ungraded'

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

export interface GradeSignalProps {
  readonly state: GradeSignalState
  /** When set, the glyph is a standalone `role="img"` with this accessible name (caller copy). Omit
   *  when an adjacent visible grade word already carries the signal — then it's decorative
   *  (`aria-hidden`), so a screen reader hears the word once, never the word AND the icon. */
  readonly label?: string
  /** Square edge length. Defaults to 1.5em so it scales with the adjacent word. */
  readonly size?: number | string
  readonly className?: string
}

/** The grade glyph — pure `--ink` silhouette, redundant to the grade word. */
export function GradeSignal({ state, label, size = '1.5em', className }: GradeSignalProps) {
  const glyph = GRADE_GLYPH[state]
  const a11y = label !== undefined ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y}
    >
      {glyph.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {glyph.dots?.map(([cx, cy], i) => (
        <circle key={`d${i}`} cx={cx} cy={cy} r={1.4} fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}
