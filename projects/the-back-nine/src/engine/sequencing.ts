/**
 * Withdrawal sequencing — the named drawdown policies (R9), the SECOND control's
 * substrate. A policy decides WHICH account bucket funds each year's net withdrawal;
 * it decides *which bucket*, never *what return*, so it consumes ZERO random draws
 * and is CRN-neutral by construction (contract #2: all buckets share the one market
 * draw). The manual control (P3·U10) and the solver (P4·U15) DRIVE this substrate —
 * neither re-implements decumulation.
 *
 * P1 SCOPE: the spine runs on a single pool, where every policy is INERT (one bucket
 * → one source). This module is built + unit-tested here against the account-bucket
 * abstraction; it is WIRED into the per-year decumulation in U2, where the buckets
 * (and the tax context `bracket-fill` needs) actually exist. `bracket-fill` therefore
 * degrades to `pre-tax-first` here — its tax-aware behavior is validated in U2.
 */
import type { DrawdownPolicy } from '@shared/model'

/** The account buckets the policy allocates across. (HSA — a 4th, medical-earmarked
 *  bucket — is added in U3; the spine + the general drawdown order are these three.) */
export interface AccountBuckets {
  readonly taxable: number
  readonly pretax: number
  readonly roth: number
}

export type BucketKey = keyof AccountBuckets
export type BucketWithdrawals = Record<BucketKey, number>

const ZERO: BucketWithdrawals = { taxable: 0, pretax: 0, roth: 0 }

export const totalAcrossBuckets = (b: AccountBuckets): number => b.taxable + b.pretax + b.roth

/** Conventional fixed draw orders (taxable→pre-tax→Roth is the textbook default). */
const ORDER: Record<'taxable-first' | 'pre-tax-first', readonly BucketKey[]> = {
  'taxable-first': ['taxable', 'pretax', 'roth'],
  'pre-tax-first': ['pretax', 'taxable', 'roth'],
}

/** Draw `target` from the buckets in `order`, exhausting each before the next. */
function ordered(buckets: AccountBuckets, target: number, order: readonly BucketKey[]): BucketWithdrawals {
  const out: BucketWithdrawals = { ...ZERO }
  let remaining = target
  for (const key of order) {
    if (remaining <= 0) break
    const take = Math.min(remaining, buckets[key])
    out[key] = take
    remaining -= take
  }
  return out
}

/** Draw `target` pro-rata to each bucket's balance. */
function proportional(buckets: AccountBuckets, target: number, total: number): BucketWithdrawals {
  if (total <= 0) return { ...ZERO }
  return {
    taxable: target * (buckets.taxable / total),
    pretax: target * (buckets.pretax / total),
    roth: target * (buckets.roth / total),
  }
}

/**
 * Allocate a net withdrawal across the buckets per `policy`. The per-bucket draws sum
 * to `min(max(0, netWithdrawal), totalAvailable)` — you cannot draw more than exists.
 * PURE: a deterministic function of balances + policy, no randomness (CRN-neutral).
 *
 * On a SINGLE non-empty bucket every policy returns the identical allocation (drawing
 * from the only source) — the "policy inert on one pool" half of reduce-to-spine.
 */
export function allocateWithdrawal(
  buckets: AccountBuckets,
  netWithdrawal: number,
  policy: DrawdownPolicy,
): BucketWithdrawals {
  const total = totalAcrossBuckets(buckets)
  const target = Math.min(Math.max(0, netWithdrawal), total)
  if (target === 0) return { ...ZERO }

  switch (policy) {
    case 'proportional':
      return proportional(buckets, target, total)
    case 'taxable-first':
      return ordered(buckets, target, ORDER['taxable-first'])
    case 'pre-tax-first':
      return ordered(buckets, target, ORDER['pre-tax-first'])
    case 'bracket-fill':
      // U1 fallback: the tax-aware fill (fill ordinary income to a bracket/cliff edge
      // before drawing tax-free) needs the U2 tax overlay + U3 health ceiling. Until
      // then it follows pre-tax-first; its real behavior is validated in U2.
      return ordered(buckets, target, ORDER['pre-tax-first'])
  }
}
