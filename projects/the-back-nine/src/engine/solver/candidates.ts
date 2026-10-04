/**
 * The SHARED candidate enumerator (U14 S1 — authored in the validation unit, imported by BOTH
 * the U14 harness and U15's `search.ts`, so the two can never drift to different candidate
 * sets; plan Unit-14 Dependencies + the Act-4 reconciliation supersession item 8).
 *
 * A candidate = one named drawdown policy × one Roth-conversion plan (or none). The search
 * axis is the FOUR named policies; the shipped 5-wide `DrawdownPolicy` keeps `'custom'` as
 * the user's own out-of-grid LABELED baseline, injected by the caller — the solver never
 * searches it, but it is always scored beside the grid so a user's standing choice is never
 * silently discarded.
 *
 * THE GRID IS CLIFF-ANCHORED, NOT UNIFORM (the plan's design): conversion amounts are pinned
 * JUST UNDER every active income rail — the 400%-FPL ACA cliff, each IRMAA step threshold
 * above the committed baseline, and each federal ordinary-bracket edge — because those are
 * exactly the discontinuities/kinks where a ranking can invert. The rail substrate is the
 * SHIPPED `magiLandscape` fill-model (reused, never re-derived — insight 068: fill to the
 * BINDING EFFECTIVE ceiling via the branch's own predicate): a conversion dollar enters the
 * committed-income skeleton exactly where the bracket-fill ceiling derivation already prices
 * it, so the enumerator and the engine agree on the geometry by construction.
 *
 * INSIGHT-013 COMPLIANCE (a bisection spanning a discontinuity finds a phantom root): every
 * inversion below runs on a CONTINUOUS, MONOTONE map (ACA-MAGI linear in the amount;
 * IRMAA-MAGI / federal-taxable piecewise-linear continuous) — the PRICED discontinuous
 * surfaces (the PTC cliff, the IRMAA bill steps) are never bisected. The thresholds
 * themselves come from the tables' own jump lists (`cliffMagiFor`, the IRMAA tier walk, the
 * bracket edges), so the anchor set derives FROM the discontinuity list rather than hoping
 * to converge across it.
 *
 * THE RMD-FIRST LEGALITY FILTER (insight 027 — the guard keys on the hazard creator's own
 * domain): the RMD is a forced, NON-convertible ordinary-income floor taken first
 * (`taxOverlay` clamps every conversion to `[0, priorYearEndPretax − rmd]`). A grid amount
 * exceeding the post-RMD convertible headroom at the window's first year is REJECTED as
 * infeasible — an out-of-range sentinel the caller can inspect, never a silently-scored
 * candidate (two over-headroom amounts would clamp to ONE effective conversion inside the
 * engine and be double-scored as distinct candidates — the mis-ranking shape). The headroom
 * inputs are the caller's DETERMINISTIC anchor (year-0 balances / the fixture's derived
 * figures); the engine's own per-path clamp + the `SimInfeasible` machinery stay the final
 * authority on every path.
 *
 * PURE (engine-purity lint): no clock, no entropy, no environment.
 */
import {
  DRAWDOWN_POLICIES,
  expandRothConversion,
  type DrawdownOrderKey,
  type DrawdownPolicy,
  type RothConversionPlan,
  type SimulationParams,
} from '@shared/model'
import {
  acaMagiAtFill,
  irmaaMagiAtFill,
  irmaaTierStepLine,
  taxableIncomeAtFill,
  nextBracketEdgeAbove,
  type CommittedYearIncome,
} from '@engine/magiLandscape'
import { deductionStack } from '@engine/taxCore'
import { irmaaScheduleAsCompared, irmaaTierApplies } from '@engine/healthOverlay'
import type { IrmaaSchedule } from '@engine/constants'

/** The FOUR searched policies — the 5-wide shipped enum minus the user's `custom` (the
 *  out-of-grid labeled baseline, injected via {@link enumerateCandidates}'s `userBaseline`).
 *  DERIVED from the shipped tuple (never re-typed) so a policy added to the model shows up
 *  here — or is consciously excluded — at compile time. */
export const SEARCHED_POLICIES = DRAWDOWN_POLICIES.filter(
  (p): p is Exclude<DrawdownPolicy, 'custom'> => p !== 'custom',
)

/** The conventional-wisdom ordering the no-change oracle case + the shrinkage prior key on:
 *  taxable → tax-deferred → Roth (the plan's case (i)/(v) baseline). */
export const CONVENTIONAL_POLICY: DrawdownPolicy = 'taxable-first'

/**
 * The deterministic anchor context the grid is derived from — the conversion WINDOW's first
 * active year, in committed-income terms (the same gross-independent skeleton the
 * bracket-fill ceiling derivation prices; every term known before any path runs) — plus every
 * window year's own frame: for the ACA-cliff and bracket-edge rails ({@link WindowAnchorContext}) and
 * for the IRMAA rail ({@link IrmaaAnchorContext}).
 */
