// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Act-4 · U17 §S5 — THE SAVE GESTURE AT THE COMPONENT: the REAL `IntakeApp` over the REAL
 * `Result` → `RecommendationSurface` chain, with nothing stubbed in between.
 *
 * WHY THIS FILE EXISTS AT ALL (insights 032/081). Every OTHER battery in this feature proves a
 * FUNCTION: `recommendationSaveView.test.ts` drives `deriveRecommendationSave` over a hand-built
 * input table, `savedRecommendationMint.test.ts` drives the mint over hand-built payloads,
 * `RecommendationSurface.test.tsx` drives the surface over hand-built props. Not one of them can
 * witness the COMPOSITION — and the composition is where this feature's whole honesty argument
 * lives: an ORDER (validate, probe, only then touch the store), a ROUTE (no vault ⇒ the ceremony),
 * and an OPERAND (the disk, never the draft). The two existing IntakeApp mounts cannot host any of
 * it: `IntakeApp.test.tsx` module-mocks `'../Result'` to a props-echo stub, and `App.test.tsx`
 * mocks `'../IntakeApp'` outright.
 *
 * THE HARNESS, AND WHY EACH SEAM IS FAKED THE WAY IT IS:
 *  - `'../vaultSession'` is module-mocked (IntakeApp.test.tsx's fake-session idiom) — it is the ONE
 *    injection seam this gesture has. `saveNow` is a `useCallback` local to IntakeApp with no prop,
 *    so "stub the write" can only mean "stub the session the write goes through".
 *  - the SOLVE and ANSWER channels are planted by WRAPPING `appModel.getSnapshot` (the
 *    recommendInvite idiom): both resolve only through the real worker, and Result withholds the
 *    whole actions row — where this surface mounts — while the answer is unresolved. The DRAFT is
 *    deliberately NOT faked: it flows from the real store, so every `appModel.update` this gesture
 *    makes (and every one it must NOT make) is observable on the real singleton.
 *  - `SaveFlow` and `IntakeFlow` are stubbed to their controls only (the ceremony's crypto/zxcvbn
 *    graph and the intake questions are not what is under test here).
 *
 * Everything else — the mint, the codec round-trip in the save gate, the store's trichotomy, the
 * view machine, the copy register, the render — is REAL.
 */

const h = vi.hoisted(() => ({
  /** What `session.status()` answers ON THE TAP. A fresh, never-saved session really does report
   *  'locked' (session.ts:216), which is what keeps R1's ceremony route live on the no-vault path. */
  status: 'locked' as 'locked' | 'unlocked' | 'recovery-unlocked',
  /** What the ONE write producer answers. */
  saveResult: { ok: true } as
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: 'not-writable' }
    | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string },
  /** Every scenario that actually reached `session.save` — the disk's own witness list. A gesture
   *  that refuses before the write leaves this EMPTY, and that is the assertion. */
  saved: [] as unknown[],
  /** The vault the decrypt-on-return path hands back. */
  model: null as unknown,
  /** THE PLANTED SAVE-GATE DROP — armed by one arm only (see the probe arm's header). */
  dropRecordAtom: false,
}))

vi.mock('../vaultSession', () => ({
  getVaultSession: async () => ({
    status: () => h.status,
    save: async (scenario: unknown) => {
      h.saved.push(scenario)
      return h.saveResult
    },
    currentModel: () => h.model,
    hasBackupRecord: async () => true,
  }),
}))

/**
 * THE PLANTED SAVE-GATE DROP, and why it has to be planted.
 *
 * `probe.droppedAtoms.length > 0` is UNREACHABLE from a live mint BY CONSTRUCTION — that is the
 * entire point of `mintSavedRecommendation`'s own gate, which runs the SAME
 * `checkSavedRecommendationV3` the codec runs, so a record this probe could drop can never get past
 * the mint. But a declared refusal with no producer is the dead arm insight 100 forbids, and the
 * ORDER it guards (probe BEFORE the store write) is the data-loss case `scenarioCodec.ts:660-664`
 * names. So it is witnessed with the planted-seam idiom this repo already uses for the
 * broken-trichotomy split (`recommendationSaveView.test.ts`): passthrough everywhere, and one extra
 * atom reported ONLY for a record-bearing candidate, ONLY while armed. The paired control inside
 * the arm disarms it and re-taps, so a green refusal cannot be the harness refusing everything.
 */
