/**
 * Range bounds for a user-enterable fixed-pct COLA rate (`colaPct`) — the grounded ceiling the U8
 * ultramode review left deliberately unguessed (docs/insights/049) and the Council of Elders settled
 * 2026-07-01 (docs/council-log.md, conf 9/10, no veto).
 *
 * WHY A GROUNDED CONSTANT, NOT A [0,1] GATE. The sibling multiplied-away scalars
 * (survivorPct/taxableFraction/exclusionFraction) get a clean [0,1] gate because a FRACTION has a
 * definitional bound. `colaPct` is a RATE — no definitional ceiling — so its bound is a domain
 * judgment that must be GROUNDED, never a plausible-default guess (projects/burned/docs/insights/062).
 *
 * WHY IT'S LOAD-BEARING (the SOLE defense). A `colaMode:'fixed-pct'` stream compiles to a
 * deterministic, SEEDLESS per-year overlay `annualRealToday * ((1+colaPct)/(1+inflationMean))^t`
 * (src/engine/reference/otherIncome.ts:51-56). Because it lifts every Monte-Carlo path's income floor
 * IDENTICALLY, the confidence fan is structurally BLIND to an over-optimistic in-range COLA — it
 * narrows toward success, never widens to flag it. So this range gate is the ONLY thing standing
 * between a mis-entered 30%/yr (~$689M/yr by year 40, under the engine's $1e12 finiteness cap) and a
 * calm-but-wrong "work-optional today, 10 of 10" — the cardinal sin, optimistic direction.
 *
 * This ceiling is a GENEROUS gross-mis-entry PLAUSIBILITY bound (PIA-style), NOT a never-deplete or
 * "a COLA tracks inflation" guarantee. Both gates (the restore codec + the intake form) read THIS
 * constant and never re-type it (a dated figure is never inlined twice — burned/057/061/063; drift is
 * insight 020). A source-bind test asserts `COLA_PCT_MAX >= inflationMean` so a future inflation re-pin
 * can never silently un-ground the raw ceiling.
 */

export interface CitedBound {
  readonly value: number
  readonly citation: string
}

/**
 * Max sustained fixed-pct nominal COLA. WRITTEN AS THE LITERAL `0.05` so `parsePercent('5') === 0.05`
 * exactly (fields.tsx:172, `5/100` is the same IEEE-754 double as the literal) — a real 5% annuity
 * rider clears the INCLUSIVE `<= 0.05` with zero float risk, so 0.05's false-reject set is empty.
 */
export const COLA_PCT_MAX: CitedBound = {
  value: 0.05,
  citation:
    'Council of Elders 2026-07-01 (docs/council-log.md): SSA COLA history (long-run mean ~2.6%; the 14.3%/1980 one-off is a realized-CPI spike modeled real-flat, never entered as a fixed rate); FERS/CSRS/military COLA caps (<= CPI); the most generous commercial annuity fixed-increase riders ~5%. A generous plausibility ceiling above every real fixed-nominal COLA, below the ~0.2-0.5 never-deplete band.',
}

/**
 * Floor: the mathematical minimum keeping `(1 + colaPct) >= 0` so the overlay factor stays finite —
 * turning an engine overlay crash into a calm codec `corrupt` (insight 027). `[-1, 0)` is ALLOWED: a
 * nominally-decaying stream is conservative (the NON-sin direction), so it is admitted, never floored
 * to 0. Negatives are un-enterable at intake (parsePercent rejects a leading minus), so this floor
 * only guards a tampered blob at the codec.
 */
export const COLA_PCT_MIN: CitedBound = {
  value: -1,
  citation:
    'Council of Elders 2026-07-01: the mathematical minimum for a finite (1 + colaPct) overlay factor; a decaying stream is conservative, so [-1, 0) is admitted rather than floored to 0.',
}

/** A fixed-pct COLA rate within the grounded band (inclusive at both ends). Caller checks finiteness
 *  FIRST (insights 008/010 — a NaN passes every relational compare). */
export const colaRateInRange = (v: number): boolean => v >= COLA_PCT_MIN.value && v <= COLA_PCT_MAX.value
