/**
 * The what-if timing instrument's in-page HARNESS (`whatif-timing.spec.ts` beside this file) — bundled at spec time
 * (vite JS API, IIFE, the `solvePoolHarness.ts` precedent) and evaluated inside Blob WORKERS on the dist CONTROL
 * origin. It answers the workbench plan's U14 timing question: how long one working household's candidate run takes
 * at each date-search tier, so the rail's what-if runs at the tier the numbers allow (KTD12).
 *
 * Every role runs the SHIPPED code — nothing here re-implements a run:
 *  - `prepare` — the dev seed's draft → the store's own FINAL date search (`runDateSearch`, the sweep the store's
 *    final recompute runs) → the table base the workbench builds on it (`buildTableBase`: the band's offset and
 *    track). The final sweep's own wall clock rides back.
 *  - `timeRun` — the run a what-if lane sends at one tier: `buildCandidateParams(buildDateInput(draft), offset,
 *    paths)` (what `buildControlPreviewParams` returns on the date route) through `runEngine`, the worker's `run`
 *    (simulate + summarize + pack; only Comlink's transfer is left out).
 *  - `sweep` — the store's final sweep through `runDateSearchEngine`, the worker's `runDateSearch` (its macrotask
 *    yield between candidates included), so a `run` message posted mid-sweep waits exactly as a lane's call does.
 */
import { resolveDevSeed } from '../../src/ui/devSeeds'
import { buildDateInput, buildTableBase } from '../../src/intake/intakeMap'
import { buildCandidateParams, runDateSearch } from '../../src/engine/dateSearch'
import { runDateSearchEngine, runEngine } from '../../src/engine/engineProtocol'
import type { DateSearchInput } from '../../src/engine/dateSearch'

export interface Prepared {
  readonly seedName: string
  readonly seed: number
  readonly offset: number
  readonly track: 'full' | 'floor'
  readonly route: string
  readonly sweepMs: number
}

export interface RunTiming {
  readonly ms: number
  readonly kind: string
  readonly paths: number
}

function inputFor(seedName: string): { input: DateSearchInput; seed: number; draft: NonNullable<ReturnType<typeof resolveDevSeed>> } {
  const draft = resolveDevSeed(seedName)
  if (draft === null) throw new Error(`no dev seed "${seedName}"`)
  if (draft.seed === undefined) throw new Error(`${seedName}: the dev seed carries no seed`)
  const input = buildDateInput(draft)
  if (input === null) throw new Error(`${seedName}: not a date-route draft`)
  return { input, seed: draft.seed, draft }
}

/** The final date search the store runs, then the workbench's table base on its outcome. */
export async function prepare(seedName: string): Promise<Prepared> {
  const { input, seed, draft } = inputFor(seedName)
  const t0 = performance.now()
  const outcome = await runDateSearch(input, seed, { tier: 'final', shouldContinue: async () => true })
  const sweepMs = performance.now() - t0
  const base = buildTableBase(draft, outcome)
  if (base.kind !== 'run' || base.stopOffsetYears === undefined) {
    throw new Error(`${seedName}: no dated table base (${base.kind === 'withheld' ? base.reason : 'spine'})`)
  }
  return { seedName, seed, offset: base.stopOffsetYears, track: base.track, route: base.route, sweepMs }
}

/** One candidate run at `paths`, timed in this worker's own clock. */
export function timeRun(seedName: string, offset: number, paths: number): RunTiming {
  const { input, seed } = inputFor(seedName)
  const params = buildCandidateParams(input, offset, paths)
  const t0 = performance.now()
  const wire = runEngine(params, seed)
  return { ms: performance.now() - t0, kind: wire.kind, paths }
}

/** The store's final sweep, through the worker's own date-search entry (macrotask yields included). */
export async function sweep(seedName: string): Promise<{ ms: number; kind: string }> {
  const { input, seed } = inputFor(seedName)
  const t0 = performance.now()
  const wire = await runDateSearchEngine(input, seed, 'final', 1)
  return { ms: performance.now() - t0, kind: wire.kind }
}
