/**
 * src/engine/inheritedRmd.ts: an inherited IRA's schedule, its one producer (the Act 5 plan's U12 and KTD21 to KTD25,
 * beside `rmd.ts`). For each calendar year it answers whether the heir owes a yearly minimum and at what divisor, and
 * which year is the ten-year end. The calendar-to-simulation translation happens here, once (`inheritedSchedule`).
 * Version 1's case only: a non-spouse heir who is not an eligible beneficiary, of a traditional IRA whose owner died in
 * 2020 or later; intake refuses every other case (KTD17).
 *
 * The rules, each from the regulation (26 CFR; KTD23 names the primaries, b9-9's two readers read them):
 *  - The ten-year end: everything left comes out by December 31 of the tenth calendar year after the death (-5(e)).
 *  - Death before the owner's required beginning date: no yearly minimum before that last year.
 *  - Death on or after it: a yearly minimum from the year after the death, the prior December 31 balance over the
 *    greater of the heir's and the owner's remaining life expectancy (-5(d)(1)(ii)). The heir's is the Single Life
 *    figure at the heir's age in the year after the death, less one for each calendar year elapsed since (-5(d)(3)(iii));
 *    the owner's is the figure at the owner's age in the death year, less one a year (-5(d)(3)(ii)). Never recalculated.
 *  - The waivers move nothing (KTD23): Notices 2022-53, 2023-54 and 2024-35 waived the excise only, so the count runs
 *    through the waived years ("each calendar year that has elapsed") and the end stays the death year plus ten.
 *  - The greater-of rule is ASSERTED: in version 1's case the heir is more than ten years younger and the table never
 *    rises with age, so the heir's figure always wins. A later build for an eligible beneficiary fails loudly here
 *    rather than inheriting the assumption.
 *  - The required beginning date is April 1 of `requiredBeginningYear` (U11), so a death in that year needs the
 *    household's "before April 1?" answer, and an owner born in 1948 or 1949 needs the birth half only where the half
 *    moves the answer. Missing where it decides, the call throws: a guess moves the schedule either way.
 *
 * Pure (`src/engine`): no clock, no entropy. The loop (U12) reads `inheritedMinimum` at the year's top, beside `rmd`.
 */
import { requiredBeginningYear, singleLifeExpectancy } from './rmd'

/** The first death year version 1 serves: the ten-year rule applies to deaths after 2019 (KTD17 refuses earlier). */
export const FIRST_TEN_YEAR_DEATH_YEAR = 2020

/** One inherited account's dead owner and its heir, as intake carries them (U13). */
export interface InheritedAccountOwner {
  readonly ownerBirthYear: number
  /** Born January to June. Read only where the law draws its line by date (an owner born in 1948 or 1949). */
  readonly ownerBornFirstHalf?: boolean
  readonly ownerDeathYear: number
  /** Did the owner die before April 1? Read only when the death fell in the required-beginning year. */
  readonly ownerDiedBeforeApril1?: boolean
  readonly heirBirthYear: number
}

/** One calendar year of the schedule. */
export type InheritedYear =
  /** No yearly minimum: the death year or earlier, or any year before the last when the owner died before the date. */
  | { readonly kind: 'no-minimum' }
  /** A yearly minimum: the year-top balance over `divisor` (at or below 1, the whole balance; `inheritedMinimum`). */
  | { readonly kind: 'minimum'; readonly divisor: number }
  /** The ten-year end: everything left comes out this year. */
  | { readonly kind: 'last' }
  /** After the last year: the account is empty. */
  | { readonly kind: 'closed' }

const NO_MINIMUM: InheritedYear = { kind: 'no-minimum' }
const LAST: InheritedYear = { kind: 'last' }
const CLOSED: InheritedYear = { kind: 'closed' }

function checkOwner(o: InheritedAccountOwner): void {
  for (const [name, v] of [
    ['ownerBirthYear', o.ownerBirthYear],
    ['ownerDeathYear', o.ownerDeathYear],
    ['heirBirthYear', o.heirBirthYear],
  ] as const) {
    if (!Number.isInteger(v)) throw new Error(`inheritedRmd: ${name} must be a whole calendar year (got ${v})`)
  }
  if (o.ownerDeathYear < FIRST_TEN_YEAR_DEATH_YEAR) {
    throw new Error(`inheritedRmd: a ${o.ownerDeathYear} death is before the ten-year rule (version 1 serves deaths from 2020)`)
  }
  if (o.ownerDeathYear < o.ownerBirthYear) throw new Error('inheritedRmd: the owner died before being born')
}

