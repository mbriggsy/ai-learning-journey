/**
 * The Social Security benefit sub-engine — PURE (a deterministic function of the
 * household's PIAs + claim ages + birth years; reads NO clock/entropy/env). It turns
 * the user-entered PIA (benefit at FRA) into the ACTUAL real benefit the cash seam
 * consumes: the claim-age-adjusted OWN benefit + the Method C SPOUSAL EXCESS.
 * Survivor §202 (RIB-LIM, lock-flat reduction) is a sibling function added next.
 *
 * See `docs/plans/2026-06-14-001-feat-ss-spousal-survivor-subengine-plan.md` §3/§4.
 *
 * EXACTNESS (the load-bearing implementation choice): every factor is an INTEGER
 * rational `{num, denom}` (derived from the POMS per-month fractions in
 * `@engine/constants`), and the SSA monthly dime-rounding is done in INTEGER CENTS.
 * A naive float `pia × 0.7` then `Math.floor(×10)/10` would round 699.9999… DOWN to
 * 699.90 — a $0.10/mo error in the OPTIMISTIC-on-the-floor direction is exactly the
 * calm-but-wrong sin. Integer cents makes 0.7000×$1000 land on $700.00 exactly.
 */
import {
  workerReduction,
  spouseReduction,
  delayedRetirementCredit,
  spousalRate,
  survivorReduction,
  ribLim,
  fraMonthsForBirthYear,
  type PerMonthRate,
  type ReductionSchedule,
} from './constants'

/** A benefit factor as an exact integer rational (avoids float drift; the dime-round
 *  in {@link applyFactorAnnual} is exact). */
interface Factor {
  readonly num: number
  readonly denom: number
}

/** One person's annual benefit, split so the seam can time the pieces independently:
 *  `ownAnnual` starts at the own-claim offset; `spousalExcessAnnual` is GATED by the
 *  seam to start at max(own-claim, higher-earner-claim) and end at the worker's death
 *  (plan §7). The pure layer computes the AMOUNTS; the seam owns the timing. */
export interface PersonBenefit {
  readonly ownAnnual: number
  readonly spousalExcessAnnual: number
}

/** Inputs for one person (a slice of the model — annual PIA, whole-year claim age,
 *  birth year). PIA is the real, today's-dollar benefit at FRA. */
export interface BenefitPerson {
  readonly piaAnnual: number
  readonly claimAge: number
  readonly birthYear: number
}

/** The integer reciprocal of "numerator/denominator of 1% per month" — the per-month
 *  reduction is `1/result` of PIA (e.g. 5/9 of 1% → 180; 25/36 of 1% → 144). The
 *  sourced rates make this exact (the shape test pins them); a future non-integer
 *  rate would be caught here. */
const perMonthReciprocal = (rate: PerMonthRate): number => {
  const r = (rate.denominator * 100) / rate.numerator
  if (!Number.isInteger(r)) {
    throw new Error(`[ssBenefit] per-month rate ${rate.numerator}/${rate.denominator} of 1% is not an integer reciprocal (${r})`)
  }
  return r
}

/** The two-segment pre-FRA reduction factor for `n` whole months early (n ≥ 1):
 *  `(firstDenom − n)/firstDenom`, then `(base − (n − firstMonths))/laterDenom` where
 *  `base = laterDenom × (firstDenom − firstMonths)/firstDenom`. Worker (5/9) yields
 *  exactly 168/240 = 0.70 at n=60; spouse (25/36) yields 156/240 = 0.65. */
const reductionFactor = (schedule: ReductionSchedule, n: number): Factor => {
  const firstDenom = perMonthReciprocal(schedule.firstRate)
  const laterDenom = perMonthReciprocal(schedule.laterRate)
  if (n <= schedule.firstMonths) return { num: firstDenom - n, denom: firstDenom }
  const base = (laterDenom * (firstDenom - schedule.firstMonths)) / firstDenom
  if (!Number.isInteger(base)) {
    throw new Error(`[ssBenefit] reduction base ${base} not integer — the schedule's segment-boundary factor must be exact`)
  }
  return { num: base - (n - schedule.firstMonths), denom: laterDenom }
}

/** The own-benefit factor for a worker claiming at `claimAge` (whole years) given
 *  their `birthYear` (→ FRA). Early = the worker reduction schedule; after FRA = the
 *  delayed-retirement credit (8%/yr, capped at age 70). A pre-`bornFromYear` birth on
 *  the DELAYED path throws (the step-down rate is unsourced — never default to 8%). */
const ownFactor = (claimAge: number, birthYear: number): Factor => {
  const fraMonths = fraMonthsForBirthYear(birthYear, 'retirement')
  const n = fraMonths - claimAge * 12
  if (n === 0) return { num: 1, denom: 1 }
  if (n > 0) return reductionFactor(workerReduction.value, n)
  const drc = delayedRetirementCredit.value
  if (birthYear < drc.bornFromYear) {
    throw new Error(
      `[ssBenefit] delayed-retirement credit rate is sourced only for births ${drc.bornFromYear}+ (got ${birthYear}) — the pre-${drc.bornFromYear} step-down rate is unsourced; no default (burned/062)`,
    )
  }
  const monthsDelayed = Math.min(-n, drc.throughAge * 12 - fraMonths)
  const denom = drc.ratePerMonth.denominator * 100
  return { num: denom + drc.ratePerMonth.numerator * monthsDelayed, denom }
}

