/*
 * src/ui/recommendationView.ts — U16 §S3a: the recommend-second beat's STATES layer (the pure
 * view-model the render consumes).
 *
 * A DOWNSTREAM RENDERER (insight 020): this maps the store's structured `SolveAnswer` — the committed
 * payload's PRE-COMPUTED flags (`noChange`, `surplusRegime`, the grade + its `subTenthCollapse`, the
 * named driver, `skewDisclosure`, `withheldConversionLevers`) — to a fully copy-RESOLVED view, and
 * RE-DERIVES NONE of it (the held-out A-decides / B-displays split is this surface's CRN; every wall
 * below is a corollary). It handles EVERY payload shape (active rec / surplus / no-change / withheld
 * (token + conversion) / refused / mint-failed / demotion / aborted / the §S1 stale demotion / compute
 * error) — a payload shape without a render is a broken state.
 *
 * FOUR walls this layer enforces (encoded as tests, not conventions):
 *  · Q6 — the DISPLAYED figure is source-checked against what RANKED before any figure is built:
 *    `assertObjectiveMatchesHeadline` runs on the render path; a payload whose seed-B headline disagrees
 *    with the objective on its own distribution routes to a CALM unavailable, never a lying figure. The
 *    seed-A selection score is NEVER read here (it never crosses into a displayed figure — burned/070).
 *  · Q1 — the SURVIVAL context is SOURCE-BOUND to the spine's rendered confidence object BY REFERENCE:
 *    the second beat REUSES it, it NEVER authors a parallel survival claim (no string to desync — the
 *    U11 six-holes class killed at the root). The delta-as-hero is a DELTA (defensible where the level
 *    is not: both arms share the CRN draw, so regime error is common-mode and cancels).
 *  · Q7 — the baseline is NAMED (a static nameplate), never a rendered A↔B residual number (wall #3).
 *  · Q5 — a withheld reason renders TRUE + humane, never a bare "unavailable"; an unclassified reason
 *    fails CLOSED with the generic hold string (wall #6).
 *
 * PURE: strings from copy.ts, figures pre-formatted by money.ts — no clock, no state, no re-derivation.
 */
import type { DrawdownPolicy, RecommendationGoal } from '@shared/model'
import type { PricedState } from '@engine/constants/stateTax'
import type { WithheldReason } from '@engine/validation/oracleToken'
import type { SolveRecommendation } from '@engine/solver/solve'
import type { SolvePayload, SolveTokenWithheld } from '@engine/solver/solveEntry'
import { assertObjectiveMatchesHeadline } from '@engine/solver/objectiveHeadline'
import type { SolveAnswer, SolvePreconditionGap } from '@store/memoryModel'
import { twoFuturesCeiling } from '@viz/TwoFutures'
import type { RecommendationVizLabels } from '@viz/RecommendationViz'
import type { ConfidenceStatementView } from './ConfidenceStatement'
import type { GradeSignalState } from './GradeSignal'
import { copy, slots, type CopyKey } from './copy'
import { formatAbsoluteDollar, formatAxisDollar, formatBracketPercent, formatDeltaDollar } from './money'

// ---- the disclosures adjacent to the delta (§S3 "its nets" — R7 on the recommendation surface) ----

/** The closed vocabulary of disclosures the delta rides beside. A DEDICATED registry (not the
 *  draft-keyed `DRAFT_DISPOSITIONS`): `heirBracket` / `ssClaimAgeHeldFixed` are DERIVED solve
 *  parameters, not persisted `ScenarioDraft` fields, so they cannot ride the compile gate that keys on
 *  `keyof ScenarioDraft` — this union is the recommendation surface's OWN compile-enforced completeness
 *  seat set (a new id fails tsc in the builder Record below until its humane string is authored). */
export type RecommendationDisclosureId = 'ss-claim-fixed' | 'niit' | 'state-tax' | 'heir-bracket' | 'aca-slcsp'

export interface RecommendationDisclosure {
  readonly id: RecommendationDisclosureId
  /** The humane, hedge-bearing disclosure text (already copy-resolved). */
  readonly text: string
  /** The R7 DISPOSITION metadata (NOT a rendered control): `r7-editable` names a seat whose editable
   *  home exists (heir-bracket); `disclosure` is a held-fixed / by-reference note. U16 renders BOTH as
   *  read-only notes — no inert editing affordance ships (wall #5); the heir-bracket inline editor lands
   *  with its persisted field (deferred — see the build deviations). */
  readonly disposition: 'r7-editable' | 'disclosure'
}

