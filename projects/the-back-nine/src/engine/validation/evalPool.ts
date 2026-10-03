/**
 * `evalPool.ts` — the worker pool's SCHEDULER (the worker-pool build, commit 2; design wf_c61881ba-752).
 *
 * WHAT. {@link poolEvaluator} turns P injected {@link PoolLane}s into the `evaluateBatch` that
 * `runEvalAsync` (`evalSteps.ts`) drives a solve stage with. A batch of {@link EvalCall}s is split into
 * TASKS — one per candidate, except an `atomic` call (ranking stability's perturbation pair), which is
 * ONE task — and the lanes PULL tasks from one queue until it drains. Pure: no clock, entropy or
 * environment; the lanes (a MessagePort to a worker, or an in-process fake) are injected.
 *
 * WHY EACH LAW HOLDS THE PAYLOAD BYTE-IDENTICAL TO THE SYNC DRIVER:
 *  - Every task runs the SAME `evaluateCall` (one candidate's `simulate` is a pure function of
 *    `(params, seed)`; the draw schedule is a function of the dimensions alone — CRN), so where a task
 *    runs cannot move a bit. That is ARGUED here; the fake-pool differential and the real-Chrome digest
 *    are its proof.
 *  - RE-ATTACH: an outcome crosses the wire as a structured clone, so its `candidate` is a copy. The
 *    coordinator's OWN candidate object is put back (`adoptObservedOutcome` and the shared pass compare
 *    candidates by identity), checked first against `solverCandidateId` — a misrouted reply fails loud,
 *    never a quietly mislabelled outcome. `{ ...o, candidate }` keeps the key order `bitEqual` reads.
 *  - THE UNWRAP LAW: a call's result is a thunk that rethrows the LOWEST-index failing task's error
 *    (the sync `evaluateCandidates` maps in order and stops at its first throw), and only when the
 *    stage READS it — so an eagerly computed task the straight-line code never reached is never seen.
 *  - THE ATOMIC ROUTE: the perturbation pair `[variant, sibling]` is never split (its coupling check is
 *    about one evaluation path across consecutive candidates), and it goes to a lane OTHER than the one
 *    that ran the sibling's own task in the same batch — so the perturbation law, which compares the
 *    two sibling surfaces, witnesses CROSS-WORKER determinism on every pooled solve.
 *
 * TWO FAILURE CLASSES, kept apart: an ENGINE error (the evaluation threw) rides inside its result as
 * `ok: false` and surfaces exactly where the sync code would have raised it; a TRANSPORT failure (a
 * lane that rejects — a dead worker, a reply that failed to clone) fails the whole batch as a
 * {@link PoolTransportError}, which the coordinator never launders into a calm answer (the lane retries
 * the solve single-thread).
 */
import type { CandidateStrategy } from '../solver/candidates'
import { solverCandidateId } from '../solver/candidates'
import type { CandidateOutcome } from './evaluate'
import type { EvalCall, EvalResult } from './evalSteps'

/** One task's reply. `message` is the thrown Error's message, or `null` when the throw was not an
 *  Error (the sync path's catch reads that as the generic 'engine error' — preserved exactly). */
export type TaskReply =
  | { readonly ok: true; readonly outcomes: readonly CandidateOutcome[] }
  | { readonly ok: false; readonly message: string | null }

/** One evaluation lane. RESOLVES with the task's reply (an engine error included); REJECTS only on a
 *  transport failure. */
export interface PoolLane {
  readonly evaluate: (call: EvalCall) => Promise<TaskReply>
}

/** A lane failed to carry a task (not an engine answer) — the pooled solve must not resolve. */
export class PoolTransportError extends Error {
  constructor(detail: string) {
    super(`[evalPool] a pool lane failed: ${detail}`)
    this.name = 'PoolTransportError'
  }
}

interface Task {
  readonly callIndex: number
  /** The index of this task's first candidate inside its call. */
  readonly first: number
  readonly call: EvalCall
  /** The lane that ran it (set at dispatch). */
  lane: number
  reply: TaskReply | null
}

/** The value a non-Error throw rethrows as — anything that is not an Error reads as 'engine error'
 *  in `runSolveEngine`'s catch, which is what the original non-Error throw read as. */
const NON_ERROR_THROW = 'engine error'

/** Split one batch into tasks: a non-atomic call one task per candidate (in candidate order), an
 *  atomic call one task; every non-atomic task is queued BEFORE every atomic one, so an atomic task's
 *  siblings have all been dispatched (their lanes known) by the time it reaches the head. */