/** The spousal-EXCESS reduction factor. Early = the SPOUSE schedule (25/36 — distinct
 *  from the worker's 5/9). At or after FRA the factor is 1 (NO delayed credits ever
 *  accrue to the spousal piece — it is flat past FRA, RS 00615.690). */
const spousalExcessFactor = (claimAge: number, birthYear: number): Factor => {
  const n = fraMonthsForBirthYear(birthYear, 'retirement') - claimAge * 12
  if (n <= 0) return { num: 1, denom: 1 }
  return reductionFactor(spouseReduction.value, n)
}

/** Apply a benefit factor to an annual PIA and return the annual benefit, with the
 *  SSA MONTHLY dime-round (down to the next lower $0.10, POMS RS 00615.101) done in
 *  exact INTEGER CENTS, then ×12. Throws on a non-finite/negative piaAnnual. The result
 *  is never negative: every caller passes a NON-negative factor (claim ages are
 *  domain-guarded to the [62, 70] RIB window, the spousal excess is pre-floored at 0, and
 *  the survivor/RIB-LIM factors are ≥ 0). */
const applyFactorAnnual = (piaAnnual: number, factor: Factor): number => {
  if (!Number.isFinite(piaAnnual) || piaAnnual < 0) {
    throw new Error(`[ssBenefit] piaAnnual must be a finite non-negative real dollar amount (got ${piaAnnual})`)
  }
  const annualCents = Math.round(piaAnnual * 100)
  // monthly benefit (pre-round) cents = annualCents × num / (denom × 12); dime-floor:
  const monthlyDimeCents = Math.floor((annualCents * factor.num) / (factor.denom * 12 * 10)) * 10
  return (monthlyDimeCents * 12) / 100
}

/** The statutory RIB claim window: earliest eligibility 62 (42 U.S.C. §402(a)) through the
 *  delayed-credit ceiling (`delayedRetirementCredit.throughAge` = 70, single-sourced). A claim
 *  age OUTSIDE it fails loud — below 62 the two-segment reduction extrapolates UNBOUNDED (a deep
 *  pre-62 age drives the factor numerator negative → a NEGATIVE benefit dollar, the cardinal
 *  calm-but-wrong direction), and no credit accrues past 70. Finite / INTEGER / range triad,
 *  mirroring `fraMonthsForBirthYear` + `catchUpForAge` (insights 010/020; burned/062 — a NaN
 *  passes every relational guard, so finiteness is checked FIRST). */
const EARLIEST_CLAIM_AGE = 62 // 42 U.S.C. §402(a) — earliest RIB eligibility
const assertClaimAge = (claimAge: number): void => {
  const latest = delayedRetirementCredit.value.throughAge
  if (!Number.isFinite(claimAge) || !Number.isInteger(claimAge) || claimAge < EARLIEST_CLAIM_AGE || claimAge > latest) {
    throw new Error(
      `[ssBenefit] claimAge must be a finite INTEGER in [${EARLIEST_CLAIM_AGE}, ${latest}] (the RIB claim window; got ${claimAge}) — outside it the reduction schedule extrapolates to a negative benefit (insights 010/020; burned/062)`,
    )
  }
}

/** A worker's own claim-age-adjusted ANNUAL benefit (no spousal). PIA=0 ⇒ 0 (the
 *  reduce-to-spine zero). `adjustOwnBenefitAnnual` is the claim-age CHOKEPOINT — every own and
 *  spousal claim age (household, single-person, and the survivor's deceased) routes through it,
 *  so the one `assertClaimAge` here guards them all. */
export const adjustOwnBenefitAnnual = (piaAnnual: number, claimAge: number, birthYear: number): number => {
  assertClaimAge(claimAge)
  return applyFactorAnnual(piaAnnual, ownFactor(claimAge, birthYear))
}

const assertFinite = (x: number, label: string): void => {
  if (!Number.isFinite(x)) throw new Error(`[ssBenefit] ${label} must be finite (got ${x}) — insight 010`)
}

/**
 * The household benefit AMOUNTS (own + Method C spousal excess) per person, pre-gating.
 *
 * Method C (POMS RS 00615.020): the lower earner is paid their REDUCED OWN benefit IN
 * FULL plus a SEPARATELY-reduced spousal EXCESS = `reduce_spouse(0.50·H.pia − L.pia)`
 * — NOT `max(own, spousal)` (which under-credits a dual earner who claims early). The
 * spousal base is the HIGHER earner's UNREDUCED PIA; the excess is floored at 0 (an
 * earner whose own PIA ≥ 50% of the higher PIA gets own only). Deemed filing collapses
 * each person to ONE claim age driving both pieces (both cohorts are post-1954, §5).
 *
 * Returns `spousalExcessAnnual` separately so the seam can gate its start (the higher
 * earner must have filed) and end (the worker's death) — plan §7.
 */
