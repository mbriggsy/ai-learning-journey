/**
 * Other income in retirement (R40) — the intake-side COMPILE (Unit 2). Maps the persisted per-person
 * `IncomeStream` entities into the engine's two-variant `PersonIncomeStream` leaf (KTD-2/4/6/8). The
 * engine is a DUMB consumer of the compiled vectors (KTD-3); all the COLA/deflation, the start-clamp +
 * sim-year-0 anchor (KTD-8b), the discriminated-union → effective-taxable-fraction derivation (KTD-6),
 * and the per-stream SURVIVOR pre-weighting (KTD-4) happen HERE, once.
 *
 * Runs ONCE in `buildParams` — income is Y-invariant (KTD-8a), so the date-search never recompiles it.
 * Allocation here is fine (it is NOT the per-path hot loop — that is the engine's zero-alloc select, U3).
 *
 * Decisions: docs/decisions/other-income-r40.md. Requirements: product §7 (R40.1–R40.10).
 */
import type { IncomeParams, IncomeStream, PersonIncomeStream } from '@shared/model'

/** Does the vector carry any non-zero entry? (The `nonZero` DROP — an all-zero variant is OMITTED, so
 *  absence is the reduce-to-spine signal, never a zero-filled array. Borrowed from the contribution
 *  compile; KTD-2 says borrow only this.) */
const hasSignal = (v: readonly number[]): boolean => v.some((x) => x !== 0)

/** The effective TAXABLE fraction of a stream (KTD-6 — derived from the `type`-keyed union, never a
 *  redundant persisted field). pension/rental/other ⇒ `taxableFraction ?? 1` (the conservative fully-
 *  taxable default; an entered `< 1` is the DISCLOSED-optimistic basis-recovery opt-in). alimony ⇒
 *  post-2018 (or a pre-2019 instrument expressly modified to adopt the post-2018 rules) ⇒ 0 (not taxable,
 *  MAGI-invisible), else 1. annuity ⇒ qualified ⇒ 1, non-qualified ⇒ `1 − exclusionFraction`. */
export function effectiveTaxableFraction(s: IncomeStream): number {
  switch (s.type) {
    case 'pension':
    case 'rental':
    case 'other':
      return s.taxableFraction ?? 1
    case 'alimony':
      return s.executedAfter2018 || s.modifiedAdoptsPost2018Rules === true ? 0 : 1
    case 'annuity':
      return s.qualified ? 1 : 1 - s.exclusionFraction
  }
}

/** One stream's REAL gross at sim-year `t` (KTD-2). `real-flat` holds the real value (a deterministic,
 *  zero-variance curve — the U6/D2 band floor). `nominal-flat`/`fixed-pct` grow at the (0 / `colaPct`)
 *  NOMINAL rate then DEFLATE by the deterministic inflation point estimate; the exponent is the ABSOLUTE
 *  sim-year `t` anchored at t=0 (KTD-8b), never the stream's elapsed age — so an already-receiving stream
 *  reads exactly `annualRealToday` at t=0. The caller gates the paying-year window [startOffset, lastT].
 *
 *  A `fixed-pct` stream MUST carry a finite `colaPct` (intake + U8 codec enforce it). A corrupt absent/
 *  non-finite value fails loud as `NaN` at EVERY `t` — checked EXPLICITLY, not left to the power, because
 *  `x ** 0 === 1` for any `x` (even NaN): the power form would LAUNDER the corruption into a clean
 *  `annualRealToday` at sim-year 0 (and an already-receiving SINGLE-year stream would carry no NaN at
 *  all), silently modeling it as non-eroding nominal-flat — the optimistic-erosion direction the cardinal
 *  rule forbids. The NaN propagates to the engine's finiteness-FIRST `validateParams` gate (U3, insights
 *  008/010), never a silent coerce-to-0. */