export interface ConversionAnchorContext {
  /** The committed-income skeleton at the window's first year, WITHOUT any candidate
   *  conversion (the enumerator adds each trial amount to `conversion`). */
  readonly committed: CommittedYearIncome
  /** The 400%-FPL cliff dollar (`cliffMagiFor(activeTable, fplDollar)` — one dollar for the both-alive
   *  household, whatever the year) when ACA is priced under the cliff regime in a year the rail reads —
   *  year 0 when `window` is absent, a year of `window.acaPricedYears` when it is present — else `null`:
   *  the rail does not exist. The ACTIVATION predicate lives with the caller/hazard creator (insight 027). */
  readonly acaCliffMagi: number | null
  /** The ACA-cliff and bracket-edge rails across the conversion window. PRESENCE-KEYED: absent ⇒ both
   *  rails read the skeleton's year alone (the U14 oracle fixtures' single-year worlds — the golden
   *  cases are never perturbed); the shipped caller (`solveAnchor.deriveConversionAnchor`) always
   *  supplies it. */
  readonly window?: WindowAnchorContext
  /** The IRMAA rail's context when ANY MAGI year of the conversion window is actually billed (the
   *  caller owns that predicate — insight 027), else `null`. */
  readonly irmaa: IrmaaAnchorContext | null
  /** Deterministic pre-tax balance available at the window's first year (the legality
   *  screen's base — year-0 balance for a year-0 window; the fixture's derived figure in
   *  the zero-vol oracle worlds). */
  readonly pretaxAvailableAtStart: number
  /** The forced RMD at the window's first year (0 before RMD age — derived from the
   *  household's own birth years × the canonical RMD table, never a guessed flat age). */
  readonly rmdAtStart: number
}

/**
 * The IRMAA rail across the conversion WINDOW. A candidate repeats ONE real amount every window year
 * (`applyCandidate` expands it flat), and each year's MAGI meets its OWN bill's lines in its own price
 * frame (`healthOverlay.irmaaScheduleAsCompared`) — lines that move year to year with the $1,000
 * rounding and the Trustees path's near-term → ultimate edge — ON TOP OF that year's own committed
 * income: Social Security arrives at each person's claim age, ongoing income moves by year. So the
 * anchors read every billed year in its OWN committed frame, never year 0's income against a later
 * year's line (the register's Tier 1 *The solver's IRMAA conversion anchors sit one dollar under the
 * line only in YEAR 0…*; council wf_71f675da-8cf, b9-1 — on `retired` both spouses claim at 67, so a
 * year-0 frame left $25.5k–$45.9k of MAGI outside the check).
 */
export interface IrmaaAnchorContext {
  readonly schedule: IrmaaSchedule
  /** The committed-income frame of every window MAGI year whose bill (`y + magiLookbackYears`) lands
   *  inside the horizon with someone Medicare-enrolled, each keyed by its `calendarYear` — non-empty,
   *  strictly ascending, never before the anchor skeleton's year, the anchor's filing, conversion 0
   *  (checked loud at enumeration). A year outside it bills nothing, so no anchor reads its lines: a
   *  household first enrolled mid-window anchors on the years that bill. The caller derives each frame
   *  from the SAME seams the engine's year-t iteration reads (`solveAnchor.committedIncomeForYear`). */
  readonly billedYears: readonly [CommittedYearIncome, ...CommittedYearIncome[]]
}

/**
 * The ACA-cliff and bracket-edge rails across the conversion WINDOW (the register's Tier 1 *The solver's
 * ACA-cliff and bracket-edge anchors sit under their rail only in YEAR 0's committed frame…*, b9-5 — the
 * IRMAA window's sibling). The ONE amount a candidate repeats meets a different committed frame each
 * year: the OBBBA senior bonus ends after 2028 (the deduction stack shrinks, so the same conversion lands
 * deeper in taxable income) and Social Security arrives at each claim age (up to 85 % of it into taxable
 * income, ALL of it into ACA-MAGI). So each rail is judged year by year in each year's own frame.
 */
export interface WindowAnchorContext {
  /** Every conversion-window year's committed frame, keyed by `calendarYear` — strictly ascending, the
   *  FIRST is the anchor skeleton itself (one year-0 truth for every rail), one filing, conversion 0
   *  (checked loud at enumeration). The caller derives each from the SAME seams the engine's year-t
   *  iteration reads (`solveAnchor.committedIncomeForYear`). */
  readonly years: readonly [CommittedYearIncome, ...CommittedYearIncome[]]
  /** The calendar years of `years` in which the engine prices ACA under the cliff (table + cliff + a
   *  positive enrolled premium THAT year + a living pre-65 member THAT year — the engine's own per-year
   *  predicate, never year 0's) — strictly ascending; empty ⇒ no ACA-cliff rail anywhere. */
  readonly acaPricedYears: readonly number[]
}

/** One enumerated candidate strategy. */
export interface CandidateStrategy {
  readonly policy: DrawdownPolicy
  /** `null` = the conversion-0 arm. */
  readonly conversion: RothConversionPlan | null
  /** Where this candidate came from — the grid, the always-present conventional baseline,
   *  or the user's injected out-of-grid `custom` baseline. */
  readonly provenance: 'grid' | 'conventional-baseline' | 'user-baseline'
  /** Present iff `policy === 'custom'` (the shipped biconditional). */
  readonly drawdownOrder?: readonly DrawdownOrderKey[]
  /** The rail this amount was anchored just under (grid conversions only). */
  readonly anchoredRail?: AnchoredRail
}

