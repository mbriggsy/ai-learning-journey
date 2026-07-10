/**
 * The MAGI landscape (P3·U11) — the ONE canonical translator between a year's COMMITTED,
 * gross-independent income context and the income-cliff geometry the tool must never
 * silently optimize over: the 400%-FPL ACA cliff, the IRMAA step thresholds, and the
 * federal ordinary-bracket edges.
 *
 * TWO consumers, ONE producer (the council-ratified single-producer contract, 2026-07-03):
 *   1. The engine's `bracket-fill` ceiling derivation (`taxOverlay.ts`): each rail's
 *      fill-dollar HEADROOM — the largest discretionary pre-tax draw that keeps the rail's
 *      metric at-or-under the rail — with the effective per-year ceiling = min over the
 *      ACTIVE rails. Activation predicates live with the hazard creator (the overlay owns
 *      "is ACA priced this year", "is anyone enrolled at t+lookback" — insight 027); the
 *      MATH lives here so the readout and the allocation can never drift apart.
 *   2. The U11 shadow-rate / healthcare readout (via the engine's emission surface): the
 *      marginal decomposition (ordinary bracket rate, subsidy phase-out drag, the next
 *      IRMAA step's cost) evaluated at an EMPIRICAL anchor (the simulation's own median
 *      MAGI — an unbiased best estimate by construction, never a modeled skeleton).
 *
 * THE FILL MODEL (documented, disclosed): `f` is the year's discretionary pre-tax draw
 * (`alloc.pretax` under `bracket-fill`). Ordinary income at fill `f` is
 * `max(f, rmd) + conversion + ongoingTaxable` (a fill below the forced RMD adds nothing —
 * the RMD is distributed regardless). The realized-gain term is modeled 0 AT THE CAP:
 * bracket-fill draws pre-tax FIRST, so the taxable bucket is untouched until the pre-tax
 * room exhausts — the DISCRETIONARY draw this ceiling caps respects the rail by
 * construction, while income the fill does not control (a taxable-bucket realization
 * funding the rest of the year, working-year wages) can still move MAGI. That boundary is
 * DISCLOSED at the readout, and the empirical per-year over-cliff fraction reports the
 * truth of the whole distribution — the conservatism lives in copy + measurement, never
 * as a bias inside these numbers (the council's unbiased-skeleton contract).
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 * Every dated figure is READ from `@engine/taxCore` / `@engine/healthOverlay` /
 * `@engine/constants` — never re-typed here (architecture §8; burned/063).
 */
import { bracketsFor, deductionStack, taxableSocialSecurity } from '@engine/taxCore'
import { irmaaTierSurchargeMonthly, slidingScalePtc } from '@engine/healthOverlay'
import type { AcaApplicablePercentageTable, IrmaaSchedule } from '@engine/constants'
import type { FilingStatus } from '@shared/model'

/**
 * The year's committed, GROSS-INDEPENDENT ordinary-income context — every term is known
 * before the gross-up fixed point runs (the RMD off the prior-year-end balance, the
 * clamped conversion, the R40 unclamped ongoing taxable, the SS benefit, the resolved
 * filing regime), so a headroom derived from it is a CONSTANT inside the fixed point —
 * the same well-behavedness contract `bracketFillCeilings` already carries.
 */
export interface CommittedYearIncome {
  /** The forced pre-tax distribution (RMD) — ordinary income whether or not the fill reaches it. */
  readonly rmd: number
  /** The year's (feasibility-clamped) Roth conversion — ordinary income. */
  readonly conversion: number
  /** The unclamped ongoing other-income taxable entering `nonSSordinary` (R40 seam 2). */
  readonly ongoingTaxable: number
  /** The FULL Social-Security benefit for the year (the Pub-915 inclusion is derived here). */
  readonly ssBenefit: number
  readonly filing: FilingStatus
  readonly count65: number
  /** The sim year's CALENDAR year (`startCalendarYear + t`) — windows the senior bonus
   *  inside the deduction stack (the sunset unit, council 2026-07-09). Gross-independent
   *  like every other term, so the headroom stays a constant inside the fixed point. */
  readonly calendarYear: number
}

