import { describe, expect, it } from 'vitest'
import { createMemoryModel, type MemoryModel, type ParamsBuilders, type ScenarioDraft, type SolveBlockReason } from '../memoryModel'
import { EngineDeadError, EngineResetError, type EngineClient } from '../engineClient'
import type { DateSearchInput } from '@engine/dateSearch'
import type { DateSearchWire, EngineWire, SolveWire } from '@engine/engineWire'
import type { SolveRequest } from '@engine/solver/solveEntry'
import type { CandidateStrategy } from '@engine/solver/candidates'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { engineApi } from '@engine/engineProtocol'
import { productionMarket } from '@engine/reference/methodology'
import type { SavedRecommendationV3, SimulationParams } from '@shared/model'
import { DEV_SEEDS, doctorRecordHolds } from '@ui/devSeeds'
import { scenarioFromDraft, currentEpochDay } from '@ui/scenarioFromDraft'

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
  readonly method: 'run' | 'setLatestEpoch' | 'runDateSearch' | 'runSolve'
  readonly args: readonly unknown[]
}

/** A controllable fake engine client: date-search + solve promises resolve only when the
 *  test releases them (out-of-order races become deterministic). */
function fakeClient(opts?: { runWire?: EngineWire; runningInWorker?: boolean; resetRejects?: boolean }) {
  const calls: Call[] = []
  const datePending: Array<(w: DateSearchWire) => void> = []
  const solvePending: Array<(w: SolveWire) => void> = []
  // The reset's OBSERVABLE contract (the real handle's, engineClient.test.ts): every call in flight
  // on the killed worker rejects with EngineResetError. Counted, so an arm can pin "reset exactly
  // once". `resetRejects: false` models the main-thread fallback, whose reset is a no-op — the
  // in-flight solve there finishes anyway, for the old draft.
  const dateRejects: Array<(e: Error) => void> = []
  const solveRejects: Array<(e: Error) => void> = []
  let resets = 0
  const client: EngineClient = {
    runningInWorker: opts?.runningInWorker ?? true,
    reset: () => {
      resets += 1
      if (opts?.resetRejects === false) return
      for (const reject of dateRejects.splice(0)) reject(new EngineResetError())
      for (const reject of solveRejects.splice(0)) reject(new EngineResetError())
    },
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
        return new Promise<DateSearchWire>((resolve, reject) => {
          datePending.push(resolve)
          dateRejects.push(reject)
        })
      },
      // P3·U10 — unused by these mechanics tests (the two-arm surface has its own battery).
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      // U15 — the solve dispatch. Controllable: the test releases each resolve deterministically.
      runSolve: (request) => {
        calls.push({ method: 'runSolve', args: [request] })
        return new Promise<SolveWire>((resolve, reject) => {
          solvePending.push(resolve)
          solveRejects.push(reject)
        })
      },
    },
  }
  return { client, calls, datePending, solvePending, resets: () => resets }
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
      tier: 'provisional',
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
// the committed answer records its RECOMPUTE TIER (the vertical-fit gate's
// synchronization anchor: Result.tsx mirrors it as `data-answer-tier`, and the
// e2e measures only on "final"). The stamp must carry the DISPATCHING tier —
// both values pinned so a hardcoded stamp (the swap/constant mutant) fails.
// ---------------------------------------------------------------------------

