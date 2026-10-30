/**
 * The Social Security earnings test (the working-year pay check — `docs/plans/features/
 * working-year-pay-check-build-spec.md`, R12–R15, KTD10, KTD11; U3): what a household is really
 * PAID in Social Security while someone works before full retirement age, and the months that
 * withholding is credited back later.
 *
 * PER PATH (one death timeline), for every sim year, it composes each living person's benefits by
 * RECORD — their own, the spousal excess on the higher earner's record, or, once a spouse has died,
 * the survivor year read from `survivorYearBenefit` (the one home of the §202 year; insight 081) —
 * then charges each working person's EXCESS EARNINGS against them, month by month:
 *  - Excess: $1 for every $2 of the year's gross wages above the lower exempt amount in a year wholly
 *    before the full-retirement-age (FRA) year; in that year, $1 for every $3 of the pre-FRA months'
 *    wages above the higher amount (42 U.S.C. §403(f)(3)), floored to the dollar. Wages only — never
 *    pensions, investment income or Social Security (§403(f)(5)).
 *  - An earner's excess is charged first against the FAMILY on their own record — their own benefit
 *    plus the spouse's spousal excess on it (§403(b)(1); 20 CFR 404.434(b)(1)) — over the EARNER's
 *    chargeable months, keyed on the earner's FRA and never the payee's (§403(f)(1)(B)): a spouse past
 *    FRA still loses months to a younger worker's excess, and earns no credit for them.
 *  - The month the excess runs out, the rest of that family's benefits is paid in proportion to each
 *    payee's benefit before the age, dual-entitlement and family-maximum reductions (404.439): the
 *    worker's PIA against the spouse's full spousal rate. Each share is capped at what that payee gets
 *    with no excess charged and floored to the dollar (404.304(f)). A share the cap trims is NOT re-paid
 *    to the other payee (gloomy until a primary says otherwise).
 *  - A beneficiary's own excess comes next, against only their own remaining benefits
 *    (404.434(b)(2)–(3); POMS RS 02501.095 B.4). A dead worker's earnings never withhold the widow(er)
 *    benefit (404.311(b); §403(b)(1)(B)). A survivor is tested on their own wages against the
 *    RETIREMENT FRA (§403(f)(9); POMS RS 02501.021 B.3).
 *  - Excess beyond the year's chargeable benefits is forgiven, never carried (POMS RS 02501.095 B.1).
 *  - Every month with a full or partial deduction is a CREDITING month for each benefit in the charged
 *    pool that month (POMS RS 00615.482 B.1–B.2 — the spouse's too, even when the partial month pays her
 *    share in full; on one person's two benefits, a deduction from her payment is a deduction from each,
 *    §403(b)(1)), and each benefit is later paid recomputed without those months (§402(q)(7)): the own
 *    and spousal benefits from the year after the PAYEE's FRA year; the widow(er) benefit at 62 and at
 *    survivor FRA (20 CFR 404.412(b)), counting only months before survivor FRA; the deceased's own
 *    months raise the RIB-LIM cap from the year after their actual or would-be FRA year (POMS
 *    RS 00615.320 B.2.c, RS 00615.598). Months withheld before the plan's first year are invisible.
 *
 * THE ANNUAL FRAME (KTD11). The engine pays a claim for every month of its claim year and holds no
 * birth month, so:
 *  - The attained age in sim year t is `currentAge + t` — the frame every Social Security gate this
 *    composes with uses (the claim, survivor eligibility at 60, the locked widow(er) start age); it is
 *    KTD10's calendar year − birth year under the model's documented `currentAge === startCalendarYear
 *    − birthYear` invariant (the schedule reads no calendar year, so an aged dev plant that breaks the
 *    invariant gets the same schedule as its unaged base).
 *  - The FRA year is the LAST calendar year the birth year's FRA can fall in (age 67 for every 1959+
 *    cohort). A year before it is tested at the lower amount. In it, the STOPGAP charges the most the
 *    year can hold back — the pre-FRA months of the latest birth month, `(FRA + 11) mod 12` (eleven for
 *    1960+, nine for 1959's 66y10m), of earnings above the higher amount at $1 for $3, against that many
 *    months — and credits none of them (gloomy; pinned so the filed birth-month ask sees it move).
 *  - In the FRA year, a benefit the engine PRICES AS BEGUN AT FRA — the payee's own claim made that
 *    year, or a widow(er) benefit that starts that year (both unreduced) — is not tested: the engine pays
 *    it from January, the rosy whole-year residual the plan discloses for a claim at FRA (KTD11, U9) and
 *    the birth-month ask closes. A benefit that began in an earlier year, or that begins this year but is
 *    priced as an EARLY claim (a spousal excess the other spouse's filing starts, reduced at the payee's
 *    own claim age), is tested. A survivor's chargeable amount there is what she was entitled to before
 *    FRA: the larger of her own and her widow(er) benefit, of those that qualify.
 *  - Credits count only from years CERTAINLY before FRA (before the earliest calendar year the FRA
 *    can fall in — the same year for every 1960+ cohort), so a credit can never exceed the benefit's
 *    months early. A year that might hold FRA (1959's age-66 year, reachable only on a plan that
 *    starts before 2026) is withheld at the lower amount and credits nothing: gloomy.
 *  - The year of death is the last year alive, a full twelve months (§403(f)(3)).
 *
 * PURE: a function of the path's inputs and the canonical constants; reads no clock, consumes no draw
 * (CRN-safe). A path the test never reaches returns the shared {@link NO_EARNINGS_TEST}; it allocates
 * no schedule arrays, but the scan that decides it does build its small per-path state. Fails loud on
 * a non-finite or out-of-range wage or benefit — never a silent $0 (burned/062).
 *
 * IMPORT CYCLE: `simulate.ts` imports this module (since A6, the pay check's check) and this module imports `simulate.ts`.
 * That is safe only while neither reads the other's bindings at module top level (both use them inside
 * functions); keep it so.
 */
