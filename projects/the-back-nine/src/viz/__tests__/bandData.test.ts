import { describe, expect, it } from 'vitest'
import { LATTICE_POINTS, isFixedLattice, resolveBandData, type BandSample } from '../bandData'
import type { BandFan } from '@shared/model'

/**
 * The fixed-lattice guard (bandData.isFixedLattice) — the fail-loud contract the U7 producer MUST
 * call before handing the band a fan. The band is a PURE renderer (back-nine-design §3 — it draws
 * what it is GIVEN); this guard is the seam that keeps a malformed fan from drawing a
 * silently-wrong, calm-but-wrong band. These prove the guard's LOGIC now — before U7 depends on
 * it — so it can never rot back to untested dead code. Every reject arm carries the planted-PASS
 * control (a well-formed lattice) so it can't pass vacuously.
 */

// A well-formed fan: LATTICE_POINTS samples, monotonic years, ordered non-negative percentiles.
function goodLattice(): BandSample[] {
  const out: BandSample[] = []
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const y = (i / (LATTICE_POINTS - 1)) * 30
    const mid = 900_000 - y * 8_000
    const half = 120_000
    out.push({ yearsFromNow: y, p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half })
  }
  return out
}

describe('isFixedLattice — the fail-loud fixed-lattice guard (the U7 producer seam)', () => {
  it('ACCEPTS a well-formed fan (the planted PASS control — proves the rejects below are non-vacuous)', () => {
    expect(isFixedLattice(goodLattice())).toBe(true)
  })

  it('REJECTS a wrong-length fan (off-by-one breaks the constant-point-count morph)', () => {
    expect(isFixedLattice(goodLattice().slice(0, LATTICE_POINTS - 1))).toBe(false) // 48
    expect(isFixedLattice([...goodLattice(), goodLattice()[0]!])).toBe(false) // 50
    expect(isFixedLattice([])).toBe(false)
  })

  it('REJECTS a non-monotonic year lattice (a year that goes backwards folds the polyline)', () => {
    const bad = goodLattice()
    bad[10] = { ...bad[10]!, yearsFromNow: bad[9]!.yearsFromNow - 1 }
    expect(isFixedLattice(bad)).toBe(false)
  })

  it('REJECTS an INVERTED fan (p90 < p10 — the low edge would draw ABOVE the high edge, a confident lie)', () => {
    const bad = goodLattice()
    bad[5] = { ...bad[5]!, p10: 900_000, p90: 100_000 } // transposed edges
    expect(isFixedLattice(bad)).toBe(false)
  })

  it('REJECTS a negative percentile (a portfolio value < $0 is never an honest band sample)', () => {
    const bad = goodLattice()
    bad[5] = { ...bad[5]!, p10: -1 }
    expect(isFixedLattice(bad)).toBe(false)
  })

  it('REJECTS a non-finite percentile (Infinity/NaN slip past relational guards — finiteness first)', () => {
    const inf = goodLattice()
    inf[5] = { ...inf[5]!, p90: Number.POSITIVE_INFINITY }
    expect(isFixedLattice(inf)).toBe(false)
    const nan = goodLattice()
    nan[5] = { ...nan[5]!, p50: Number.NaN }
    expect(isFixedLattice(nan)).toBe(false)
  })
})

/**
 * resolveBandData — the producer seam (the deferred U6-review obligation, now wired). Resamples the
 * engine's per-year fan onto the fixed lattice, computes the dollarMax ≥ max(p90) scale guard, and
 * THROWS on a malformed fan before the band can draw it. A LINEAR fan makes every resampled lattice
 * value hand-verifiable (linear interpolation of a linear function is exact at every point).
 */

// A linear fan over yearsFromNow 0..4: p50 = 1000 − 100·y; edges ±25/±50; cohort thins 1.0 → 0.6.
function linearFan(): BandFan {
  const byYear = [0, 1, 2, 3, 4].map((y) => {
    const p50 = 1000 - 100 * y
    return { yearsFromNow: y, p10: p50 - 50, p25: p50 - 25, p50, p75: p50 + 25, p90: p50 + 50, cohortFraction: 1 - 0.1 * y }
  })
  return { byYear }
}

const fmt = (d: number) => `$${Math.round(d)}`

