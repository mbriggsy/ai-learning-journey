/**
 * RMD divisor + start-age — the ONE producer (U16 §S1, re-homed from `taxOverlay.ts` so the live
 * solve-request anchor deriver (`solver/solveAnchor.ts`) and the per-path engine (`taxOverlay.ts`)
 * read the SAME forced-distribution math, never two drifting copies. The move is a single-producer
 * source-bind (never a re-typed table): the U16 builder must derive the year-0 RMD to anchor the
 * conversion grid + place the pretax-headroom legality filter, and re-deriving the SECURE-2.0 start
 * age or the Pub-590-B divisors in a render-layer builder would re-open exactly the drift the ONE
 * LAW forbids.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment. Every figure is READ from
 * `@engine/constants` (the canonical year-keyed tables — architecture §8; burned/063), never
 * re-typed here. This module is a LEAF over the constants data only, so the main-thread solve
 * builder can import it without dragging the tax engine into the entry bundle.
 */
import { rmdStartAge, uniformLifetimeTableDivisors, jointLifeLastSurvivorTable, singleLifeTable } from '@engine/constants'

// The Uniform Lifetime Table as an O(1) lookup, derived once from the canonical constant —
// the max age is the published "120 and over" terminal bucket; any older age clamps to it
// (derived from the table, never an inlined 120, so the single-source grep cannot trip).
const ULT_DIVISOR_BY_AGE: ReadonlyMap<number, number> = new Map(
  uniformLifetimeTableDivisors.value.map((row) => [row.age, row.divisor]),
)
const ULT_MAX_AGE = uniformLifetimeTableDivisors.value.reduce((max, row) => Math.max(max, row.age), 0)

// The Joint Life & Last Survivor grid (Pub 590-B Table II), read once from the canonical
// constant. Used only for the >10yr-younger sole-spouse RMD (gap ≥ 11) — see selectRmdDivisor.
const JLLS = jointLifeLastSurvivorTable.value

/** The SECURE-2.0 RMD start age for a LIVING member's birth-year cohort (72 / 73 / 75), read from the
 *  canonical band table. The age-75 band carries `effectiveFrom 2033`, but anyone born
 *  1960+ reaches 75 in 2035+, so the date is always satisfied for the reachable population.
 *
 *  It has no birth half, so every birth of 1949 or earlier reads the 70½ band's 70.5 (U11, 2026-11-27), the second
 *  half of 1949 included, where the law says 72. That moves no living result: such a member is 77 or older in every
 *  plan year from 2026, past both 70.5 and 72, so each `age < start` test reads the same, and `conversionWindowFor`'s
 *  `Math.max(1, …)` floors the runway either way. The condition is load-bearing: a member below 72 who read 70.5 would
 *  reach the Uniform Lifetime lookup below its first row, which throws. A dead owner's date reads the band with its
 *  half through {@link requiredBeginningYear}. */
export function rmdStartAgeForBirthYear(birthYear: number): number {
  for (const band of rmdStartAge.value) {
    if (band.bornThrough === null || birthYear <= band.bornThrough) return band.age
  }
  throw new Error('rmdStartAge has no open-ended terminal band')
}

/**
 * The calendar year of an owner's required beginning date: April 1 of the year after the owner reaches the applicable
 * age (26 CFR 1.401(a)(9)-2(b)(2); for an IRA, 1.408-8(b)(1)(i): the 5-percent owner's rule, with no later-retirement
 * deferral). An inherited IRA reads it for the dead owner: whether the death fell before or after this date decides
 * whether the heir owes yearly minimums (the Act 5 plan's KTD23 names the primaries).
 *
 * `bornFirstHalf` (born January to June) is read only where the law draws its line by date:
 *  - for a 1949 birth it picks the band: before July 1, 1949 is the 70½ band (-2(b)(2)(ii)), on or after it is 72;
 *  - inside the 70½ band it picks the year 70½ is reached, six calendar months after the 70th birthday
 *    (-6(g)(1)(iv)): a first-half birth reaches it in the year of the 70th birthday, a second-half birth the next year.
 * Missing where it is needed, the call throws: a guessed half can move the date a year either way.
 */