/** Compile-enforced completeness: EVERY disclosure id maps to a builder that returns its resolved
 *  disclosure or `null` when it does not apply to this payload. A new id fails `tsc` here until its
 *  builder (and its copy) is authored — the R7 "every assumption visible or accounted for" spirit, on
 *  the surface's own closed vocabulary. Pure; strings from copy.ts, the heir-bracket percent pre-formatted. */
const DISCLOSURE_BUILDERS: Record<
  RecommendationDisclosureId,
  (p: SolveRecommendation) => RecommendationDisclosure | null
> = {
  // Always: the Social Security claim ages are held FIXED (not optimized in the comparison).
  'ss-claim-fixed': () => ({ id: 'ss-claim-fixed', text: copy.recDiscSsClaimFixed, disposition: 'disclosure' }),
  // Always: the delta's federal-tax scope (the 3.8% NIIT surtax caveat).
  niit: () => ({ id: 'niit', text: copy.recDiscNiit, disposition: 'disclosure' }),
  // Always: state tax is priced only for the roster states — outside them the delta is federal-only.
  'state-tax': () => ({ id: 'state-tax', text: copy.recDiscStateTax, disposition: 'disclosure' }),
  // leave-more ONLY (mutant b): the assumed heir bracket the after-tax bequest is computed at. An
  // r7-editable SEAT (its editable home is the assumptions surface); the note names the assumed bracket.
  'heir-bracket': (p) =>
    p.goal === 'leave-more' && p.heirBracket !== undefined
      ? { id: 'heir-bracket', text: slots.recDiscHeirBracket(formatBracketPercent(p.heirBracket)), disposition: 'r7-editable' }
      : null,
  // Only when the delta LEANS ON ACA (the named-driver signal): the SLCSP/CSR caveat, by reference.
  'aca-slcsp': (p) =>
    p.namedDriver === 'aca-enhanced-subsidies'
      ? { id: 'aca-slcsp', text: copy.recDiscAcaSlcsp, disposition: 'disclosure' }
      : null,
}

/** The render order (top→bottom beside the delta). Pinned complete against `DISCLOSURE_BUILDERS` by a
 *  test (a new id must be ordered too). */
export const DISCLOSURE_ORDER: readonly RecommendationDisclosureId[] = [
  'ss-claim-fixed',
  'niit',
  'state-tax',
  'heir-bracket',
  'aca-slcsp',
]

/** The applicable disclosures for a committed recommendation, in render order. Pure. */
export function disclosuresFor(payload: SolveRecommendation): readonly RecommendationDisclosure[] {
  return DISCLOSURE_ORDER.map((id) => DISCLOSURE_BUILDERS[id](payload)).filter(
    (d): d is RecommendationDisclosure => d !== null,
  )
}

// ---- the grade lockup (Q1: grade word + delta figure + shape note + coin-flip hinge) --------------

export interface RecommendationGradeView {
  /** The humane grade WORD ("A confident lean" / "A close call") — `undefined` when the grade could
   *  not be computed (a one-arm set, or the B-floor unmet); the caveat then rides `ungradedNote`. */
  readonly word: string | undefined
  /** The non-color GRADE SIGNAL state (the {@link GradeSignal} glyph pick) — `confident` / `coin-flip`
   *  from the grade id, `ungraded` when the grade is undefined. The surface reads THIS, never re-deriving
   *  the glyph from the humane word (word + distinct shape + aria — never color alone). */
  readonly signalState: GradeSignalState
  /** The lockup's hero line: the delta-as-hero comparative (active) OR the no-dollar compose
   *  reassurance (no-change/surplus). ONE line, never both. */
  readonly heroLine: string
  /** The formatted delta MAGNITUDE (tabular-nums face at render) — active mode only; the compose
   *  state carries NO figure (never a fabricated dollar hero). */
  readonly deltaFigure: string | undefined
  /** The ShapeDisclosure note (the grade's LEVEL rides still-directional methodology substrate) —
   *  present iff `directionalLevel`. Dormant today (no methodology-substrate directional entry is live);
   *  the seam is wired so it lights the day one lands. */
  readonly shapeNote: string | undefined
  /** The coin-flip HINGE — names WHAT the near-tie hinges on from the payload's named driver (the
   *  sampling-noise sentinel renders the sampling-framed hinge, never a fabricated cause). `undefined`
   *  for a `just-do-it` grade. */
  readonly hingeNote: string | undefined
  /** The calm caveat when the grade could not be computed (paired with `word === undefined`). */
  readonly ungradedNote: string | undefined
}

