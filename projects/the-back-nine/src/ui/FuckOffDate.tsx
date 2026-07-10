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
import { focusHeading, useLiveAnnouncer } from '@intake/a11y'
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
  /** The completion actions (Result's save slot + budget door + return). Passed ONLY on a resolved
   *  two-pane answer so the grid seats them in the left reading column (result.css / fuckOffDate.css);
   *  single column keeps them flat below via `display:contents`. Omitted (preview / fallback) ⇒ none. */
  readonly actionsSlot?: ReactNode
  /** P3·U11 (the council's veto condition, 2026-07-03): TRUE for a household whose Medicare
   *  costs the engine does not yet price (post-65-only, healthcare never prices). The date
   *  claim then wears the honest-gap disclosure among its notes — on the surface, in the
   *  a11y tree. Default false (the priced domain). */
  readonly medicareUnpricedNote?: boolean
  /** P3·U13 — TRUE when any staleness clock fired at unlock: the date claim wears the
   *  standing "figured fresh under today's rules" line among its notes (the Q1 disclosure
   *  rides WITH the verdict). Default false. */
  readonly stalenessNote?: boolean
  /** P3·U13 — the wall-time anchor for the date framing (the council's date rule): the
   *  plan's own start year + how many CALENDAR years have passed since it. When present,
   *  the hero line carries the wall-time-stable calendar label ("— around 2033") and the
   *  relative "~N years out" is re-derived against TODAY (offset − elapsed, floored at the
   *  arrived arm) — a re-opened old save must never replay its save-day count as current.
   *  NEVER written back into the draft (the round-trip guard). Absent (the preview
   *  harness) ⇒ the un-anchored legacy framing. */
  readonly dateAnchor?: { readonly startCalendarYear: number; readonly elapsedPlanYears: number }
  /** U12 ultramode: TRUE while a modal sheet/panel owns focus and AT (Result threads its
   *  open-sheet states). Mirrors ConfidenceStatement's contract: the landing focus is
   *  CONSUMED without moving focus (an in-panel edit can demote → re-resolve → REMOUNT this
   *  hero behind the open aria-modal), and the sharpen announce is skipped (the panel echo
   *  is the AT feedback — background live regions still speak under aria-modal). */
  readonly sheetOpen?: boolean
}

/** The hero claim's heading text — shared by the render and the polite sharpen announce, so what
 *  is spoken is exactly what is shown. With an anchor (P3·U13): the calendar label is the
 *  wall-time-STABLE claim (startCalendarYear + offset — byte-identical however old the save)
 *  and the relative count re-derives from today (offset − elapsed). The engine's own offset
 *  is NEVER mutated — this is presentation arithmetic only. */
export function heroLead(
  hero: DateTrackOutcome,
  windowTopYears: number,
  anchor?: { readonly startCalendarYear: number; readonly elapsedPlanYears: number },
): string {
  if (hero.kind === 'no-date-in-window') return slots.noDateInWindow(windowTopYears)
  if (hero.offsetYears === 0) return copy.dateFreeToday
  if (anchor === undefined) return slots.dateInYears(hero.offsetYears)
  const calendarYear = anchor.startCalendarYear + hero.offsetYears
  const yearsFromToday = hero.offsetYears - anchor.elapsedPlanYears
  // The arrived arm: wall time caught up to (or passed) the saved date — state the plan's
  // own calendar, never a fresh "stop now" verdict (the recompute's word carries that).
  if (yearsFromToday <= 0) return slots.dateInYearsPast(calendarYear)
  return slots.dateInYearsAnchored(yearsFromToday, calendarYear)
}

/** The subordinate essentials line (split only) — the floor's claim in its own register.
 *  Anchored EXACTLY like `heroLead` (ultramode 2026-07-09): both lines share one screen, so
 *  an aged vault must never show a wall-time-corrected hero beside a floor replaying its
 *  save-day count — two time bases can even invert the true floor<lifestyle ordering.
 *  Exported for the anchor battery (the heroLead precedent). */
export function floorLineText(
  split: Extract<DateSplitView, { kind: 'split' }>,
  windowTopYears: number,
  anchor?: { readonly startCalendarYear: number; readonly elapsedPlanYears: number },
): string {
  const fl = split.floor
  if (fl.kind === 'not-within-window') {
    // Lifestyle no-date too ⇒ the quiet severity disclosure ("either" — the hero line above
    // already names the window); lifestyle dated ⇒ the extreme-inversion statement of fact
    // (the inversion note carries the why). Both name their own years (audit 2026-07-03).
    return split.lifestyle.kind === 'no-date-in-window'
      ? slots.dateFloorNotWithinEither(windowTopYears)
      : slots.dateFloorNotWithin(windowTopYears)
  }
  const odds = dateOddsText(fl.quantizedLowerBound)
  // Offset 0 mirrors heroLead's free-today precedence: "covered from today" holds under any
  // anchor (covered from the plan's own start ⇒ still covered now — no arithmetic to do).
  if (anchor === undefined || fl.offsetYears === 0) {
    return slots.dateFloorCovered(fl.offsetYears, odds, fl.unconfirmed)
  }
  const calendarYear = anchor.startCalendarYear + fl.offsetYears
  const yearsFromToday = fl.offsetYears - anchor.elapsedPlanYears
  if (yearsFromToday <= 0) return slots.dateFloorCoveredPast(calendarYear, odds, fl.unconfirmed)
  return slots.dateFloorCoveredAnchored(yearsFromToday, calendarYear, odds, fl.unconfirmed)
}

