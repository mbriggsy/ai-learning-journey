/**
 * Act-4 · U17 · S5 — the MINT battery (`store/savedRecommendationMint.ts`).
 *
 * The mint is a PROJECTION, so every arm here is really the same question asked eight ways: does
 * this field come from the producer that decided it, or from something that merely looks like it?
 *
 *   1. FIELD PROVENANCE, with a DISTINGUISHING value per field — the payload's `solverCodeVersion`
 *      is deliberately NOT this build's live constant, the winner's id/policy are deliberately NOT
 *      the runner-up's or the baseline's, and the two goals are exercised in opposite directions.
 *      A mint that read the live constant, the wrong arm, or a hard-coded goal reds; one that read
 *      the payload stays green.
 *   2. THE TWO BICONDITIONALS REFUSE RATHER THAN DEFAULT (both directions each). A withheld grade
 *      must not acquire an invented `subTenthCollapse: false`; a 'custom' winner without an order
 *      must not acquire a defaulted one. Each half-pair is shown to be codec-FATAL, so "the mint
 *      emits the pair whole" is load-bearing rather than decorative.
 *   3. THE `noDollarRegister` DISTINGUISHING CASE, driven through the REAL composer: a seed-B
 *      display INVERSION whose `payload.noChange === false` while `recommendationView`'s own mode is
 *      `'no-change'`. Every re-derivation mutant (`payload.noChange`, and the first-disjunct
 *      `noChange || subTenthCollapse`) answers `false` where the live surface answered `true`.
 *   4. THE PRODUCER'S-OUTPUT FINGERPRINT BIND (insights 080/081). `SolverRunFingerprint` is a BARE
 *      `string` alias, so a mint that persisted a candidate id, a seed, or any other opaque engine
 *      string would COMPILE, LINT, and leave every trichotomy arm green while the record read
 *      `inputs-changed` forever. The type cannot help; a REAL `solverRunFingerprint(...)` round-trip
 *      through mint → encode → decode → `deriveSavedRecommendationStatus` can, and its negative twin
 *      (the candidate id in the fingerprint slot) proves the arm can go red.
 *   5. SOURCE-BIND (insights 032/081): the two functions can both be right while the CALL that binds
 *      them is gone. Deleting the `validateSavedRecommendation` line keeps every behavioural arm
 *      above green and silently re-opens the write-side drop, so the call site is pinned in source.
 *   6. PURITY, in source: no clock token anywhere in the module (`mintedAt` is injected).
 *   7. SYMMETRY: every `record.…` path `deriveSavedRecommendationStatus` reads is a path this mint
 *      actually writes — read out of the READER's source, so a new conjunct that starts reading a
 *      field the mint never writes reds here instead of shipping a permanently-quiet clock.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mintSavedRecommendation } from '../savedRecommendationMint'
import { deriveSavedRecommendationStatus } from '../savedRecommendation'
import { NEVER_DEPLETED, type Distribution, type RecommendationGoal, type TaxAwareDistribution } from '@shared/model'
import { decodeScenario, encodeScenario, validateSavedRecommendation } from '@shared/scenarioCodec'
import { CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import type { GradeResult } from '@engine/validation/gradeCalibration'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { buildSolveRequest } from '@intake/solveDispatch'
import { recommendationView } from '@ui/recommendationView'
import { scenarioFromDraft, currentEpochDay } from '@ui/scenarioFromDraft'
import { exposureForDraft } from '@ui/stalenessExposure'
import { DEV_SEEDS } from '@ui/devSeeds'
import type { ScenarioDraft } from '../memoryModel'
import type { ScenarioV3 } from '@shared/model'

const TODAY = currentEpochDay()
/** The heir bracket every leave-more fixture is scored at (any fixed value — it only has to be the
 *  SAME one the headline statistic is computed with, or the render-path objective guard refuses). */
const HB = 0.24

// ---- fixtures --------------------------------------------------------------------------------

