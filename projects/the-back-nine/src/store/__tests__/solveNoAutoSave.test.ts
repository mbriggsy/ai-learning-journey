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
 * `dispatchSolve` — surfaces a database the probe flags RED here. **VERIFIED BY PLANTING IT
 * 2026-07-31**, not merely asserted: a fire-and-forget open+write in `update()` now reds this file at
 * the FIRST conclusion. Before the budget below was measured it escaped that checkpoint entirely.
 */

// ---- the probe (mirrors noWriteSeam): any vault database existing at all IS a write ----------------
async function databaseNames(): Promise<string[]> {
  const dbs = await indexedDB.databases()
  return dbs.map((d) => d.name ?? '<unnamed>')
}
/**
 * THE SILENCE BUDGET — and it is MEASURED here, never assumed.
 *
 * ⚠️ THIS USED TO BE A SINGLE `setTimeout(0)` named `flush()`, under a comment claiming a
 * FIRE-AND-FORGET auto-save "has completed before the probe reads." STATED PRECISELY, because the
 * first draft of this note overstated it and the measurement is the point:
 *   - the planted chain measures **1 turn** here, so the old `flush()` bought EXACTLY ZERO margin
 *     where it was used at all — the "calibrated on one machine is a race on another" trap in its
 *     purest form (the UI sibling went 7-9 turns locally to 63 on a contended runner);
 *   - and THREE of the conclusions below spent no turns at all. That was not theoretical: with the
 *     first `settle()` removed and a real auto-save planted in `memoryModel.update`, checkpoint 1
 *     **passes while the write is in flight** and the mutant is only caught two checkpoints later.
 *     A mutant that fired only on the spine-beat path would have escaped the file entirely.
 *   - above all, NOTHING here ever measured the chain, so every arm's budget was an assumption.
 *
 * That is insight 104's exact shape, and this file had the half that cannot self-report: the sibling
 * `recSaveNoAutoWrite.test.tsx` at least owns a control that MEASURES what its sweep assumes; this one
 * owned only a control proving the probe can see an ALREADY-AWAITED write — which is not the question.
 * A negative sweep and its non-vacuity control must never share an unmeasured budget.
 *
 * So: a real budget, and a control that plants the exact chain mutant (a) would incur and asserts its
 * MEASURED cost against this constant. If the chain ever outgrows what the sweep waits, that control
 * reds loudly instead of the whole file going quietly vacuous.
 *
 * NOTE the unit differs from the sibling's: this file runs in NODE with no React, so a turn is a bare
 * macrotask and costs no `act()`. The turns are cheap; there is no reason to be stingy with them.
 */
const FLUSH_ROUNDS = 30

/** Macrotask turns — the window in which a fire-and-forget `openVaultDb`/`writeVault` launched from a
 *  synchronous `update()` / `dispatchSolve()` path must become visible to the probe. */
async function settle(rounds = FLUSH_ROUNDS): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise<void>((r) => setTimeout(r, 0))
  }
}

/** The planted payload — one shape, used by BOTH controls so they measure the same chain. */
const PLANT_BYTES = (n: number): Uint8Array => new Uint8Array([n, n, n])
const PLANT_RECORD = {
  model: { iv: PLANT_BYTES(1), ciphertext: PLANT_BYTES(2) },
  passphraseWrap: { salt: PLANT_BYTES(3), iv: PLANT_BYTES(4), wrappedDataKey: PLANT_BYTES(5) },
  recoveryWrap: { salt: PLANT_BYTES(6), iv: PLANT_BYTES(7), wrappedDataKey: PLANT_BYTES(8) },
}

// ---- a controllable fake engine client (date-search + solve resolve on the test's release) ---------
const FAKE_DATE_INPUT = { fake: true } as unknown as DateSearchInput
const inputFailureWire = (reason: string): DateSearchWire => ({ kind: 'date-search', outcome: { kind: 'input-failure', reason } })
const refusedWire: SolveWire = { kind: 'refused', reason: 'bucket-precondition', detail: 'x', solverCodeVersion: 1 }

