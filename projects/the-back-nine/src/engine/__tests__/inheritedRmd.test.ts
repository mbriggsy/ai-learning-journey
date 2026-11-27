/**
 * The inherited IRA's schedule (the Act 5 plan's U12 producer; KTD21 to KTD25). Every expected divisor is typed from IRS
 * Pub 590-B (2025) Appendix B Table I as printed (the age noted beside it), never read back through the producer's own
 * lookup (DND 012): the producer's job here is which age, which year and how many years elapsed. AE5's figures are the
 * plan's own, derived by hand from the regulation.
 */
import { describe, expect, it } from 'vitest'
import {
  diedBeforeRequiredBeginningDate,
  inheritedLastYear,
  inheritedMinimum,
  inheritedSchedule,
  inheritedYear,
  type InheritedAccountOwner,
  type InheritedYear,
} from '../inheritedRmd'

const minimum = (divisor: number): InheritedYear => ({ kind: 'minimum', divisor })
const NONE: InheritedYear = { kind: 'no-minimum' }
const LAST: InheritedYear = { kind: 'last' }
const CLOSED: InheritedYear = { kind: 'closed' }

// AE5: a made-up heir born 1968 inherits from an owner born 1945 who died in 2023 (after the date: the 70½ band, April 1
// of 2016 or 2017, whichever half). The heir is 56 in 2024: Table I reads 30.6 at 56.
const AE5: InheritedAccountOwner = { ownerBirthYear: 1945, ownerDeathYear: 2023, heirBirthYear: 1968 }

describe('AE5 (the plan’s worked case)', () => {
  it('the 2026 minimum on $100,000 is $100,000 / 28.6 = $3,496.50, and whatever is left comes out in 2033', () => {
    expect(inheritedYear(AE5, 2026)).toEqual(minimum(28.6))
    expect(inheritedMinimum(inheritedYear(AE5, 2026), 100_000)).toBeCloseTo(3496.5, 2)
    expect(inheritedLastYear(AE5)).toBe(2033)
    expect(inheritedYear(AE5, 2033)).toEqual(LAST)
  })

  it('the count starts the year after the death and loses one a year: 30.6 in 2024, 29.6 in 2025; the death year owes none', () => {
    expect(inheritedYear(AE5, 2023)).toEqual(NONE)
    expect(inheritedYear(AE5, 2024)).toEqual(minimum(30.6))
    expect(inheritedYear(AE5, 2025)).toEqual(minimum(29.6))
    expect(inheritedYear(AE5, 2032)).toEqual(minimum(22.6))
  })

  it('no birth half is asked: a 1945 owner’s date is years before any 2020-on death under either half', () => {
    expect(diedBeforeRequiredBeginningDate(AE5)).toBe(false)
  })
})

describe('the ten-year end, tested as a crossing (insight 014)', () => {
  it('the year before takes the minimum, the last year everything left, the year after nothing from an empty account', () => {
    expect(inheritedMinimum(inheritedYear(AE5, 2032), 45_200)).toBeCloseTo(45_200 / 22.6, 9)
    expect(inheritedMinimum(inheritedYear(AE5, 2033), 37_000)).toBe(37_000)
    expect(inheritedYear(AE5, 2034)).toEqual(CLOSED)
    expect(inheritedMinimum(inheritedYear(AE5, 2034), 0)).toBe(0)
    expect(() => inheritedMinimum(inheritedYear(AE5, 2034), 1)).toThrow(/closed account/)
  })
})

describe('an owner who died before the required beginning date', () => {
  // Born 1960: applicable age 75, so the date is April 1, 2036; a 2024 death is well before it.
  const early: InheritedAccountOwner = { ownerBirthYear: 1960, ownerDeathYear: 2024, heirBirthYear: 1990 }
  it('owes no minimum in years one to nine and everything in the tenth', () => {
    expect(diedBeforeRequiredBeginningDate(early)).toBe(true)
    expect(inheritedSchedule(early, 2025, 11)).toEqual([NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE, LAST, CLOSED])
    expect(inheritedMinimum(NONE, 250_000)).toBe(0)
  })
})

