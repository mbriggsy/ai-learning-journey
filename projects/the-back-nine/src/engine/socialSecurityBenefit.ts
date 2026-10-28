/**
 * The Social Security benefit sub-engine — PURE (a deterministic function of the
 * household's PIAs + claim ages + birth years; reads NO clock/entropy/env). It turns
 * the user-entered PIA (benefit at FRA) into the ACTUAL real benefit the cash seam
 * consumes: the claim-age-adjusted OWN benefit + the Method C SPOUSAL EXCESS.
 * Survivor §202 (the lock-flat age reduction, then RIB-LIM) is the sibling `survivorBenefitAnnual`.
 *
 * See `docs/decisions/ss-computation.md` §3/§4 (own + spousal) and §6 (survivor).
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

/** A count of CREDITING months (the earnings test's months withheld, 42 U.S.C. §402(q)(7)) must be a
 *  whole number from 0 to the benefit's own reduction months: the adjusted reduction period is the
 *  reduction period less those months, and a benefit paid with no reduction has none to remove. More
 *  credits than months early would drive the factor past 1 — a raise the law never pays. */
const assertCredits = (credits: number, reductionMonths: number, label: string): void => {
  const most = Math.max(0, reductionMonths)
  if (!Number.isInteger(credits) || credits < 0 || credits > most) {
    throw new Error(
      `[ssBenefit] ${label} must be a whole number of months in [0, ${most}] (the benefit's months early; got ${credits}) — §402(q)(7)`,
    )
  }
}

/** The CREDITED (adjusted-reduction-factor) factor for a benefit claimed `n` months early with
 *  `credits` of those months withheld under the earnings test: the same two-segment schedule recomputed
 *  on n − credits months (POMS RS 00615.490 B.1: "Determine crediting months. Subtract from original
 *  reduction factor. Apply result to PIA (or unreduced spouse's benefit)"; the §402(q)(10) ratio
 *  method is the pre-1978 provision and is not used). n − credits = 0 gives exactly 1. */
const creditedFactor = (schedule: ReductionSchedule, n: number, credits: number, label: string): Factor => {
  assertCredits(credits, n, label)
  return reductionFactor(schedule, n - credits)
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
 *  so the one `assertClaimAge` here guards them all.
 *
 *  `credits` (default 0) is the earnings test's crediting months on this benefit (the pay check's
 *  KTD10): the benefit recomputed with that many months taken out of its early-claim reduction, the
 *  amount paid from the recompute on (the CALLER owns when: the year after full retirement age for the
 *  worker's own benefit; the cap's "if alive" figure for a deceased). Only an early claim can carry
 *  credits. 0 takes exactly the uncredited path. */