function distOf(ta: Partial<TaxAwareDistribution>): Distribution {
  const n = (ta.terminalTaxableReal ?? ta.lifetimeTaxPaidReal ?? [0]).length
  const zeros = Array<number>(n).fill(0)
  const taxAware: TaxAwareDistribution = {
    lifetimeTaxPaidReal: zeros,
    terminalTaxableReal: zeros,
    terminalPretaxReal: zeros,
    terminalRothReal: zeros,
    terminalHsaReal: zeros,
    terminalTaxableBasisReal: zeros,
    lifetimeNetPremiumReal: zeros,
    lifetimeMedicareCostReal: zeros,
    ...ta,
  }
  return { terminalValuesReal: zeros, depletionYears: Array(n).fill(NEVER_DEPLETED), survivalFraction: 1, taxAware }
}

/** An arm whose DISPLAYED figure IS the objective statistic on its own distribution — so the
 *  render-path guard (`assertObjectiveMatchesHeadline`) passes and arm 3 exercises the real
 *  composer rather than its calm-unavailable degrade path. */
function armFor(
  goal: RecommendationGoal,
  id: string,
  policy: SolveArm['policy'],
  ta: Partial<TaxAwareDistribution>,
  extra: Partial<SolveArm> = {},
): SolveArm {
  const distributionB = distOf(ta)
  return {
    id,
    policy,
    conversion: null,
    distributionB,
    headlineStatisticB: headlineStatisticFromDistribution(distributionB, goal, HB),
    survivalB: 0.99,
    ...extra,
  }
}

function gradeOf(grade: GradeResult['grade'], subTenthCollapse: boolean): GradeResult {
  return {
    grade,
    memberMargins: [{ margin: 0.02, se: 0.001, band: 0.002, beyondBand: true, paths: 16_000 }],
    demotionFired: false,
    subTenthCollapse,
  }
}

const bequest = (terminalTaxableReal: readonly number[]): Partial<TaxAwareDistribution> => ({
  terminalTaxableReal: [...terminalTaxableReal],
  terminalPretaxReal: terminalTaxableReal.map(() => 100_000),
})

/**
 * A leave-more recommendation whose WINNER out-displays the baseline (the ordinary active case).
 *
 * The three arms carry DELIBERATELY DISTINCT ids AND policies: a mint that reached for
 * `runnerUp`/`noActionBaseline` instead of `winner` (a one-word swap that compiles and lints) has to
 * red on both `action.candidateId` and `action.policy`.
 *
 * `solverCodeVersion` is deliberately NOT this build's `SOLVER_CODE_VERSION` — see the arm below.
 */
function activeRec(over: Partial<SolveRecommendation> = {}): SolveRecommendation {
  const goal: RecommendationGoal = 'leave-more'
  const winner = armFor(goal, 'grid:taxable-first:0', 'taxable-first', bequest([400_000, 600_000]))
  const runnerUp = armFor(goal, 'grid:bracket-fill:0', 'bracket-fill', bequest([380_000, 560_000]))
  const noActionBaseline = armFor(goal, 'baseline:proportional:0', 'proportional', bequest([300_000, 400_000]))
  return {
    kind: 'recommended',
    goal,
    heirBracket: HB,
    seedA: 1,
    seedB: 2,
    winner,
    runnerUp,
    noActionBaseline,
    rankedIds: [winner.id, runnerUp.id, noActionBaseline.id],
    prunedScores: [],
    noChange: false,
    surplusRegime: false,
    grade: gradeOf('just-do-it', false),
    gradeStatistic: 'leave-more',
    gradeUnavailable: undefined,
    namedDriver: 'sampling-noise-near-tie',
    // The leave-more skew's mean must BE the winner's displayed headline or the render-path guard
    // refuses (insight 093 — one statistic ranks AND displays).
    skewDisclosure: {
      meanReal: winner.headlineStatisticB,
      medianReal: winner.headlineStatisticB,
      p10Real: 0,
      p90Real: 0,
      skewDirection: 'symmetric',
      meanMinusMedianReal: 0,
    },
    deltaSkew: { meanReal: 0, medianReal: 0, p10Real: 0, p90Real: 0, skewDirection: 'symmetric', meanMinusMedianReal: 0 },
    withheldConversionLevers: [],
    disclosedDirectional: [],
    // NOT the live constant: the provenance arm below needs the two to be distinguishable.
    solverCodeVersion: SOLVER_CODE_VERSION + 7,
    ...over,
  }
}