vi.mock('../scenarioFromDraft', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../scenarioFromDraft')>()
  return {
    ...actual,
    scenarioFromDraft: (draft: Parameters<typeof actual.scenarioFromDraft>[0]) => {
      const out = actual.scenarioFromDraft(draft)
      return h.dropRecordAtom && out.ready && draft.savedRecommendation !== undefined
        ? { ...out, droppedAtoms: [...out.droppedAtoms, 'savedRecommendation: planted drop'] }
        : out
    },
  }
})

/** Spy-able without changing behaviour — the zero-work arm counts its calls. */
vi.mock('../stalenessExposure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../stalenessExposure')>()
  return { ...actual, exposureForDraft: vi.fn(actual.exposureForDraft) }
})

/** The ceremony, reduced to its two exits + ONE fact about what it was handed: does the scenario it
 *  would commit CARRY the record? (insight 066 — echo the prop the arm asserts, never a marker that
 *  swallows it.) */
vi.mock('../SaveFlow', () => ({
  SaveFlow: ({
    scenario,
    onCancel,
    onComplete,
  }: {
    scenario: { readonly savedRecommendation?: unknown }
    onCancel: () => void
    onComplete: () => void
  }) => (
    <div data-testid="ceremony" data-carries-record={String(scenario.savedRecommendation !== undefined)}>
      <button type="button" onClick={onCancel}>
        cancel-ceremony-stub
      </button>
      <button type="button" onClick={onComplete}>
        complete-ceremony-stub
      </button>
    </div>
  ),
}))

/** The intake questions, reduced to the terminal advance — it drives IntakeApp's REAL `complete()`. */
vi.mock('@intake/flow', () => ({
  IntakeFlow: ({ onComplete }: { onComplete?: () => void }) => (
    <div>
      flow stub
      <button type="button" onClick={() => onComplete?.()}>
        complete-stub
      </button>
    </div>
  ),
}))

import IntakeApp from '../IntakeApp'
import { appModel } from '../appModel'
import { copy } from '../copy'
import { DEV_SEEDS } from '../devSeeds'
import { draftFromScenario } from '../draftFromScenario'
import { exposureForDraft } from '../stalenessExposure'
import { currentEpochDay, scenarioFromDraft } from '../scenarioFromDraft'
import { mintSavedRecommendation } from '@store/savedRecommendationMint'
import { READING_FIXTURES } from '../preview/fixtures'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft, SolveAnswer } from '@store/memoryModel'
import { NEVER_DEPLETED, type Distribution, type SavedRecommendationV3, type ScenarioV3 } from '@shared/model'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { GradeResult } from '@engine/validation/gradeCalibration'

// ---- the household ----------------------------------------------------------------------------

/** A complete, persistable, ALL-RETIRED household with a goal picked — the one shape that can carry
 *  a recommendation (a date route can never mint one: `savedRecommendation.ts:88-94`). */
const BASE_DRAFT: ScenarioDraft = { ...DEV_SEEDS.retired, chosenGoal: 'leave-more' }

const DISK_READY = scenarioFromDraft(BASE_DRAFT)
if (!DISK_READY.ready) throw new Error('the retired seed + a goal must build a persistable scenario')
/** What the hydrate path installs — the codec round-trip of the draft above, so the fingerprint
 *  below is the one the LIVE component will compute, not a near-miss. */
const HYDRATED = draftFromScenario(DISK_READY.scenario)
if (!HYDRATED.ok) throw new Error('a scenario this app wrote must hydrate back to a draft')
const LIVE_DRAFT: ScenarioDraft = HYDRATED.draft

/** THE RUN'S IDENTITY, taken from the REAL producer over the REAL draft (never a hand-typed string):
 *  the record's `fingerprint` conjunct only means something if the fresh side can actually match it. */
appModel.update(() => LIVE_DRAFT)
const RUN_FINGERPRINT = appModel.currentDraftFingerprint()
if (RUN_FINGERPRINT === null) throw new Error('the fixture household must build a solve request')

// ---- the committed recommendation on screen -----------------------------------------------------