export type AnchoredRail =
  | {
      readonly kind: 'aca-cliff'
      readonly magi: number
      /** The calendar year whose frame binds the amount: the window's first year for the first-year
       *  point, the tightest priced year (least room in its own frame) for the window point. */
      readonly calendarYear: number
      /** The first priced window year in which this amount crosses the cliff where that year's committed
       *  income alone does not — `null` when it adds no such crossing (in the committed-income frame:
       *  fill 0, insight 139 — never "keeps you under"). The `firstCrossingMagiYear` sibling. */
      readonly firstCrossingYear: number | null
    }
  | {
      readonly kind: 'irmaa-step'
      /** The line the amount sits under, AS COMPARED in `magiYear` (what the words quote). */
      readonly threshold: number
      /** The MAGI calendar year whose line binds the amount: the first billed year for the
       *  first-billed-year point, the window's tightest year (least room, in its own frame) for the
       *  window point. */
      readonly magiYear: number
      /** The first billed MAGI year in which this amount crosses the tier where that year's committed
       *  income alone does not — `null` when it adds no such crossing in any billed window year.
       *  THE FRAME IS COMMITTED INCOME ONLY (Social Security by claim age, ongoing income; fill 0 —
       *  the policy's own discretionary draw EXCLUDED, insight 139), so `null` is a claim about that
       *  frame, never "keeps you under" a line (the Roth-sheet entry's ⚑ NEGATIVE). A non-null year
       *  names a first-billed-year point kept beside the window point: its first-year room is real
       *  (on `retired`, $25k–$46k a year over the window point), and this field is what says it is
       *  not the holding one. Never narrow it to a boolean. */
      readonly firstCrossingMagiYear: number | null
    }
  | {
      readonly kind: 'bracket-edge'
      readonly edge: number
      /** The calendar year whose frame (its deduction stack, its committed income) binds the amount —
       *  as `aca-cliff`'s. */
      readonly calendarYear: number
      /** The first window year in which this amount crosses the edge where that year's committed income
       *  alone does not — `null` when it adds no such crossing (the committed-income frame) — as
       *  `aca-cliff`'s. */
      readonly firstCrossingYear: number | null
    }

/**
 * THE CANDIDATE IDENTITY the expected rankings + the run fingerprint are written in (U15 §S0.4).
 * Widened from the U14 `policy:amount` form with a PROVENANCE ARM so it is INJECTIVE by
 * construction: `candidates.ts` and an injected `userBaseline` both mint a `taxable-first:0`
 * when the user's current strategy IS the common default (the MODAL collision the fold named,
 * `reference/solver-cases/types.ts:81`), and a lossy id would score two distinct candidates —
 * two real points with DIFFERENT jobs (a searched grid point vs the user's own labeled baseline)
 * — as one. WIDEN, never dedup. Home is HERE, with the candidate it identifies (the fingerprint
 * is a shipped concern; a shipped module depending on the fixtures for the id would be backwards)
 * — re-exported from `reference/solver-cases/types.ts` so every U14 import path is unbroken.
 *
 * NOTE (the non-custom gap the fold flagged is CLOSED; the custom-order gap is fingerprint's):
 * within ONE enumerated set there is at most one `custom` candidate (the single injected
 * userBaseline), so the id never collides internally. ACROSS runs two different custom drawdown
 * orders share `baseline:custom:0` — that difference is ranking-affecting and is captured by the
 * RUN FINGERPRINT (which serializes each candidate's FULL fields, `drawdownOrder` included),
 * never left to the id string alone.
 */
export const solverCandidateId = (c: CandidateStrategy): string =>
  `${candidateProvenanceArm(c.provenance)}:${c.policy}:${c.conversion?.annualAmountReal ?? 0}`

/**
 * Do two candidates describe the SAME PLAN — the same decumulation order and the same conversion?
 *
 * DELIBERATELY PROVENANCE-BLIND, which is exactly what {@link solverCandidateId} is not. The id is
 * injective BY provenance (see above) because two arms with different JOBS must score separately;
 * this predicate answers the opposite question — "is the crowned plan the one the household is
 * already running?" — where provenance is precisely the thing that must not matter.
 *
 * ⚠️ THE REASON THIS EXISTS, AND WHY INDEX EQUALITY IS WRONG FOR IT. The injected user baseline is
 * a strategic duplicate of some enumerated arm whenever the household runs no conversion and the
 * policy is not `custom`: a `taxable-first` household duplicates the conventional baseline, and
 * every other `SEARCHED_POLICIES` household (including the `proportional` DEFAULT) duplicates that
 * policy's own conversion-0 grid point. (Since 2026-08-03 the baseline also CARRIES the household's
 * own conversion when they run one — an amount the rail-anchored grid has no reason to contain — so
 * a converting household's baseline is typically a genuinely new point rather than a duplicate. That
 * widens the duplicate-free case; it does not touch the argument below, which is about the ties the
 * duplicate case produces.) Ties between duplicates are broken toward the conventional incumbent / the earlier
 * enumeration index, so the crowned index is routinely NOT the user-baseline index even when the
 * crowned PLAN is bit-identical to the household's own. Comparing indices would tell a household
 * already running the winning strategy that we are recommending a change — a fresh calm-but-wrong
 * claim of exactly the kind the baseline re-anchoring exists to remove.
 *
 * Also lossless where the id is lossy: `drawdownOrder` is compared element-wise, so two different
 * custom orders (which share the id `baseline:custom:0`) are correctly NOT the same plan.
 */