export const householdBenefits = (people: readonly BenefitPerson[]): readonly PersonBenefit[] => {
  if (people.length === 0) return []
  if (people.length > 2)
    throw new Error(
      `[ssBenefit] householdBenefits serves a couple (≤ 2 people); got ${people.length} — a 3+-person array would credit multiple simultaneous spousal excesses on the single highest record (physically impossible). Fail loud, never a silent multi-spousal household (burned/062).`,
    )
  people.forEach((p, i) => {
    assertFinite(p.piaAnnual, `people[${i}].piaAnnual`)
    assertClaimAge(p.claimAge)
    if (p.piaAnnual < 0) throw new Error(`[ssBenefit] people[${i}].piaAnnual must be ≥ 0 (got ${p.piaAnnual})`)
  })
  // The higher earner (spousal is paid on THEIR record). Ties resolve to the first —
  // immaterial, since an equal-PIA spouse's excess floors to 0 either way.
  let higher = people[0]!
  for (const p of people) if (p.piaAnnual > higher.piaAnnual) higher = p

  return people.map((p): PersonBenefit => {
    const ownAnnual = adjustOwnBenefitAnnual(p.piaAnnual, p.claimAge, p.birthYear)
    const spousalBase = spousalRate.value * higher.piaAnnual
    const excessFull = spousalBase - p.piaAnnual
    const spousalExcessAnnual =
      p === higher || excessFull <= 0 ? 0 : applyFactorAnnual(excessFull, spousalExcessFactor(p.claimAge, p.birthYear))
    return { ownAnnual, spousalExcessAnnual }
  })
}

/**
 * The §202 survivor (widow/er) ANNUAL benefit a survivor receives on the deceased's
 * record, for a stream that STARTS at `survivorStartAge` (the seam passes the locked
 * `max(60, age-at-first-death)` and holds the result FLAT — plan §6). Composition:
 *
 *  1. survivorFull = the deceased's adjusted benefit (DRCs flow through automatically,
 *     since we feed the adjusted figure — RS 00615.301/.702). If the deceased claimed
 *     reduced RIB BEFORE their FRA, RIB-LIM caps it at the GREATER of 82.5% of the
 *     death PIA or that actual reduced benefit (RS 00615.320 — a "larger-of", 82.5% a
 *     floor not a haircut).
 *  2. age reduction — LOCK-FLAT: 100% at survivor-FRA grading to (1 − maxReductionPct)
 *     at age 60, the factor fixed at `survivorStartAge` (NO post-claim ramp; a ramp
 *     would optimistically overstate the early-widowhood floor — the calm-but-wrong sin).
 *
 * Both steps run through the exact integer-cents dime-round. Survivor-FRA is keyed
 * SEPARATELY from retirement-FRA (coincides at 67 for the 1962+ cohorts). PIA 0 ⇒ 0.
 */
export const survivorBenefitAnnual = (
  deceased: BenefitPerson,
  survivorBirthYear: number,
  survivorStartAge: number,
): number => {
  assertFinite(deceased.piaAnnual, 'deceased.piaAnnual')
  assertClaimAge(deceased.claimAge) // closes the silent-NaN leak: a NaN claimedEarly comparison (:193) would otherwise pass
  if (!Number.isFinite(survivorStartAge) || !Number.isInteger(survivorStartAge))
    throw new Error(`[ssBenefit] survivorStartAge must be a finite whole year (got ${survivorStartAge}) — insights 010/020`)
  if (deceased.piaAnnual < 0) throw new Error(`[ssBenefit] deceased.piaAnnual must be ≥ 0 (got ${deceased.piaAnnual})`)

  const deceasedAdjusted = adjustOwnBenefitAnnual(deceased.piaAnnual, deceased.claimAge, deceased.birthYear)
  const claimedEarly = deceased.claimAge * 12 < fraMonthsForBirthYear(deceased.birthYear, 'retirement')
  const floorMilli = Math.round(ribLim.value.floorPctOfDeathPia * 1000)
  const survivorFull = claimedEarly
    ? Math.max(applyFactorAnnual(deceased.piaAnnual, { num: floorMilli, denom: 1000 }), deceasedAdjusted)
    : deceasedAdjusted

  const survivorFra = fraMonthsForBirthYear(survivorBirthYear, 'survivor')
  const earliestMonths = survivorReduction.value.earliestAge * 12
  const startMonths = Math.max(survivorStartAge * 12, earliestMonths) // aged WIB from 60 (DWB-50 deferred)
  if (startMonths >= survivorFra) return survivorFull // 100% at/after survivor-FRA, no reduction
  const span = survivorFra - earliestMonths
  const monthsEarly = survivorFra - startMonths
  const reductionMilli = Math.round(survivorReduction.value.maxReductionPct * 1000)
  // factor = 1 − maxReductionPct × monthsEarly/span, as an exact integer rational.
  return applyFactorAnnual(survivorFull, { num: 1000 * span - reductionMilli * monthsEarly, denom: 1000 * span })
}