const FINGERPRINT = 'solver-run-fp/v2:{"fp"=s"stub-for-the-projection-arms"}'

const mintOf = (payload: SolveRecommendation, noDollarRegister = false, mintedAt = TODAY) =>
  mintSavedRecommendation(payload, FINGERPRINT, noDollarRegister, mintedAt)

/** Unwrap an expected-OK mint. It THROWS on refusal (never `!`): an arm that quietly proceeded on a
 *  refusal would be asserting about a record no minter produced. */
function minted(payload: SolveRecommendation, noDollarRegister = false, mintedAt = TODAY) {
  const out = mintOf(payload, noDollarRegister, mintedAt)
  if (!out.ok) throw new Error(`the fixture should mint cleanly — the codec refused it: ${out.detail}`)
  return out.record
}

// ---- 1. field provenance ------------------------------------------------------------------------

describe('the mint — every field comes from the producer that decided it', () => {
  it('carries the injected mintedAt + fingerprint, and the payload’s OWN version / goal / winning arm', () => {
    const payload = activeRec()
    const record = minted(payload, false, TODAY - 40)

    expect(record.mintedAt, 'INJECTED — the module reads no clock').toBe(TODAY - 40)
    expect(record.fingerprint).toBe(FINGERPRINT)

    // THE DISTINGUISHING PAIR: the payload's version is the live constant + 7, so a mint that
    // stamped `SOLVER_CODE_VERSION` reds here. That mutant is not cosmetic — it would make the
    // record's version equal its comparand by construction and conjunct 2 could never fire.
    expect(record.solverCodeVersion).toBe(payload.solverCodeVersion)
    expect(record.solverCodeVersion, 'the RUN’s version, not this build’s').not.toBe(SOLVER_CODE_VERSION)

    // The WINNER's arm — never the runner-up's, never the no-action baseline's (all three differ).
    expect(record.action.candidateId).toBe(payload.winner.id)
    expect(record.action.policy).toBe(payload.winner.policy)
    expect(record.action.candidateId).not.toBe(payload.runnerUp?.id)
    expect(record.action.candidateId).not.toBe(payload.noActionBaseline.id)
    expect(record.action.policy).not.toBe(payload.noActionBaseline.policy)

    expect(record.verdict.noChange).toBe(payload.noChange)
    expect(record.verdict.surplusRegime).toBe(payload.surplusRegime)
  })

  it('the goal is the RUN’s goal, in BOTH directions (a hard-coded goal reds on one of the two)', () => {
    expect(minted(activeRec()).goal).toBe('leave-more')
    // The pay-less-tax twin: the objective reads lifetime tax, so the arms are rebuilt on that axis
    // (a leave-more distribution would fail the render guard and mean nothing here).
    const goal: RecommendationGoal = 'pay-less-tax'
    const winner = armFor(goal, 'grid:bracket-fill:0', 'bracket-fill', { lifetimeTaxPaidReal: [90_000, 110_000] })
    const noActionBaseline = armFor(goal, 'baseline:proportional:0', 'proportional', { lifetimeTaxPaidReal: [140_000, 160_000] })
    const record = minted(
      activeRec({ goal, heirBracket: undefined, winner, runnerUp: undefined, noActionBaseline, gradeStatistic: 'pay-less-tax', skewDisclosure: undefined }),
    )
    expect(record.goal).toBe('pay-less-tax')
  })

  it('the noChange / surplusRegime verdict flags are carried in their OWN directions', () => {
    const record = minted(activeRec({ noChange: true, surplusRegime: true }))
    expect(record.verdict.noChange).toBe(true)
    expect(record.verdict.surplusRegime).toBe(true)
    // …and the false twin, so neither is a hard-coded constant.
    const off = minted(activeRec())
    expect(off.verdict.noChange).toBe(false)
    expect(off.verdict.surplusRegime).toBe(false)
  })

  it('the era is the BUILD’s five stamps — byte-identical to what scenarioFromDraft writes on a real save', () => {
    const record = minted(activeRec())
    const saved = freshSave()
    // The load-bearing bind: the mint and `scenarioFromDraft` must read the SAME producers, or
    // conjunct 3 would fire on a record minted seconds after the save that carries it (insight 022 —
    // a second producer is a clock that lies). Compared against a REAL save, not against the stamp
    // functions this module also calls, so a swapped producer cannot hide behind the tautology.
    expect(record.era).toEqual({
      appDefaultVersion: saved.appDefaultVersion,
      taxVintageDetail: saved.taxVintageDetail,
      stateTaxVintage: saved.stateTaxVintage,
      healthcareVintage: saved.healthcareVintage,
      dateVintage: saved.dateVintage,
    })
    // Non-vacuity: all five are really populated (an era of five `undefined`s would "match" above).
    expect(record.era.appDefaultVersion).toBe(CURRENT_APP_DEFAULT_VERSION)
    expect(record.era.taxVintageDetail.taxYear).toBeGreaterThan(2000)
    expect(record.era.dateVintage.blendSnapshotAsOf.length).toBeGreaterThan(0)
    expect(record.era.healthcareVintage.coverageYear).toBeGreaterThan(2000)
    expect(record.era.stateTaxVintage.ncProfile.length).toBeGreaterThan(0)
  })
})