const HEIR_BRACKET = 0.24
function distOf(taxable: readonly number[], pretax: readonly number[]): Distribution {
  const z = Array<number>(taxable.length).fill(0)
  return {
    terminalValuesReal: z,
    depletionYears: Array<number>(taxable.length).fill(NEVER_DEPLETED),
    survivalFraction: 1,
    taxAware: {
      lifetimeTaxPaidReal: z,
      terminalTaxableReal: [...taxable],
      terminalPretaxReal: [...pretax],
      terminalRothReal: z,
      terminalHsaReal: z,
      terminalTaxableBasisReal: z,
      lifetimeNetPremiumReal: z,
      lifetimeMedicareCostReal: z,
    },
  }
}
function armOf(id: string, policy: SolveArm['policy'], taxable: number[], pretax: number[]): SolveArm {
  const distributionB = distOf(taxable, pretax)
  return {
    id,
    policy,
    conversion: null,
    distributionB,
    headlineStatisticB: headlineStatisticFromDistribution(distributionB, 'leave-more', HEIR_BRACKET),
    survivalB: 0.99,
  }
}
const GRADE: GradeResult = {
  grade: 'just-do-it',
  memberMargins: [{ margin: 0.02, se: 0.001, band: 0.002, beyondBand: true, paths: 16_000 }],
  demotionFired: false,
  subTenthCollapse: false,
}
/** The crowned winner the record must describe — one object, read by the fixture AND by the
 *  assertions, so "the record names the arm on screen" can never be true by re-typing. */
const WINNER = armOf('taxable-first', 'taxable-first', [520_000, 700_000], [100_000, 100_000])

function payloadOf(over: Partial<SolveRecommendation> = {}): SolveRecommendation {
  return {
    kind: 'recommended',
    goal: 'leave-more',
    heirBracket: HEIR_BRACKET,
    seedA: 1,
    seedB: 2,
    winner: WINNER,
    runnerUp: armOf('bracket-fill', 'bracket-fill', [480_000, 660_000], [100_000, 100_000]),
    noActionBaseline: armOf('proportional', 'proportional', [400_000, 500_000], [100_000, 100_000]),
    rankedIds: [WINNER.id, 'bracket-fill', 'proportional'],
    prunedScores: [],
    noChange: false,
    surplusRegime: false,
    grade: GRADE,
    gradeStatistic: 'leave-more',
    gradeUnavailable: undefined,
    namedDriver: 'sampling-noise-near-tie',
    skewDisclosure: undefined,
    deltaSkew: undefined,
    withheldConversionLevers: [],
    disclosedDirectional: [],
    // THIS BUILD's ranking code — so the trichotomy's conjunct 2 can HOLD. A literal here would
    // make every 'superseded' arm below pass for the wrong reason.
    solverCodeVersion: SOLVER_CODE_VERSION,
    ...over,
  }
}
const committedOn = (payload: SolveRecommendation = payloadOf()): SolveAnswer => ({
  kind: 'committed',
  payload,
  fingerprint: RUN_FINGERPRINT,
})

/**
 * THE MINT'S OWN REFUSAL, produced by a REAL producer defect rather than a doctored record: a
 * 'custom' winner that arrived with no drawdown order. That is BICONDITIONAL half #1 — the mint
 * spreads what it has and `checkSavedRecommendationV3` refuses the half-pair
 * (`action.drawdownOrder: required when policy is 'custom'`), which is exactly the shape the
 * gesture must catch BEFORE the draft is touched.
 */
const CUSTOM_WITHOUT_ORDER = payloadOf({
  winner: { ...WINNER, policy: 'custom', drawdownOrder: undefined },
})

/** The record the DISK holds in the returning-household arms — minted by the REAL mint against the
 *  REAL run identity, so the store's trichotomy has a genuine `current` verdict to reach. */
function diskRecord(): SavedRecommendationV3 {
  const minted = mintSavedRecommendation(payloadOf(), RUN_FINGERPRINT!, false, currentEpochDay())
  if (!minted.ok) throw new Error(`the fixture record must mint: ${minted.detail}`)
  return minted.record
}

// ---- the planted solve channel ------------------------------------------------------------------

/**
 * A RESOLVED SPINE READING — the frame the strategy slot actually lives on. Result withholds its
 * whole actions row (which is where the recommendation surface mounts) while `answer` is
 * idle/pending, so an unresolved answer is not merely unrealistic here, it renders nothing. The
 * reading is the shipped hand-built fixture (`preview/fixtures.ts`, the ConfidenceStatement
 * harness's own), NOT engine output: no arm below reads a single figure off it.
 */
const RESOLVED: ModelAnswer = {
  kind: 'headline',
  result: {
    headline: READING_FIXTURES['on-track'].headline,
    dollar: READING_FIXTURES['on-track'].dollar,
    distribution: {
      terminalValuesReal: [],
      depletionYears: [],
      survivalFraction: 0,
      bandFan: READING_FIXTURES['on-track'].band,
    },
    seed: 1,
  },
  tier: 'final',
}

/**
 * The store's `answer` and `solve` channels only resolve through the real worker, so both are
 * planted by WRAPPING `getSnapshot` — the DRAFT and everything else still come from the real
 * singleton. The composed object is CACHED on its inputs: `useSyncExternalStore` throws on a store
 * whose snapshot identity changes on every read.
 */