// Bisection controls — the fail-loud discipline mirrors the ACA solver's (burned/062):
// 64 halvings shrink any realistic bracket far below a cent; a non-converged solve THROWS.
const LANDSCAPE_MAX_PASSES = 64
const LANDSCAPE_EPSILON = 1e-6 // dollars

/** Ordinary income (excl. SS inclusion) at discretionary pre-tax fill `f` — the fill model's
 *  one nonlinearity below the RMD: `max(f, rmd)` (a fill under the forced RMD is free). */
function ordinaryAtFill(c: CommittedYearIncome, f: number): number {
  return Math.max(f, c.rmd) + c.conversion + c.ongoingTaxable
}

/** ACA-MAGI at fill `f`: ordinary + the FULL SS benefit (the §36B add-back counts the whole
 *  benefit) — LINEAR in `f` above the RMD, no Pub-915 coupling. Realized gain modeled 0 at
 *  the cap (the fill model above). */
export function acaMagiAtFill(c: CommittedYearIncome, f: number): number {
  return ordinaryAtFill(c, f) + c.ssBenefit
}

/** IRMAA-MAGI at fill `f`: ordinary + the TAXABLE SS portion (Pub 915 — no full-benefit
 *  add-back). Monotone non-decreasing, continuous, piecewise-linear in `f` (the same
 *  smoothness the gross-up contraction rests on). */
export function irmaaMagiAtFill(c: CommittedYearIncome, f: number): number {
  const ord = ordinaryAtFill(c, f)
  return ord + taxableSocialSecurity(ord, c.ssBenefit, c.filing)
}

/** Federal TAXABLE income at fill `f`: AGI (= IRMAA-MAGI at gain 0) less the full deduction
 *  stack evaluated at that AGI (INSIDE the senior bonus's 2025–2028 window its phase-out
 *  makes the deduction shrink as the fill grows — slope ≈ 1.06 in the phase-out band, and 0
 *  while the deduction still shelters everything; OUTSIDE the window the stack is flat —
 *  std + age-65 only). Monotone non-decreasing in `f` in every year. */
export function taxableIncomeAtFill(c: CommittedYearIncome, f: number): number {
  const agi = irmaaMagiAtFill(c, f)
  return Math.max(0, agi - deductionStack(c.filing, c.count65, agi, c.calendarYear))
}

/**
 * The largest fill `f ∈ [0, hi]` keeping a monotone non-decreasing `metric` at-or-under
 * `rail`, by bisection. The caller guarantees `metric(0) ≤ rail` (the baseline check) and
 * supplies an `hi` PROVEN to cross (`metric(hi) > rail`) — a violated bound is a caller
 * bug surfaced loudly, never a silent +Infinity (burned/062, the mis-split symmetry).
 */
function largestFillWithin(metric: (f: number) => number, rail: number, hi: number): number {
  if (!(metric(hi) > rail)) {
    throw new Error(
      `[magiLandscape] largestFillWithin: the upper bound ${hi} does not cross the rail ${rail} — ` +
        `the caller's crossing bound is wrong (burned/062: refuse a mis-bracketed solve)`,
    )
  }
  let a = 0 // invariant: metric(a) ≤ rail
  let b = hi // invariant: metric(b) > rail
  for (let pass = 0; pass < LANDSCAPE_MAX_PASSES; pass++) {
    const mid = (a + b) / 2
    if (metric(mid) <= rail) a = mid
    else b = mid
    if (b - a < LANDSCAPE_EPSILON) return a // the known-good side (under-fills by < ε, never over)
  }
  throw new Error(
    `[magiLandscape] largestFillWithin did not converge in ${LANDSCAPE_MAX_PASSES} passes ` +
      `(rail=${rail}, hi=${hi}) — refusing an unconverged headroom (burned/062)`,
  )
}

/**
 * The ACA-cliff rail: the largest discretionary pre-tax fill keeping ACA-MAGI at-or-under
 * `cliffMagi` (400% FPL × the household's guideline dollar — the caller derives it from the
 * ACTIVE table + living count, and calls this ONLY in a year the overlay actually prices ACA
 * under the cliff regime; insight 027 — the predicate lives with the hazard creator).
 *
 * CLOSED FORM (ACA counts the FULL SS benefit, so the metric is linear above the RMD):
 * `K = cliffMagi − conversion − ongoingTaxable − ssBenefit`; committed-over (even a zero fill
 * lands over, `rmd > K`) ⇒ 0; else the headroom IS `K`. Sitting exactly AT the cliff is
 * eligible (IRC §36B is 100–400% INCLUSIVE; the engine's CEIL-quantized compare admits an
 * integer-cliff-exact MAGI — insight 012, `ceil(x) > N ⟺ x > N` on the integer grid).
 */