describe('memoryModel — the committed answer records its recompute tier', () => {
  it('stamps the date commit with the tier that dispatched it, provisional then final', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders, mintSeed: () => 7 })
    model.update(workingDraft)

    const rp = model.recompute('provisional')
    datePending[0]!(inputFailureWire('p'))
    await rp
    expect(model.getSnapshot().answer).toMatchObject({ kind: 'date', tier: 'provisional' })

    const rf = model.recompute('final')
    datePending[1]!(inputFailureWire('f'))
    await rf
    expect(model.getSnapshot().answer).toMatchObject({ kind: 'date', tier: 'final' })
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
      reset: () => {},
      engine: {
        ping: async () => engineApi.ping(),
        run: async (p, s, o) => engineApi.run(p, s, o), // forward the bandFan option the spine now requests
        setLatestEpoch: async (e) => engineApi.setLatestEpoch(e),
        runDateSearch: async (i, s, t, e) => engineApi.runDateSearch(i, s, t, e),
        runTwoArm: async (b, s, c) => engineApi.runTwoArm(b, s, c),
        runSolve: async (r) => engineApi.runSolve(r),
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
    // The tier stamp rides the SPINE commit too (the spine run ignores the tier — the stamp
    // records which dispatch landed; recompute() defaults to 'provisional'). Both values pinned
    // on THIS arm's own commit line — the date-route pin can't catch a spine-local hardcode.
    expect(answer.tier).toBe('provisional')
    await model.recompute('final')
    const sharpened = model.getSnapshot().answer
    if (sharpened.kind !== 'headline') throw new Error('unreachable')
    expect(sharpened.tier).toBe('final')
    expect(answer.result.headline.xOfTen.value).toBeGreaterThanOrEqual(0)
    expect(answer.result.headline.xOfTen.value).toBeLessThanOrEqual(10)
    expect(answer.result.headline.outcomeState).toBeTruthy()
    // END-TO-END BAND EVIDENCE: the spine run opts into the per-year fan, and it survives the real
    // engineApi.run + fromWire round-trip onto the committed answer (the U6/U7 band's INPUT). This is
    // the path that was dormant before this slice — proven live here, not just in the wire unit test.
    const fan = answer.result.distribution.bandFan
    expect(fan).toBeDefined()
    if (!fan) throw new Error('the spine dispatch must carry the per-year fan')
    expect(fan.byYear.length).toBeGreaterThan(1)
    expect(fan.byYear[0]?.yearsFromNow).toBe(0) // the today anchor
    // a real $1M-portfolio household has a positive dollar scale, so the band would render (not the
    // $0-portfolio screen) — and the fan stays DND/009-clean (every field finite, sampled-longevity
    // truncation and cohort thinning included).
    expect(fan.byYear.some((y) => y.p90 > 0)).toBe(true)
    for (const y of fan.byYear) {
      for (const v of [y.yearsFromNow, y.p10, y.p25, y.p50, y.p75, y.p90, y.cohortFraction]) {
        expect(Number.isFinite(v)).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// U15 §S5 (5) + U16 §S1 — the TIER-LESS solve lifecycle (dispatch/pending/committed + the two
// preconditions) AND the recommend-second ordering + fingerprint invalidation. The solve engine is
// a fake (the fingerprint/mint machinery has its own engine battery); these prove the STORE
// orchestration: no fabricated recommendation on an unmet precondition, the pending window,
// commit-if-newer, no solve state ever carries a tier, the solve never dispatches before the spine
// beat commits, and a fingerprint-changing draft edit demotes a committed rec to `stale` (never a
// stale rec rendered as current, never an auto-re-solve).
// ---------------------------------------------------------------------------

// FAKE is used only where the request is NEVER built into a fingerprint (the goal-unset/no-op arms,
// which return before any dispatch). Every DISPATCH arm uses a REAL request so the fingerprint seam
// computes for real (a fake would throw in solverRunFingerprint — that throw would itself be a bug).
const FAKE_SOLVE_REQUEST = { fake: true } as unknown as SolveRequest
const REAL_CANDIDATE: CandidateStrategy = { policy: 'proportional', conversion: null, provenance: 'conventional-baseline' }
/** A real, fingerprintable solve request over the gate-valid SPINE_PARAMS. `over` varies exactly
 *  the ranking-affecting field a test wants to move (or leave alone). */
const realRequest = (over?: Partial<SolveRequest>): SolveRequest => ({
  base: SPINE_PARAMS,
  candidates: [REAL_CANDIDATE],
  seedA: 7,
  ranking: { goal: 'leave-more' },
  tieTolerance: 0,
  todayEpochDay: 20_000,
  ...over,
})
const REAL_SOLVE_REQUEST = realRequest()
const refusedWire: SolveWire = { kind: 'refused', reason: 'bucket-precondition', detail: 'x', solverCodeVersion: 1 }
const tokenWithheldWire: SolveWire = {
  kind: 'token-withheld',
  reasons: [{ kind: 'state-certification-pending', state: 'NC' }],
  disclosedDirectional: [],
  solverCodeVersion: 1,
}

/** Builders with a controllable solve dispatch: `dispatch` decides a TYPED refusal (the steer-seed
 *  increment's reason channel) vs a request. `buildDateInput` returns a fake so a spine 'date' beat
 *  can commit (the recommend-second gate needs `everResolved`); the goal-unset/refusal arms never
 *  recompute, so it is inert there. */
const solveBuilders = (dispatch: (d: ScenarioDraft) => SolveRequest | SolveBlockReason): ParamsBuilders => ({
  buildSpineParams: () => null,
  buildDateInput: () => FAKE_DATE_INPUT,
  buildSolveDispatch: dispatch,
})

const withGoal = (d: ScenarioDraft): ScenarioDraft => ({ ...d, chosenGoal: 'leave-more' })

/** Open the second beat: a working household + chosen goal + a committed spine 'date' beat, so
 *  `everResolved` is true and the recommend-second dispatch gate opens. A date input-failure IS a
 *  committed 'date' answer (the lightest real spine commit — it sets everResolved). */
async function withCommittedSpine(
  model: MemoryModel,
  datePending: Array<(w: DateSearchWire) => void>,
): Promise<void> {
  model.update((d) => withGoal(workingDraft(d)))
  const idx = datePending.length
  const spine = model.recompute()
  datePending[idx]!(inputFailureWire('spine-beat'))
  await spine
}

describe('memoryModel — the solve lifecycle (§S5 (5))', () => {
  it('is a NO-OP when no solve builder is wired (P2/P3 models never reach the second beat)', async () => {
    const { client } = fakeClient()
    const model = createMemoryModel({ client, builders: dateBuilders })
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'idle' })
  })

  it('BLOCKS on goal-unset — the solve is never dispatched while the goal sentinel is unset (burned/062)', async () => {
    const { client, calls } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => FAKE_SOLVE_REQUEST) })
    await model.dispatchSolve() // draft.chosenGoal is undefined by default
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' })
    expect(calls.filter((c) => c.method === 'runSolve')).toHaveLength(0) // NEVER dispatched
  })

  it('BLOCKS on the builder refusal — the TYPED reason lands verbatim as the gap (no-pretax / spine-unready)', async () => {
    const { client, calls } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => 'no-pretax') })
    model.update(withGoal)
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' })
    expect(calls.filter((c) => c.method === 'runSolve')).toHaveLength(0)
    // The SECOND reason arm lands verbatim too — the store never re-collapses the builder's channel
    // (the old one-gap null convention is the mutant this pins against).
    const second = createMemoryModel({ client, builders: solveBuilders(() => 'spine-unready') })
    second.update(withGoal)
    await second.dispatchSolve()
    expect(second.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'spine-unready', label: 'spine-unready' })
  })

  it('a blocked builder-refusal SELF-HEALS on the edit that fixes it — idle returns the invite (insight 100: the note PROMISED it)', async () => {
    const { client, calls } = fakeClient()
    // Draft-sensitive: the builder refuses no-pretax until the edit lands (spend 111 = "pretax added").
    const model = createMemoryModel({
      client,
      builders: solveBuilders((d) => (d.annualSpendingReal === 111 ? REAL_SOLVE_REQUEST : 'no-pretax')),
    })
    model.update(withGoal)
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' })
    model.update((d) => ({ ...d, annualSpendingReal: 111 })) // the fixing edit
    expect(model.getSnapshot().solve, 'a now-buildable draft demotes blocked → idle (the invite returns)').toEqual({ kind: 'idle' })
    // NEVER an auto-re-solve: the heal re-opens the DOOR, it does not walk through it.
    expect(calls.filter((c) => c.method === 'runSolve')).toHaveLength(0)
  })

  it('a blocked refusal whose REASON moves re-lands the CURRENT truth (spine-unready → no-pretax), never a stale story', async () => {
    const { client } = fakeClient()
    const model = createMemoryModel({
      client,
      builders: solveBuilders((d) => (d.annualSpendingReal === 222 ? 'no-pretax' : 'spine-unready')),
    })
    model.update(withGoal)
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'spine-unready', label: 'spine-unready' })
    model.update((d) => ({ ...d, annualSpendingReal: 222 })) // the facts-fix on a still-no-pretax household
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' })
  })

  it('clearing the GOAL from a blocked refusal re-lands goal-unset (the invite + picker steer), mirroring dispatch precedence', async () => {
    const { client } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => 'no-pretax') })
    model.update(withGoal)
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' })
    model.update((d) => ({ ...d, chosenGoal: undefined }))
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' })
  })

  it('goes pending → committed when the preconditions are met (a TIER-LESS lifecycle — no fabricated tier)', async () => {
    const { client, solvePending, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending) // recommend-second: the spine beat must commit first
    const p = model.dispatchSolve()
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    solvePending[0]!(refusedWire)
    await p
    const solve = model.getSnapshot().solve
    expect(solve.kind).toBe('committed')
    if (solve.kind !== 'committed') throw new Error('unreachable')
    expect(solve.payload).toEqual({ kind: 'refused', reason: 'bucket-precondition', detail: 'x', solverCodeVersion: 1 })
    // No solve state ever carries a DateSearchTier (the vertical-fit gate must never satisfy on it).
    expect('tier' in solve).toBe(false)
  })

  it('commits the NEWER solve and DISCARDS a stale in-flight one (the epoch guard)', async () => {
    const { client, solvePending, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending)
    const first = model.dispatchSolve()
    const second = model.dispatchSolve()
    // Release the SECOND first (it commits), then the stale FIRST (it must be discarded).
    solvePending[1]!({ kind: 'mint-failed', stage: 'roster', detail: 'newer', solverCodeVersion: 1 })
    await second
    solvePending[0]!(refusedWire)
    await first
    const solve = model.getSnapshot().solve
    if (solve.kind !== 'committed') throw new Error('unreachable')
    expect(solve.payload).toMatchObject({ kind: 'mint-failed', detail: 'newer' }) // the newer one stands
  })

  it('THE KILLER — a stale in-flight solve resolving AFTER the goal is cleared never overwrites the blocked state (fix a)', async () => {
    // The blocked branches must MINT + COMMIT an epoch (not assign solveAnswer directly): otherwise the
    // still-committed epoch stays 0 and the stale #1 resolve commits OVER the blocked state. Reverting
    // fix (a) (direct assignment in the goal-unset branch) makes this red.
    const { client, solvePending, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending)
    const inFlight = model.dispatchSolve() // #1 — deferred, pending
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    // Clear the goal + re-dispatch → the goal-unset blocked branch (now epoch-minting + committing).
    model.update((d) => ({ ...d, chosenGoal: undefined }))
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' })
    // Release the STALE first solve — it must be DISCARDED; the blocked state stands.
    solvePending[0]!(refusedWire)
    await inFlight
    expect(model.getSnapshot().solve).toEqual({ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' })
  })

  it('a stale resolve while a NEWER solve is still PENDING never overwrites the pending window (fix b)', async () => {
    // Two pending dispatches, nothing committed yet (committedEpoch still 0). Only the dispatch-epoch
    // HOLD (`epoch !== solveDispatchedEpoch`) stops the stale #1 from committing over the newer pending —
    // commitSolve's committed-epoch guard alone would let it through. Reverting fix (b) makes this red.
    const { client, solvePending, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending)
    const first = model.dispatchSolve() // #1 pending
    const second = model.dispatchSolve() // #2 pending (newer)
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    solvePending[0]!(refusedWire) // release the STALE #1
    await first
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' }) // pending STAYS
    solvePending[1]!({ kind: 'mint-failed', stage: 'roster', detail: 'newer', solverCodeVersion: 1 })
    await second
    const solve = model.getSnapshot().solve
    if (solve.kind !== 'committed') throw new Error('unreachable')
    expect(solve.payload).toMatchObject({ kind: 'mint-failed', detail: 'newer' }) // the newer one commits
  })

  it('HOLDS on a cooperatively-ABORTED solve — a superseded run that bailed never commits (§S6)', async () => {
    // The commit-epoch guard discards a stale RESULT once a newer solve has committed; the aborted bin
    // is HELD directly (mirroring the date route's `cancelled` hold) so it never renders as an answer,
    // even before the newer solve lands. Deleting the hold ⇒ the aborted payload commits ⇒ this fails.
    const { client, solvePending, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending)
    const p = model.dispatchSolve()
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    const abortedWire: SolveWire = { kind: 'aborted', detail: 'superseded', solverCodeVersion: 1 }
    solvePending[0]!(abortedWire)
    await p
    // Held — never committed to an answer (the pending window stands until a real solve lands).
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
  })

  it('a rejected solve promise commits the calm compute-error mode (never an uncaught rejection)', async () => {
    const client: EngineClient = {
      runningInWorker: true,
      reset: () => {},
      engine: {
        ping: async () => 'pong' as const,
        run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
        setLatestEpoch: async () => {},
        // An input-failure date wire commits a 'date' answer → everResolved (the recommend-second gate).
        runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'input-failure', reason: 'x' } }) as const,
        runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
        runSolve: async () => {
          throw new Error('worker died')
        },
      },
    }
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    model.update((d) => withGoal(workingDraft(d)))
    await model.recompute() // commit a spine 'date' beat first (everResolved)
    await model.dispatchSolve()
    expect(model.getSnapshot().solve).toEqual({ kind: 'compute-error', reason: 'engine-unavailable' })
  })
})