const plant: { solve: SolveAnswer; answer: ModelAnswer } = { solve: { kind: 'idle' }, answer: RESOLVED }
const realGetSnapshot = appModel.getSnapshot.bind(appModel)
let cachedBase: MemoryModelSnapshot | null = null
let cachedSolve: SolveAnswer | null = null
let cachedAnswer: ModelAnswer | null = null
let cachedSnapshot: MemoryModelSnapshot | null = null
const getSnapshotSpy = vi.spyOn(appModel, 'getSnapshot').mockImplementation((): MemoryModelSnapshot => {
  const base = realGetSnapshot()
  if (
    cachedSnapshot === null ||
    base !== cachedBase ||
    plant.solve !== cachedSolve ||
    plant.answer !== cachedAnswer
  ) {
    cachedBase = base
    cachedSolve = plant.solve
    cachedAnswer = plant.answer
    cachedSnapshot = { ...base, solve: plant.solve, answer: plant.answer }
  }
  return cachedSnapshot
})
void getSnapshotSpy

// The engine is never dispatched here (the reveal cadence + the re-entry affirm both call it).
const recomputeSpy = vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined)
// THE STORE WRITE — the whole ordering law is "this must not have been called yet".
const updateSpy = vi.spyOn(appModel, 'update')
// The two expensive reads the record-card memo short-circuits (call-through: they still run).
const fingerprintSpy = vi.spyOn(appModel, 'currentDraftFingerprint')
const exposureSpy = vi.mocked(exposureForDraft)
// The mint's / codec's developer text goes HERE and nowhere near a household (asserted, not muted).
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

// ---- driving the surface -------------------------------------------------------------------------

const saveCta = () => screen.queryByRole('button', { name: copy.recommendSaveCta })
const refusalCard = () => document.querySelector('.rec-note--refused')
const savedRecordCard = () => document.querySelector('.rec-record')
const savedBadge = () => document.querySelector('.rec-save__badge')
const pendingLine = () => document.querySelector('.rec-save__pending')
const draftRecord = (): SavedRecommendationV3 | undefined => realGetSnapshot().draft.savedRecommendation

/** A FRESH, never-saved household on the result phase (persist `{kind:'unsaved'}` — every dev seed,
 *  the Caddie walk and the fit gate). The flow stub's terminal advance runs the REAL `complete()`. */
async function mountFresh(solve: SolveAnswer = committedOn(), draft: ScenarioDraft = LIVE_DRAFT) {
  appModel.update(() => draft)
  plant.solve = solve
  render(<IntakeApp />)
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'complete-stub' }))
  })
}

/** A RETURNING household over a real vault: the hydrate effect decodes the model, seeds `persist`
 *  from it, and lands on the U13 re-entry gate; affirming reveals the result. */
async function mountReturning(model: ScenarioV3, solve: SolveAnswer = committedOn()) {
  h.model = model
  plant.solve = solve
  render(<IntakeApp hydrateFromVault />)
  fireEvent.click(await screen.findByRole('button', { name: copy.reentryAffirmCta }))
  await act(async () => {})
}

/** Tap the save control and let the gesture run to its end (the awaits are the DB open, the write,
 *  and the state that renders the outcome). */
async function tapSave() {
  const cta = saveCta()
  if (cta === null) throw new Error('the save CTA must be on screen for this arm')
  await act(async () => {
    fireEvent.click(cta)
  })
  await act(async () => {})
}

/** The commit-on-blur an unrelated field edit fires — a NEW draft object, which is what un-stands a
 *  refusal keyed to the old one (IntakeApp's paired-refusal state). */
async function commitOnBlur() {
  await act(async () => {
    appModel.update((d) => ({ ...d }))
  })
}

beforeEach(() => {
  h.status = 'locked'
  h.saveResult = { ok: true }
  h.saved = []
  h.model = null
  h.dropRecordAtom = false
  plant.solve = { kind: 'idle' }
  plant.answer = RESOLVED
  appModel.update(() => LIVE_DRAFT)
  recomputeSpy.mockClear()
  updateSpy.mockClear()
  fingerprintSpy.mockClear()
  exposureSpy.mockClear()
  consoleSpy.mockClear()
})
afterEach(cleanup)

// =================================================================================================
// (1) THE ORDERING LAW — nothing reaches the store until the mint has validated AND the gate probed
// =================================================================================================