export function requiredBeginningYear(birthYear: number, bornFirstHalf?: boolean): number {
  const needHalf = (): boolean => {
    if (bornFirstHalf === undefined) {
      throw new Error(`requiredBeginningYear: a ${birthYear} birth needs its birth half (the law draws this line by date)`)
    }
    return bornFirstHalf
  }
  for (const band of rmdStartAge.value) {
    if (band.bornThrough !== null && birthYear > band.bornThrough) continue
    if (band.bornThroughFirstHalf === true && birthYear === band.bornThrough && !needHalf()) continue
    const wholeYears = Math.floor(band.age)
    const reachedYear = band.age === wholeYears ? birthYear + wholeYears : birthYear + wholeYears + (needHalf() ? 0 : 1)
    return reachedYear + 1
  }
  throw new Error('rmdStartAge has no open-ended terminal band')
}

// The Single Life Table (Pub 590-B Table I), read once from the canonical constant: an inherited IRA's divisor.
const SLT = singleLifeTable.value

/** One person's life expectancy at `age` from the Single Life Table (26 CFR 1.401(a)(9)-9(b)): the source's own row,
 *  and every age past its last row ("120+") clamps to it. A negative or fractional age has no row and throws. */
export function singleLifeExpectancy(age: number): number {
  if (!Number.isInteger(age) || age < 0) throw new Error(`no Single Life Table row for age ${age}`)
  const value = SLT.byAge[Math.min(age, SLT.lastAge)]
  if (value === undefined) throw new Error(`no Single Life Table row for age ${age}`)
  return value
}

/** The Uniform Lifetime Table divisor for a distribution-year age (Pub 590-B Table III).
 *  Age ≥ the terminal bucket clamps to it (2.0). Below the table's first row (72) throws —
 *  an RMD is not due there, so the lookup is never reached for a real distribution year. */
function uniformLifetimeDivisor(age: number): number {
  const divisor = ULT_DIVISOR_BY_AGE.get(Math.min(age, ULT_MAX_AGE))
  if (divisor === undefined) {
    throw new Error(`no Uniform Lifetime divisor for age ${age} (table starts at 72)`)
  }
  return divisor
}

/**
 * The Joint Life & Last Survivor distribution period (Pub 590-B Table II) for an owner aged
 * `ownerAge` whose sole-beneficiary spouse is aged `spouseAge` (>10yr younger, gap ≥ 11).
 * Both ages clamp into the stored owner-72..120 × younger-spouse rectangle: ages ≥ 120 hit
 * the "120 and over" terminal bucket (DND/009), and the spouse is clamped to the gap-11
 * rectangle boundary for the sim-unreachable >120 owner tail (where a clamped owner would
 * otherwise narrow the gap below 11) — at those terminal ages the divisor is ~2.0 either way.
 */
function jointLifeLastSurvivorDivisor(ownerAge: number, spouseAge: number): number {
  const owner = Math.min(Math.max(ownerAge, JLLS.minOwnerAge), JLLS.maxAge)
  const spouse = Math.min(Math.max(spouseAge, JLLS.minSpouseAge), owner - 11)
  const divisor = JLLS.byOwnerThenSpouse[owner]?.[spouse - JLLS.minSpouseAge]
  if (divisor === undefined) {
    throw new Error(`no Joint Life & Last Survivor divisor for owner ${ownerAge}, spouse ${spouseAge}`)
  }
  return divisor
}

/**
 * SEAM — the divisor for an owner's lifetime RMD (M6b). The Uniform Lifetime Table is the
 * default, EXCEPT when the sole beneficiary is a spouse MORE THAN 10 years younger (gap ≥
 * 11): then the IRS Joint Life & Last Survivor table (Pub 590-B Table II) applies and yields
 * a LARGER divisor → a SMALLER RMD (the age-gap relief this product exists to model — flat
 * ULT OVERSTATES forced income for an age-gapped couple and can invert a conversion ranking).
 * Exactly-10-younger stays on ULT (which already bakes in a hypothetical 10-yr-younger
 * beneficiary). In the couple model the spouse is the sole IRA beneficiary by assumption; the
 * caller passes the living spouse's age (or `undefined` for a single owner / no surviving
 * spouse → ULT).
 */
export function selectRmdDivisor(ownerAge: number, spouseAge?: number): number {
  if (spouseAge !== undefined && ownerAge - spouseAge > 10) {
    return jointLifeLastSurvivorDivisor(ownerAge, spouseAge)
  }
  return uniformLifetimeDivisor(ownerAge)
}