// ---------------------------------------------------------------------------
// U16 §S1 — recommend-second ORDERING + fingerprint INVALIDATION (the store substrate; no render).
// FATAL wall #1: no decision re-derived from displayed figures — invalidation source-binds to
// solverRunFingerprint, never a bespoke mirror. FATAL wall #4: the solve channel never carries a
// tier. The stale demotion mirrors U12's tier-less inputs-incomplete on the solve channel.
// ---------------------------------------------------------------------------

// A builder whose request fingerprint MOVES with `draft.retirementState` (a genuine ranking-affecting
// field: state tax re-prices the ranking). Encoded here as a tieTolerance swing that
// solverRunFingerprint captures — the store test proves the store DETECTS the change via the run
// identity, not that the identity is complete (solverRunFingerprint owns that). The GOAL is held
// FIXED, so a mutant keyed to a coarse goal-mirror instead of the full fingerprint fails to detect it.
const fingerprintSensitiveDispatch = (d: ScenarioDraft): SolveRequest | SolveBlockReason => {
  if (d.chosenGoal === undefined) return 'spine-unready'
  return realRequest({ tieTolerance: d.retirementState === 'NC' ? 1 : 0 })
}

/** A REAL saved-recommendation record (the `?vault=rec` plant's own doctor — the shipped
 *  `mintSavedRecommendation` over the engine's own run-identity producer). Real rather than a stub
 *  so the arm that carries it asserts about a FULLY POPULATED record — fifteen dated era fields and
 *  a canon-serialized identity — and not about a placeholder the draft happens to hold. Lazy: it
 *  costs a candidate enumeration, and only one arm needs it. */