/** The ten-year end: the tenth calendar year after the death (-5(e)). */
export function inheritedLastYear(o: InheritedAccountOwner): number {
  checkOwner(o)
  return o.ownerDeathYear + 10
}

/** Which of the two date answers the rule reads for this owner, given the answers so far: the birth half where it moves
 *  the required beginning date across the death, and "before April 1?" where the death fell in the required-beginning
 *  year. `beforeApril1` is false while a needed half is still unknown (the year it would ask about is not known yet).
 *  The ONE home of when each is asked: `diedBeforeRequiredBeginningDate` reads it, and so do intake's questions (U13). */
export function inheritedOwnerAsks(o: Pick<InheritedAccountOwner, 'ownerBirthYear' | 'ownerBornFirstHalf' | 'ownerDeathYear'>): {
  readonly birthHalf: boolean
  readonly beforeApril1: boolean
} {
  const b = o.ownerBirthYear
  const death = o.ownerDeathYear
  // The half is read only where it moves the date: with it unknown, the date under each half bounds the answer.
  const years = [requiredBeginningYear(b, true), requiredBeginningYear(b, false)]
  const earliest = Math.min(...years)
  const latest = Math.max(...years)
  const birthHalf = earliest !== latest && death >= earliest && death <= latest
  if (birthHalf && o.ownerBornFirstHalf === undefined) return { birthHalf, beforeApril1: false }
  const year = birthHalf ? requiredBeginningYear(b, o.ownerBornFirstHalf) : earliest
  return { birthHalf, beforeApril1: !(death < earliest || death > latest) && death === year }
}

/** Did the owner die before their required beginning date (April 1 of `requiredBeginningYear`)? */
export function diedBeforeRequiredBeginningDate(o: InheritedAccountOwner): boolean {
  checkOwner(o)
  const b = o.ownerBirthYear
  const death = o.ownerDeathYear
  const asks = inheritedOwnerAsks(o)
  if (asks.birthHalf && o.ownerBornFirstHalf === undefined) {
    throw new Error(`inheritedRmd: an owner born in ${b} who died in ${death} needs the birth half (it moves the required beginning date)`)
  }
  if (asks.beforeApril1) {
    if (o.ownerDiedBeforeApril1 === undefined) {
      throw new Error(`inheritedRmd: a death in ${death}, the required-beginning year, needs whether it fell before April 1`)
    }
    return o.ownerDiedBeforeApril1
  }
  const year = asks.birthHalf ? requiredBeginningYear(b, o.ownerBornFirstHalf) : requiredBeginningYear(b, true)
  return death < year
}

/** A divisor on the table's own grain (tenths): whole years are subtracted, so this only clears float dust. */
const tenths = (v: number): number => Math.round(v * 10) / 10

/** The schedule's answer for one calendar year. */
export function inheritedYear(o: InheritedAccountOwner, calendarYear: number): InheritedYear {
  if (!Number.isInteger(calendarYear)) throw new Error(`inheritedRmd: calendarYear must be a whole year (got ${calendarYear})`)
  const last = inheritedLastYear(o)
  if (calendarYear > last) return CLOSED
  if (calendarYear === last) return LAST
  if (calendarYear <= o.ownerDeathYear || diedBeforeRequiredBeginningDate(o)) return NO_MINIMUM
  const firstYear = o.ownerDeathYear + 1
  const heir = singleLifeExpectancy(firstYear - o.heirBirthYear) - (calendarYear - firstYear)
  const owner = singleLifeExpectancy(o.ownerDeathYear - o.ownerBirthYear) - (calendarYear - o.ownerDeathYear)
  if (owner > heir) {
    throw new Error(
      `inheritedRmd: the owner's remaining life expectancy (${tenths(owner)}) exceeds the heir's (${tenths(heir)}); the greater-of rule would pick the owner's, a case version 1 refuses (an eligible beneficiary, KTD17)`,
    )
  }
  return { kind: 'minimum', divisor: tenths(heir) }
}

/** The schedule by simulation year: index t is calendar year `startCalendarYear + t`, for `horizonYears` years. */
export function inheritedSchedule(o: InheritedAccountOwner, startCalendarYear: number, horizonYears: number): readonly InheritedYear[] {
  if (!Number.isInteger(startCalendarYear)) throw new Error(`inheritedRmd: startCalendarYear must be a whole year (got ${startCalendarYear})`)
  if (!Number.isInteger(horizonYears) || horizonYears < 0) throw new Error(`inheritedRmd: horizonYears must be a whole number ≥ 0 (got ${horizonYears})`)
  return Array.from({ length: horizonYears }, (_, t) => inheritedYear(o, startCalendarYear + t))
}

