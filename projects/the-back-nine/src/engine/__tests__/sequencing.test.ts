import { describe, it, expect } from 'vitest'
import { allocateWithdrawal, totalAcrossBuckets, type AccountBuckets, type BucketWithdrawals } from '@engine/sequencing'
import { DRAWDOWN_POLICIES } from '@shared/model'

const sum = (w: BucketWithdrawals): number => w.taxable + w.pretax + w.roth
const multi: AccountBuckets = { taxable: 300, pretax: 500, roth: 200 } // total 1000

describe('allocateWithdrawal — conservation', () => {
  it('every policy draws exactly the requested amount when funds suffice', () => {
    for (const policy of DRAWDOWN_POLICIES) {
      expect(sum(allocateWithdrawal(multi, 400, policy))).toBeCloseTo(400, 9)
    }
  })

  it('never draws more than exists (over-withdrawal clamps to the total)', () => {
    for (const policy of DRAWDOWN_POLICIES) {
      const w = allocateWithdrawal(multi, 5000, policy)
      expect(sum(w)).toBeCloseTo(totalAcrossBuckets(multi), 9)
      expect(w.taxable).toBeLessThanOrEqual(multi.taxable + 1e-9)
      expect(w.pretax).toBeLessThanOrEqual(multi.pretax + 1e-9)
      expect(w.roth).toBeLessThanOrEqual(multi.roth + 1e-9)
    }
  })

  it('a zero (or negative) withdrawal draws nothing', () => {
    expect(allocateWithdrawal(multi, 0, 'proportional')).toEqual({ taxable: 0, pretax: 0, roth: 0 })
    expect(allocateWithdrawal(multi, -50, 'taxable-first')).toEqual({ taxable: 0, pretax: 0, roth: 0 })
  })
})

describe('allocateWithdrawal — policy semantics (the four are genuinely distinct)', () => {
  it('taxable-first exhausts taxable before touching pre-tax or Roth', () => {
    const w = allocateWithdrawal(multi, 400, 'taxable-first')
    expect(w.taxable).toBe(300) // exhausted
    expect(w.pretax).toBe(100) // overflow into pre-tax
    expect(w.roth).toBe(0) // Roth untouched
  })

  it('pre-tax-first exhausts pre-tax first', () => {
    const w = allocateWithdrawal(multi, 400, 'pre-tax-first')
    expect(w.pretax).toBe(400)
    expect(w.taxable).toBe(0)
    expect(w.roth).toBe(0)
  })

  it('proportional splits pro-rata to balances', () => {
    const w = allocateWithdrawal(multi, 100, 'proportional')
    expect(w.taxable).toBeCloseTo(30, 9) // 300/1000
    expect(w.pretax).toBeCloseTo(50, 9) // 500/1000
    expect(w.roth).toBeCloseTo(20, 9) // 200/1000
  })

  it('bracket-fill follows pre-tax-first in P1 (tax-aware behavior is U2)', () => {
    expect(allocateWithdrawal(multi, 400, 'bracket-fill')).toEqual(
      allocateWithdrawal(multi, 400, 'pre-tax-first'),
    )
  })

  it('the policies produce DIFFERENT allocations on a multi-bucket state', () => {
    const tf = allocateWithdrawal(multi, 400, 'taxable-first')
    const pf = allocateWithdrawal(multi, 400, 'pre-tax-first')
    const pr = allocateWithdrawal(multi, 400, 'proportional')
    expect(tf).not.toEqual(pf)
    expect(tf).not.toEqual(pr)
    expect(pf).not.toEqual(pr)
  })
})

describe('reduce-to-spine: policy is INERT on a single pool', () => {
  it('with funds in only one bucket, all four policies draw identically', () => {
    const onePool: AccountBuckets = { taxable: 0, pretax: 1000, roth: 0 }
    const results = DRAWDOWN_POLICIES.map((p) => allocateWithdrawal(onePool, 350, p))
    const first = results[0]
    for (const r of results) {
      expect(r).toEqual(first)
      expect(r?.pretax).toBe(350) // all from the only source
    }
  })

  it('is pure / deterministic — the same call yields the identical allocation', () => {
    const a = allocateWithdrawal(multi, 273.5, 'proportional')
    const b = allocateWithdrawal(multi, 273.5, 'proportional')
    expect(a).toEqual(b)
  })
})