export function sameDecumulationPlan(a: CandidateStrategy, b: CandidateStrategy): boolean {
  if (a.policy !== b.policy) return false

  const ac = a.conversion
  const bc = b.conversion
  if ((ac === null) !== (bc === null)) return false
  if (ac !== null && bc !== null) {
    if (ac.annualAmountReal !== bc.annualAmountReal) return false
    if (ac.startYearOffset !== bc.startYearOffset) return false
    if (ac.years !== bc.years) return false
  }

  const ao = a.drawdownOrder
  const bo = b.drawdownOrder
  if ((ao === undefined) !== (bo === undefined)) return false
  if (ao !== undefined && bo !== undefined) {
    if (ao.length !== bo.length) return false
    for (let i = 0; i < ao.length; i++) if (ao[i] !== bo[i]) return false
  }
  return true
}

/** Map the provenance to its id arm — an EXHAUSTIVE switch so a new provenance value forces a
 *  new arm at COMPILE time (the `never` default), never a silent collision into an existing arm. */
function candidateProvenanceArm(p: CandidateStrategy['provenance']): 'grid' | 'conventional' | 'baseline' {
  switch (p) {
    case 'grid':
      return 'grid'
    case 'conventional-baseline':
      return 'conventional'
    case 'user-baseline':
      return 'baseline'
    default: {
      const _exhaustive: never = p
      throw new Error(
        `[candidates] unknown candidate provenance ${String(_exhaustive)} — the id scheme must widen with a new arm (S0.4 injectivity)`,
      )
    }
  }
}

/** A grid amount rejected by the RMD-first legality filter — recorded, never scored. */
export interface RejectedAmount {
  readonly amountReal: number
  readonly rail: AnchoredRail
  readonly reason: 'exceeds-post-rmd-headroom'
  /** The headroom it exceeded: `max(0, pretaxAvailableAtStart − rmdAtStart)`. */
  readonly headroomReal: number
}

export interface CandidateSet {
  readonly candidates: readonly CandidateStrategy[]
  readonly rejected: readonly RejectedAmount[]
}

/** Grid amounts are WHOLE-DOLLAR quantized (stable dedupe + a stable persisted shape);
 *  a floored amount below $1 is no candidate at all. */
const flooredOrNull = (amount: number): number | null => {
  const floored = Math.floor(amount)
  return floored >= 1 ? floored : null
}

/** The LARGEST WHOLE DOLLAR with `metric(a) ≤ rail`, refined from a bisection approximation:
 *  the bisection converges to the real boundary from below within 1e-6, so a bare floor can
 *  land one dollar short of an integer boundary (floor(a* − ε) = a* − 1). Probe up from
 *  floor(approx), then settle down — a bounded handful of integer steps, exact by test. */
const largestWholeDollarWithin = (
  metric: (a: number) => number,
  rail: number,
  approx: number,
): number | null => {
  let f = Math.floor(approx)
  while (metric(f + 1) <= rail) f += 1
  while (f >= 1 && metric(f) > rail) f -= 1
  return f >= 1 ? f : null
}

/** Bisect the largest `a ∈ [0, hi]` with monotone `metric(a) ≤ rail` (the magiLandscape
 *  `largestFillWithin` idiom on the AMOUNT axis; the caller supplies a proven-crossing hi). */
function largestAmountWithin(metric: (a: number) => number, rail: number, hi: number): number {
  if (!(metric(hi) > rail)) {
    throw new Error(
      `[candidates] largestAmountWithin: upper bound ${hi} does not cross rail ${rail} — ` +
        `the crossing bound is wrong (burned/062: refuse a mis-bracketed solve)`,
    )
  }
  let a = 0
  let b = hi
  for (let pass = 0; pass < 64; pass++) {
    const mid = (a + b) / 2
    if (metric(mid) <= rail) a = mid
    else b = mid
    if (b - a < 1e-6) return a
  }
  throw new Error(`[candidates] largestAmountWithin did not converge (rail=${rail}) — burned/062`)
}

/** A rail's per-year frame list, checked loud: a list the anchors cannot trust is a caller bug surfaced,
 *  never a quietly narrower walk (burned/062). Non-empty, integer calendar years, strictly ascending,
 *  never before the anchor skeleton's year (and, with `startsAtSkeleton`, starting AT it), the skeleton's
 *  filing (both alive is one filing), conversion 0 (the enumerator adds each trial amount), finite ≥ 0
 *  income terms; a frame for the skeleton's own year must BE the skeleton (one year-0 truth for every
 *  rail). `label` names the field in every message. */
