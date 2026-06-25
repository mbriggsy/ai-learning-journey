/*
 * src/ui/verdictSignal.tsx — the NON-COLOR verdict signal (U7).
 *
 * The reader is COLOR BLIND, so the six outcome states are told apart by a redundant,
 * never-color-alone stack: the verdict WORD (text, the primary a11y-tree signal) + the dollar
 * MAGNITUDE + typographic WEIGHT/SCALE + this SILHOUETTE glyph. This file owns the glyph half —
 * the per-state icon shapes that `palette.ts` deliberately deferred here (they are ordinal,
 * taste-adjacent, and judged by the N=1 cold-read), and the state→glyph binding.
 *
 * THE SILHOUETTE IS THE CHANNEL (back-nine-design §2): the six glyphs MUST be pairwise-distinct on
 * the non-hue channel — different overall FORMS, not the same form in a different position or hue.
 * They are drawn in pure `--ink` (no per-state chroma): the calmest, most colorblind-honest choice,
 * and it sidesteps the red/green casino entirely (a hue accent can be added on the cold-read if the
 * reviewer wants one — color would only ever be the LEAST-trusted, redundant channel).
 *
 * DECORATIVE BY DEFAULT (no double-announce): the glyph is `aria-hidden` — the visible verdict WORD
 * already carries the state into the a11y tree as text (back-nine-design §2 "signal reachable as
 * text"). A standalone use (no adjacent word) passes an explicit `label` to make it `role="img"`.
 *
 * STRING-FREE: no user-facing copy lives here; the accessible `label`, when needed, arrives as a
 * prop from the caller (routed through `copy.ts`) — never an inline literal.
 */

import type { OutcomeState } from '@shared/model'

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

/** The exhaustive state list (re-exported convenience for the probe + cold-read iteration). */
export const VERDICT_STATES = Object.keys(VERDICT_GLYPH) as readonly OutcomeState[]

export interface VerdictIconProps {
  readonly state: OutcomeState
  /** When set, the glyph is a standalone `role="img"` with this accessible name (caller copy).
   *  Omit when an adjacent visible verdict word already carries the signal — then it's decorative
   *  (`aria-hidden`), so a screen reader hears the word once, never the word AND the icon. */
  readonly label?: string
  /** Square edge length (px). Defaults to 1.5em so it scales with the adjacent word. */
  readonly size?: number | string
  readonly className?: string
}

/** The verdict glyph for a state — pure `--ink` silhouette, redundant to the verdict word. */
export function VerdictIcon({ state, label, size = '1.5em', className }: VerdictIconProps) {
  const glyph = VERDICT_GLYPH[state]
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
