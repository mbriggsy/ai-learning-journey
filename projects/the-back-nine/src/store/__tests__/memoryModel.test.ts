import { describe, expect, it } from 'vitest'
import { createMemoryModel, type ParamsBuilders, type ScenarioDraft } from '../memoryModel'
import type { EngineClient } from '../engineClient'
import type { DateSearchInput } from '@engine/dateSearch'
import type { DateSearchWire, EngineWire } from '@engine/engineWire'
import { engineApi } from '@engine/engineProtocol'
import { productionMarket } from '@engine/reference/methodology'
import type { SimulationParams } from '@shared/model'

/**
 * memoryModel orchestration mechanics (phase-2 contract #1 (a)–(f) + C3 forward
 * item (b)). The engine seam is driven through FAKES with controllable
 * resolution order (mirroring the repo's no-worker-mock convention — all
 * orchestration logic is testable in-process), plus ONE real in-process
 * engineApi run proving the spine route end-to-end against the actual wire.
 */

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const FAKE_DATE_INPUT = { fake: true } as unknown as DateSearchInput

const cancelledWire: DateSearchWire = { kind: 'date-search', outcome: { kind: 'cancelled' } }
const inputFailureWire = (reason: string): DateSearchWire => ({
  kind: 'date-search',
  outcome: { kind: 'input-failure', reason },
})

interface Call {
  readonly method: 'run' | 'setLatestEpoch' | 'runDateSearch'
  readonly args: readonly unknown[]
}

/** A controllable fake engine client: date-search promises resolve only when the
 *  test releases them (out-of-order races become deterministic). */
function fakeClient(opts?: { runWire?: EngineWire; runningInWorker?: boolean }) {
  const calls: Call[] = []
  const datePending: Array<(w: DateSearchWire) => void> = []
  const client: EngineClient = {
    runningInWorker: opts?.runningInWorker ?? true,
    engine: {
      ping: async () => 'pong' as const,
      run: async (params, seed) => {
        calls.push({ method: 'run', args: [params, seed] })
        if (!opts?.runWire) throw new Error('fake run not configured')
        return opts.runWire
      },
      setLatestEpoch: async (epoch) => {
        calls.push({ method: 'setLatestEpoch', args: [epoch] })
      },
      runDateSearch: (input, seed, tier, requestEpoch) => {
        calls.push({ method: 'runDateSearch', args: [input, seed, tier, requestEpoch] })
        return new Promise<DateSearchWire>((resolve) => {
          datePending.push(resolve)
        })
      },
    },
  }
  return { client, calls, datePending }
}

const dateBuilders: ParamsBuilders = {
  buildSpineParams: () => null,
  buildDateInput: () => FAKE_DATE_INPUT,
}

function workingDraft(d: ScenarioDraft): ScenarioDraft {
  return {
    ...d,
    people: [
      { ...d.people[0], workStatus: 'working' },
      { ...d.people[1], workStatus: 'retired' },
    ],
  }
}

function retiredDraft(d: ScenarioDraft): ScenarioDraft {
  return {
    ...d,
    people: [
      { ...d.people[0], workStatus: 'retired' },
      { ...d.people[1], workStatus: 'retired' },
    ],
  }
}

const seedSequence = (...seeds: number[]) => {
  let i = 0
  let mints = 0
  return {
    mint: () => {
      mints += 1
      return seeds[Math.min(i++, seeds.length - 1)]!
    },
    get count() {
      return mints
    },
  }
}

// A real, gate-valid spine param set (the App smoke shape, tiny path count).
const SPINE_PARAMS: SimulationParams = {
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

// ---------------------------------------------------------------------------
// (b) the seed: minted exactly once, reused, integer
// ---------------------------------------------------------------------------

describe('memoryModel — seed identity (contract #1b)', () => {
  it('mints the seed exactly once across N recomputes and passes the SAME seed every time', async () => {
    const { client, calls, datePending } = fakeClient()
    const seeds = seedSequence(0xabc12345)
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: seeds.mint })
    model.update(workingDraft)

    const r1 = model.recompute()
    datePending[0]!(inputFailureWire('r1'))
    await r1
    const r2 = model.recompute()
    datePending[1]!(inputFailureWire('r2'))
    await r2

    expect(seeds.count).toBe(1)
    const seedArgs = calls.filter((c) => c.method === 'runDateSearch').map((c) => c.args[1])
    expect(seedArgs).toEqual([0xabc12345, 0xabc12345])
    // First-class model field — what Save serializes unchanged (no re-mint).
    expect(model.getSnapshot().draft.seed).toBe(0xabc12345)
  })

  it('the default mint produces an integer in [0, 2^32) (the engine integer-seed gate)', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders })
    model.update(workingDraft)
    const r = model.recompute()
    datePending[0]!(inputFailureWire('r'))
    await r
    const seed = model.getSnapshot().draft.seed
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})