function assertFrames(
  frames: readonly CommittedYearIncome[],
  skeleton: CommittedYearIncome,
  label: string,
  startsAtSkeleton: boolean,
): void {
  if (frames.length === 0) {
    throw new Error(`[candidates] ${label} is empty — a rail with no year carries no context`)
  }
  frames.forEach((f, k) => {
    const y = f.calendarYear
    if (!Number.isInteger(y)) throw new Error(`[candidates] ${label}[${k}].calendarYear must be an integer calendar year (got ${y})`)
    if (k === 0 && y < skeleton.calendarYear) {
      throw new Error(`[candidates] ${label} starts at ${y}, before the anchor skeleton's year ${skeleton.calendarYear}`)
    }
    if (k === 0 && startsAtSkeleton && y !== skeleton.calendarYear) {
      throw new Error(`[candidates] ${label} starts at ${y}, not at the anchor skeleton's year ${skeleton.calendarYear}`)
    }
    if (k > 0 && y <= frames[k - 1]!.calendarYear) {
      throw new Error(`[candidates] ${label} must be strictly ascending (${frames[k - 1]!.calendarYear} then ${y})`)
    }
    if (f.filing !== skeleton.filing) {
      throw new Error(`[candidates] ${label}[${k}] files ${f.filing}, the anchor skeleton ${skeleton.filing} — both alive is one filing`)
    }
    if (f.conversion !== 0) throw new Error(`[candidates] ${label}[${k}] must carry conversion 0 (the enumerator adds each trial amount)`)
    for (const [name, v] of [['rmd', f.rmd], ['ongoingTaxable', f.ongoingTaxable], ['ssBenefit', f.ssBenefit]] as const) {
      if (!Number.isFinite(v) || v < 0) throw new Error(`[candidates] ${label}[${k}].${name} must be finite ≥ 0 (got ${v}) — insight 010`)
    }
    if (
      y === skeleton.calendarYear &&
      (f.rmd !== skeleton.rmd || f.ongoingTaxable !== skeleton.ongoingTaxable || f.ssBenefit !== skeleton.ssBenefit || f.count65 !== skeleton.count65)
    ) {
      throw new Error(`[candidates] ${label}' ${y} frame is not the anchor skeleton — one year-0 truth for every rail`)
    }
  })
}

/** The committed skeleton with a trial conversion amount added (fill held at 0 — the grid
 *  anchors the CONVERSION dollar; the policy's own discretionary fill is the engine's per-year
 *  business through the shipped ceiling derivation). */
const withAmount = (c: CommittedYearIncome, a: number): CommittedYearIncome => ({
  ...c,
  conversion: c.conversion + a,
})

/**
 * ONE RAIL ACROSS THE WINDOW — the shape every rail shares (the IRMAA build's, council wf_71f675da-8cf;
 * the ACA-cliff and bracket-edge rails since b9-5). A candidate repeats ONE amount every window year, and
 * each year meets the rail in its OWN committed frame, so over the rail's years (`frames`, ascending):
 *  - the FIRST-YEAR point: the largest amount under the rail in the FIRST year the rail exists (`frames[0]`
 *    — the skeleton's year for the bracket edges, the first priced year for the ACA cliff, the first billed
 *    year for IRMAA — when its committed income has not already crossed it) — its first-year room is real,
 *    so it is NEVER dropped (the ⚑ NEGATIVE); `firstCrossingYear` names the first year it crosses where
 *    that year's committed income alone does not;
 *  - the WINDOW point: the largest amount that stays under the rail in EVERY year committed income has not
 *    already crossed — the minimum, over those years, of each year's own room — bound at the tightest such
 *    year (the earliest on a tie). Emitted only when the first-year point does not already hold, so a
 *    window that never binds tighter adds no candidate. Years committed income ALREADY crosses are
 *    excluded, never the rail (no silent vanish, burned/062); a year with no whole dollar of room means
 *    any conversion crosses there — no window point (the conversion-0 arm is that point).
 * Never per-year amounts inside one candidate (the ⚑ NEGATIVE). The frame is COMMITTED income only (fill
 * 0, insight 139) — a claim about that frame, never about billed MAGI (council wf_919f377d-274).
 */
function railAcrossWindow(
  frames: readonly CommittedYearIncome[],
  crossesAt: (k: number, a: number) => boolean,
  roomAt: (k: number) => number | null,
  railFor: (k: number, firstCrossingYear: number | null) => AnchoredRail,
  what: string,
): Array<{ amountReal: number; rail: AnchoredRail }> {
  const out: Array<{ amountReal: number; rail: AnchoredRail }> = []
  const open = frames.flatMap((_, k) => (crossesAt(k, 0) ? [] : [k]))
  if (open.length === 0) return out // committed income alone crosses the rail in every year it exists
  const firstCrossing = (a: number): number | null => {
    const k = open.find((j) => crossesAt(j, a))
    return k === undefined ? null : frames[k]!.calendarYear
  }
  let firstHolds = false
  if (open[0] === 0) {
    const amount = roomAt(0)
    if (amount !== null) {
      const crossing = firstCrossing(amount)
      firstHolds = crossing === null
      out.push({ amountReal: amount, rail: railFor(0, crossing) })
    }
  }
  if (firstHolds) return out
  let tight = -1
  let tightRoom = Number.POSITIVE_INFINITY
  for (const k of open) {
    const room = roomAt(k)
    if (room === null) return out
    if (room < tightRoom) {
      tightRoom = room
      tight = k
    }
  }
  if (tight < 0) return out
  // Under every open year's room ⇒ adds no crossing anywhere — by construction; a violation is an
  // enumerator bug, never a label to ship (burned/062).
  if (firstCrossing(tightRoom) !== null) {
    throw new Error(
      `[candidates] the ${what} window anchor ${tightRoom} (year ${frames[tight]!.calendarYear}) adds a crossing in a window year — the window minimum is wrong`,
    )
  }
  out.push({ amountReal: tightRoom, rail: railFor(tight, null) })
  return out
}

