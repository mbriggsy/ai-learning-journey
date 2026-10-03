/**
 * The worker-pool instrument's in-page HARNESS (`solve-pool.spec.ts` beside this file) — bundled at
 * spec time (vite JS API, IIFE, the `solvePhaseHarness.ts` precedent) and evaluated inside Blob
 * WORKERS on the dist CONTROL origin (no CSP there, so `worker-src` does not apply to the Blob URLs;
 * the CSP side of the pool is `pnpm verify:csp`'s pooled arm on the enforced origin).
 *
 * Every role runs the SHIPPED engine code — nothing here re-implements the pool:
 *  - `request` — the app's own request: the dev seed's draft with `chosenGoal` → `buildSolveRequest`
 *    (the builder `memoryModel.dispatchSolve` runs);
 *  - `solveSync` — `solveWithMint`, what the single engine worker's `runSolve` runs;
 *  - `serve` — `serveEvalPort`, what an eval worker's `serveEval` runs;
 *  - `solvePooled` — the coordinator's generator over `portLane`s through `poolEvaluator`, what
 *    `runSolvePooled` runs.
 * Each report carries `bitDigest` of the payload AND of its packed wire (`packSolveWire` — the bytes
 * the main thread receives), so pooled-vs-sync is compared on everything the app could ever show.
 */
import type { RecommendationGoal } from '../../src/shared/model'
import { resolveDevSeed } from '../../src/ui/devSeeds'
import { currentEpochDay } from '../../src/ui/scenarioFromDraft'
import { buildSolveRequest } from '../../src/intake/solveDispatch'
import { solveWithMint, solveWithMintSteps, type SolvePayload, type SolveRequest } from '../../src/engine/solver/solveEntry'
import { packSolveWire, portLane, serveEvalPort } from '../../src/engine/engineProtocol'
import { runEvalAsync } from '../../src/engine/validation/evalSteps'
import { poolEvaluator } from '../../src/engine/validation/evalPool'
import { bitDigest } from '../../src/engine/solver/__tests__/bitIdentity'

export interface PoolRunReport {
  readonly payloadKind: string
  readonly payloadDigest: string
  readonly wireDigest: string
  readonly solveMs: number
  readonly candidateCount: number
  readonly paths: number
  readonly healthcareEnabled: boolean
  /** The named driver (a recommended payload only) — the probe's flip, read back. */
  readonly namedDriver: string | null
}

/** The app's request for a dev seed + goal, at today's epoch day. */
export function request(seed: string, goal: RecommendationGoal): SolveRequest {
  const draft = resolveDevSeed(seed)
  if (draft === null) throw new Error(`no dev seed "${seed}"`)
  const req = buildSolveRequest({ ...draft, chosenGoal: goal }, currentEpochDay())
  if (typeof req === 'string') throw new Error(`${seed}: the builder refused the solve (${req})`)
  return req
}

function report(req: SolveRequest, payload: SolvePayload, solveMs: number): PoolRunReport {
  return {
    payloadKind: payload.kind,
    payloadDigest: bitDigest(payload),
    wireDigest: bitDigest(packSolveWire(payload)),
    solveMs,
    candidateCount: req.candidates.length,
    paths: req.base.paths,
    healthcareEnabled: req.base.overlay?.healthcareEnabled === true,
    namedDriver: payload.kind === 'recommended' ? payload.namedDriver : null,
  }
}

/** The single-worker solve, timed in this worker's own clock. */
export function solveSync(req: SolveRequest): PoolRunReport {
  const t0 = performance.now()
  const payload = solveWithMint(req)
  return report(req, payload, performance.now() - t0)
}

/** Make this worker an eval worker on `port`. */
export function serve(port: MessagePort): void {
  serveEvalPort(port)
}

/** The pooled solve over one port per eval worker, timed in this (the coordinator's) clock. */
export async function solvePooled(req: SolveRequest, ports: readonly MessagePort[]): Promise<PoolRunReport> {
  const lanes = ports.map(portLane)
  try {
    const t0 = performance.now()
    const payload = await runEvalAsync(solveWithMintSteps(req), poolEvaluator(lanes))
    return report(req, payload, performance.now() - t0)
  } finally {
    for (const lane of lanes) lane.close()
  }
}
