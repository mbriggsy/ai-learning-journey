// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Act-4 · U17 §S5 — THE UI HALF OF THE NO-AUTO-WRITE LAW.
 *
 * `src/store/__tests__/solveNoAutoSave.test.ts` owns the STORE half: a solve dispatch, a goal re-pick
 * and an abandoned hypothetical never write. This file is its COMPLEMENT at the seam one layer up, and
 * the two do not overlap: nothing IntakeApp does — no mount, no render, no recompute, no solve COMMIT
 * reaching the screen, no draft edit — may write a recommendation record. Saving stays an explicit
 * gesture, and `solveNoAutoSave.test.ts` is left byte-unchanged.
 *
 * WHY THIS FILE EXISTS AS A `.tsx` HERE RATHER THAN AS ARMS THERE: the store seam test runs in NODE (no
 * `@vitest-environment` docblock), and `src/store/__tests__/` holds no `.tsx` at all. Landing a
 * `@ui/IntakeApp` mount there would force a rename plus a docblock that silently changes the runtime of
 * that file's TWO existing arms — including its `indexedDB.databases()` probe and its macrotask flush,
 * both load-bearing. *(Corrected 2026-07-31: this said "nine existing arms". `solveNoAutoSave.test.ts`
 * has two `it(`s — a planted control and one sweep. The nine counted FILES in `src/store/__tests__/`,
 * via `act4-u17-s5-execution-plan.md:128`, and the miscount made that file's coverage look ~4× deeper
 * than it is. Its macrotask flush is ONE turn, which is its own filed defect — see TODO.md.)*
 *
 * THE MUTANT IT KILLS: a `useEffect` in IntakeApp that mints (or re-enters the gesture) on
 * `solve.kind === 'committed'`. A silent auto-write of an un-saved hypothetical leaves the ENTIRE
 * existing suite green — the record it writes is structurally valid, the badge it produces is
 * disk-derived and therefore "honest", and no other test looks at the disk from this layer. What it
 * breaks is consent: the household is told their strategy read was kept without ever asking for it, and
 * on the ceremony route it would drag them into a vault setup they never requested.
 *
 * TWO PROBES, EACH WITH ITS OWN NON-VACUITY CONTROL (burned/070 — a sweep that can silently no-op
 * manufactures false confidence):
 *   1. THE DISK. `indexedDB.databases()` against the REAL `db.ts` on fake-indexeddb — never a stub. The
 *      vault session is deliberately NOT mocked, so the app's only door to IndexedDB stays real; the
 *      planted-write arm proves the probe CAN fail, and the tap arm proves the app can reach it.
 *   2. THE MINT. `mintSavedRecommendation` is module-mocked around the REAL implementation, so the spy
 *      fires only if IntakeApp itself calls it (insight 032/081 — a test that calls the shared function
 *      proves the function, never the call site).
 * The engine CLIENT is the only fake: the store's own dispatch/commit path runs for real over it, so the
 * committed recommendation the sweep renders is a genuine `commitSolve`, not a planted snapshot.
 */

// The wires the fake worker returns. `vi.hoisted` because the mock factory below is hoisted above every
// import — a top-level binding referenced inside it would be in TDZ when the factory first runs.
const wires = vi.hoisted(() => ({
  date: null as unknown,
  run: null as unknown,
  solve: null as unknown,
}))

vi.mock('@store/engineClient', () => ({
  engineClient: {
    runningInWorker: false,
    reset: () => {},
    engine: {
      ping: async () => 'pong' as const,
      run: async () => wires.run,
      setLatestEpoch: async () => {},
      runDateSearch: async () => wires.date,
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      runSolve: async () => wires.solve,
    },
  },
}))

// The REAL mint, wrapped. Spying the module IntakeApp imports is what makes the silence below a
// statement about IntakeApp rather than about the mint.
vi.mock('@store/savedRecommendationMint', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@store/savedRecommendationMint')>()
  return { ...actual, mintSavedRecommendation: vi.fn(actual.mintSavedRecommendation) }
})

