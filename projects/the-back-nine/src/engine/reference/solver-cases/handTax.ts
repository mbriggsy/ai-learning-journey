/**
 * The fixtures' INDEPENDENT tax arithmetic (DND-012). Algebraically equal to the engine's
 * rules, OPERATIONALLY distinct (the historical.test blended-multiplier precedent — different
 * op-order, different authorship): the engine walks bands accumulating `(top − prevEdge) ×
 * rate` inside `progressiveOrdinaryTax`; these helpers compute per-band WIDTHS from the edge
 * list first and dot them with rates. Every dated figure is READ from the canonical table via
 * its accessor — never re-typed (the single-source gate) — so a constants vintage bump moves
 * both the engine and the expectation together, loudly, while the ARITHMETIC stays
 * independent.
 */
import {
  ordinaryBracketsMFJ,
  ordinaryBracketsSingle,
  standardDeductionMFJ,
  standardDeductionSingle,
  type OrdinaryBracket,
} from '@engine/constants'

const bracketsFor = (filing: 'mfj' | 'single'): readonly OrdinaryBracket[] =>
  filing === 'mfj' ? ordinaryBracketsMFJ.value : ordinaryBracketsSingle.value

/** The filing status's standard deduction (the fixtures' worlds keep count65 = 0 and sit
 *  outside the senior-bonus window's phase-out by construction, so the stack collapses to
 *  the plain SD — a declared rule boundary each fixture names). */
export const handStandardDeduction = (filing: 'mfj' | 'single'): number =>
  filing === 'mfj' ? standardDeductionMFJ.value : standardDeductionSingle.value

/** Progressive ordinary tax on TAXABLE income — the width-vector form: widths[i] = the
 *  income occupying band i, computed from the edge list up front, then Σ widths·rates. */
export function handProgressiveTax(taxableIncome: number, filing: 'mfj' | 'single'): number {
  if (taxableIncome <= 0) return 0
  const bands = bracketsFor(filing)
  let tax = 0
  let prev = 0
  for (const band of bands) {
    const top = band.upTo === null ? taxableIncome : Math.min(band.upTo, taxableIncome)
    const width = Math.max(0, top - prev)
    tax += width * band.rate
    prev = band.upTo ?? taxableIncome
    if (band.upTo === null || taxableIncome <= band.upTo) break
  }
  return tax
}

/** Ordinary tax on ORDINARY INCOME (deduction applied first): tax(max(0, ordinary − SD)).
 *  Valid ONLY in the fixtures' declared worlds (count65 0, no senior bonus, no gains). */
export function handOrdinaryTax(ordinaryIncome: number, filing: 'mfj' | 'single'): number {
  return handProgressiveTax(Math.max(0, ordinaryIncome - handStandardDeduction(filing)), filing)
}

/** The marginal ordinary rate at TAXABLE income `t` (the band the next dollar lands in). */
export function handMarginalRate(taxableIncome: number, filing: 'mfj' | 'single'): number {
  for (const band of bracketsFor(filing)) {
    if (band.upTo === null || taxableIncome < band.upTo) return band.rate
  }
  throw new Error('[handTax] malformed bracket table (burned/062)')
}

/** The upper edge of the band whose rate is `rate` (the fixtures anchor conversions at named
 *  band tops — read from the table, never re-typed). Throws when no such finite band exists. */
export function handBandTop(rate: number, filing: 'mfj' | 'single'): number {
  for (const band of bracketsFor(filing)) {
    if (band.rate === rate && band.upTo !== null) return band.upTo
  }
  throw new Error(`[handTax] no finite band at rate ${rate} — the fixture's bracket premise moved (re-derive, never re-pin blind)`)
}
