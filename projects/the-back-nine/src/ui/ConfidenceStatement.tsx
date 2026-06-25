/*
 * src/ui/ConfidenceStatement.tsx — the U7 verdict-FIRST surface (the product's face, R1).
 *
 * The plain-language confidence statement (R2/R14): a married couple with no finance background
 * reads the verdict WORD, the "X of 10" natural-frequency reading, and a coarse dollar-grammar
 * clause — in that calm order — with the range one pull away, never on the first frame (R4).
 *
 * SPINE-LEAD (U7): this surface leads with the spine confidence reading. The DATE-first lead for a
 * not-yet-retired household is D2's job (the state-adaptive first answer); the same calm voice, a
 * different lead. This component renders what it is GIVEN (the engine's Headline + DollarAdjustment
 * + an optional per-year BandFan) — it re-derives no threshold, clamp, or grade (confidence.ts
 * already tagged the distribution; outcomeStates.ts maps the tag to presentation).
 *
 * THE COLOR-BLIND LAW (back-nine-design §2): the signal is NEVER color. The verdict reaches the
 * reader through a redundant stack — the WORD (text, the a11y-tree signal), the "X of 10" count,
 * the dollar magnitude, and the SILHOUETTE glyph. The word renders in --ink (uniform), so hue
 * carries ZERO good/bad connotation; the glyph is decorative (aria-hidden) beside its visible word.
 *
 * CALM RENDERING (back-nine-design §3): the figures render STATIC — no count-up / odometer (a
 * dashboard/casino tell, and the static number is the reload-determinism screenshot artifact). The
 * surface fades in once on its first reveal (the magic moment); numbers never animate. All motion
 * honors prefers-reduced-motion, and the final rendered state is identical with motion on or off.
 *
 * STRING-FREE inline (cross-cutting #4): every user-facing string comes from copy.ts (gated by the
 * U7 copyGuard); every numeral enters through a typed slot. CSP-clean: all styling is class-driven
 * (confidence.css), never an inline style attribute.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { copy, slots } from './copy'
import { OUTCOME_PRESENTATION } from './outcomeStates'
import { VerdictIcon } from './verdictSignal'
import { formatAxisDollar, formatPerMonth } from './money'
import { focusHeading } from '@intake/a11y'
import { ConfidenceBandPanel, type BandPanelChrome } from '@viz/ConfidenceBandPanel'
import { resolveBandData, type BandLabels } from '@viz/bandData'
import type { BandFan, DollarAdjustment, Headline } from '@shared/model'
import './styles/confidence.css'

/** What the surface shows. `reading` covers all six engine states (it reads `outcomeState`);
 *  `pending` and `compute-error` are the NON-verdict modes (the band is simply not mounted). */
export type ConfidenceStatementView =
  | {
      readonly kind: 'reading'
      readonly headline: Headline
      readonly dollar: DollarAdjustment
      /** The engine's per-year fan, opt-in. When present (and the state is a real verdict), the
       *  "show me the range" drawer mounts. Absent ⇒ no drawer (the verdict still stands). */
      readonly band?: BandFan
      /** Renders the PROVISIONAL eyebrow — a reading taken before the account set is complete is a
       *  labeled provisional update, never a final answer (back-nine-design intake §progressive). */
      readonly provisional?: boolean
    }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }

export interface ConfidenceStatementProps {
  readonly view: ConfidenceStatementView
  /** Bump to move focus to the verdict heading (the magic-moment landing — the focus-to-heading
   *  announce, no double-announce). Omit (default) to leave focus alone: provisional ticks and the
   *  dev preview harness never steal focus. */
  readonly focusSignal?: number | string
}

const BAND_LABELS: BandLabels = {
  caption: copy.bandCaption,
  yAxisLabel: copy.bandYAxis,
  xAxisLabel: copy.bandXAxis,
  legendMedian: copy.bandLegendMedian,
  legendInner: copy.bandLegendInner,
  legendOuter: copy.bandLegendOuter,
}
const BAND_CHROME: BandPanelChrome = {
  pull: copy.bandPull,
  enlargeLabel: copy.bandStudyRange,
  modalTitle: copy.bandModalTitle,
  closeLabel: copy.bandClose,
}