/** The two-arm comparison viz props (a pair of terminal seed-B magnitudes + resolved string-free
 *  labels) — shared by the PRIMARY delta viz (winner vs today's plan) and the S4 RUNNER-UP viz
 *  (winner vs runner-up). Both feed the SAME RecommendationViz grammar; only the arms + labels differ. */
export interface RecommendationVizProps {
  readonly withoutMagnitude: number
  readonly withMagnitude: number
  readonly labels: RecommendationVizLabels
}

/** The committed RECOMMENDATION view — active / surplus / no-change share ONE lockup shape, mode-keyed. */
export interface RecommendedView {
  readonly kind: 'recommended'
  /** `active` = a delta hero shows; `no-change` = the compose reassurance (`noChange` OR the grade's
   *  `subTenthCollapse` — a HOT path, oracle cases i/v — OR a seed-B display inversion where the
   *  A-crowned winner shows BEHIND the no-action baseline OR the goal-dollar delta collapses to a
   *  formatted $0: a fabricated positive "keeps ~$X more" (or a "$0 more" hero) is calm-but-wrong, so
   *  the render routes to the no-dollar register, winner and baseline being display-indistinguishable). */
  readonly mode: 'active' | 'no-change'
  /** The over-funded pivot flag (A and B agree over the ε) — carried for the surface's framing; the
   *  survival context (source-bound below) already carries the honest over-funded reading. */
  readonly surplusRegime: boolean
  /** The chosen goal (the render vocabulary key; never re-decided here). */
  readonly goal: RecommendationGoal
  /** The winning strategy's plain-language label key (the `leverPolicy*` copy the sequencing sheet
   *  already ships — never a re-typed strategy name). */
  readonly winnerStrategyKey: CopyKey
  readonly grade: RecommendationGradeView
  /** The survival context, SOURCE-BOUND to the spine's rendered confidence object BY REFERENCE (Q1) —
   *  never authored here. `undefined` on a route with no rendered confidence object (the delta hero +
   *  grade stand alone; still no fabricated survival claim). */
  readonly survivalContext: ConfidenceStatementView | undefined
  /** The baseline nameplate (Q7) — a STATIC label, NO number. */
  readonly baselineNameplate: string
  /** The retained runner-up, one tap down (R23 — retained + reachable; stripping it fails the suite).
   *  `why` is the hedged "why this beat it" TEXT (always); `viz` is the S4 comparative-depth two-arm
   *  richness (winner vs runner-up) — present iff active mode AND the winner DISPLAYS ahead at seed-B
   *  (an A-decides/B-displays inversion drops the picture, never a chart contradicting the ranking).
   *  `undefined` only for a one-arm rankable set (never in a live solve). */
  readonly runnerUp: { readonly why: string; readonly viz: RecommendationVizProps | undefined } | undefined
  /** The §S2 leave-more skew disclosure (QUOTES the median as the typical bequest) — present iff the
   *  skew is disclosure-worthy (upside AND the humane-rounded median differs from the mean shown). */
  readonly skew: { readonly medianQuote: string } | undefined
  /** The conversion-only WITHHELD hold (Q5) — the sequencing rec ships, conversions named-held with
   *  their true reason(s) + the coupling caveat. Present iff any lever is withheld (dormant today: the
   *  Medicare trend is sourced, so the whole roster ranks — but the render is built for the day it isn't). */
  readonly withheldConversion: { readonly reasons: readonly string[]; readonly coupling: string } | undefined
  /** The disclosures adjacent to the delta (§S3 nets): NIIT + state-tax scope, the SS-claim-held-fixed
   *  note, the leave-more heir bracket (r7-editable seat), the ACA SLCSP caveat by reference when the
   *  delta leans on ACA. Compile-enforced complete over `RecommendationDisclosureId`. */
  readonly disclosures: readonly RecommendationDisclosure[]
  /** The two-arm comparison viz props (winner vs no-action baseline terminal magnitudes + resolved,
   *  pre-formatted string-free labels). `undefined` in NO-CHANGE mode (which now includes a seed-B
   *  display inversion) — the compose reassurance stands alone, never a fabricated two-bar delta of
   *  ~$0 and never a winner-ahead bar the ranking would contradict. */
  readonly viz: RecommendationVizProps | undefined
}

