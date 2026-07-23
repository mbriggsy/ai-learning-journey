import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryModel, type MemoryModel, type ParamsBuilders, type ScenarioDraft } from '../memoryModel'
import { openVaultDb, writeVault, clearVault } from '../db'
import type { EngineClient } from '../engineClient'
import type { DateSearchInput } from '@engine/dateSearch'
import type { DateSearchWire, SolveWire } from '@engine/engineWire'
import type { SolveRequest } from '@engine/solver/solveEntry'
import type { CandidateStrategy } from '@engine/solver/candidates'
import type { SimulationParams } from '@shared/model'

/**
 * Act-4 · U16 §S4 — THE NO-AUTO-SAVE-ON-SOLVE/RE-PICK SEAM.
 *
 * The un-saved recommendation hypothetical lives in `memoryModel` (the `solve` channel + `chosenGoal`
 * riding the draft) and is FREELY tunable/abandonable — an HONEST session-hold. It must NEVER auto-write
 * to disk: not when a solve dispatches, not when the goal is re-picked, not when the hypothetical is
 * abandoned. The v3 write ships ONLY with the explicit Save ceremony (U8/U17) — a gesture whose commit
 * doesn't persist is a lie, and a silent auto-write of an un-saved hypothetical is the inverse sin.
 *
 * Asserted against the REAL store layer (`db.ts`) on fake-indexeddb — never a stub (a stub is vacuously
 * green), the same non-vacuity control the intake no-write seam uses (`noWriteSeam.test.tsx`): the
 * planted arm proves the probe DETECTS a real write, then the solve/re-pick/abandon arms prove none fires.
 * PLANTED MUTANT (a) — an auto-save (`writeVault`/`openVaultDb`) added to `memoryModel.update` or
 * `dispatchSolve` — surfaces a database the probe flags RED here.
 */

// ---- the probe (mirrors noWriteSeam): any vault database existing at all IS a write ----------------
async function databaseNames(): Promise<string[]> {
  const dbs = await indexedDB.databases()
  return dbs.map((d) => d.name ?? '<unnamed>')
}
// A macrotask flush — so a FIRE-AND-FORGET auto-save (an async `openVaultDb`/`writeVault` launched from
// the synchronous `update()` path, whose IndexedDB open event is a macrotask) has completed before the
// probe reads. The green path writes nothing, so this changes nothing there; it only removes the timing
// escape hatch a re-pick auto-save mutant could otherwise slip through.
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

// ---- a controllable fake engine client (date-search + solve resolve on the test's release) ---------
const FAKE_DATE_INPUT = { fake: true } as unknown as DateSearchInput
const inputFailureWire = (reason: string): DateSearchWire => ({ kind: 'date-search', outcome: { kind: 'input-failure', reason } })
const refusedWire: SolveWire = { kind: 'refused', reason: 'bucket-precondition', detail: 'x', solverCodeVersion: 1 }

function fakeClient() {
  const datePending: Array<(w: DateSearchWire) => void> = []
  const solvePending: Array<(w: SolveWire) => void> = []
  const client: EngineClient = {
    runningInWorker: true,
    engine: {
      ping: async () => 'pong' as const,
      run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      setLatestEpoch: async () => {},
      runDateSearch: () => new Promise<DateSearchWire>((resolve) => datePending.push(resolve)),
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      runSolve: () => new Promise<SolveWire>((resolve) => solvePending.push(resolve)),
    },
  }
  return { client, datePending, solvePending }
}

// A real, fingerprintable solve request — solverRunFingerprint canonically serializes plain data, so a
// minimal params object + a real candidate is enough for the dispatch's fingerprint to compute for real.
const REAL_CANDIDATE: CandidateStrategy = { policy: 'proportional', conversion: null, provenance: 'conventional-baseline' }
const SOLVE_REQUEST: SolveRequest = {
  base: { paths: 64, stockWeight: 0.6 } as unknown as SimulationParams,
  candidates: [REAL_CANDIDATE],
  seedA: 7,
  ranking: { goal: 'leave-more' },
  tieTolerance: 0,
  todayEpochDay: 20_000,
}

