import { describe, it, expect } from 'vitest'
import { allocateWithdrawal, generalDrawableTotal, totalAcrossBuckets, type AccountBuckets, type BucketWithdrawals } from '@engine/sequencing'
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

  it('bracket-fill with NO ceiling (+Infinity default) is exactly pre-tax-first', () => {
    // The no-ceiling fallback: until a caller injects the discretionary pre-tax cap, bracket-fill
    // behaves as pre-tax-first (so a single pool stays inert — reduce-to-spine).
    expect(allocateWithdrawal(multi, 400, 'bracket-fill')).toEqual(allocateWithdrawal(multi, 400, 'pre-tax-first'))
    expect(allocateWithdrawal(multi, 400, 'bracket-fill', Number.POSITIVE_INFINITY)).toEqual(
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

describe('bracket-fill with an injected ceiling (U2 · M6a) — fill pre-tax to the cap, then tax-free', () => {
  it('caps the discretionary pre-tax draw at the ceiling, then spills to taxable then Roth', () => {
    // ceiling 100 < target 400: pre-tax fills only to 100 (cheap ordinary income), the remaining 300
    // draws tax-free — taxable (300, exhausted) then Roth (0 needed). Roth is preserved last.
    expect(allocateWithdrawal(multi, 400, 'bracket-fill', 100)).toEqual({ taxable: 300, pretax: 100, roth: 0 })
  })

  it('a zero ceiling draws NO discretionary pre-tax — pure taxable-then-Roth (the ACA-cliff extreme)', () => {
    // ceiling 0: skip pre-tax entirely, draw taxable (300) then Roth (100) → the "add no ordinary income"
    // case U3 reaches when the ACA subsidy cliff binds at the current MAGI.
    expect(allocateWithdrawal(multi, 400, 'bracket-fill', 0)).toEqual({ taxable: 300, pretax: 0, roth: 100 })
  })

  it('the ceiling cannot leave spending unfunded — tax-free exhausted ⇒ draw the rest from pre-tax ABOVE the ceiling', () => {
    // thin tax-free buckets: ceiling 100 caps the cheap draw, but taxable(50)+roth(50) cover only 100 of
    // the remaining 300, so the last 200 must come from pre-tax above the ceiling (spending wins).
    const thin: AccountBuckets = { taxable: 50, pretax: 500, roth: 50 }
    const w = allocateWithdrawal(thin, 400, 'bracket-fill', 100)
    expect(w).toEqual({ taxable: 50, pretax: 300, roth: 50 })
    expect(sum(w)).toBe(400)
  })

  it('conserves + clamps with a ceiling (sums to target when funds suffice; to the total when over-drawn)', () => {
    expect(sum(allocateWithdrawal(multi, 400, 'bracket-fill', 100))).toBeCloseTo(400, 9)
    const over = allocateWithdrawal(multi, 5000, 'bracket-fill', 100)
    expect(sum(over)).toBeCloseTo(totalAcrossBuckets(multi), 9)
    expect(over.pretax).toBeLessThanOrEqual(multi.pretax + 1e-9)
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

  it('bracket-fill is inert on a single pre-tax pool EVEN with a binding ceiling (reduce-to-spine survives)', () => {
    // a low ceiling caps the cheap draw, but the only bucket is pre-tax, so the remainder-fallback draws
    // the rest from pre-tax above the ceiling → all 350 from pre-tax, identical to every other policy.
    const onePool: AccountBuckets = { taxable: 0, pretax: 1000, roth: 0 }
    expect(allocateWithdrawal(onePool, 350, 'bracket-fill', 100)).toEqual({ taxable: 0, pretax: 350, roth: 0 })
  })

  it('is pure / deterministic — the same call yields the identical allocation', () => {
    const a = allocateWithdrawal(multi, 273.5, 'proportional')
    const b = allocateWithdrawal(multi, 273.5, 'proportional')
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// U3 · M5 — the hsa 4th bucket is MEDICAL-EARMARKED: structurally outside the
// general drawdown order. `BucketWithdrawals` is keyed on `GeneralBucketKey`
// (compile-time guard); these pin the RUNTIME half.
// ---------------------------------------------------------------------------
describe('U3 · M5 — hsa is never a general drawdown source', () => {
  const withHsa: AccountBuckets = { taxable: 300, pretax: 500, roth: 200, hsa: 10_000 }

  it('the two totals split exactly at hsa (insight 014 crossing: dark at hsa = 0)', () => {
    expect(generalDrawableTotal(withHsa)).toBe(1000)
    expect(totalAcrossBuckets(withHsa)).toBe(11_000)
    // dark at hsa = 0 / absent — the split is invisible there (the crossing class):
    expect(generalDrawableTotal(multi)).toBe(totalAcrossBuckets(multi))
    expect(generalDrawableTotal({ ...multi, hsa: 0 })).toBe(totalAcrossBuckets({ ...multi, hsa: 0 }))
  })

  it('an over-withdrawal clamps to the GENERAL total — the fat hsa bucket funds nothing (the laundering guard)', () => {
    for (const policy of DRAWDOWN_POLICIES) {
      const w = allocateWithdrawal(withHsa, 5_000, policy)
      // drains the three general buckets exactly; hsa dollars never enter the draw
      expect(sum(w)).toBeCloseTo(generalDrawableTotal(withHsa), 9)
      // the returned record cannot even name hsa (GeneralBucketKey) — pin the runtime shape too
      expect(Object.keys(w).sort()).toEqual(['pretax', 'roth', 'taxable'])
    }
  })

  it('allocation with an hsa present is byte-identical to the same general buckets without it', () => {
    for (const policy of DRAWDOWN_POLICIES) {
      expect(allocateWithdrawal(withHsa, 400, policy)).toEqual(allocateWithdrawal(multi, 400, policy))
    }
  })

  it('proportional shares are computed over the GENERAL total, never the hsa-inclusive one', () => {
    // 400 over a 1000 general pool → 40% of each general bucket. An hsa-inclusive denominator
    // (11,000) would yield ~3.6% shares summing to ~36 — a planted hsa-inclusive arm fails loudly.
    const w = allocateWithdrawal(withHsa, 400, 'proportional')
    expect(w.taxable).toBeCloseTo(120, 9)
    expect(w.pretax).toBeCloseTo(200, 9)
    expect(w.roth).toBeCloseTo(80, 9)
  })
})