/**
 * The cliff-anchored conversion amounts for one anchor context: for each ACTIVE rail, the window
 * walk above ({@link railAcrossWindow}) — the largest whole-dollar amount keeping the rail's own metric
 * at-or-under it in the first year, plus the amount that holds in every window year where that is
 * tighter. Deduplicated, ascending, zero-free (0 is the baseline arm, always present separately).
 */
export function anchoredConversionAmounts(
  anchor: ConversionAnchorContext,
): ReadonlyArray<{ readonly amountReal: number; readonly rail: AnchoredRail }> {
  const c = anchor.committed
  const out: Array<{ amountReal: number; rail: AnchoredRail }> = []

  // The window frames the ACA-cliff and bracket-edge rails read — the skeleton alone when no window rides.
  const window = anchor.window
  if (window !== undefined) {
    assertFrames(window.years, c, 'window.years', true)
    const yearsOf = new Set(window.years.map((f) => f.calendarYear))
    window.acaPricedYears.forEach((y, k) => {
      if (!yearsOf.has(y)) throw new Error(`[candidates] window.acaPricedYears names ${y}, which is not a window year`)
      if (k > 0 && y <= window.acaPricedYears[k - 1]!) {
        throw new Error(`[candidates] window.acaPricedYears must be strictly ascending (${window.acaPricedYears[k - 1]} then ${y})`)
      }
    })
    if ((anchor.acaCliffMagi !== null) !== (window.acaPricedYears.length > 0)) {
      throw new Error('[candidates] acaCliffMagi is present iff some window year prices ACA under the cliff (window.acaPricedYears)')
    }
  }
  const taxYears: readonly CommittedYearIncome[] = window?.years ?? [c]

  // ACA cliff — ACA-MAGI is LINEAR in the amount (the full-benefit add-back has no Pub-915 coupling), so
  // each year's room is closed-form: the same K-derivation as acaCliffFillHeadroom. ONE cliff dollar (the
  // both-alive household's FPL); the years it binds are the years the engine prices ACA under it.
  const cliff = anchor.acaCliffMagi
  if (cliff !== null) {
    const priced = window === undefined ? [c] : window.years.filter((f) => window.acaPricedYears.includes(f.calendarYear))
    const baselineAt = (k: number): number => acaMagiAtFill(priced[k]!, 0)
    out.push(
      ...railAcrossWindow(
        priced,
        (k, a) => acaMagiAtFill(withAmount(priced[k]!, a), 0) > cliff,
        (k) => flooredOrNull(cliff - baselineAt(k)),
        (k, firstCrossingYear) => ({ kind: 'aca-cliff', magi: cliff, calendarYear: priced[k]!.calendarYear, firstCrossingYear }),
        'ACA-cliff',
      ),
    )
  }

  // IRMAA steps — EVERY tier is a real anchor wherever committed income has not already crossed it (the
  // grid wants a candidate just under each step, not only the next one). Each anchor targets the step's
  // LAST SAFE MAGI (magiLandscape.irmaaTierStepLine — one nominal dollar under the inclusive top line,
  // whose line dollar already owes the top tier); the rail still NAMES the line. A MAGI year's lines are
  // the ones its bill two years on compares it against, in that year's price frame
  // (healthOverlay.irmaaScheduleAsCompared), and they sit ON TOP OF that year's own committed income —
  // so the ONE amount a candidate repeats is judged year by year in each BILLED year's own frame
  // (IrmaaAnchorContext.billedYears; council wf_71f675da-8cf) through the window walk. Read through the
  // BILL's own predicate in every billed year (irmaaTierApplies) — the enumerator and the bill can never
  // disagree about which dollar crosses. IRMAA-MAGI is monotone piecewise-linear CONTINUOUS in the amount
  // (the Pub-915 inclusion ramps) — bisect it; amount = lastSafe + 1 provably crosses
  // (magi(a) ≥ ordinary(a) ≥ a + committed ≥ a).
  if (anchor.irmaa !== null) {
    const { schedule, billedYears } = anchor.irmaa
    assertFrames(billedYears, c, 'irmaa.billedYears', false)
    const compared = billedYears.map((f) => irmaaScheduleAsCompared(schedule, f.calendarYear))
    const metricAt = (k: number, a: number): number => irmaaMagiAtFill(withAmount(billedYears[k]!, a), 0)
    for (let i = 0; i < schedule.tiers.length; i++) {
      out.push(
        ...railAcrossWindow(
          billedYears,
            (k, a) => irmaaTierApplies(metricAt(k, a), compared[k]!.tiers[i]!, billedYears[k]!.filing),
          (k) => {
            const safe = irmaaTierStepLine(compared[k]!, i, billedYears[k]!.filing).lastSafeMagi
            const metric = (a: number): number => metricAt(k, a)
            return largestWholeDollarWithin(metric, safe, largestAmountWithin(metric, safe, safe + 1))
          },
          (k, firstCrossingMagiYear) => ({
            kind: 'irmaa-step',
            threshold: irmaaTierStepLine(compared[k]!, i, billedYears[k]!.filing).threshold,
            magiYear: billedYears[k]!.calendarYear,
            firstCrossingMagiYear,
          }),
          `IRMAA (tier ${i + 1})`,
        ),
      )
    }
  }

  // Federal bracket edges — taxable income is monotone continuous in the amount (the deduction stack's
  // phase-out only steepens it); each year's d0 (the stack at MAGI 0, THAT year — the OBBBA senior bonus
  // rides 2025–2028 only) is that year's deduction MAXIMUM, so `edge + d0 + 1` provably crosses — the
  // exact crossing-bound idiom the shipped bracket-edge rail derivation uses
  // (magiLandscape.bracketEdgeFillHeadroom). The edges walked are every finite edge above the LOWEST
  // window year's committed taxable income — an edge one year's income already passes still anchors on
  // the years it does not (no silent vanish). The brackets themselves are real-constant; the frame moves.
  {
    const metricAt = (k: number, a: number): number => taxableIncomeAtFill(withAmount(taxYears[k]!, a), 0)
    let probe = Math.min(...taxYears.map((_, k) => metricAt(k, 0)))
    for (;;) {
      const edge = nextBracketEdgeAbove(probe, c.filing)
      if (edge === null) break
      out.push(
        ...railAcrossWindow(
          taxYears,
            (k, a) => metricAt(k, a) > edge,
          (k) => {
            const f = taxYears[k]!
            const d0 = deductionStack(f.filing, f.count65, 0, f.calendarYear)
            const metric = (a: number): number => metricAt(k, a)
            return largestWholeDollarWithin(metric, edge, largestAmountWithin(metric, edge, edge + d0 + 1))
          },
          (k, firstCrossingYear) => ({ kind: 'bracket-edge', edge, calendarYear: taxYears[k]!.calendarYear, firstCrossingYear }),
          `bracket-edge ${edge}`,
        ),
      )
      probe = edge + 1
    }
  }

  // Whole-dollar dedupe (two rails can bind at the same amount), ascending.
  const seen = new Set<number>()
  return out
    .filter(({ amountReal }) => amountReal > 0 && (seen.has(amountReal) ? false : (seen.add(amountReal), true)))
    .sort((x, y) => x.amountReal - y.amountReal)
}