import {
  earningsTestExemptAmounts,
  earningsTestWithholdingRates,
  fraMonthsForBirthYear,
  spousalRate,
} from '@engine/constants'
import { adjustOwnBenefitAnnual, householdBenefits, type BenefitCredits } from '@engine/socialSecurityBenefit'
import { ENGINE_MAX_DOLLAR, bothAliveYearBenefit, survivorYearBenefit, type PersonOffsets, type SurvivorYearCredits } from '@engine/simulate'
import type { PersonInputs } from '@shared/model'

const MONTHS = 12
/** The widow(er) benefit's first recompute (20 CFR 404.412(b)): "the month of attainment of age 62". */
const WIDOW_FIRST_RECOMPUTE_AGE = 62

/** One path's inputs — what {@link cashTermsForYear}-style callers already hold per path. */
export interface EarningsTestPath {
  readonly people: readonly PersonInputs[]
  /** From `personOffsetsFor(people)` — the derived own benefit and spousal excess the run pays. */
  readonly offsets: readonly PersonOffsets[]
  /** This path's death offsets: person i is alive in sim year t iff t < deathOffsets[i]. */
  readonly deathOffsets: readonly number[]
  readonly higherClaimOffset: number
  /** Every sim year the caller will read: the schedule covers t < horizonYears, and
   *  {@link socialSecurityPaid} throws on a read past it. */
  readonly horizonYears: number
}

/** One person's crediting months on each benefit, over the whole path. */
export interface CreditMonths {
  readonly own: number
  readonly spousal: number
  /** On the widow(er) benefit, before survivor FRA (the at-62 recompute uses those before 62). */
  readonly widow: number
}

/** The shared schedule of a path the earnings test never reaches: no living worker is owed a benefit
 *  in a year the test applies to. A caller pays its composed benefits unchanged. */
export interface NoEarningsTest {
  readonly tested: false
}