import IntakeApp from '../IntakeApp'
import { appModel } from '../appModel'
import { copy } from '../copy'
import { resolveDevSeed } from '../devSeeds'
import { openVaultDb, writeVault, clearVault } from '@store/db'
import { mintSavedRecommendation } from '@store/savedRecommendationMint'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import { NEVER_DEPLETED, type Distribution } from '@shared/model'
import type { DateSearchWire, EngineWire, SolveArmWire, SolveWire } from '@engine/engineWire'

const mint = vi.mocked(mintSavedRecommendation)

vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

// ---- the probe (mirrors noWriteSeam / solveNoAutoSave): any vault database existing at all IS a write,
//      because the vault DB is created on first open-for-write and nothing else in this app opens one --
async function databaseNames(): Promise<string[]> {
  const dbs = await indexedDB.databases()
  return dbs.map((d) => d.name ?? '<unnamed>')
}

/**
 * THE FLUSH BUDGET, AND WHY IT IS ONE NUMBER SHARED BY BOTH DIRECTIONS.
 *
 * A write launched from a render is fire-and-forget: a dynamic `import()`, then `openVaultDb()`, whose
 * IndexedDB open event lands several MACROTASKS later. A probe that reads too early sees an empty
 * database list and calls it a refusal — the silent no-op burned/070 warns about. So the negative arms
 * cannot pick their own budget: they use exactly this one, and the TAP arm is what proves the budget
 * is long enough for a real write path to complete inside it.
 *
 * 30 → 60, AND THE TAP ARM NO LONGER TRUSTS THE NUMBER (2026-07-27, CI run 30277757106). The chain
 * measures 7-9 turns on Windows, so 30 looked like 3x margin — and ubuntu still red the tap arm at
 * zero mints inside it. Under a 3163-test parallel run the macrotask turns are starved by CPU
 * contention, which is the same shape this repo already files against its heavy engine battery; a
 * budget calibrated on one machine is a race on another (burned/055 — a green local run is not
 * proof). So the tap arm now POLLS to a 4x ceiling and asserts the measured cost against this
 * constant, which turns the sweep's soundness from an assumption into a per-run measurement: if the
 * chain ever outgrows what the sweep waits, the tap arm reds loudly instead of the sweep going
 * quietly vacuous.
 *
 * WHY 60 AND NOT MORE: each round pays a full `act()`, ~8ms. At 150 the lifecycle arm blew vitest's
 * 5s default outright. 60 keeps ~7x margin over the measured cost while the three settle-heavy arms
 * carry an explicit `30_000` timeout — the repo's documented idiom for an arm whose local runtime
 * nears the default (CI runs slower, and this file burns its turns serially).
 */
const FLUSH_ROUNDS = 60

/** Let React's effects, the dynamic imports (`devSeeds`, `vaultSession`) and any fire-and-forget
 *  IndexedDB open complete before a probe reads. Macrotask turns, not microtask flushes. */
async function settle(rounds = FLUSH_ROUNDS): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 0))
    })
  }
}

// ---- the fake worker's returns -----------------------------------------------------------------

/** An input-failure date sweep — the LIGHTEST REAL spine commit (memoryModel's own test convention):
 *  it commits a `date` answer, which is what flips `everResolved` and opens the recommend-second
 *  dispatch gate. The household is flipped to the all-retired route immediately afterwards. */
const DATE_WIRE: DateSearchWire = {
  kind: 'date-search',
  outcome: { kind: 'input-failure', reason: 'spine-beat' },
}
/** The spine headline the all-retired route then asks for. A calm error is a committed answer the
 *  result screen renders through its fallback strip — enough to seat the whole actions chain (the
 *  recommendation surface gates on the route, not on the headline). */
