/**
 * ORACLE CASE (iv) — the §1014/IRD leave-more inversion (U14 S2; plan contract #4/#7).
 *
 * THE POINT: the GROSS-bequest-best strategy is NOT the AFTER-TAX-best. Converting pre-tax
 * dollars pays tax now (shrinking the GROSS estate) while flipping IRD-taxable dollars into
 * tax-free Roth dollars (growing the AFTER-TAX estate whenever the conversion's marginal fed
 * rate < the declared heir bracket). A solver that argmaxes the gross bequest crowns
 * conversion-0 — the exact calm-but-wrong ranking this case exists to fail loud on: the
 * disclosed-omission rule's own falsifiable test (a disclosure cannot fix a ranking argmaxed
 * on the wrong quantity).
 *
 * THE WORLD: the case-(ii) mechanics (r = 0, MFJ 60/60, fixed-horizon 3, SS/gains/cliffs/rmd
 * all off, spending 30,000 drawn taxable-first tax-free) with hb = 0.32 — ABOVE every band
 * the grid can reach inside the 300,000 headroom (10/12/22 all < 0.32), so after-tax value
 * is strictly increasing across the whole feasible grid while gross value is strictly
 * DECREASING (each anchor pays more tax now). Perfect anti-alignment: the two objectives
 * produce exactly OPPOSITE rankings over the same candidates.
 *
 * HAND DERIVATION (worked 2026-07-18; expected() re-derives):
 *  - grossBequest(conv) = 800,000 − 3·30,000 − T(conv) = 710,000 − T(conv) → argmax conv 0.
 *  - afterTax(conv) = [500,000 − 90,000 − T(conv)] + (300,000 − conv)·0.68 + conv
 *                   = 614,000 + 0.32·conv − T(conv)
 *    f(0) = 0 · f(57,000) = 18,240 − 2,480 = 15,760 · f(133,000) = 42,560 − 11,600 =
 *    30,960 · f(243,600) = 77,952 − 35,932 = 42,020 → argmax = the 22%-top anchor, and the
 *    after-tax ranking is the EXACT REVERSE of the gross ranking.
 */
import type { SimulationParams } from '@shared/model'
import { enumerateCandidates, type CandidateStrategy } from '../../solver/candidates'
import { handBandTop, handOrdinaryTax, handStandardDeduction } from './handTax'
import type { SolverCaseFixture } from './types'
import { caseIiBuildBase } from './caseBracketFill'

export const CASE_IV_HEIR_BRACKET = 0.32
const HORIZON = 3
const SPENDING = 30_000
const PRETAX = 300_000
const TAXABLE = 500_000

function buildBase(): SimulationParams {
  const base = caseIiBuildBase()
  return {
    ...base,
    initialPortfolio: TAXABLE + PRETAX,
    annualSpendingReal: SPENDING,
    maxHorizonYears: HORIZON,
    overlay: {
      ...base.overlay!,
      buckets: { taxable: TAXABLE, pretax: PRETAX, roth: 0 },
      initialTaxableBasis: TAXABLE,
    },
  }
}

function buildCandidates(): readonly CandidateStrategy[] {
  const { candidates } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: 0, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: PRETAX,
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 1 },
  })
  return candidates.filter((c) => c.policy === 'taxable-first')
}

function expected(): Readonly<Record<string, number>> {
  const bequest = (conv: number): number =>
    TAXABLE -
    HORIZON * SPENDING -
    handOrdinaryTax(conv, 'mfj') +
    (PRETAX - conv) * (1 - CASE_IV_HEIR_BRACKET) +
    conv
  const gross = (conv: number): number => TAXABLE + PRETAX - HORIZON * SPENDING - handOrdinaryTax(conv, 'mfj')
  const sd = handStandardDeduction('mfj')
  const a22 = handBandTop(0.22, 'mfj') + sd
  return {
    afterTaxBest: bequest(a22),
    afterTaxConv0: bequest(0),
    grossConv0: gross(0),
    grossBest: gross(a22),
  }
}

function expectedRankingIds(): readonly string[] {
  const sd = handStandardDeduction('mfj')
  // U15 §S0.4 provenance labels (amounts unchanged): grid conversion arms + the conventional
  // conversion-0 baseline (the gross-argmax LOSER, contract #7 — see the test's inversion arm).
  return [
    `grid:taxable-first:${handBandTop(0.22, 'mfj') + sd}`,
    `grid:taxable-first:${handBandTop(0.12, 'mfj') + sd}`,
    `grid:taxable-first:${handBandTop(0.1, 'mfj') + sd}`,
    'conventional:taxable-first:0',
  ]
}

export const caseLeaveMore: SolverCaseFixture = {
  id: 'case-iv-leave-more-inversion',
  title: '§1014/IRD inversion — the gross-bequest argmax (conversion-0) is the after-tax LOSER',
  goal: 'leave-more',
  preconditions: {
    state: 'absent',
    deterministic: true,
    survivorTransition: false,
    socialSecurity: false,
    capitalGains: false,
    healthcareCliffs: false,
    rmd: false,
    heirBracket: CASE_IV_HEIR_BRACKET,
    ruleBoundaries: [
      'hb 0.32 exceeds every reachable band (10/12/22) ⇒ after-tax is strictly increasing over the grid while gross is strictly decreasing — exact anti-alignment by construction',
      'the gross ranking is asserted as the REVERSE of the after-tax ranking (the fails-loud control arm)',
      'r = 0, basis == value, taxable-first spending ⇒ the conversion tax is the only tax (case-(ii) mechanics)',
    ],
  },
  seed: 0x5eed4,
  buildBase,
  buildCandidates,
  get expectedRankingIds() {
    return expectedRankingIds()
  },
  expected,
  tieTolerance: 0,
}
