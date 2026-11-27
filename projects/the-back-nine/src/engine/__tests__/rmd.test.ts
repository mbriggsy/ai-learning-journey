/**
 * The RMD producer's U11 readers (gap 3): the required beginning date by birth date, and the Single Life Table lookup.
 *
 * The dates are derived from the regulation's text, not from the code: the applicable age by birth date
 * (26 CFR 1.401(a)(9)-2(b)(2): before July 1, 1949 → 70½; July 1, 1949 through 1950 → 72; 1951–1958 → 73; 1960 on →
 * 75), 70½ reached six calendar months after the 70th birthday (-6(g)(1)(iv)), and the IRA's required beginning date
 * April 1 of the year after the applicable age is reached (1.408-8(b)(1)(i)).
 */
import { describe, expect, it } from 'vitest'
import { requiredBeginningYear, rmdStartAgeForBirthYear, singleLifeExpectancy } from '../rmd'

describe('requiredBeginningYear (the dead owner’s required beginning date)', () => {
  it('reads the 70½ band by date, the birth half choosing the band for a 1949 birth', () => {
    // March 1949: before July 1, 1949 → 70½, reached September 2019 → April 1, 2020.
    expect(requiredBeginningYear(1949, true)).toBe(2020)
    // September 1949: on or after July 1, 1949 → 72, reached 2021 → April 1, 2022.
    expect(requiredBeginningYear(1949, false)).toBe(2022)
  })

  it('moves the year 70½ is reached by the birth half inside the band', () => {
    // September 1948: 70th birthday September 2018, 70½ in March 2019 → April 1, 2020.
    expect(requiredBeginningYear(1948, false)).toBe(2020)
    // March 1948: 70th birthday March 2018, 70½ in September 2018 → April 1, 2019.
    expect(requiredBeginningYear(1948, true)).toBe(2019)
  })

  it('needs no birth half outside the 70½ band, and ignores one given', () => {
    expect(requiredBeginningYear(1950)).toBe(2023) // 72 in 2022
    expect(requiredBeginningYear(1951)).toBe(2025) // 73 in 2024
    expect(requiredBeginningYear(1958)).toBe(2032) // 73 in 2031
    expect(requiredBeginningYear(1959)).toBe(2033) // the proposed rule's 73 (the final reg reserves the row)
    expect(requiredBeginningYear(1960)).toBe(2036) // 75 in 2035
    expect(requiredBeginningYear(1950, true)).toBe(requiredBeginningYear(1950, false))
  })

  it('refuses to guess a birth half the law needs', () => {
    expect(() => requiredBeginningYear(1949)).toThrow(/birth half/)
    expect(() => requiredBeginningYear(1948)).toThrow(/birth half/)
  })
})

describe('rmdStartAgeForBirthYear (the living member’s reader, unchanged in code)', () => {
  it('reads the 70½ band for every birth of 1949 or earlier (no birth half), and the old bands after it', () => {
    expect(rmdStartAgeForBirthYear(1948)).toBe(70.5)
    expect(rmdStartAgeForBirthYear(1949)).toBe(70.5)
    expect(rmdStartAgeForBirthYear(1950)).toBe(72)
    expect(rmdStartAgeForBirthYear(1951)).toBe(73)
    expect(rmdStartAgeForBirthYear(1960)).toBe(75)
  })
})

describe('singleLifeExpectancy (the Single Life Table lookup)', () => {
  it('returns the table’s own rows', () => {
    expect(singleLifeExpectancy(0)).toBe(84.6)
    expect(singleLifeExpectancy(57)).toBe(29.8)
    expect(singleLifeExpectancy(76)).toBe(14.1)
    expect(singleLifeExpectancy(119)).toBe(1.1)
  })

  it('clamps every age past the last row to the "120+" row, never extrapolating', () => {
    expect(singleLifeExpectancy(120)).toBe(1.0)
    expect(singleLifeExpectancy(121)).toBe(1.0)
    expect(singleLifeExpectancy(150)).toBe(1.0)
  })

  it('has no row for a negative or fractional age', () => {
    expect(() => singleLifeExpectancy(-1)).toThrow(/no Single Life Table row/)
    expect(() => singleLifeExpectancy(56.5)).toThrow(/no Single Life Table row/)
  })
})