function splitBatch(calls: readonly EvalCall[]): Task[] {
  const plain: Task[] = []
  const atomic: Task[] = []
  for (const [callIndex, call] of calls.entries()) {
    if (call.atomic === true) {
      atomic.push({ callIndex, first: 0, call, lane: -1, reply: null })
      continue
    }
    for (const [i, candidate] of call.candidates.entries()) {
      plain.push({
        callIndex,
        first: i,
        call: { base: call.base, candidates: [candidate], seed: call.seed, opts: call.opts },
        lane: -1,
        reply: null,
      })
    }
  }
  return [...plain, ...atomic]
}

/** The lanes an atomic task must avoid: every lane that ran a non-atomic task of the same batch on the
 *  same base and seed for one of the atomic call's own candidates (by identity — the perturbation
 *  variant is a fresh object, so only the sibling matches). */
function lanesToAvoid(task: Task, tasks: readonly Task[]): ReadonlySet<number> {
  const avoid = new Set<number>()
  for (const t of tasks) {
    if (t === task || t.call.atomic === true || t.lane < 0) continue
    if (t.call.base !== task.call.base || t.call.seed !== task.call.seed) continue
    if (task.call.candidates.includes(t.call.candidates[0]!)) avoid.add(t.lane)
  }
  return avoid
}

/** Build one call's lazy, memoized result from its tasks (the unwrap law + the re-attach). */
function callResult(call: EvalCall, tasks: readonly Task[]): EvalResult {
  let done: { readonly ok: true; readonly v: readonly CandidateOutcome[] } | { readonly ok: false; readonly e: unknown } | null = null
  const assemble = (): readonly CandidateOutcome[] => {
    const out: CandidateOutcome[] = []
    for (const task of tasks) {
      const reply = task.reply!
      if (!reply.ok) throw reply.message === null ? NON_ERROR_THROW : new Error(reply.message)
      const expected = task.call.candidates.length
      if (reply.outcomes.length !== expected) {
        throw new Error(`[evalPool] a task returned ${reply.outcomes.length} outcomes for ${expected} candidates`)
      }
      for (const [j, o] of reply.outcomes.entries()) {
        const own: CandidateStrategy = call.candidates[task.first + j]!
        if (solverCandidateId(o.candidate) !== solverCandidateId(own)) {
          throw new Error(
            `[evalPool] a reply is for ${solverCandidateId(o.candidate)}, not ${solverCandidateId(own)} — the pool misrouted an outcome`,
          )
        }
        out.push({ ...o, candidate: own })
      }
    }
    return out
  }
  return () => {
    if (done === null) {
      try {
        done = { ok: true, v: assemble() }
      } catch (e) {
        done = { ok: false, e }
      }
    }
    if (!done.ok) throw done.e
    return done.v
  }
}

/**
 * The pooled batch evaluator over `lanes` (≥ 1). Each lane pulls the next task it may run until none
 * is left for it; the batch settles when every lane is idle and every task has replied. With ONE lane
 * the atomic route cannot avoid anything, and is not asked to.
 */
export function poolEvaluator(lanes: readonly PoolLane[]): (calls: readonly EvalCall[]) => Promise<readonly EvalResult[]> {
  if (lanes.length < 1) throw new Error('[evalPool] a pool needs at least one lane')
  return async (calls) => {
    const tasks = splitBatch(calls)
    const queue = [...tasks]
    let failed: PoolTransportError | null = null

    /** The next task `lane` may run (removed from the queue), or null when none is left for it. */
    const take = (lane: number): Task | null => {
      for (const [i, task] of queue.entries()) {
        if (task.call.atomic === true && lanes.length > 1 && lanesToAvoid(task, tasks).has(lane)) continue
        queue.splice(i, 1)
        return task
      }
      return null
    }

    const drain = async (lane: number): Promise<void> => {
      for (;;) {
        if (failed !== null) return
        const task = take(lane)
        if (task === null) return
        task.lane = lane
        let reply: TaskReply
        try {
          reply = await lanes[lane]!.evaluate(task.call)
        } catch (e) {
          failed ??= new PoolTransportError(e instanceof Error ? e.message : String(e))
          return
        }
        task.reply = reply
      }
    }

    await Promise.all(lanes.map((_, lane) => drain(lane)))
    if (failed !== null) throw failed
    if (queue.length > 0 || tasks.some((t) => t.reply === null)) {
      // Unreachable while P ≥ 2 or P = 1 (see `take`) — a stranded task is a scheduler bug, never a
      // silently missing outcome.
      throw new PoolTransportError(`${queue.length} task(s) stranded — no lane could take them`)
    }
    return calls.map((call, ci) => callResult(call, tasks.filter((t) => t.callIndex === ci)))
  }
}
