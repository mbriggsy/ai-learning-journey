/*
 * src/ui/answerView.ts — D2 state-adaptive routing (the per-household choice of LEAD surface).
 *
 * The route is already decided upstream and we re-derive NONE of it here: the work-status router
 * (`memoryModel.recompute` + `intakeMap.isDateRoute` — "is anyone still working?"), mirrored
 * defensively by the engine's §0 all-retired guard (`dateSearch.ts`), commits an `answer.kind` that
 * already encodes the route. A household with ≥ 1 person still working resolves `kind: 'date'` (the
 * fuck-off-date lead → {@link FuckOffDate}); an all-retired household resolves `kind: 'headline'`
 * (the spine confidence statement → {@link ConfidenceStatement}). This selector reads the committed
 * answer the engine crowned and shapes it for the surface — no threshold, grade, or predicate is
 * recomputed (the U7/D2 honesty contract: the drill-down can never disagree with the crowning).
 *
 * NON-ANSWER STATES. `pending` / `compute-error` route to the elevated surface's OWN calm wait /
 * retry mode, picked by `isDateRoute(draft)` so the correct surface shows it (the route is not yet in
 * the answer at that point). `idle`, the date route's `input-failure`, a `headline`'s `indeterminate`,
 * and the never-committed `cancelled` fall to `fallback` — the quiet {@link AnswerStrip}, which NAMES
 * the still-missing inputs. Post-completion the render anchor (no-missing ⟺ validateParams accepts)
 * makes `fallback` near-unreachable on the result screen; it is the honest defensive arm, not a state
 * the finished household is expected to land in.
 */
import type { MemoryModelSnapshot, SpendAnswer } from '@store/memoryModel'
import { isDateRoute } from '@intake/intakeMap'
import { workingYearFigureBesideQuote, type WorkingYearFigureBesideQuote } from '@intake/workingYearLeftOver'
import type {
  BandFan,
  DateBand,
  DateSearchOutcome,
  DateTrackOutcome,
  DollarAdjustment,
  Headline,
  SimulationResult,
  SurvivorReading,
} from '@shared/model'
import type { XAnnotation } from '@viz/bandData'
import { truncateFanAtThinCohort } from '@viz/cohort'
import {
  deriveBandAgesAt,
  deriveDateBandAnnotations,
  deriveSpineBandAnnotations,
  type BandPlanClockAnchor,
} from './bandAnnotations'
import { budgetGoverns } from '@budget/budgetModel'
import { budgetYearZeroEssentialsTotal, budgetYearZeroFullTotal } from '@budget/budgetToSpending'
// (`composeDateSplit` is deliberately NOT imported here any more — the 2026-07-30 flip removed this
//  module's last re-derivation of which track the band draws; it reads `band.track` from the engine.)

/** Which elevated lead renders, and the view it is handed. `fallback` ⇒ render the quiet AnswerStrip
 *  (defensive incomplete/hold arm — see the module note). */
export type ElevatedAnswer =
  | { readonly kind: 'date'; readonly view: FuckOffDateView }
  | { readonly kind: 'spine'; readonly view: ConfidenceStatementView }
  | { readonly kind: 'fallback' }

/**
 * Map the committed snapshot to the elevated lead surface + its view. A pure function of the snapshot
 * except for `onRetry`, which is threaded verbatim into the `compute-error` view (the surfaces own the
 * retry button; the model owns the recompute).
 *
 * THE EYEBROW (W9-R7, `docs/plans/features/answered-draft-build-spec.md` KTD6 and KTD8). Both flags
 * ride the view PRESENCE-keyed (absent when off), so every settled view is byte-identical to the
 * one before them:
 *  - `refiguring` — the store's flag (`snapshot.refiguring`): a run on inputs different from the
 *    shown answer's is in flight, so the hero says the shown answer is from before the latest change.
 *  - `provisional` (the date route only) — the shown answer is the 2,000-path PROVISIONAL tier and
 *    no re-figuring is under way, so the date renders under the provisional tag until its final
 *    lands (`docs/architecture.md`'s provisional-class rule: a provisional reading "renders only
 *    under D1's provisional string class and is never crowned as final"). On a first reveal too:
 *    Briggsy's ruling, 2026-11-19 ("Yes, tag it"). Until W9-R7 the hero was provisional-free, and
 *    the fit gate's first draft waited on this class reaching zero — a wait that could never wait
 *    (insight 070); the harnesses' settle is `data-answer-tier="final"` with `data-answer-refiguring`
 *    absent (`SETTLED_RESULT`, e2e/reviewSurface.ts). The spine is never tagged:
 *    its two tiers are byte-identical (its run ignores the tier), so its provisional IS its final.
 *  The re-figuring line outranks the tag (one slot, one line): over an answer being re-figured,
 *  "with what you've entered so far" is false.
 */
