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
  /** The portfolio total AFTER withdraw → rebalance → grow but BEFORE the end-of-year
   *  contribution credit (C2 §2c). The tax overlay's bucket-scale MUST read THIS, never
   *  `totalValue(state)`: scaling buckets by the credit-inclusive total would smear the
   *  contribution pro-rata across every bucket (an asset-location violation) instead of
   *  crediting its named destination. Equal to `totalValue(state)` exactly when the
   *  contribution is 0 (the reduce-to-spine condition); 0 on a depleted year. */
  readonly growthOnlyTotal: number
}

/**
 * One year of decumulation. PINNED order (contract #3):
 *   1. take the (already-net) withdrawal from the total,
 *   2. rebalance the post-withdrawal total to the target stock weight,
 *   3. apply that year's real returns per asset,
 *   4. credit the year's contribution END-OF-YEAR, at face value (C2 §2).
 *
 * `netWithdrawal` is the cash actually needed AFTER the bridge nets it down and the
 * overlays gross it up — `stepYear` never sees spending, taxes, or premiums, only the
 * single net number. If it exceeds the portfolio, the year depletes (balances → 0).
 *
 * `contribution` is the accumulation plan's signed inflow term (C2). stepYear is the ONE
 * owner of the crediting convention (contract #3 — the order can never drift between the
 * spine and an overlay): the contribution is credited AFTER the return step, so a
 * contributed dollar earns NO growth in its arrival year. That is the CONSERVATIVE
 * direction — real payroll contributions arrive across the year (~half a year of growth
 * on average), so full-year crediting (the start-of-year mirror) would OVERSTATE the
 * retirement-onset balance → an earlier reported work-optional date → the calm-but-wrong-
 * OPTIMISTIC sin (R25); end-of-year crediting understates it → later/safer, never
 * optimistic (the same conservative-direction discipline as the survivor-SS gap in
 * `simulate.ts` cashTermsForYear). A DEPLETED year credits NOTHING — the path forfeits
 * the arrival-year contribution along with all later ones (defined conservative outcome,
 * C2 §2: depletion is the per-path grammar; `indeterminate` stays input-failure-only).
 * At `contribution = 0` every added operation is an exact IEEE no-op (`0 × w = 0`,
 * `x + 0 = x`), so the pre-C2 paths are byte-identical by construction.
 */
export function stepYear(
  state: PortfolioState,
  realStockReturn: number,
  realBondReturn: number,
  netWithdrawal: number,
  stockWeight: number,
  contribution: number = 0,
): StepResult {
  const afterWithdrawal = totalValue(state) - netWithdrawal
  if (afterWithdrawal <= 0) {
    return { state: { stock: 0, bond: 0 }, depleted: true, growthOnlyTotal: 0 }
  }
  const stock = stockWeight * afterWithdrawal
  const bond = afterWithdrawal - stock // exact complement (no second multiply drift)
  const grownStock = stock * (1 + realStockReturn)
  const grownBond = bond * (1 + realBondReturn)
  return {
    state: {
      // The end-of-year credit, split at the target weight (next year's rebalance reads
      // only the total, so the split is presentational — the TOTAL carries the contract).
      stock: grownStock + contribution * stockWeight,
      bond: grownBond + contribution * (1 - stockWeight),
    },
    depleted: false,
    growthOnlyTotal: grownStock + grownBond,
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
 *
 * `contributions` (C2, appended AFTER `stockWeight` — never inserted before it, which
 * would silently re-bind every existing call's `stockWeight` argument) is the optional
 * per-year signed inflow stream, indexed by ABSOLUTE year like the others but AUXILIARY:
 * a missing/short entry is a 0-inflow year (`?? 0`), NEVER the end of data — the
 * returns/withdrawals arrays alone govern the horizon (the same auxiliary-stream
 * convention as the overlay's `ssBenefits`/`conversions`). ABSENT ⇒ zero inflow every
 * year ⇒ byte-identical to the pre-C2 path (the reduce-to-spine condition).
 *
 * `balancesOut` (U6/U7 band fan — appended LAST for the same arg-stability reason) is an
 * optional sink the caller passes to OBSERVE the per-year portfolio total: each iterated
 * year pushes `totalValue(state)` AFTER that year's `stepYear` (so index t = the value at
 * the END of sim-year t; the depletion year pushes exactly $0 — the ruin floor records
 * itself). It is a PURE OBSERVATION — writing to an injected array changes no computation,
 * so a run WITH the sink is byte-identical to one without it (the reduce-to-spine fan guard).
 * Years AFTER depletion are not iterated (the loop breaks); the caller fills those alive-but-
 * broke years as $0 from the path's own horizon (it knows the couple's death year; this
 * function does not). ABSENT ⇒ no observation, the pre-fan path verbatim.
 */
export function runDecumulation(
  initial: PortfolioState,
  realStockReturns: readonly number[],
  realBondReturns: readonly number[],
  netWithdrawals: readonly number[],
  stockWeight: number,
  contributions?: readonly number[],
  balancesOut?: number[],
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

    const step = stepYear(state, rs, rb, w, stockWeight, contributions?.[t] ?? 0)
    state = step.state
    // Band fan (U6/U7): observe the post-step total — $0 exactly on the depletion year. Pure
    // observation; never perturbs the result (the reduce-to-spine fan byte-identity guard).
    balancesOut?.push(totalValue(state))
    if (step.depleted) {
      depletionYear = t
      break
    }
  }

  return { terminalReal: totalValue(state), depletionYear }
}
