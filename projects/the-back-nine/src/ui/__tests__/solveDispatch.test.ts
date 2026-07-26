/**
 * U16 §S1 — the live recommend-second arc, end to end (the recorded blocker closed): the intake solve
 * builder (`buildSolveRequest`) + the store dispatch driving a REAL draft through the REAL worker-path
 * solve. Two batteries:
 *
 *  1. BUILDER UNIT — `buildSolveRequest` obeys the builder-null convention and the fleet's ONE LAW
 *     (every field from its canonical producer), with the two named planted-mutant killers:
 *       (a) a re-typed tieTolerance (must stay the shipped 0);
 *       (b) a silently-substituted default goal on an unset chosenGoal (must stay null → GoalPicker).
 *
 *  2. STORE INTEGRATION — from a real devSeed draft, a goal pick drives idle → pending → committed
 *     against the REAL in-process engine (engineApi.runSolve — the memoryModel real-engine precedent):
 *       (a) the NC household commits token-withheld{state-certification-pending} (the Q5 held render);
 *       (b) a priced-state (FL) household commits a real recommendation whose carried fingerprint
 *           EQUALS solverRunFingerprint of the dispatched request (source-bound, wall #1);
 *       (c) a fingerprint-moving draft edit mid-flight lands stale, never committed-as-current (the S1
 *           law, through the REAL builder);
 *       (d) recommend-second: no dispatch before the spine beat commits (through the REAL builder).
 *
 * PATH SEAM (recorded): arms (a)/(b) drive the REAL builder's anchor/candidate/ranking/seed derivation
 * but dial base.paths → 256 and _gradeMinPaths → 50 (the exact seams `solveEntry.test.ts` uses) so the
 * full 16k-path live solve is CI-tractable; the derivation under test is untouched.
 */