function aRealSavedRecord(): SavedRecommendationV3 {
  const built = scenarioFromDraft(DEV_SEEDS.retired)
  if (!built.ready) throw new Error('the retired dev seed must be save-ready')
  const record = doctorRecordHolds(built.scenario, currentEpochDay()).savedRecommendation
  if (record === undefined) throw new Error('the record plant exists to produce a record')
  return record
}

/** Bring a model to a COMMITTED solve over the fingerprint-sensitive builder (spine committed, goal
 *  set, one solve resolved to `refused`). Returns the model + fakes for the follow-on edit. */
async function committedSolveModel() {
  const { client, calls, solvePending, datePending } = fakeClient()
  const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
  await withCommittedSpine(model, datePending) // retirementState still unset here → tieTolerance 0
  const p = model.dispatchSolve()
  solvePending[0]!(refusedWire)
  await p
  return { model, client, calls, solvePending, datePending }
}

describe('memoryModel — recommend-second ordering (§S1)', () => {
  it('a solve NEVER dispatches before the spine beat commits — even with the goal set and buckets valid', async () => {
    const { client, calls } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    model.update(withGoal) // goal set, builder returns a request — preconditions PASS
    await model.dispatchSolve() // but no spine beat has committed (everResolved === false)
    expect(calls.filter((c) => c.method === 'runSolve')).toHaveLength(0) // the worker was never asked
    expect(model.getSnapshot().solve).toEqual({ kind: 'idle' }) // dormant — not blocked, not pending
  })

  it('dispatches once the spine beat HAS committed (the gate opens, the spine lane never starved first)', async () => {
    const { client, calls, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending) // spine 'date' beat commits → everResolved
    void model.dispatchSolve()
    expect(calls.filter((c) => c.method === 'runSolve')).toHaveLength(1) // now the solve reaches the worker
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
  })
})

