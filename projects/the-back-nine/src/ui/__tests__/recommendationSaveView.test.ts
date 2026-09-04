/**
 * U17 · S5 — the anti-lie machine (`recommendationSaveView.ts`), arm by arm.
 *
 * THE PROPERTY UNDER TEST IS A NEGATIVE ONE: no argument means "the save worked". So the battery is
 * built around the states in which a tracked boolean WOULD have lied and the derived value must
 * not — a failed write, a demoted solve, a record the codec dropped on the way to disk, a vault
 * that holds a DIFFERENT recommendation, a second tab that owns the writer — plus the paired
 * positive for each (burned/070: a machine that refuses unconditionally passes every refusal arm).
 *
 * The `SavedRecommendationStatus` operands are the REAL producer's output
 * (`deriveSavedRecommendationStatus` over a real save-ready scenario and a real era), never a
 * hand-typed `{current}` literal: the view's whole job on that conjunct is to CONSUME the store's
 * trichotomy rather than re-implement a weaker comparator beside it, and a stubbed status would
 * make the two indistinguishable.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  NEVER_DEPLETED,
  type Distribution,
  type SavedRecommendationEraV3,
  type SavedRecommendationV3,
  type ScenarioV3,
} from '@shared/model'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { SolvePayload } from '@engine/solver/solveEntry'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import type { SolveAnswer } from '@store/memoryModel'
import { deriveSavedRecommendationStatus, type SavedRecommendationStatus } from '@store/savedRecommendation'
import { exposureForDraft } from '../stalenessExposure'
import { DEV_SEEDS } from '../devSeeds'
import { currentEpochDay, scenarioFromDraft, type SaveReady } from '../scenarioFromDraft'
import type { PersistState } from '../resultSave'
import {
  deriveRecommendationSave,
  savedRecordCardView,
  type RecommendationSaveInput,
  type RecommendationSaveRefusal,
  type SavedRecordCopy,
} from '../recommendationSaveView'

// ---- fixtures --------------------------------------------------------------------------------

const TODAY = currentEpochDay()
/** The committed run's identity. One value shared by the solve fixture and the record fixture, so
 *  the "matching fingerprint" arms really match — this is an INPUT, never an expected value. */
const FINGERPRINT = 'solver-run-fp/v2:{"goal"=s"leave-more"}' as SolverRunFingerprint
/** The crowned arm's id — likewise shared by the solve payload and the record's action. */
const WINNER_ID = 'baseline:taxable-first:0'

function readySave(): Extract<SaveReady, { ready: true }> {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('DEV_SEEDS.retired should be save-ready')
  return r
}
const ready = readySave()
const notReady: SaveReady = { ready: false, detail: 'incomplete' }
const EXPOSURE = exposureForDraft(DEV_SEEDS.retired)

/** A distribution shell — the save view reads no figures, so the arms carry the SHAPE only. */
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
const armOf = (id: string): SolveArm => ({
  id,
  policy: 'taxable-first',
  conversion: null,
  distributionB: distShell(),
  headlineStatisticB: 1,
  survivalB: 0.99,
})

function recommended(over: Partial<SolveRecommendation> = {}): SolveRecommendation {
  return {
    kind: 'recommended',
    goal: 'leave-more',
    heirBracket: 0.24,
    seedA: 1,
    seedB: 2,
    winner: armOf(WINNER_ID),
    runnerUp: armOf('baseline:proportional:0'),
    noActionBaseline: armOf('baseline:proportional:0'),
    rankedIds: [WINNER_ID, 'baseline:proportional:0'],
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
    ...over,
  }
}
const committed = (payload: SolvePayload = recommended()): SolveAnswer => ({
  kind: 'committed',
  payload,
  fingerprint: FINGERPRINT,
})

/** The five era-bearing fields of a REAL save. It THROWS rather than `!`-asserting: a fixture that
 *  quietly built a stampless era would exercise the fail-open shape the codec refuses outright. */
