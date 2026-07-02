/*
 * src/ui/FuckOffDate.tsx — the D2 elevated fuck-off-date surface (the not-yet-retired magic moment).
 *
 * The date-first analog of ConfidenceStatement: for a household with ≥ 1 person still working, the
 * LEAD answer is the date they can stop working (R26/R29). This is the LANDED, elevated treatment —
 * the date as a hero headline in the Clubhouse Ledger voice — distinct from the provisional DateLine
 * that ticks during intake (AnswerStrip). It renders the engine's DateTrackOutcomes; it re-derives no
 * threshold (the date-search already crowned each track and graded it on the one-sided lower bound).
 *
 * THE TWO-TRACK READING (U9b, council 2026-07-02 — the claim assignment). A budget-carrying run
 * carries TWO independent tracks, and the "work-optional / fuck-off" claim attaches ONLY to the
 * FULL-LIFESTYLE track: the hero lead, odds, tradeoff, disclosures, and the odds ladder all read
 * `lifestyle`. The essentials FLOOR renders as a subordinate "essentials covered by ~X" line — NEVER
 * "work-optional by ~X" (presenting the easier essentials date as the fuck-off date was the shipped
 * v1 gap this unit closes). The composition is decided in the PURE composeDateSplit (insight 048):
 * value-coincident tracks render the ONE-date composition verbatim (the degenerate); anything less
 * than full rendered-field agreement splits. The R27 floor>lifestyle inversion (100%-FPL/PTC — a
 * lower spend can mean less health-insurance help) rides an explicit plain-language disclosure,
 * never reordered or hidden.
 *
 * THE BAND stays SINGLE and FLOOR-crowned (engine-emitted iff the floor crowned; its outcomeState is
 * {on-track, over-funded} by construction). In a split reading a one-line note names the band's own
 * track so the range and the hero claim can never silently disagree. No second band — a same-hue
 * overlay is a measured CVD lockout (insight 038), and a plotted lifestyle curve re-opens the
 * standing no-date-curve veto.
 *
 * THE THREE FIRST-CLASS OUTCOMES (C3) render HONESTLY per track (R25 — calm-but-wrong is the sin):
 * confirmed-date · window-edge-unconfirmed (the edge disclosure, never silently crowned) ·
 * no-date-in-window (the calm designed answer, never "never free"). The non-monotone-region
 * disclosure (the ACA-cliff signature) rides the HERO track's flags.
 *
 * FOCUS vs ANNOUNCE (U9b build-gate 3, insight 047): the once-per-landing focus move stays keyed to
 * the FLOOR (resolvedFocusKey) with the once-per-mount latch — a lifestyle-only sharpen never yanks
 * focus. The lifestyle claim's change across a provisional→final sharpen instead reaches AT through
 * the ONE polite clear-after-announce live region (mount-empty, so it reliably announces).
 *
 * THE ODDS are each track's CONSERVATIVE quantized lower bound (dateOdds.ts, single-sourced with the
 * strip). CALM RENDERING: figures are STATIC (no count-up); the surface fades in once on landing;
 * reduced-motion drops the movement, final state identical. STRING-FREE inline: every string from
 * copy.ts (copyGuard-gated); every numeral through a typed slot. CSP-clean: class-driven.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { copy, slots } from './copy'
import { dateOddsText } from './dateOdds'
import { dateTradeoffPoint } from './dateTradeoff'
import { composeDateSplit, type DateSplitView } from './dateSplit'
import { focusHeading, createAnnouncer, type Announcer } from '@intake/a11y'
import { ConfidenceBandPanel } from '@viz/ConfidenceBandPanel'
import { OddsLadder } from '@viz/OddsLadder'
import { curveMarks } from '@viz/curveMarks'
import { resolveBandData, type XAnnotation } from '@viz/bandData'
import { BAND_LABELS, BAND_CHROME, composeBandAtRange } from './bandPanelChrome'
import { LADDER_LABELS } from './oddsLadderChrome'
import { formatAxisDollar } from './money'
import type { DateBand, DateTrackOutcome } from '@shared/model'
import './styles/fuckOffDate.css'

/** What the surface shows. `dates` carries BOTH independent tracks (U9b — the pure composeDateSplit
 *  decides one-date vs split; the value-coincident degenerate renders the single composition
 *  verbatim). `pending` / `compute-error` mirror the ConfidenceStatement non-answer modes. */
