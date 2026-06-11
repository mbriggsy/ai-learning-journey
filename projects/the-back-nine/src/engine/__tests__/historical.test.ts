import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { toRealSeries, damodaranToReal, rollingSuccessRate, backtestWindow, type BacktestConfig, type RealYear } from '@engine/historical'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import { DAMODARAN_1928_1995 } from '@engine/reference/damodaranSeries'

const real = toRealSeries(SHILLER_1925_1995)

describe('toRealSeries — nominal → real deflation', () => {
  it('starts at 1926 (the first year with a prior CPI) and is 70 years long', () => {
    expect(real.length).toBe(70) // 1926..1995
    expect(real[0]?.year).toBe(1926)
    expect(real[real.length - 1]?.year).toBe(1995)
  })

  it('applies the exact Fisher real-return formula (clean synthetic case, DND/012)', () => {
    // nominal +21% under exactly +10% inflation → real = 1.21/1.10 − 1 = 0.10 exactly;
    // nominal +10% under +10% inflation → real = 1.10/1.10 − 1 = 0 exactly.
    const synthetic = toRealSeries([
      { year: 1924, cpi: 100, stockNominal: 0, bondNominal: 0 },
      { year: 1925, cpi: 110, stockNominal: 0.21, bondNominal: 0.1 },
    ])
    expect(synthetic).toHaveLength(1)
    expect(synthetic[0]?.realStock).toBeCloseTo(0.1, 12)
    expect(synthetic[0]?.realBond).toBeCloseTo(0.0, 12)
  })

  it('the 1926 Shiller real stock return is a sane ~7% (directional sanity)', () => {
    // nominal 10.73% under 1926 inflation (17.9/17.3 ≈ 3.47%) → ≈ 7.0% real.
    expect(real[0]?.realStock).toBeGreaterThan(0.06)
    expect(real[0]?.realStock).toBeLessThan(0.08)
  })
})

describe('Trinity-style rolling backtest (DIRECTIONAL — Shiller govt bonds)', () => {
  const cfg5050: BacktestConfig = {
    initialPortfolio: 1000,
    withdrawalRate: 0.04,
    stockWeight: 0.5,
    horizonYears: 30,
  }

  it('runs the 41 overlapping 30-year windows of 1926–1995', () => {
    const res = rollingSuccessRate(real, cfg5050)
    expect(res.windows).toBe(41) // 1926–1955 … 1966–1995
  })

  it('50/50 / 4% / 30yr lands directionally near the published 95% (right band)', () => {
    const res = rollingSuccessRate(real, cfg5050)
    // DIRECTIONAL band, not exact: the committed series uses Shiller long-term
    // GOVERNMENT bonds (yield-as-return, lower vol), so a govt-bond Trinity recreation
    // runs at the high end (~95–100%) vs Trinity's 95% corporate. Exact is gated on
    // pinning the long-term-corporate series (P1 exit gate).
    console.log(`[directional] 50/50 4% 30yr success = ${(res.rate * 100).toFixed(1)}% (${res.successes}/${res.windows})`)
    // Observed 100% (41/41) — the documented govt-bond recreation value (Pfau): the
    // Shiller long-term-government yield-as-return has near-zero vol, so it runs at
    // the TOP of the band vs Trinity's 95% corporate. ≥95% is the directional floor.
    expect(res.rate).toBeGreaterThanOrEqual(0.95)
    expect(res.rate).toBeLessThanOrEqual(1.0)
  })

  it('the 100%-bond diagnostic: bonds are NOT safe (materially below 50/50)', () => {
    // §Strand-4 diagnostic — a correct inflation-adjusted engine must show bonds
    // doing POORLY (Trinity 100%-bond/4% ≈ 70%). With Shiller govt yield-as-return,
    // real bond returns are crushed in the 1966–1981 high-inflation windows.
    const bond = rollingSuccessRate(real, { ...cfg5050, stockWeight: 0 })
    const blend = rollingSuccessRate(real, cfg5050)
    console.log(`[directional] 100%-bond 4% 30yr success = ${(bond.rate * 100).toFixed(1)}% (${bond.successes}/${bond.windows})`)
    // Observed 56.1% (23/41) — directionally the "bonds do poorly" regime (Trinity
    // corporate ≈ 70%; lower here with govt yield-as-return). The point is the SHAPE:
    // bonds are demonstrably not safe under inflation-adjusted withdrawals.
    expect(bond.rate).toBeLessThan(blend.rate)
    expect(bond.rate).toBeGreaterThan(0.4)
    expect(bond.rate).toBeLessThan(0.75)
  })
})

describe('C2 — the Trinity oracle is byte-identical through the runDecumulation signature change', () => {
  it('the rolling success COUNTS are pinned exactly (the appended-and-absent contribution param moves nothing)', () => {
    // The backtest runs through the SAME runDecumulation whose signature C2 extended with the
    // appended optional contribution stream (contract #3). With the stream absent every credit
    // is an exact IEEE no-op, so the as-shipped pre-C2 counts hold byte-identically — these are
    // the exact observed values the directional bands above bracket (41/41 at 50/50; 23/41 at
    // 100% bonds). A count flip here means the signature change perturbed the oracle.
    const cfg: BacktestConfig = { initialPortfolio: 1000, withdrawalRate: 0.04, stockWeight: 0.5, horizonYears: 30 }
    const blend = rollingSuccessRate(real, cfg)
    const bond = rollingSuccessRate(real, { ...cfg, stockWeight: 0 })
    expect([blend.successes, blend.windows]).toEqual([41, 41])
    expect([bond.successes, bond.windows]).toEqual([23, 41])
  })
})