const RUN_WIRE: EngineWire = { kind: 'calm-error', reason: 'unused' }

const HEIR_BRACKET = 0.24

/** A two-path seed-B distribution carrying the tax overlay — `leave-more` reads the after-tax-to-heirs
 *  lens, and an arm without `taxAware` fails LOUD (burned/062, no silent default). The save view reads
 *  no figures, so the shape is what matters. */
function distShell(): Distribution {
  const z = [0, 0]
  return {
    terminalValuesReal: z,
    depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED],
    survivalFraction: 1,
    taxAware: {
      lifetimeTaxPaidReal: z,
      terminalTaxableReal: z,
      terminalPretaxReal: z,
      terminalRothReal: z,
      terminalHsaReal: z,
      terminalTaxableBasisReal: z,
      lifetimeNetPremiumReal: z,
      lifetimeMedicareCostReal: z,
    },
  }
}

const f64 = (xs: readonly number[]) => Float64Array.from(xs)

/** One displayed arm in wire form. Its DISPLAYED figure comes from the guard's OWN producer
 *  (`headlineStatisticFromDistribution`), never a hand-typed number: the render path re-derives the
 *  statistic from each arm's distribution and degrades the whole beat to `unavailable` on any
 *  disagreement (objective≡headline, burned/070) — a fixture that typed its own figure would silently
 *  render the wrong beat and take the save control off screen with it. */
const armWire = (id: string): SolveArmWire => {
  const dist = distShell()
  const ta = dist.taxAware!
  return {
    id,
    policy: 'taxable-first',
    conversion: null,
    headlineStatisticB: headlineStatisticFromDistribution(dist, 'leave-more', HEIR_BRACKET),
    survivalB: 0.99,
    terminalValuesReal: f64(dist.terminalValuesReal),
    depletionYears: Int32Array.from(dist.depletionYears),
    survivalFraction: dist.survivalFraction,
    taxAware: {
      lifetimeTaxPaidReal: f64(ta.lifetimeTaxPaidReal),
      terminalTaxableReal: f64(ta.terminalTaxableReal),
      terminalPretaxReal: f64(ta.terminalPretaxReal),
      terminalRothReal: f64(ta.terminalRothReal),
      terminalHsaReal: f64(ta.terminalHsaReal),
      terminalTaxableBasisReal: f64(ta.terminalTaxableBasisReal),
      lifetimeNetPremiumReal: f64(ta.lifetimeNetPremiumReal),
      lifetimeMedicareCostReal: f64(ta.lifetimeMedicareCostReal),
    },
  }
}

/** A crowned recommendation in wire form — the shape `runSolve` returns and `solveFromWire` unpacks, so
 *  `commitSolve` lands a REAL committed payload with a REAL run fingerprint. Winner and baseline share a
 *  seed-B statistic, so the composed view takes its honest no-dollar register: no fabricated delta, and
 *  no lazy viz chunk for a write-seam test to wait on. */
const SOLVE_WIRE: SolveWire = {
  kind: 'recommended',
  goal: 'leave-more',
  heirBracket: HEIR_BRACKET,
  seedA: 1,
  seedB: 2,
  winner: armWire('baseline:taxable-first:0'),
  runnerUp: armWire('baseline:proportional:0'),
  noActionBaseline: armWire('baseline:proportional:0'),
  rankedIds: ['baseline:taxable-first:0', 'baseline:proportional:0'],
  prunedScores: [],
  noChange: false,
  surplusRegime: false,
  grade: undefined,
  gradeStatistic: 'leave-more',
  gradeUnavailable: undefined,
  namedDriver: 'sampling-noise-near-tie',
  skewDisclosure: undefined,
  deltaSkew: undefined,
  withheldConversionLevers: [],
  disclosedDirectional: [],
  solverCodeVersion: SOLVER_CODE_VERSION,
}

