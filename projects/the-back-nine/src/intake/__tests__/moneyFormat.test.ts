// The money and percent text's own arms, moved out of `fields.test.tsx` with their functions by Act 6's RC0, unchanged.
import { describe, expect, it } from 'vitest'
import { parseMoney, formatMoney, parsePercent, formatPercent, snapPercentToShown } from '../moneyFormat'

describe('parseMoney / formatMoney', () => {
  it('strips $/commas/spaces and parses the raw number', () => {
    expect(parseMoney('$1,250,000')).toBe(1_250_000)
    expect(parseMoney(' 40 000 ')).toBe(40_000)
    expect(parseMoney('1234.56')).toBe(1234.56)
  })
  it('empty/garbage/negative → undefined (an absent fact, never 0 — burned/062)', () => {
    expect(parseMoney('')).toBeUndefined()
    expect(parseMoney('abc')).toBeUndefined()
    expect(parseMoney('-500')).toBeUndefined()
  })
  it('rejects silent magnitude traps: misgrouped commas, exponent, hex (D1 review AB2)', () => {
    expect(parseMoney('100,00')).toBeUndefined() // misgrouped — strip-then-Number gave 10000
    expect(parseMoney('1,00,000')).toBeUndefined()
    expect(parseMoney('1e6')).toBeUndefined() // exponent — gave 1000000
    expect(parseMoney('0x186a0')).toBeUndefined() // hex — gave 100000
    expect(parseMoney('40,000')).toBe(40_000) // correctly grouped still parses
    expect(parseMoney('1,250,000')).toBe(1_250_000)
  })
  it('formats with grouping, no decimals', () => {
    expect(formatMoney(1_250_000)).toBe('1,250,000')
    expect(formatMoney(undefined)).toBe('')
  })
})

describe('parsePercent / formatPercent (R40 — enter a percent, store a FRACTION)', () => {
  it('parses a percent to its fraction (humane entry, fraction model)', () => {
    expect(parsePercent('50')).toBe(0.5)
    expect(parsePercent('2.5')).toBe(0.025)
    expect(parsePercent('100')).toBe(1)
    expect(parsePercent('0')).toBe(0)
    expect(parsePercent(' 60 %')).toBe(0.6)
  })
  it('empty/garbage → undefined (an absent fact, never 0 — burned/062); rejects exponent/hex traps', () => {
    expect(parsePercent('')).toBeUndefined()
    expect(parsePercent('abc')).toBeUndefined()
    expect(parsePercent('-10')).toBeUndefined()
    expect(parsePercent('1e2')).toBeUndefined()
    expect(parsePercent('0x40')).toBeUndefined()
  })
  it('formats a fraction back to a percent string', () => {
    expect(formatPercent(0.5)).toBe('50')
    expect(formatPercent(0.025)).toBe('2.5')
    expect(formatPercent(undefined)).toBe('')
  })
})

describe('snapPercentToShown (gap 4’s leftover (e): store the figure the box shows)', () => {
  it('snaps to two decimals of a percent, and keeps a figure already on that grain to the bit', () => {
    expect(snapPercentToShown(parsePercent('15.004')!)).toBe(0.15)
    expect(formatPercent(snapPercentToShown(parsePercent('15.004')!))).toBe('15')
    expect(snapPercentToShown(parsePercent('12.3456')!)).toBe(0.1235)
    expect(snapPercentToShown(parsePercent('0.001')!)).toBe(0)
    for (const typed of ['3.75', '1.1', '15', '0.07', '2.33']) expect(snapPercentToShown(parsePercent(typed)!), typed).toBe(parsePercent(typed))
  })
})