/**
 * THE MUTANT THIS SECTION EXISTS FOR: move `appModel.update` above the mint's validation / the
 * gate's probe. It is the worst one in the feature, and it is invisible to every other battery.
 * `scenarioCodec.ts:660-664` names the loss: where the disk already holds a VALID record and a new
 * mint is bad, the codec deletes the bad record from the LIVE operand only, the two
 * `scenarioIdentityKey`s diverge, `deriveResultSave` reads DIRTY, and the household's next
 * plan-save writes a record-FREE scenario OVER the good record. The refusal renders either way —
 * only the store write tells the two apart.
 */
describe('the save gesture — the store is not touched until the mint has validated and the gate has probed', () => {
  it('a REFUSED MINT writes nothing to the draft: no store update, no session write, the refusal card', async () => {
    await mountFresh(committedOn(CUSTOM_WITHOUT_ORDER))
    expect(saveCta(), 'the CTA is offered — a producer defect is not visible before the tap').not.toBeNull()
    updateSpy.mockClear()
    await tapSave()

    // THE ORDERING ASSERTION. Not "the draft has no record" (a mutant that wrote and then restored
    // would pass that) — the store write must never have HAPPENED.
    expect(updateSpy, 'the store is untouched by a mint that refused').not.toHaveBeenCalled()
    expect(draftRecord()).toBeUndefined()
    expect(h.saved, 'and nothing went to disk').toHaveLength(0)
    // The promised affordance still owes a rendered outcome (insight 100).
    expect(refusalCard()?.textContent).toContain(copy.recommendSaveRefusalRecordInvalidHeading)
    expect(screen.queryByTestId('ceremony'), 'a refusal never escalates into the ceremony').toBeNull()
    // The codec's developer text went to the console and NOWHERE near the household — the failing
    // FIELD PATH is named for us, and the screen carries not one word of it.
    expect(consoleSpy.mock.calls.map(String).join(' ')).toContain('drawdownOrder')
    expect(document.body.textContent, 'no schema path on screen').not.toContain('drawdownOrder')

    // THE CONTROL (burned/070): the same tap, on a payload the mint accepts, DOES write — so the
    // spy above was live and the refusal was the mint's, not the harness's.
    plant.solve = committedOn()
    await commitOnBlur() // un-stands the draft-keyed refusal, so the CTA returns
    updateSpy.mockClear()
    await tapSave()
    expect(updateSpy, 'a valid mint reaches the store').toHaveBeenCalledTimes(1)
    expect(draftRecord()?.action.candidateId).toBe(WINNER.id)
  })

  it('a SAVE-GATE PROBE that would drop the record writes nothing either (the planted drop)', async () => {
    h.dropRecordAtom = true
    await mountFresh()
    updateSpy.mockClear()
    await tapSave()

    // The record was mintable — this refusal is the PROBE's, one gate later, and it must land on
    // the same side of the store write.
    expect(updateSpy, 'a record the save gate would drop never reaches the draft').not.toHaveBeenCalled()
    expect(draftRecord()).toBeUndefined()
    expect(h.saved).toHaveLength(0)
    expect(refusalCard()?.textContent).toContain(copy.recommendSaveRefusalRecordInvalidHeading)
    expect(screen.queryByTestId('ceremony')).toBeNull()
    expect(consoleSpy.mock.calls.map(String).join(' ')).toContain('dropped by the save gate')

    // THE CONTROL — disarm the planted drop and re-tap: the same frame now writes. Proves the arm
    // above witnessed the drop check and not a harness that refuses everything.
    h.dropRecordAtom = false
    await commitOnBlur()
    updateSpy.mockClear()
    await tapSave()
    expect(updateSpy, 'the disarmed frame writes').toHaveBeenCalledTimes(1)
    expect(draftRecord(), 'and the record lands').not.toBeUndefined()
  })

  it('a RECOVERY-UNLOCKED session refuses ALOUD before the mint — no store write, no disk write', async () => {
    // `recoveryUnlock` clears `passphraseWrapCurrent`, so `writable()` refuses — and no existing
    // parameter carries that state (`RecoveryUnlockResult` has no readOnly bit). Minting first and
    // discovering it at the write would leave a record on the draft no write can ever carry.
    h.status = 'recovery-unlocked'
    await mountFresh()
    updateSpy.mockClear()
    await tapSave()
    expect(updateSpy).not.toHaveBeenCalled()
    expect(draftRecord()).toBeUndefined()
    expect(h.saved).toHaveLength(0)
    expect(refusalCard()?.textContent).toContain(copy.recommendSaveRefusalRecoveryLockedHeading)
    // …and it is ITS OWN card, never the record-invalid one (nothing was wrong with the record).
    expect(refusalCard()?.textContent).not.toContain(copy.recommendSaveRefusalRecordInvalidHeading)
  })

  it('a RUN THAT MOVED under the tap is refused silently — the ticket is a check, not a courier', async () => {
    // The gesture re-reads the store AFTER its own await (insight 036) and compares the committed
    // run identity to the TICKET the surface composed at render time. MUTANT: drop the re-read (or
    // the compare) and the record is stamped with a run the recommendation was never computed
    // against — a calm-but-wrong memory instead of a detectable one.
    await mountFresh()
    updateSpy.mockClear()
    const cta = saveCta()!
    fireEvent.click(cta) // the gesture parks at the vault-session await…
    plant.solve = {
      kind: 'committed',
      payload: payloadOf(),
      fingerprint: 'solver-run-fp/v2:a-different-run' as typeof RUN_FINGERPRINT,
    }
    await act(async () => {}) // …and resumes against a store that moved
    await act(async () => {})

    expect(updateSpy, 'no record is minted for a run the household did not tap').not.toHaveBeenCalled()
    expect(draftRecord()).toBeUndefined()
    expect(h.saved).toHaveLength(0)
    // SILENT is honest here and only here: the store's own demotion already re-rendered the
    // surface, so the outcome insight 100 asks for is on screen before the gesture returns.
    expect(refusalCard(), 'no card for a state the surface already speaks').toBeNull()
  })
})