function fakeClient() {
  const datePending: Array<(w: DateSearchWire) => void> = []
  const solvePending: Array<(w: SolveWire) => void> = []
  const client: EngineClient = {
    runningInWorker: true,
    reset: () => {},
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
  it('PLANTED CONTROL (DETECTION): a real, fully-AWAITED write through db.ts IS visible to the probe', async () => {
    expect(await databaseNames()).toEqual([])
    const db = await openVaultDb()
    await writeVault(db, PLANT_RECORD)
    expect(await databaseNames(), 'the probe CAN fail').not.toEqual([])
    await clearVault(db)
    db.close()
    // SCOPE, STATED HONESTLY: this proves the INSTRUMENT works on a write that has already landed. It
    // says nothing about whether a write STARTED by the code under test would have landed before the
    // sweep read the probe. That is a different question, and it is the one that actually decides
    // whether the negative arms below mean anything — see the measured control immediately after.
  })

  it('MEASURED CONTROL (TIMING): a FIRE-AND-FORGET write lands INSIDE the budget the sweep waits — so the silence below is a refusal, not a slow chain', async () => {
    expect(await databaseNames()).toEqual([])

    // Launch EXACTLY the chain this file's header names as mutant (a) — `openVaultDb` + `writeVault`
    // reached from a synchronous path and NEVER awaited by the caller. A real auto-save in
    // `memoryModel.update` / `dispatchSolve` would incur precisely this and nothing more (memoryModel
    // is statically imported, so unlike the UI sibling there is no chunk resolution to pay for).
    const plantedWrite = (async () => {
      const db = await openVaultDb()
      await writeVault(db, PLANT_RECORD)
      return db
    })()

    let turns = 0
    const CEILING = FLUSH_ROUNDS * 4
    while ((await databaseNames()).length === 0 && turns < CEILING) {
      await new Promise<void>((r) => setTimeout(r, 0))
      turns++
    }

    expect(await databaseNames(), 'the planted write must actually become visible').not.toEqual([])
    // THE CERTIFICATE. Every arm below concludes from FLUSH_ROUNDS turns of silence that nothing was
    // written. That conclusion is sound only if a write would have SURFACED inside that budget, so
    // this records what the chain cost on THIS machine and fails if it exceeds what the sweep waits.
    // The day the chain outgrows the budget, this reds by name instead of the sweep going quietly
    // vacuous — the failure mode a fixed budget on both sides can never surface.
    expect(
      turns,
      `the fire-and-forget write landed in ${turns} turns; every sweep below concludes from silence after ${FLUSH_ROUNDS}`,
    ).toBeLessThanOrEqual(FLUSH_ROUNDS)

    const db = await plantedWrite
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
    await settle()
    expect(await databaseNames(), 'the spine beat + goal write wrote nothing').toEqual([])

    // THE SOLVE: dispatch → commit. The un-saved hypothetical commits to the session channel only.
    const solve1 = model.dispatchSolve()
    solvePending[0]!(refusedWire)
    await solve1
    expect(model.getSnapshot().solve.kind).toBe('committed')
    await settle()
    expect(await databaseNames(), 'dispatching + committing a solve wrote nothing').toEqual([])

    // THE RE-PICK: write a new goal (update) + re-dispatch. The classic "helpful auto-save" mutant
    // hooks either the draft mutation or the dispatch — both are exercised here; both must stay dry.
    model.update((d) => ({ ...d, chosenGoal: 'pay-less-tax' }))
    expect(model.getSnapshot().solve.kind, 'the re-pick demotes the standing rec (the visible re-solve setup)').toBe('stale')
    await settle()
    expect(await databaseNames(), 'the re-pick draft mutation wrote nothing').toEqual([])
    const solve2 = model.dispatchSolve()
    solvePending[1]!(refusedWire)
    await solve2
    expect(model.getSnapshot().solve.kind).toBe('committed')
    await settle()
    expect(await databaseNames(), 're-dispatching after a re-pick wrote nothing').toEqual([])

    // ABANDON: a further edit that invalidates the committed rec, then simply walk away — the honest
    // session-hold is freely abandonable, never auto-committed to disk.
    model.update((d) => ({ ...d, chosenGoal: undefined }))
    expect(model.getSnapshot().solve.kind, 'the committed rec demotes, never persists').toBe('stale')
    await settle()
    expect(await databaseNames(), 'abandoning the hypothetical wrote nothing').toEqual([])
  })
})