/** The ledger's rows (KTD25), translated here once: the row the asked figures open at, and the income with no balance
 *  each row books (an earlier row's reported withdrawal; the open row's amount already out). */
export interface InheritedRows {
  readonly openRow: number
  readonly bookedByRow: readonly number[]
}

/** Translate the asked year and the custodian's earlier withdrawals to simulation rows. THROWS on a row outside
 *  `[0, horizonYears)`, a duplicate year, an earlier withdrawal not before the asked year, or a non-finite or
 *  negative amount (validateParams twins each). */
export function inheritedRows(
  openYear: number,
  takenInOpenYear: number,
  earlier: readonly { readonly calendarYear: number; readonly amount: number }[],
  startCalendarYear: number,
  horizonYears: number,
): InheritedRows {
  const okDollar = (x: number) => Number.isFinite(x) && x >= 0
  if (!Number.isInteger(openYear)) throw new Error(`inheritedRmd: openYear must be a whole year (got ${openYear})`)
  const openRow = openYear - startCalendarYear
  if (openRow < 0 || openRow >= horizonYears) {
    throw new Error(`inheritedRmd: the asked year ${openYear} is outside the plan's years ${startCalendarYear} to ${startCalendarYear + horizonYears - 1}`)
  }
  if (!okDollar(takenInOpenYear)) throw new Error(`inheritedRmd: takenInOpenYear must be finite and at least 0 (got ${takenInOpenYear})`)
  const bookedByRow = new Array<number>(openRow + 1).fill(0)
  const seen = new Set<number>()
  for (const e of earlier) {
    const row = e.calendarYear - startCalendarYear
    if (!Number.isInteger(e.calendarYear) || row < 0 || row >= openRow) {
      throw new Error(`inheritedRmd: an earlier withdrawal's year ${e.calendarYear} is not a plan year before the asked year ${openYear}`)
    }
    if (seen.has(row)) throw new Error(`inheritedRmd: two earlier withdrawals for ${e.calendarYear}`)
    if (!okDollar(e.amount)) throw new Error(`inheritedRmd: an earlier withdrawal must be finite and at least 0 (got ${e.amount})`)
    seen.add(row)
    bookedByRow[row] = e.amount
  }
  bookedByRow[openRow] = takenInOpenYear
  return { openRow, bookedByRow }
}

/**
 * The year's paced withdrawal (KTD21) from the balance at the year's top: at least `required`, at most the balance.
 * "Even amounts" divides the year's whole share over the years left, this year counted, through `endYear` (the law's
 * last year, or the household's chosen one), and that year takes everything left. `alreadyOut` is what came out
 * earlier this year (the open row's amount already out): the share counts it, so the year's total is the share.
 */
export function inheritedPacedWithdrawal(
  pace: { readonly kind: 'law-minimum' } | { readonly kind: 'even' } | { readonly kind: 'even-to-year'; readonly lastYear: number },
  balanceAtTop: number,
  required: number,
  calendarYear: number,
  lawLastYear: number,
  alreadyOut: number,
): number {
  const floor = Math.min(balanceAtTop, required)
  if (pace.kind === 'law-minimum') return floor
  const endYear = pace.kind === 'even' ? lawLastYear : pace.lastYear
  if (calendarYear >= endYear) return balanceAtTop
  const share = (balanceAtTop + alreadyOut) / (endYear - calendarYear + 1) - alreadyOut
  return Math.min(balanceAtTop, Math.max(floor, share))
}

/**
 * The year's required withdrawal from the ledger's balance at the year's top (its prior December 31 balance): the
 * balance over the divisor; the whole balance in the last year, and wherever the stepped-down divisor is at or below 1,
 * an arm checked BEFORE any division (it reaches 0 or below in year nine for an heir aged 86 or older in the year after
 * the death, 7.6 less 8); 0 where no minimum is owed. Never more than the balance (-5(a)(1)).
 */
export function inheritedMinimum(year: InheritedYear, balanceAtTop: number): number {
  if (!Number.isFinite(balanceAtTop) || balanceAtTop < 0) {
    throw new Error(`inheritedRmd: the balance must be finite and at least 0 (got ${balanceAtTop})`)
  }
  switch (year.kind) {
    case 'no-minimum':
      return 0
    case 'closed':
      if (balanceAtTop > 0) throw new Error(`inheritedRmd: a closed account holds ${balanceAtTop} (the last year takes everything)`)
      return 0
    case 'last':
      return balanceAtTop
    case 'minimum':
      return year.divisor <= 1 ? balanceAtTop : balanceAtTop / year.divisor
  }
}