/**
 * The spine band + its household-clock annotations, SCREENED for the $0-portfolio household.
 * `resolveBandData` FAILS LOUD on an all-$0 fan — a VALID Social-Security-funded $0-portfolio
 * household (insight 044) — because there is no honest dollar scale to plot. So the band is handed on
 * ONLY when the fan carries a positive dollar somewhere; the $0-portfolio household renders its verdict
 * with NO band (nothing to plot but the $0 floor — the verdict still stands). The screen reads the RAW
 * per-year grid (does ANY year carry p90 > 0?); `resolveBandData` throws on the RESAMPLED lattice's
 * `dollarMax === 0`. The two agree for every real household: the today anchor is always positive and
 * the positive-portfolio years are contiguous, so a positive grid year is always struck by a lattice
 * sample while `horizonYears < 2·(LATTICE_POINTS − 1)` (≈ 96) — and a longevity-bounded horizon sits far
 * below that. (Were LATTICE_POINTS shrunk or the horizon cap raised past that bound, make the screen
 * read the same resampled quantity.) A malformed fan (a producer bug, never a valid household) is
 * deliberately NOT screened here — it is left to fail loud at the producer seam (back-nine-design §3).
 */
function spineBand(
  result: SimulationResult,
  draft: MemoryModelSnapshot['draft'],
  savedAnchor?: BandPlanClockAnchor,
): {
  readonly band?: BandFan
  readonly bandAnnotations?: readonly XAnnotation[]
  readonly bandAges?: (yearsFromNow: number) => string
} {
  const rawFan = result.distribution.bandFan
  if (!rawFan || rawFan.byYear.length < 2) return {}
  // The chart ends where the surviving cohort thins (cold-read 2026-07-03) — truncate FIRST so
  // the annotations, the ages closure, and the $-scale all read the DRAWN horizon. Identity is
  // preserved when nothing is cut (the helper returns the SAME array — a no-op stays a no-op).
  const cutYears = truncateFanAtThinCohort(rawFan.byYear)
  const fan = cutYears === rawFan.byYear ? rawFan : { ...rawFan, byYear: cutYears }
  const last = fan.byYear[fan.byYear.length - 1]
  if (!last || !fan.byYear.some((y) => y.p90 > 0)) return {}
  const ageA = draft.people[0].currentAge
  const ageB = draft.people[1].currentAge
  // Annotations + the readout-ages closure share the SAME currentAge guard + slot, so they appear (or
  // defensively withhold) together — the scrub readout's ages can never disagree with the axis ticks.
  const haveAges = ageA !== undefined && ageB !== undefined
  const bandAnnotations = haveAges
    ? deriveSpineBandAnnotations(ageA, ageB, last.yearsFromNow, savedAnchor, cutYears !== rawFan.byYear)
    : undefined
  const bandAges = haveAges ? deriveBandAgesAt(ageA, ageB) : undefined
  return { band: fan, bandAnnotations, bandAges }
}

/**
 * The DATE band + its household-clock annotations — the date-route analog of {@link spineBand}. The
 * engine carries the crowned candidate's projection fan bundled with its outcome-state tag in
 * `outcome.band` (present iff a date was crowned; a no-date run has none). The annotations add the
 * FUTURE "work stops" marker at the crowned offset — honest precisely because the household has not
 * stopped working yet. $0-portfolio screen mirrors the spine: `resolveBandData` fails loud on an
 * all-$0 fan, so the band is handed on ONLY when a positive dollar exists somewhere (a crowned date is
 * on-track-or-better, so this is defensive — but it keeps the producer seam honest, never a render-throw).
 */
