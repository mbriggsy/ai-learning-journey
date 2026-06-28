/*
 * src/ui/FuckOffDate.tsx — the D2 elevated fuck-off-date surface (the not-yet-retired magic moment).
 *
 * The date-first analog of ConfidenceStatement: for a household with ≥ 1 person still working, the
 * LEAD answer is the date they can stop working (R26/R29). This is the LANDED, elevated treatment —
 * the date as a hero headline in the Clubhouse Ledger voice — distinct from the provisional DateLine
 * that ticks during intake (AnswerStrip). It renders the engine's DateTrackOutcome; it re-derives no
 * threshold (the date-search already crowned the offset and graded it on the one-sided lower bound).
 *
 * THE THREE FIRST-CLASS OUTCOMES (C3) render HONESTLY (R25 — calm-but-wrong is the sin):
 *   - confirmed-date        → "Your fuck-off date is about N years out" (or "is today" at Y=0).
 *   - window-edge-unconfirmed → the same date WITH the edge-of-window disclosure (never silently
 *                               crowned as confirmed — there's no later evidence).
 *   - no-date-in-window     → the calm "No fuck-off date within the next N years" (a designed answer,
 *                               never "never free", never a blank, never the window-top presented as
 *                               confirmed).
 * The non-monotone-region disclosure (the ACA-cliff signature) rides ANY result whose flags are set.
 *
 * THE ODDS are the grade's CONSERVATIVE quantized lower bound (dateOdds.ts, single-sourced with the
 * strip). CALM RENDERING: figures are STATIC (no count-up); the surface fades in once on landing;
 * reduced-motion drops the movement, final state identical. STRING-FREE inline: every string from
 * copy.ts (copyGuard-gated); every numeral through a typed slot. CSP-clean: class-driven.
 *
 * SCOPE (slice 1): the landed headline + odds + disclosures. The date↔confidence TRADEOFF line
 * ("or year M for higher odds", R28) and the on-demand confidence-curve drawer are a deliberate
 * follow-up — their curve-reading semantics are honesty-critical and are designed separately.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { copy, slots } from './copy'
import { dateOddsText } from './dateOdds'
import { focusHeading } from '@intake/a11y'
import type { DateTrackOutcome } from '@shared/model'
import './styles/fuckOffDate.css'

/** What the surface shows. `dates` carries the crowned floor track (the v1 degenerate budget renders
 *  floor ≡ lifestyle as ONE date; the lifestyle split is Act 3). `pending` / `compute-error` mirror
 *  the ConfidenceStatement non-answer modes. */
export type FuckOffDateView =
  | {
      readonly kind: 'dates'
      readonly track: DateTrackOutcome
      /** The window top this run evaluated — the no-date answer names its own window. */
      readonly windowTopYears: number
      readonly provisional?: boolean
    }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }

export interface FuckOffDateProps {
  readonly view: FuckOffDateView
  /** Bump to land focus on the date headline (the magic-moment announce, no double-announce). Omit
   *  to leave focus alone (provisional ticks + the dev preview never steal focus). */
  readonly focusSignal?: number | string
}

export function FuckOffDate({ view, focusSignal }: FuckOffDateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusSignal !== undefined) focusHeading(headingRef.current)
  }, [focusSignal])

  let body: ReactNode
  if (view.kind === 'pending') {
    body = <p className="fod-pending">{copy.answerPending}</p>
  } else if (view.kind === 'compute-error') {
    body = (
      <p className="fod-error">
        {copy.answerError}{' '}
        <button type="button" className="fod-retry" onClick={view.onRetry}>
          {copy.answerRetry}
        </button>
      </p>
    )
  } else if (view.track.kind === 'no-date-in-window') {
    // The calm first-class no-date answer — names its own window, never "never free".
    body = (
      <div className="fod-reveal" data-framing="no-date">
        {view.provisional && <p className="fod-provisional">{copy.answerProvisionalTag}</p>}
        <h2 className="fod-headline fod-headline--quiet" tabIndex={-1} ref={headingRef}>
          {slots.noDateInWindow(view.windowTopYears)}
        </h2>
        {view.track.nonMonotoneOffsets.length > 0 && (
          <p className="fod-note">{copy.dateNonMonotoneNote}</p>
        )}
      </div>
    )
  } else {
    // confirmed-date | window-edge-unconfirmed — the date headline + the conservative odds.
    const track = view.track
    const lead = track.offsetYears === 0 ? copy.dateFreeToday : slots.dateInYears(track.offsetYears)
    body = (
      <div className="fod-reveal" data-framing="date">
        {view.provisional && <p className="fod-provisional">{copy.answerProvisionalTag}</p>}
        <h2 className="fod-headline" tabIndex={-1} ref={headingRef}>
          {lead}
        </h2>
        <p className="fod-odds">{dateOddsText(track.grade.quantizedLowerBound)}</p>
        {track.kind === 'window-edge-unconfirmed' && (
          <p className="fod-note">{copy.dateWindowEdgeNote}</p>
        )}
        {track.nonMonotoneOffsets.length > 0 && (
          <p className="fod-note">{copy.dateNonMonotoneNote}</p>
        )}
      </div>
    )
  }

  return (
    <section className="fuck-off-date" aria-label={copy.dateRegionLabel}>
      {body}
    </section>
  )
}