export const adjustOwnBenefitAnnual = (
  piaAnnual: number,
  claimAge: number,
  birthYear: number,
  credits: number = 0,
): number => {
  assertClaimAge(claimAge)
  if (credits === 0) return applyFactorAnnual(piaAnnual, ownFactor(claimAge, birthYear))
  const n = fraMonthsForBirthYear(birthYear, 'retirement') - claimAge * 12
  return applyFactorAnnual(piaAnnual, creditedFactor(workerReduction.value, n, credits, 'own-benefit credits'))
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
 *
 * `credits` (optional, index-aligned) carries each person's earnings-test crediting months on each
 * benefit (the pay check's KTD10; POMS RS 00615.482 B.3: "grant ARFs separately on each record"):
 * the own benefit and the spousal excess are each recomputed on their own schedule with those months
 * removed. Absent — or 0 for a benefit — takes exactly the uncredited arithmetic. A person with no
 * spousal excess can carry no spousal credits.
 */
export const householdBenefits = (
  people: readonly BenefitPerson[],
  credits?: readonly BenefitCredits[],
): readonly PersonBenefit[] => {
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
  if (credits !== undefined && credits.length !== people.length) {
    throw new Error(`[ssBenefit] credits must be index-aligned to people (${credits.length} for ${people.length})`)
  }
  // The higher earner (spousal is paid on THEIR record). Ties resolve to the first —
  // immaterial, since an equal-PIA spouse's excess floors to 0 either way.
  let higher = people[0]!
  for (const p of people) if (p.piaAnnual > higher.piaAnnual) higher = p

  return people.map((p, i): PersonBenefit => {
    const c = credits?.[i]
    const ownAnnual = adjustOwnBenefitAnnual(p.piaAnnual, p.claimAge, p.birthYear, c?.own ?? 0)
    const spousalBase = spousalRate.value * higher.piaAnnual
    const excessFull = spousalBase - p.piaAnnual
    const spousalCredits = c?.spousal ?? 0
    if (p === higher || excessFull <= 0) {
      if (spousalCredits !== 0) {
        throw new Error(`[ssBenefit] people[${i}] has no spousal excess, so it can carry no spousal credits (got ${spousalCredits})`)
      }
      return { ownAnnual, spousalExcessAnnual: 0 }
    }
    const spousalExcessAnnual =
      spousalCredits === 0
        ? applyFactorAnnual(excessFull, spousalExcessFactor(p.claimAge, p.birthYear))
        : applyFactorAnnual(
            excessFull,
            creditedFactor(
              spouseReduction.value,
              fraMonthsForBirthYear(p.birthYear, 'retirement') - p.claimAge * 12,
              spousalCredits,
              `people[${i}] spousal credits`,
            ),
          )
    return { ownAnnual, spousalExcessAnnual }
  })
}

/** One person's earnings-test crediting months, by benefit (see {@link householdBenefits}). */
export interface BenefitCredits {
  /** Months the person's OWN retirement benefit was withheld before full retirement age. */
  readonly own: number
  /** Months the person's spousal benefit (the excess, on the higher earner's record) was withheld
   *  before the person's own full retirement age — by either spouse's earnings. */
  readonly spousal: number
}

/** The widow(er) benefit's earnings-test credits (see {@link survivorBenefitAnnual}). */
export interface SurvivorCredits {
  /** Months the widow(er) benefit itself was withheld before survivor FRA, in effect for this year
   *  (20 CFR 404.412(b): the adjustment is made at 62 and again at full retirement age). */
  readonly widow: number
  /** The deceased's months withheld on their OWN benefit while alive and before their FRA, in effect
   *  for the RIB-LIM cap this year — 0 until the deceased's would-be FRA has passed (42 U.S.C.
   *  §402(e)(2)(D)(i), "if such individual were still living"; POMS RS 00615.320 B.2.c, RS 00615.598). */
  readonly deceased: number
}

/**
 * The §202 survivor (widow/er) ANNUAL benefit a survivor receives on the deceased's
 * record, for a stream that STARTS at `survivorStartAge` (the seam passes the locked
 * `max(60, age-at-first-death)` and holds the result FLAT — `docs/decisions/ss-computation.md`
 * §6). Composition, in the law's order (POMS RS 00615.320 A.3; 42 U.S.C. §402(e)(2)(D) /
 * (f)(2)(D) — "after application of subsection (q)"), every amount read off ONE PIA floored
 * to the dime (the comment at `piaDime`):
 *
 *  1. full rate = 100% of the deceased's PIA, plus their DRCs when they claimed at or
 *     after FRA (`deceasedAdjusted` carries them — RS 00615.301/.702, RS 00615.322 A/B).
 *     A deceased who claimed early carries no DRCs, so the full rate is the PIA itself,
 *     never their reduced benefit.
 *  2. age reduction — LOCK-FLAT: 100% at survivor-FRA grading to (1 − maxReductionPct)
 *     at age 60, the factor fixed at `survivorStartAge` (NO post-claim ramp; a ramp
 *     would optimistically overstate the early-widowhood floor — the calm-but-wrong sin).
 *  3. RIB-LIM, AFTER step 2 and only when the deceased claimed reduced RIB before their
 *     FRA: the reduced benefit is capped at the GREATER of 82.5% of the death PIA or the
 *     deceased's reduced benefit as if alive (RS 00615.320 — a "larger-of", 82.5% a floor
 *     within the cap, not a haircut). payable = min(reduced, max(82.5% × PIA, RIB)). The
 *     RS 00615.322 D worksheet is the oracle (its chart is pinned row by row in the tests).
 *     Until 2026-10-27 the cap came FIRST and the capped figure was reduced — on a
 *     dime-multiple PIA never above the law, and below it whenever the survivor started
 *     before survivor-FRA; on a PIA with odd cents the raw-PIA cap ran up to a dime high, and
 *     a deceased's delayed-credit full rate, read off the raw PIA too, up to two dimes high.
 *
 * Every step runs through the exact integer-cents dime-round. Survivor-FRA is keyed
 * SEPARATELY from retirement-FRA (coincides at 67 for the 1962+ cohorts). PIA 0 ⇒ 0.
 *
 * `credits` (optional — the pay check's KTD10) carries the earnings test's credits in effect this
 * year, each entering where the law puts it: the widow(er)'s own withheld months come out of step 2's
 * months early (the linear 28.5 % schedule at monthsEarly − credits), and the deceased's withheld
 * months raise step 3's "if alive" benefit (their own reduction at n − credits). A credit raises the
 * age-reduced benefit only until the cap binds (POMS RS 00615.585 B.3), which the min() below does
 * by itself. Absent, or both 0, takes exactly the uncredited arithmetic.
 */
export const survivorBenefitAnnual = (
  deceased: BenefitPerson,
  survivorBirthYear: number,
  survivorStartAge: number,
  credits?: SurvivorCredits,
): number => {
  assertFinite(deceased.piaAnnual, 'deceased.piaAnnual')
  assertClaimAge(deceased.claimAge) // closes the silent-NaN leak: a NaN in the `claimedEarly` comparison below would otherwise pass
  if (!Number.isFinite(survivorStartAge) || !Number.isInteger(survivorStartAge))
    throw new Error(`[ssBenefit] survivorStartAge must be a finite whole year (got ${survivorStartAge}) — insights 010/020`)
  if (deceased.piaAnnual < 0) throw new Error(`[ssBenefit] deceased.piaAnnual must be ≥ 0 (got ${deceased.piaAnnual})`)

  // ONE PIA for all three amounts below. A real PIA is a whole number of dimes (Social Security Act §215(a),
  // 42 U.S.C. §415(a): "round … to the next lower multiple of $0.10" — FR Doc. 2025-19763), and a typed one may
  // carry odd cents, so it is floored once here. With the cap's 82.5% or RIB off the raw figure and the full rate
  // off the floored one, the cap sat a dime above the law, and the reorder pays the cap itself before survivor-FRA
  // (rosy); a delayed-credit full rate off the raw figure ran up to two dimes high. The own-benefit path still
  // reads the raw PIA: the register's *A typed Social Security amount with odd cents is never rounded to the dime…*.
  const piaDime = applyFactorAnnual(deceased.piaAnnual, { num: 1, denom: 1 })
  const deceasedAdjusted = adjustOwnBenefitAnnual(piaDime, deceased.claimAge, deceased.birthYear)
  const claimedEarly = deceased.claimAge * 12 < fraMonthsForBirthYear(deceased.birthYear, 'retirement')
  const fullRate = claimedEarly ? piaDime : deceasedAdjusted

  const survivorFra = fraMonthsForBirthYear(survivorBirthYear, 'survivor')
  const earliestMonths = survivorReduction.value.earliestAge * 12
  const startMonths = Math.max(survivorStartAge * 12, earliestMonths) // aged WIB from 60 (DWB-50 deferred)
  const span = survivorFra - earliestMonths
  const widowCredits = credits?.widow ?? 0
  if (widowCredits !== 0) assertCredits(widowCredits, survivorFra - startMonths, 'widow(er) credits')
  const monthsEarly = survivorFra - startMonths - widowCredits
  const reductionMilli = Math.round(survivorReduction.value.maxReductionPct * 1000)
  // factor = 1 − maxReductionPct × monthsEarly/span, as an exact integer rational; 100% at/after survivor-FRA.
  const reduced =
    startMonths >= survivorFra
      ? fullRate
      : applyFactorAnnual(fullRate, { num: 1000 * span - reductionMilli * monthsEarly, denom: 1000 * span })
  const deceasedCredits = credits?.deceased ?? 0
  if (!claimedEarly) {
    if (deceasedCredits !== 0) {
      throw new Error(`[ssBenefit] a deceased who did not claim early has no reduction to credit (got ${deceasedCredits} credits)`)
    }
    return reduced
  }

  const floorMilli = Math.round(ribLim.value.floorPctOfDeathPia * 1000)
  // The deceased's benefit "if such individual were still living" (§402(e)(2)(D)(i)): their reduced
  // benefit, recomputed without the months the earnings test withheld while they lived once their
  // actual or would-be FRA has passed (the caller passes 0 before then).
  const ribIfAlive =
    deceasedCredits === 0
      ? deceasedAdjusted
      : adjustOwnBenefitAnnual(piaDime, deceased.claimAge, deceased.birthYear, deceasedCredits)
  const ribLimCap = Math.max(applyFactorAnnual(piaDime, { num: floorMilli, denom: 1000 }), ribIfAlive)
  return Math.min(reduced, ribLimCap)
}

/**
 * The deceased worker's REALIZED claim age, for computing the survivor base on a Monte-Carlo path
 * where death can precede the household's PLANNED claim age. A worker cannot file after death, so a
 * deceased who died before reaching their planned claim age realized ONLY the credits they lived to
 * earn — never the full delayed-retirement credit of a claim they never made. The seam feeds the
 * result as `BenefitPerson.claimAge` to {@link survivorBenefitAnnual}, so the existing claimed-early
 * (RIB-LIM) / delayed-credit logic then applies to the REALIZED age, not the planned one.
 *
 * The SSA rule the survivor base must honor (20 CFR §404.313, POMS RS 00615.301/.690):
 *  - died at/after the planned claim ⇒ they FILED as planned ⇒ realized = planned (DRCs/reduction as entered).
 *  - died BEFORE the planned claim (never filed):
 *      · before FRA ⇒ survivor base = the FULL PIA (NO early-claim reduction — death is not a filing);
 *      · at/after FRA ⇒ PIA + DRCs accrued only THROUGH the month of death (never to the later planned age).
 *
 * Implemented as `max(min(planned, ageAtDeath), ⌊FRA⌋)`: capping at ageAtDeath strips the unearned
 * credits, and the FRA floor keeps an unfiled pre-FRA death from picking up a spurious early-claim
 * reduction (so it lands on the full PIA). For a WHOLE-YEAR FRA — both shipped cohorts are FRA 67 —
 * this is EXACT; a fractional-FRA cohort floors to ⌊FRA⌋, a sub-one-year CONSERVATIVE (never
 * optimistic — a small reduction in the safe direction) residual. The result is an integer in the
 * [62, 70] RIB window by construction (planned∈[62,70], ageAtDeath≥66 on any sampled path,
 * ⌊FRA⌋∈[65,67]), so `assertClaimAge` downstream is satisfied.
 */
export const realizedClaimAgeAtDeath = (plannedClaimAge: number, deceasedBirthYear: number, ageAtDeath: number): number => {
  if (ageAtDeath >= plannedClaimAge) return plannedClaimAge // filed as planned (lived to claim)
  const fraFloorYears = Math.floor(fraMonthsForBirthYear(deceasedBirthYear, 'retirement') / 12)
  return Math.max(Math.min(plannedClaimAge, ageAtDeath), fraFloorYears)
}