// =================================================================================================
// (2) R1 — THE NO-VAULT TAP MINTS AND ROUTES INTO THE CEREMONY (never a dead control)
// =================================================================================================

/**
 * R1 is pinned in the VIEW module (`deriveRecommendationSave` routes `unsaved ⇒ offer{ceremony}`)
 * and was completely unpinned at the HANDLER that implements it — that asymmetry is the finding.
 * A handler that refused instead of escalating would leave every dev seed, the Caddie walk and
 * `pnpm verify:fit` staring at a CTA whose tap produces a shrug.
 */
describe('the save gesture — R1: with no vault the tap MINTS and opens the ceremony', () => {
  it('puts the record on the draft AND drives the save phase, carrying that record into the ceremony', async () => {
    await mountFresh()
    expect(screen.queryByTestId('ceremony'), 'the ceremony is not open before the tap').toBeNull()
    await tapSave()

    // (a) THE RECORD IS ON THE DRAFT — describing the run on screen, stamped with the COMMITTED
    // identity (never a fresh recompute) and this build's ranking version.
    const record = draftRecord()
    expect(record, 'the no-vault tap MINTS').not.toBeUndefined()
    expect(record!.action.candidateId, 'the winner ON SCREEN, never the runner-up').toBe(WINNER.id)
    expect(record!.action.policy).toBe(WINNER.policy)
    expect(record!.fingerprint).toBe(RUN_FINGERPRINT)
    expect(record!.solverCodeVersion).toBe(payloadOf().solverCodeVersion)
    expect(record!.goal).toBe(payloadOf().goal)

    // (b) THE PHASE ROUTED, and the scenario the ceremony would commit CARRIES the memory — one
    // ceremony writes the whole plan including this record (there is no note-only save).
    const ceremony = await screen.findByTestId('ceremony')
    expect(ceremony).toHaveAttribute('data-carries-record', 'true')
    // (c) NOTHING was written by the gesture itself — the ceremony owns the first write.
    expect(h.saved, 'the ceremony is the writer on this route, not saveNow').toHaveLength(0)
    expect(refusalCard(), 'the no-vault path is not a refusal').toBeNull()

    // (d) THE RECORD IS NOT A RANKING INPUT — the fresh fingerprint is unmoved by the mint, which
    // is what lets the trichotomy answer `current` on the very next frame.
    expect(appModel.currentDraftFingerprint()).toBe(RUN_FINGERPRINT)

    // (e) COMPLETING the ceremony lands the badge — and it is DISK-derived: persist now holds the
    // record-bearing scenario the ceremony committed.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'complete-ceremony-stub' }))
    })
    expect(savedBadge()?.textContent).toContain(copy.recommendSaveSavedBadge)
  })

  it('CANCELLING the ceremony restores the record the draft carried BEFORE the tap (never a strip)', async () => {
    // A household that saved a record earlier and has not touched it today must not lose it to a
    // ceremony they backed out of. MUTANT: strip the key unconditionally on cancel — this reds.
    const prior = diskRecord()
    await mountFresh()
    await act(async () => {
      appModel.update((d) => ({ ...d, savedRecommendation: prior }))
    })
    await tapSave()
    await screen.findByTestId('ceremony')
    expect(draftRecord(), 'the tap minted over the prior record').not.toBe(prior)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'cancel-ceremony-stub' }))
    })
    expect(draftRecord(), 'the PRIOR record is back — R2 forbids carrying an unnamed mint to disk').toBe(prior)
    expect(saveCta(), 'and the offer stands again').not.toBeNull()
  })
})

