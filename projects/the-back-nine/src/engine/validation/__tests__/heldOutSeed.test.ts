/**
 * U14 S5 — the held-out-seed defense: the canonical seedB derivation (structural rejection
 * of the planted near-integer sibling), the deterministic B-family, the empirical
 * decorrelation guard with its DEGENERATE-derivation control arm, and the ε split (the
 * A-side CRN-difference tie tolerance vs the B-side display band — with the demonstration
 * that a LEVEL-keyed band over-declares ties the difference band resolves).
 */
import { describe, it, expect } from 'vitest'
import { solverSelectionTieZ } from '@engine/constants'
import {
  decorrelationReportFor,
  deriveBFamilyMember,
  deriveSeedB,
  displayBand,
  isCanonicalSeedB,
  selectionTieTolerance,
  survivalIndicators,
} from '../heldOutSeed'
import { NEVER_DEPLETED } from '@shared/model'

describe('deriveSeedB — the canonical SplitMix expansion', () => {
  it('is deterministic, integer, signed-32, and far from the near-integer siblings', () => {
    const seedA = 0xbada55
    const b = deriveSeedB(seedA)
    expect(deriveSeedB(seedA)).toBe(b)
    expect(Number.isInteger(b)).toBe(true)
    expect(Math.abs(b)).toBeLessThanOrEqual(2 ** 31)
    expect(b).not.toBe(seedA)
    expect(b).not.toBe(seedA + 1)
    expect(b).not.toBe(seedA - 1)
  })

  it('rejects a non-integer seedA loudly', () => {
    expect(() => deriveSeedB(1.5)).toThrow(/integer/)
    expect(() => deriveSeedB(Number.NaN)).toThrow(/integer/)
  })

  it('THE PLANTED SIBLING: isCanonicalSeedB accepts ONLY the canonical derivation — seedA + 1 is REFUSED', () => {
    const seedA = 0xbada55
    expect(isCanonicalSeedB(seedA, deriveSeedB(seedA))).toBe(true)
    expect(isCanonicalSeedB(seedA, seedA + 1)).toBe(false) // the plan's named plant
    expect(isCanonicalSeedB(seedA, seedA)).toBe(false)
    expect(isCanonicalSeedB(seedA, deriveSeedB(seedA) + 1)).toBe(false)
    expect(isCanonicalSeedB(seedA, Number.NaN)).toBe(false)
  })
})

describe('deriveBFamilyMember — the deterministic, re-derivable hold-out family', () => {
  it('members are deterministic, pairwise distinct, and distinct from seedB (re-derivable on re-entry — U17)', () => {
    const seedB = deriveSeedB(0xbada55)
    const family = Array.from({ length: 5 }, (_, i) => deriveBFamilyMember(seedB, i))
    expect(Array.from({ length: 5 }, (_, i) => deriveBFamilyMember(seedB, i))).toEqual(family)
    expect(new Set(family).size).toBe(5)
    expect(family).not.toContain(seedB)
  })

  it('guards its integer domain', () => {
    expect(() => deriveBFamilyMember(1.5, 0)).toThrow()
    expect(() => deriveBFamilyMember(1, -1)).toThrow()
  })
})

describe('the empirical decorrelation guard (the degenerate-derivation catch)', () => {
  it('the canonical derivation’s streams are decorrelated (|r| inside the 6/√N bound)', () => {
    const seedA = 0xbada55
    const report = decorrelationReportFor(seedA, deriveSeedB(seedA))
    expect(report.withinBound, `|r| = ${Math.abs(report.pearsonR)} vs bound ${report.bound}`).toBe(true)
  })

  it('CONTROL (falsifiability): an IDENTITY “derivation” correlates at r = 1 and is caught', () => {
    const seedA = 0xbada55
    const report = decorrelationReportFor(seedA, seedA)
    expect(report.pearsonR).toBeCloseTo(1, 12)
    expect(report.withinBound).toBe(false)
  })
})

describe('the ε split — A-side CRN-difference tolerance vs B-side display band', () => {
  it('a constant paired advantage has ZERO difference-variance ⇒ tolerance 0 (CRN’s whole point)', () => {
    const n = 100
    expect(selectionTieTolerance(Array(n).fill(1), Array(n).fill(0))).toBe(0)
  })

  it('hand case: 10 winner-only paths of 100 ⇒ tolerance = z·√(var/n) — RESOLVES the 0.10 gap a LEVEL band would swallow', () => {
    // d = +1 on 10 paths, 0 on 90: mean 0.10; var = (10·0.9² + 90·0.1²)/99 = 8.1/99…
    const a = [...Array(10).fill(1), ...Array(90).fill(1)]
    const b = [...Array(10).fill(0), ...Array(90).fill(1)]
    const varD = (10 * 0.9 ** 2 + 90 * 0.1 ** 2) / 99
    const expected = solverSelectionTieZ.value * Math.sqrt(varD / 100)
    const tol = selectionTieTolerance(a, b)
    expect(tol).toBeCloseTo(expected, 12)
    // The CRN-difference tolerance RESOLVES the 0.10 survival gap…
    expect(tol).toBeLessThan(0.1)
    // …that a LEVEL-keyed band at these path counts would nearly swallow (the
    // re-contamination shape the split exists to forbid: the level band is ~0.098).
    expect(displayBand(0.5, 100)).toBeGreaterThan(tol)
  })

  it('fails loud on NaN, length mismatch, and tiny n (insights 008/010)', () => {
    expect(() => selectionTieTolerance([1, Number.NaN], [0, 0])).toThrow(/non-finite/)
    expect(() => selectionTieTolerance([1, 1], [0])).toThrow(/same-length/)
    expect(() => selectionTieTolerance([1], [0])).toThrow(/same-length|n ≥ 2/)
  })

  it('displayBand is the B-side rendered interval with its own guards', () => {
    expect(displayBand(0.85, 16_000)).toBeCloseTo(solverSelectionTieZ.value * Math.sqrt((0.85 * 0.15) / 16_000), 12)
    expect(() => displayBand(Number.NaN, 100)).toThrow(/finite/)
    expect(() => displayBand(0.5, 1)).toThrow(/integer ≥ 2/)
  })

  it('survivalIndicators maps depletion years to CRN-pairable 0/1 per path', () => {
    expect(
      survivalIndicators({ terminalValuesReal: [1, 0, 1], depletionYears: [NEVER_DEPLETED, 12, NEVER_DEPLETED], survivalFraction: 2 / 3 }),
    ).toEqual([1, 0, 1])
  })
})
