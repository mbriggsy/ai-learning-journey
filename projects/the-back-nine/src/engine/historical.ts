/**
 * The historical-sequence backtest — the engine's deterministic ANCHOR (validation
 * mode A). It replays FIXED historical return sequences through the same
 * `runDecumulation` the Monte Carlo spine uses (contract #3), so the backtest and
 * the MC share one decumulation mechanic byte-for-byte.
 *
 * Asserted two ways (findings §Strand 4):
 *  (1) self-consistency — reproduces a committed fixture (here: hand-derived
 *      mechanical goldens + the Shiller-series rolling-window rate), so an engine
 *      regression fails loud;
 *  (2) directional — lands NEAR the published Trinity/Bengen figures (right band).
 *      TWO committed series feed it: the Shiller govt-bond series (the original
 *      golden anchor — yield-as-return, runs at the top of the band) and the
 *      Damodaran total-return series (damodaranSeries.ts, the re-scoped P1-exit
 *      proxy pin, 2026-06-11: the Aaa-corporate Trinity arm lands 37/39 ≈ 94.9%
 *      vs the published 95.1%; the 10yr-Treasury Bengen arm runs CONSERVATIVE by
 *      duration vs his 5yr intermediate). Bit-exact published-figure equality is
 *      RETIRED — SBBI is commercial + edition-revised, and Bengen's own 1994-95
 *      tail was estimated — so survive/fail + pinned window counts are the honest
 *      bar. The MC band (simulate.ts) is asserted strictly BELOW this anchor in
 *      the stress region.
 */
import { runDecumulation, type PortfolioState } from '@engine/decumulation'
import { NEVER_DEPLETED } from '@shared/model'
import { type ShillerYear } from '@engine/reference/shillerSeries'
import { type DamodaranYear } from '@engine/reference/damodaranSeries'

/** One year of REAL (inflation-adjusted) returns. */
export interface RealYear {
  readonly year: number
  readonly realStock: number
  readonly realBond: number
}

/**
 * Deflate a nominal Shiller series to REAL annual returns using realized inflation
 * (cpi[t]/cpi[t−1]): realReturn = (1 + nominal) / inflationFactor − 1. The first
 * input year has no prior CPI, so the output starts at the second year (this is why
 * the fixture includes 1925 — so 1926 is the first real year).
 */
export function toRealSeries(series: readonly ShillerYear[]): RealYear[] {
  const out: RealYear[] = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const cur = series[i]
    if (prev === undefined || cur === undefined) continue
    const inflationFactor = cur.cpi / prev.cpi
    out.push({
      year: cur.year,
      realStock: (1 + cur.stockNominal) / inflationFactor - 1,
      realBond: (1 + cur.bondNominal) / inflationFactor - 1,
    })
  }
  return out
}

/**
 * Deflate the Damodaran total-return series to REAL annual returns. Unlike the
 * Shiller path (CPI LEVELS — the first year needs a prior level), Damodaran
 * carries each year's inflation RATE directly, so every committed year converts
 * and the output covers 1928-1995 in full. `bondLeg` selects the validation arm:
 * 'aaaCorporate' = the Trinity long-term-corporate proxy (the high-grade match),
 * 'baaCorporate' = the one-notch-lower comparison arm, 'tbond10' = the Bengen
 * intermediate-government proxy (duration-conservative; see the series header).
 */
export function damodaranToReal(
  series: readonly DamodaranYear[],
  bondLeg: 'aaaCorporate' | 'baaCorporate' | 'tbond10',
): RealYear[] {
  return series.map(y => {
    const bondNominal =
      bondLeg === 'aaaCorporate'
        ? y.aaaCorporateNominal
        : bondLeg === 'baaCorporate'
          ? y.baaCorporateNominal
          : y.tbond10Nominal
    return {
      year: y.year,
      realStock: (1 + y.stockNominal) / (1 + y.inflationRate) - 1,
      realBond: (1 + bondNominal) / (1 + y.inflationRate) - 1,
    }
  })
}

/** A backtest configuration (Trinity/Bengen shape). */
export interface BacktestConfig {
  readonly initialPortfolio: number
  /** Initial withdrawal as a fraction of the portfolio; held FLAT in real terms
   *  (inflation-adjusted withdrawals === constant real withdrawal). */
  readonly withdrawalRate: number
  readonly stockWeight: number
  readonly horizonYears: number
}

const initialState = (cfg: BacktestConfig): PortfolioState => ({
  stock: cfg.stockWeight * cfg.initialPortfolio,
  bond: (1 - cfg.stockWeight) * cfg.initialPortfolio,
})

/**
 * Run ONE fixed historical window of length `horizonYears` starting at index
 * `start` in `real`. Returns true iff the portfolio survived (never depleted and a
 * positive terminal balance). Returns false if the window runs past the data.
 */
export function backtestWindow(
  real: readonly RealYear[],
  start: number,
  cfg: BacktestConfig,
): boolean {
  if (start + cfg.horizonYears > real.length) return false
  const stockReturns: number[] = []
  const bondReturns: number[] = []
  const withdrawals: number[] = []
  const flatRealWithdrawal = cfg.initialPortfolio * cfg.withdrawalRate
  for (let t = 0; t < cfg.horizonYears; t++) {
    const y = real[start + t]
    if (y === undefined) return false
    stockReturns.push(y.realStock)
    bondReturns.push(y.realBond)
    withdrawals.push(flatRealWithdrawal)
  }
  const res = runDecumulation(
    initialState(cfg),
    stockReturns,
    bondReturns,
    withdrawals,
    cfg.stockWeight,
  )
  return res.depletionYear === NEVER_DEPLETED && res.terminalReal > 0
}

/** The outcome of a Trinity-style rolling-window backtest. */
export interface RollingResult {
  /** Fraction of windows that survived — the published "success rate" analogue. */
  readonly rate: number
  readonly windows: number
  readonly successes: number
}

/**
 * Trinity-style success rate: run every rolling `horizonYears` window that fits in
 * `real` and report the fraction that survived. Over the Shiller 1926–1995 real
 * series with a 30-year horizon this is the 41 overlapping windows (1926–1955 …
 * 1966–1995) the Trinity study reports.
 */
export function rollingSuccessRate(real: readonly RealYear[], cfg: BacktestConfig): RollingResult {
  let windows = 0
  let successes = 0
  for (let start = 0; start + cfg.horizonYears <= real.length; start++) {
    windows++
    if (backtestWindow(real, start, cfg)) successes++
  }
  return { rate: windows > 0 ? successes / windows : 0, windows, successes }
}