describe('resolveBandData — the producer seam (resample + dollarMax guard + fail-loud)', () => {
  it('produces a well-formed fixed lattice over the fan horizon (the anchor + last year preserved)', () => {
    const r = resolveBandData(linearFan(), 'borderline', { formatDollar: fmt })
    expect(r.kind).toBe('resolved')
    expect(r.outcomeState).toBe('borderline')
    expect(r.samples).toHaveLength(LATTICE_POINTS)
    expect(isFixedLattice(r.samples)).toBe(true)
    expect(r.horizonYears).toBe(4) // the fan's last living-cohort year

    // The anchor (today) and the last lattice point reproduce the fan's endpoints exactly.
    expect(r.samples[0]).toMatchObject({ yearsFromNow: 0, p10: 950, p25: 975, p50: 1000, p75: 1025, p90: 1050 })
    const last = r.samples[LATTICE_POINTS - 1]!
    expect(last.yearsFromNow).toBeCloseTo(4, 10)
    expect(last.p50).toBeCloseTo(600, 8)
    expect(last.p90).toBeCloseTo(650, 8)
  })

  it('resamples by EXACT linear interpolation at every lattice point (p50 = 1000 − 100·yearsFromNow)', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    for (const s of r.samples) {
      expect(s.p50).toBeCloseTo(1000 - 100 * s.yearsFromNow, 8)
      // The cohort fraction rides the same linear interpolation (1 − 0.1·y).
      expect(s.cohortFraction).toBeCloseTo(1 - 0.1 * s.yearsFromNow, 8)
    }
    // Spot points that land on exact household-clock years.
    expect(r.samples[12]!.p50).toBeCloseTo(900, 8) // x = 1
    expect(r.samples[24]!.p50).toBeCloseTo(800, 8) // x = 2
  })

  it('dollarMax is a humane ceiling ≥ max(p90) (the asymmetric scale guard) with sane headroom', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    const maxP90 = Math.max(...r.samples.map((s) => s.p90)) // 1050 (at the anchor)
    expect(r.dollarMax).toBeGreaterThanOrEqual(maxP90)
    expect(r.dollarMax).toBeLessThanOrEqual(maxP90 * 2) // not absurd headroom
    expect(r.dollarMax).toBeGreaterThan(0) // a non-degenerate fan ⇒ a positive ceiling (the all-$0 fan is its own throw-test below)
  })

  it('y-ticks anchor at $0 (the ruin floor) and top out at dollarMax, labelled via the caller formatter', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    expect(r.yTicks[0]).toEqual({ dollars: 0, label: '$0' })
    expect(r.yTicks[r.yTicks.length - 1]!.dollars).toBe(r.dollarMax)
    expect(r.yTicks.every((t) => t.label === `$${Math.round(t.dollars)}`)).toBe(true)
  })

  it('passes household-clock annotations + callouts through verbatim', () => {
    const annotations = [{ id: 'death', yearsFromNow: 3, label: 'Survivor years', ages: '~88 / 86', description: 'one outlives the other' }]
    const callouts = [{ id: 'likely', yearsFromNow: 2, dollars: 800, text: 'most likely' }]
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt, annotations, callouts })
    expect(r.annotations).toEqual(annotations)
    expect(r.callouts).toEqual(callouts)
  })

  it('PLANTED FAIL: an inverted fan (p10 > p90) makes the producer THROW — never a silently-wrong band', () => {
    // Transpose one year's edges: the low edge would draw ABOVE the high edge (a confident lie).
    const base = linearFan()
    const bad: BandFan = {
      byYear: base.byYear.map((y, i) => (i === 2 ? { ...y, p10: 900, p90: 100 } : y)),
    }
    expect(() => resolveBandData(bad, 'off-track', { formatDollar: fmt })).toThrow(/malformed lattice/)
  })

  it('THROWS on a degenerate fan with no year beyond the anchor (nothing to draw)', () => {
    const anchorOnly: BandFan = { byYear: [{ yearsFromNow: 0, p10: 1000, p25: 1000, p50: 1000, p75: 1000, p90: 1000, cohortFraction: 1 }] }
    expect(() => resolveBandData(anchorOnly, 'indeterminate', { formatDollar: fmt })).toThrow(/today anchor \+ one year/)
  })

  it('THROWS at the seam on an all-$0 fan ($0-portfolio household) — no honest dollar scale, NOT "malformed"', () => {
    // initialPortfolio === 0 is a VALID decumulation run (an income-funded $0-portfolio household); its
    // fan is all-$0 → maxP90 = 0 → dollarMax = 0. The lattice is well-formed (0 ≤ 0 ≤ … is ordered), so
    // this is caught by the dollarMax seam guard, NOT the malformed-lattice guard — and at the SEAM, not
    // deferred to yForDollars mid-render (which would throw a generic geometry error on a real household).
    const zero = (y: number) => ({ yearsFromNow: y, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 })
    const allZero: BandFan = { byYear: [0, 1, 2, 3, 4].map(zero) }
    expect(() => resolveBandData(allZero, 'over-funded', { formatDollar: fmt })).toThrow(/no positive dollar scale/)
  })

  it('THROWS at the seam on an out-of-[0,1] cohortFraction (the honesty signal would draw false certainty)', () => {
    const base = linearFan()
    const nan: BandFan = { byYear: base.byYear.map((y, i) => (i === 2 ? { ...y, cohortFraction: Number.NaN } : y)) }
    expect(() => resolveBandData(nan, 'on-track', { formatDollar: fmt })).toThrow(/cohortFraction/)
    const tooBig: BandFan = { byYear: base.byYear.map((y, i) => (i === 2 ? { ...y, cohortFraction: 1.5 } : y)) }
    expect(() => resolveBandData(tooBig, 'on-track', { formatDollar: fmt })).toThrow(/cohortFraction/)
  })
})
