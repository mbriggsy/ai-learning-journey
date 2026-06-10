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
 * (and the tax context `bracket-fill` needs) actually exist.
 *
 * `bracket-fill` (U2 · M6a) is the MECHANISM — fill discretionary pre-tax (cheap ordinary
 * income) up to an INJECTED per-year ceiling, then draw tax-free (taxable, then Roth) — with
 * the ceiling VALUE supplied by the caller, NOT decided here: a tax-bracket edge today, the
 * binding ACA-subsidy MAGI ceiling once U3's cliffs exist (`pre65-healthcare-aca-hsa-2026-06-04`
 * §line 74: during ACA years the subsidy ceiling, not the tax bracket, is the binding constraint).
 * With NO ceiling (`+Infinity`) it degrades to `pre-tax-first` — the prior behaviour, so a single
 * pool stays inert (reduce-to-spine).
 */
import type { DrawdownPolicy } from '@shared/model'

/** The account buckets the policy allocates across. `hsa` (U3 · M5) is the 4th,
 *  MEDICAL-EARMARKED bucket: it shares the one market draw like every bucket (contract #2)
 *  but is NEVER a general drawdown source — qualified medical outflow only (`taxOverlay.ts`
 *  drains it against the year's qualified cap; Pub 969 via `hsaFourthBucketRules`). Optional:
 *  absent ⇒ 0 ⇒ byte-identical to the 3-bucket overlay (the as-we-go reduce-to-spine default). */
export interface AccountBuckets {
  readonly taxable: number
  readonly pretax: number
  readonly roth: number
  readonly hsa?: number
}

export type BucketKey = keyof AccountBuckets
/** The GENERAL drawdown sources — every bucket EXCEPT the medical-earmarked `hsa`. Typing the
 *  draw orders and the withdrawal record on this key (not `BucketKey`) makes "general spending
 *  can never be routed through the HSA" a COMPILE-TIME fact, not a runtime convention — the
 *  structural half of the M5 laundering guard (the behavioral half is the general-depletion
 *  check in `taxOverlay.ts`). */
export type GeneralBucketKey = Exclude<BucketKey, 'hsa'>
export type BucketWithdrawals = Record<GeneralBucketKey, number>

const ZERO: BucketWithdrawals = { taxable: 0, pretax: 0, roth: 0 }

/** The hsa-INCLUSIVE portfolio total — the authoritative figure `stepYear` advances (all four
 *  buckets ride the one shared market draw). Distinct from {@link generalDrawableTotal}: the two
 *  diverge exactly when `hsa > 0` (dark at `hsa = 0` — insight 014's crossing class). */
export const totalAcrossBuckets = (b: AccountBuckets): number => b.taxable + b.pretax + b.roth + (b.hsa ?? 0)

/** The GENERAL-drawable total (taxable + pretax + roth) — what a year's spending withdrawal can
 *  actually be funded from. The `hsa` bucket is excluded: it pays only the qualified-medical cap
 *  (U3 · M5), never general spending. */
export const generalDrawableTotal = (b: AccountBuckets): number => b.taxable + b.pretax + b.roth

/** Conventional fixed draw orders (taxable→pre-tax→Roth is the textbook default). Typed on
 *  `GeneralBucketKey`, so an order naming `hsa` is a compile error (the M5 laundering guard). */
const ORDER: Record<'taxable-first' | 'pre-tax-first', readonly GeneralBucketKey[]> = {
  'taxable-first': ['taxable', 'pretax', 'roth'],
  'pre-tax-first': ['pretax', 'taxable', 'roth'],
}

/** Draw `target` from the buckets in `order`, exhausting each before the next. */
function ordered(buckets: AccountBuckets, target: number, order: readonly GeneralBucketKey[]): BucketWithdrawals {
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
 * Bracket-fill (U2 · M6a): fill DISCRETIONARY pre-tax up to `ceiling` (the cheap ordinary-income
 * room — a tax-bracket edge now, an ACA-MAGI ceiling in U3), then draw the rest tax-free (taxable,
 * then Roth — Roth preserved last). If the tax-free buckets cannot cover the remaining spending,
 * fall back to drawing the rest from pre-tax ABOVE the ceiling: the ceiling caps *discretionary*
 * ordinary income, it must never leave a year's spending unfunded. `ceiling === +Infinity` recovers
 * `pre-tax-first` exactly (the no-ceiling default). The per-bucket draws sum to `target` whenever the
 * buckets collectively cover it, and no bucket is ever overdrawn.
 */
function bracketFill(buckets: AccountBuckets, target: number, ceiling: number): BucketWithdrawals {
  const out: BucketWithdrawals = { ...ZERO }
  let remaining = target
  // 1. Pre-tax up to the ceiling (never more than the balance or the remaining need).
  out.pretax = Math.min(remaining, buckets.pretax, Math.max(0, ceiling))
  remaining -= out.pretax
  // 2. Tax-free / preferential: taxable, then Roth.
  out.taxable = Math.min(remaining, buckets.taxable)
  remaining -= out.taxable
  out.roth = Math.min(remaining, buckets.roth)
  remaining -= out.roth
  // 3. Tax-free exhausted but spending still short → the rest from pre-tax above the ceiling.
  if (remaining > 0) {
    out.pretax += Math.min(remaining, buckets.pretax - out.pretax)
  }
  return out
}

/**
 * Allocate a net withdrawal across the GENERAL buckets per `policy`. The per-bucket draws sum
 * to `min(max(0, netWithdrawal), generalDrawableTotal)` — you cannot draw more than exists, and
 * the medical-earmarked `hsa` bucket is never a source (the returned record cannot even name it
 * — `BucketWithdrawals` is keyed on `GeneralBucketKey`). PURE: a deterministic function of
 * balances + policy, no randomness (CRN-neutral).
 *
 * On a SINGLE non-empty bucket every policy returns the identical allocation (drawing
 * from the only source) — the "policy inert on one pool" half of reduce-to-spine.
 */
export function allocateWithdrawal(
  buckets: AccountBuckets,
  netWithdrawal: number,
  policy: DrawdownPolicy,
  /** `bracket-fill` only: the year's max DISCRETIONARY pre-tax draw (the cheap ordinary-income
   *  room to the caller's target edge). `+Infinity` (the default) ⇒ no ceiling ⇒ `pre-tax-first`. */
  bracketFillCeiling: number = Number.POSITIVE_INFINITY,
): BucketWithdrawals {
  const total = generalDrawableTotal(buckets)
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
      // Fill pre-tax to the injected ceiling, then tax-free; `+Infinity` recovers pre-tax-first.
      return bracketFill(buckets, target, bracketFillCeiling)
    default:
      // The union is exhaustive at compile time, but the worker boundary is untyped (structured
      // clone) — an out-of-union policy here would otherwise fall through and return `undefined`,
      // which the caller dereferences (alloc.pretax) → TypeError → calm-error. simulate's
      // validateParams rejects this upstream as indeterminate; THIS is the fail-loud backstop for a
      // direct caller, never a silent undefined (burned/062). (U3-exit code-review pilot.)
      throw new Error(`[sequencing] unknown drawdown policy: ${String(policy)}`)
  }
}