// =================================================================================================
// (3) THE OPERAND — every claim about a saved recommendation is read off the DISK
// =================================================================================================

/**
 * THE MUTANT: swap the record-card memo's operand from `persist.scenario` (the LAST COMMITTED
 * model) to `snapshot.draft`. The gesture puts the record on the draft SEVERAL AWAITS BEFORE any
 * write lands — and leaves it there forever when the write fails, deliberately, so the plan rail's
 * own retry can carry it. A draft read therefore reports a save that never happened: the cardinal
 * calm-but-wrong sin, in the exact direction this whole machine exists to make unrepresentable.
 */
describe('the save gesture — a FAILED write claims nothing (the operand is the disk, not the draft)', () => {
  it('leaves the record on the draft, reports the write refusal, and never draws a saved card or badge', async () => {
    h.saveResult = { ok: false, reason: 'not-writable' }
    await mountReturning(DISK_READY.scenario) // a vault with NO record on it
    expect(savedRecordCard(), 'nothing is remembered yet').toBeNull()
    await tapSave()

    // NON-VACUITY, and it is the whole point of the arm: the draft REALLY carries a record the disk
    // does not. A draft-reading memo has everything it needs to lie here.
    expect(draftRecord(), 'the record stays on the draft (the plan rail retry must carry it)').not.toBeUndefined()
    expect(h.saved, 'the write was really attempted').toHaveLength(1)

    // …and the surface still claims NOTHING about a memory.
    expect(savedRecordCard(), 'no remembered-record card for a record no vault holds').toBeNull()
    expect(document.body.textContent).not.toContain(copy.recommendRecordHeading)
    expect(document.body.textContent).not.toContain(copy.recommendRecordHolds)
    expect(savedBadge(), 'and no saved badge').toBeNull()
    expect(pendingLine(), 'the in-flight line is done').toBeNull()
  })

  it("the 'write' refusal has a REAL producer: the card renders, and NO save CTA renders beside it", async () => {
    // A declared refusal nobody can produce renders NOTHING on a failure (the dead-arm shape). The
    // plan rail's own retry is the repair, so this card authors no second retry control.
    h.saveResult = { ok: false, reason: 'not-writable' }
    await mountReturning(DISK_READY.scenario)
    await tapSave()

    const card = refusalCard()
    expect(card, 'a promised affordance owes a rendered outcome (insight 100)').not.toBeNull()
    expect(card?.textContent).toContain(copy.recommendSaveRefusalWriteHeading)
    expect(card?.textContent).toContain(copy.recommendSaveRefusalWriteBody)
    expect(card).toHaveAttribute('role', 'alert')
    expect(saveCta(), 'no fresh offer beside the outcome of the tap that just failed').toBeNull()
    expect(card?.querySelector('button'), 'and no second retry control (the plan rail owns it)').toBeNull()
  })

  it('THE SEQUENCE: the plan rail’s own retry carries the record the gesture left behind — badge, no residual refusal', async () => {
    // The gesture deliberately LEAVES its record on the draft when a write fails (stripping it
    // would make this very retry write a record-FREE scenario over a good one). So the retry is
    // record-bearing, and when it lands, `saveNow` MUST clear the standing refusal: without that,
    // the screen holds two contradictory claims about one vault — the strategy slot reporting a
    // save that failed, over a plan rail reporting the save that succeeded. MUTANT: drop the
    // gated `setRecSaveRefusal(null)` in saveNow's `{ok:true}` arm.
    h.saveResult = { ok: false, reason: 'write-failed', detail: 'planted' }
    await mountReturning(DISK_READY.scenario)
    await tapSave()
    expect(refusalCard(), 'the failed write is reported').not.toBeNull()

    h.saveResult = { ok: true }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: copy.exportRetry }))
    })
    await act(async () => {})

    // The retry really carried the memory to disk (non-vacuity, read off the write itself).
    expect(h.saved).toHaveLength(2)
    expect((h.saved[1] as ScenarioV3).savedRecommendation, 'the retry is record-bearing').not.toBeUndefined()
    // …so the slot may claim the save — and NOTHING beside it still claims the failure.
    expect(refusalCard(), 'no dead refusal over a write that landed').toBeNull()
    expect(savedBadge()?.textContent).toContain(copy.recommendSaveSavedBadge)
    expect(savedRecordCard()?.textContent).toContain(copy.recommendRecordHolds)
  })

  it('CONTROL — a vault that really holds the record DOES say saved (the negative above is not a mute)', async () => {
    const record = diskRecord()
    await mountReturning({ ...DISK_READY.scenario, savedRecommendation: record })

    // The badge is the ONE arm permitted to claim a completed save, and every conjunct behind it
    // came off the disk operand + the store's own trichotomy.
    expect(savedBadge()?.textContent).toContain(copy.recommendSaveSavedBadge)
    expect(savedRecordCard()?.textContent).toContain(copy.recommendRecordHeading)
    expect(savedRecordCard()?.textContent).toContain(copy.recommendRecordHolds)
    expect(saveCta(), 'nothing left to offer').toBeNull()
  })
})

