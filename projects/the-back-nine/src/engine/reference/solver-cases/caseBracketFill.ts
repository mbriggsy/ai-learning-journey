/**
 * ORACLE CASE (ii) — the STRIPPED bracket-filling Roth-conversion optimum (U14 S2).
 *
 * THE WORLD: MFJ 60/60, `fixed-horizon` 4 years, ZERO growth (mean 0, stdDev 0) — the
 * cleanest marginal-rate-equalization regime: with r = 0, WHEN a dollar converts changes
 * nothing; only the RATE it converts at vs the rate the heirs would pay matters, so the
 * classic "fill to the top of the target bracket and no further" is EXACT, not asymptotic.
 * SS off (pia 0), gains off (basis == value), cliffs off (healthcare OFF), rmd off (ages
 * 60–63), state absent, count65 0. Spending 40,000/yr drawn taxable-first — tax-free return
 * of basis, so the ONLY tax in the world is the conversion's own.
 *
 * THE RULE (the plan's case (ii), read honestly): "bracket top" is optimal because it is
 * where today's marginal rate crosses the comparison rate — here the DECLARED first-order
 * heir bracket hb = 0.23 (the estate is the "future marginal" side; §1014/IRD is shipped —
 * insight 025's mechanism check). Fill every dollar whose marginal fed rate < hb (the
 * 10/12/22 bands), stop where the next band (24%) exceeds it.
 *
 * THE GRID IS THE ENUMERATOR'S OWN (S1): committed income 0 ⇒ every bracket-edge anchor is
 * exact arithmetic `edge + SD`: a10 = 24,800 + 32,200 = 57,000; a12 = 133,000; a22 =
 * 243,600; a24 = 435,750 — which EXCEEDS the 400,000 post-RMD headroom and must land in
 * `rejected` (the legality filter's live fixture witness), never in the scored set.
 *
 * THE HAND DERIVATION (worked 2026-07-18; `expected()` re-derives from the table):
 *  - After-tax bequest(conv) = taxable_end + pretax_end·(1−hb) + roth_end
 *      = [600,000 − 4·40,000 − T(conv)] + (400,000 − conv)·0.77 + conv
 *      = 748,000 + 0.23·conv − T(conv),   T(conv) = handOrdinaryTax(conv)
 *  - f(0) = 0 · f(57,000) = 13,110 − 2,480 = 10,630 · f(133,000) = 30,590 − 11,600 =
 *    18,990 · f(243,600) = 56,028 − 35,932 = 20,096 ⇒ the 22%-top anchor is the optimum
 *    and the ordering is STRICT: 243,600 > 133,000 > 57,000 > 0.
 *  - Survival ≡ 1 everywhere (worst year-0 gross = 40,000 + 35,932 = 75,932 from a 600,000
 *    taxable bucket; Σgross ≤ 195,932).
 */
import type { PersonInputs, SimulationParams } from '@shared/model'
import { enumerateCandidates, type CandidateStrategy } from '../../solver/candidates'
import { handBandTop, handOrdinaryTax, handStandardDeduction } from './handTax'
import type { SolverCaseFixture } from './types'

export const CASE_II_HEIR_BRACKET = 0.23 // declared FIXTURE parameter (never a minted default)
const HORIZON = 4
const SPENDING = 40_000
const PRETAX = 400_000
const TAXABLE = 600_000

const people: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
  { sex: 'male', currentAge: 60, birthYear: 1966, retirementAge: 60, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
]