function grossAtYear(s: IncomeStream, t: number, inflationMean: number): number {
  if (s.colaMode === 'real-flat') return s.annualRealToday
  const cola = s.colaMode === 'fixed-pct' ? s.colaPct : 0
  if (cola === undefined || !Number.isFinite(cola)) return NaN // fail loud at EVERY t (no t=0 laundering)
  return s.annualRealToday * ((1 + cola) / (1 + inflationMean)) ** t
}

/** Compile the persisted other-income streams into the engine's per-person two-variant leaf (R40).
 *  Returns `undefined` when there is NO income — no streams, or every compiled vector is all-zero (a $0
 *  or already-ended stream) — the reduce-to-spine signal (R40.6): the caller OMITS `OverlayParams.income`,
 *  byte-identical to the no-income spine.
 *
 *  @param streams        the household's persisted streams (each `ownerIndex`-tagged).
 *  @param currentAges    person `i`'s age at sim-year 0 (aligned to `people`; gates the start clamp).
 *  @param horizonYears   the vector length (the engine's per-year ABSOLUTE-sim-year index).
 *  @param inflationMean  the DETERMINISTIC inflation point estimate — the market's `inflation.mean`,
 *                        read from the single-sourced methodology constant, never re-typed (KTD-2). */
export function compileIncomeStreams(
  streams: readonly IncomeStream[],
  currentAges: readonly number[],
  horizonYears: number,
  inflationMean: number,
): IncomeParams | undefined {
  const n = currentAges.length
  // Per-person accumulators: FULL (owner alive) + per-stream-weighted SURVIVOR (owner dead, KTD-4).
  const acc = currentAges.map(() => ({
    grossFull: new Array<number>(horizonYears).fill(0),
    taxableFull: new Array<number>(horizonYears).fill(0),
    grossSurvivor: new Array<number>(horizonYears).fill(0),
    taxableSurvivor: new Array<number>(horizonYears).fill(0),
  }))

  for (const s of streams) {
    const p = s.ownerIndex
    // Defensive: an out-of-range owner is gated entity-side (intake + U8 codec, `ownerIndex ∈ {0,1}`);
    // it contributes nothing here rather than throwing inside the pure compile.
    if (p < 0 || p >= n) continue
    const currentAge = currentAges[p]!
    const a = acc[p]!
    const effFrac = effectiveTaxableFraction(s)
    const startOffset = Math.max(0, s.startAge - currentAge) // KTD-8b: already-receiving clamps to t=0
    // `endAge` is the OWNER's age the stream STOPS (its last paying year); ABSENT ≡ lifetime (DND-009).
    const lastOffset = s.endAge === undefined ? horizonYears - 1 : s.endAge - currentAge
    const lastT = Math.min(lastOffset, horizonYears - 1)
    for (let t = startOffset; t <= lastT; t += 1) {
      const gross = grossAtYear(s, t, inflationMean)
      const survivorGross = gross * s.survivorPct // per-STREAM survivor weight (KTD-4), never a FULL reweight
      a.grossFull[t]! += gross
      a.taxableFull[t]! += gross * effFrac
      a.grossSurvivor[t]! += survivorGross
      a.taxableSurvivor[t]! += survivorGross * effFrac
    }
  }

  const incomeByPerson: PersonIncomeStream[] = acc.map((a) => ({
    ...(hasSignal(a.grossFull) ? { grossFull: a.grossFull } : {}),
    ...(hasSignal(a.taxableFull) ? { taxableFull: a.taxableFull } : {}),
    ...(hasSignal(a.grossSurvivor) ? { grossSurvivor: a.grossSurvivor } : {}),
    ...(hasSignal(a.taxableSurvivor) ? { taxableSurvivor: a.taxableSurvivor } : {}),
  }))

  // Reduce-to-spine: a household with no live gross anywhere ⇒ no income construct. `grossFull`/
  // `grossSurvivor` drive the netting; a MAGI-invisible stream (post-2018 alimony: gross > 0, taxable 0)
  // is correctly still present via its gross.
  const anyIncome = incomeByPerson.some(
    (leaf) => leaf.grossFull !== undefined || leaf.grossSurvivor !== undefined,
  )
  return anyIncome ? { incomeByPerson } : undefined
}
