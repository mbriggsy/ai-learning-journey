/**
 * The ONE per-year decumulation update (cross-cutting contract #3).
 *
 * Both the historical backtest (historical.ts, fixed return sequences) and the Monte
 * Carlo spine (simulate.ts, sampled returns) run decumulation through THIS function —
 * so the within-year order of operations (withdraw vs apply-return vs rebalance) is
 * shared by construction and can NEVER drift between the validated spine and an
 * overlay. Everything upstream — the earned-income bridge (nets the withdrawal
 * down), the U2 tax overlay + U3 health overlay (gross it up) — is a deterministic
 * transform of the cash-flow term fed into `stepYear`; none reorder the update or
 * draw randomness here.
 *
 * Pure: no entropy/clock/environment. Returns flow in as arguments (the normals are
 * generated once, in a dimension-only order, by simulate.ts).
 */
import { NEVER_DEPLETED, type DepletionYear } from '@shared/model'

/** Per-asset REAL balances carried year-to-year. In P1 the "portfolio" is a single
 *  pool split only by asset (stock/bond); U2 adds per-account buckets that SHARE
 *  these same returns (contract #2) and differ only in tax treatment. */
export interface PortfolioState {
  readonly stock: number
  readonly bond: number
}

export const totalValue = (s: PortfolioState): number => s.stock + s.bond

/** The result of one year's update. */
export interface StepResult {
  readonly state: PortfolioState
  /** True iff the net withdrawal could not be funded this year (the portfolio hit
   *  zero). Once true the caller stops drawing — balances stay at zero. */
  readonly depleted: boolean
}

/**
 * One year of decumulation. PINNED order (contract #3):
 *   1. take the (already-net) withdrawal from the total,
 *   2. rebalance the post-withdrawal total to the target stock weight,
 *   3. apply that year's real returns per asset.
 *
 * `netWithdrawal` is the cash actually needed AFTER the bridge nets it down and the
 * overlays gross it up — `stepYear` never sees spending, taxes, or premiums, only the
 * single net number. If it exceeds the portfolio, the year depletes (balances → 0).
 */
export function stepYear(
  state: PortfolioState,
  realStockReturn: number,
  realBondReturn: number,
  netWithdrawal: number,
  stockWeight: number,
): StepResult {
  const afterWithdrawal = totalValue(state) - netWithdrawal
  if (afterWithdrawal <= 0) {
    return { state: { stock: 0, bond: 0 }, depleted: true }
  }
  const stock = stockWeight * afterWithdrawal
  const bond = afterWithdrawal - stock // exact complement (no second multiply drift)
  return {
    state: {
      stock: stock * (1 + realStockReturn),
      bond: bond * (1 + realBondReturn),
    },
    depleted: false,
  }
}

/** The outcome of running a full decumulation path. */
export interface DecumulationResult {
  /** Real portfolio value at the end of the horizon (0 if it depleted). */
  readonly terminalReal: number
  /** Absolute year index at which the portfolio first depleted, or
   *  {@link NEVER_DEPLETED} if it survived the whole horizon. */
  readonly depletionYear: DepletionYear
}

/**
 * Run a decumulation path: one {@link stepYear} per year, fed the real (stock, bond)
 * returns and the already-net withdrawal for that absolute year. The three arrays are
 * indexed by ABSOLUTE year and must each cover the horizon; running out of data ends
 * the path (the data length is the horizon — never a silent 0-return year). After
 * depletion the portfolio stays at zero.
 */
export function runDecumulation(
  initial: PortfolioState,
  realStockReturns: readonly number[],
  realBondReturns: readonly number[],
  netWithdrawals: readonly number[],
  stockWeight: number,
): DecumulationResult {
  let state = initial
  let depletionYear: DepletionYear = NEVER_DEPLETED
  const horizon = netWithdrawals.length

  for (let t = 0; t < horizon; t++) {
    const rs = realStockReturns[t]
    const rb = realBondReturns[t]
    const w = netWithdrawals[t]
    // Aligned-length contract: a missing entry is the end of data, not a 0 year.
    if (rs === undefined || rb === undefined || w === undefined) break

    const step = stepYear(state, rs, rb, w, stockWeight)
    state = step.state
    if (step.depleted) {
      depletionYear = t
      break
    }
  }

  return { terminalReal: totalValue(state), depletionYear }
}
