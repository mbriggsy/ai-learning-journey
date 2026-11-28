/**
 * The taxed part of a home sale's gain (gap 5's plan, R8, KTD4 to KTD6; U8). Every expected figure is worked BY HAND
 * from IRS Publication 523's worksheets (the gain: amount realized less adjusted basis; the exclusion: the lesser of the
 * gain and the §121(b) limit) and §121(b)(4) for the survivor's year, never through the helper's own formula (DND 012,
 * insight 137). The deflator divides each fixed-dollar figure into the sale year's today's dollars (KTD4).
 */
import { describe, expect, it } from 'vitest'
import { homeSaleExclusion } from '../constants/tax'
import { homeSaleJointExclusionAt, homeSaleTaxableGain, type HomeSaleGainInput } from '../homeSale'

/** AE2's couple: a main home selling for $900,000 after costs (today's dollars), paid $300,000 (fixed dollars). */
const AE2: HomeSaleGainInput = { soldForReal: 900_000, paidDollars: 300_000, excludable: true, deflator: 1 }
/** The sale year in every arm below, and a couple who both outlive it. */
const T = 6
const BOTH_LIVING = [40, 35] as const

describe('the exclusion figures (§121(b), KTD5)', () => {
  it('are the statute’s $250,000 and $500,000, typed once in the constants module and frozen in nominal dollars', () => {
    expect(homeSaleExclusion.value).toEqual({ single: 250_000, joint: 500_000 })
    expect(homeSaleExclusion.directionalUntilPinned).toBe(false)
    expect(homeSaleExclusion.citation).toMatch(/§121\(b\)\(1\).*§121\(b\)\(2\)\(A\).*§121\(b\)\(4\)/)
  })
})

describe('the gain and the part left out, in one frame (AE2, KTD4)', () => {
  it('covers AE2: at deflator 1, $900,000 less $300,000 is a $600,000 gain, $500,000 left out for a couple, $100,000 taxed', () => {
    expect(homeSaleTaxableGain(AE2, T, BOTH_LIVING)).toEqual({ wholeGainReal: 600_000, excludedReal: 500_000, taxedReal: 100_000 })
  })

  it('at deflator 1.2 both fixed figures shrink in today’s dollars: cost $250,000, exclusion $416,666.67, so $650,000 gained and $233,333.33 taxed', () => {
    const g = homeSaleTaxableGain({ ...AE2, deflator: 1.2 }, T, BOTH_LIVING)
    expect(g.wholeGainReal).toBeCloseTo(650_000, 6)
    expect(g.excludedReal).toBeCloseTo(416_666.666_667, 4)
    expect(g.taxedReal).toBeCloseTo(233_333.333_333, 4)
  })

  it('a sale that is not excludable (not the main home, or another main-home sale 2 or fewer years before) has its whole gain taxed', () => {
    expect(homeSaleTaxableGain({ ...AE2, excludable: false }, T, BOTH_LIVING)).toEqual({ wholeGainReal: 600_000, excludedReal: 0, taxedReal: 600_000 })
  })

  it('a gain under the limit leaves out only the gain (Pub 523: the lesser of the two), so nothing is taxed', () => {
    expect(homeSaleTaxableGain({ ...AE2, soldForReal: 400_000 }, T, BOTH_LIVING)).toEqual({ wholeGainReal: 100_000, excludedReal: 100_000, taxedReal: 0 })
  })

  it('a loss is not a deduction: a home sold for less than was paid has no gain, excludable or not', () => {
    for (const excludable of [true, false]) {
      expect(homeSaleTaxableGain({ ...AE2, soldForReal: 250_000, excludable }, T, BOTH_LIVING), `excludable ${excludable}`).toEqual({
        wholeGainReal: 0,
        excludedReal: 0,
        taxedReal: 0,
      })
    }
  })
})

describe('which figure a path leaves out, by who is living in the sale year (AE3, KTD6)', () => {
  // A person is living in sim year t while t < deathOffset: the death year itself is still a living year.
  it.each([
    ['both living in the sale year (the first death comes later)', [T + 1, 35], true, 100_000],
    ['the first year with one living (the death fell the year before): still joint, §121(b)(4)', [T, 35], true, 100_000],
    ['the second year with one living: single', [T - 1, 35], false, 350_000],
    ['a household that started as one: single', [30], false, 350_000],
  ] as const)('%s', (_name, deathOffsets, joint, taxed) => {
    expect(homeSaleJointExclusionAt(T, deathOffsets)).toBe(joint)
    expect(homeSaleTaxableGain(AE2, T, deathOffsets).taxedReal).toBe(taxed)
  })

  it('the person who dies first decides it, whichever index they hold', () => {
    expect(homeSaleJointExclusionAt(T, [35, T - 1])).toBe(false)
    expect(homeSaleJointExclusionAt(T, [35, T])).toBe(true)
  })
})
