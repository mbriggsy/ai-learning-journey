/**
 * The worker pool's test fixtures (a test HELPER — no `.test.` in the name): in-process FAKE lanes
 * and the pooled-vs-sync differential, consumed by the `solvePool*.test.ts` files.
 *
 * A fake lane models the wire honestly: the request reaches it as the coordinator's own objects (a
 * real port would clone them — the clone half is the `portLane` arm's job), and the REPLY is a
 * `structuredClone` (so an outcome's `candidate` is a copy, exactly as off a port — the re-attach is
 * exercised on every task). Completion order is SHUFFLED: each reply waits a pseudo-random 0–3
 * macrotasks drawn from a seeded LCG (deterministic, so a red names a reproducible schedule), which
 * reorders which lane pulls the next task.
 */
import { expect } from 'vitest'
import { evaluateCall, runEvalAsync, type EvalCall, type EvalResult, type EvalSteps } from '@engine/validation/evalSteps'
import { poolEvaluator, type PoolLane, type TaskReply } from '@engine/validation/evalPool'
import { solveWithMint, solveWithMintSteps, type SolvePayload, type SolveRequest } from '@engine/solver/solveEntry'
import { packSolveWire } from '@engine/engineProtocol'
import { bitEqual } from '../../engine/solver/__tests__/bitIdentity'

/** One task as a lane saw it. */
export interface LaneLogEntry {
  readonly lane: number
  readonly call: EvalCall
}

/** A fault plant: return a reply to use INSTEAD of the real evaluation (or a reply transform), or
 *  `undefined` to evaluate for real. */
export type Fault = (call: EvalCall, real: () => TaskReply) => TaskReply | undefined

/** The real evaluation of one call, as a reply (an engine throw rides inside — the unwrap law). */
export function realReply(call: EvalCall): TaskReply {
  try {
    return { ok: true, outcomes: evaluateCall(call) }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : null }
  }
}

const ticks = (n: number): Promise<void> =>
  n <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(() => void ticks(n - 1).then(resolve), 0))

/** P shuffled-completion fake lanes over the real evaluation path. */
export function fakeLanes(p: number, opts?: { readonly shuffleSeed?: number; readonly fault?: Fault }): {
  readonly lanes: readonly PoolLane[]
  readonly log: LaneLogEntry[]
} {
  let state = (opts?.shuffleSeed ?? 0x9e3779b9) >>> 0
  const nextDelay = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state >>> 30 // 0..3
  }
  const log: LaneLogEntry[] = []
  const lanes = Array.from({ length: p }, (_, lane): PoolLane => ({
    evaluate: async (call) => {
      log.push({ lane, call })
      const real = (): TaskReply => realReply(call)
      const reply = opts?.fault?.(call, real) ?? real()
      await ticks(nextDelay())
      return structuredClone(reply)
    },
  }))
  return { lanes, log }
}

/** Drive a stage synchronously through an injected (possibly faulted) evaluator — the sync driver's
 *  lazy, memoized, read-in-order contract, so a fault plant can be compared pool-vs-sync. */
export function runFaultedSync<R>(steps: EvalSteps<R>, fault?: Fault): R {
  const lazy = (call: EvalCall): EvalResult => {
    let done: { ok: true; v: TaskReply } | null = null
    return () => {
      done ??= { ok: true, v: fault?.(call, () => realReply(call)) ?? realReply(call) }
      const reply = done.v
      if (!reply.ok) throw reply.message === null ? 'engine error' : new Error(reply.message)
      return reply.outcomes
    }
  }
  let step = steps.next()
  while (!step.done) step = steps.next(step.value.map(lazy))
  return step.value
}

/** The pooled solve's payload (the coordinator's generator over `lanes`). */
export const pooledSolve = (req: SolveRequest, lanes: readonly PoolLane[]): Promise<SolvePayload> =>
  runEvalAsync(solveWithMintSteps(req), poolEvaluator(lanes))

/** The sync differential: the pooled payload AND its packed wire bit-identical to `solveWithMint`. */
export async function assertPoolIdentical(
  name: string,
  req: SolveRequest,
  kind: SolvePayload['kind'],
  ps: readonly number[],
): Promise<{ readonly sync: SolvePayload; readonly logs: ReadonlyArray<readonly LaneLogEntry[]> }> {
  const sync = solveWithMint(req)
  expect(sync.kind, `${name}: the sync payload is not the arm this fixture exists to exercise`).toBe(kind)
  const logs: Array<readonly LaneLogEntry[]> = []
  for (const p of ps) {
    const { lanes, log } = fakeLanes(p, { shuffleSeed: 0x51ed + p })
    const pooled = await pooledSolve(req, lanes)
    expect(bitEqual(sync, pooled), `${name} at P = ${p}: the payload moved`).toEqual({ ok: true })
    expect(bitEqual(packSolveWire(sync), packSolveWire(pooled)), `${name} at P = ${p}: the packed wire moved`).toEqual({ ok: true })
    // THE TALLY (a silent fallback to one lane must not pass as a pool): every lane ran work.
    const used = new Set(log.map((e) => e.lane))
    expect(used.size, `${name} at P = ${p}: only ${used.size} of ${p} lanes ran a task`).toBe(Math.min(p, log.length))
    logs.push(log)
  }
  return { sync, logs }
}

/** The atomic route's witness on one pooled run's log: the perturbation pair ran as ONE task, on a
 *  lane OTHER than the one that ran the sibling's own seed-A task. Returns the two lanes. */
export function atomicRoute(log: readonly LaneLogEntry[]): { readonly atomicLane: number; readonly siblingLane: number } {
  const atomic = log.filter((e) => e.call.atomic === true)
  expect(atomic, 'exactly one atomic task (the perturbation pair) per solve').toHaveLength(1)
  const pair = atomic[0]!
  expect(pair.call.candidates, 'the pair is never split').toHaveLength(2)
  const sibling = pair.call.candidates[1]!
  const own = log.filter(
    (e) => e.call.atomic !== true && e.call.seed === pair.call.seed && e.call.base === pair.call.base && e.call.candidates[0] === sibling,
  )
  expect(own, "the sibling's own seed-A task ran exactly once").toHaveLength(1)
  return { atomicLane: pair.lane, siblingLane: own[0]!.lane }
}