// ---- 2. the two biconditionals: refuse, never default -------------------------------------------

describe('the mint — the drawdownOrder biconditional REFUSES rather than defaults', () => {
  it('a custom winner carries its OWN order through', () => {
    const goal: RecommendationGoal = 'leave-more'
    const winner = armFor(goal, 'baseline:custom:0', 'custom', bequest([400_000, 600_000]), {
      drawdownOrder: ['pretax', 'roth', 'taxable'],
    })
    const record = minted(activeRec({ winner }))
    expect(record.action.policy).toBe('custom')
    expect(record.action.drawdownOrder).toEqual(['pretax', 'roth', 'taxable'])
  })

  it('a custom winner with NO order is REFUSED — never handed a plausible default order', () => {
    const goal: RecommendationGoal = 'leave-more'
    const winner = armFor(goal, 'baseline:custom:0', 'custom', bequest([400_000, 600_000]))
    const out = mintOf(activeRec({ winner }))
    expect(out.ok, 'half a biconditional is a producer bug named loud, never completed').toBe(false)
    if (out.ok) return
    expect(out.detail).toContain('drawdownOrder')
  })

  it('an order riding a NAMED policy is REFUSED — it would silently not govern', () => {
    const goal: RecommendationGoal = 'leave-more'
    const winner = armFor(goal, 'grid:taxable-first:0', 'taxable-first', bequest([400_000, 600_000]), {
      drawdownOrder: ['pretax', 'roth', 'taxable'],
    })
    const out = mintOf(activeRec({ winner }))
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.detail).toContain('drawdownOrder')
  })

  it('a NON-custom winner emits NO drawdownOrder key at all (absence, not an empty array)', () => {
    const record = minted(activeRec())
    expect(Object.hasOwn(record.action, 'drawdownOrder')).toBe(false)
  })
})

describe('the mint — the grade PAIR lands whole or not at all', () => {
  it('a graded run carries BOTH halves, with the grade’s OWN qualifier value', () => {
    // `subTenthCollapse: true` on purpose: a mint that hard-coded `false` (the "invent a value so
    // the field is always present" mutant) reds here and nowhere else.
    const record = minted(activeRec({ grade: gradeOf('coin-flip', true) }))
    expect(record.verdict.grade).toBe('coin-flip')
    expect(record.verdict.subTenthCollapse).toBe(true)
    expect(minted(activeRec({ grade: gradeOf('just-do-it', false) })).verdict.subTenthCollapse).toBe(false)
  })

  it('a WITHHELD grade emits NEITHER key — no defaulted “coin-flip”, no invented qualifier', () => {
    const record = minted(activeRec({ grade: undefined, gradeUnavailable: { reason: 'b-floor' } }))
    expect(Object.hasOwn(record.verdict, 'grade'), 'absence IS the sentinel (burned/062)').toBe(false)
    expect(Object.hasOwn(record.verdict, 'subTenthCollapse')).toBe(false)

    // NON-VACUITY, both directions: each half-pair is codec-FATAL, so "emit the pair whole" is what
    // keeps the mint valid — not an incidental property of the shape.
    const withOrphanQualifier = { ...record, verdict: { ...record.verdict, subTenthCollapse: false } }
    const orphan = validateSavedRecommendation(withOrphanQualifier)
    expect(orphan.ok, 'a qualifier with no grade is unproducible — the codec refuses it').toBe(false)
    if (!orphan.ok) expect(orphan.detail).toContain('subTenthCollapse')

    const graded = minted(activeRec({ grade: gradeOf('just-do-it', false) }))
    const { subTenthCollapse: _dropped, ...verdictMinusQualifier } = graded.verdict
    const stripped = validateSavedRecommendation({ ...graded, verdict: verdictMinusQualifier })
    expect(stripped.ok, 'a grade with no qualifier is refused too — the biconditional runs both ways').toBe(false)
  })
})

