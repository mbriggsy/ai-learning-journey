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
  taxableIncomeAtFill,
  nextBracketEdgeAbove,
  nextIrmaaThresholdAbove,
  type CommittedYearIncome,
} from '@engine/magiLandscape'
import { deductionStack } from '@engine/taxCore'
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
 * bracket-fill ceiling derivation prices; every term known before any path runs).
 */
export interface ConversionAnchorContext {
  /** The committed-income skeleton at the window's first year, WITHOUT any candidate
   *  conversion (the enumerator adds each trial amount to `conversion`). */
  readonly committed: CommittedYearIncome
  /** The 400%-FPL cliff dollar when ACA is priced under the cliff regime in that year
   *  (`cliffMagiFor(activeTable, fplDollar)`), else `null` — the rail does not exist. The
   *  ACTIVATION predicate lives with the caller/hazard creator (insight 027). */
  readonly acaCliffMagi: number | null
  /** The IRMAA schedule when anyone will be Medicare-enrolled at `t + magiLookbackYears`
   *  (the caller owns that predicate), else `null`. */
  readonly irmaaSchedule: IrmaaSchedule | null
  /** Deterministic pre-tax balance available at the window's first year (the legality
   *  screen's base — year-0 balance for a year-0 window; the fixture's derived figure in
   *  the zero-vol oracle worlds). */
  readonly pretaxAvailableAtStart: number
  /** The forced RMD at the window's first year (0 before RMD age — derived from the
   *  household's own birth years × the canonical RMD table, never a guessed flat age). */
  readonly rmdAtStart: number
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
  | { readonly kind: 'aca-cliff'; readonly magi: number }
  | { readonly kind: 'irmaa-step'; readonly threshold: number }
  | { readonly kind: 'bracket-edge'; readonly edge: number }

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

/** The committed skeleton with a trial conversion amount added (fill held at 0 — the grid
 *  anchors the CONVERSION dollar; the policy's own discretionary fill is the engine's per-year
 *  business through the shipped ceiling derivation). */
const withAmount = (c: CommittedYearIncome, a: number): CommittedYearIncome => ({
  ...c,
  conversion: c.conversion + a,
})

/**
 * The cliff-anchored conversion amounts for one anchor context: for each ACTIVE rail whose
 * threshold sits above the committed baseline, the largest whole-dollar amount keeping the
 * rail's own metric at-or-under it. Deduplicated, ascending, zero-free (0 is the baseline
 * arm, always present separately).
 */
export function anchoredConversionAmounts(
  anchor: ConversionAnchorContext,
): ReadonlyArray<{ readonly amountReal: number; readonly rail: AnchoredRail }> {
  const c = anchor.committed
  const out: Array<{ amountReal: number; rail: AnchoredRail }> = []

  // ACA cliff — ACA-MAGI is LINEAR in the amount (the full-benefit add-back has no Pub-915
  // coupling), so the inversion is closed-form: the same K-derivation as acaCliffFillHeadroom.
  if (anchor.acaCliffMagi !== null) {
    const baseline = acaMagiAtFill(c, 0)
    if (baseline <= anchor.acaCliffMagi) {
      const amount = flooredOrNull(anchor.acaCliffMagi - baseline)
      if (amount !== null) out.push({ amountReal: amount, rail: { kind: 'aca-cliff', magi: anchor.acaCliffMagi } })
    }
  }

  // IRMAA steps — walk EVERY threshold above the baseline (each is a real anchor; the grid
  // wants a candidate just under each step, not only the next one). IRMAA-MAGI is monotone
  // piecewise-linear CONTINUOUS in the amount (the Pub-915 inclusion ramps) — bisect it;
  // amount = threshold + 1 provably crosses (magi(a) ≥ ordinary(a) ≥ a + committed ≥ a).
  if (anchor.irmaaSchedule !== null) {
    let probe = irmaaMagiAtFill(c, 0)
    for (;;) {
      const threshold = nextIrmaaThresholdAbove(probe, c.filing, anchor.irmaaSchedule)
      if (threshold === null) break
      const metric = (a: number): number => irmaaMagiAtFill(withAmount(c, a), 0)
      const amount = largestWholeDollarWithin(metric, threshold, largestAmountWithin(metric, threshold, threshold + 1))
      if (amount !== null) out.push({ amountReal: amount, rail: { kind: 'irmaa-step', threshold } })
      probe = threshold + 1 // strictly past this tier — the walk visits each remaining step once
    }
  }

  // Federal bracket edges — taxable income is monotone continuous in the amount (the
  // deduction stack's phase-out only steepens it); d0 (the stack at MAGI 0, THIS year) is the
  // deduction's MAXIMUM, so `edge + d0 + 1` provably crosses — the exact crossing-bound idiom
  // the shipped bracket-edge rail derivation uses (magiLandscape.bracketEdgeFillHeadroom).
  {
    const d0 = deductionStack(c.filing, c.count65, 0, c.calendarYear)
    let probe = taxableIncomeAtFill(c, 0)
    for (;;) {
      const edge = nextBracketEdgeAbove(probe, c.filing)
      if (edge === null) break
      const metric = (a: number): number => taxableIncomeAtFill(withAmount(c, a), 0)
      const amount = largestWholeDollarWithin(metric, edge, largestAmountWithin(metric, edge, edge + d0 + 1))
      if (amount !== null) out.push({ amountReal: amount, rail: { kind: 'bracket-edge', edge } })
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
      policy: userBaseline.policy,
      conversion: null,
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