/** The full recommend-second view — every SolveAnswer shape resolved to humane copy + structured flags. */
export type RecommendationView =
  // The ENTRY surfaces (S2 owns their render): named here so the surface has ONE state authority.
  | { readonly kind: 'idle' }
  | { readonly kind: 'blocked'; readonly gap: SolvePreconditionGap }
  | { readonly kind: 'pending' }
  // §S1 invalidation — a fingerprint-changing draft edit demoted a committed rec. Calm status; re-solve
  // INVITED (never auto-re-solved). F-B: ONE coherent card — a `heading` + a `body` (the answer above is
  // current, only the strategy read went stale; TRUE whether the predecessor was held or recommended);
  // the re-open CONTROL is rendered INSIDE the card by the surface (its label pulled at the render).
  | { readonly kind: 'stale'; readonly heading: string; readonly body: string }
  // No honest recommendation could be produced (a refusal / mint-failure / demotion-withhold / compute
  // error / aborted) — ONE calm retry line. `detail` is the MACHINE reason (logging only, never rendered).
  | { readonly kind: 'unavailable'; readonly note: string; readonly detail: string }
  // The honesty-gate HOLD (Q5): the token was WITHHELD (a state certification pending / stale ACA /
  // uncalibrated constant / an un-pinned primary). The REAL reason(s) named, calm-competent, as TEXT.
  | { readonly kind: 'held'; readonly heading: string; readonly reasons: readonly string[] }
  | RecommendedView

// ---- the maps (compile-enforced Records — a new goal / policy / reason fails tsc here) -------------

/** The winning strategy → its plain-language `leverPolicy*` label key. `Record<DrawdownPolicy, …>` is
 *  EXHAUSTIVE: a policy added to the union fails tsc HERE, never silently renders an unnamed strategy. */
const WINNER_STRATEGY_KEY: Record<DrawdownPolicy, CopyKey> = {
  proportional: 'leverPolicyProportional',
  'taxable-first': 'leverPolicyTaxableFirst',
  'pre-tax-first': 'leverPolicyPreTaxFirst',
  'bracket-fill': 'leverPolicyBracketFill',
  custom: 'leverPolicyCustom',
}

/** A priced state → its full-name copy key (the existing `stateOption*` labels — never a re-typed name). */
const STATE_NAME_KEY: Record<PricedState, CopyKey> = {
  NC: 'stateOptionNC',
  PA: 'stateOptionPA',
  FL: 'stateOptionFL',
}

/** The grade WORD keys, keyed by the engine's INTERNAL grade id (which never renders — the id maps to
 *  the humane word HERE). `Record<Grade, …>` would import the heavy gradeCalibration; the two-member map
 *  is inlined instead, guarded by the exhaustive `gradeWord` switch below. */

// ---- withheld-reason → humane TEXT (Q5) -----------------------------------------------------------

/**
 * One humane string per {@link WithheldReason} arm — the TRUE reason, named (state / direction / ~August
 * / refusing-to-guess), never a bare "unavailable". An UNCLASSIFIED reason FAILS CLOSED with the generic
 * hold string (wall #6): the render degrades gracefully rather than blank/crash. (The engine's oracleToken
 * shape test forces every classified arm to be handled upstream; this default is the runtime safety net.)
 */
export function withheldReasonText(reason: WithheldReason): string {
  switch (reason.kind) {
    case 'state-certification-pending':
      return slots.recHoldStateCert(copy[STATE_NAME_KEY[reason.state]])
    case 'medicare-trend-unsourced':
      return copy.recHoldTrend
    case 'aca-unverified':
      return copy.recHoldAcaUnverified
    case 'rec-relevant-primary-directional':
      return copy.recHoldPrimaryDirectional
    case 'epsilon-uncalibrated':
      return copy.recHoldEpsilon
    default:
      // Fail CLOSED, humane (Q5): a reason shape this render doesn't recognize shows the generic hold —
      // never a blank, never a bare "unavailable", never a crash in the render path.
      return copy.recHoldGeneric
  }
}