// ---- 3. the noDollarRegister distinguishing case -------------------------------------------------

describe('the mint — noDollarRegister is COPIED from the composed view, never re-derived', () => {
  it('a seed-B display INVERSION: the view speaks in the no-dollar register while payload.noChange is FALSE', () => {
    // The no-action baseline out-displays the seed-A-crowned winner at seed-B (a near-tie inverted
    // on the display seed). `recommendedView`'s register is
    // `isNoChange || !winnerDisplaysAhead || deltaCollapsesToZero` — only the FIRST disjunct is
    // reconstructible from the record, and this payload trips the SECOND. A record minted here is
    // byte-identical to one minted from a live "switch to taxable-first, keeps ~$41k more" surface,
    // so the register has to ride in from the view or the card re-tells a refusal as a switch.
    const goal: RecommendationGoal = 'leave-more'
    const higherBaseline = armFor(goal, 'baseline:proportional:0', 'proportional', bequest([900_000, 1_100_000]))
    const payload = activeRec({ noActionBaseline: higherBaseline })

    // THE CASE IS REAL, not hypothetical — driven through the REAL composer, not a re-typed claim.
    const view = recommendationView({ kind: 'committed', payload, fingerprint: FINGERPRINT })
    expect(view.kind, 'the render guard must not have degraded this to a calm unavailable').toBe('recommended')
    if (view.kind !== 'recommended') return
    expect(view.mode).toBe('no-change')
    expect(payload.noChange, 'the payload flag DISAGREES with the composed register — that is the point').toBe(false)
    expect(payload.grade?.subTenthCollapse, 'and so does the first disjunct’s other half').toBe(false)

    const record = minted(payload, view.mode === 'no-change')
    expect(record.verdict.noDollarRegister).toBe(true)
    // Both re-derivation mutants (`payload.noChange`, and `noChange || subTenthCollapse`) answer
    // FALSE here, so each reds on this line alone.
    expect(record.verdict.noChange).toBe(false)
  })

  it('the register is carried in its OWN direction on an ACTIVE surface too (never a hard-coded true)', () => {
    const payload = activeRec()
    const view = recommendationView({ kind: 'committed', payload, fingerprint: FINGERPRINT })
    expect(view.kind).toBe('recommended')
    if (view.kind !== 'recommended') return
    expect(view.mode, 'the winner displays ahead with a real delta — an active claim').toBe('active')
    expect(minted(payload, view.mode !== 'active').verdict.noDollarRegister).toBe(false)
  })
})

// ---- 4. the producer's-output fingerprint bind ---------------------------------------------------

/** A real, fully-stamped save-ready scenario for the spine-route household every arm below uses. */
function freshSave(draft: ScenarioDraft = solvableDraft()): ScenarioV3 {
  const r = scenarioFromDraft(draft)
  if (!r.ready) throw new Error(`the fixture draft must be save-ready — the codec said: ${r.detail}`)
  return r.scenario
}

/** The retired (spine-route) dev seed, plus the two facts a solve needs: a picked goal and the
 *  spine-minted CRN seed. A saved recommendation is ALWAYS a spine-route household. */
function solvableDraft(): ScenarioDraft {
  return { ...DEV_SEEDS.retired, chosenGoal: 'leave-more', seed: 0xa11ce }
}

/** The REAL run identity for that draft: the same request the store dispatches, fingerprinted
 *  through the engine's own producer — never a hand-typed string. */