function eraOf(s: ScenarioV3): SavedRecommendationEraV3 {
  const { taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage } = s
  if (
    taxVintageDetail === undefined ||
    stateTaxVintage === undefined ||
    healthcareVintage === undefined ||
    dateVintage === undefined
  ) {
    throw new Error('scenarioFromDraft stamps all four vintages at every save — this fixture is not a real save')
  }
  return { appDefaultVersion: s.appDefaultVersion, taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage }
}

/** A record minted against THIS scenario's era, describing THIS run's winner — the all-conjuncts-hold
 *  baseline every arm below moves exactly one thing away from. */
function recordFor(scenario: ScenarioV3, over: Partial<SavedRecommendationV3> = {}): SavedRecommendationV3 {
  return {
    mintedAt: TODAY - 10,
    fingerprint: FINGERPRINT,
    solverCodeVersion: SOLVER_CODE_VERSION,
    goal: 'leave-more',
    action: { candidateId: WINNER_ID, policy: 'taxable-first' },
    verdict: { noChange: false, surplusRegime: false, noDollarRegister: false },
    era: eraOf(scenario),
    ...over,
  }
}

const statusOf = (
  record: SavedRecommendationV3,
  freshFingerprint: string | null = FINGERPRINT,
): SavedRecommendationStatus =>
  deriveSavedRecommendationStatus({
    record,
    scenario: ready.scenario,
    freshFingerprint,
    todayEpochDay: TODAY,
    exposure: EXPOSURE,
  })

/** A record whose era is one tax year behind the live constants — the trichotomy's conjunct 3 fires
 *  while conjuncts 1 and 2 are BYTE-IDENTICAL (same fingerprint, same solver version). This is the
 *  operand that kills an inline fingerprint+version comparator standing in for the store's verdict. */
function staleEraRecord(): SavedRecommendationV3 {
  const era = eraOf(ready.scenario)
  return recordFor(ready.scenario, {
    era: { ...era, taxVintageDetail: { taxYear: era.taxVintageDetail.taxYear - 1, legalBasis: 'TCJA (pre-OBBBA)' } },
  })
}

/** A vault whose scenario carries `record`; `undefined` writes a record-FREE vault (what the disk
 *  holds after the codec dropped an invalid atom, and before any recommendation was ever kept). */
const vault = (kind: 'saved' | 'saving', record?: SavedRecommendationV3): PersistState =>
  kind === 'saved'
    ? { kind: 'saved', scenario: { ...ready.scenario, savedRecommendation: record } }
    : { kind: 'saving', scenario: { ...ready.scenario, savedRecommendation: record } }
const failedVault = (record?: SavedRecommendationV3): PersistState => ({
  kind: 'save-failed',
  scenario: { ...ready.scenario, savedRecommendation: record },
  errorKey: 'saveErrorFailed',
})

const BASE: RecommendationSaveInput = {
  persist: { kind: 'unsaved' },
  solve: committed(),
  ready,
  readOnly: false,
  status: undefined,
  inFlight: false,
  refusal: null,
}
const view = (over: Partial<RecommendationSaveInput> = {}) => deriveRecommendationSave({ ...BASE, ...over })

/** The all-conjuncts-hold saved frame: a vault carrying the record for the run on screen. */
function savedFrame(persist: PersistState = vault('saved', recordFor(ready.scenario))): RecommendationSaveInput {
  return { ...BASE, persist, status: statusOf(recordFor(ready.scenario)) }
}

// ---- the gesture view ------------------------------------------------------------------------