function dateBand(
  outcome: Extract<DateSearchOutcome, { kind: 'dates' }>,
  draft: MemoryModelSnapshot['draft'],
  savedAnchor?: BandPlanClockAnchor,
): {
  readonly band?: DateBand
  readonly bandAnnotations?: readonly XAnnotation[]
  readonly bandAges?: (yearsFromNow: number) => string
  readonly spendLevels?: { readonly essentials: number; readonly full: number }
  readonly workingYearFigure?: WorkingYearFigureBesideQuote
} {
  const rawBand = outcome.band
  if (!rawBand || rawBand.fan.byYear.length < 2) return {}
  // Same dead-cohort cut as the spine band — one law, both routes (the work-stops marker sits
  // at offset ≤ 10, far inside any real cut, and the derive below reads the truncated last year).
  const cutYears = truncateFanAtThinCohort(rawBand.fan.byYear)
  const band =
    cutYears === rawBand.fan.byYear ? rawBand : { ...rawBand, fan: { ...rawBand.fan, byYear: cutYears } }
  if (band.fan.byYear.length < 2 || !band.fan.byYear.some((y) => y.p90 > 0)) return {}
  const last = band.fan.byYear[band.fan.byYear.length - 1]!
  const ageA = draft.people[0].currentAge
  const ageB = draft.people[1].currentAge
  // The work-stops marker sits at the band's OWN crowned offset — read from the band (the engine's
  // authority tag), never re-derived from a sibling track field (the "UI re-derives nothing" law). The
  // still-working member(s) retire at currentAge + offset. The readout-ages closure shares the same
  // currentAge guard + slot as the annotations, so the scrub ages and the axis ticks agree.
  const haveAges = ageA !== undefined && ageB !== undefined
  // U17 §S2.5 gave the marker its "Essentials date" name by asking `composeDateSplit(...).kind ===
  // 'split'`. ⚑ THAT DERIVATION IS WRONG AS OF THE 2026-07-30 FLIP and had to move: a both-dated
  // household is STILL `'split'`, but its band now rides the LIFESTYLE crown — so the old question
  // answered `true` and painted "Essentials date" onto a marker sitting at the lifestyle year. The
  // marker's TEXT and its POSITION are decided in different layers, and only the position had been
  // read from the engine.
  //
  // The name now reads the band's OWN published track — the same authority tag the offset one line
  // below already reads, and the same "UI re-derives nothing" law the comment above states. Note
  // this is insight 081 in its sharper form: the old code DID consume the shared producer, and was
  // still wrong, because it asked that producer a question about SPLIT-NESS when the thing it
  // needed to know was WHICH TRACK THE BAND DREW. Consuming the right producer is not enough —
  // it has to be asked the right question.
  const bandFloorKeyed = band.track === 'floor'
  const bandAnnotations = haveAges
    ? deriveDateBandAnnotations(ageA, ageB, band.offsetYears, last.yearsFromNow, savedAnchor, bandFloorKeyed, cutYears !== rawBand.fan.byYear)
    : undefined
  const bandAges = haveAges ? deriveBandAgesAt(ageA, ageB) : undefined
  // THE TWO SPENDING LEVELS — derived through the compiled-budget producers, never summed here
  // (the line-sum omits the injected OOP medical and mis-tiers; both failures are mutation-pinned
  // in budgetToSpending.test.ts). Absent without a budget: a household with one spending level has
  // no gap to name, and inventing a second figure is worse than staying quiet.
  const spendLevels = budgetGoverns(draft.budget)
    ? {
        essentials: budgetYearZeroEssentialsTotal(draft.budget, draft.health.oopMedicalAnnual),
        full: budgetYearZeroFullTotal(draft.budget, draft.health.oopMedicalAnnual),
      }
    : undefined
  // W8-R7: the figure the run counts a working year at, where it prints different from today's quote (the caption names
  // both; read from the draft through the composer's own producer, never re-derived here).
  const workingYearFigure = workingYearFigureBesideQuote(draft) ?? undefined
  return { band, bandAnnotations, bandAges, spendLevels, workingYearFigure }
}

/**
 * @param savedAnchor Result's memoized wall-time anchor (the ONE local-calendar chain — U13).
 *   A positive `yearsSincePlanBuilt` re-bases the band's x-axis endpoints (year 0 = "Plan
 *   built", wall "Today" at x = the plan clock) so an aged plan's chart shares the hero's time
 *   base — the one-screen-one-time-base law. Absent / a plan clock of 0 (every fresh session,
 *   the preview harness) derives byte-identically to the pre-U13 shape. The clock measures the
 *   BUILD, never the save (U17 §S0.2).
 */
