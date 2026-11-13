/**
 * The printed grain's one leaf (build 2's U3, KTD4): the cent snap with its gloomy tie, KTD12's bottom line on it,
 * and the finiteness guard they call. The money picture prints through these, and from U4 the tax overlay credits
 * through them, so every figure here is typed by hand from the rule (the arithmetic is in each comment), never read
 * back from the code. The bottom line's rounding arms are the money picture's own (`workingYearLedger.test.ts`),
 * copied here unedited, because the leaf is now where they live.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { bottomLineFromCents, finite, toCents, workingYearBottomLine, workingYearCredit, workingYearCreditBinding } from '@engine/moneyGrain'
import { workingYearBottomLine as ledgerBottomLine } from '@engine/workingYearLedger'

describe('the cent snap: the nearest cent, a half-cent tie toward −∞, never −0', () => {
  it('a half-cent tie goes to the gloomy side, whichever sign the money carries', () => {
    // 0.005 × 100 is the tie 0.5: down to 0 cents, never up to 1. −0.005 is the tie −0.5: down to −1.
    expect(toCents(0.005)).toBe(0)
    expect(toCents(-0.005)).toBe(-1)
    // $12.005 is the tie 1,200.5 cents: down to 1,200. −$12.005: down to −1,201 (the float lands either side).
    expect(toCents(12.005)).toBe(1_200)
    expect(toCents(-12.005)).toBe(-1_201)
    // Past the dust, a figure above the tie rounds up: $0.00501 is 0.501 cents, so 1.
    expect(toCents(0.00501)).toBe(1)
  })

  it('a figure under half a cent from zero is 0, never −0', () => {
    expect(Object.is(toCents(-0.004), 0)).toBe(true)
    expect(Object.is(toCents(-0), 0)).toBe(true)
    expect(Object.is(toCents(0.004), 0)).toBe(true)
  })

  it('float dust never moves a cent: $3,060 plus 5e-13 is 306,000 cents, money in or money out', () => {
    expect(toCents(3_060 + 5e-13)).toBe(306_000)
    expect(toCents(-(3_060 + 5e-13))).toBe(-306_000)
  })
})

describe('KTD12’s bottom line on the cent: a draw reads at least "Short $1", a surplus rounds down', () => {
  it('on a cash already in cents', () => {
    // −1¢ and −100¢ are "Short $1"; −101¢ is "Short $2"; 199¢ is $1; 99¢ and 0¢ are $0, never −0.
    expect(bottomLineFromCents(-1)).toBe(-1)
    expect(bottomLineFromCents(-100)).toBe(-1)
    expect(bottomLineFromCents(-101)).toBe(-2)
    expect(bottomLineFromCents(199)).toBe(1)
    expect(Object.is(bottomLineFromCents(99), 0)).toBe(true)
    expect(Object.is(bottomLineFromCents(0), 0)).toBe(true)
  })

  it('cash −0.40 reads −1 (a draw reads at least "Short $1"); +0.70 reads 0; −0 never appears', () => {
    expect(workingYearBottomLine(-0.4)).toBe(-1)
    expect(workingYearBottomLine(0.7)).toBe(0)
    expect(Object.is(workingYearBottomLine(0.7), 0)).toBe(true)
    expect(Object.is(workingYearBottomLine(-0), 0)).toBe(true)
    expect(Object.is(workingYearBottomLine(-0.001), 0)).toBe(true) // under half a cent is not money
    expect(workingYearBottomLine(-0.006)).toBe(-1)
  })

  it('a true half-cent draw reads at least "Short $1", whichever way the float lands (the tie goes to the gloomy side)', () => {
    expect(workingYearBottomLine(-0.005)).toBe(-1)
    expect(workingYearBottomLine(-12.005)).toBe(-13)
    expect(workingYearBottomLine(12.005)).toBe(12)
  })

  it('float dust never moves a dollar: a $3,060.0000000000005 money-out line reads −$3,060, where a floor on the float reads −$3,061', () => {
    expect(workingYearBottomLine(-(3_060 + 5e-13))).toBe(-3_060)
    expect(Math.floor(-(3_060 + 5e-13))).toBe(-3_061) // the defect the snap exists for (insight 146)
    expect(workingYearBottomLine(3_060 + 5e-13)).toBe(3_060)
  })

  it('the printed figure can sit above its own float: $1,644.95 reads $1,644, but $1,644.996 reads $1,645 (R8’s min with the raw cash is for this)', () => {
    // 1,644.95 is 164,495 cents: $1,644. 1,644.996 is 164,499.6 cents, so 164,500: $1,645, above 1,644.996.
    expect(workingYearBottomLine(1644.95)).toBe(1_644)
    expect(workingYearBottomLine(1644.996)).toBe(1_645)
    expect(workingYearBottomLine(1644.996)).toBeGreaterThan(1644.996)
  })
})

// The whole-window rebuild's KTD2: build 2's R8 credit rule in its one home, and its binding read. Every figure typed
// by hand from the rule: credit = the smallest of the raw cash, that cash's print, year 0's print and the stored
// figure, in a year everyone is alive, and 0 at or below 0; the binding read compares the year's own left over (on the
// printed grain) with the cap, min(year 0's print, stored).
describe('the credit rule (R8) and which term binds it', () => {
  it('the raw cash joins the min: $1,644.996 credits $1,644.996, not its $1,645 print, and the year’s own left over binds', () => {
    expect(workingYearCredit(1_644.996, 2_000, 3_000, true)).toBe(1_644.996)
    expect(workingYearCreditBinding(1_644.996, 2_000, 3_000, true)).toBe('ownLeftOver')
  })

  it('nothing is credited in a short year, a year that prints $0, or a year with someone dead — never a negative figure or −0', () => {
    for (const [cash, alive] of [[-500, true], [0.4, true], [-0, true], [5_000, false]] as const) {
      const credit = workingYearCredit(cash, 16_985, 16_985, alive)
      expect(Object.is(credit, 0), `cash ${cash}, alive ${alive}`).toBe(true)
      expect(workingYearCreditBinding(cash, 16_985, 16_985, alive)).toBe('none')
    }
  })

  it('the cap binds at the stored figure, at year 0’s print, or the year’s own print binds, each by hand', () => {
    // Stored binds: min(20,000.50, 20,000, 16,985, 10,000) = 10,000.
    expect(workingYearCredit(20_000.5, 16_985, 10_000, true)).toBe(10_000)
    expect(workingYearCreditBinding(20_000.5, 16_985, 10_000, true)).toBe('cap')
    // Year 0's print binds: min(20,000, 20,000, 16,985, 26,985) = 16,985.
    expect(workingYearCredit(20_000, 16_985, 26_985, true)).toBe(16_985)
    expect(workingYearCreditBinding(20_000, 16_985, 26_985, true)).toBe('cap')
    // The year's own print binds: min(5,985.40, 5,985, 15,985, 16,985) = 5,985.
    expect(workingYearCredit(5_985.4, 15_985, 16_985, true)).toBe(5_985)
    expect(workingYearCreditBinding(5_985.4, 15_985, 16_985, true)).toBe('ownLeftOver')
  })

  it('a tie of the cap and the year’s own left over reads "tie", on the printed grain: a cash a fraction of a cent below the dollar ties it too', () => {
    // min(15,985.40, 15,985, 15,985, 16,985) = 15,985: the own print and year 0's print are one figure.
    expect(workingYearCredit(15_985.4, 15_985, 16_985, true)).toBe(15_985)
    expect(workingYearCreditBinding(15_985.4, 15_985, 16_985, true)).toBe('tie')
    // $15,984.996 prints $15,985, so it credits its raw cash but ties the $15,985 cap on the grain the spans read.
    expect(workingYearCredit(15_984.996, 15_985, 16_985, true)).toBe(15_984.996)
    expect(workingYearCreditBinding(15_984.996, 15_985, 16_985, true)).toBe('tie')
  })
})

describe('the finiteness guard (DND 009): one label for every caller, and the figure itself through', () => {
  it('NaN and ±Infinity throw naming the leaf and the caller’s own label, never a caller module', () => {
    expect(() => workingYearBottomLine(NaN)).toThrow('[moneyGrain] the cash is not finite (NaN) — DND 009')
    expect(() => workingYearBottomLine(Infinity)).toThrow('[moneyGrain] the cash is not finite (Infinity) — DND 009')
    expect(() => workingYearBottomLine(-Infinity)).toThrow('[moneyGrain] the cash is not finite (-Infinity) — DND 009')
    expect(() => finite(NaN, 'line 3')).toThrow('[moneyGrain] line 3 is not finite (NaN) — DND 009')
  })

  it('a finite figure comes back as itself, −0 included', () => {
    expect(finite(1644.95, 'x')).toBe(1644.95)
    expect(Object.is(finite(-0, 'x'), -0)).toBe(true)
  })
})

describe('one home (KTD4)', () => {
  it('the money picture’s bottom line IS this leaf’s, re-exported: no second copy', () => {
    expect(ledgerBottomLine).toBe(workingYearBottomLine)
  })

  it('the leaf imports nothing, so any engine module (the overlay included) reads it without a cycle', () => {
    const read = (file: string): string[] =>
      ts.preProcessFile(readFileSync(join(__dirname, '..', file), 'utf-8'), true, true).importedFiles.map((f) => f.fileName)
    expect(read('moneyGrain.ts')).toEqual([])
    // Non-vacuity: the same reader sees the ledger import the leaf.
    expect(read('workingYearLedger.ts')).toContain('@engine/moneyGrain')
  })
})
