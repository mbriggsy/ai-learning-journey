/**
 * `solveDispatch.ts` — the intake-layer solve-request builder (U16 §S1): the sibling of
 * `buildSpineParams` / `buildDateInput` that turns a completed draft into a {@link SolveRequest} for
 * the recommend-second beat, or `null` when the draft cannot HONESTLY build one (the builder-null
 * convention — `memoryModel.dispatchSolve` maps null to `blocked{buckets-defaulted}`).
 *
 * EVERY FIELD FROM ITS CANONICAL PRODUCER (the fleet's ONE LAW):
 *   - `base`        ← `buildSpineParams` (the tax-aware all-retired params), with `paths` lifted to the
 *                     full-precision `solverMinBPaths` floor so the live solve runs the SEARCH and the
 *                     grade B-family at 16,000 paths (S5 deferred — no interactive down-sampling; a
 *                     below-floor base would yield a calm "couldn't grade it");
 *   - `candidates`  ← `enumerateSolveCandidates` (the shipped enumerator over the source-bound year-0
 *                     anchor — `solver/solveAnchor.ts`);
 *   - `ranking`     ← `draft.chosenGoal` (the OracleGoal is the RecommendationGoal 1:1) + the R7
 *                     `solverAssumedHeirBracket` default for a leave-more solve (undefined for
 *                     pay-less-tax);
 *   - `seedA`       ← `draft.seed` (the ONE minted shared-draw CRN seed the spine beat already set);
 *   - `tieTolerance`← 0 (the conservative-safe live value: every shipped consumer passes 0, and §S0.1
 *                     pinned the fallback knobs at 0 — the STRICTEST regime — so it is safe under any
 *                     looser live tolerance);
 *   - `todayEpochDay` ← INJECTED by the ui composition layer (`appModel` reads `currentEpochDay()`), so
 *                     this builder stays a deterministic function of `(draft, todayEpochDay)` and the
 *                     engine stays clock-free.
 *
 * NULL (builder-null convention) exactly when:
 *   - the goal is unset (the invalidation path builds the fresh fingerprint through this builder; a
 *     cleared goal is an unbuildable run — the store's `dispatchSolve` reads `chosenGoal` FIRST for the
 *     precise `goal-unset` gap, so the live pick never reaches here goal-unset);
 *   - `buildSpineParams` is null (missing facts / the date route — v1 supports the all-retired route;
 *     the working-route recommend-second base is the crowned candidate, a follow-up increment);
 *   - the seed has not been minted (defensive — the recommend-second gate requires a committed spine
 *     beat, which mints it);
 *   - the household has no anchored conversion candidate (no pre-tax headroom) — the solver cannot
 *     prove ranking stability without one, so this is the honest bucket precondition.
 *
 * The oracle-cleared token is NOT this builder's concern — it is minted worker-side inside `runSolve`
 * (it is branded, it cannot cross the wire).
 */
import type { ScenarioDraft } from '@store/memoryModel'
import type { SolveRequest } from '@engine/solver/solveEntry'
import type { SolverRunRanking } from '@engine/validation/solverRunFingerprint'
import { enumerateSolveCandidates } from '@engine/solver/solveAnchor'
import { solverAssumedHeirBracket, solverMinBPaths } from '@engine/constants'
import { buildSpineParams } from './intakeMap'

/**
 * Build the live solve request from a completed draft + the injected today (epoch-day). `null` per the
 * builder-null convention (see the module header). Deterministic in its two arguments — the ui layer
 * injects the clock, so the fingerprint (which excludes `todayEpochDay`) stays stable across ticks.
 */
export function buildSolveRequest(draft: ScenarioDraft, todayEpochDay: number): SolveRequest | null {
  const goal = draft.chosenGoal
  if (goal === undefined) return null // the goal precedes the solve; a cleared goal is unbuildable
  const seedA = draft.seed
  if (seedA === undefined) return null // the shared-draw CRN seed is minted by the spine beat first

  const spine = buildSpineParams(draft)
  if (spine === null) return null // missing facts / date route (v1: the all-retired route)

  // Full precision (S5 deferred): the seed-A search AND the grade B-family run at `solverMinBPaths`.
  const base = { ...spine, paths: solverMinBPaths.value }

  const set = enumerateSolveCandidates(base)
  if (set === null) return null // no tax overlay — no per-person split to sequence
  // No anchored conversion candidate (no pre-tax headroom) ⇒ ranking stability cannot run ⇒ the honest
  // bucket precondition (never a mint-failed{roster} surfaced live).
  if (!set.candidates.some((c) => c.conversion !== null)) return null

  const ranking: SolverRunRanking =
    goal === 'leave-more' ? { goal, heirBracket: solverAssumedHeirBracket.value } : { goal }

  return {
    base,
    candidates: set.candidates,
    seedA,
    ranking,
    tieTolerance: 0,
    todayEpochDay,
  }
}