// ---- the entry ------------------------------------------------------------------------------------

export interface RecommendationViewOpts {
  /** The spine's rendered confidence object (Q1 source-bind) — REUSED by reference for the survival
   *  context; never re-derived, never a second survival claim. Absent on a route with no confidence
   *  reading (the date route). */
  readonly spineConfidence?: ConfidenceStatementView
}

/** Map the store's solve channel to the recommend-second view. Pure; every string resolved. */
export function recommendationView(solve: SolveAnswer, opts?: RecommendationViewOpts): RecommendationView {
  switch (solve.kind) {
    case 'idle':
      return { kind: 'idle' }
    case 'blocked':
      return { kind: 'blocked', gap: solve.gap }
    case 'pending':
      return { kind: 'pending' }
    case 'stale':
      return { kind: 'stale', heading: copy.recommendStaleHeading, body: copy.recommendStaleBody }
    case 'compute-error':
      return { kind: 'unavailable', note: copy.recommendUnavailable, detail: solve.reason }
    case 'committed':
      return committedView(solve.payload, opts)
  }
}

/** Dispatch the committed payload — every SolvePayload shape gets a render. */
function committedView(payload: SolvePayload, opts: RecommendationViewOpts | undefined): RecommendationView {
  switch (payload.kind) {
    case 'recommended': {
      // Q6 — the render path calls the objective≡headline guard BEFORE building any figure: a payload
      // whose displayed statistic disagrees with what ranked (a seed-A leak, a wrong-goal figure) routes
      // to a CALM unavailable, never a lying figure (burned/070). We CATCH + degrade — a render must
      // never throw a lockup at the user, and a defect must never surface AS a confident number.
      try {
        assertObjectiveMatchesHeadline(payload)
      } catch (e) {
        return { kind: 'unavailable', note: copy.recommendUnavailable, detail: `objective-headline: ${(e as Error).message}` }
      }
      return recommendedView(payload, opts)
    }
    case 'token-withheld':
      return heldView(payload)
    case 'withheld':
      // The demotion-axis fail-closed withhold (unreachable in a live sequencing-only solve) — calm.
      return { kind: 'unavailable', note: copy.recommendUnavailable, detail: `${payload.reason}: ${payload.detail}` }
    case 'refused':
      return { kind: 'unavailable', note: copy.recommendUnavailable, detail: `${payload.reason}: ${payload.detail}` }
    case 'mint-failed':
      return { kind: 'unavailable', note: copy.recommendUnavailable, detail: `${payload.stage}: ${payload.detail}` }
    case 'aborted':
      // A superseded solve (the store holds the aborted bin, never commits it) — defensive calm arm.
      return { kind: 'unavailable', note: copy.recommendUnavailable, detail: payload.detail }
  }
}

/** The honesty-gate HOLD (Q5) — the token was withheld; name every true reason as TEXT. */
function heldView(payload: SolveTokenWithheld): RecommendationView {
  return {
    kind: 'held',
    heading: copy.recommendHeldHeading,
    reasons: payload.reasons.map(withheldReasonText),
  }
}