describe('deriveRecommendationSave — the guard order', () => {
  it('a READ-ONLY session makes NO claim, over every state beneath it (App’s standing banner is the whole disclosure)', () => {
    expect(view({ readOnly: true })).toEqual({ kind: 'none' })
    // It outranks a standing refusal AND a fully-saved frame: a second read-only sentence, or a
    // badge for a save this tab could never have made, are both claims the banner already covers.
    expect(view({ readOnly: true, refusal: 'write' })).toEqual({ kind: 'none' })
    expect(deriveRecommendationSave({ ...savedFrame(), readOnly: true })).toEqual({ kind: 'none' })
    // PAIRED POSITIVE — the same frames speak when the tab can write.
    expect(view({ refusal: 'write' })).toEqual({ kind: 'refused', reason: 'write' })
    expect(deriveRecommendationSave(savedFrame())).toEqual({ kind: 'saved' })
  })

  it('THE HOISTED REFUSAL: a rendered outcome survives the commit-on-blur demotion that erased it under the old order', () => {
    // The store demotes a committed solve to `stale` on EVERY draft mutation, and a commit-on-blur
    // fires one the instant focus leaves a field. With the solve guard first, the household taps
    // Save, the write fails, they click away — and the refusal evaporates into `{kind:'none'}`.
    // MUTANT: move the solve guard above the refusal guard; this arm reads 'none' and reds.
    expect(view({ refusal: 'write', solve: { kind: 'stale', label: 'inputs-changed' } })).toEqual({
      kind: 'refused',
      reason: 'write',
    })
    // …and survives every OTHER downstream gate too: an unready answer, no vault, no status.
    expect(view({ refusal: 'record-invalid', ready: notReady })).toEqual({
      kind: 'refused',
      reason: 'record-invalid',
    })
    // All three reasons round-trip UNCHANGED — the surface switches on the string, and there is
    // nothing else in the payload for a card to render.
    const reasons: readonly RecommendationSaveRefusal[] = ['record-invalid', 'write', 'recovery-locked']
    for (const reason of reasons) {
      expect(view({ refusal: reason })).toEqual({ kind: 'refused', reason })
    }
  })

  it('no LIVE recommendation ⇒ no claim — every non-recommended solve state and every non-recommended payload', () => {
    const solveStates: readonly SolveAnswer[] = [
      { kind: 'idle' },
      { kind: 'pending', label: 'solving', fingerprint: 'fp' },
      { kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' },
      { kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' },
      { kind: 'stale', label: 'inputs-changed' },
      { kind: 'compute-error', reason: 'worker died' },
    ]
    for (const solve of solveStates) {
      expect(view({ solve }), `${solve.kind} has no crowned winner a record could describe`).toEqual({ kind: 'none' })
    }
    const payloads: readonly Exclude<SolvePayload, SolveRecommendation>[] = [
      { kind: 'refused', reason: 'bucket-precondition', detail: 'dev text', solverCodeVersion: SOLVER_CODE_VERSION },
      {
        kind: 'withheld',
        reason: 'demotion-axis-uncalibrated',
        detail: 'dev text',
        winnerId: WINNER_ID,
        runnerUpId: undefined,
        surplusRegime: false,
        solverCodeVersion: SOLVER_CODE_VERSION,
      },
      { kind: 'aborted', detail: 'dev text', solverCodeVersion: SOLVER_CODE_VERSION },
      { kind: 'token-withheld', reasons: [], disclosedDirectional: [], solverCodeVersion: SOLVER_CODE_VERSION },
      { kind: 'mint-failed', stage: 'oracle', detail: 'dev text', solverCodeVersion: SOLVER_CODE_VERSION },
      { kind: 'unwitnessable', reason: 'perturbation-inert', detail: 'dev text', solverCodeVersion: SOLVER_CODE_VERSION },
    ]
    for (const payload of payloads) {
      expect(view({ solve: committed(payload) }), `${payload.kind} is not mintable`).toEqual({ kind: 'none' })
    }
    // STRUCTURAL: a NEW non-recommended payload kind fails to compile here rather than silently
    // skipping the sweep above (TS2741 on the missing member).
    const covered: Record<Exclude<SolvePayload, SolveRecommendation>['kind'], true> = {
      refused: true,
      withheld: true,
      aborted: true,
      'token-withheld': true,
      'mint-failed': true,
      unwitnessable: true,
    }
    expect(Object.keys(covered)).toHaveLength(payloads.length)
    // PAIRED POSITIVE — the recommended payload on the SAME frame offers.
    expect(view()).toEqual({ kind: 'offer', route: 'ceremony' })
  })

  it('an answer the save gate cannot encode makes no claim (the record rides the SCENARIO)', () => {
    expect(view({ ready: notReady })).toEqual({ kind: 'none' })
    expect(deriveRecommendationSave({ ...savedFrame(), ready: notReady })).toEqual({ kind: 'none' })
    expect(deriveRecommendationSave(savedFrame())).toEqual({ kind: 'saved' }) // paired positive
  })

  it('an IN-FLIGHT write outranks the saved arm — during an update the disk still holds the PREVIOUS record', () => {
    // MUTANT: rank the saved arm above `inFlight`. The badge then reports the OLD record as the
    // outcome of a write that has not landed — a true-looking claim about the wrong recommendation.
    expect(deriveRecommendationSave({ ...savedFrame(), inFlight: true })).toEqual({ kind: 'saving' })
    expect(view({ inFlight: true })).toEqual({ kind: 'saving' })
  })
})

describe('deriveRecommendationSave — the saved arm is computed from the disk', () => {
  it('“saving” and “save-failed” both still read SAVED when the disk carries the matching record', () => {
    // MUTANT: `persist.kind === 'saved'`. Both of these red — and the defect it ships is two
    // contradictory claims on one screen (the plan rail's "couldn't finish" alert beside a
    // strategy slot claiming nothing was ever kept, about the same vault).
    const record = recordFor(ready.scenario)
    const status = statusOf(record)
    expect(deriveRecommendationSave({ ...BASE, persist: vault('saving', record), status, inFlight: false })).toEqual({
      kind: 'saved',
    })
    expect(deriveRecommendationSave({ ...BASE, persist: failedVault(record), status })).toEqual({ kind: 'saved' })
  })

  it('a vault with NO record on it offers — there is no boolean that could say otherwise', () => {
    // The codec DELETES an invalid record from the object `decodeScenario` returns, so our own
    // minting defect surfaces here as an ABSENT record, not a present-and-bad one. MUTANT: a
    // `didSave` / `justSaved` flag set after the write — it reads true over this very frame.
    expect(deriveRecommendationSave({ ...BASE, persist: vault('saved'), status: statusOf(recordFor(ready.scenario)) })).toEqual(
      { kind: 'offer', route: 'update' },
    )
    // The property, swept: with no record on disk, NOTHING makes this machine say 'saved'.
    const recordless: readonly PersistState[] = [{ kind: 'unsaved' }, vault('saved'), vault('saving'), failedVault()]
    const statuses: readonly (SavedRecommendationStatus | undefined)[] = [
      undefined,
      statusOf(recordFor(ready.scenario)),
      statusOf(staleEraRecord()),
    ]
    for (const persist of recordless) {
      for (const status of statuses) {
        expect(deriveRecommendationSave({ ...BASE, persist, status }).kind).not.toBe('saved')
      }
    }
  })

  it('a SUPERSEDED record is not a saved badge — the store’s trichotomy is consumed, never re-derived', () => {
    const record = staleEraRecord()
    const status = statusOf(record)
    // Non-vacuity, from the producer: exactly the rules conjunct fired, and the two conjuncts an
    // inline comparator would have looked at are IDENTICAL on both sides.
    expect(status.causes).toEqual(['rules-changed'])
    expect(record.fingerprint).toBe(String(FINGERPRINT))
    expect(record.solverCodeVersion).toBe(SOLVER_CODE_VERSION)
    // MUTANT: replace `status.current` with `record.fingerprint === solve.fingerprint &&
    // record.solverCodeVersion === SOLVER_CODE_VERSION`. It reads TRUE here — a constants-only
    // release ships an identical fingerprint and an identical version over a ranking priced under
    // superseded law. `savedRecommendation.ts:23-25` forbids that second comparator by name.
    expect(deriveRecommendationSave({ ...BASE, persist: vault('saved', record), status })).toEqual({
      kind: 'offer',
      route: 'update',
    })
    // …and an ABSENT status is not a quiet yes (the date-route short-circuit hands `undefined`).
    expect(
      deriveRecommendationSave({ ...BASE, persist: vault('saved', recordFor(ready.scenario)), status: undefined }),
    ).toEqual({ kind: 'offer', route: 'update' })
  })

  it('a record for a DIFFERENT crowned arm is not this recommendation’s badge', () => {
    const other = recordFor(ready.scenario, {
      action: { candidateId: 'baseline:proportional:0', policy: 'proportional' },
    })
    const status = statusOf(other)
    expect(status.current, 'the trichotomy alone says yes — the arm identity is the extra conjunct').toBe(true)
    expect(deriveRecommendationSave({ ...BASE, persist: vault('saved', other), status })).toEqual({
      kind: 'offer',
      route: 'update',
    })
  })
})

describe('deriveRecommendationSave — the offer routes', () => {
  it('NO VAULT routes into the CEREMONY (never dead, never mislabelled as an update)', () => {
    // MUTANT: hard-code 'update'. The CTA then omits the escalation the no-vault tap really makes
    // — and that path is every dev seed, the Caddie walk and the fit gate.
    expect(view({ persist: { kind: 'unsaved' } })).toEqual({ kind: 'offer', route: 'ceremony' })
    for (const persist of [vault('saved'), vault('saving'), failedVault()]) {
      expect(deriveRecommendationSave({ ...BASE, persist }), `${persist.kind} has a vault`).toEqual({
        kind: 'offer',
        route: 'update',
      })
    }
  })
})

describe('recommendationSaveView.ts — the structural bans (source-bind, insights 032/081)', () => {
  const src = readFileSync(resolve(__dirname, '../recommendationSaveView.ts'), 'utf8')
  /** The same file with its prose stripped. The bans below are about what the module DOES, and a
   *  comment that names the banned seam in order to forbid it must not read as the seam itself —
   *  except for the developer-text ban, which is deliberately checked against the whole file. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*\/\/.*$/gm, '')

  it('carries NO developer-text member anywhere — the leak ESLint cannot catch is made a TYPE ERROR', () => {
    // The mint's and the codec's refusal strings name fields and schema paths; they are written for
    // a `console`. ESLint's inline-copy selectors match JSXText and attribute Literals only, never
    // a member expression in a JSX expression container, so `{refusal.detail}` would ship silently.
    // The union is bare strings and this file never even names the field — so it cannot be plumbed.
    expect(src, 'no developer-text field may exist here, in code OR in prose that invites one').not.toMatch(/\bdetail\b/i)
  })

  it('carries NO tracked success flag — the claim has exactly one source, and it is the disk', () => {
    expect(code).not.toMatch(/didSave|justSaved|hasSaved|wasSaved|saveSucceeded/i)
    // The saved arm reads the DISK operand and the store's verdict, and nothing else.
    expect(code).toMatch(/persist\.scenario\.savedRecommendation/)
    expect(code).toMatch(/status\?\.current === true/)
    // No session read anywhere on a render path. The gesture owns the ONE session read, and it
    // takes it on the TAP: `getVaultSession()` memoizes `openVaultDb()` (vaultSession.ts:23-30), so
    // a view that called it would open the vault DB on every mount — including the `?seed` /
    // `?preview` routes, where App deliberately skips even the startup probe.
    expect(code).not.toMatch(/vaultSession/)
  })

  it('the card reads ONLY `mintedAt` off the record — R3’s minimal card, made structural', () => {
    // Over `code`, NOT `src`: the header prose at :269-270 contains the literal `record.mintedAt`,
    // so matching the raw file satisfies the non-vacuity guard BY COMMENT ALONE — a card that read
    // nothing off the record at all would still pass. Caught by planting exactly that.
    const fields = [...code.matchAll(/\brecord\.(\w+)/g)].map((m) => m[1])
    expect(fields.length, 'the card does read the record').toBeGreaterThan(0)
    // MUTANT: quote the remembered grade/verdict enums on the card. The ruling keeps them
    // persisted-but-unquoted so the card can grow later with no schema change.
    expect(new Set(fields)).toEqual(new Set(['mintedAt']))
  })
})

// ---- the record card -------------------------------------------------------------------------

/** Sentinel copy — every string is distinguishable, so an order, a swap or a dropped clause is
 *  visible in the assertion rather than hidden behind two similar sentences. The real register
 *  ships from `copy.ts`/`slots`; this fixture stands in for the assembly the caller performs. */
const TEXT: SavedRecordCopy = {
  heading: 'HEADING',
  stillHolds: 'STILL-HOLDS',
  causes: {
    'inputs-changed': 'CAUSE-INPUTS-CHANGED',
    'inputs-unavailable': 'CAUSE-INPUTS-UNAVAILABLE',
    'solver-changed': 'CAUSE-SOLVER-CHANGED',
    'rules-changed': 'CAUSE-RULES-CHANGED',
  },
  savedIn: (year) => `SAVED-IN-${year}`,
  reopenLabel: 'REOPEN-LABEL',
  reopenCostLine: 'REOPEN-COST',
}

/** An epoch-day inside a named calendar year, built from the CALENDAR rather than from the
 *  module's own converter — a year derived through `epochDayToCalendarYear` would make the
 *  assertion agree with the code by construction. */
const dayIn = (year: number): number => Math.floor(Date.UTC(year, 5, 15) / 86_400_000)

describe('savedRecordCardView — the minimal card', () => {
  it('a CURRENT record says it still holds, and names no cause', () => {
    const record = recordFor(ready.scenario)
    const status = statusOf(record)
    expect(status.current).toBe(true)
    const card = savedRecordCardView(status, record, TODAY, TEXT)
    expect(card.standing).toEqual({ kind: 'holds', clauses: ['STILL-HOLDS'] })
    expect(card.heading).toBe('HEADING')
  })

  it('EVERY cause that holds is composed, in the producer’s declaration order (insight 101)', () => {
    // A real three-cause status: no fresh fingerprint (fail-closed), an older ranking build, and an
    // era one tax year behind. MUTANT: render `causes[0]` only — this reds on the two it drops.
    const record = { ...staleEraRecord(), solverCodeVersion: SOLVER_CODE_VERSION - 1 }
    const status = statusOf(record, null)
    expect(status.causes, 'the producer really did report three').toHaveLength(3)
    const card = savedRecordCardView(status, record, TODAY, TEXT)
    expect(card.standing.kind).toBe('superseded')
    // Declaration order (inputs → solver → rules), carried through unsorted and untruncated.
    expect(card.standing.clauses).toEqual(['CAUSE-INPUTS-UNAVAILABLE', 'CAUSE-SOLVER-CHANGED', 'CAUSE-RULES-CHANGED'])
    // The two-cause case, so the order claim is not a one-shot coincidence of the three-cause set.
    const two = statusOf({ ...recordFor(ready.scenario), solverCodeVersion: SOLVER_CODE_VERSION + 1 }, 'a-different-run')
    expect(two.causes).toEqual(['inputs-changed', 'solver-changed'])
    expect(savedRecordCardView(two, record, TODAY, TEXT).standing.clauses).toEqual([
      'CAUSE-INPUTS-CHANGED',
      'CAUSE-SOLVER-CHANGED',
    ])
  })

  it('a BROKEN trichotomy contract renders the quieter card, in BOTH directions (the planted seam)', () => {
    // Neither input below is producible today (`causes` is empty IFF `current`,
    // savedRecommendation.ts:54-61) — which is exactly why the split's behaviour under a broken
    // contract is otherwise unwitnessed, and an unwitnessed fail-closed claim is a comment, not a
    // property. Both are real reports with a DOCTORED verdict, the planted-seam idiom this repo
    // uses for arms that a live run cannot reach.
    const real = statusOf(recordFor(ready.scenario))
    const record = recordFor(ready.scenario)
    // (i) demoted with no reason reported ⇒ never "still holds". MUTANT: key on `clauses.length`.
    const unexplained: SavedRecommendationStatus = { ...real, current: false, causes: [] }
    expect(savedRecordCardView(unexplained, record, TODAY, TEXT).standing).toEqual({
      kind: 'superseded',
      clauses: [],
    })
    // (ii) blessed as current while its own demotion causes sit populated beside it ⇒ the card
    // names them and speaks NOTHING in the present tense. MUTANT: key on `status.current` alone —
    // that ships the cardinal sin, a remembered ranking re-drawn as if it were today's.
    const contradictory: SavedRecommendationStatus = { ...real, current: true, causes: ['rules-changed'] }
    expect(savedRecordCardView(contradictory, record, TODAY, TEXT).standing).toEqual({
      kind: 'superseded',
      clauses: ['CAUSE-RULES-CHANGED'],
    })
  })

  it('the age SUPPRESSES rather than fabricates: the mint year shows only once a calendar year has turned', () => {
    const status = statusOf(recordFor(ready.scenario))
    const old = recordFor(ready.scenario, { mintedAt: dayIn(2024) })
    // MUTANT: read today's year, or the scenario's re-minted `savedAt` — both print a year that is
    // not the memory's age (a re-save resets `savedAt` while the ranking behind it keeps ageing).
    expect(savedRecordCardView(status, old, dayIn(2026), TEXT).savedIn).toBe('SAVED-IN-2024')
    // Same calendar year ⇒ no age to report. MUTANT: always render it — "saved in 2026", read in
    // 2026, is noise dressed as provenance.
    expect(savedRecordCardView(status, recordFor(ready.scenario, { mintedAt: dayIn(2026) }), dayIn(2026), TEXT).savedIn)
      .toBeUndefined()
    // The boundary is the calendar TURN, not 365 days: late December → early January is aged.
    const dec31 = Math.floor(Date.UTC(2025, 11, 31) / 86_400_000)
    const jan1 = Math.floor(Date.UTC(2026, 0, 1) / 86_400_000)
    expect(savedRecordCardView(status, recordFor(ready.scenario, { mintedAt: dec31 }), jan1, TEXT).savedIn).toBe(
      'SAVED-IN-2025',
    )
  })

  it('the re-open label and its COST line are one value, present on both standings (no wiring boolean)', () => {
    // There is no `reopen: boolean` parameter: the predicate that decides whether re-opening is
    // possible is owned one level up, and a flag minted upstream of the wiring decision either
    // ships a dead button or an unreachable arm. The surface renders the control IFF the handler
    // is wired, which makes the label and the onClick structurally inseparable — and the cost line
    // cannot go missing while the label ships.
    const holds = savedRecordCardView(statusOf(recordFor(ready.scenario)), recordFor(ready.scenario), TODAY, TEXT)
    const gone = savedRecordCardView(statusOf(staleEraRecord()), staleEraRecord(), TODAY, TEXT)
    for (const card of [holds, gone]) {
      expect(card.reopen).toEqual({ label: 'REOPEN-LABEL', costLine: 'REOPEN-COST' })
    }
  })

  it('every string on the card came from the register — no verdict enum, no id, no schema path (R3)', () => {
    const record = recordFor(ready.scenario, { mintedAt: dayIn(2024), verdict: { grade: 'just-do-it', subTenthCollapse: false, noChange: true, surplusRegime: true, noDollarRegister: true } })
    const card = savedRecordCardView(statusOf(staleEraRecord()), record, dayIn(2026), TEXT)
    const rendered = [card.heading, ...card.standing.clauses, card.savedIn ?? '', card.reopen.label, card.reopen.costLine]
    const allowed = new Set([
      TEXT.heading,
      TEXT.stillHolds,
      ...Object.values(TEXT.causes),
      TEXT.savedIn(2024),
      TEXT.reopenLabel,
      TEXT.reopenCostLine,
    ])
    for (const line of rendered) {
      expect(allowed.has(line), `“${line}” is not a register string`).toBe(true)
    }
    // The record's own vocabulary never reaches the card, whatever it carries.
    const serialized = JSON.stringify(card)
    for (const leak of ['just-do-it', WINNER_ID, 'taxable-first', 'leave-more', String(FINGERPRINT)]) {
      expect(serialized, `${leak} must not ride the card`).not.toContain(leak)
    }
  })
})