export function FuckOffDate({ view, focusSignal, actionsSlot, medicareUnpricedNote = false, stalenessNote = false, dateAnchor, sheetOpen = false }: FuckOffDateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Announce on the FIRST landing only (the undefined→defined edge). The date route is TIERED: the
  // provisional→final sharpen can crown a DIFFERENT offset, which flips focusSignal — but re-firing
  // focusHeading then would yank focus back to the heading + scroll, stealing it from a user who
  // tabbed into the range. Fire once per mount; Review unmounts the surface (phase flip), so the ref
  // resets and a fresh completion re-announces. (The spine is byte-identical across tiers, so its key
  // never changes — but the once-per-landing contract is shared, so both surfaces guard it.)
  // Behind an open sheet the landing is CONSUMED without moving focus (the sheetOpen prop doc).
  const announcedRef = useRef(false)
  useEffect(() => {
    if (focusSignal !== undefined && !announcedRef.current) {
      announcedRef.current = true
      if (!sheetOpen) focusHeading(headingRef.current)
    }
  }, [focusSignal, sheetOpen])

  // The two-track composition — pure (insight 048), decided ONCE per view.
  const split = view.kind === 'dates' ? composeDateSplit(view.floor, view.lifestyle) : null
  const hero = split === null ? null : split.kind === 'single' ? split.track : split.lifestyle

  // THE SHARPEN ANNOUNCE (build-gate 3's second arm): focus never re-fires, so a hero claim that
  // CHANGES across the provisional→final sharpen (a different lifestyle crown; date↔no-date) would
  // be silent to AT while sighted users watch the heading swap. One polite, clear-after-announce
  // region (mounted empty — a region born populated may never speak, burned/045) reads the NEW
  // heading text — exactly what the screen shows, never a second wording.
  const announcer = useLiveAnnouncer()
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
    // Behind an open sheet the panel echo is the AT feedback for the edit (aria-modal does
    // not silence background live regions) — the key bookkeeping above still runs.
    if (!sheetOpen) announcer.announce(heroLead(hero, view.windowTopYears, dateAnchor))
  }, [heroClaimKey, hero, view, announcer, sheetOpen, dateAnchor])

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
  // The anchor re-bases "about N years out" to WALL time on an aged vault (one time base per screen).
  const atRangeSentence = useMemo(
    () => (resolved ? composeBandAtRange(resolved, dateAnchor) : null),
    [resolved, dateAnchor],
  )

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
            {heroLead(heroTrack, view.windowTopYears, dateAnchor)}
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
              <p className="fod-floor">{floorLineText(split, view.windowTopYears, dateAnchor)}</p>
              {split.inverted && <p className="fod-note">{copy.dateFloorInversionNote}</p>}
            </>
          )}
          {/* P3·U11 — the unpriced-Medicare disclosure (the council's veto condition): the
              post-65-only household's date claim wears the honest gap in its own notes row. */}
          {medicareUnpricedNote && <p className="fod-note">{copy.verdictMedicareUnpriced}</p>}
          {/* P3·U13 — the standing staleness echo (Q1): the per-clock disclosure rendered at
              the re-entry gate; this line keeps the fact visible WITH the date claim. */}
          {stalenessNote && <p className="fod-note cs-staleness-note">{copy.stalenessHeroNote}</p>}
        </div>
        {/* BOTH GRAPHS share one wrapper: display:contents in single column (the phone DOM renders
            byte-identically) and the right-pane grid cell on two-pane — so the LEFT column's rows
            never inherit the graphs' height (the actions weld under the words, no dead gap). */}
        <div className="fod-graphs">
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
          {/* D2c — the odds ladder, ALWAYS ON DISPLAY with the fan (N=1 cold-read 2026-07-03
              superseding the council's one-pull-down: "if it's that important, why isn't it on
              display with the fan-out?"). Reads the HERO track — it explains how the WORK-OPTIONAL
              claim's odds shift by when you stop. The non-monotone sentence + the window-edge note
              above STAY on the landed surface. A no-date hero plots NO ladder (the Hawk veto — the
              worded how-close line rides instead). */}
          {heroDated && (
            <section className="fod-ladder" aria-label={copy.ladderDisclosure}>
              <p className="fod-ladder__title" aria-hidden="true">
                {copy.ladderDisclosure}
              </p>
              <OddsLadder track={heroTrack} labels={LADDER_LABELS} />
              <p className="fod-ladder__caveat">{copy.ladderPlanCaveat}</p>
            </section>
          )}
        </div>
        {/* The completion actions, seated in the left reading column on two-pane (display:contents in
            single column keeps them flat below — see fuckOffDate.css). Absent in the preview harness. */}
        {actionsSlot != null && <div className="reveal__actions">{actionsSlot}</div>}
      </div>
    )
  }

  return (
    <section className="fuck-off-date" aria-label={copy.dateRegionLabel}>
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {body}
    </section>
  )
}