/** A path the earnings test reaches. Every array is indexed by sim year t < horizonYears. */
export interface EarningsTestYears {
  readonly tested: true
  /** The household's Social Security PAID in year t (real $): owed less withheld, credits included.
   *  With the pay check on, this IS the year's one Social Security figure in EVERY year, worked or
   *  retired (R11) — cash, taxable benefits and IRMAA-MAGI all read it, so withheld benefits are never
   *  taxed (R15) and a credit raises every later year. Read it through {@link socialSecurityPaid}. */
  readonly paid: Float64Array
  /** The household benefits the test held back in year t (real $, ≥ 0). */
  readonly withheld: Float64Array
  /** 1 where some of year t's withholding comes from a year that may hold FRA — the stopgap's most the
   *  year can hold back, so the figure is "at most" (the money picture's `'fraYearAtMost'`). */
  readonly fraYearAtMost: Uint8Array
  /** Why year t's held-back months do or do not raise a benefit later in THIS run, one bit per reason
   *  ({@link HELD_BACK_CREDITED}, {@link HELD_BACK_UNTIL_BIRTH_MONTH}, {@link HELD_BACK_PAST_FRA}); 0 where
   *  nothing is held back. On the crediting rule itself, so a month reads credited exactly when it counts
   *  in `creditMonths`. The money picture's held-back words read year 0's. */
  readonly heldBackCredit: Uint8Array
  /** Each person's crediting months over the path (each in effect from its own recompute year). */
  readonly creditMonths: readonly CreditMonths[]
}

/** A held-back month that is a crediting month for its benefit: it raises that benefit later. */
export const HELD_BACK_CREDITED = 1
/** A held-back month the run credits nothing only because its year may hold FRA — the earner's (the
 *  stopgap's charge marks no deduction month) or the payee's (KTD11) — where the law credits the pre-FRA
 *  months a birth month would place: gloomy, until the birth-month ask. */
export const HELD_BACK_UNTIL_BIRTH_MONTH = 2
/** A held-back month from a payee certainly past FRA all year, whom the law credits nothing (§402(q)(7)
 *  removes only months inside the reduction period): a spousal excess a younger worker's pay charges. */
export const HELD_BACK_PAST_FRA = 4

/** One held-back month of one benefit, classified. `deducted`: the month is a deduction month on that
 *  benefit (a charge in a year certainly before the EARNER's FRA); the frame pair is the PAYEE's for that
 *  benefit (survivor FRA for a widow(er) benefit). The crediting branch is the settle's own test. */
const heldBackReason = (deducted: boolean, age: number, creditBeforeAge: number, fraYearAge: number): number =>
  !deducted
    ? HELD_BACK_UNTIL_BIRTH_MONTH
    : age < creditBeforeAge
      ? HELD_BACK_CREDITED
      : age <= fraYearAge
        ? HELD_BACK_UNTIL_BIRTH_MONTH
        : HELD_BACK_PAST_FRA

export type EarningsTestSchedule = NoEarningsTest | EarningsTestYears

/** The one shared no-test schedule (frozen; allocated once). */
export const NO_EARNINGS_TEST: NoEarningsTest = Object.freeze({ tested: false as const })

/**
 * Year t's Social Security under the pay check (R11): the schedule's paid figure on a tested path, or
 * the figure the caller composed itself on a path the test never reaches. A read past the horizon the
 * schedule was built for throws — never an undefined figure, never a silent fall back to the
 * unwithheld one.
 */
export function socialSecurityPaid(schedule: EarningsTestSchedule, t: number, composed: number): number {
  if (!schedule.tested) return composed
  if (!Number.isInteger(t) || t < 0 || t >= schedule.paid.length) {
    throw new Error(`[earningsTest] year ${t} is outside the schedule's horizon (${schedule.paid.length} years) — build it for every year the caller reads`)
  }
  return schedule.paid[t]!
}

type TestKind = 'none' | 'before' | 'fraYear'

/** One person's fixed FRA frame, in whole years of attained age. */
interface PersonFrame {
  readonly fraMonths: number
  readonly survivorFraMonths: number
  /** The last age whose year the retirement FRA can fall in: the test's FRA year (the stopgap). */
  readonly fraYearAge: number
  /** The most pre-FRA months that year can hold (the latest birth month's): the stopgap's count. */
  readonly fraYearMonthsAtMost: number
  /** The first age whose year the retirement FRA can fall in: credits count only before it. */
  readonly creditBeforeAge: number
  /** The survivor-FRA pair, for the widow(er) benefit's crediting and its recompute. */
  readonly survivorFraYearAge: number
  readonly survivorCreditBeforeAge: number
}