/** The committed RECOMMENDATION (active / surplus / no-change). */
function recommendedView(payload: SolveRecommendation, opts: RecommendationViewOpts | undefined): RecommendedView {
  const goal = payload.goal
  // no-change routes BOTH sources (plan R25): the winner IS the prior, OR the survival advantage rounds
  // below one display tenth (the grade's subTenthCollapse). Either way the compose reassurance shows.
  const isNoChange = payload.noChange || (payload.grade?.subTenthCollapse ?? false)

  // The A-decides / B-displays INVERSION (wall #1's render corollary — the same gate runnerUpVizFor
  // enforces for winner-vs-runner-up, here for winner-vs-baseline): the seed-A-crowned winner can
  // DISPLAY behind the no-action baseline at seed-B on a near-tie (deltaReal's sign contradicts the goal
  // direction — leave-more wants winnerB ≥ baselineB, pay-less-tax the reverse). formatDeltaDollar strips
  // the sign, so a NEGATIVE advantage would render as a fabricated POSITIVE "keeps ~$X more", a
  // winner-ahead bar, and a positive aria — calm-but-wrong wearing the delta's face. On inversion route
  // to the honest no-dollar register (winner and baseline display-indistinguishable; never a fabricated
  // dollar, never a fabricated cause).
  const winnerDisplaysAhead =
    goal === 'leave-more'
      ? payload.winner.headlineStatisticB >= payload.noActionBaseline.headlineStatisticB
      : payload.winner.headlineStatisticB <= payload.noActionBaseline.headlineStatisticB

  // The DELTA-as-hero (active only) — the goal-dollar DELTA, oriented by goal (the WORD carries
  // direction, so the magnitude reads sign-free). Both arms share the CRN draw, so the delta cancels
  // common-mode regime error (the fiduciary's grounding) — defensible where an absolute level is not.
  // Computed BEFORE the no-dollar decision so the zero-collapse guard can read the ACTUAL hero figure.
  const deltaReal =
    goal === 'leave-more'
      ? payload.winner.headlineStatisticB - payload.noActionBaseline.headlineStatisticB
      : payload.noActionBaseline.headlineStatisticB - payload.winner.headlineStatisticB

  // The ZERO-COLLAPSE sibling of the inversion (wall #1's second hole): a winner that DISPLAYS ahead
  // with a real survival edge can still carry a seed-B goal-dollar delta under formatDeltaDollar's
  // smallest step — the formatter has NO zero-floor, so it returns '0' and the hero would render
  // "…about $0 more", an absurd active claim (calm-but-wrong wearing the delta's face). Source-bound
  // predicate: test the ACTUAL formatted figure the hero would show, never a re-typed rounding threshold.
  const deltaCollapsesToZero = formatDeltaDollar(deltaReal) === '0'

  // The no-DOLLAR compose register: a true no-change OR a seed-B display inversion OR a delta that
  // formats to zero. All show the "already on one of the strongest paths we tested" reassurance — never
  // a fabricated positive dollar (a fabricated positive, a $0 hero, and a winner-ahead bar the ranking
  // would contradict are all calm-but-wrong).
  const noDollar = isNoChange || !winnerDisplaysAhead || deltaCollapsesToZero

  const deltaFigure = noDollar ? undefined : formatDeltaDollar(deltaReal)

  const heroLine = noDollar
    ? copy.recComposeAlready
    : goal === 'leave-more'
      ? slots.recDeltaLeaveMore(deltaFigure!)
      : slots.recDeltaPayLessTax(deltaFigure!)

  // The ShapeDisclosure note — the grade's LEVEL rides still-directional methodology substrate.
  // `directionalLevel` IS composeShapeDisclosure's own predicate (non-empty), inlined to keep the render
  // path free of the simulate-heavy gradeCalibration import. SEAM (ii): source-bound to the payload's
  // OWN `disclosedDirectional` (the token's `mintedOver.disclosedDirectional`, copied on in solve.ts) —
  // the figure and its disclosure land TOGETHER (the hawk phasing law), never from an empty default.
  const directionalLevel = payload.disclosedDirectional.length > 0

  const grade: RecommendationGradeView = {
    word: gradeWord(payload.grade?.grade),
    signalState: gradeSignalState(payload.grade?.grade),
    heroLine,
    deltaFigure,
    shapeNote: directionalLevel ? copy.recGradeNoteShape : undefined,
    hingeNote: payload.grade?.grade === 'coin-flip' ? hingeNote(payload.namedDriver) : undefined,
    ungradedNote: payload.grade === undefined ? copy.recGradeNoteUngraded : undefined,
  }

  return {
    kind: 'recommended',
    mode: noDollar ? 'no-change' : 'active',
    surplusRegime: payload.surplusRegime,
    goal,
    winnerStrategyKey: WINNER_STRATEGY_KEY[payload.winner.policy],
    grade,
    survivalContext: opts?.spineConfidence,
    baselineNameplate: copy.recommendBaselineNameplate,
    runnerUp:
      payload.runnerUp !== undefined
        ? { why: copy.recRunnerUpWhy, viz: runnerUpVizFor(payload, noDollar) }
        : undefined,
    skew: skewQuote(payload),
    withheldConversion: withheldConversionView(payload),
    disclosures: disclosuresFor(payload),
    // The two-arm comparison viz — ACTIVE mode only (no-change AND the seed-B display inversion show no
    // fabricated delta bars; the inversion would otherwise paint the winner AHEAD, contradicting the
    // ranking). The winner/baseline seed-B headline magnitudes + pre-formatted string-free labels; the
    // aria sentence carries BOTH magnitudes AND the delta (A2 AT-parity). The ceiling is source-bound to
    // TwoFutures' humane ladder, so the bar geometry and the axis-max label can never disagree.
    viz: noDollar
      ? undefined
      : (() => {
          const winM = payload.winner.headlineStatisticB
          const baseM = payload.noActionBaseline.headlineStatisticB
          const ceiling = twoFuturesCeiling(Math.max(winM, baseM, 0))
          const labels: RecommendationVizLabels = {
            withLabel: copy.recVizWithLabel,
            withoutLabel: copy.recVizWithoutLabel,
            deltaLabel: `$${deltaFigure!}`,
            floorLabel: formatAxisDollar(0),
            axisMaxLabel: `~${formatAxisDollar(ceiling)}`,
            // The ENDPOINTS are portfolio-scale ABSOLUTES → the humane $X.XM prose dialect
            // (formatAbsoluteDollar); the DELTA between them stays grouped digits (deltaFigure), a smaller
            // difference that reads naturally grouped — the spine's dialect for the lockup's absolutes.
            ariaSummary: slots.recVizAria(
              copy.recVizWithoutLabel,
              formatAbsoluteDollar(baseM),
              copy.recVizWithLabel,
              formatAbsoluteDollar(winM),
              deltaFigure!,
            ),
          }
          return { withoutMagnitude: baseM, withMagnitude: winM, labels }
        })(),
  }
}

