/**
 * `evalSteps.ts` — the solve's candidate evaluations as DATA (the worker-pool build, 2026-10-03).
 *
 * WHY. Every simulation a solve runs goes through `evaluateCandidates(base, candidates, seed, opts)`
 * — a pure per-candidate map (`evaluate.ts`), so the roster is embarrassingly parallel. But the solve's
 * orchestration (ranking stability → mint → search → select → grade → probe) is synchronous, and a
 * synchronous body cannot wait on other workers. So each orchestration stage is written ONCE as a
 * generator that YIELDS the `evaluateCandidates` calls it is about to make (an {@link EvalCall} batch)
 * and receives one {@link EvalResult} per call back. Two drivers run the same generator:
 *
 *  - {@link runEvalSync} — the shipped default for every sync caller (tests, scripts, the main-thread
 *    fallback, the single-worker path): each result is a LAZY thunk that runs `evaluateCandidates` the
 *    first time the generator reads it. So the sync driver performs EXACTLY today's calls, in today's
 *    order, and stops where today's code stops (the grade's early "unavailable" never evaluates the
 *    family members after an infeasible one) — call-for-call the straight-line code it replaced;
 *  - {@link runEvalAsync} — the pooled driver: an injected `evaluateBatch` computes a whole batch
 *    (e.g. on a pool of workers) and hands back precomputed results.
 *
 * THE UNWRAP LAW (the design red team's required change, wf_c61881ba-752): a result is a THUNK, never
 * a wave-level throw. A call that failed rethrows its error only WHEN THE GENERATOR READS IT — at the
 * exact point today's straight-line code made the call. So a batch may be computed eagerly (wasted CPU
 * on an early-exit path, never a different outcome): an error in a call the code never reads is never
 * seen, and the first error surfaced is the one today's code would have raised first. A generator must
 * therefore read its results in the order the straight-line code made the calls.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment; the async driver's effect handler is
 * INJECTED, exactly like the seed and `shouldAbort`.
 */
import type { SimulationParams } from '@shared/model'
import type { CandidateStrategy } from '../solver/candidates'
import { evaluateCandidates, type CandidateOutcome, type EvaluateOpts } from './evaluate'

/** One `evaluateCandidates` call, as data. `atomic` marks a call whose candidates must be evaluated
 *  TOGETHER, in order, in one place (ranking stability's perturbation pair — its coupling check is
 *  about what one evaluation path does across consecutive candidates); every other call may be split
 *  one candidate per task. */
export interface EvalCall {
  readonly base: SimulationParams
  readonly candidates: readonly CandidateStrategy[]
  readonly seed: number
  readonly opts: EvaluateOpts
  readonly atomic?: true
}

/** One call's result: the outcomes, or the call's own error — thrown only when READ (the unwrap law). */
export type EvalResult = () => readonly CandidateOutcome[]

/** A stage written as a generator: yields batches of calls, receives one result per call. */
export type EvalSteps<R> = Generator<readonly EvalCall[], R, readonly EvalResult[]>

/** Run one call through the real evaluation path (the sync driver's and every pool task's body). */
export const evaluateCall = (call: EvalCall): readonly CandidateOutcome[] =>
  evaluateCandidates(call.base, call.candidates, call.seed, call.opts)

/** A memoized lazy result — `evaluateCall` runs on the FIRST read, and a second read returns the same
 *  outcomes (or rethrows the same error) without re-evaluating. */
function lazyResult(call: EvalCall): EvalResult {
  let done: { readonly ok: true; readonly v: readonly CandidateOutcome[] } | { readonly ok: false; readonly e: unknown } | null = null
  return () => {
    if (done === null) {
      try {
        done = { ok: true, v: evaluateCall(call) }
      } catch (e) {
        done = { ok: false, e }
      }
    }
    if (!done.ok) throw done.e
    return done.v
  }
}

/** Drive a stage synchronously — today's straight-line computation, call for call (lazy results). */
export function runEvalSync<R>(steps: EvalSteps<R>): R {
  let step = steps.next()
  while (!step.done) step = steps.next(step.value.map(lazyResult))
  return step.value
}

/** Drive a stage with an injected batch evaluator (the pool). `evaluateBatch` must return one result
 *  per call, in call order, each obeying the unwrap law (an error rides INSIDE its result). */
export async function runEvalAsync<R>(
  steps: EvalSteps<R>,
  evaluateBatch: (calls: readonly EvalCall[]) => Promise<readonly EvalResult[]>,
): Promise<R> {
  let step = steps.next()
  while (!step.done) {
    const calls = step.value
    const results = await evaluateBatch(calls)
    if (results.length !== calls.length) {
      throw new Error(`[evalSteps] the batch evaluator returned ${results.length} results for ${calls.length} calls`)
    }
    step = steps.next(results)
  }
  return step.value
}

/** Read the ONE result of a single-call batch (the common case), with the arity checked. */
export function onlyResult(results: readonly EvalResult[]): readonly CandidateOutcome[] {
  if (results.length !== 1) throw new Error(`[evalSteps] expected one result, got ${results.length}`)
  return results[0]!()
}