const frameFor = (birthYear: number): PersonFrame => {
  const fraMonths = fraMonthsForBirthYear(birthYear, 'retirement')
  const survivorFraMonths = fraMonthsForBirthYear(birthYear, 'survivor')
  return {
    fraMonths,
    survivorFraMonths,
    fraYearAge: Math.floor((fraMonths + MONTHS - 1) / MONTHS),
    // A December birth reaches FRA (fraMonths + 11) months after the January it was born in: that
    // month's place in its calendar year is the count of pre-FRA months before it.
    fraYearMonthsAtMost: (fraMonths + MONTHS - 1) % MONTHS,
    creditBeforeAge: Math.floor(fraMonths / MONTHS),
    survivorFraYearAge: Math.floor((survivorFraMonths + MONTHS - 1) / MONTHS),
    survivorCreditBeforeAge: Math.floor(survivorFraMonths / MONTHS),
  }
}

const testKind = (frame: PersonFrame, age: number): TestKind =>
  age < frame.fraYearAge ? 'before' : age === frame.fraYearAge ? 'fraYear' : 'none'

/** The year's excess earnings in whole dollars (§403(f)(3); "reduced to the next lower multiple of
 *  $1"), in exact integer cents: wages are at most ENGINE_MAX_DOLLAR, so every product below stays
 *  far under 2^53. In the FRA year only the pre-FRA months' wages count (`preFraMonths` twelfths of a
 *  steady year's — wages count by the month earned, POMS RS 02501.080 B.2.b). */
const excessDollars = (wages: number, kind: 'before' | 'fraYear', preFraMonths: number): number => {
  const wageCents = Math.round(wages * 100)
  const amounts = earningsTestExemptAmounts.value
  const rates = earningsTestWithholdingRates.value
  if (kind === 'before') {
    const over = wageCents - amounts.lowerAnnual * 100
    return over <= 0 ? 0 : Math.floor((over * rates.beforeFraYear.withheld) / (rates.beforeFraYear.per * 100))
  }
  const over = preFraMonths * wageCents - MONTHS * amounts.higherAnnual * 100 // scaled by 12 to stay in integers
  return over <= 0 ? 0 : Math.floor((over * rates.fraYear.withheld) / (rates.fraYear.per * MONTHS * 100))
}

/** An annual benefit as whole monthly cents. The sub-engine dime-floors every monthly amount
 *  (`applyFactorAnnual`), so a twelfth is always a whole number of cents; anything else is a wiring
 *  fault. */
const monthlyCents = (annual: number, label: string): number => {
  const cents = Math.round(annual * 100)
  if (cents % MONTHS !== 0) {
    throw new Error(`[earningsTest] ${label} (${annual} a year) is not twelve whole monthly cents — the sub-engine's dime-round was bypassed`)
  }
  return cents / MONTHS
}

const floorToDollarCents = (cents: number): number => Math.floor(cents / 100) * 100

/** Takes up to `cut` cents off month `m` of one benefit's remaining amounts; returns what is left to cut. */
const takeFrom = (remaining: Float64Array, m: number, cut: number): number => {
  const take = Math.min(cut, remaining[m]!)
  remaining[m] = remaining[m]! - take
  return cut - take
}

const assertPath = (path: EarningsTestPath): void => {
  const { people, offsets, deathOffsets, horizonYears } = path
  if (people.length > 2) throw new Error(`[earningsTest] a household is one or two people (got ${people.length})`)
  if (offsets.length !== people.length || deathOffsets.length !== people.length) {
    throw new Error('[earningsTest] people, offsets and deathOffsets must be index-aligned')
  }
  if (!Number.isInteger(horizonYears) || horizonYears < 0) {
    throw new Error(`[earningsTest] horizonYears must be a whole number ≥ 0 (got ${horizonYears})`)
  }
  offsets.forEach((o, i) => {
    const w = o.earnedIncomeReal
    if (!Number.isFinite(w) || w < 0 || w > ENGINE_MAX_DOLLAR) {
      throw new Error(`[earningsTest] person ${i}'s wages must be finite, ≥ 0 and ≤ ENGINE_MAX_DOLLAR (got ${w}) — insight 010`)
    }
    for (const [label, x] of [['own benefit', o.socialSecurityReal], ['spousal excess', o.spousalExcessAnnual]] as const) {
      if (!Number.isFinite(x) || x < 0) throw new Error(`[earningsTest] person ${i}'s ${label} must be finite and ≥ 0 (got ${x})`)
    }
    if (!Number.isInteger(deathOffsets[i])) throw new Error(`[earningsTest] person ${i}'s death offset must be a whole year (got ${deathOffsets[i]})`)
  })
}