function realFingerprint(draft: ScenarioDraft): string {
  const request = buildSolveRequest(draft, TODAY)
  if (typeof request === 'string') throw new Error(`the fixture draft must build a solve request — blocked: ${request}`)
  return solverRunFingerprint(request.base, request.candidates, request.ranking, {
    seedA: request.seedA,
    tieTolerance: request.tieTolerance,
  })
}

describe('the mint — the fingerprint slot carries the RUN IDENTITY, proven against its real producer', () => {
  it('a REAL fingerprint round-trips mint → encode → decode → trichotomy and reads CURRENT', () => {
    const draft = solvableDraft()
    const scenario = freshSave(draft)
    const fingerprint = realFingerprint(draft)

    // NON-VACUITY #1: it really is the engine's product, carrying the engine's OWN schema tag.
    // The tag is EMBEDDED, not a prefix — `canon` sorts object keys, so a real fingerprint opens
    // `{"candidates"=[…]` and the tag rides at the sorted `"fp"` position. (Both this spec's guard
    // and the stub literal at savedRecommendation.test.ts:30 imagine a `solver-run-fp/v2:` PREFIX;
    // no producer has ever emitted one. Asserting the prefix would have pinned a fiction.)
    expect(fingerprint).toContain('"fp"=s"solver-run-fp/v2"')
    expect(fingerprint.startsWith('{"candidates"=')).toBe(true)
    // NON-VACUITY #2: and NOT any hand-typed stub — if a real value ever coincided with one, this
    // whole arm would be pinning a fixture against a fixture.
    expect(fingerprint).not.toBe('solver-run-fp/v2:{"goal"=s"leave-more"}')
    expect(fingerprint).not.toBe(FINGERPRINT)

    // The record must ALSO clear conjunct 2, so this payload runs at the live ranking-code version.
    const payload = activeRec({ solverCodeVersion: SOLVER_CODE_VERSION })
    const out = mintSavedRecommendation(payload, fingerprint, false, TODAY)
    expect(out.ok).toBe(true)
    if (!out.ok) return

    // Through the codec, exactly as a save would write it: the record survives INTACT (a dropped
    // atom here is the write-side silent-loss shape the mint's own validation exists to prevent).
    const decoded = decodeScenario(encodeScenario({ ...scenario, savedRecommendation: out.record }))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.droppedAtoms, 'a minted record must never be a tolerated drop').toEqual([])
    expect(decoded.scenario.schemaVersion).toBe(3)
    if (decoded.scenario.schemaVersion !== 3) return
    const persisted = decoded.scenario.savedRecommendation
    expect(persisted?.fingerprint).toBe(fingerprint)
    if (persisted === undefined) return

    // THE BIND: the SAME real value on both sides of the trichotomy's conjunct 1 reads CURRENT.
    const status = deriveSavedRecommendationStatus({
      record: persisted,
      scenario: decoded.scenario,
      freshFingerprint: fingerprint,
      todayEpochDay: TODAY,
      exposure: exposureForDraft(draft),
    })
    expect(status.causes).toEqual([])
    expect(status.current).toBe(true)
  })

  it('THE NEGATIVE TWIN: persisting the candidate id in the fingerprint slot reads inputs-changed forever', () => {
    // This is the mutant the BARE `string` alias cannot catch — `fingerprint: payload.winner.id`
    // compiles, lints, and leaves every other arm green. It is only visible as a trichotomy that
    // can never say "current" again.
    const draft = solvableDraft()
    const scenario = freshSave(draft)
    const payload = activeRec({ solverCodeVersion: SOLVER_CODE_VERSION })
    const out = mintSavedRecommendation(payload, payload.winner.id, false, TODAY)
    expect(out.ok, 'the codec cannot tell the difference — only this arm can').toBe(true)
    if (!out.ok) return

    const status = deriveSavedRecommendationStatus({
      record: out.record,
      scenario,
      freshFingerprint: realFingerprint(draft),
      todayEpochDay: TODAY,
      exposure: exposureForDraft(draft),
    })
    expect(status.causes).toEqual(['inputs-changed'])
    expect(status.current).toBe(false)
  })
})