const solveBuilders = (): ParamsBuilders => ({
  buildSpineParams: () => null,
  buildDateInput: () => FAKE_DATE_INPUT,
  // A goal-sensitive request (the fingerprint MOVES on a re-pick, so the re-pick genuinely demotes
  // the standing rec and re-dispatches — the real visible-re-solve path). Encoded via tieTolerance
  // (a ranking-affecting field solverRunFingerprint captures) to stay type-clean.
  buildSolveDispatch: (d) =>
    d.chosenGoal === undefined
      ? 'spine-unready'
      : { ...SOLVE_REQUEST, tieTolerance: d.chosenGoal === 'pay-less-tax' ? 1 : 0 },
})

const workingWithGoal = (d: ScenarioDraft): ScenarioDraft => ({
  ...d,
  chosenGoal: 'leave-more',
  people: [{ ...d.people[0], workStatus: 'working' }, { ...d.people[1], workStatus: 'retired' }],
})

/** Bring the model to a COMMITTED spine 'date' beat so `everResolved` opens the recommend-second gate. */
async function withCommittedSpine(model: MemoryModel, datePending: Array<(w: DateSearchWire) => void>): Promise<void> {
  model.update(workingWithGoal)
  const idx = datePending.length
  const spine = model.recompute()
  datePending[idx]!(inputFailureWire('spine-beat'))
  await spine
}

afterEach(async () => {
  // fake-indexeddb is a per-process global — return to the no-write baseline for the next test.
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('the-back-nine-vault')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
})

describe('U16 §S4 — no auto-save on solve / re-pick / abandon (against the REAL store layer)', () => {
  it('PLANTED CONTROL: a real write through db.ts IS detected by the probe (non-vacuous)', async () => {
    expect(await databaseNames()).toEqual([])
    const db = await openVaultDb()
    const bytes = (n: number) => new Uint8Array([n, n, n])
    await writeVault(db, {
      model: { iv: bytes(1), ciphertext: bytes(2) },
      passphraseWrap: { salt: bytes(3), iv: bytes(4), wrappedDataKey: bytes(5) },
      recoveryWrap: { salt: bytes(6), iv: bytes(7), wrappedDataKey: bytes(8) },
    })
    expect(await databaseNames(), 'the probe CAN fail').not.toEqual([])
    await clearVault(db)
    db.close()
  })

  it('a solve dispatch, a GOAL RE-PICK, and abandoning the hypothetical leave IndexedDB untouched (mutant a)', async () => {
    const { client, datePending, solvePending } = fakeClient()
    const model = createMemoryModel({ client, builders: solveBuilders() })
    expect(await databaseNames()).toEqual([])

    // The spine commit + the goal write are session-only — no disk touch.
    await withCommittedSpine(model, datePending)
    expect(model.getSnapshot().draft.chosenGoal).toBe('leave-more')
    expect(await databaseNames(), 'the spine beat + goal write wrote nothing').toEqual([])

    // THE SOLVE: dispatch → commit. The un-saved hypothetical commits to the session channel only.
    const solve1 = model.dispatchSolve()
    solvePending[0]!(refusedWire)
    await solve1
    expect(model.getSnapshot().solve.kind).toBe('committed')
    expect(await databaseNames(), 'dispatching + committing a solve wrote nothing').toEqual([])

    // THE RE-PICK: write a new goal (update) + re-dispatch. The classic "helpful auto-save" mutant
    // hooks either the draft mutation or the dispatch — both are exercised here; both must stay dry.
    model.update((d) => ({ ...d, chosenGoal: 'pay-less-tax' }))
    expect(model.getSnapshot().solve.kind, 'the re-pick demotes the standing rec (the visible re-solve setup)').toBe('stale')
    await flush()
    expect(await databaseNames(), 'the re-pick draft mutation wrote nothing').toEqual([])
    const solve2 = model.dispatchSolve()
    solvePending[1]!(refusedWire)
    await solve2
    expect(model.getSnapshot().solve.kind).toBe('committed')
    expect(await databaseNames(), 're-dispatching after a re-pick wrote nothing').toEqual([])

    // ABANDON: a further edit that invalidates the committed rec, then simply walk away — the honest
    // session-hold is freely abandonable, never auto-committed to disk.
    model.update((d) => ({ ...d, chosenGoal: undefined }))
    expect(model.getSnapshot().solve.kind, 'the committed rec demotes, never persists').toBe('stale')
    await flush()
    expect(await databaseNames(), 'abandoning the hypothetical wrote nothing').toEqual([])
  })
})