/**
 * Drive the REAL app to the frame the law is about: an all-retired household on the result screen with a
 * COMMITTED recommendation on the surface and an offered save control.
 *
 * `?seed=` is the mount path (it runs IntakeApp's own apply → result → provisional → final chain, so no
 * flow stub is needed). The date seed is used only to land the spine beat; the household is then flipped
 * to the all-retired route the v1 recommend-second supports, keeping the CRN seed the beat minted.
 */
async function landCommittedRecommendation(): Promise<ReturnType<typeof render>> {
  const view = render(<IntakeApp seed="date" />)
  await settle()
  await act(async () => {
    appModel.update((d) => ({ ...resolveDevSeed('fl')!, seed: d.seed, chosenGoal: 'leave-more' }))
    await appModel.recompute('final')
  })
  await act(async () => {
    await appModel.dispatchSolve()
  })
  return view
}

const saveCta = () => screen.queryByRole('button', { name: copy.recommendSaveCta })

beforeEach(async () => {
  wires.date = DATE_WIRE
  wires.run = RUN_WIRE
  wires.solve = SOLVE_WIRE
  mint.mockClear()
  // RESOLVE THE CHUNK BEFORE THE WINDOW OPENS — the repair for CI run 30599862965, where the tap
  // measured 63 turns against a 60-turn sweep and the whole no-auto-write law went vacuous for that
  // run. The budget is denominated in MACROTASK TURNS while the dominant stage in the timed window is
  // WALL-CLOCK: the gesture's cold `import('./vaultSession')` pulls the crypto/KDF graph
  // (@store/session → ../crypto/*, @store/backup). No turn count is portable across machines while
  // that import sits inside the window, so the fix is to take it OUT of the window rather than to
  // raise the constant — which the landmine forbids, and which at 150 blew vitest's default outright.
  //
  // THE FILED REASON THIS WAS "NOT AVAILABLE" IS FALSE, and that is why it went unfixed for two
  // cycles. It read: "warming the session would create the database." It does not. `vaultSession.ts`
  // declares `dbPromise`/`sessionPromise` at :19-20 as BARE, uninitialized bindings — the open happens
  // in `getDb()` (:23-25), never at module scope — and neither `@store/db`, `@store/session` nor
  // `@store/backup` runs an executable statement at module scope (session's `new BroadcastChannel`
  // is INSIDE `createSession`, :261). This file already relied on that fact before this change:
  // `openVaultDb` is a STATIC import at the top, and the planted control asserts an EMPTY database
  // list and only THEN calls it. Every arm below re-proves it as its first line, so a warm that did
  // create a database would fail loudly here rather than be tolerated.
  //
  // This strictly IMPROVES mutant-catching: every arm now faces the identical WARM chain, so a
  // planted auto-write can no longer hide behind a cold import that the sweep never waited out.
  await import('../vaultSession')
})

afterEach(async () => {
  cleanup()
  // fake-indexeddb is a per-process global — return to the no-write baseline for the next arm. The
  // TAP arm leaves `vaultSession`'s memoized connection OPEN (that module opens the DB at most once
  // per realm and exposes no close), so a delete issued after it is BLOCKED and never settles: the
  // race is what keeps the hook from hanging. Safe because that arm is the LAST one to touch
  // IndexedDB, and every arm that cares re-asserts the empty baseline as its first line — a leaked
  // database fails loudly there rather than being silently tolerated.
  await Promise.race([
    new Promise<void>((done) => {
      const req = indexedDB.deleteDatabase('the-back-nine-vault')
      req.onsuccess = () => done()
      req.onerror = () => done()
      req.onblocked = () => done()
    }),
    new Promise<void>((done) => setTimeout(done, 300)),
  ])
})