/**
 * Enumerate the full candidate set for one household anchor + conversion window.
 *
 * Guarantees (each pinned by the S1 battery):
 *  - the conventional-order / conversion-0 baseline is ALWAYS present (the no-change oracle
 *    case + the shrinkage prior both require it);
 *  - every amount is anchored to a named rail and RMD-first-legal (over-headroom amounts land
 *    in `rejected`, never in `candidates`);
 *  - the user's `custom` baseline is out-of-grid and labeled, carried with its order;
 *  - candidates never alter draw dimensions (they are policy/conversion fields ONLY — the
 *    S3 CRN premise).
 */
export function enumerateCandidates(opts: {
  readonly anchor: ConversionAnchorContext
  readonly window: { readonly startYearOffset: number; readonly years: number }
  readonly userBaseline?: {
    readonly policy: DrawdownPolicy
    readonly drawdownOrder?: readonly DrawdownOrderKey[]
    /** THE HOUSEHOLD'S OWN CONVERSION, absent when they run none.
     *
     *  ⚠️ THIS FIELD EXISTS BECAUSE ITS ABSENCE WAS A CALM-BUT-WRONG DEFECT. Until 2026-08-03 the
     *  injected baseline was minted `conversion: null` UNCONDITIONALLY and there was no way to say
     *  otherwise — so for a household that had applied the shipped Roth lever, the arm the whole
     *  recommendation surface labels *"your plan today"* (`copy.ts` recommendBaselineNameplate /
     *  recVizWithoutLabel / recDeltaLeaveMore / recDeltaPayLessTax) was their withdrawal order with
     *  their conversion DELETED — a plan they were not running, and a different "today" from the one
     *  the spine band above it draws. It is the same shape as the drawdown-order defect `2652b7a6`
     *  closed, on the other of the two coupled tax controls.
     *
     *  UNSCREENED BY DESIGN. The grid's legality filter (RMD-first headroom) governs amounts the
     *  SOLVER proposes; this one is the household's own standing plan, already simulated on the
     *  spine, so it is carried as entered exactly the way their `custom` order is. Screening it
     *  would put a baseline on screen that no one is running. */
    readonly conversion?: RothConversionPlan
  }
}): CandidateSet {
  const { anchor, window, userBaseline } = opts
  if (!Number.isInteger(window.startYearOffset) || window.startYearOffset < 0) {
    throw new Error('[candidates] window.startYearOffset must be an integer ≥ 0')
  }
  if (!Number.isInteger(window.years) || window.years < 1) {
    throw new Error('[candidates] window.years must be an integer ≥ 1')
  }
  if (!Number.isFinite(anchor.pretaxAvailableAtStart) || anchor.pretaxAvailableAtStart < 0) {
    throw new Error('[candidates] pretaxAvailableAtStart must be finite ≥ 0 (insight 010)')
  }
  if (!Number.isFinite(anchor.rmdAtStart) || anchor.rmdAtStart < 0) {
    throw new Error('[candidates] rmdAtStart must be finite ≥ 0 (insight 010)')
  }

  const headroom = Math.max(0, anchor.pretaxAvailableAtStart - anchor.rmdAtStart)
  const anchored = anchoredConversionAmounts(anchor)

  const feasible: Array<{ amountReal: number; rail: AnchoredRail }> = []
  const rejected: RejectedAmount[] = []
  for (const entry of anchored) {
    if (entry.amountReal > headroom) {
      rejected.push({ ...entry, reason: 'exceeds-post-rmd-headroom', headroomReal: headroom })
    } else {
      feasible.push(entry)
    }
  }

  const candidates: CandidateStrategy[] = []
  for (const policy of SEARCHED_POLICIES) {
    // The conversion-0 arm — for the conventional policy this IS the no-change baseline.
    candidates.push({
      policy,
      conversion: null,
      provenance: policy === CONVENTIONAL_POLICY ? 'conventional-baseline' : 'grid',
    })
    for (const { amountReal, rail } of feasible) {
      candidates.push({
        policy,
        conversion: {
          annualAmountReal: amountReal,
          startYearOffset: window.startYearOffset,
          years: window.years,
        },
        provenance: 'grid',
        anchoredRail: rail,
      })
    }
  }

  if (userBaseline !== undefined) {
    const isCustom = userBaseline.policy === 'custom'
    if (isCustom && userBaseline.drawdownOrder === undefined) {
      throw new Error('[candidates] a custom user baseline requires its drawdownOrder (the shipped biconditional)')
    }
    if (!isCustom && userBaseline.drawdownOrder !== undefined) {
      throw new Error('[candidates] drawdownOrder rides ONLY the custom policy (the shipped biconditional)')
    }
    candidates.push({
      // `?? null` — absence stays the conversion-0 arm (the reduce-to-spine signal), never a
      // zero-fill; a PRESENT plan rides through so `applyCandidate` re-expands the household's own
      // schedule instead of dropping it.
      conversion: userBaseline.conversion ?? null,
      policy: userBaseline.policy,
      provenance: 'user-baseline',
      ...(isCustom ? { drawdownOrder: userBaseline.drawdownOrder } : {}),
    })
  }

  return { candidates, rejected }
}