// ---------------------------------------------------------------------------
// (f) + C3 item (b): the epoch contract
// ---------------------------------------------------------------------------

describe('memoryModel — the request-epoch contract (#1f + C3(b))', () => {
  it('calls setLatestEpoch BEFORE runDateSearch with the SAME, strictly-increasing epoch', async () => {
    const { client, calls, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    const r1 = model.recompute()
    const r2 = model.recompute()
    datePending[0]!(cancelledWire)
    datePending[1]!(cancelledWire)
    await Promise.all([r1, r2])

    const seq = calls.filter((c) => c.method !== 'run')
    expect(seq.map((c) => c.method)).toEqual([
      'setLatestEpoch',
      'runDateSearch',
      'setLatestEpoch',
      'runDateSearch',
    ])
    const epochOf = (c: Call) => (c.method === 'setLatestEpoch' ? c.args[0] : c.args[3])
    expect(epochOf(seq[0]!)).toBe(epochOf(seq[1]!)) // same epoch within a dispatch
    expect(epochOf(seq[2]!)).toBe(epochOf(seq[3]!))
    expect(epochOf(seq[2]!)).toBeGreaterThan(epochOf(seq[0]!) as number) // monotonic across dispatches
  })

  it('discards a stale result: older epoch resolving AFTER a newer commit never renders', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    const rA = model.recompute() // epoch 1
    const rB = model.recompute() // epoch 2

    datePending[1]!(inputFailureWire('B-newest')) // B resolves FIRST
    await rB
    expect(model.getSnapshot().answer).toEqual({
      kind: 'date',
      outcome: { kind: 'input-failure', reason: 'B-newest' },
    })

    const before = model.getSnapshot()
    datePending[0]!(inputFailureWire('A-stale')) // the racing OLDER result lands late
    await rA
    expect(model.getSnapshot()).toBe(before) // discarded unrendered — snapshot untouched
  })

  it('commits in-order results normally (A renders, then B replaces it)', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    const rA = model.recompute()
    datePending[0]!(inputFailureWire('A'))
    await rA
    expect(model.getSnapshot().answer).toMatchObject({ outcome: { reason: 'A' } })

    const rB = model.recompute()
    datePending[1]!(inputFailureWire('B'))
    await rB
    expect(model.getSnapshot().answer).toMatchObject({ outcome: { reason: 'B' } })
  })

  it('holds the last answer during a newer in-flight dispatch (never re-enters pending)', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    const rA = model.recompute()
    datePending[0]!(inputFailureWire('A'))
    await rA

    void model.recompute() // B in flight, unresolved
    expect(model.getSnapshot().answer).toMatchObject({ outcome: { reason: 'A' } }) // held, not pending
  })

  it('pending appears ONLY in the pre-first-resolve window', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    expect(model.getSnapshot().answer.kind).toBe('idle')
    const r = model.recompute()
    expect(model.getSnapshot().answer.kind).toBe('pending')
    datePending[0]!(inputFailureWire('first'))
    await r
    expect(model.getSnapshot().answer.kind).toBe('date')
  })

  it('a superseded sweep resolving `cancelled` HOLDS the prior answer (never re-blanks)', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    const rA = model.recompute() // commits a real answer first
    datePending[0]!(inputFailureWire('A'))
    await rA
    expect(model.getSnapshot().answer).toMatchObject({ outcome: { reason: 'A' } })

    // A newer dispatch's older sibling resolves `cancelled` — it must NOT commit
    // (committing renders AnswerStrip's null arm → a blanked strip). HOLD (AC1).
    const before = model.getSnapshot()
    const rB = model.recompute()
    datePending[1]!(cancelledWire)
    await rB
    expect(model.getSnapshot()).toBe(before) // unchanged — cancelled never committed
  })

  it('passes the requested tier through to runDateSearch (the final-tier crown; D1 review R3)', async () => {
    const { client, calls, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)
    const r = model.recompute('final')
    datePending[0]!(inputFailureWire('done'))
    await r
    const call = calls.find((c) => c.method === 'runDateSearch')
    expect(call?.args[2]).toBe('final') // propagated, never silently defaulted to provisional
  })

  it('a date→spine route switch STILL bumps the worker epoch (cancels the in-flight sweep; D1 review AT2)', async () => {
    const { client, calls, datePending } = fakeClient({ runWire: { kind: 'calm-error', reason: 'x' } })
    const model = createMemoryModel({
      client,
      builders: { buildSpineParams: () => SPINE_PARAMS, buildDateInput: () => FAKE_DATE_INPUT },
      mintSeed: () => 7,
    })
    model.update(workingDraft) // date route
    const rDate = model.recompute() // epoch 1 — sweep dispatched, unresolved
    model.update(retiredDraft) // flip to all-retired
    await model.recompute() // epoch 2 — the SPINE route (run)
    const epochs = calls.filter((c) => c.method === 'setLatestEpoch').map((c) => c.args[0])
    expect(epochs).toContain(2) // route-independent: the spine dispatch advanced latestEpoch
    datePending[0]!(cancelledWire) // settle the orphaned sweep (held, never committed)
    await rDate
  })
})