export function acaCliffFillHeadroom(c: CommittedYearIncome, cliffMagi: number): number {
  if (!Number.isFinite(cliffMagi) || cliffMagi <= 0) {
    throw new Error(`[magiLandscape] acaCliffFillHeadroom: cliffMagi must be finite > 0 (got ${cliffMagi}) — insight 010`)
  }
  const k = cliffMagi - c.conversion - c.ongoingTaxable - c.ssBenefit
  if (c.rmd > k) return 0 // committed income alone is over — nothing discretionary fits
  return k
}

/**
 * The IRMAA-step rail: the largest fill keeping THIS year's IRMAA-MAGI at-or-under the next
 * step threshold above the committed baseline (the bill lands at `t + magiLookbackYears`;
 * the caller owns the will-anyone-be-enrolled-then predicate and the filing column — this is
 * the current-tier-holding math only). Baseline already above every threshold (the frozen
 * top tier) ⇒ no next step ⇒ +Infinity (the rail does not bind). Landing exactly AT a
 * threshold is safe: the tier fires on `magi > threshold` (lower-bound-EXCLUSIVE, integer
 * dollars — insight 012's raw-compare contract).
 */
export function irmaaStepFillHeadroom(c: CommittedYearIncome, schedule: IrmaaSchedule): number {
  const baseline = irmaaMagiAtFill(c, 0)
  const next = nextIrmaaThresholdAbove(baseline, c.filing, schedule)
  if (next === null) return Number.POSITIVE_INFINITY
  // Crossing bound: irmaaMagi(f) ≥ ordinary(f) ≥ f, so f = next + 1 provably crosses.
  return largestFillWithin((f) => irmaaMagiAtFill(c, f), next, next + 1)
}

/**
 * The federal bracket-edge rail: the largest fill keeping TAXABLE income at-or-under the
 * next ordinary-bracket edge above the committed baseline. Baseline already in the open top
 * band ⇒ +Infinity. Landing exactly AT an edge is exact: the edge dollar itself is taxed at
 * the band's rate and the NEXT dollar at the next band's (the progressive schedule's
 * half-open `(prevEdge, upTo]` bands).
 */
export function bracketEdgeFillHeadroom(c: CommittedYearIncome): number {
  const baseline = taxableIncomeAtFill(c, 0)
  const edge = nextBracketEdgeAbove(baseline, c.filing)
  if (edge === null) return Number.POSITIVE_INFINITY
  // Crossing bound: taxable(f) ≥ AGI(f) − deduction(f) ≥ f − D₀, where D₀ (the stack at
  // MAGI 0, THIS year) is the deduction's MAXIMUM (the senior bonus only phases DOWN as
  // MAGI rises; in a post-sunset year D₀ is simply smaller) — so f = edge + D₀ + 1
  // provably crosses.
  const d0 = deductionStack(c.filing, c.count65, 0, c.calendarYear)
  return largestFillWithin((f) => taxableIncomeAtFill(c, f), edge, edge + d0 + 1)
}

// =========================================================================
// Landscape geometry — the readout's pure ingredients (consumed by the U11
// healthcare emission at the empirical median-MAGI anchor).
// =========================================================================

/** The 400%-FPL cliff dollar for the ACTIVE table (`null` under the enhanced regime — no
 *  cliff exists). DERIVED (`cliffFplFraction × fplDollar`), never re-typed (§8). */
export function cliffMagiFor(table: AcaApplicablePercentageTable, fplDollar: number): number | null {
  if (!Number.isFinite(fplDollar) || fplDollar <= 0) {
    throw new Error(`[magiLandscape] cliffMagiFor: fplDollar must be finite > 0 (got ${fplDollar}) — insight 010`)
  }
  return table.cliffFplFraction !== null ? table.cliffFplFraction * fplDollar : null
}