describe('memoryModel — fingerprint invalidation (§S1)', () => {
  it('the committed arm CARRIES the solver-run fingerprint it solved on (source-bound, not a mirror)', async () => {
    const { model } = await committedSolveModel()
    const solve = model.getSnapshot().solve
    if (solve.kind !== 'committed') throw new Error('unreachable')
    // Byte-identical to the independent solverRunFingerprint over the dispatched request (proves the
    // store stashed the REAL run identity, computed the same way a fresh diff will be).
    const expected = solverRunFingerprint(
      SPINE_PARAMS,
      [REAL_CANDIDATE],
      { goal: 'leave-more' },
      { seedA: 7, tieTolerance: 0 },
    )
    expect(solve.fingerprint).toBe(expected)
  })

  it('EXPOSES the fresh fingerprint the draft WOULD solve — the same derivation the demotion uses (U17 §S5)', async () => {
    // The trichotomy's `freshFingerprint` operand, surfaced. TWO arms, and the second is the one
    // doing the work: a member that returned the COMMITTED `solveAnswer.fingerprint` instead keeps
    // arm (a) green forever (the two are byte-equal AT the commit by construction) and only parts
    // company once the draft moves. Both expectations recompute INDEPENDENTLY — calling the model's
    // own producer on both sides would prove the FUNCTION, never that the member is wired to it
    // (insights 032 + 081).
    const { model } = await committedSolveModel()
    const solve = model.getSnapshot().solve
    if (solve.kind !== 'committed') throw new Error('unreachable')

    // (a) AT the commit — equal to the committed identity and to an independent recompute.
    const atCommit = solverRunFingerprint(
      SPINE_PARAMS,
      [REAL_CANDIDATE],
      { goal: 'leave-more' },
      { seedA: 7, tieTolerance: 0 },
    )
    expect(model.currentDraftFingerprint()).toBe(atCommit)
    expect(model.currentDraftFingerprint()).toBe(solve.fingerprint)

    // (b) AFTER a ranking-affecting edit — the committed value is gone (demoted), but the FRESH
    // build still exists and has moved. This is the arm the committed-value mutant reds on.
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    const afterEdit = solverRunFingerprint(
      SPINE_PARAMS,
      [REAL_CANDIDATE],
      { goal: 'leave-more' },
      { seedA: 7, tieTolerance: 1 },
    )
    expect(model.getSnapshot().solve.kind).toBe('stale')
    expect(model.currentDraftFingerprint()).toBe(afterEdit)
    expect(model.currentDraftFingerprint()).not.toBe(atCommit)
  })

  it('the fresh fingerprint is NULL — fail-CLOSED — when the draft can no longer build a solve request', async () => {
    // `null` must read as `inputs-unavailable`, never as "nothing changed". A member that swallowed
    // the builder's typed refusal into a stale-but-non-null string would let S5's record report
    // itself current against a draft that can no longer even be solved.
    const { model } = await committedSolveModel()
    model.update((d) => ({ ...d, chosenGoal: undefined }))
    expect(model.currentDraftFingerprint()).toBeNull()
  })

  it('a draft edit that CHANGES the fingerprint demotes the committed rec to `stale` (the killer for fix a)', async () => {
    // Moves retirementState (a ranking-affecting field) with the goal HELD FIXED. The full run
    // fingerprint changes; a coarse goal-mirror would not — reverting fix (a) (a bespoke goal-keyed
    // mirror) leaves this committed and fails the assertion.
    const { model } = await committedSolveModel()
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    const solve = model.getSnapshot().solve
    expect(solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
  })

  it('a draft edit that does NOT change the fingerprint LEAVES the committed rec standing (no false demotion)', async () => {
    const { model } = await committedSolveModel()
    // spendEntryPeriod is not read by the builder → the request (and its fingerprint) is unchanged.
    model.update((d) => ({ ...d, spendEntryPeriod: 'year' }))
    expect(model.getSnapshot().solve.kind).toBe('committed')
  })

  /**
   * U17 §S5 — the STORE half of "minting a record must not demote the read it describes".
   *
   * WHAT THIS ARM PROVES, EXACTLY: `update()` puts the record on the draft, LEAVES it there, and
   * runs `invalidateStaleSolve` without demoting. That is the store-side obligation S5's gesture
   * depends on (`IntakeApp` step 6 writes the record onto the draft between the mint and the
   * write) — and the "leaves it there" half is not implied by anything else: `update` takes a whole
   * new draft from its caller, so a mutation seam that reconstructed the draft from known fields
   * would silently drop the record on the very next commit-on-blur.
   *
   * WHAT IT DOES NOT PROVE, AND SAYS SO: that the SHIPPED builder is blind to the record. This
   * file's dispatches are the in-file fakes above (`realRequest` / `fingerprintSensitiveDispatch`),
   * which ignore `savedRecommendation` BY CONSTRUCTION — so a "still committed" assertion here can
   * only ever witness its own fixture. The real builder's blindness is pinned where the real builder
   * runs: `ui/__tests__/solveDispatch.test.ts`, "a saved recommendation on the draft does NOT move
   * the run identity".
   */
  it('`update()` carrying a saved recommendation onto the draft KEEPS it there and leaves the committed rec standing (the store half — the builder half is in solveDispatch.test.ts)', async () => {
    const { model } = await committedSolveModel()
    const before = model.getSnapshot().solve
    if (before.kind !== 'committed') throw new Error('unreachable')
    const record = aRealSavedRecord()
    model.update((d) => ({ ...d, savedRecommendation: record }))
    const after = model.getSnapshot().solve
    expect(after.kind, 'saving a strategy read must not demote the strategy read').toBe('committed')
    if (after.kind !== 'committed') return
    expect(after.fingerprint, 'and the run identity is untouched').toBe(before.fingerprint)
    // THE OTHER HALF: the record survived the mutation seam (a reconstructing `update` would have
    // dropped it, and the gesture's very next `session.save` would write a record-free scenario).
    expect(model.getSnapshot().draft.savedRecommendation).toBe(record)
    // NON-VACUITY: this same model DOES demote on a genuinely ranking-affecting edit, so the
    // "still committed" above is the record being inert, not the demotion being broken.
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().solve.kind).toBe('stale')
  })

  it('a draft edit that makes the request UNBUILDABLE (cleared goal) is itself an invalidation → `stale`', async () => {
    const { model } = await committedSolveModel()
    model.update((d) => ({ ...d, chosenGoal: undefined })) // builder now returns null
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
  })

  it('a fingerprint change NEVER triggers a re-dispatch — no auto-re-solve storm (the killer for fix b)', async () => {
    // Re-solving is INVITED, never fired on a draft edit. Reverting fix (b) (auto-dispatch on demotion)
    // both re-calls runSolve AND leaves the state `pending` instead of `stale` — either fails here.
    const { model, calls } = await committedSolveModel()
    const solvesBefore = calls.filter((c) => c.method === 'runSolve').length
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' }) // demoted, not re-run
    expect(calls.filter((c) => c.method === 'runSolve').length).toBe(solvesBefore) // NO new dispatch
  })

  it('the stale state NEVER renders as current — it carries no payload to show as a live rec (structural)', async () => {
    const { model } = await committedSolveModel()
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    const solve = model.getSnapshot().solve
    expect(solve.kind).not.toBe('committed') // a rec render keys on 'committed'; stale is a different arm
    expect('payload' in solve).toBe(false) // no seed-B figures reachable to render as a live answer
    expect('tier' in solve).toBe(false) // tier-less like every solve state (wall #4)
  })

  it('an edit mid-flight lands `stale` — at the EDIT since the edit-time kill (§S6), never a rec shown as current', async () => {
    // The draft is edited WHILE the solve is in flight (an edit during the ~72s wait). Until
    // 2026-09-03 the demotion waited for the doomed solve to RESOLVE (minutes of a frozen headline
    // behind it); now `update()` supersedes the run the instant a ranking-affecting input moves and
    // resets the worker. Either way: never a rec for the old inputs shown as current.
    const { client, solvePending, datePending, resets } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
    await withCommittedSpine(model, datePending) // tieTolerance 0 at dispatch
    const p = model.dispatchSolve()
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    model.update((d) => ({ ...d, retirementState: 'NC' })) // the fingerprint moves under the pending solve
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' }) // demoted NOW
    expect(resets()).toBe(1) // and the worker was reset — its in-flight runSolve rejected
    solvePending[0]!(refusedWire) // a late settle is a no-op on the already-rejected promise
    await p // dispatchSolve's catch: the epoch advanced before the reset → held
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' }) // never current
  })

  it('the blocked precondition arm is STRUCTURALLY DISTINCT from a committed withheld payload (§S1)', async () => {
    // Two calm states that both name a true reason but are NEVER confusable: `blocked` is a
    // pre-dispatch USER precondition (gap), `committed`+token-withheld is a worker-computed refusal.
    const blocked = await (async () => {
      const { client } = fakeClient()
      const m = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
      await m.dispatchSolve() // goal unset → blocked
      return m.getSnapshot().solve
    })()
    const withheld = await (async () => {
      const { client, solvePending, datePending } = fakeClient()
      const m = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
      await withCommittedSpine(m, datePending)
      const p = m.dispatchSolve()
      solvePending[0]!(tokenWithheldWire)
      await p
      return m.getSnapshot().solve
    })()

    expect(blocked.kind).toBe('blocked')
    expect(withheld.kind).toBe('committed')
    if (blocked.kind !== 'blocked' || withheld.kind !== 'committed') throw new Error('unreachable')
    // The blocked reason is a structured GAP (no payload); the withheld reason is TEXT inside the
    // committed payload (no gap) — a render routes them by `kind`, never one as the other.
    expect(blocked.gap).toBe('goal-unset')
    expect('payload' in blocked).toBe(false)
    expect(withheld.payload).toMatchObject({
      kind: 'token-withheld',
      reasons: [{ kind: 'state-certification-pending', state: 'NC' }],
    })
    expect('gap' in withheld).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// U17·S3 — THE SAVED-RECOMMENDATION RECORD SURVIVES DRAFT EDITS (the D4 trap).
//
// `update()` runs `invalidateStaleSolve()` on EVERY draft mutation, demoting a committed LIVE
// solve to `stale`. The persisted RECORD must be untouched by that: it is a memory of what was
// once recommended, and `store/savedRecommendation.ts`'s trichotomy is what reports its
// staleness. A draft edit that silently erased it would destroy the very evidence the re-entry
// warning is built from — the household would return to a plan that quietly forgot it ever had
// a recommendation, with no error and nothing to warn about.
// ---------------------------------------------------------------------------

const A_RECORD = {
  mintedAt: 20_500,
  fingerprint: 'solver-run-fp/v2:{"goal"=s"leave-more"}',
  solverCodeVersion: 1,
  goal: 'leave-more',
  action: { candidateId: 'baseline:taxable-first:0', policy: 'taxable-first' },
  verdict: { grade: 'just-do-it', subTenthCollapse: false, noChange: false, surplusRegime: false, noDollarRegister: false },
  // ALL FIVE era fields: required on a RECORD (a record is born after every stamp exists, so an
  // absent one is a minter bug that would pin every rulebook clock quiet — model.ts).
  era: {
    appDefaultVersion: 'p2-d1',
    taxVintageDetail: { taxYear: 2026, legalBasis: 'OBBBA' },
    stateTaxVintage: { ncProfile: '{"nc":1}', paProfile: '{"pa":1}', flProfile: '{"fl":0}' },
    healthcareVintage: {
      coverageYear: 2026,
      acaStatus: 'reverted',
      acaVerifiedOn: '2026-07-01',
      fplGuidelineYear: 2025,
      irmaaTopTierFrozenThrough: 2028,
      partBStandardMonthly: 206.5,
    },
    dateVintage: { contributionYear: 2026, blendSnapshotAsOf: '2026-01-01' },
  },
} as const

describe('memoryModel — the saved-recommendation record is a USER FACT on the draft (U17·S3)', () => {
  it('an edit that DEMOTES the live solve to `stale` leaves the record untouched (the trichotomy owns its staleness, not the solve lane)', async () => {
    const { model } = await committedSolveModel()
    model.update((d) => ({ ...d, savedRecommendation: A_RECORD }))
    expect(model.getSnapshot().draft.savedRecommendation).toEqual(A_RECORD)
    // The ranking-affecting edit that demotes the LIVE solve…
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    // …must not touch the RECORD. (insight 029: the assertion routes through the same update()
    // call that fires invalidateStaleSolve, so a clear-the-record mutant inside it goes red here.)
    expect(model.getSnapshot().draft.savedRecommendation).toEqual(A_RECORD)
  })

  it('it also survives an edit that makes the solve request UNBUILDABLE (a cleared goal) — the harshest invalidation path', async () => {
    const { model } = await committedSolveModel()
    model.update((d) => ({ ...d, savedRecommendation: A_RECORD }))
    model.update((d) => ({ ...d, chosenGoal: undefined }))
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    expect(model.getSnapshot().draft.savedRecommendation).toEqual(A_RECORD)
  })

  it('NOTHING in the store MINTS one: the record is absent until a writer puts it there (S3 builds no writer — the mint lands with the S5 save gesture)', async () => {
    const { model } = await committedSolveModel()
    // A committed solve does NOT create a record — saving stays an explicit gesture (the
    // no-auto-save law). A store that quietly stashed one here would be an implicit write path.
    expect(model.getSnapshot().solve.kind).toBe('committed')
    expect(model.getSnapshot().draft.savedRecommendation).toBeUndefined()
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().draft.savedRecommendation).toBeUndefined()
  })
})

describe('memoryModel — THE EDIT-TIME KILL (§S6, 2026-09-03 — the solve-lane cancel)', () => {
  // The worker's runSolve is one synchronous call, so a superseded solve would hold the ONE worker for
  // its remaining minutes with the edit's own recompute queued behind it. A fingerprint-moving edit
  // during pending now demotes at the edit and resets the worker; the killed dispatch is HELD through
  // the epoch advance that precedes the reset. Each arm plants the mutant it kills.

  it('the pending arm CARRIES the fingerprint it is solving on (one home — never a closure-side mirror)', async () => {
    const { client, datePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending)
    void model.dispatchSolve()
    const solve = model.getSnapshot().solve
    if (solve.kind !== 'pending') throw new Error('unreachable')
    expect(solve.fingerprint).toBe(model.currentDraftFingerprint())
  })

  it('a NON-fingerprint edit during pending leaves the solve running — no demotion, no reset (a name is not a ranking input)', async () => {
    const { client, solvePending, datePending, resets } = fakeClient()
    // A constant request: no draft edit can move its fingerprint.
    const model = createMemoryModel({ client, builders: solveBuilders(() => REAL_SOLVE_REQUEST) })
    await withCommittedSpine(model, datePending)
    const p = model.dispatchSolve()
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    expect(resets()).toBe(0)
    solvePending[0]!(refusedWire)
    await p
    expect(model.getSnapshot().solve.kind).toBe('committed')
  })

  it('a headline recompute queued behind the killed solve is dropped and HELD — the prior answer stays, never a compute-error, nothing auto-re-dispatched', async () => {
    const { client, solvePending, datePending, resets } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
    await withCommittedSpine(model, datePending) // answer: the committed 'date' beat
    const before = model.getSnapshot().answer
    const solve = model.dispatchSolve()
    const queued = model.recompute() // a spine sweep now queued behind the solve on the one port
    expect(datePending).toHaveLength(2)
    expect(solvePending).toHaveLength(1)
    model.update((d) => ({ ...d, retirementState: 'NC' })) // the kill — BOTH in-flight calls reject
    expect(resets()).toBe(1)
    await queued
    await solve
    expect(model.getSnapshot().answer).toEqual(before) // held: the next question-commit dispatch carries the edit
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    expect(datePending).toHaveLength(2) // no auto-re-dispatch on either lane
    expect(solvePending).toHaveLength(1)
  })

  it('on the main-thread FALLBACK (no worker to kill) the killed dispatch\'s LATE RESOLVE is held by the epoch advance alone', async () => {
    const { client, solvePending, datePending, resets } = fakeClient({ runningInWorker: false, resetRejects: false })
    const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
    await withCommittedSpine(model, datePending)
    const p = model.dispatchSolve()
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    expect(resets()).toBe(1) // called — a no-op on the fallback
    solvePending[0]!(refusedWire) // the solve finishes anyway, for the OLD draft
    await p
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' }) // never current
  })

  it('a reset rejection HOLDS the headline; a DEAD worker is the calm compute-error — the two rejections route differently', async () => {
    // A bespoke client: the first sweep commits, the second rejects as a RESET, the third as a DEATH.
    let sweep = 0
    const client: EngineClient = {
      runningInWorker: true,
      reset: () => {},
      engine: {
        ping: async () => 'pong' as const,
        run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
        setLatestEpoch: async () => {},
        runDateSearch: async () => {
          sweep += 1
          if (sweep === 2) throw new EngineResetError()
          if (sweep === 3) throw new EngineDeadError('chunk failed to load')
          return { kind: 'date-search', outcome: { kind: 'input-failure', reason: 'x' } } as const
        },
        runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
        runSolve: async () => refusedWire,
      },
    }
    const model = createMemoryModel({ client, builders: dateBuilders })
    model.update(workingDraft)
    await model.recompute()
    const committed = model.getSnapshot().answer
    expect(committed.kind).toBe('date')
    await model.recompute() // sweep 2: killed by a reset → HELD
    expect(model.getSnapshot().answer).toEqual(committed)
    await model.recompute() // sweep 3: the worker died → the calm compute-error mode
    expect(model.getSnapshot().answer).toEqual({ kind: 'compute-error', reason: 'engine-unavailable' })
  })

  it('a rejected fire-and-forget setLatestEpoch (a reset landing on the cancel signal) never throws out of recompute', async () => {
    const client: EngineClient = {
      runningInWorker: true,
      reset: () => {},
      engine: {
        ping: async () => 'pong' as const,
        run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
        setLatestEpoch: async () => {
          throw new EngineResetError()
        },
        runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'input-failure', reason: 'x' } }) as const,
        runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
        runSolve: async () => refusedWire,
      },
    }
    const model = createMemoryModel({ client, builders: dateBuilders })
    model.update(workingDraft)
    await expect(model.recompute()).resolves.toBeUndefined()
    expect(model.getSnapshot().answer.kind).toBe('date')
  })
})

