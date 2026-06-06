import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  standardNormal,
  toLogMoments,
  simpleReturnFromNormal,
  cumulativeReturn,
  annualizedGeometricReturn,
} from '@engine/rng'

describe('mulberry32 — seeded determinism (the CRN foundation)', () => {
  it('same seed reproduces the identical sequence', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b())
  })

  it('different seeds diverge', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    let anyDifferent = false
    for (let i = 0; i < 50; i++) if (a() !== b()) anyDifferent = true
    expect(anyDifferent).toBe(true)
  })

  it('stays uniform on [0, 1) — never < 0, never >= 1', () => {
    const r = mulberry32(99)
    for (let i = 0; i < 100_000; i++) {
      const u = r()
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThan(1)
    }
  })

  it('is byte-stable for a pinned seed (a regression in the PRNG fails loud)', () => {
    // First three draws of mulberry32(42) — a committed snapshot. If the algorithm
    // or the |0 coercions ever change, this breaks (the determinism self-test).
    const r = mulberry32(42)
    expect(r()).toBeCloseTo(0.6011037519201636, 15)
    expect(r()).toBeCloseTo(0.44829055899754167, 15)
    expect(r()).toBeCloseTo(0.8524657934904099, 15)
  })
})

describe('standardNormal — STATELESS Box-Muller (no cached spare)', () => {
  it('consumes EXACTLY two uniforms per call (a cached spare would consume 0 on alternate calls)', () => {
    let calls = 0
    const base = mulberry32(7)
    const counting = () => {
      calls++
      return base()
    }
    standardNormal(counting)
    expect(calls).toBe(2)
    standardNormal(counting)
    expect(calls).toBe(4) // not 2 — proves no spare was returned on the 2nd call
    standardNormal(counting)
    expect(calls).toBe(6)
  })

  it('is deterministic for a seed and finite for every draw', () => {
    const a = mulberry32(2024)
    const b = mulberry32(2024)
    for (let i = 0; i < 1000; i++) {
      const za = standardNormal(a)
      expect(za).toBe(standardNormal(b))
      expect(Number.isFinite(za)).toBe(true)
    }
  })

  it('produces ~N(0,1): sample mean ≈ 0 and sample sd ≈ 1', () => {
    const r = mulberry32(31337)
    const n = 200_000
    let sum = 0
    const xs: number[] = []
    for (let i = 0; i < n; i++) {
      const z = standardNormal(r)
      xs.push(z)
      sum += z
    }
    const mean = sum / n
    let varSum = 0
    for (const z of xs) varSum += (z - mean) ** 2
    const sd = Math.sqrt(varSum / n)
    expect(mean).toBeCloseTo(0, 1) // within ~0.05
    expect(sd).toBeCloseTo(1, 1) // within ~0.05
  })
})

describe('toLogMoments — exact simple→log conversion (volatility drag)', () => {
  it('matches a hand-computed case (independent of the engine formula, DND/012)', () => {
    // m=0.08, s=0.20:
    //   phi=1.08, s²/phi²=0.04/1.1664=0.0342936, σ²=ln(1.0342936)=0.0337185
    //   σ=0.183626, μ=ln(1.08)−σ²/2=0.0769610−0.0168593=0.0601017
    const { mu, sigma } = toLogMoments(0.08, 0.2)
    expect(mu).toBeCloseTo(0.0601017, 6)
    expect(sigma).toBeCloseTo(0.183626, 6)
  })

  it('drift is strictly below ln(1+m) by σ²/2 (the drag is present, not omitted)', () => {
    const m = 0.1
    const s = 0.18
    const { mu, sigma } = toLogMoments(m, s)
    expect(mu).toBeLessThan(Math.log(1 + m))
    expect(Math.log(1 + m) - mu).toBeCloseTo((sigma * sigma) / 2, 12)
  })

  it('zero volatility → drift is exactly ln(1+m), σ = 0 (no drag without vol)', () => {
    const { mu, sigma } = toLogMoments(0.05, 0)
    expect(sigma).toBe(0)
    expect(mu).toBeCloseTo(Math.log(1.05), 15)
  })
})

describe('simpleReturnFromNormal — lognormal draw', () => {
  it('z=0 returns the lognormal median exp(μ)−1; higher z → higher return', () => {
    const lm = toLogMoments(0.08, 0.2)
    const atZero = simpleReturnFromNormal(lm, 0)
    expect(atZero).toBeCloseTo(Math.exp(lm.mu) - 1, 12)
    expect(simpleReturnFromNormal(lm, 1)).toBeGreaterThan(atZero)
    expect(simpleReturnFromNormal(lm, -1)).toBeLessThan(atZero)
  })
})

describe('return labels — cumulative vs annualized geometric (distinct, §Strand 4)', () => {
  it('+50% then −50%: cumulative −25%, annualized geometric ≈ −13.4%', () => {
    const seq = [0.5, -0.5]
    expect(cumulativeReturn(seq)).toBeCloseTo(-0.25, 12)
    expect(annualizedGeometricReturn(seq)).toBeCloseTo(-0.133975, 6)
  })

  it('a flat 0% sequence is 0 by both measures', () => {
    expect(cumulativeReturn([0, 0, 0])).toBe(0)
    expect(annualizedGeometricReturn([0, 0, 0])).toBe(0)
  })
})
