/**
 * The pay-less-tax ALL-IN finiteness seam (build spec D6): `simulate`'s per-path finiteness check
 * covers the two healthcare accruals the all-in cost sums — `totalNetPremiumReal` and
 * `totalMedicareCostReal` — so a non-finite one routes the CANDIDATE to the typed infeasible
 * sentinel (ranked worst as a whole) instead of reaching `scoreFromDistribution`, where the all-in
 * `mean` would throw and abort the whole batch.
 *
 * The validation gate already refuses every non-finite INPUT, so a live run cannot hand the overlay a
 * NaN premium — the arm plants it on the overlay's OUTPUT (a pass-through mock of
 * `runTaxAwareDecumulation` that overwrites one accrual on its result — case (iii) carries no budget,
 * so there is no floor pass to touch), the only way to reach the seam. Throw-or-nothing: the control
 * arm proves the unplanted run is untouched and scored.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { simulate } from '@engine/simulate'
import { caseAcaCliff } from '../reference/solver-cases'
import { collectCandidateOutcome } from '../validation/evaluate'

type Plant = { field: 'totalNetPremiumReal' | 'totalMedicareCostReal'; value: number } | undefined
const plant: { current: Plant } = { current: undefined }

vi.mock('@engine/taxOverlay', async (importOriginal) => {
  const real = await importOriginal<typeof import('@engine/taxOverlay')>()
  return {
    ...real,
    runTaxAwareDecumulation: (...args: Parameters<typeof real.runTaxAwareDecumulation>) => {
      const res = real.runTaxAwareDecumulation(...args)
      const p = plant.current
      return p === undefined ? res : { ...res, [p.field]: p.value }
    },
  }
})

afterEach(() => {
  plant.current = undefined
})

const anyCandidate = { policy: 'pre-tax-first', conversion: null, provenance: 'grid' } as const

describe('the all-in finiteness seam (D6) — a non-finite healthcare accrual is a typed infeasible candidate', () => {
  it('CONTROL: the unplanted healthcare-priced run is scored, with a real premium on every path (the arm is not vacuous)', () => {
    const out = simulate(caseAcaCliff.buildBase(), caseAcaCliff.seed)
    if (out.indeterminate || out.infeasible) throw new Error('the case (iii) base must resolve')
    expect(out.distribution.taxAware!.lifetimeNetPremiumReal.every((x) => x > 0)).toBe(true)
    expect(collectCandidateOutcome(anyCandidate, out).kind).toBe('scored')
  })

  for (const field of ['totalNetPremiumReal', 'totalMedicareCostReal'] as const) {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      it(`${field} = ${String(value)} routes the candidate INFEASIBLE (never a throw in the all-in mean)`, () => {
        plant.current = { field, value }
        const out = simulate(caseAcaCliff.buildBase(), caseAcaCliff.seed)
        expect(out.indeterminate).toBe(false)
        expect(out.indeterminate === false && out.infeasible).toBe(true)
        if (out.indeterminate || !out.infeasible) throw new Error('unreachable')
        expect(out.reason).toMatch(/non-finite/)
        expect(out.pathIndex).toBe(0)
        expect(collectCandidateOutcome(anyCandidate, out).kind).toBe('infeasible')
      })
    }
  }
})