describe('backtestWindow — boundary behaviour', () => {
  it('returns false for a window that runs past the data', () => {
    expect(backtestWindow(real, real.length - 5, {
      initialPortfolio: 1000,
      withdrawalRate: 0.04,
      stockWeight: 0.5,
      horizonYears: 30,
    })).toBe(false)
  })
})

// ─── The Damodaran total-return arms (the re-scoped P1-exit proxy pin, 2026-06-11) ───
//
// Every count below is pinned to an INDEPENDENT blended-multiplier derivation
// (DND/012, run 2026-06-11): an annually-rebalanced 50/50 portfolio updates as
// (total − w) · (1 + (rs + rb)/2) — algebraically identical to the engine's
// split-grow-sum stepYear, arithmetically distinct (different op order). The
// knife-edge scan showed the closest surviving window keeps 4.09% of initial
// (1964 cohort, 4% Aaa) — orders of magnitude above float noise, so the integer
// counts MUST match exactly; a count flip is a real regression, never tolerance.

describe('Damodaran series — structure + externally-derived spot goldens', () => {
  it('is 68 contiguous years 1928–1995, every field finite', () => {
    expect(DAMODARAN_1928_1995).toHaveLength(68)
    DAMODARAN_1928_1995.forEach((y, i) => {
      expect(y.year).toBe(1928 + i)
      expect(Number.isFinite(y.stockNominal)).toBe(true)
      expect(Number.isFinite(y.aaaCorporateNominal)).toBe(true)
      expect(Number.isFinite(y.baaCorporateNominal)).toBe(true)
      expect(Number.isFinite(y.tbond10Nominal)).toBe(true)
      expect(Number.isFinite(y.inflationRate)).toBe(true)
    })
  })

  it('matches the recon agent\'s independently-reported source values (DND/012 — two extractions, one truth)', () => {
    // These eight values were reported (4 d.p.) by a SEPARATE recon agent reading the
    // same source file in its own session, before this extraction existed.
    const byYear = new Map(DAMODARAN_1928_1995.map(y => [y.year, y]))
    expect(byYear.get(1931)?.baaCorporateNominal).toBeCloseTo(-0.1568, 4)
    expect(byYear.get(1932)?.baaCorporateNominal).toBeCloseTo(0.2359, 4)
    expect(byYear.get(1966)?.baaCorporateNominal).toBeCloseTo(-0.0345, 4)
    expect(byYear.get(1982)?.baaCorporateNominal).toBeCloseTo(0.2905, 4)
    expect(byYear.get(1982)?.tbond10Nominal).toBeCloseTo(0.3281, 4)
    expect(byYear.get(1994)?.tbond10Nominal).toBeCloseTo(-0.0804, 4)
    expect(byYear.get(1995)?.baaCorporateNominal).toBeCloseTo(0.2009, 4)
    expect(byYear.get(1995)?.tbond10Nominal).toBeCloseTo(0.2348, 4)
  })

  it('the 1931 grade spread: Aaa mild, Baa crash — the reason Aaa is the Trinity arm', () => {
    const y1931 = DAMODARAN_1928_1995.find(y => y.year === 1931)
    expect(y1931?.aaaCorporateNominal).toBeGreaterThan(-0.02) // ≈ −1.6%
    expect(y1931?.baaCorporateNominal).toBeLessThan(-0.15) // ≈ −15.7%
  })

  it('every DamodaranYear binds to the committed extraction snapshot (insight 021 — review fold 2026-06-11)', () => {
    // The adversary proved the window COUNTS are integral guards: a ±3pp corruption of a
    // non-anchored interior year flips no count, and the 8 spot goldens never touch
    // stockNominal or the Trinity-arm aaaCorporateNominal. This bind kills the class:
    // EVERY cell must equal the committed extraction (damodaran-snapshot/, sha256-pinned,
    // itself validated 8/8 vs an independent recon agent + cross-sheet 68/68 at extract
    // time). toBe-exact: both sides are the same doubles through String()/JSON round-trips.
    interface ExtractRow {
      readonly year: number
      readonly aaa: number
      readonly baa: number
      readonly tbond10: number
      readonly stock: number
      readonly inflation: number
    }
    const raw = JSON.parse(
      readFileSync(
        fileURLToPath(new URL('../reference/damodaran-snapshot/damodaran-extract.json', import.meta.url)),
        'utf8',
      ),
    ) as readonly ExtractRow[]
    expect(raw).toHaveLength(68)
    DAMODARAN_1928_1995.forEach((y, i) => {
      const r = raw[i]
      expect(r, `snapshot row ${i} present`).toBeDefined()
      if (!r) return
      expect(y.year).toBe(r.year)
      expect(y.stockNominal, `stock ${y.year}`).toBe(r.stock)
      expect(y.aaaCorporateNominal, `aaa ${y.year}`).toBe(r.aaa)
      expect(y.baaCorporateNominal, `baa ${y.year}`).toBe(r.baa)
      expect(y.tbond10Nominal, `tbond10 ${y.year}`).toBe(r.tbond10)
      expect(y.inflationRate, `inflation ${y.year}`).toBe(r.inflation)
    })
  })
})