export function selectElevatedAnswer(
  snapshot: MemoryModelSnapshot,
  onRetry: () => void,
  savedAnchor?: BandPlanClockAnchor,
): ElevatedAnswer {
  const { answer, draft } = snapshot
  const dateRoute = isDateRoute(draft)

  switch (answer.kind) {
    case 'idle':
      return { kind: 'fallback' }

    // U12 (the F9 demotion): a required fact stopped being validly present after an answer
    // had resolved — the quiet strip names what's missing (from the draft, the same
    // machinery as idle). Never the stale hero: holding a confident verdict over a draft
    // that no longer supports one is the cardinal sin this arm exists to kill.
    case 'inputs-incomplete':
      return { kind: 'fallback' }

    case 'pending':
      return dateRoute
        ? { kind: 'date', view: { kind: 'pending' } }
        : { kind: 'spine', view: { kind: 'pending' } }

    case 'compute-error':
      return dateRoute
        ? { kind: 'date', view: { kind: 'compute-error', onRetry } }
        : { kind: 'spine', view: { kind: 'compute-error', onRetry } }

    case 'date': {
      const outcome = answer.outcome
      if (outcome.kind === 'dates') {
        // U9b: BOTH tracks cross, carried verbatim (insight 045) — the surface's pure
        // composeDateSplit decides one-date vs split (the value-coincident degenerate renders the
        // single composition verbatim; the shipped v1 floor-only render presented an essentials
        // date AS the fuck-off date — the calm-but-wrong gap this threading closes). The crowned
        // FLOOR projection band + its future-marker annotations ride alongside (dateBand screens
        // the $0-portfolio case + derives the household-clock x-axis from the draft + the fan's
        // last year).
        return {
          kind: 'date',
          view: {
            kind: 'dates',
            floor: outcome.floor,
            lifestyle: outcome.lifestyle,
            windowTopYears: outcome.windowTopYears,
            // The band describes the shown answer, so its ages, spend levels and caption figure come
            // from the draft that answer was figured from (W9-R7, KTD5) — never the live one.
            ...dateBand(outcome, answer.draft, savedAnchor),
            // The eyebrow (the module note): the re-figuring line, else the provisional tag.
            ...(snapshot.refiguring
              ? { refiguring: true as const }
              : answer.tier === 'provisional'
                ? { provisional: true }
                : {}),
          },
        }
      }
      // input-failure (names what's missing) | cancelled (never committed by memoryModel) → fallback.
      return { kind: 'fallback' }
    }

    case 'headline': {
      const { headline, dollar } = answer.result
      // Indeterminate is "incomplete, not a verdict" — name what's missing rather than crown a hero
      // reading on undetermined data (calm-but-wrong is the sin). The quiet strip carries that copy.
      if (headline.outcomeState === 'indeterminate') return { kind: 'fallback' }
      // The "show me the range" band rides the worded spine reading (the engine's per-year fan, now
      // carried across the worker wire). spineBand screens the $0-portfolio household (no honest scale)
      // and derives the household-clock annotations from the draft + the fan's actual last year.
      // The "as the survivor" reading rides the same spine view (present iff the run carried a survivor
      // phase — the parent decides; SurvivorReadout mounts below the band). Carried verbatim from the
      // result, never re-derived (insight 045). Spine-only: the date route is a timing claim, not a joint verdict.
      // U9b: the essentials-floor verdict rides presence-keyed, carried verbatim (insight 045) —
      // the surface's floorRelief gate decides whether it earns the subordinate relief line (the
      // value-equal degenerate renders the single-metric statement verbatim).
      return {
        kind: 'spine',
        view: {
          kind: 'reading',
          headline,
          dollar,
          // The spend lane (its gate lives in verdictSentence.spendClauseFor). Every count reads the RAW `headline` above:
          // U12's sticky display triple left with RC21 (RC4 ruled every printed count raw).
          spend: snapshot.spend,
          ...spineBand(answer.result, answer.draft, savedAnchor), // the answered draft, as on the date route
          ...(answer.result.survivorReading ? { survivorReading: answer.result.survivorReading } : {}),
          ...(answer.result.floorReading ? { floorReading: answer.result.floorReading } : {}),
          // The re-figuring line (the module note); never the provisional tag on the spine.
          ...(snapshot.refiguring ? { refiguring: true as const } : {}),
          // The answer's input key, which the folded survivor statement's open state is keyed to (the record
          // card's seat plan, KTD2). The spine's provisional and final share it (`runKey` leaves the tier out),
          // so an opened fold survives that byte-identical step; an edit's answer carries a new one.
          inputKey: answer.inputKey,
        },
      }
    }
  }
}