describe('a stepped-down divisor at or below 1 takes the whole balance, never a division by it', () => {
  it('an heir aged 84 the year after the death: 8.7 less 7 = 1.7 in year eight, 8.7 less 8 = 0.7 in year nine', () => {
    // Owner born 1928, died 2023 at 95 (Table I 4.0, so 3.0 the next year: the heir's 8.7 is greater).
    const o: InheritedAccountOwner = { ownerBirthYear: 1928, ownerDeathYear: 2023, heirBirthYear: 1940 }
    expect(inheritedYear(o, 2024)).toEqual(minimum(8.7))
    expect(inheritedYear(o, 2031)).toEqual(minimum(1.7))
    expect(inheritedMinimum(inheritedYear(o, 2031), 17_000)).toBeCloseTo(10_000, 9)
    expect(inheritedYear(o, 2032)).toEqual(minimum(0.7))
    expect(inheritedMinimum(inheritedYear(o, 2032), 6_000)).toBe(6_000)
  })

  it('an heir aged 86 the year after the death: 7.6 less 8 is below zero in year nine, and the whole balance comes out', () => {
    // Owner born 1926, died 2023 at 97 (Table I 3.4).
    const o: InheritedAccountOwner = { ownerBirthYear: 1926, ownerDeathYear: 2023, heirBirthYear: 1938 }
    expect(inheritedYear(o, 2024)).toEqual(minimum(7.6))
    expect(inheritedYear(o, 2032)).toEqual(minimum(-0.4))
    expect(inheritedMinimum(inheritedYear(o, 2032), 4_000)).toBe(4_000)
    expect(inheritedMinimum(minimum(0), 4_000)).toBe(4_000)
    expect(inheritedMinimum(minimum(1), 4_000)).toBe(4_000)
  })
})

describe('the waivers move nothing (KTD23)', () => {
  // Owner born 1940 died 2021 after the date; the heir, born 1970, is 52 in 2022: Table I 34.3.
  const o: InheritedAccountOwner = { ownerBirthYear: 1940, ownerDeathYear: 2021, heirBirthYear: 1970 }
  it('asked in 2026, the divisor is the figure at the heir’s 2022 age less 4, and the last year is 2031', () => {
    expect(inheritedYear(o, 2026)).toEqual(minimum(30.3))
    expect(inheritedLastYear(o)).toBe(2031)
  })
  it('the count runs through the waived years: 2025, the first enforced year, reads 34.3 less 3, never a fresh 34.3', () => {
    expect(inheritedYear(o, 2025)).toEqual(minimum(31.3))
  })
})

describe('the greater-of rule, asserted', () => {
  it('holds on every fixture above (each built without a throw) and fires when the owner’s figure would be the greater', () => {
    // Owner born 1945 died 2023 at 78 (Table I 12.6, so 11.6 in 2024); an heir born 1940 is 84 in 2024 (8.7).
    const olderHeir: InheritedAccountOwner = { ownerBirthYear: 1945, ownerDeathYear: 2023, heirBirthYear: 1940 }
    expect(() => inheritedYear(olderHeir, 2024)).toThrow(/greater-of rule/)
  })
})