/** The next IRMAA step threshold at-or-above `magi` for the filing column, or `null` when
 *  `magi` already sits above every tier (the frozen top tier). `magi` exactly AT a threshold
 *  returns THAT threshold (the tier fires only strictly above it — the next dollar crosses). */
export function nextIrmaaThresholdAbove(magi: number, filing: FilingStatus, schedule: IrmaaSchedule): number | null {
  if (!Number.isFinite(magi)) {
    throw new Error(`[magiLandscape] nextIrmaaThresholdAbove: magi must be finite (got ${magi}) — insight 010`)
  }
  for (const tier of schedule.tiers) {
    const threshold = filing === 'mfj' ? tier.mfjMagiThreshold : tier.singleMagiThreshold
    if (magi <= threshold) return threshold
  }
  return null
}

/** The next IRMAA step above `magi`: its threshold + the PER-PERSON MONTHLY surcharge jump
 *  crossing it costs (the delta between the tier just over the threshold and the tier at
 *  `magi` — read through the ONE canonical tier lookup, never a re-typed table). `null` when
 *  no step remains. The caller multiplies by the enrolled count × 12 (never a flat ×2). */
export function nextIrmaaStep(
  magi: number,
  filing: FilingStatus,
  schedule: IrmaaSchedule,
): { readonly threshold: number; readonly surchargeDeltaMonthlyPerPerson: number } | null {
  const threshold = nextIrmaaThresholdAbove(magi, filing, schedule)
  if (threshold === null) return null
  return {
    threshold,
    surchargeDeltaMonthlyPerPerson:
      irmaaTierSurchargeMonthly(threshold + 1, filing, schedule) - irmaaTierSurchargeMonthly(magi, filing, schedule),
  }
}

/** The marginal ordinary rate on the NEXT taxable dollar at `taxableIncome` (the band the
 *  next dollar lands in — at an edge exactly, the NEXT band's rate). */
export function marginalOrdinaryRate(taxableIncome: number, filing: FilingStatus): number {
  if (!Number.isFinite(taxableIncome)) {
    throw new Error(`[magiLandscape] marginalOrdinaryRate: taxableIncome must be finite (got ${taxableIncome}) — insight 010`)
  }
  const t = Math.max(0, taxableIncome)
  for (const band of bracketsFor(filing)) {
    if (band.upTo === null || t < band.upTo) return band.rate
  }
  // Unreachable with a well-formed schedule (the last band is open) — fail loud, never 0%
  // (a phantom 0% marginal rate is the cost-understating direction; burned/062).
  throw new Error('[magiLandscape] marginalOrdinaryRate: no bracket matched — malformed schedule (burned/062)')
}

/** The next ordinary-bracket edge at-or-above `taxableIncome`, or `null` in the open top
 *  band. An income exactly AT an edge returns that edge (the next dollar crosses it). */
export function nextBracketEdgeAbove(taxableIncome: number, filing: FilingStatus): number | null {
  if (!Number.isFinite(taxableIncome)) {
    throw new Error(`[magiLandscape] nextBracketEdgeAbove: taxableIncome must be finite (got ${taxableIncome}) — insight 010`)
  }
  const t = Math.max(0, taxableIncome)
  for (const band of bracketsFor(filing)) {
    if (band.upTo !== null && t <= band.upTo) return band.upTo
  }
  return null
}

/** The PTC lost per additional MAGI dollar at `magi` (the subsidy phase-out drag), measured
 *  over a $1,000 forward step through the SAME sliding-scale the overlay prices with —
 *  single producer, so the readout can never disagree with the engine's own PTC. Floored at
 *  0 (past the point the credit is exhausted there is nothing left to lose). NOTE: this is
 *  the SMOOTH drag only — the cliff is a separate, explicitly-rendered step, never averaged
 *  into a slope (insight 062: a discontinuity smeared into a mean stops being visible). */
export function subsidyLossPerDollar(
  magi: number,
  slcspAnnual: number,
  fplDollar: number,
  table: AcaApplicablePercentageTable,
): number {
  const STEP = 1_000
  const here = slidingScalePtc(magi, slcspAnnual, fplDollar, table)
  const there = slidingScalePtc(magi + STEP, slcspAnnual, fplDollar, table)
  return Math.max(0, (here - there) / STEP)
}