export type FuckOffDateView =
  | {
      readonly kind: 'dates'
      /** The essentials-floor track (the band's crown + the focus key — the load-bearing
       *  survival claim). */
      readonly floor: DateTrackOutcome
      /** The full-lifestyle track — the track the work-optional claim attaches to. */
      readonly lifestyle: DateTrackOutcome
      /** The window top this run evaluated — the no-date answer names its own window. */
      readonly windowTopYears: number
      readonly provisional?: boolean
      /** The crowned date's projection band — FLOOR-crowned, present iff the floor crowned
       *  (engine-owned iff; a floor-no-date run has none). When present, the "show me the
       *  range" drawer mounts under the worded answer. */
      readonly band?: DateBand
      /** Household-clock x-axis markers (Today / work stops / plan horizon) for the band — the date
       *  route's deriver carries the FUTURE work-stops marker at the band's OWN crowned offset. */
      readonly bandAnnotations?: readonly XAnnotation[]
      /** Maps a lattice year to the household ages string for the band's hover/scrub readout (the same
       *  slot the annotations use). Absent ⇒ the readout omits its ages line. */
      readonly bandAges?: (yearsFromNow: number) => string
    }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }

export interface FuckOffDateProps {
  readonly view: FuckOffDateView
  /** Bump to land focus on the date headline (the magic-moment announce, no double-announce). Omit
   *  to leave focus alone (provisional ticks + the dev preview never steal focus). */
  readonly focusSignal?: number | string
}

/** The hero claim's heading text — shared by the render and the polite sharpen announce, so what
 *  is spoken is exactly what is shown. */
function heroLead(hero: DateTrackOutcome, windowTopYears: number): string {
  if (hero.kind === 'no-date-in-window') return slots.noDateInWindow(windowTopYears)
  return hero.offsetYears === 0 ? copy.dateFreeToday : slots.dateInYears(hero.offsetYears)
}

/** The subordinate essentials line (split only) — the floor's claim in its own register. */
function floorLineText(split: Extract<DateSplitView, { kind: 'split' }>): string {
  const fl = split.floor
  if (fl.kind === 'not-within-window') {
    // Lifestyle no-date too ⇒ the quiet severity disclosure ("either"); lifestyle dated ⇒ the
    // extreme-inversion statement of fact (the inversion note carries the why).
    return split.lifestyle.kind === 'no-date-in-window'
      ? copy.dateFloorNotWithinEither
      : copy.dateFloorNotWithin
  }
  return slots.dateFloorCovered(fl.offsetYears, dateOddsText(fl.quantizedLowerBound), fl.unconfirmed)
}