describe('the required beginning date, by the law’s own dates (U11’s band; the plan’s U13 grid)', () => {
  it('a death in the required-beginning year reads the before-April-1 answer, and throws without it', () => {
    // Born 1950: applicable age 72, reached in 2022, so the date is April 1, 2023.
    const base = { ownerBirthYear: 1950, ownerDeathYear: 2023, heirBirthYear: 1980 } as const
    expect(() => diedBeforeRequiredBeginningDate(base)).toThrow(/before April 1/)
    expect(inheritedSchedule({ ...base, ownerDiedBeforeApril1: true }, 2024, 11)).toEqual([
      NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE, LAST, CLOSED,
    ])
    // On or after April 1: the heir is 44 in 2024 (Table I 41.9).
    expect(inheritedYear({ ...base, ownerDiedBeforeApril1: false }, 2024)).toEqual(minimum(41.9))
  })

  it('an owner born in 1948 who died in 2020 needs the birth half; a first-half birth’s date (2019) was already past', () => {
    const base = { ownerBirthYear: 1948, ownerDeathYear: 2020, heirBirthYear: 1985 } as const
    expect(() => diedBeforeRequiredBeginningDate(base)).toThrow(/birth half/)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: true })).toBe(false)
    // A second-half birth reaches 70½ in 2019, so the date is April 1, 2020: the death year, so April 1 decides.
    expect(() => diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: false })).toThrow(/before April 1/)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: false, ownerDiedBeforeApril1: true })).toBe(true)
  })

  it('a 1949 owner who died in 2021 needs the half only: first half, date 2020 (past); second half, date 2022 (ahead)', () => {
    const base = { ownerBirthYear: 1949, ownerDeathYear: 2021, heirBirthYear: 1985 } as const
    expect(() => diedBeforeRequiredBeginningDate(base)).toThrow(/birth half/)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: true })).toBe(false)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: false })).toBe(true)
  })

  // The rest of U13's follow-up grid (owner born, died: follow-ups), each cell asking exactly what it lists.
  it('1949, 2020: the half, and for a first-half birth (date April 1, 2020), before April 1', () => {
    const base = { ownerBirthYear: 1949, ownerDeathYear: 2020, heirBirthYear: 1985 } as const
    expect(() => diedBeforeRequiredBeginningDate(base)).toThrow(/birth half/)
    expect(() => diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: true })).toThrow(/before April 1/)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: false })).toBe(true)
  })

  it('1949, 2022: the half, and for a second-half birth (date April 1, 2022), before April 1', () => {
    const base = { ownerBirthYear: 1949, ownerDeathYear: 2022, heirBirthYear: 1985 } as const
    expect(() => diedBeforeRequiredBeginningDate(base)).toThrow(/birth half/)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: true })).toBe(false)
    expect(() => diedBeforeRequiredBeginningDate({ ...base, ownerBornFirstHalf: false })).toThrow(/before April 1/)
  })

  it('a 1951 to 1958 birth Y dying in Y+74 (applicable age 73): before April 1 only, never the half', () => {
    const base = { ownerBirthYear: 1955, ownerDeathYear: 2029, heirBirthYear: 1990 } as const
    expect(() => diedBeforeRequiredBeginningDate(base)).toThrow(/before April 1/)
    expect(diedBeforeRequiredBeginningDate({ ...base, ownerDiedBeforeApril1: false })).toBe(false)
  })

  it('an owner born in 1947 or earlier needs no follow-up for any death from 2020 (the date is 2018 or 2019)', () => {
    expect(diedBeforeRequiredBeginningDate({ ownerBirthYear: 1947, ownerDeathYear: 2020, heirBirthYear: 1985 })).toBe(false)
  })
})

describe('the calendar-to-simulation translation, once', () => {
  it('index t of the schedule is calendar year start + t', () => {
    const s = inheritedSchedule(AE5, 2026, 9)
    expect(s).toEqual([minimum(28.6), minimum(27.6), minimum(26.6), minimum(25.6), minimum(24.6), minimum(23.6), minimum(22.6), LAST, CLOSED])
    expect(inheritedSchedule(AE5, 2026, 0)).toEqual([])
  })
})

describe('fail loud', () => {
  it('refuses a death before the ten-year rule, a fractional year, and a negative or non-finite balance', () => {
    expect(() => inheritedYear({ ownerBirthYear: 1940, ownerDeathYear: 2019, heirBirthYear: 1970 }, 2026)).toThrow(/ten-year rule/)
    expect(() => inheritedYear({ ...AE5, heirBirthYear: 1968.5 }, 2026)).toThrow(/whole calendar year/)
    expect(() => inheritedYear(AE5, 2026.5)).toThrow(/whole year/)
    expect(() => inheritedMinimum(minimum(28.6), -1)).toThrow(/finite and at least 0/)
    expect(() => inheritedMinimum(minimum(28.6), Number.NaN)).toThrow(/finite and at least 0/)
  })
})