/**
 * A stable key that changes only when a RESOLVED reading first appears — bumped into the surface's
 * `focusSignal` so the magic-moment heading is announced exactly once on landing. Undefined while
 * pending / error / fallback, so focus is left alone until the real answer lands (no announce on the
 * wait frame, no re-announce on an unchanged re-render).
 */
export function resolvedFocusKey(elevated: ElevatedAnswer): string | undefined {
  if (elevated.kind === 'date' && elevated.view.kind === 'dates') {
    // Keyed to the FLOOR track only (U9b build-gate 3, insight 047): a lifestyle-only sharpen must
    // never look like a fresh landing — the lifestyle claim's change reaches AT through the
    // surface's own polite live region instead.
    const track = elevated.view.floor
    const where = track.kind === 'no-date-in-window' ? 'none' : track.offsetYears
    return `date:${track.kind}:${where}`
  }
  if (elevated.kind === 'spine' && elevated.view.kind === 'reading') {
    // Keyed on the RAW reading (the only reading since RC21 deleted U12's sticky triple); the surfaces' own
    // once-per-mount announcedRef latch holds regardless (insight 047). A sentence's change reaches AT through the
    // surface's polite live region, never a focus re-fire.
    return `spine:${elevated.view.headline.outcomeState}:${elevated.view.headline.xOfTen.value}`
  }
  return undefined
}

/**
 * Where the R13 caveat's in-frame copy sits on the Result, decided once (the record card's seat plan,
 * `docs/plans/features/record-card-seat-build-spec.md`, KTD1). Result reads it once and drives every
 * consumer from it: the in-frame mount, and `main.result`'s `data-inframe-disclaimer`, behind which
 * theme.css hides the page-trailing copy. Before this they were two expressions of one condition kept
 * equal by hand, and a frame where the two disagree shows the caveat twice or not at all
 * (the R13 two-mount contract: the swap rule, app.css's until Act 6 · RC21; App's trailing mount is the kit's Caveat).
 */
export interface CaveatSeat {
  /** `'actions'`: inside the actions node, on every frame that is not computing: a resolved reading on
   *  either route, the band-less readings (the spine's $0 portfolio, the date route's no-date answer),
   *  a compute-error and the fallback strip. On a frame the hero does not seat, the node renders after
   *  the hero, where it always has: a failure frame never gains the caveat above its save slot (the
   *  plan's C2). `'none'`: while computing, when the actions row is withheld and the trailing copy stands. */
  readonly caveat: 'actions' | 'none'
  /** The hero seats the actions node in its reading column: exactly the resolved readings
   *  {@link resolvedFocusKey} keys. Every other frame renders the node after the hero. */
  readonly inLead: boolean
  /** The answer draws a band: the spine reading's fan or the crowned date's, as its producer screened it
   *  ({@link spineBand}, {@link dateBand}: absent on a $0 portfolio and on a no-date answer). Today's
   *  seat puts the caveat in the actions node with or without one; the seat variants key their col-2
   *  pane on it. It equals the hero's own drawn band on every frame Result mounts, on two premises the
   *  matrix in `resultDisclaimer.test.tsx` pins: Result always passes `onReconfirm`, so neither hero's
   *  `agedFanBlocked` withdraws an aged fan; and an indeterminate headline routes to the fallback,
   *  never to a hero. */
  readonly band: boolean
}

/**
 * @param computing Result's prop (IntakeApp derives it: `pending`, or idle with nothing missing),
 *   never re-derived from the snapshot here.
 */
export function caveatSeat(elevated: ElevatedAnswer, computing: boolean): CaveatSeat {
  return {
    caveat: computing ? 'none' : 'actions',
    inLead: resolvedFocusKey(elevated) !== undefined,
    band:
      (elevated.kind === 'spine' && elevated.view.kind === 'reading' && elevated.view.band !== undefined) ||
      (elevated.kind === 'date' && elevated.view.kind === 'dates' && elevated.view.band !== undefined),
  }
}