export function FuckOffDate({ view, focusSignal }: FuckOffDateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Announce on the FIRST landing only (the undefined→defined edge). The date route is TIERED: the
  // provisional→final sharpen can crown a DIFFERENT offset, which flips focusSignal — but re-firing
  // focusHeading then would yank focus back to the heading + scroll, stealing it from a user who
  // tabbed into the range. Fire once per mount; Review unmounts the surface (phase flip), so the ref
  // resets and a fresh completion re-announces. (The spine is byte-identical across tiers, so its key
  // never changes — but the once-per-landing contract is shared, so both surfaces guard it.)
  const announcedRef = useRef(false)
  useEffect(() => {
    if (focusSignal !== undefined && !announcedRef.current) {
      announcedRef.current = true
      focusHeading(headingRef.current)
    }
  }, [focusSignal])

  // The two-track composition — pure (insight 048), decided ONCE per view.
  const split = view.kind === 'dates' ? composeDateSplit(view.floor, view.lifestyle) : null
  const hero = split === null ? null : split.kind === 'single' ? split.track : split.lifestyle

  // THE SHARPEN ANNOUNCE (build-gate 3's second arm): focus never re-fires, so a hero claim that
  // CHANGES across the provisional→final sharpen (a different lifestyle crown; date↔no-date) would
  // be silent to AT while sighted users watch the heading swap. One polite, clear-after-announce
  // region (mounted empty — a region born populated may never speak, burned/045) reads the NEW
  // heading text — exactly what the screen shows, never a second wording.
  const liveRef = useRef<HTMLDivElement | null>(null)
  const announcerRef = useRef<Announcer | null>(null)
  useEffect(() => {
    if (liveRef.current) announcerRef.current = createAnnouncer(liveRef.current)
  }, [])
  const heroClaimKey =
    hero === null
      ? undefined
      : `${hero.kind}:${hero.kind === 'no-date-in-window' ? '' : hero.offsetYears}`
  const prevClaimKey = useRef(heroClaimKey)
  useEffect(() => {
    const prev = prevClaimKey.current
    prevClaimKey.current = heroClaimKey
    if (heroClaimKey === undefined || prev === undefined || prev === heroClaimKey) return
    if (view.kind !== 'dates' || hero === null) return
    announcerRef.current?.announce(heroLead(hero, view.windowTopYears))
  }, [heroClaimKey, hero, view])

  // The producer seam: resolve the floor-crowned fan into drawable geometry ONCE per view
  // (resolveBandData owns the fail-loud honesty guards — a malformed fan throws, never a silently-
  // wrong band). Presence is the engine's own iff (band exists ⇔ the floor crowned), so the guard
  // reads the band itself — in the mixed floor-dated/lifestyle-no-date arm the band still draws,
  // named by its track note; in the extreme inversion (floor no-date) there is no band to draw.
  const resolved = useMemo(() => {
    if (view.kind !== 'dates' || !view.band) return null
    return resolveBandData(view.band.fan, view.band.outcomeState, {
      formatDollar: formatAxisDollar,
      annotations: view.bandAnnotations,
      formatAges: view.bandAges,
    })
  }, [view])

  // The screen-reader-only band range sentence (AT parity, council 2026-06-29). Composed off the SAME
  // resolved data, so it re-renders WITH the band on the date route's provisional→final scale re-key
  // (insight 047) and quotes the same resampled tooltipRows the sighted scrub shows. null ⇒ withdrawn.
  const atRangeSentence = useMemo(() => (resolved ? composeBandAtRange(resolved) : null), [resolved])

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
  } else {
    const heroTrack = hero!
    const heroDated = heroTrack.kind !== 'no-date-in-window'
    // The no-date "how close" line — the Honesty Hawk's worded alternative to a plotted no-date
    // curve (a scared reader could crown an above-the-line dot); reads the HERO (lifestyle) curve.
    const bestRung = heroDated ? 0 : curveMarks(heroTrack).reduce((mx, m) => Math.max(mx, m.rung), 0)
    const tradeoff = heroDated ? dateTradeoffPoint(heroTrack) : null
    body = (
      <div
        className="fod-reveal"
        data-framing={heroDated ? 'date' : 'no-date'}
        data-twopane={resolved ? '' : undefined}
      >
        <div className="reveal__lead">
          {view.provisional && <p className="fod-provisional">{copy.answerProvisionalTag}</p>}
          <h2
            className={heroDated ? 'fod-headline' : 'fod-headline fod-headline--quiet'}
            tabIndex={-1}
            ref={headingRef}
          >
            {heroLead(heroTrack, view.windowTopYears)}
          </h2>
          {heroTrack.kind !== 'no-date-in-window' ? (
            <p className="fod-odds">{dateOddsText(heroTrack.grade.quantizedLowerBound)}</p>
          ) : (
            <p className="fod-note">{slots.noDateHowClose(slots.xOfTen(bestRung))}</p>
          )}
          {tradeoff && (
            <p className="fod-tradeoff">{slots.dateTradeoff(tradeoff.yearsSooner, tradeoff.oddsText)}</p>
          )}
          {heroTrack.kind === 'window-edge-unconfirmed' && (
            <p className="fod-note">{copy.dateWindowEdgeNote}</p>
          )}
          {heroTrack.nonMonotoneOffsets.length > 0 && (
            <p className="fod-note">{copy.dateNonMonotoneNote}</p>
          )}
          {/* The subordinate essentials line (split only) — always AFTER the hero claim (the R27
              inversion is disclosed, never reordered to put a sooner-looking date first). */}
          {split !== null && split.kind === 'split' && (
            <>
              <p className="fod-floor">{floorLineText(split)}</p>
              {split.inverted && <p className="fod-note">{copy.dateFloorInversionNote}</p>}
            </>
          )}
        </div>
        {resolved && (
          <div className="fod-band">
            {/* RE-DRAW-NOT-MORPH on the tiered provisional→final scale change lives INSIDE the panel
                (it re-keys its inner band, not itself — so an open enlarge modal survives). */}
            <ConfidenceBandPanel
              data={resolved}
              labels={BAND_LABELS}
              chrome={BAND_CHROME}
              atRangeSentence={atRangeSentence}
            />
            {/* In a split reading the single band is FLOOR-crowned while the hero claim reads the
                lifestyle track — name the band's own track so the two can never silently disagree. */}
            {split !== null && split.kind === 'split' && (
              <p className="fod-band__tracknote">{copy.bandFollowsFloorNote}</p>
            )}
          </div>
        )}
        {/* D2c — the odds ladder, one pull DOWN (detail-on-demand, R4: never the first frame). Reads
            the HERO track — it explains how the WORK-OPTIONAL claim's odds shift by when you stop.
            The non-monotone sentence + the window-edge note above STAY on the landed surface. A
            no-date hero plots NO ladder (the Hawk veto — the worded how-close line rides instead). */}
        {heroDated && (
          <details className="fod-ladder">
            <summary className="fod-ladder__summary">{copy.ladderDisclosure}</summary>
            <div className="fod-ladder__body">
              <OddsLadder track={heroTrack} labels={LADDER_LABELS} />
              <p className="fod-ladder__caveat">{copy.ladderPlanCaveat}</p>
            </div>
          </details>
        )}
      </div>
    )
  }

  return (
    <section className="fuck-off-date" aria-label={copy.dateRegionLabel}>
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {body}
    </section>
  )
}
