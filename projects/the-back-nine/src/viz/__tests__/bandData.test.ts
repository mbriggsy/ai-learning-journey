import { describe, expect, it } from 'vitest'
import { LATTICE_POINTS, isFixedLattice, type BandSample } from '../bandData'

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