/**
 * Apply one candidate strategy to a base `SimulationParams` — the SHARED apply seam (U14's
 * harness and U15's search both build a candidate's params through THIS function, so the two
 * can never disagree on what a candidate MEANS; the `buildArmParams` strip-then-spread
 * discipline, roth.ts:75).
 *
 * Guarantees:
 *  - every field the candidate does not name is the base's, byte-for-byte;
 *  - the base's own conversions are STRIPPED first (a candidate is exactly its own plan,
 *    never the base's schedule + the candidate's stacked — and the conversion-0 arm is
 *    genuinely conversion-free: ABSENCE, the reduce-to-spine signal, never a zero-fill);
 *  - `drawdownOrder` rides ONLY a `custom` candidate (the shipped biconditional);
 *  - DRAW-DIMENSION INVARIANCE (the S3 CRN premise): the candidate touches policy /
 *    order / conversions ONLY — `paths`, `maxHorizonYears`, and `people` are the base's
 *    by construction, so every candidate consumes the identical `buildDraws` matrix.
 */
export function applyCandidate(base: SimulationParams, candidate: CandidateStrategy): SimulationParams {
  const { drawdownOrder: _order, ...baseRest } = base
  const withPolicy: SimulationParams = {
    ...baseRest,
    drawdownPolicy: candidate.policy,
    ...(candidate.drawdownOrder !== undefined ? { drawdownOrder: candidate.drawdownOrder } : {}),
  }
  const overlay = withPolicy.overlay
  if (overlay === undefined) {
    if (candidate.conversion !== null) {
      throw new Error('[candidates] a conversion candidate requires an overlay (tax ON) on the base params')
    }
    return withPolicy
  }
  const { conversions: _base, ...overlayRest } = overlay
  if (candidate.conversion === null) {
    return { ...withPolicy, overlay: overlayRest }
  }
  const conversions = expandRothConversion(candidate.conversion, base.maxHorizonYears)
  if (conversions === undefined) {
    // expandRothConversion returns undefined ONLY for a window entirely past the horizon —
    // silently dropping the key would score this candidate as its conversion-0 twin's
    // byte-identical duplicate under a conversion-bearing id (the double-scoring the
    // legality filter forbids, and a phantom "conversion" presented as real).
    throw new Error(
      `[candidates] the conversion window (startYearOffset ${candidate.conversion.startYearOffset}) lies ` +
        `entirely past the ${base.maxHorizonYears}-year horizon — a caller bug; refusing the silent ` +
        `conversion-free degrade (fail loud, never a quiet twin)`,
    )
  }
  return { ...withPolicy, overlay: { ...overlayRest, conversions } }
}