// ---------------------------------------------------------------------------
// The two heroes' view types (moved out of `FuckOffDate.tsx` and `ConfidenceStatement.tsx` by Act 6's RC0, unchanged)
// ---------------------------------------------------------------------------

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
      /** The shown answer is the 2,000-path provisional tier and no re-figuring is under way: the date
       *  renders under the provisional tag until its final lands (W9-R7, KTD8 — answerView's module note). */
      readonly provisional?: boolean
      /** W9-R7 (KTD6): a run on inputs different from the shown answer's is in flight, so the eyebrow
       *  slot says the shown answer is from before the latest change (the date words over a date, the
       *  verdict words over a no-date answer), the band caption adds that the change isn't in its
       *  figures yet, and the no-date lines drop their entered-so-far tail. Presence-keyed: absent when off. */
      readonly refiguring?: true
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
      /** THE TWO SPENDING LEVELS THIS HOUSEHOLD'S SPLIT COMES FROM (council 2026-07-30).
       *
       *  Why it exists: a two-date household has two dates BECAUSE it has two spend levels, and
       *  before this the surface showed the two dates, two sets of odds and a balance picture while
       *  never naming either figure — every dollar on the landing was a portfolio BALANCE. A reader
       *  could see that the answers differed and had no way to see what made them differ. (Found by
       *  Briggsy on the real surface, 2026-07-30: "I need to see what my essential spend looks like
       *  along with what my desired spend looks like.")
       *
       *  Both are FIRST-YEAR (retirement-year 0) totals in today's dollars, derived through
       *  `budgetYearZeroEssentialsTotal` / `budgetYearZeroFullTotal` — the compiled routing, never a
       *  line-sum (which omits the injected OOP medical and mis-tiers). Absent when the household
       *  never built a budget: there is no second level to name, and the copy that would quote it
       *  must not render rather than invent one. */
      readonly spendLevels?: { readonly essentials: number; readonly full: number }
      /** W8-R7 (`docs/plans/features/typed-below-walk8-form-build-spec.md`, U3): the figure the run counts a working
       *  year at, beside today's quote, where the two print differently (`workingYearFigureBesideQuote`); absent where
       *  they print alike or the run carries no W. The full-budget caption names both. */
      readonly workingYearFigure?: { readonly figure: string; readonly quote: string; readonly last: boolean }
    }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }

/** What the surface shows. `reading` covers all six engine states (it reads `outcomeState`);
 *  `pending` and `compute-error` are the NON-verdict modes (the band is simply not mounted). */
export type ConfidenceStatementView =
  | {
      readonly kind: 'reading'
      readonly headline: Headline
      readonly dollar: DollarAdjustment
      /** The spend lane (memoryModel `SpendAnswer`) — the REAL figure for the magnitude clause. It
       *  rides the sentence only through `spendClauseFor`'s gate (shown state ≡ raw state, same
       *  direction); absent ⇒ the figure-less clause. */
      readonly spend?: SpendAnswer
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
       *  labeled provisional update, never a final answer (back-nine-design intake §progressive).
       *  The result hero never sets it: the spine's two tiers are byte-identical (answerView's note). */
      readonly provisional?: boolean
      /** W9-R7 (KTD6): a run on inputs different from the shown answer's is in flight, so the eyebrow
       *  slot says the shown verdict is from before the latest change. Presence-keyed: absent when off.
       *  At the two-pane tier the line OVERLAYS the frame's top padding (confidence.css), so it never
       *  moves the verdict's one-frame fold (R5). */
      readonly refiguring?: true
      /** The U7 "as the survivor" reading — the quieter second statement. Present iff the spine run
       *  carried a survivor phase (the parent, answerView, decides); when present, SurvivorReadout
       *  mounts below the band. Spine-only: the date route renders a timing claim, not a joint verdict. */
      readonly survivorReading?: SurvivorReading
      /** The U9b essentials-floor verdict — a PARALLEL engine-tagged Headline, present iff a budget
       *  rode the run (carried VERBATIM from SimulationResult.floorReading, never re-derived —
       *  insight 045). The floorRelief gate decides whether it earns the subordinate relief line;
       *  the value-equal degenerate collapses to the single-metric statement verbatim. */
      readonly floorReading?: Headline
      /** The committed answer's input key (`ModelAnswer.inputKey`), threaded by answerView: the identity
       *  the folded survivor statement's open state is keyed to (the record card's seat plan, KTD2; see
       *  {@link foldAfterRender}). Presence-keyed: every store answer carries one; the preview harness's
       *  fixtures and the component tests' fixtures do not, and a keyless reading leaves the fold
       *  uncontrolled, as it was before the key existed. */
      readonly inputKey?: string
    }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }
