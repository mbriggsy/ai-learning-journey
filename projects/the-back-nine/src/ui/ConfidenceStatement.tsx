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
import { SurvivorReadout } from './SurvivorReadout'
import { formatAxisDollar, formatPerMonth } from './money'
import { focusHeading } from '@intake/a11y'
import { ConfidenceBandPanel } from '@viz/ConfidenceBandPanel'
import {
  resolveBandData,
  buildYTicks,
  type IndeterminateBandData,
  type XAnnotation,
} from '@viz/bandData'
import { BAND_LABELS, BAND_CHROME } from './bandPanelChrome'
import type { BandFan, DollarAdjustment, Headline, SurvivorReading } from '@shared/model'
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
      /** Household-clock x-axis markers (Today / retirement / horizon) for the band; without them
       *  the band's x-axis reads bare. Applied to the resolved band AND the indeterminate placeholder. */
      readonly bandAnnotations?: readonly XAnnotation[]
      /** Maps a lattice year to the household ages string for the band's hover/scrub readout (the same
       *  slot the annotations use). Absent ⇒ the readout omits its ages line. */
      readonly bandAges?: (yearsFromNow: number) => string
      /** Renders the PROVISIONAL eyebrow — a reading taken before the account set is complete is a
       *  labeled provisional update, never a final answer (back-nine-design intake §progressive). */
      readonly provisional?: boolean
      /** The U7 "as the survivor" reading — the quieter second statement. Present iff the spine run
       *  carried a survivor phase (the parent, answerView, decides); when present, SurvivorReadout
       *  mounts below the band. Spine-only: the date route renders a timing claim, not a joint verdict. */
      readonly survivorReading?: SurvivorReading
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

/** The indeterminate placeholder band — a wide low-emphasis envelope (no median, no precise band)
 *  so the "range not determined yet" card still reads as a band and sits at the SAME size as the
 *  resolved panels, without implying a confident answer. The $ ceiling + horizon are representative
 *  (the range is genuinely undetermined); the note names the state. */
const PLACEHOLDER_HORIZON_YEARS = 30
const PLACEHOLDER_DOLLAR_MAX = 2_000_000
function buildPlaceholderBand(annotations: readonly XAnnotation[]): IndeterminateBandData {
  return {
    kind: 'indeterminate',
    horizonYears: PLACEHOLDER_HORIZON_YEARS,
    dollarMax: PLACEHOLDER_DOLLAR_MAX,
    yTicks: buildYTicks(PLACEHOLDER_DOLLAR_MAX, formatAxisDollar),
    annotations,
    placeholderNote: copy.bandPlaceholderNote,
  }
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
    case 'rethink':
      // already-failing (0 of 10, unfundable from the start): the engine drops the figure — no single
      // trim is a solve — so the clause is figure-less + lever-agnostic. (Council 2026-06-29.)
      return slots.verdictRethinkClause()
  }
}

export function ConfidenceStatement({ view, focusSignal }: ConfidenceStatementProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Announce on the FIRST landing only (the undefined→defined edge) — the shared once-per-landing
  // contract (mirrors FuckOffDate). The spine's two recomputes are byte-identical, so its key never
  // changes across the pair; this guard makes the once-only intent explicit and tier-proof. Review
  // unmounts the surface, resetting the ref so a fresh completion re-announces.
  const announcedRef = useRef(false)
  useEffect(() => {
    if (focusSignal !== undefined && !announcedRef.current) {
      announcedRef.current = true
      focusHeading(headingRef.current)
    }
  }, [focusSignal])

  // The producer seam: resolve the per-year fan into drawable geometry ONCE per view. resolveBandData
  // owns the fail-loud honesty guards (malformed fan ⇒ throw — never a silently-wrong band). Only a
  // worded reading with a fan carries a band; indeterminate / pending / error never do.
  const resolved = useMemo(() => {
    // Align the resolve guard with the RENDER guard: only a WORDED reading with a fan draws a band.
    // An indeterminate reading renders the placeholder (never `resolved`), so resolving — and possibly
    // throwing on — a fan it would never draw is both wasted and a latent render-throw on a never-shown
    // band (the engine emits no fan for indeterminate today; this keeps the guards from drifting apart).
    if (view.kind !== 'reading' || !view.band || view.headline.outcomeState === 'indeterminate') {
      return null
    }
    return resolveBandData(view.band, view.headline.outcomeState, {
      formatDollar: formatAxisDollar,
      annotations: view.bandAnnotations,
      formatAges: view.bandAges,
    })
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
    // Range / no-verdict: the answer is incomplete, not bad — the ellipsis glyph + the calm "takes
    // shape as you go" line (never an outcome word — outcomeStates framing 'range') + the wide
    // PLACEHOLDER band (no median, no precise edge), so the card reads as a band and matches the
    // resolved panels' size without implying a confident answer.
    body = (
      <div className="confidence-reveal" data-framing="range">
        <div className="cs-range">
          <VerdictIcon state="indeterminate" className="cs-glyph" />
          <h2 className="cs-range__lead" tabIndex={-1} ref={headingRef}>
            {copy.answerIncomplete}
          </h2>
        </div>
        <div className="cs-band">
          <ConfidenceBandPanel
            data={buildPlaceholderBand(view.bandAnnotations ?? [])}
            labels={BAND_LABELS}
            chrome={BAND_CHROME}
          />
        </div>
      </div>
    )
  } else {
    const state = view.headline.outcomeState
    const pres = OUTCOME_PRESENTATION[state]
    const word = pres.verdictWordKey ? copy[pres.verdictWordKey] : ''
    // The over-funded near-ceiling reads the proportion "better than 9 in 10" via xOfTenAtCeiling (the
    // 10-of-10 honesty clamp, called BY NAME — never the magic xOfTen(10)); every other worded state
    // reads its engine count through the slot.
    const reading =
      state === 'over-funded' ? slots.xOfTenAtCeiling() : slots.xOfTen(view.headline.xOfTen.value)
    body = (
      <div className="confidence-reveal" data-framing={pres.framing} data-twopane={resolved ? '' : undefined}>
        <div className="reveal__lead">
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
        </div>
        {resolved && (
          <div className="cs-band">
            <ConfidenceBandPanel data={resolved} labels={BAND_LABELS} chrome={BAND_CHROME} />
          </div>
        )}
        {/* The quieter "as the survivor" statement, BELOW the band — present iff the run carried a
            survivor phase. Opacity-only reveal (survivor.css), below-band so the scrub tap-targets
            never move. Renders nothing on absence (insight 044). */}
        {view.survivorReading && <SurvivorReadout reading={view.survivorReading} />}
      </div>
    )
  }

  return (
    <section className="confidence" aria-label={copy.confidenceRegionLabel}>
      {body}
    </section>
  )
}