// ---- the mint's own refusal is live behaviour, not just a source line ---------------------------

describe('the mint — it refuses its own bad mint before the record can reach a draft', () => {
  it('an epoch-MILLISECOND mintedAt is REFUSED (insight 046 — it is a finite integer reading as year ~55000)', () => {
    const out = mintOf(activeRec(), false, TODAY * 86_400_000)
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.detail).toContain('mintedAt')
  })

  it('an EMPTY fingerprint is REFUSED (a value that can only ever mismatch is a permanent silent memory)', () => {
    const out = mintSavedRecommendation(activeRec(), '', false, TODAY)
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.detail).toContain('fingerprint')
  })
})

// ---- 5/6/7. the source binds ---------------------------------------------------------------------

const MINT_SRC = readFileSync(resolve(__dirname, '../savedRecommendationMint.ts'), 'utf8')

describe('the mint — the source binds the behavioural arms cannot see', () => {
  /**
   * SOURCE-BIND (insights 032/081). Every arm above proves the mint BUILDS a valid record and that
   * `validateSavedRecommendation` REFUSES an invalid one — neither proves the mint still CALLS it.
   * Delete the call and return `{ ok: true, record }` unconditionally: the four refusal arms above
   * red only because those payloads are invalid… and they are, so they would red. The mutant this
   * pins is subtler — a future refactor that keeps the call but stops GATING on it (logging the
   * result, or returning ok before checking) leaves every behavioural arm green while re-opening
   * the write-side silent drop. Bind the ok arm to the validator's own verdict, in source.
   */
  it('the ok arm is GATED on validateSavedRecommendation — it is the module’s only ok: true', () => {
    expect(MINT_SRC).toMatch(/const v = validateSavedRecommendation\(record\)/)
    expect(MINT_SRC, 'the ok arm and the refusal arm are the two branches of the validator’s verdict').toMatch(
      /return v\.ok \? \{ ok: true, record \} : \{ ok: false, detail: v\.detail \}/,
    )
    // …and there is no OTHER way out: the module CONSTRUCTS a success value in exactly one place,
    // and (per the assertion above) that place is the validator's own ternary. A second, ungated
    // early return would red here. (`MintOutcome`'s declaration also spells `ok: true`, which is a
    // TYPE, not an exit — hence matching the whole construction, not the two words.)
    expect(MINT_SRC.match(/\{ ok: true, record \}/g) ?? []).toHaveLength(1)
  })

  it('PURITY: the module reads no clock — mintedAt is injected or it is nothing', () => {
    // A `mintedAt = <clock read>` default would make the mint untestable at a fixed day and would
    // re-stamp an old record's age on a re-save. Banned in source, not by convention.
    expect(MINT_SRC).not.toMatch(/new Date|Date\.now|performance\.now|currentEpochDay|Math\.random/)
    // Non-vacuity: the parameter really is there to be injected.
    expect(MINT_SRC).toMatch(/mintedAt: number/)
  })

  /**
   * SYMMETRY (spec (e)): every field the re-entry trichotomy READS is a field this mint WRITES. Read
   * out of the reader's own source rather than re-typed here, so a new conjunct that starts reading
   * `record.verdict.noChange` (or anything else) fails HERE if the mint does not write it — instead
   * of shipping as a clock that is permanently, silently quiet.
   */
  it('every record.… path deriveSavedRecommendationStatus reads is one the mint writes', () => {
    const readerSrc = readFileSync(resolve(__dirname, '../savedRecommendation.ts'), 'utf8')
    const paths = [...new Set(Array.from(readerSrc.matchAll(/record\.([A-Za-z][A-Za-z.]*)/g), (m) => m[1]!))]
    // Non-vacuity: a regex that silently matched nothing would make this arm unconditionally green.
    expect(paths).toEqual(expect.arrayContaining(['fingerprint', 'solverCodeVersion', 'era.appDefaultVersion']))
    expect(paths.length).toBeGreaterThanOrEqual(7)

    const record: unknown = minted(activeRec())
    for (const path of paths) {
      const value = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], record)
      expect(value, `the trichotomy reads record.${path} — the mint must write it`).not.toBeUndefined()
    }
  })
})
