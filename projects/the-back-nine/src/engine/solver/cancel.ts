/**
 * `cancel.ts` — the SOLVE lane's cancellation seam (U15 §S6, the ratified SPLIT).
 *
 * TWO decisions live here, both PURE (engine-purity lint: no clock, entropy, or environment — the
 * caller owns the epoch and injects the abort predicate; the engine reads neither `Date` nor
 * `performance`), so each is an EXPORTED, planted-fail-tested seam (insight 048 — the decision is
 * never inlined where a test cannot drive it):
 *
 *  1. THE COMMIT-EPOCH GUARD IS UNCONDITIONAL (`shouldCommitSolve`). A superseded solve NEVER
 *     commits — the Act-2 request-epoch discipline (memoryModel contract (f)) extended to the solve
 *     lane. This ships whatever the solve's speed: even if a solve is instant, a rapid re-invite can
 *     resolve two solves out of order, and the older result must never render over the newer. The
 *     store's `commitSolve` is this predicate's ONE wiring; `dispatchSolve` mints the monotonic epoch.
 *
 *  2. MID-SOLVE COOPERATIVE ABORT (`abortRequested` over an injected `ShouldAbort`). The commit-epoch
 *     guard discards a stale RESULT after it resolves; cooperative abort lets a superseded solve stop
 *     BURNING COMPUTE mid-flight (bail before the expensive search / grade B-family). The engine reads
 *     no environment — the caller injects `shouldAbort: () => boolean` (the worker shell closes it over
 *     a worker-side latest-solve-epoch, exactly as the date lane's `setLatestEpoch` → `shouldContinue`;
 *     that live transport + the abort GRANULARITY — how many checkpoints, per-candidate vs per-stage —
 *     WAIT ON `profile.ts`'s measured numbers, built only if solves prove slow enough for staleness to
 *     be user-felt, §S6). U15 ships the SEAM (test-driven) + coarse per-stage checkpoints; the live
 *     worker-epoch transport is the deferred granularity call.
 */
import { SOLVER_CODE_VERSION } from './solverCodeVersion'

/** The injected mid-solve abort predicate — the ONE impurity-adjacent dependency, owned by the
 *  caller (the worker shell / the store's epoch machinery). The engine calls it; it never mints one. */
export type ShouldAbort = () => boolean

/** A solve cooperatively ABORTED mid-flight (a newer dispatch superseded it before it finished). A
 *  NAMED bin (insight 092 — never a silent nothing): it rides the payload, crosses the wire as plain
 *  data (no buffers), and the store HOLDS it (never renders it) — the commit-epoch guard then discards
 *  it, since a newer solve is already in flight/committed by construction (abort fires only then). */
export interface SolveAborted {
  readonly kind: 'aborted'
  readonly detail: string
  readonly solverCodeVersion: number
}

export const solveAborted = (detail: string): SolveAborted => ({
  kind: 'aborted',
  detail,
  solverCodeVersion: SOLVER_CODE_VERSION,
})

/**
 * Was a mid-solve abort requested through the injected seam? An UNDEFINED seam ⇒ never (the live
 * default today — the worker-epoch transport that would supply a real predicate waits on the
 * profile's granularity call). A defined seam is read VERBATIM (`=== true`, strict) — the engine
 * reads no clock and interprets nothing; the caller's predicate is the whole truth.
 */
export function abortRequested(shouldAbort: ShouldAbort | undefined): boolean {
  return shouldAbort !== undefined && shouldAbort() === true
}

/**
 * The UNCONDITIONAL commit-epoch guard for the solve lane: a resolved solve commits ONLY if its
 * epoch is STRICTLY NEWER than the last committed one. Finiteness-FIRST (insight 010 — the
 * `setLatestEpoch` NaN posture, mirrored): a non-finite resolved epoch NEVER commits (a NaN would
 * make every `>` false anyway, but stating it makes the guard total, not incidental). Equal epochs
 * do not re-commit (idempotent — the same solve cannot land twice).
 */
export function shouldCommitSolve(resolvedEpoch: number, committedEpoch: number): boolean {
  if (!Number.isFinite(resolvedEpoch)) return false
  return resolvedEpoch > committedEpoch
}
