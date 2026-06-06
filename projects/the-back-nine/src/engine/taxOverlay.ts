/**
 * The tax-and-accounts overlay (P1·U2) — decumulation that is AWARE of account
 * buckets + tax. It is the structural sibling of the earned-income bridge
 * (cross-cutting contract #3): a per-year deterministic transform of the cash-flow
 * term, indexed by absolute year, consuming ZERO random draws (CRN-safe by the same
 * argument). The bridge nets the withdrawal DOWN; this overlay grosses it UP (tax,
 * RMD-forced distributions, and conversions all increase the cash a year needs).
 *
 * THE LOAD-BEARING SEAM (the reduce-to-spine golden invariant). The authoritative
 * portfolio TOTAL is advanced by the SAME {@link stepYear} the validated spine uses —
 * the overlay never re-implements the growth/rebalance math, so within-year order can
 * never drift. Per-bucket balances are a parallel ledger consumed only by the tax
 * computation; they never feed back into the total when tax is OFF. Therefore under
 * the EXHAUSTIVE OFF condition — buckets collapsed to one pool AND conversion = 0 AND
 * tax off AND RMD-inert — the total trajectory is BYTE-IDENTICAL (same seed) to the
 * Trinity/Bengen-validated spine. The golden cases are never perturbed.
 *
 * One shared market draw (contract #2): every bucket grows by the SAME blended return
 * `stepYear` applies to the total — buckets differ only in tax treatment, never in
 * return assumption (this is what structurally forecloses asset-location).
 *
 * MILESTONE STATUS — built incrementally; this is M1, the seam + reduce-to-spine lock.
 * The marked insertion points below take, in order: the RMD-forced distribution
 * (birth-year age via `rmdStartAge` + the sourced Uniform Lifetime Table divisor),
 * ordinary-income tax on the bracket schedule, the Social-Security provisional-income
 * fixed-point, Roth conversions, capital-gains/qualified-dividend stacking, and the
 * MFJ→single survivor filing switch. Each lands with its own externally-derived
 * golden fixture (DND/012) and its CRN test.
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 */
import { stepYear, totalValue, type DecumulationResult, type PortfolioState } from '@engine/decumulation'
import { allocateWithdrawal, totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import { NEVER_DEPLETED, type DepletionYear, type DrawdownPolicy } from '@shared/model'

/** Overlay configuration. When `taxEnabled` is false the overlay is a pure pass-through
 *  that reduces byte-identically to the spine (the tax clause of the OFF condition).
 *  M2+ extends this with per-year filing status, per-person birth years, the conversion
 *  schedule, and the simulation's start calendar year. */
export interface TaxOverlayConfig {
  readonly taxEnabled: boolean
}

/** A tax-aware decumulation result: the spine's total-trajectory result (the only thing
 *  the outcome distribution reads), plus the final per-bucket balances (auxiliary). */
export interface TaxAwareResult extends DecumulationResult {
  readonly finalBuckets: AccountBuckets
}

const EMPTY_BUCKETS: AccountBuckets = { taxable: 0, pretax: 0, roth: 0 }

/**
 * The per-year gross-up: the extra cash (tax + RMD-forced excess + conversion tax) a
 * year's withdrawal must cover beyond the net spending need. ZERO when the overlay is
 * off — the byte-identical-reduction clause.
 *
 * M1 placeholder: returns 0. The real ordinary-tax / RMD / SS-fixed-point / conversion /
 * cap-gains math lands here in M2+, reading the sourced constants from `@engine/constants`.
 */
function grossUpForYear(_year: number, _buckets: AccountBuckets, _config: TaxOverlayConfig): number {
  // M2+ insertion point. Intentionally inert in M1 so the seam is proven first.
  return 0
}

/**
 * Run a tax-aware decumulation path. Tracks per-bucket balances for the tax computation
 * while advancing the authoritative TOTAL through the shared {@link stepYear}, so the
 * total trajectory matches the spine byte-for-byte under the OFF condition.
 *
 * The three return/withdrawal arrays are indexed by ABSOLUTE year and the net-withdrawal
 * length is the horizon (the aligned-length contract `runDecumulation` uses).
 */
export function runTaxAwareDecumulation(
  initialBuckets: AccountBuckets,
  realStockReturns: readonly number[],
  realBondReturns: readonly number[],
  netWithdrawals: readonly number[],
  stockWeight: number,
  policy: DrawdownPolicy,
  config: TaxOverlayConfig,
): TaxAwareResult {
  let buckets = initialBuckets
  const total0 = totalAcrossBuckets(initialBuckets)
  // Construct the initial state with the SAME formula simulate.ts uses (stock = w·P,
  // bond = (1−w)·P) so a collapsed-pool run is byte-identical to the spine's
  // runDecumulation — stepYear only reads the sum, but matching the construction makes
  // the reduction unconditional rather than dependent on a float identity.
  let state: PortfolioState = { stock: stockWeight * total0, bond: (1 - stockWeight) * total0 }
  let depletionYear: DepletionYear = NEVER_DEPLETED
  const horizon = netWithdrawals.length

  for (let t = 0; t < horizon; t++) {
    const rs = realStockReturns[t]
    const rb = realBondReturns[t]
    const net = netWithdrawals[t]
    // Aligned-length contract: a missing entry is the end of data, not a 0 year.
    if (rs === undefined || rb === undefined || net === undefined) break

    // Gross up for tax. When off, grossWithdrawal === net EXACTLY (no float op added),
    // so the stepYear recurrence is identical to the spine's.
    const grossWithdrawal = config.taxEnabled ? net + grossUpForYear(t, buckets, config) : net

    // Per-bucket ledger: which buckets fund this withdrawal (consumed by the tax math in
    // M2+; inert on the total). Capped at what exists, exactly like the spine.
    const totalBefore = totalAcrossBuckets(buckets)
    const alloc = allocateWithdrawal(buckets, grossWithdrawal, policy)
    const drawn = alloc.taxable + alloc.pretax + alloc.roth

    // Advance the AUTHORITATIVE total via the shared stepYear (byte-identical to spine).
    const step = stepYear(state, rs, rb, grossWithdrawal, stockWeight)
    state = step.state

    if (step.depleted) {
      buckets = EMPTY_BUCKETS
      depletionYear = t
      break
    }

    // Re-derive the buckets as fractions of the authoritative new total: each bucket's
    // post-withdrawal share grown by the one shared factor (no asset-location). The total
    // is stepYear's output; the buckets are scaled to sum to it.
    const afterWithdrawal = totalBefore - drawn
    if (afterWithdrawal > 0) {
      const scale = totalValue(state) / afterWithdrawal
      buckets = {
        taxable: Math.max(0, buckets.taxable - alloc.taxable) * scale,
        pretax: Math.max(0, buckets.pretax - alloc.pretax) * scale,
        roth: Math.max(0, buckets.roth - alloc.roth) * scale,
      }
    } else {
      buckets = EMPTY_BUCKETS
    }
  }

  return { terminalReal: totalValue(state), depletionYear, finalBuckets: buckets }
}
