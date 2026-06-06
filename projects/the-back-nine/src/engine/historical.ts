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
 *  (2) directional — lands NEAR the published Trinity/Bengen figures (right band),
 *      not exact: the committed Shiller series uses long-term GOVERNMENT bonds
 *      (yield-as-return), not Trinity's long-term CORPORATE nor Bengen's
 *      intermediate-government, so exact equality is gated on pinning those datasets
 *      (the P1 exit gate). The MC band (simulate.ts) is asserted strictly BELOW this
 *      anchor in the stress region.
 */
import { runDecumulation, type PortfolioState } from '@engine/decumulation'
import { NEVER_DEPLETED } from '@shared/model'
import { type ShillerYear } from '@engine/reference/shillerSeries'

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