describe('U17 §S5 — no render, mount, recompute, solve commit or draft edit ever writes a record', () => {
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
  }, 30_000)

  it('the whole lifecycle — mount, the spine beat, a COMMITTED recommendation, a re-render, a draft edit, a re-solve — mints nothing and opens no vault', async () => {
    expect(await databaseNames()).toEqual([])
    const { rerender } = await landCommittedRecommendation()

    // NON-VACUITY, both halves. The store really reached the committed beat (so a `solve.kind ===
    // 'committed'` effect would have fired), AND the control that CAN write is rendered and reachable
    // (so the silence below is a refusal to write, not an absent surface).
    expect(appModel.getSnapshot().solve.kind, 'the store committed a real recommendation').toBe('committed')
    expect(saveCta(), 'the save control is offered on this frame').toBeInTheDocument()

    await settle()
    expect(mint, 'mounting and committing a recommendation mints no record').not.toHaveBeenCalled()
    expect(await databaseNames(), 'and no vault database exists at all').toEqual([])

    // A bare RE-RENDER of the same committed frame (the cheapest place an auto-write effect hides).
    await act(async () => {
      rerender(<IntakeApp seed="date" />)
    })
    await settle()
    expect(mint, 'a re-render of the committed frame mints nothing').not.toHaveBeenCalled()
    expect(await databaseNames()).toEqual([])

    // A DRAFT EDIT — the commit-on-blur shape. It demotes the committed rec to `stale` and repaints the
    // whole surface; the "helpful auto-save before we lose it" mutant hooks exactly here.
    await act(async () => {
      appModel.update((d) => ({ ...d, annualSpendingReal: (d.annualSpendingReal ?? 0) + 1000 }))
    })
    expect(appModel.getSnapshot().solve.kind, 'the edit demoted the standing rec').toBe('stale')
    await settle()
    expect(mint, 'a draft edit mints nothing').not.toHaveBeenCalled()
    expect(await databaseNames(), 'and writes nothing').toEqual([])

    // A RE-SOLVE back to committed. The second entry into `committed` matters on its own: an effect keyed
    // on the transition fires on EVERY entry, not only the first, and a first-entry-only assertion would
    // miss a mutant that guards itself with a ref.
    await act(async () => {
      await appModel.dispatchSolve()
    })
    expect(appModel.getSnapshot().solve.kind).toBe('committed')
    expect(saveCta(), 'the control is offered again — still un-tapped').toBeInTheDocument()
    await settle()
    expect(mint, 're-entering the committed beat mints nothing').not.toHaveBeenCalled()
    expect(await databaseNames(), 'the whole lifecycle left IndexedDB untouched').toEqual([])
  }, 30_000)

  it('CONTROL: the TAP the sweep withheld reaches the mint and the REAL vault session (the silence above is a refusal, not an absent door)', async () => {
    expect(await databaseNames()).toEqual([])
    await landCommittedRecommendation()
    const cta = saveCta()
    expect(cta).toBeInTheDocument()
    expect(mint).not.toHaveBeenCalled()

    fireEvent.click(cta!)

    // MEASURE the chain instead of assuming it. A fixed `settle()` here was CI-only RED (ubuntu,
    // run 30277757106) while Windows ran green: the gesture's cold `import('./vaultSession')` →
    // `openVaultDb()` chain is environment-timed, so a turn budget picked on one machine is a race
    // on another (burden/055 — a green local run is not proof). Bumping FLUSH_ROUNDS would only move
    // the threshold; the wait is inherently racy, so the arm now polls to a bounded ceiling.
    //
    // ⚠️ THIS COMMENT USED TO SAY pre-warming was "NOT available as a fix … warming the session would
    // create the database." THAT WAS FALSE, and believing it cost this arm a second CI red (run
    // 30599862965: 63 turns against a 60-turn sweep). Importing `vaultSession` resolves a MODULE; it
    // opens nothing — see the beforeEach above for the source proof. The warm now happens there, so
    // what this loop measures is the residual chain, not the chunk resolution.
    //
    // The poll STAYS. It is the certificate, not the workaround: it converts the sweep's soundness
    // from an assumption into a per-run measurement, and it must keep doing so on machines slower
    // than any we have measured.
    let turns = 0
    const CEILING = FLUSH_ROUNDS * 4
    while (mint.mock.calls.length === 0 && turns < CEILING) {
      await act(async () => {
        await new Promise<void>((r) => setTimeout(r, 0))
      })
      turns++
    }

    // The gesture — and ONLY the gesture — mints. Once: a tap is one record, never a retry storm.
    expect(mint, 'the explicit gesture mints exactly once').toHaveBeenCalledTimes(1)
    // AND THE SYMMETRY THAT KEEPS THE SWEEP HONEST, now measured rather than asserted. The sweep
    // above flushes exactly FLUSH_ROUNDS turns and concludes from silence that nothing mints. That
    // conclusion is only sound if the door would have OPENED inside that budget — so this records
    // what the chain actually cost on THIS machine and fails if it exceeds what the sweep waits.
    // The day the chain outgrows the sweep, this reds loudly instead of the sweep going quietly
    // vacuous, which is the failure mode a fixed budget on both sides could never surface.
    expect(
      turns,
      `the mint landed in ${turns} turns; the sweep concludes from silence after ${FLUSH_ROUNDS}`,
    ).toBeLessThanOrEqual(FLUSH_ROUNDS)
    // …carrying the identity of the run ON SCREEN, read off the live snapshot rather than re-typed (a
    // hand-typed expected value would make the bind tautological). SCOPE, stated honestly: this kills a
    // mint handed the WRONG value, NOT the committed-vs-fresh-fingerprint distinction — the two are
    // equal at the mint by construction (savedRecommendationMint's own @param note), and the frame where
    // they diverge is unreachable from here because the store demotes a committed solve to `stale` on the
    // very edit that would separate them, and the gesture returns on a non-committed solve. That
    // distinction is the mint unit's to own.
    const live = appModel.getSnapshot().solve
    expect(live.kind).toBe('committed')
    expect(mint.mock.calls[0]?.[1], 'the record is minted against the run on screen').toBe(
      live.kind === 'committed' ? live.fingerprint : undefined,
    )
    // …and it really travels the UNMOCKED vault-session door to IndexedDB. Without this the sweep's
    // empty-database assertions would be green for a household that simply has no way to reach disk.
    expect(
      await databaseNames(),
      'the tap opens the real vault DB — the probe above was watching a live door',
    ).not.toEqual([])
  }, 30_000)

  it('SOURCE-BIND: the mint and the gesture each have exactly ONE call site, and it is the tap (insight 032/081)', () => {
    // The sweep can only speak for the frames it drives. This arm covers the rest of them: the named
    // mutant — a `useEffect` that mints, or re-enters the gesture, on `solve.kind === 'committed'` — adds
    // a call site WHEREVER it is placed. Comments are stripped first: the gesture's own doc names
    // `void saveRecommendation(…)` when explaining the unhandled-rejection arm, and a count that
    // included prose would be pinning the prose.
    const src = readFileSync(resolve(__dirname, '../IntakeApp.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(src.match(/mintSavedRecommendation\(/g) ?? [], 'the mint has exactly one caller').toHaveLength(1)
    expect(src.match(/saveRecommendation\(/g) ?? [], 'the gesture has exactly one caller').toHaveLength(1)
    // And that one caller is the user's TAP — the Result prop, never an effect.
    expect(src).toContain('onSave: (ticket) => void saveRecommendation(ticket)')
    // The mint's single call site sits INSIDE the gesture, not above it in something that merely happens
    // to be the file's only other caller.
    expect(src.indexOf('mintSavedRecommendation(')).toBeGreaterThan(
      src.indexOf('const saveRecommendation = useCallback('),
    )
    // `saveNow()` deliberately is NOT counted here: an auto-call of the plan rail's writer opens the
    // vault and attempts a real write, which the DISK probe above catches on its own.
  })
})