export function caseIiBuildBase(): SimulationParams {
  return {
    initialPortfolio: TAXABLE + PRETAX,
    annualSpendingReal: SPENDING,
    stockWeight: 0.5,
    people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
    market: {
      stock: { mean: 0, stdDev: 0 },
      bond: { mean: 0, stdDev: 0 },
      inflation: { mean: 0, stdDev: 0 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths: 2,
    maxHorizonYears: HORIZON,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true, // inert — ages 60–63
      startCalendarYear: 2026,
      buckets: { taxable: TAXABLE, pretax: PRETAX, roth: 0 },
      initialTaxableBasis: TAXABLE,
      filing: 'mfj',
    },
  }
}

/** The enumerator's grid, filtered to the taxable-first policy row — this case isolates the
 *  CONVERSION axis (the policy axis is case (i)'s subject); the filter is declared, never
 *  silent. The a24 anchor's rejection is asserted here at build time (the legality witness). */
export function caseIiBuildCandidates(): readonly CandidateStrategy[] {
  const { candidates, rejected } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: 0, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: PRETAX,
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 1 },
  })
  // The 24%-top anchor (edge 403,550 + SD = 435,750) exceeds the 400,000 headroom — the
  // RMD-first legality filter must have rejected it (an out-of-range sentinel, never a
  // silently-scored candidate that the engine's clamp would collapse into the full-convert).
  const sd = handStandardDeduction('mfj')
  const a24 = handBandTop(0.24, 'mfj') + sd
  if (!rejected.some((r) => r.amountReal === a24 && r.reason === 'exceeds-post-rmd-headroom')) {
    throw new Error('[case-ii] the over-headroom 24%-top anchor must be REJECTED by the legality filter')
  }
  return candidates.filter((c) => c.policy === 'taxable-first')
}

function expected(): Readonly<Record<string, number>> {
  const sd = handStandardDeduction('mfj')
  const a10 = handBandTop(0.1, 'mfj') + sd
  const a12 = handBandTop(0.12, 'mfj') + sd
  const a22 = handBandTop(0.22, 'mfj') + sd
  const bequest = (conv: number): number =>
    TAXABLE -
    HORIZON * SPENDING -
    handOrdinaryTax(conv, 'mfj') +
    (PRETAX - conv) * (1 - CASE_II_HEIR_BRACKET) +
    conv
  return {
    anchor10: a10,
    anchor12: a12,
    anchor22: a22,
    bequestConv0: bequest(0),
    bequestA10: bequest(a10),
    bequestA12: bequest(a12),
    bequestA22: bequest(a22),
    lifetimeTaxA22: handOrdinaryTax(a22, 'mfj'), // the conversion's own tax is the world's ONLY tax
  }
}

/** The expected ranking ids are DERIVED from the table (the anchors move with a vintage
 *  bump, loudly, instead of a stale literal silently mismatching). */
function expectedRankingIds(): readonly string[] {
  const sd = handStandardDeduction('mfj')
  return [
    `taxable-first:${handBandTop(0.22, 'mfj') + sd}`,
    `taxable-first:${handBandTop(0.12, 'mfj') + sd}`,
    `taxable-first:${handBandTop(0.1, 'mfj') + sd}`,
    'taxable-first:0',
  ]
}

export const caseBracketFill: SolverCaseFixture = {
  id: 'case-ii-bracket-fill',
  title: 'stripped bracket-fill optimum — convert to the 22%-band top (marginal < hb 0.23) and no further',
  goal: 'leave-more',
  preconditions: {
    state: 'absent',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: false,
    rmd: false,
    heirBracket: CASE_II_HEIR_BRACKET,
    ruleBoundaries: [
      'r = 0 ⇒ conversion TIMING is inert; only the rate-vs-hb compare decides (the equalization rule, exact)',
      'committed income 0 ⇒ every anchor is edge + SD by linear arithmetic (the enumerator and the hand form must agree)',
      'hb 0.23 sits strictly between the 22% and 24% bands — the optimum is the 22%-top by construction; a table vintage moving either band re-derives this fixture, never re-pins it blind',
      'the 24%-top anchor exceeds post-RMD headroom ⇒ the legality filter rejection is part of the fixture',
      'spending drawn taxable-first at basis == value ⇒ the conversion tax is the world’s ONLY tax',
    ],
  },
  seed: 0x5eed2,
  buildBase: caseIiBuildBase,
  buildCandidates: caseIiBuildCandidates,
  get expectedRankingIds() {
    return expectedRankingIds()
  },
  expected,
  tieTolerance: 0,
}