// ---------------------------------------------------------------------------
// routing: work-status is asked, never inferred
// ---------------------------------------------------------------------------

describe('memoryModel — state-adaptive routing (D1/D2)', () => {
  it('any ASKED still-working person routes date-first — even with zero salary entered', async () => {
    const { client, calls, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft) // workStatus asked; no salary anywhere
    const r = model.recompute()
    datePending[0]!(cancelledWire)
    await r
    expect(calls.some((c) => c.method === 'runDateSearch')).toBe(true)
    expect(calls.some((c) => c.method === 'run')).toBe(false)
  })

  it('an all-retired household routes spine-first (run, never the sweep)', async () => {
    const { client, calls } = fakeClient({ runWire: { kind: 'calm-error', reason: 'x' } })
    const model = createMemoryModel({
      client,
      builders: { buildSpineParams: () => SPINE_PARAMS, buildDateInput: () => FAKE_DATE_INPUT },
      mintSeed: () => 7,
    })
    model.update(retiredDraft)
    await model.recompute()
    expect(calls.some((c) => c.method === 'run')).toBe(true)
    expect(calls.some((c) => c.method === 'runDateSearch')).toBe(false)
  })

  it('an unanswered work status dispatches NOTHING (status is the router)', async () => {
    const { client, calls } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    await model.recompute() // both statuses unanswered
    expect(calls).toEqual([])
    expect(model.getSnapshot().answer.kind).toBe('idle')
  })

  it('a null builder result (below minimum-viable input) dispatches nothing and stays idle', async () => {
    const { client, calls } = fakeClient()
    const model = createMemoryModel({
      client,
      builders: { buildSpineParams: () => null, buildDateInput: () => null },
      mintSeed: () => 7,
    })
    model.update(workingDraft)
    await model.recompute()
    expect(calls).toEqual([])
    expect(model.getSnapshot().answer.kind).toBe('idle')
  })
})

// ---------------------------------------------------------------------------
// error + capability surfaces
// ---------------------------------------------------------------------------

describe('memoryModel — calm error + capability', () => {
  it('a rejected engine promise commits the calm compute-error mode (never an uncaught rejection)', async () => {
    const { client } = fakeClient() // run not configured → throws
    const model = createMemoryModel({
      client,
      builders: { buildSpineParams: () => SPINE_PARAMS, buildDateInput: () => null },
      mintSeed: () => 7,
    })
    model.update(retiredDraft)
    await model.recompute()
    expect(model.getSnapshot().answer).toEqual({ kind: 'compute-error', reason: 'engine-unavailable' })
  })

  it('surfaces the client capability flag (contract #1c)', () => {
    const { client } = fakeClient({ runningInWorker: false })
    const model = createMemoryModel({ client, builders: dateBuilders })
    expect(model.getSnapshot().runningInWorker).toBe(false)
  })

  it('update() notifies subscribers and replaces the snapshot identity', () => {
    const { client } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders })
    let pings = 0
    const unsub = model.subscribe(() => {
      pings += 1
    })
    const before = model.getSnapshot()
    model.update(workingDraft)
    expect(pings).toBe(1)
    expect(model.getSnapshot()).not.toBe(before)
    unsub()
    model.update(retiredDraft)
    expect(pings).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// the spine route against the REAL engine (in-process, no worker mock — the
// repo's worker.test.ts convention): one full dispatch through engineApi.run +
// fromWire proving the headline arm end-to-end.
// ---------------------------------------------------------------------------

describe('memoryModel — real-engine spine dispatch', () => {
  it('renders a real headline through the actual wire (deterministic under the injected seed)', async () => {
    const realClient: EngineClient = {
      runningInWorker: false,
      engine: {
        ping: async () => engineApi.ping(),
        run: async (p, s) => engineApi.run(p, s),
        setLatestEpoch: async (e) => engineApi.setLatestEpoch(e),
        runDateSearch: async (i, s, t, e) => engineApi.runDateSearch(i, s, t, e),
      },
    }
    const model = createMemoryModel({
      client: realClient,
      builders: { buildSpineParams: () => SPINE_PARAMS, buildDateInput: () => null },
      mintSeed: () => 0x1234abcd,
    })
    model.update(retiredDraft)
    await model.recompute()
    const answer = model.getSnapshot().answer
    expect(answer.kind).toBe('headline')
    if (answer.kind !== 'headline') throw new Error('unreachable')
    expect(answer.result.headline.xOfTen.value).toBeGreaterThanOrEqual(0)
    expect(answer.result.headline.xOfTen.value).toBeLessThanOrEqual(10)
    expect(answer.result.headline.outcomeState).toBeTruthy()
  })
})