import { describe, expect, it } from 'vitest'
import { buildSolveRequest } from '@intake/solveDispatch'
import { buildSpineParams, buildDateInput } from '@intake/intakeMap'
import { createMemoryModel, type ParamsBuilders, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { SolveWire } from '@engine/engineWire'
import { engineApi } from '@engine/engineProtocol'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { solverAssumedHeirBracket, solverMinBPaths, acaEnhancedSubsidyStatus } from '@engine/constants'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { doctorRecordHolds, resolveDevSeed } from '../devSeeds'
import { scenarioFromDraft } from '../scenarioFromDraft'

// Within the ACA freshness window so a clean household MINTS (the solveEntry.test convention).
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

const withGoalSeed = (key: string, goal: ScenarioDraft['chosenGoal'], seed = 0xa11ce): ScenarioDraft => ({
  ...resolveDevSeed(key)!,
  seed,
  chosenGoal: goal,
})

// ---------------------------------------------------------------------------
// 1. BUILDER UNIT — the TYPED-refusal convention (the steer-seed increment) + the ONE LAW + the
//    mutant killers
// ---------------------------------------------------------------------------

describe('buildSolveRequest — the typed-refusal convention', () => {
  it('spine-unready on an UNSET goal — the goal precedes the solve (KILLER for mutant b: a default-goal substitution)', () => {
    // A `chosenGoal ?? "leave-more"` substitution would build a request here — it must stay refused so
    // the store's dispatchSolve routes goal-unset → the GoalPicker, never a fabricated tie-break as advice.
    const draft = { ...withGoalSeed('fl', 'leave-more'), chosenGoal: undefined }
    expect(buildSolveRequest(draft, TODAY)).toBe('spine-unready')
  })

  it('spine-unready before the shared-draw seed is minted (the spine beat mints it first)', () => {
    const { seed: _s, ...noSeed } = withGoalSeed('fl', 'leave-more')
    void _s
    expect(buildSolveRequest(noSeed as ScenarioDraft, TODAY)).toBe('spine-unready')
  })

  it('spine-unready on the DATE route — buildSpineParams is null (v1 supports the all-retired route)', () => {
    expect(buildSolveRequest(withGoalSeed('date', 'leave-more'), TODAY)).toBe('spine-unready')
  })

  it('builds a well-formed request from a retired draft; every field from its canonical producer', () => {
    const draft = withGoalSeed('fl', 'leave-more', 0xbeef)
    const req = buildSolveRequest(draft, TODAY)
    expect(typeof req).not.toBe('string')
    if (typeof req === 'string') throw new Error('unreachable')
    expect(req.tieTolerance).toBe(0) // KILLER for mutant a: a re-typed tolerance ≠ the shipped 0
    expect(req.seedA).toBe(0xbeef) // the ONE minted shared-draw CRN seed
    expect(req.todayEpochDay).toBe(TODAY) // injected clock, not read inside the engine
    expect(req.base.paths).toBe(solverMinBPaths.value) // full precision (S5 deferred)
    expect(req.ranking.goal).toBe('leave-more')
    expect(req.ranking.heirBracket).toBe(solverAssumedHeirBracket.value) // the R7 default
    expect(req.candidates.some((c) => c.conversion !== null)).toBe(true) // an anchored conversion exists
    expect(req.candidates.some((c) => c.provenance === 'conventional-baseline')).toBe(true)
  })

  /**
   * U17 §S5 — THE RECORD IS NOT PART OF THE RUN IDENTITY, and this is the only file that can prove
   * it. `memoryModel.test.ts`'s solve arms dispatch through IN-FILE fakes (`realRequest` /
   * `fingerprintSensitiveDispatch`), which ignore `savedRecommendation` BY CONSTRUCTION — an arm
   * there would witness its own fixture. Here the REAL builder runs.
   *
   * WHAT IT COSTS TO GET WRONG: the store demotes a committed solve the instant
   * `currentDraftFingerprint()` moves (`invalidateStaleSolve`), and S5's gesture puts the freshly
   * minted record ON THE DRAFT (`IntakeApp` step 6). If the builder read the record, the very act of
   * saving a strategy read would demote it — the household would tap "Keep this strategy read" and
   * watch "This strategy read is out of date" replace the thing they just saved.
   */
  it('a saved recommendation on the draft does NOT move the run identity — the save that mints one must not demote the read it describes', () => {
    const draft = withGoalSeed('fl', 'leave-more')
    // A REAL record for this same household (the `?vault=rec` plant's own doctor — the shipped mint
    // over the engine's own fingerprint producer), never a hand-typed stand-in: the point of the arm
    // is that a FULLY POPULATED record changes nothing.
    const built = scenarioFromDraft(draft)
    expect(built.ready, 'the fl draft must be save-ready').toBe(true)
    if (!built.ready) return
    const record = doctorRecordHolds(built.scenario, TODAY).savedRecommendation
    expect(record, 'the plant exists to produce a record').not.toBeUndefined()
    if (record === undefined) return

    const fpOf = (d: ScenarioDraft): string => {
      const req = buildSolveRequest(d, TODAY)
      expect(typeof req, 'both drafts must BUILD — a refusal here would prove nothing').not.toBe('string')
      if (typeof req === 'string') throw new Error('unreachable')
      return solverRunFingerprint(req.base, req.candidates, req.ranking, {
        seedA: req.seedA,
        tieTolerance: req.tieTolerance,
      })
    }
    const bare = fpOf(draft)
    const withRecord = fpOf({ ...draft, savedRecommendation: record })
    expect(withRecord, 'the record rides the draft; the RUN is unchanged').toBe(bare)

    // NON-VACUITY, both halves. (1) The record really was on the second draft and really is
    // substantial — not an `undefined` that trivially changes nothing.
    expect(record.fingerprint.length).toBeGreaterThan(200)
    expect(Object.keys(record.era)).toHaveLength(5)
    // (2) This fingerprint is not simply insensitive to the draft: a genuinely ranking-affecting
    // edit on the SAME builder moves it. Without this, the equality above could pass over a
    // constant.
    expect(fpOf({ ...draft, annualSpendingReal: draft.annualSpendingReal! + 6_000 })).not.toBe(bare)
  })

  it('pay-less-tax carries NO heir bracket (leave-more only)', () => {
    const req = buildSolveRequest(withGoalSeed('fl', 'pay-less-tax'), TODAY)
    expect(typeof req).not.toBe('string')
    if (typeof req === 'string') throw new Error('unreachable')
    expect(req.ranking.goal).toBe('pay-less-tax')
    expect(req.ranking.heirBracket).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 2. STORE INTEGRATION — the real draft → real engine arc
// ---------------------------------------------------------------------------

/** The real in-process engine (the memoryModel real-engine precedent — no worker mock). */
const realEngine = {
  ping: async () => engineApi.ping(),
  run: async (p: Parameters<typeof engineApi.run>[0], s: number, o?: Parameters<typeof engineApi.run>[2]) =>
    engineApi.run(p, s, o),
  setLatestEpoch: async (e: number) => engineApi.setLatestEpoch(e),
  runDateSearch: async (
    i: Parameters<typeof engineApi.runDateSearch>[0],
    s: number,
    t: Parameters<typeof engineApi.runDateSearch>[2],
    e: number,
  ) => engineApi.runDateSearch(i, s, t, e),
  runTwoArm: async (
    b: Parameters<typeof engineApi.runTwoArm>[0],
    s: number,
    c: Parameters<typeof engineApi.runTwoArm>[2],
  ) => engineApi.runTwoArm(b, s, c),
}

/** The full real client (arms a/b). */
const realClient: EngineClient = {
  runningInWorker: false,
  engine: { ...realEngine, runSolve: async (r) => engineApi.runSolve(r) },
}

/** Real spine/date + a CONTROLLABLE, recorded runSolve (arms c/d — the store orchestration is driven
 *  deterministically without paying a second real full solve). */
function controllableClient(): { client: EngineClient; solvePending: Array<(w: SolveWire) => void>; solveCalls: number } {
  const solvePending: Array<(w: SolveWire) => void> = []
  let solveCalls = 0
  const client: EngineClient = {
    runningInWorker: false,
    engine: {
      ...realEngine,
      runSolve: () => {
        solveCalls += 1
        return new Promise<SolveWire>((resolve) => solvePending.push(resolve))
      },
    },
  }
  return {
    client,
    solvePending,
    get solveCalls() {
      return solveCalls
    },
  } as { client: EngineClient; solvePending: Array<(w: SolveWire) => void>; solveCalls: number }
}

/** The REAL builders, with an optional base.paths/_gradeMinPaths seam for a CI-tractable live solve. */
const realBuilders = (opts?: { readonly fast?: boolean }): ParamsBuilders => ({
  buildSpineParams,
  buildDateInput,
  buildSolveDispatch: (draft) => {
    const req = buildSolveRequest(draft, TODAY)
    if (typeof req === 'string' || opts?.fast !== true) return req
    return { ...req, base: { ...req.base, paths: 256 }, _gradeMinPaths: 50 }
  },
})

describe('the live recommend-second arc — real draft → real engine', () => {
  it('the NC household commits token-withheld{state-certification-pending} (the Q5 held render)', async () => {
    const model = createMemoryModel({ client: realClient, builders: realBuilders({ fast: true }) })
    model.update(() => withGoalSeed('nc', 'leave-more'))
    await model.recompute() // the spine beat commits first (recommend-second ordering)
    await model.dispatchSolve()
    const solve = model.getSnapshot().solve
    expect(solve.kind).toBe('committed')
    if (solve.kind !== 'committed') throw new Error('unreachable')
    expect(solve.payload.kind).toBe('token-withheld')
    if (solve.payload.kind !== 'token-withheld') throw new Error('unreachable')
    expect(solve.payload.reasons).toContainEqual({ kind: 'state-certification-pending', state: 'NC' })
  }, 120_000)

  it('a priced-state (FL) household commits a real recommendation whose fingerprint EQUALS the dispatched run', async () => {
    const builders = realBuilders({ fast: true })
    const model = createMemoryModel({ client: realClient, builders })
    model.update(() => withGoalSeed('fl', 'leave-more'))
    await model.recompute()
    await model.dispatchSolve()
    const solve = model.getSnapshot().solve
    expect(solve.kind).toBe('committed')
    if (solve.kind !== 'committed') throw new Error('unreachable')
    expect(solve.payload.kind).toBe('recommended')
    // The committed arm carries the REAL run identity (wall #1 — source-bound, not a mirror): rebuild
    // the exact dispatched request through the SAME builder and fingerprint it independently.
    const req = builders.buildSolveDispatch!(model.getSnapshot().draft)
    if (typeof req === 'string') throw new Error('unreachable — the FL household builds')
    const expected = solverRunFingerprint(req.base, req.candidates, req.ranking, {
      seedA: req.seedA,
      tieTolerance: req.tieTolerance,
    })
    expect(solve.fingerprint).toBe(expected)
  }, 120_000)

  it('a fingerprint-moving edit mid-flight lands STALE, never committed-as-current (through the real builder)', async () => {
    const { client, solvePending } = controllableClient()
    const model = createMemoryModel({ client, builders: realBuilders(), mintSeed: () => 0xc0ffee })
    model.update(() => withGoalSeed('fl', 'leave-more'))
    await model.recompute() // real spine → headline → everResolved + seed minted
    const p = model.dispatchSolve() // real builder builds the request; runSolve held pending
    expect(model.getSnapshot().solve).toEqual({ kind: 'pending', label: 'solving' })
    // Edit a ranking-affecting field WHILE in flight (drop the priced state) — the run fingerprint moves.
    model.update((d) => ({ ...d, retirementState: undefined }))
    solvePending[0]!({ kind: 'refused', reason: 'bucket-precondition', detail: 'x', solverCodeVersion: 1 })
    await p
    expect(model.getSnapshot().solve).toEqual({ kind: 'stale', label: 'inputs-changed' })
  }, 60_000)

  it('recommend-second: NO dispatch before the spine beat commits (through the real builder)', async () => {
    const ctrl = controllableClient()
    const model = createMemoryModel({ client: ctrl.client, builders: realBuilders() })
    // A seeded, goal-set draft whose request BUILDS — but no spine beat has committed (everResolved false).
    model.update(() => ({ ...withGoalSeed('fl', 'leave-more', 777) }))
    await model.dispatchSolve()
    expect(ctrl.solveCalls).toBe(0) // the worker was never asked
    expect(model.getSnapshot().solve).toEqual({ kind: 'idle' }) // dormant — not blocked, not pending
  })
})