/** The engine's INTERNAL grade id → the humane grade word. `undefined` grade ⇒ no word (the caveat
 *  rides `ungradedNote`). Exhaustive over the two ids — a new grade fails tsc here. */
function gradeWord(grade: 'just-do-it' | 'coin-flip' | undefined): string | undefined {
  switch (grade) {
    case undefined:
      return undefined
    case 'just-do-it':
      return copy.recommendGradeConfident
    case 'coin-flip':
      return copy.recommendGradeCoinFlip
    default: {
      const _exhaustive: never = grade
      throw new Error(`[recommendationView] unknown grade ${String(_exhaustive)} — declare its humane word`)
    }
  }
}

/** The engine's INTERNAL grade id → the non-color signal-glyph pick. Exhaustive over the two ids + the
 *  undefined (ungraded) case — a new grade fails tsc here. Keeps the glyph choice source-bound to the
 *  grade FLAG, never re-derived from the humane word (which the render must never parse). */
function gradeSignalState(grade: 'just-do-it' | 'coin-flip' | undefined): GradeSignalState {
  switch (grade) {
    case undefined:
      return 'ungraded'
    case 'just-do-it':
      return 'confident'
    case 'coin-flip':
      return 'coin-flip'
    default: {
      const _exhaustive: never = grade
      throw new Error(`[recommendationView] unknown grade ${String(_exhaustive)} — declare its signal glyph`)
    }
  }
}

/** The coin-flip HINGE — names what the near-tie hinges on from the named driver. The sampling-noise
 *  sentinel renders the sampling-framed hinge; a probe name we don't recognize fails CLOSED to the
 *  generic hinge, never a fabricated cause. */
function hingeNote(namedDriver: string): string {
  switch (namedDriver) {
    case 'aca-enhanced-subsidies':
      return copy.recGradeNoteHingeAca
    case 'sampling-noise-near-tie':
      return copy.recGradeNoteHingeSampling
    default:
      return copy.recGradeNoteHingeGeneric
  }
}

/** The leave-more skew median quote — shown iff disclosure-worthy: the goal is leave-more, the skew is
 *  UPSIDE (the average overstates the typical — the calm-but-wrong-OPTIMISTIC risk this channel guards),
 *  AND the humane-rounded median differs from the mean shown (else the quote adds nothing). U16 owns
 *  this threshold; the engine names the channel + hands over the numbers (insight 092). */
function skewQuote(payload: SolveRecommendation): { readonly medianQuote: string } | undefined {
  const s = payload.skewDisclosure
  if (payload.goal !== 'leave-more' || s === undefined || s.skewDirection !== 'upside') return undefined
  // The quote is a portfolio-scale ABSOLUTE (the typical bequest), so it speaks the humane $X.XM prose
  // dialect (formatAbsoluteDollar), not full grouped digits. The "adds nothing" gate is SOURCE-BOUND to
  // the figure the quote would SHOW: if the median rounds to the same displayed magnitude as the mean at
  // that dialect, quoting it is noise — test the actual formatted string, never a re-typed threshold.
  if (formatAbsoluteDollar(s.meanReal) === formatAbsoluteDollar(s.medianReal)) return undefined
  return { medianQuote: slots.recSkewMedian(formatAbsoluteDollar(s.medianReal)) }
}

