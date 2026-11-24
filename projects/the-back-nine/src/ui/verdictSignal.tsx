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
import { VERDICT_GLYPH } from './glyphs'

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