describe('memoryModel — the edit-time kill keeps the dispatched epoch MONOTONIC past the stale commit', () => {
  it('after a kill, a RE-INVITED solve commits — its epoch mints strictly above the stale commit (a `+ 1` commit without the advance would collide and discard it forever)', async () => {
    const { client, solvePending, datePending, resets } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
    await withCommittedSpine(model, datePending)
    const killed = model.dispatchSolve()
    model.update((d) => ({ ...d, retirementState: 'NC' })) // the kill
    expect(resets()).toBe(1)
    await killed
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    const reinvited = model.dispatchSolve() // the stale card's own door
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    solvePending[1]!(refusedWire)
    await reinvited
    expect(model.getSnapshot().solve.kind).toBe('committed') // never discarded by its own stale commit
  })
})

describe('memoryModel — the edit-time kill is CONFINED to a pending solve', () => {
  it('a fingerprint-moving edit over a COMMITTED solve demotes through invalidateStaleSolve and never resets the worker (nothing is running)', async () => {
    const { client, solvePending, datePending, resets } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
    await withCommittedSpine(model, datePending)
    const p = model.dispatchSolve()
    solvePending[0]!(refusedWire)
    await p
    expect(model.getSnapshot().solve.kind).toBe('committed')
    model.update((d) => ({ ...d, retirementState: 'NC' }))
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    expect(resets()).toBe(0) // a kill hoisted onto every fingerprint-moving edit would reset here
  })

  it('an edit that makes the request UNBUILDABLE during pending (the null-fingerprint disjunct) kills too', async () => {
    const { client, datePending, resets } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(fingerprintSensitiveDispatch) })
    await withCommittedSpine(model, datePending)
    void model.dispatchSolve()
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    model.update((d) => ({ ...d, chosenGoal: undefined })) // the builder now refuses → fresh fingerprint null
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    expect(resets()).toBe(1)
  })
})

describe('memoryModel — the resolve-time guard is the second derivation, driven by the one path that bypasses the kill', () => {
  it('a builder that derives a DIFFERENT request for the same draft at resolve time than at dispatch commits `stale`, never a rec shown as current', async () => {
    // No update() at all — the fingerprint moves under the pending solve through the builder alone,
    // which is the only way to reach the resolve-time arm now that the edit-time kill owns edits.
    let builds = 0
    const shifting = (d: ScenarioDraft): SolveRequest | SolveBlockReason =>
      d.chosenGoal === undefined ? 'spine-unready' : realRequest({ tieTolerance: builds++ === 0 ? 0 : 1 })
    const { client, solvePending, datePending, resets } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders(shifting) })
    await withCommittedSpine(model, datePending)
    const p = model.dispatchSolve() // build #1 → tieTolerance 0
    expect(model.getSnapshot().solve).toMatchObject({ kind: 'pending', label: 'solving' })
    solvePending[0]!(refusedWire)
    await p // build #2 at resolve → tieTolerance 1 → moved → stale
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
    expect(resets()).toBe(0) // nothing was killed — this is the resolve-time derivation alone
  })
})
