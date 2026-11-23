/**
 * The rough market (workbench plan U4, KTD3): one fixed sequence of market scores that no lever can change, so
 * the year-by-year table can show the plan, and every what-if, in the same bad market (R8).
 *
 * The pick is the worst 30-year start in the committed Shiller real-return series (`SHILLER_1925_1995`): the start
 * whose highest sustainable flat real withdrawal, at a fixed 50% stocks in history's own frame, is the lowest, ties
 * to the earlier year. `backtestWindow` only says survive or fail, and every window survives at 4%, so each
 * window's rate is FOUND by bisection on that one survival test, never read. The pick never re-ranks in a plan's
 * market.
 *
 * The scores fed to the run are that window's years from `shillerJointZSeries` (each asset's log real return,
 * standardized against the series' own averages and swings): the run keeps history's order of good and bad years
 * at the plan's own market level. History's raw returns in the window average above the plan's steady return,
 * so feeding them unscaled would make the rough view richer than the steady one. After the window's 30 years the
 * sequence reads steady (every score 0). The lifespans are the steady future's (the couple's middle years), so
 * the two views differ only in the market.
 *
 * Computed from the committed series on every call: nothing is baked, so no table can drift from its source
 * (insight 032). The injected scores bypass the correlation mix, so a market whose stock-bond correlation is not
 * 0 is refused by name, as `buildBootstrapDraws` refuses it.
 */
import { backtestWindow, toRealSeries, type RealYear } from '@engine/historical'
import { shillerJointZSeries } from '@engine/validation/blockBootstrap'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import { steadyFuture } from '@engine/simulate'
import type { NamedFuture, SimulationParams } from '@shared/model'

/** The length of the historical window (KTD3). */
export const ROUGH_WINDOW_YEARS = 30
/** The fixed stock share the pick is ranked at (KTD3). */
export const ROUGH_PICK_STOCK_WEIGHT = 0.5

/** Bisection passes on the withdrawal rate: far past a double's resolution on [0, 1]. */
const RATE_PASSES = 80

/** The highest flat real withdrawal rate (a share of the opening balance) the window starting at `start` survives
 *  for its whole length, at `stockWeight`, by bisection on `backtestWindow`. */
export function sustainableRate(real: readonly RealYear[], start: number, stockWeight: number): number {
  const survives = (withdrawalRate: number) =>
    backtestWindow(real, start, { initialPortfolio: 1, withdrawalRate, stockWeight, horizonYears: ROUGH_WINDOW_YEARS })
  let lo = 0
  let hi = 1
  if (!survives(lo)) throw new Error(`[roughSequence] the window from index ${start} does not survive with no withdrawal`)
  for (let pass = 0; pass < RATE_PASSES; pass++) {
    const mid = (lo + hi) / 2
    if (survives(mid)) lo = mid
    else hi = mid
  }
  return lo
}

/** One window's ranking: its first year and its highest sustainable rate. */
export interface RoughWindowRank {
  readonly startYear: number
  readonly sustainableRate: number
}

/** Every 30-year window of the committed series, ranked at `stockWeight` (history's own frame). */
export function rankRoughWindows(stockWeight: number = ROUGH_PICK_STOCK_WEIGHT): readonly RoughWindowRank[] {
  const real = toRealSeries(SHILLER_1925_1995)
  const out: RoughWindowRank[] = []
  for (let start = 0; start + ROUGH_WINDOW_YEARS <= real.length; start++) {
    out.push({ startYear: real[start]!.year, sustainableRate: sustainableRate(real, start, stockWeight) })
  }
  return out
}

/** The pick: the window with the lowest sustainable rate, ties to the earlier year. */
export function roughWindow(stockWeight: number = ROUGH_PICK_STOCK_WEIGHT): RoughWindowRank {
  const ranks = rankRoughWindows(stockWeight)
  let worst = ranks[0]!
  for (const r of ranks) if (r.sustainableRate < worst.sustainableRate) worst = r
  return worst
}

/** The rough market's scores for a run `horizonYears` long: the pick's 30 standardized years, then 0. They take
 *  no household input, so every plan and every what-if reads the same market. */
export function roughMarketScores(horizonYears: number): { readonly stockZ: number[]; readonly bondZ: number[] } {
  const { startYear } = roughWindow()
  const joint = shillerJointZSeries()
  const first = joint.findIndex((y) => y.year === startYear)
  const window = joint.slice(first, first + ROUGH_WINDOW_YEARS)
  const stockZ: number[] = []
  const bondZ: number[] = []
  for (let t = 0; t < horizonYears; t++) {
    stockZ.push(window[t]?.zStock ?? 0)
    bondZ.push(window[t]?.zBond ?? 0)
  }
  return { stockZ, bondZ }
}

/** The rough future for a run: the rough market and the steady future's lifespans, or a refusal by name. */
export function roughFuture(
  params: Pick<SimulationParams, 'maxHorizonYears' | 'people' | 'market'>,
): { readonly ok: true; readonly future: NamedFuture } | { readonly ok: false; readonly reason: string } {
  if (params.market.stockBondCorrelation !== 0) {
    return {
      ok: false,
      reason: `the rough market refuses stockBondCorrelation ≠ 0 (got ${params.market.stockBondCorrelation}): its scores bypass the correlation mix`,
    }
  }
  const { stockZ, bondZ } = roughMarketScores(params.maxHorizonYears)
  return { ok: true, future: { ...steadyFuture(params), stockZ, bondZ } }
}