// =================================================================================================
// (4) THE ZERO-WORK SHORT-CIRCUIT — the record-free frame pays nothing (the fit-frame contract)
// =================================================================================================

describe('the record-card memo — a record-free mount does ZERO expensive work', () => {
  it('never calls currentDraftFingerprint or exposureForDraft on an unsaved result frame', async () => {
    // Both reads are expensive: the fingerprint runs the solve builder (→ buildSpineParams → the
    // candidate enumeration → a canon serialize) and the exposure calls SIX params producers. On a
    // `{kind:'unsaved'}` mount — every `?seed=` route, the Caddie walk, `pnpm verify:fit` — there
    // is no record to judge, so the honest answer must COST nothing. MUTANT: hoist either read
    // above the memo's short-circuits.
    await mountFresh()
    expect(saveCta(), 'the frame really did render the strategy slot').not.toBeNull()
    expect(fingerprintSpy, 'no fresh fingerprint for a household with nothing remembered').not.toHaveBeenCalled()
    expect(exposureSpy, 'and no exposure record either').not.toHaveBeenCalled()

    // CONTROL — the same two reads DO fire once there is a record on disk to judge, so the zeros
    // above are a short-circuit and not a dead memo.
    cleanup()
    await mountReturning({ ...DISK_READY.scenario, savedRecommendation: diskRecord() })
    expect(fingerprintSpy).toHaveBeenCalled()
    expect(exposureSpy).toHaveBeenCalled()
  })
})

// =================================================================================================
// (5) THE SOURCE-BIND — the refusal clear that no render can witness (insights 032/081)
// =================================================================================================

describe('IntakeApp.tsx — the update route clears the standing refusal in the SAME state update', () => {
  it('sets inFlight and clears the refusal together, with no await between them', () => {
    /**
     * WHY THIS ARM IS A SOURCE-BIND AND NOT A RENDER.
     *
     * The obligation is real: the standing refusal deliberately OUTRANKS `inFlight` in
     * `deriveRecommendationSave`'s guard order, so a refusal left standing across a new write would
     * render a dead card over live work. But the refusal is PAIRED WITH THE DRAFT IT WAS MINTED
     * AGAINST (`recSaveRefusal.draft === snapshot.draft`), and every refusal is keyed to the draft
     * that is current at the instant it is set — so a STANDING refusal always renders
     * `{kind:'refused'}`, which draws no save control at all, and the only thing that can un-stand
     * it (a draft change) also makes the clear a no-op. There is therefore NO tap that can reach
     * this line with a refusal outstanding, and a behavioural arm for it would be a test that
     * cannot fail — the exact "arm whose gate is nulled downstream" shape insight 029 names.
     *
     * So the clear is pinned where it is decidable: at the call site. Deleting the line reds this.
     */
    const src = readFileSync(resolve(__dirname, '../IntakeApp.tsx'), 'utf8')
    const gesture = src.slice(src.indexOf('const saveRecommendation'), src.indexOf("// DEV-only `?seed="))
    expect(gesture.length, 'the gesture was found in the source').toBeGreaterThan(0)
    expect(gesture, 'and this slice really is the update route').toContain('setRecSaveCeremony(true)')

    const flag = gesture.indexOf('setRecSaveInFlight(true)')
    const write = gesture.indexOf('await saveNow()')
    expect(flag, 'the update route raises its own in-flight flag').toBeGreaterThan(-1)
    expect(write, 'and then runs the ONE write producer').toBeGreaterThan(flag)
    const between = gesture.slice(flag, write)
    expect(between, 'the standing refusal is cleared in the same update that sets inFlight').toContain(
      'setRecSaveRefusal(null)',
    )
    expect(between, 'with nothing awaited between them — no frame may render in that gap').not.toContain('await')
  })
})
