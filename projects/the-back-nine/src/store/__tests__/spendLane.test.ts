/**
 * The spend lane (memoryModel `SpendAnswer`; council wf_faa1af2d-052) — the REAL figure for the
 * verdict clause, dispatched after a FINAL spine commit and dropped the moment it stops belonging to
 * the answer on screen. The spine run is the REAL in-process engine; the spend solve is a controllable
 * fake (its correctness has its own exhaustive oracle, spendSolveSeedGate.test.ts).
 */
import { describe, expect, it } from 'vitest'
import { createMemoryModel, type ParamsBuilders, type ScenarioDraft } from '../memoryModel'
import type { EngineClient } from '../engineClient'
import { engineApi } from '@engine/engineProtocol'
import { productionMarket } from '@engine/reference/methodology'
import type { SpendSolveWire } from '@engine/engineWire'
import type { SolveRequest } from '@engine/solver/solveEntry'
import type { SimulationParams } from '@shared/model'

// $40k on $1M for a 65/63 couple — the real engine reads it `room` (asserted below, never assumed).
const PARAMS: SimulationParams = {
  initialPortfolio: 1_000_000,
  annualSpendingReal: 40_000,
  stockWeight: 0.6,
  people: [
    { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
    { sex: 'female', currentAge: 63, birthYear: 1963, retirementAge: 65, earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 67 },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: productionMarket.value,
  paths: 64,
  maxHorizonYears: 40,
  longevityMode: 'sampled',
}

const SIZED: SpendSolveWire = {
  kind: 'spend-solve',
  outcome: { kind: 'sized', direction: 'room', monthlyReal: 5_000, failedAtMonthlyReal: 5_100, enteredMonthlyReal: 40_000 / 12, probes: 9 },
}

function client(opts: { runningInWorker?: boolean; params?: SimulationParams } = {}) {
  const spendCalls: { params: SimulationParams; seed: number; spineEpoch: number; spendEpoch: number }[] = []
  const spendRelease: ((w: SpendSolveWire) => void)[] = []
  const spendEpochCommits: number[] = []
  const c: EngineClient = {
    runningInWorker: opts.runningInWorker ?? true,
    reset: () => {},
    engine: {
      ping: async () => 'pong' as const,
      run: async (params, seed, o) => engineApi.run(params, seed, o),
      setLatestEpoch: async () => {},
      runDateSearch: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      runSpendSolve: (params, seed, spineEpoch, spendEpoch) => {
        spendCalls.push({ params, seed, spineEpoch, spendEpoch })
        return new Promise<SpendSolveWire>((resolve) => spendRelease.push(resolve))
      },
      setLatestSpendEpoch: async (epoch) => {
        spendEpochCommits.push(epoch)
      },
      runSolve: () => new Promise(() => {}), // held forever — only the dispatch matters here
    },
  }
  return { client: c, spendCalls, spendRelease, spendEpochCommits }
}

const builders = (params: SimulationParams = PARAMS): ParamsBuilders => ({
  buildSpineParams: () => params,
  buildDateInput: () => null,
  buildSolveDispatch: () =>
    ({
      base: params,
      candidates: [{ policy: 'proportional', conversion: null, provenance: 'conventional-baseline' }],
      seedA: 7,
      ranking: { goal: 'leave-more' },
      tieTolerance: 0,
      todayEpochDay: 20_000,
    }) as SolveRequest,
})

const retire = (d: ScenarioDraft): ScenarioDraft => ({
  ...d,
  people: [
    { ...d.people[0], workStatus: 'retired' },
    { ...d.people[1], workStatus: 'retired' },
  ],
})

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('the spend lane', () => {
  it('a FINAL spine commit reading `room` dispatches the spend solve on the committed params + seed; its sized outcome lands', async () => {
    const k = client()
    const model = createMemoryModel({ client: k.client, builders: builders(), mintSeed: () => 7 })
    model.update(retire)
    await model.recompute('final')
    const snap = model.getSnapshot()
    expect(snap.answer.kind === 'headline' && snap.answer.result.dollar.direction).toBe('room') // the premise, measured
    expect(k.spendCalls).toHaveLength(1)
    expect(k.spendCalls[0]!.params).toEqual(PARAMS)
    expect(k.spendCalls[0]!.seed).toBe(7)
    expect(snap.spend).toEqual({ kind: 'pending' })
    k.spendRelease[0]!(SIZED)
    await flush()
    expect(model.getSnapshot().spend).toEqual({ kind: 'resolved', outcome: SIZED.outcome })
  })

  it('a PROVISIONAL commit never dispatches (the during-entry refires must not hold the one worker)', async () => {
    const k = client()
    const model = createMemoryModel({ client: k.client, builders: builders(), mintSeed: () => 7 })
    model.update(retire)
    await model.recompute('provisional')
    expect(model.getSnapshot().answer.kind).toBe('headline')
    expect(k.spendCalls).toHaveLength(0)
    expect(model.getSnapshot().spend).toEqual({ kind: 'idle' })
  })

  it('the main-thread fallback never dispatches (a 13–27 s solve would freeze the page)', async () => {
    const k = client({ runningInWorker: false })
    const model = createMemoryModel({ client: k.client, builders: builders(), mintSeed: () => 7 })
    model.update(retire)
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('headline')
    expect(k.spendCalls).toHaveLength(0)
  })

  it('a budgeted plan never dispatches (budgeted sizing is its own open entry)', async () => {
    const budgeted = { ...PARAMS, budget: {} as NonNullable<SimulationParams['budget']> }
    const k = client()
    // The spine run itself would reject a malformed budget — only the dispatch gate is under test here,
    // so the spine run reads the budget-less params while the builder hands the store the budgeted ones.
    const c: EngineClient = { ...k.client, engine: { ...k.client.engine, run: async (_p, s, o) => engineApi.run(PARAMS, s, o) } }
    const model = createMemoryModel({ client: c, builders: builders(budgeted), mintSeed: () => 7 })
    model.update(retire)
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('headline')
    expect(k.spendCalls).toHaveLength(0)
  })

  it('a NEWER commit drops the older solve: its late resolve never sizes the new answer’s clause', async () => {
    const k = client()
    const model = createMemoryModel({ client: k.client, builders: builders(), mintSeed: () => 7 })
    model.update(retire)
    await model.recompute('final')
    expect(k.spendCalls).toHaveLength(1)
    await model.recompute('final') // a second final commit — its own solve dispatches
    expect(k.spendCalls).toHaveLength(2)
    expect(k.spendCalls[1]!.spineEpoch).toBeGreaterThan(k.spendCalls[0]!.spineEpoch)
    k.spendRelease[0]!(SIZED) // the OLD solve resolves late
    await flush()
    expect(model.getSnapshot().spend).toEqual({ kind: 'pending' }) // still the newer one's
    k.spendRelease[1]!(SIZED)
    await flush()
    expect(model.getSnapshot().spend.kind).toBe('resolved')
  })

  it('a cancelled / failed solve leaves the clause figure-less (idle), never pending forever', async () => {
    const k = client()
    const model = createMemoryModel({ client: k.client, builders: builders(), mintSeed: () => 7 })
    model.update(retire)
    await model.recompute('final')
    k.spendRelease[0]!({ kind: 'spend-solve', outcome: { kind: 'cancelled' } })
    await flush()
    expect(model.getSnapshot().spend).toEqual({ kind: 'idle' })
  })

  it('inviting the recommendation CANCELS an in-flight spend solve (worker-side epoch) — the second beat never queues behind it', async () => {
    const k = client()
    const model = createMemoryModel({ client: k.client, builders: builders(), mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), chosenGoal: 'leave-more' }))
    await model.recompute('final')
    expect(model.getSnapshot().spend).toEqual({ kind: 'pending' })
    const dispatchedSpendEpoch = k.spendCalls[0]!.spendEpoch
    void model.dispatchSolve()
    await flush()
    expect(model.getSnapshot().solve.kind).toBe('pending')
    expect(k.spendEpochCommits).toHaveLength(1)
    expect(k.spendEpochCommits[0]!).toBeGreaterThan(dispatchedSpendEpoch) // the worker-side cancel
    expect(model.getSnapshot().spend).toEqual({ kind: 'idle' })
    k.spendRelease[0]!(SIZED) // the cancelled solve's late resolve is dropped
    await flush()
    expect(model.getSnapshot().spend).toEqual({ kind: 'idle' })
  })
})
