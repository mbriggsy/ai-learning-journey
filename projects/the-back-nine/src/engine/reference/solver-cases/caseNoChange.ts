/**
 * ORACLE CASE (v) — the no-change case (U14 S2).
 *
 * The SAME constant-marginal-rate mechanics as case (i) (see caseConstantRate.ts for the
 * full derivation apparatus) with its own knobs (spending 1,000,000 ⇒ net 50,000/yr), whose
 * point is the ROUTING assertion, not the tax ledger: when the conventional drawdown +
 * conversion-0 IS the known-best for `(model, goal)`, the harness must crown the LABELED
 * conventional baseline — `provenance === 'conventional-baseline'`, conversion null — and
 * never a fabricated active move. The candidate set's baseline-presence guarantee (S1) is
 * what makes "recommend nothing" an expressible answer; this fixture is the case that
 * exercises it end-to-end.
 *
 * Derivation (the case-(i) closed forms at net = 50,000): lifetime tax = 5·T0 (taxable-first)
 * < 5·(T0 + m·s·gross_p) (proportional) < 5·(T0 + m·gross*) (pre-tax-first == bracket-fill).
 */
import type { SimulationParams } from '@shared/model'
import { enumerateCandidates, type CandidateStrategy } from '../../solver/candidates'
import { handOrdinaryTax } from './handTax'
import type { SolverCaseFixture } from './types'
import { CASE_I_TOP_MARGINAL, caseConstantRate } from './caseConstantRate'

const STREAM_TAXABLE = 950_000
const SPENDING = 1_000_000
const NET = SPENDING - STREAM_TAXABLE // 50,000
const HORIZON = 5

function buildBase(): SimulationParams {
  return { ...caseConstantRate.buildBase(), annualSpendingReal: SPENDING }
}

function buildCandidates(): readonly CandidateStrategy[] {
  const { candidates } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: STREAM_TAXABLE, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: 4_000_000,
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 1 },
  })
  return candidates
}

function expected(): Readonly<Record<string, number>> {
  const t0 = handOrdinaryTax(STREAM_TAXABLE, 'mfj')
  return {
    lifetimeTaxTaxableFirst: HORIZON * t0,
    lifetimeTaxPretaxFirst: HORIZON * ((NET + t0) / (1 - CASE_I_TOP_MARGINAL) - NET), // the table-read rate (U14 fold — never re-typed)
  }
}

export const caseNoChange: SolverCaseFixture = {
  id: 'case-v-no-change',
  title: 'no-change world — the conventional/conversion-0 LABELED baseline is crowned, never a fabricated move',
  goal: 'pay-less-tax',
  preconditions: {
    ...caseConstantRate.preconditions,
    ruleBoundaries: [
      ...caseConstantRate.preconditions.ruleBoundaries,
      'the winner must BE the conventional-baseline candidate (provenance-checked) — the no-change routing contract (plan case (v))',
    ],
  },
  seed: 0x5eed5,
  buildBase,
  buildCandidates,
  // U15 §S0.4 provenance labels (values unchanged): the crowned winner IS the conventional
  // baseline (the no-change routing contract) — its id carries the `conventional:` arm.
  expectedRankingIds: ['conventional:taxable-first:0', 'grid:proportional:0', 'grid:pre-tax-first:0', 'grid:bracket-fill:0'],
  expected,
  tieTolerance: 0,
}