describe('Trinity arm — 50/50 stock / Aaa-corporate (Damodaran proxy pin)', () => {
  const realAaa = damodaranToReal(DAMODARAN_1928_1995, 'aaaCorporate')
  const cfg5050: BacktestConfig = {
    initialPortfolio: 1000,
    withdrawalRate: 0.04,
    stockWeight: 0.5,
    horizonYears: 30,
  }

  const failingStartYears = (realSeries: readonly RealYear[], cfg: BacktestConfig): number[] => {
    const fails: number[] = []
    for (let s = 0; s + cfg.horizonYears <= realSeries.length; s++) {
      if (!backtestWindow(realSeries, s, cfg)) {
        const y = realSeries[s]
        if (y !== undefined) fails.push(y.year)
      }
    }
    return fails
  }

  it('runs the 39 overlapping 30-year windows of 1928–1995 (vs Trinity\'s 41 from 1926)', () => {
    const res = rollingSuccessRate(realAaa, cfg5050)
    expect(res.windows).toBe(39) // 1928–1957 … 1966–1995 (the 1926/27 cohorts predate FRED yields)
  })

  it('4%/30yr lands at the derived 37/39 ≈ 94.9% — beside the published 39/41 ≈ 95.1%', () => {
    const res = rollingSuccessRate(realAaa, cfg5050)
    console.log(`[proxy-pin] Aaa 50/50 4% 30yr success = ${(res.rate * 100).toFixed(1)}% (${res.successes}/${res.windows})`)
    expect([res.successes, res.windows]).toEqual([37, 39])
  })

  it('the failing cohorts are exactly {1965, 1966} — the same cohorts Trinity shows failing', () => {
    expect(failingStartYears(realAaa, cfg5050)).toEqual([1965, 1966])
  })

  it('the Baa comparison arm agrees on counts (37/39) — grade moves depletion depth, not this rate', () => {
    const realBaa = damodaranToReal(DAMODARAN_1928_1995, 'baaCorporate')
    const res = rollingSuccessRate(realBaa, cfg5050)
    expect([res.successes, res.windows]).toEqual([37, 39])
  })

  it('monotone in the withdrawal rate: 3% → 39/39, 5% → 25/39 (derived counts)', () => {
    expect(rollingSuccessRate(realAaa, { ...cfg5050, withdrawalRate: 0.03 }).successes).toBe(39)
    expect(rollingSuccessRate(realAaa, { ...cfg5050, withdrawalRate: 0.05 }).successes).toBe(25)
  })
})

describe('Bengen arm — 50/50 stock / 10yr-Treasury (Damodaran, duration-CONSERVATIVE proxy)', () => {
  const realTb = damodaranToReal(DAMODARAN_1928_1995, 'tbond10')
  const cfg = (rate: number): BacktestConfig => ({
    initialPortfolio: 1000,
    withdrawalRate: rate,
    stockWeight: 0.5,
    horizonYears: 30,
  })

  it('4.0%/30yr = 36/39 with worst cohorts {1964, 1965, 1966} — Bengen\'s worst-case structure', () => {
    const res = rollingSuccessRate(realTb, cfg(0.04))
    console.log(`[proxy-pin] 10yr-Treasury 50/50 4% 30yr success = ${(res.rate * 100).toFixed(1)}% (${res.successes}/${res.windows})`)
    expect([res.successes, res.windows]).toEqual([36, 39])
    const fails: number[] = []
    for (let s = 0; s + 30 <= realTb.length; s++) {
      if (!backtestWindow(realTb, s, cfg(0.04))) fails.push(realTb[s]?.year ?? -1)
    }
    expect(fails).toEqual([1964, 1965, 1966])
  })

  it('4.15% (his published SAFEMAX) = 35/39 here — the documented 10yr-vs-5yr duration gap, conservative direction', () => {
    // Bengen's 4.15% held ALL windows on SBBI 5yr-intermediate; the 10yr proxy's extra
    // duration drops 4 windows (1962/64/65/66). The proxy NEVER reports a higher safe
    // rate than the 5yr truth — strictly the safe direction for a survival floor.
    const res = rollingSuccessRate(realTb, cfg(0.0415))
    expect([res.successes, res.windows]).toEqual([35, 39])
  })

  it('the SAFEMAX analogue brackets ~3.67%: all 39 survive at 3.60%, not all at 3.75% (derived)', () => {
    expect(rollingSuccessRate(realTb, cfg(0.036)).successes).toBe(39)
    expect(rollingSuccessRate(realTb, cfg(0.0375)).successes).toBeLessThan(39)
  })
})