/**
 * The S4 RUNNER-UP comparison viz (winner vs runner-up, one tap down) — the comparative-depth
 * richness the S3 text-only runner-up deferred. Reuses the SAME RecommendationViz grammar (the
 * recommended arm keeps its hatch/triangle identity; the runner-up takes the solid/circle "other
 * option" arm), and it is honest for the SAME reason the primary viz is: winner and runner-up share
 * the seed-B CRN draw, so the GAP between them is common-mode-cancelled (never the A↔B residual —
 * both are B-side arms, wall #3 intact; the objective≡headline guard already verified the runner-up's
 * displayed figure before this runs).
 *
 * THE HONESTY GATE (the A-decides / B-displays split, the cardinal rule made structural). The winner
 * is crowned on the seed-A mean; at seed-B a near-tie can DISPLAY the runner-up ahead. Drawing "the
 * recommended strategy" with a shorter bar than the runner-up would read as recommending the worse
 * one — calm-but-wrong wearing the product's most differentiated face. So the picture ships ONLY when
 * the winner displays at-least-tied-ahead (goal-oriented); on an inversion the runner-up keeps its
 * honest hedged TEXT ("came out ahead more often") with NO chart contradicting the ranking. Suppressed
 * in NO-CHANGE mode too (the primary viz is, and there is no meaningful winner-ahead delta to draw).
 * Pure; figures pre-formatted, ceiling source-bound to TwoFutures' humane ladder.
 */
function runnerUpVizFor(payload: SolveRecommendation, isNoChange: boolean): RecommendationVizProps | undefined {
  const runnerUp = payload.runnerUp
  if (isNoChange || runnerUp === undefined) return undefined
  const winM = payload.winner.headlineStatisticB
  const runM = runnerUp.headlineStatisticB
  const winnerDisplaysAhead = payload.goal === 'leave-more' ? winM >= runM : winM <= runM
  if (!winnerDisplaysAhead) return undefined
  const gap = formatDeltaDollar(winM - runM)
  // The zero-collapse MIRROR (recommendedView's deltaCollapsesToZero, here for winner-vs-runner-up): a
  // gap under formatDeltaDollar's smallest step formats to '0' — drawing two display-tied bars labeled
  // "$0" is the same absurd claim. Source-bound: test the formatted gap, never a re-typed threshold.
  if (gap === '0') return undefined
  const ceiling = twoFuturesCeiling(Math.max(winM, runM, 0))
  const labels: RecommendationVizLabels = {
    withLabel: copy.recVizWithLabel,
    withoutLabel: copy.recVizRunnerUpLabel,
    deltaLabel: `$${gap}`,
    floorLabel: formatAxisDollar(0),
    axisMaxLabel: `~${formatAxisDollar(ceiling)}`,
    // The ENDPOINTS ride the absolute $X.XM prose dialect; the winner-vs-runner-up GAP stays grouped.
    ariaSummary: slots.recVizAria(
      copy.recVizRunnerUpLabel,
      formatAbsoluteDollar(runM),
      copy.recVizWithLabel,
      formatAbsoluteDollar(winM),
      gap,
    ),
  }
  return { withoutMagnitude: runM, withMagnitude: winM, labels }
}

/** The conversion-only withheld hold — dedupe the levers' reasons (they share a reason today) to their
 *  humane text + the coupling caveat. `undefined` when no lever is withheld. */
function withheldConversionView(
  payload: SolveRecommendation,
): { readonly reasons: readonly string[]; readonly coupling: string } | undefined {
  if (payload.withheldConversionLevers.length === 0) return undefined
  const seen = new Set<string>()
  const reasons: string[] = []
  for (const lever of payload.withheldConversionLevers) {
    const text = withheldReasonText(lever.reason)
    if (seen.has(text)) continue
    seen.add(text)
    reasons.push(text)
  }
  return { reasons, coupling: copy.recHoldCoupling }
}
