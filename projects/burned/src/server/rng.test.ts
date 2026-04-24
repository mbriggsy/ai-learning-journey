import { describe, expect, it } from 'vitest'
import { mulberry32, randomIntFromRandom } from './rng'

function sequence(rand: () => number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(rand())
  return out
}

describe('mulberry32', () => {
  it('same seed produces the same sequence', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(sequence(a, 100)).toEqual(sequence(b, 100))
  })

  it('different seeds produce different sequences', () => {
    const a = sequence(mulberry32(42), 100)
    const b = sequence(mulberry32(43), 100)
    expect(a).not.toEqual(b)
    // Strong divergence: first element already differs.
    expect(a[0]).not.toBe(b[0])
  })

  it('seed 0 produces a valid non-degenerate sequence', () => {
    const seq = sequence(mulberry32(0), 100)
    // Not all zeros (the classic "seed 0 is a no-op" bug).
    expect(seq.some(n => n !== 0)).toBe(true)
    // All values in [0, 1)
    expect(seq.every(n => n >= 0 && n < 1)).toBe(true)
    // Reasonable variance — crude sanity, not a distribution test.
    const mean = seq.reduce((acc, n) => acc + n, 0) / seq.length
    expect(mean).toBeGreaterThan(0.2)
    expect(mean).toBeLessThan(0.8)
  })

  it('values are always in [0, 1)', () => {
    const seq = sequence(mulberry32(12345), 1000)
    expect(seq.every(n => n >= 0 && n < 1)).toBe(true)
  })

  it('is deterministic across calls — state lives on the closure, not globals', () => {
    const a = mulberry32(99)
    const vals1 = sequence(a, 10)
    // A fresh instance with the same seed reproduces vals1 exactly.
    const vals2 = sequence(mulberry32(99), 10)
    expect(vals1).toEqual(vals2)
  })

  it('two instances of mulberry32(42) advance independently (no shared state)', () => {
    // Regression: if the closure accidentally shared state via a module
    // global, advancing `a` would also advance `b`. Step-by-step parity
    // proves the generators are independent.
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b())
    }
  })
})

describe('randomIntFromRandom', () => {
  it('returns integers in [0, max)', () => {
    const rand = mulberry32(1)
    for (let i = 0; i < 1000; i++) {
      const v = randomIntFromRandom(rand, 10)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(10)
    }
  })

  it('max=1 always returns 0', () => {
    const rand = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      expect(randomIntFromRandom(rand, 1)).toBe(0)
    }
  })

  it('same seed produces same integer sequence', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    const seqA = Array.from({ length: 50 }, () => randomIntFromRandom(a, 256))
    const seqB = Array.from({ length: 50 }, () => randomIntFromRandom(b, 256))
    expect(seqA).toEqual(seqB)
  })

  it('covers the full [0, max) range over enough samples', () => {
    // For max=4, expect all four values to appear in 10000 samples.
    const rand = mulberry32(123)
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(randomIntFromRandom(rand, 4))
    expect(seen).toEqual(new Set([0, 1, 2, 3]))
  })
})