/**
 * One path's earnings-test schedule — see the module docblock for the law it follows. Returns
 * {@link NO_EARNINGS_TEST} when no living worker (t before their retire offset) is owed a benefit in a
 * year the test applies to.
 */
export function earningsTestSchedule(path: EarningsTestPath): EarningsTestSchedule {
  assertPath(path)
  const { people, offsets, deathOffsets, higherClaimOffset, horizonYears } = path
  const n = people.length
  const frames = people.map((p) => frameFor(p.birthYear))
  // A claim priced as early (reduced): the own benefit, and — under deemed filing, at the same claim
  // age — the spousal excess.
  const claimedEarly = people.map((p, i) => p.socialSecurityClaimAge * MONTHS < frames[i]!.fraMonths)

  // ---- Per-path state (the credit counters and the credited amounts, computed once when due). ----
  const ownCredits = [0, 0]
  const spousalCredits = [0, 0]
  const widowCredits = [0, 0]
  const widowCreditsBefore62 = [0, 0]
  const creditedOwn: (number | undefined)[] = [undefined, undefined]
  const creditedSpousal: (number | undefined)[] = [undefined, undefined]

  const ownAmount = (i: number, t: number): number => {
    const o = offsets[i]!
    if (ownCredits[i] === 0 || people[i]!.currentAge + t <= frames[i]!.fraYearAge) return o.socialSecurityReal
    // In effect from the year after the FRA year; every credit was earned in a year certainly before
    // FRA, so the count is final here.
    if (creditedOwn[i] === undefined) {
      const p = people[i]!
      creditedOwn[i] = adjustOwnBenefitAnnual(p.pia, p.socialSecurityClaimAge, p.birthYear, ownCredits[i])
    }
    return creditedOwn[i]!
  }
  const spousalAmount = (i: number, t: number): number => {
    const o = offsets[i]!
    if (spousalCredits[i] === 0 || people[i]!.currentAge + t <= frames[i]!.fraYearAge) return o.spousalExcessAnnual
    if (creditedSpousal[i] === undefined) {
      const credits: BenefitCredits[] = people.map((_, j) => ({ own: 0, spousal: j === i ? spousalCredits[i]! : 0 }))
      const benefitPeople = people.map((p) => ({ piaAnnual: p.pia, claimAge: p.socialSecurityClaimAge, birthYear: p.birthYear }))
      creditedSpousal[i] = householdBenefits(benefitPeople, credits)[i]!.spousalExcessAnnual
    }
    return creditedSpousal[i]!
  }

  // ---- One year's benefits by record. ----
  // Per person, the two pieces cash is paid in: the OWN piece (on their own record) and one AUX piece —
  // the spousal excess on the other spouse's record while both live, or the widow(er) benefit's part
  // above the survivor's own. Beside them, what the FRA-year rule needs: each benefit's start year and
  // whether it is priced as an early claim — and, in a survivor year, the widow(er) benefit itself.
  const ownA = [0, 0]
  const auxA = [0, 0]
  const ownStart = [0, 0]
  const auxStart = [0, 0]
  const auxEarly = [false, false]
  let auxIsWidow = false
  let widowPayable = 0
  let gross = 0

  const compose = (t: number): void => {
    ownA[0] = ownA[1] = auxA[0] = auxA[1] = 0
    let aliveCount = 0
    for (let i = 0; i < n; i++) if (t < deathOffsets[i]!) aliveCount++
    gross = 0
    auxIsWidow = false
    widowPayable = 0
    if (aliveCount === n) {
      // The same both-alive pieces cashTermsForYear sums (bothAliveYearBenefit, the one home of their
      // gates), at the credited amounts and summed in its order, so a year with nothing withheld and no
      // credit in effect pays the same float the run pays today (R18). A credit only exists for a piece
      // already paid in an earlier year, so reading the amounts before the gates reads nothing new.
      for (let i = 0; i < n; i++) {
        const pieces = bothAliveYearBenefit(t, offsets[i]!, higherClaimOffset, ownAmount(i, t), spousalAmount(i, t))
        gross += pieces.own
        gross += pieces.spousal
        ownA[i] = pieces.own
        auxA[i] = pieces.spousal
        ownStart[i] = pieces.ownStart
        auxStart[i] = pieces.spousalStart
        auxEarly[i] = claimedEarly[i]!
      }
      return
    }
    if (aliveCount !== 1 || n !== 2) return // a lone person's death or an all-dead year pays nothing
    const s = t < deathOffsets[0]! ? 0 : 1
    const d = 1 - s
    const sAge = people[s]!.currentAge + t
    const sFrame = frames[s]!
    const credits: SurvivorYearCredits = {
      survivorOwn: sAge > sFrame.fraYearAge ? ownCredits[s]! : 0,
      widow:
        sAge > sFrame.survivorFraYearAge
          ? widowCredits[s]!
          : sAge > WIDOW_FIRST_RECOMPUTE_AGE
            ? widowCreditsBefore62[s]!
            : 0,
      deceasedOwn: people[d]!.currentAge + t > frames[d]!.fraYearAge ? ownCredits[d]! : 0,
    }
    const anyCredit = credits.survivorOwn !== 0 || credits.widow !== 0 || credits.deceasedOwn !== 0
    const sy = survivorYearBenefit(t, people, offsets, deathOffsets, anyCredit ? credits : undefined)
    if (sy === undefined) return
    gross = sy.paid
    auxIsWidow = true
    widowPayable = sy.survivorEligible ? sy.survivorStream : 0
    ownStart[s] = offsets[s]!.claim
    auxStart[s] = Math.max(deathOffsets[d]!, 60 - people[s]!.currentAge) // the first year the widow(er) benefit is payable
    auxEarly[s] = sy.survivorStartAge * MONTHS < sFrame.survivorFraMonths
    if (sy.winner === 'own') ownA[s] = sy.paid
    else if (sy.winner === 'survivor') {
      ownA[s] = sy.ownStream
      auxA[s] = sy.paid - sy.ownStream
    }
  }

  /** Who works and is tested in year t. */
  const earnerKind = (i: number, t: number): TestKind => {
    if (!(t < deathOffsets[i]!) || !(t < offsets[i]!.retire)) return 'none'
    return testKind(frames[i]!, people[i]!.currentAge + t)
  }
  /** A benefit its payee's own excess can reach: any payable one in a year before the FRA year; in the
   *  FRA year, one that began in an earlier year or is priced as an early claim. */
  const qualifies = (amount: number, start: number, early: boolean, kind: TestKind, t: number): boolean =>
    amount > 0 && (kind === 'before' || (kind === 'fraYear' && (start < t || early)))
  /** Person i's chargeable benefits this year, in real $ a year: what their own excess can reach. Both
   *  pieces before the FRA year. In it: while both spouses live, the pieces that qualify, summed (her
   *  own and her spousal excess are paid side by side); for a survivor, the larger of her own and her
   *  widow(er) benefit, of those that qualify — before FRA she is paid the larger of the benefits she was
   *  entitled to then, never the widow(er) benefit's part above an own claim made at FRA. */
  const chargeableAnnual = (i: number, kind: TestKind, t: number): number => {
    if (kind === 'none') return 0
    if (kind === 'before') return ownA[i]! + auxA[i]!
    const ownQualifies = qualifies(ownA[i]!, ownStart[i]!, claimedEarly[i]!, kind, t)
    if (!auxIsWidow) {
      return (ownQualifies ? ownA[i]! : 0) + (qualifies(auxA[i]!, auxStart[i]!, auxEarly[i]!, kind, t) ? auxA[i]! : 0)
    }
    const widowQualifies = qualifies(widowPayable, auxStart[i]!, auxEarly[i]!, kind, t)
    return Math.max(ownQualifies ? ownA[i]! : 0, widowQualifies ? widowPayable : 0)
  }
  /** Whose record holds the other spouse's spousal excess this year (−1 if none). */
  const recordHolderOf = (i: number): number => (!auxIsWidow && n === 2 && auxA[i]! > 0 ? 1 - i : -1)

  const isTestedYear = (t: number): boolean => {
    for (let i = 0; i < n; i++) if (chargeableAnnual(i, earnerKind(i, t), t) > 0) return true
    return false
  }

  // ---- The fast path: scan the working years for one the test applies to. ----
  let lastWorkYear = -1
  for (let i = 0; i < n; i++) lastWorkYear = Math.max(lastWorkYear, Math.min(offsets[i]!.retire, deathOffsets[i]!) - 1)
  let firstTested = -1
  for (let t = 0; t <= Math.min(lastWorkYear, horizonYears - 1); t++) {
    compose(t)
    if (isTestedYear(t)) {
      firstTested = t
      break
    }
  }
  if (firstTested < 0) return NO_EARNINGS_TEST

  // ---- The tested pass, over the whole horizon (a credit raises every later year). ----
  const paid = new Float64Array(horizonYears)
  const withheld = new Float64Array(horizonYears)
  const fraYearAtMost = new Uint8Array(horizonYears)
  const heldBackCredit = new Uint8Array(horizonYears)
  const rate = spousalRate.value
  const remOwn = [new Float64Array(MONTHS), new Float64Array(MONTHS)]
  const remAux = [new Float64Array(MONTHS), new Float64Array(MONTHS)]
  const fullOwn = [0, 0]
  const fullAux = [0, 0]
  const dedOwn = [new Uint8Array(MONTHS), new Uint8Array(MONTHS)]
  const dedAux = [new Uint8Array(MONTHS), new Uint8Array(MONTHS)]

  for (let t = 0; t < horizonYears; t++) {
    compose(t)
    let withheldCents = 0
    let paidCents = 0
    if (t <= lastWorkYear && isTestedYear(t)) {
      for (let i = 0; i < n; i++) {
        fullOwn[i] = monthlyCents(ownA[i]!, `person ${i}'s own benefit`)
        fullAux[i] = monthlyCents(auxA[i]!, `person ${i}'s ${auxIsWidow ? 'widow(er)' : 'spousal'} benefit`)
        remOwn[i]!.fill(fullOwn[i]!)
        remAux[i]!.fill(fullAux[i]!)
        dedOwn[i]!.fill(0)
        dedAux[i]!.fill(0)
      }
      // The earner whose record holds a spousal excess goes first (§403(f)(1): the worker's excess is
      // charged before the excess of anyone entitled on the worker's record); otherwise index order.
      const lowerWithSpousal = n === 2 && recordHolderOf(1) >= 0 ? 1 : n === 2 && recordHolderOf(0) >= 0 ? 0 : -1
      const order = lowerWithSpousal >= 0 ? [1 - lowerWithSpousal, lowerWithSpousal] : n === 2 ? [0, 1] : [0]
      for (const e of order) {
        const kind = earnerKind(e, t)
        if (kind === 'none') continue
        const selfCap = monthlyCents(chargeableAnnual(e, kind, t), `person ${e}'s chargeable benefits`)
        // The other spouse's spousal excess on THIS earner's record — reachable only in a month the
        // earner is entitled to their own benefit before FRA (§403(b)(1)(B)).
        const q = n === 2 ? 1 - e : -1
        const ownQualifies = kind === 'before' ? ownA[e]! > 0 : qualifies(ownA[e]!, ownStart[e]!, claimedEarly[e]!, kind, t)
        const familyCharged = ownQualifies && q >= 0 && recordHolderOf(q) === e
        if (selfCap === 0 && !familyCharged) continue
        const preFraMonths = frames[e]!.fraYearMonthsAtMost
        let excessCents = excessDollars(offsets[e]!.earnedIncomeReal, kind, preFraMonths) * 100
        if (excessCents === 0) continue
        // Only a charge in a year certainly before the earner's FRA credits anything (KTD11).
        const credits = people[e]!.currentAge + t < frames[e]!.creditBeforeAge
        const months = kind === 'before' ? MONTHS : preFraMonths
        for (let m = 0; m < months && excessCents > 0; m++) {
          // The earner's own benefits this month: their chargeable amount, or what is left of it after an
          // earlier earner's charge — taken off the own piece first, then the other.
          const self = Math.min(selfCap, remOwn[e]![m]! + remAux[e]![m]!)
          const fam = familyCharged ? remAux[q]![m]! : 0
          const pool = self + fam
          if (pool === 0) continue
          if (!credits) fraYearAtMost[t] = 1
          else {
            if (self > 0 && remOwn[e]![m]! > 0) dedOwn[e]![m] = 1
            if (self > 0 && remAux[e]![m]! > 0) dedAux[e]![m] = 1
            if (fam > 0) dedAux[q]![m] = 1
          }
          if (excessCents >= pool) {
            excessCents -= pool
            takeFrom(remAux[e]!, m, takeFrom(remOwn[e]!, m, self))
            if (familyCharged) remAux[q]![m] = 0
            continue
          }
          const rest = pool - excessCents
          excessCents = 0
          if (fam > 0 && self > 0) {
            // The record holder is the higher earner, who has no spousal benefit of their own.
            if (remAux[e]![m]! > 0) throw new Error('[earningsTest] the earner whose record holds a spousal benefit carries one too — impossible under Method C')
            // 404.439: the family's rest, split worker PIA : spouse's full spousal rate, each share
            // capped at its unwithheld amount and floored to the dollar; a trimmed share is not re-paid.
            remOwn[e]![m] = remOwn[e]![m]! - self + floorToDollarCents(Math.min(rest / (1 + rate), self))
            remAux[q]![m] = floorToDollarCents(Math.min((rest * rate) / (1 + rate), fam))
          } else {
            // One payee: the rest floored to the dollar, taken off that payee's pieces in the pool, own
            // first (the split between one person's two benefits never reaches cash).
            const cut = pool - floorToDollarCents(rest)
            if (self > 0) takeFrom(remAux[e]!, m, takeFrom(remOwn[e]!, m, cut))
            else remAux[q]![m] = remAux[q]![m]! - cut
          }
        }
      }
      // Settle the year: what was held back, the crediting months it earned each benefit, and why each
      // held-back month does or does not raise a benefit later (on the same crediting rule, below).
      let reasons = 0
      for (let i = 0; i < n; i++) {
        const age = people[i]!.currentAge + t
        const frame = frames[i]!
        const auxCreditAge = auxIsWidow ? frame.survivorCreditBeforeAge : frame.creditBeforeAge
        const auxFraYearAge = auxIsWidow ? frame.survivorFraYearAge : frame.fraYearAge
        let ownMonths = 0
        let auxMonths = 0
        for (let m = 0; m < MONTHS; m++) {
          withheldCents += fullOwn[i]! - remOwn[i]![m]! + (fullAux[i]! - remAux[i]![m]!)
          paidCents += remOwn[i]![m]! + remAux[i]![m]!
          ownMonths += dedOwn[i]![m]!
          auxMonths += dedAux[i]![m]!
          if (remOwn[i]![m]! < fullOwn[i]!) reasons |= heldBackReason(dedOwn[i]![m]! === 1, age, frame.creditBeforeAge, frame.fraYearAge)
          if (remAux[i]![m]! < fullAux[i]!) reasons |= heldBackReason(dedAux[i]![m]! === 1, age, auxCreditAge, auxFraYearAge)
        }
        if (age < frame.creditBeforeAge) ownCredits[i] = ownCredits[i]! + ownMonths
        if (auxIsWidow) {
          if (age < frame.survivorCreditBeforeAge) widowCredits[i] = widowCredits[i]! + auxMonths
          if (age < WIDOW_FIRST_RECOMPUTE_AGE) widowCreditsBefore62[i] = widowCreditsBefore62[i]! + auxMonths
        } else if (age < frame.creditBeforeAge) spousalCredits[i] = spousalCredits[i]! + auxMonths
      }
      heldBackCredit[t] = reasons
    }
    withheld[t] = withheldCents / 100
    // A year with nothing held back pays the composed float itself — the run's own figure, bit for bit
    // (R18). A year with withholding pays its remaining months, summed in exact cents: owed − withheld
    // in floating point leaves a crumb (a year withheld in full read −3.6e-12).
    paid[t] = withheldCents === 0 ? gross : paidCents / 100
  }

  return {
    tested: true,
    paid,
    withheld,
    fraYearAtMost,
    heldBackCredit,
    creditMonths: people.map((_, i) => ({ own: ownCredits[i]!, spousal: spousalCredits[i]!, widow: widowCredits[i]! })),
  }
}
