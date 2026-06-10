/**
 * The date-search compute-profile gate (C3 §3) — mirrors the planned P4·U15 `profile.ts`
 * shape: measure the worst-case sweep against its own single-run baseline so the
 * on-demand budget question ("does the final crown fit the interactive window, or does
 * WASM move toward load-bearing?") is answered by MEASUREMENT on the reference device,
 * never by vibes. The expected shape is LINEAR in the candidate count: the sweep costs
 * ≤ ~(window+1)× a single pinned-path `simulate` (≈ 11×; ≈ 88× today's 2000-path headline
 * run) — a super-linear ratio is a regression (an accidental re-validation or re-draw per
 * candidate).
 *
 * TWO budgets ride this gate (§3c two-tier): the provisional-refire interactive budget at
 * the headline 2,000 paths and the final-crown on-demand budget at the pinned 16,000 (the
 * WASM threshold keys off the latter). The tier is measured as requested; thresholds are
 * DEFERRED TO MEASUREMENT on a mid-tier reference device (the eye-in-loop discipline) —
 * this module reports, it does not judge.
 *
 * PURE: the clock is INJECTED (`now`) — the engine reads no `performance`/`Date` of its
 * own (engine-purity lint; the caller passes `() => performance.now()` outside the
 * engine layer, exactly as the seed is injected).
 */
import { simulate } from '@engine/simulate'
import {
  DATE_OFFSET_WINDOW_TOP,
  DATE_SEARCH_PATHS,
  buildCandidateParams,
  runDateSearch,
  type DateSearchInput,
} from '@engine/dateSearch'
import type { DateSearchTier } from '@shared/model'

/** One measured profile: the single-candidate baseline, the full-sweep cost, and their
 *  ratio (the linearity check), plus the outcome kind so a rejected/cancelled profile can
 *  never masquerade as a measured sweep. */
export interface DateSearchProfile {
  readonly tier: DateSearchTier
  /** One `simulate` at the tier's pinned paths (the Y = 0 candidate) — the baseline. */
  readonly singleSimulateMs: number
  /** The full `runDateSearch` sweep (validation + window+1 candidate runs + the crown). */
  readonly sweepMs: number
  /** `sweepMs / singleSimulateMs` — expected ≈ (window+1), linear in candidates. */
  readonly ratioVsSingle: number
  /** The candidate count the window implies (window top + 1). */
  readonly candidateCount: number
  /** The sweep's outcome kind — a profile of a rejected input measures validation, not
   *  compute, and must say so. */
  readonly outcomeKind: 'dates' | 'input-failure' | 'cancelled'
}

/**
 * Measure one full date-search sweep against its single-run baseline. Fails loud on a
 * non-finite clock or a baseline the input cannot run (a profile of an invalid input
 * would report validation cost as compute cost — measure the real thing or refuse).
 */
export async function profileDateSearch(
  input: DateSearchInput,
  seed: number,
  tier: DateSearchTier,
  now: () => number,
): Promise<DateSearchProfile> {
  const paths = DATE_SEARCH_PATHS[tier]
  const t0 = now()
  if (!Number.isFinite(t0)) throw new Error('[dateSearchProfile] the injected clock returned a non-finite time (insight 010)')

  // Baseline: ONE pinned-path simulate at the window floor (the same candidate the sweep
  // runs first — identical dims, identical overlay machinery).
  const single = simulate(buildCandidateParams(input, 0, paths), seed)
  const t1 = now()
  // Finite AND monotone (≥, never > — equal stamps under a coarse clock are legitimate and
  // already routed to the Infinity ratio below): a backwards/non-finite injected clock would
  // otherwise report a NEGATIVE or NaN interval as if measured — and a negative ratio sails
  // UNDER any `< budget` linearity check, a vacuous pass dressed as evidence. A lying clock
  // is a measurement fault; refuse it, never report it.
  if (!Number.isFinite(t1) || t1 < t0) {
    throw new Error('[dateSearchProfile] the injected clock went non-finite/backwards across the baseline (insight 010)')
  }
  if (single.indeterminate) {
    throw new Error(
      `[dateSearchProfile] the baseline candidate is indeterminate (${single.reason}) — profile a runnable input (the gate measures compute, not validation)`,
    )
  }

  const outcome = await runDateSearch(input, seed, { tier })
  const t2 = now()
  if (!Number.isFinite(t2) || t2 < t1) {
    throw new Error('[dateSearchProfile] the injected clock went non-finite/backwards across the sweep (insight 010)')
  }

  const singleSimulateMs = t1 - t0
  const sweepMs = t2 - t1
  return {
    tier,
    singleSimulateMs,
    sweepMs,
    // A zero-ms baseline (a too-small fixture under a coarse clock) cannot yield a finite
    // ratio — surface Infinity honestly rather than divide-by-zero NaN (the caller's
    // budget check must then use a bigger fixture, not trust a vacuous ratio).
    ratioVsSingle: singleSimulateMs > 0 ? sweepMs / singleSimulateMs : Number.POSITIVE_INFINITY,
    candidateCount: DATE_OFFSET_WINDOW_TOP + 1,
    outcomeKind: outcome.kind,
  }
}