/** The verdict's second line — the dollar grammar, keyed off the engine DIRECTION (never re-derived
 *  here). The $/month enters through the slot pre-formatted, so the rendered clause carries no
 *  hardcoded numeral (copyGuard slot-discipline). */
function magnitudeClause(dollar: DollarAdjustment): string {
  switch (dollar.direction) {
    case 'room':
      return slots.verdictRoomClause(formatPerMonth(dollar.perMonthReal.value))
    case 'trim':
      return slots.verdictTrimClause(formatPerMonth(dollar.perMonthReal.value))
    case 'on-the-line':
      return slots.verdictHoldClause()
  }
}

export function ConfidenceStatement({ view, focusSignal }: ConfidenceStatementProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusSignal !== undefined) focusHeading(headingRef.current)
  }, [focusSignal])

  // The producer seam: resolve the per-year fan into drawable geometry ONCE per view. resolveBandData
  // owns the fail-loud honesty guards (malformed fan ⇒ throw — never a silently-wrong band). Only a
  // worded reading with a fan carries a band; indeterminate / pending / error never do.
  const resolved = useMemo(() => {
    if (view.kind !== 'reading' || !view.band) return null
    return resolveBandData(view.band, view.headline.outcomeState, { formatDollar: formatAxisDollar })
  }, [view])

  let body: ReactNode
  if (view.kind === 'pending') {
    body = <p className="cs-pending">{copy.answerPending}</p>
  } else if (view.kind === 'compute-error') {
    body = (
      <p className="cs-error">
        {copy.answerError}{' '}
        <button type="button" className="cs-retry" onClick={view.onRetry}>
          {copy.answerRetry}
        </button>
      </p>
    )
  } else if (view.headline.outcomeState === 'indeterminate') {
    // Range / no-verdict: the answer is incomplete, not bad — the ellipsis glyph + the calm
    // "takes shape as you go" line, never an outcome word (outcomeStates: framing 'range').
    body = (
      <div className="confidence-reveal cs-range">
        <VerdictIcon state="indeterminate" className="cs-glyph" />
        <h2 className="cs-range__lead" tabIndex={-1} ref={headingRef}>
          {copy.answerIncomplete}
        </h2>
      </div>
    )
  } else {
    const state = view.headline.outcomeState
    const pres = OUTCOME_PRESENTATION[state]
    const word = pres.verdictWordKey ? copy[pres.verdictWordKey] : ''
    // The over-funded near-ceiling reads "more than 9 of 10" (the 10-of-10 honesty clamp); every
    // other worded state reads its engine count. The number enters through the slot.
    const reading =
      state === 'over-funded' ? slots.xOfTen(10) : slots.xOfTen(view.headline.xOfTen.value)
    body = (
      <div className="confidence-reveal" data-framing={pres.framing}>
        {view.provisional && <p className="cs-provisional">{copy.answerProvisionalTag}</p>}
        <div className="cs-verdict">
          <VerdictIcon state={state} className="cs-glyph" />
          <h2 className="cs-word" tabIndex={-1} ref={headingRef}>
            {word}
          </h2>
        </div>
        <p className="cs-reading">
          <span className="cs-reading__count">{reading}</span>{' '}
          <span className="cs-reading__frame">{copy.confidenceCoverageCaption}</span>
        </p>
        <p className="cs-magnitude">{magnitudeClause(view.dollar)}</p>
        {resolved && (
          <div className="cs-band">
            <ConfidenceBandPanel data={resolved} labels={BAND_LABELS} chrome={BAND_CHROME} />
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="confidence" aria-label={copy.confidenceRegionLabel}>
      {body}
    </section>
  )
}
