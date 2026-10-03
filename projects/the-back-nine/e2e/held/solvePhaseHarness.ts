/**
 * The solve-PHASE-profile instrument's in-page HARNESS — bundled at spec time (vite JS API, IIFE, the
 * `solveTimingPlant.ts` precedent) and injected on the dist CONTROL origin, where it runs the worker's
 * own solve on the page's MAIN thread so a CDP CPU profile can see it (Playwright reaches no worker's
 * CDP target; the same code on the same V8 is the honest substitute).
 *
 * THE REQUEST IS THE APP'S: the dev seed's draft with `chosenGoal` set → `buildSolveRequest(draft,
 * currentEpochDay())` (`src/intake/solveDispatch.ts`, the builder `memoryModel.dispatchSolve` runs) →
 * `solveWithMint(request)` (`src/engine/solver/solveEntry.ts`, what `engineProtocol.ts`'s `runSolve`
 * runs in the worker). Nothing here re-implements a phase — the split is read from the profile.
 */
import type { RecommendationGoal } from '../../src/shared/model'
import { resolveDevSeed } from '../../src/ui/devSeeds'
import { currentEpochDay } from '../../src/ui/scenarioFromDraft'
import { buildSolveRequest } from '../../src/intake/solveDispatch'
import { solveWithMint } from '../../src/engine/solver/solveEntry'

export interface PhaseRunReport {
  readonly seed: string
  readonly goal: RecommendationGoal
  /** `payload.kind` — only a `recommended` run measured the whole search + grade + probe. */
  readonly payloadKind: string
  readonly candidateCount: number
  readonly conversionCount: number
  readonly paths: number
  readonly maxHorizonYears: number
  readonly healthcareEnabled: boolean
  readonly solveMs: number
}

/** Build the app's request, then run the worker's solve, timed in the page's own clock. */
export function run(seed: string, goal: RecommendationGoal): PhaseRunReport {
  const draft = resolveDevSeed(seed)
  if (draft === null) throw new Error(`no dev seed "${seed}"`)
  const request = buildSolveRequest({ ...draft, chosenGoal: goal }, currentEpochDay())
  if (typeof request === 'string') throw new Error(`${seed}: the builder refused the solve (${request})`)

  const t0 = performance.now()
  const payload = solveWithMint(request)
  const solveMs = performance.now() - t0

  return {
    seed,
    goal,
    payloadKind: payload.kind,
    candidateCount: request.candidates.length,
    conversionCount: request.candidates.filter((c) => c.conversion !== null).length,
    paths: request.base.paths,
    maxHorizonYears: request.base.maxHorizonYears,
    healthcareEnabled: request.base.overlay?.healthcareEnabled === true,
    solveMs,
  }
}
