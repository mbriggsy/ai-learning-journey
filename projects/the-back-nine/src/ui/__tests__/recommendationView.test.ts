import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  NEVER_DEPLETED,
  type Distribution,
  type TaxAwareDistribution,
  type RecommendationGoal,
  type RothConversionPlan,
} from '@shared/model'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { SolvePayload, SolveTokenWithheld } from '@engine/solver/solveEntry'
import type { GradeResult } from '@engine/validation/gradeCalibration'
import { isMortalityKey, lintCopy } from '../copyGuard'
import type { WithheldReason } from '@engine/validation/oracleToken'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import type { SolveAnswer } from '@store/memoryModel'
import type { ConfidenceStatementView } from '../ConfidenceStatement'
import type { BandPlanClockAnchor } from '../bandAnnotations'
import {
  recommendationView,
  withheldReasonText,
  unwitnessableReasonText,
  disclosuresFor,
  DISCLOSURE_ORDER,
  type RecommendedView,
  type WinnerActionView,
} from '../recommendationView'
import { copy, slots } from '../copy'
import {
  formatAbsoluteDollar,
  formatActionableDollar,
  formatBracketPercent,
  formatDeltaDollar,
  formatEnteredDollar,
} from '../money'

/*
 * recommendationView — the U16 §S3a STATES layer. Every payload shape gets a render; the survival
 * context is source-bound to the spine BY REFERENCE (mutant a); every WithheldReason arm renders true +
 * humane, never a bare "unavailable" (mutant c); the runner-up is retained (R23); a payload whose
 * displayed figure disagrees with what ranked routes to a CALM unavailable (the render-path guard).
 */

// ---- fixtures -------------------------------------------------------------------------------------

function distOf(ta: Partial<TaxAwareDistribution>): Distribution {
  const n = (ta.lifetimeTaxPaidReal ?? ta.terminalTaxableReal ?? [0]).length
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

/** An arm whose displayed figure IS the objective statistic on its own distribution (guard-consistent). */
function armFor(
  goal: RecommendationGoal,
  hb: number | undefined,
  id: string,
  policy: SolveArm['policy'],
  ta: Partial<TaxAwareDistribution>,
): SolveArm {
  const dist = distOf(ta)
  return { id, policy, conversion: null, distributionB: dist, headlineStatisticB: headlineStatisticFromDistribution(dist, goal, hb), survivalB: 0.99 }
}

function grade(g: 'just-do-it' | 'coin-flip', subTenthCollapse = false): GradeResult {
  return { grade: g, memberMargins: [{ margin: 0.02, se: 0.001, band: 0.002, beyondBand: true, paths: 16000 }], demotionFired: false, subTenthCollapse }
}

const HB = 0.24

/** A leave-more active recommendation whose winner leaves more than the baseline (positive delta). */
function leaveMoreRec(o: Partial<SolveRecommendation> = {}): SolveRecommendation {
  const goal: RecommendationGoal = 'leave-more'
  const winner = armFor(goal, HB, 'taxable-first', 'taxable-first', { terminalTaxableReal: [400_000, 600_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
  const baseline = armFor(goal, HB, 'proportional', 'proportional', { terminalTaxableReal: [300_000, 400_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
  const runnerUp = armFor(goal, HB, 'bracket-fill', 'bracket-fill', { terminalTaxableReal: [380_000, 560_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
  return {
    kind: 'recommended', goal, heirBracket: HB, seedA: 1, seedB: 2,
    winner, runnerUp, noActionBaseline: baseline,
    rankedIds: ['taxable-first', 'bracket-fill', 'proportional'], prunedScores: [],
    noChange: false, surplusRegime: false,
    grade: grade('just-do-it'), gradeStatistic: 'leave-more', gradeUnavailable: undefined,
    namedDriver: 'sampling-noise-near-tie',
    skewDisclosure: { meanReal: winner.headlineStatisticB, medianReal: winner.headlineStatisticB, p10Real: 0, p90Real: 0, skewDirection: 'symmetric', meanMinusMedianReal: 0 },
    // The DELTA skew defaults SYMMETRIC (qualifier quiet) — each qualifier arm overrides it.
    deltaSkew: { meanReal: 0, medianReal: 0, p10Real: 0, p90Real: 0, skewDirection: 'symmetric', meanMinusMedianReal: 0 },
    withheldConversionLevers: [], disclosedDirectional: [], solverCodeVersion: 1,
    ...o,
  }
}

const committed = (payload: SolvePayload): SolveAnswer => ({ kind: 'committed', payload, fingerprint: 'fp' as SolverRunFingerprint })

const spine: ConfidenceStatementView = {
  kind: 'reading',
  headline: { xOfTen: { value: 9, marginToEdge: 0.03 }, outcomeState: 'over-funded', stateMarginToEdge: 0.02 },
  dollar: { perMonthReal: { value: 500, marginToEdge: 0 }, direction: 'room' },
}

const asRec = (v: ReturnType<typeof recommendationView>): RecommendedView => {
  expect(v.kind).toBe('recommended')
  return v as RecommendedView
}

// ---- the entry states (S2-owned; named here) ------------------------------------------------------

describe('recommendationView — the entry + non-committed states', () => {
  it('idle / blocked / pending / stale / compute-error each render honestly', () => {
    expect(recommendationView({ kind: 'idle' })).toEqual({ kind: 'idle' })
    expect(recommendationView({ kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' })).toEqual({ kind: 'blocked', gap: 'goal-unset' })
    expect(recommendationView({ kind: 'pending', label: 'solving', fingerprint: 'fp' })).toEqual({ kind: 'pending' })
    expect(recommendationView({ kind: 'stale', label: 'inputs-changed' })).toEqual({ kind: 'stale', heading: copy.recommendStaleHeading, body: copy.recommendStaleBody })
    const err = recommendationView({ kind: 'compute-error', reason: 'worker died' })
    expect(err).toEqual({ kind: 'unavailable', note: copy.recommendUnavailable, detail: 'worker died' })
  })
})

// ---- the committed non-recommendation payloads ----------------------------------------------------

describe('recommendationView — refusals / mint-failures route to ONE calm unavailable', () => {
  it('refused / mint-failed / aborted all become the calm retry line, reason hidden', () => {
    // NOTE the absentee: `withheld` USED to sit in this list, and that was the second half of the
    // Tier-0 crash. These three are genuine "something went wrong" states with nothing sayable to
    // offer; the demotion withhold is a DELIBERATE, explainable decision and now renders as one.
    const shapes: SolvePayload[] = [
      { kind: 'refused', reason: 'fingerprint-mismatch', detail: 'stale token', solverCodeVersion: 1 },
      { kind: 'mint-failed', stage: 'oracle', detail: 'wrong-best', solverCodeVersion: 1 },
      { kind: 'aborted', detail: 'superseded', solverCodeVersion: 1 },
    ]
    for (const p of shapes) {
      const v = recommendationView(committed(p))
      expect(v.kind).toBe('unavailable')
      if (v.kind === 'unavailable') {
        expect(v.note, 'the user sees ONE calm line, never the raw reason').toBe(copy.recommendUnavailable)
        expect(v.note).not.toMatch(/fingerprint|wrong-best|superseded/)
      }
    }
  })

  // THE TIER-0 CRASH, UI HALF (fixed 2026-08-03). A well-funded household whose winning strategy
  // converts used to hit a plain throw in `gradeCalibration`, which `solve.ts` rethrows — landing on
  // `compute-error` and the generic card. Widening the engine guard alone would have converted that
  // crash into the IDENTICAL generic card, because this arm returned the same string as "the worker
  // died". Both halves had to ship together, so both are pinned together.
  it('the demotion withhold renders the HUMANE HOLD, never the generic "something went wrong" card', () => {
    const withheld: SolvePayload = {
      kind: 'withheld',
      reason: 'demotion-axis-uncalibrated',
      detail: 'the leave-more dollar-axis conversion-near-tie demotion margin is uncalibrated in U15',
      winnerId: 'w',
      runnerUpId: 'r',
      surplusRegime: true,
      solverCodeVersion: 1,
    }
    const v = recommendationView(committed(withheld))
    expect(v.kind, 'a decision we can explain is never dressed as a malfunction').toBe('held')
    if (v.kind !== 'held') throw new Error('unreachable')
    expect(v.heading).toBe(copy.recommendHeldHeading)
    expect(v.reasons).toEqual([copy.recHoldDemotionAxis])
    // NON-VACUITY: it must be DISTINCT from the generic card, or the fix is cosmetic.
    expect(v.reasons[0]).not.toBe(copy.recommendUnavailable)
    expect(v.reasons[0]).not.toBe(copy.recHoldGeneric)
    // The engine's diagnostic `detail` stays INTERNAL — the household reads the humane reason only.
    expect(v.reasons[0]).not.toMatch(/uncalibrated|dollar-axis|U15|demotion/i)
    // It names the mechanism the household can act on (a conversion) and hedges — recHold* is
    // control-scoped, so require-hedge binds here.
    expect(v.reasons[0]).toMatch(/conversion/i)
    expect(lintCopy(copy.recHoldDemotionAxis, ['require-hedge', 'false-certainty', 'advice-verb', 'superlative'])).toEqual([])
    // AND it must not fabricate a finding the guard never made: the refusal fires on SHAPE, before any
    // margin is read, so claiming the two strategies are close would be an invented result.
    expect(copy.recHoldDemotionAxis, 'never asserts a near-tie the guard did not measure').not.toMatch(
      /\b(neck and neck|close call|near-?tie|dead heat|too close to call)\b/i,
    )
  })

  // THE UNWITNESSABLE HOUSEHOLD (2026-09-04) — `?seed=failing`'s bin. The harness's +1,000 conversion
  // perturbation cannot move a household that is exhausted in year 0 (every recorded vector is zero
  // whatever is converted), so ranking stability is VACUOUS there by construction. It used to arrive as `mint-failed` and render the "try again"
  // line pinned above — a retry that cannot succeed (insight 109's impossible-retry shape). It is a
  // DECISION now, so it renders the humane HOLD, exactly like the demotion withhold.
  it('the unwitnessable household renders the HUMANE HOLD, never the "try again" card (a retry cannot succeed)', () => {
    for (const reason of ['perturbation-inert', 'perturbation-infeasible'] as const) {
      const p: SolvePayload = {
        kind: 'unwitnessable',
        reason,
        detail: 'perturbation arm VACUOUS: nothing moved (insight 029)',
        solverCodeVersion: 1,
      }
      const v = recommendationView(committed(p))
      expect(v.kind, `${reason}: a decision we can explain is never dressed as a malfunction`).toBe('held')
      if (v.kind !== 'held') throw new Error('unreachable')
      expect(v.heading).toBe(copy.recommendHeldHeading)
      expect(v.reasons).toEqual([unwitnessableReasonText(reason)])
      // The interim reason line IS the generic hold — by decision (his sentence is pending), not by
      // fallthrough — and it is DISTINCT from the malfunction card's line.
      expect(v.reasons[0]).toBe(copy.recHoldGeneric)
      expect(v.reasons[0]).not.toBe(copy.recommendUnavailable)
      // The engine's diagnostic stays INTERNAL — the household reads the humane reason only.
      expect(v.reasons[0]).not.toMatch(/VACUOUS|insight|perturbation|029/i)
    }
    // NON-VACUITY: a mint-failed on the very same stability stage still reads the malfunction card —
    // the two bins are distinguishable on the frame, which is the whole point of the arm.
    const mf = recommendationView(committed({ kind: 'mint-failed', stage: 'stability', detail: 'x', solverCodeVersion: 1 }))
    expect(mf.kind).toBe('unavailable')
    // The interim line's readers INCLUDE the already-failing cohort (`?seed=failing`), so it wears the
    // catastrophe net BY NAME (copyGuard.ts) and clears it — plus the control-scope gates every
    // recHold* key wears.
    expect(isMortalityKey('recHoldGeneric'), 'the worst-moment cohort\'s line joins the catastrophe net').toBe(true)
    expect(
      lintCopy(copy.recHoldGeneric, ['catastrophe', 'require-hedge', 'false-certainty', 'advice-verb', 'superlative']),
    ).toEqual([])
  })
})

// ---- the withheld HOLD (Q5) — the NC household is Briggsy's own -----------------------------------

describe('recommendationView — the honesty-gate HOLD names the true reason (Q5)', () => {
  it('a state-certification hold renders the STATE by name, the direction, and refuses to guess — WITHOUT promising a date', () => {
    const payload: SolveTokenWithheld = { kind: 'token-withheld', reasons: [{ kind: 'state-certification-pending', state: 'NC' }], disclosedDirectional: [], solverCodeVersion: 1 }
    const v = recommendationView(committed(payload))
    expect(v.kind).toBe('held')
    if (v.kind === 'held') {
      expect(v.heading).toBe(copy.recommendHeldHeading)
      expect(v.reasons).toHaveLength(1)
      const r = v.reasons[0]!
      expect(r, 'the state is named').toContain('North Carolina')
      expect(r, 'refuses to guess, direction honest').toMatch(/could help or hurt/)
      // THE MONTH PROMISE IS GONE (2026-08-02) AND MUST NOT COME BACK. This sentence used to end
      // "…which we expect around August", naming NC's FY2025-26 certification. S.L. 2026-41 struck
      // the trigger rows that certification fed, so the date became one the app could not keep —
      // and a withhold that promises a date it cannot keep is the calm-but-wrong sin wearing a
      // helpful face. The reason kind survives for a future directional state, whose pin event may
      // have ANY timing, so the copy must commit to none.
      expect(r, 'no month is promised').not.toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/)
      expect(r, 'no year is promised either').not.toMatch(/\b20\d\d\b/)
    }
  })

  it('every WithheldReason arm gets its own humane text — NEVER a bare "unavailable" (mutant c)', () => {
    const arms: WithheldReason[] = [
      { kind: 'state-certification-pending', state: 'PA' },
      { kind: 'medicare-trend-unsourced' },
      { kind: 'aca-unverified', ageDays: 400 },
      { kind: 'rec-relevant-primary-directional', name: 'x' },
      { kind: 'epsilon-uncalibrated', name: 'y' },
    ]
    for (const arm of arms) {
      const text = withheldReasonText(arm)
      expect(text.length, `${arm.kind} has real copy`).toBeGreaterThan(20)
      expect(text.toLowerCase(), `${arm.kind} is never a bare "unavailable"`).not.toBe('unavailable')
    }
    expect(withheldReasonText({ kind: 'state-certification-pending', state: 'PA' })).toContain('Pennsylvania')
    expect(withheldReasonText({ kind: 'medicare-trend-unsourced' })).toBe(copy.recHoldTrend)
    expect(withheldReasonText({ kind: 'aca-unverified', ageDays: 1 })).toBe(copy.recHoldAcaUnverified)
    // fail-closed: a shape outside the union degrades to the generic hold (never blank/crash).
    expect(withheldReasonText({ kind: 'not-a-real-reason' } as unknown as WithheldReason)).toBe(copy.recHoldGeneric)
  })
})

// ---- the committed RECOMMENDATION (active / no-change / surplus) ----------------------------------

describe('recommendationView — the committed beat (Q1 delta-as-hero + source-bind + grade)', () => {
  it('active leave-more: delta-as-hero comparative, delta figure via money.ts, grade word from the flag', () => {
    const payload = leaveMoreRec()
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.mode).toBe('active')
    const expectedDelta = formatDeltaDollar(payload.winner.headlineStatisticB - payload.noActionBaseline.headlineStatisticB)
    expect(v.grade.deltaFigure).toBe(expectedDelta)
    expect(v.grade.heroLine).toBe(slots.recDeltaLeaveMore(expectedDelta))
    expect(v.grade.word).toBe(copy.recommendGradeConfident)
    expect(v.grade.hingeNote, 'just-do-it names no hinge').toBeUndefined()
    expect(v.winnerStrategyKey).toBe('leverPolicyTaxableFirst')
    expect(v.baselineNameplate).toBe(copy.recommendBaselineNameplate)
    // Q7: the baseline nameplate carries NO number (the A↔B residual is never rendered).
    expect(v.baselineNameplate).not.toMatch(/\d/)
  })

  it('pay-less-tax: the surviving pivot ("keeps ~$X more"), NOT the dead "safe either way" absolute', () => {
    const goal: RecommendationGoal = 'pay-less-tax'
    const winner = armFor(goal, undefined, 'bracket-fill', 'bracket-fill', { lifetimeTaxPaidReal: [40_000, 40_000] })
    const baseline = armFor(goal, undefined, 'proportional', 'proportional', { lifetimeTaxPaidReal: [55_000, 55_000] })
    const payload = { ...leaveMoreRec(), goal, heirBracket: undefined, winner, noActionBaseline: baseline, runnerUp: undefined, gradeStatistic: 'pay-less-tax' as const, skewDisclosure: undefined }
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    const expectedDelta = formatDeltaDollar(baseline.headlineStatisticB - winner.headlineStatisticB)
    expect(v.grade.heroLine).toBe(slots.recDeltaPayLessTax(expectedDelta))
    // NOT subsumed by the toBe above — that pins the WIRING (both sides call the same slot), so a
    // reword of the slot TEMPLATE moves both sides together and stays green. This arm reads the
    // rendered text, and is the reason a vetoed phrase cannot enter through the template.
    expect(v.grade.heroLine).not.toMatch(/safe either way/)
    expect(v.skew, 'pay-less-tax has no skew disclosure').toBeUndefined()
  })

  it('Q1 SOURCE-BIND: the survival context IS the spine object by reference (never a parallel claim) — mutant a', () => {
    const v = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine }))
    // reference identity ⇒ level parity is guaranteed (require-hedge alone could not prove this: a
    // parallel survival string could wear a hedge yet desync the LEVEL).
    expect(v.survivalContext).toBe(spine)
    // With no spine (the date route) the beat stands alone — NEVER a fabricated survival claim.
    const noSpine = asRec(recommendationView(committed(leaveMoreRec())))
    expect(noSpine.survivalContext).toBeUndefined()
  })

  it('no-change (winner IS prior OR sub-tenth collapse): NO dollar hero, the "already" compose reassurance', () => {
    const byPrior = asRec(recommendationView(committed(leaveMoreRec({ noChange: true })), { spineConfidence: spine }))
    expect(byPrior.mode).toBe('no-change')
    expect(byPrior.grade.deltaFigure, 'no fabricated dollar hero in no-change').toBeUndefined()
    expect(byPrior.grade.heroLine).toBe(copy.recComposeAlready)
    // the subTenthCollapse source ALSO routes to no-change (a HOT path).
    const bySubTenth = asRec(recommendationView(committed(leaveMoreRec({ grade: grade('just-do-it', true) })), { spineConfidence: spine }))
    expect(bySubTenth.mode).toBe('no-change')
    expect(bySubTenth.grade.deltaFigure).toBeUndefined()
  })

  it('R23: the runner-up is RETAINED (hedged "why" text); a set without a runner-up carries none (stripping fails the suite)', () => {
    const withRunner = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine }))
    expect(withRunner.runnerUp!.why, 'a live solve retains its runner-up text').toBe(copy.recRunnerUpWhy)
    expect(withRunner.runnerUp!.why.length).toBeGreaterThan(0)
    const noRunner = asRec(recommendationView(committed(leaveMoreRec({ runnerUp: undefined })), { spineConfidence: spine }))
    expect(noRunner.runnerUp).toBeUndefined()
  })

  it('coin-flip names WHAT IT HINGES ON from the named driver; the sampling sentinel is sampling-framed', () => {
    const aca = asRec(recommendationView(committed(leaveMoreRec({ grade: grade('coin-flip'), namedDriver: 'aca-enhanced-subsidies' })), { spineConfidence: spine }))
    expect(aca.grade.word).toBe(copy.recommendGradeCoinFlip)
    expect(aca.grade.hingeNote).toBe(copy.recGradeNoteHingeAca)
    const sampling = asRec(recommendationView(committed(leaveMoreRec({ grade: grade('coin-flip'), namedDriver: 'sampling-noise-near-tie' })), { spineConfidence: spine }))
    expect(sampling.grade.hingeNote).toBe(copy.recGradeNoteHingeSampling)
    // a probe name we don't recognize fails CLOSED to the generic hinge, never a fabricated cause.
    const unknown = asRec(recommendationView(committed(leaveMoreRec({ grade: grade('coin-flip'), namedDriver: 'brand-new-probe' })), { spineConfidence: spine }))
    expect(unknown.grade.hingeNote).toBe(copy.recGradeNoteHingeGeneric)
  })

  it('the grade could not be computed ⇒ no word, a calm ungraded caveat, the delta still shows', () => {
    const v = asRec(recommendationView(committed(leaveMoreRec({ grade: undefined, gradeUnavailable: { reason: 'base below the 16k floor' } })), { spineConfidence: spine }))
    expect(v.grade.word).toBeUndefined()
    expect(v.grade.ungradedNote).toBe(copy.recGradeNoteUngraded)
    expect(v.grade.deltaFigure, 'the delta is still honest without a grade').toBeDefined()
  })

  it('§Q6 skew: leave-more UPSIDE skew QUOTES the median in the humane $X.XM dialect; a symmetric skew stays quiet (F-E dialect pin)', () => {
    // A portfolio-scale (≥ $1M) bequest so the ABSOLUTE dialect is visible: mean 5,760,000, median 4,160,000.
    const winner = armFor('leave-more', HB, 'taxable-first', 'taxable-first', { terminalTaxableReal: [4_000_000, 6_000_000], terminalPretaxReal: [1_000_000, 1_000_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const mean = winner.headlineStatisticB // = 5,760,000 (guard: skew mean MUST equal the winner headline)
    const median = mean - 1_600_000 // 4,160,000 — a visibly lower, still-$M typical
    const payload = leaveMoreRec({ winner, skewDisclosure: { meanReal: mean, medianReal: median, p10Real: median - 800_000, p90Real: mean + 1_000_000, skewDirection: 'upside', meanMinusMedianReal: mean - median } })
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    // the quote joins the spine's humane $X.XM prose dialect — NOT full grouped digits.
    expect(v.skew).toEqual({ medianQuote: slots.recSkewMedian(formatAbsoluteDollar(median)) })
    // F-E dialect pin (mutant b — re-typing the median line to formatDeltaDollar full digits reds BOTH):
    expect(v.skew!.medianQuote, 'the median reads "$X.XM", the spine dialect').toMatch(/\$\d+(\.\d+)?M\b/)
    expect(v.skew!.medianQuote, 'never re-typed to full grouped digits').not.toMatch(/\d,\d{3},\d{3}/)
    // a symmetric (mean === median) skew is NOT disclosure-worthy — the leaveMoreRec default.
    expect(asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine })).skew).toBeUndefined()
  })

  it('conversion-only WITHHELD levers render their reason + the coupling caveat (dormant today, built anyway)', () => {
    const lever = { id: 'roth-30k', policy: 'proportional' as const, annualAmountReal: 30_000, startYearOffset: 0, years: 3, reason: { kind: 'medicare-trend-unsourced' } as WithheldReason, anchoredRail: undefined }
    const v = asRec(recommendationView(committed(leaveMoreRec({ withheldConversionLevers: [lever, { ...lever, id: 'roth-20k', annualAmountReal: 20_000 }] })), { spineConfidence: spine }))
    expect(v.withheldConversion, 'the sequencing rec still ships; conversions named-held').toBeDefined()
    expect(v.withheldConversion!.reasons, 'levers sharing a reason dedupe to one line').toEqual([copy.recHoldTrend])
    expect(v.withheldConversion!.coupling).toBe(copy.recHoldCoupling)
  })

  it('the render-path objective≡headline guard routes a LYING payload to a calm unavailable, never a figure', () => {
    const good = leaveMoreRec()
    // Corrupt the displayed winner figure (a seed-A leak / wrong-goal value) — the render must refuse.
    const lying: SolveRecommendation = { ...good, winner: { ...good.winner, headlineStatisticB: good.winner.headlineStatisticB + 999_999 } }
    const v = recommendationView(committed(lying), { spineConfidence: spine })
    expect(v.kind, 'a payload that disagrees with what ranked never renders a lockup').toBe('unavailable')

    // ⚑ THE NEVER-RENDERED LAW ON THE CURSE-BIASED A-SIDE SCORE LIVES HERE — and it must be a
    // SOURCE BIND, because the two things that LOOKED like enforcement cannot fail:
    //   · `SelectionScore.neverRendered` is a type-forced `true`, so every `toBe(true)` on it
    //     passes by construction;
    //   · the wire deliberately CARRIES these by structured clone — `worker.test.ts` proves the
    //     MARKER survives the pack, not that the value is absent (heldOutSeed.ts's docstring
    //     claimed the converse until 2026-08-01).
    // A render-layer file that so much as names `selectionScoreA` is one dereference away from
    // showing a household the in-sample, optimizer's-curse-biased score as if it were the answer.
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = resolve(dir, e.name)
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(p, out)
        } else if (/\.tsx?$/.test(e.name)) out.push(p)
      }
      return out
    }
    const renderSources = [
      ...walk(resolve(__dirname, '../../ui')),
      ...walk(resolve(__dirname, '../../viz')),
    ]
    const leaks = renderSources.filter((f) => readFileSync(f, 'utf8').includes('selectionScoreA'))
    expect(leaks, 'no render-layer file may even NAME the curse-biased A-side selection score').toEqual([])
    // NON-VACUITY (insight 104's starved-control lesson): the SAME scan must find a token the
    // render layer legitimately reads, or a wrong directory / broken walk passes silently.
    const control = renderSources.filter((f) => readFileSync(f, 'utf8').includes('headlineStatisticB'))
    expect(control.length, 'the scan really reaches the render layer — otherwise the sweep above is vacuous').toBeGreaterThan(0)
  })
})

// ---- §S3b — the disclosures adjacent to the delta (R7 nets) --------------------------------------

describe('recommendationView — the disclosures adjacent to the delta', () => {
  it('DISCLOSURE_ORDER is complete over every id the builders declare (a new seat must be ordered too)', () => {
    // Drive every applicable disclosure ON (leave-more + the ACA hinge) so the union is fully exercised.
    const all = disclosuresFor(leaveMoreRec({ namedDriver: 'aca-enhanced-subsidies' }), undefined)
    const ids = all.map((d) => d.id)
    expect(new Set(ids).size, 'no duplicate ids').toBe(ids.length)
    for (const id of ids) expect(DISCLOSURE_ORDER).toContain(id)
    // The render order is respected (a subset of DISCLOSURE_ORDER, in order).
    const orderIndex = ids.map((id) => DISCLOSURE_ORDER.indexOf(id))
    expect(orderIndex).toEqual([...orderIndex].sort((a, b) => a - b))
  })

  it('the ALWAYS disclosures (SS-claim-held-fixed, NIIT) ride EVERY committed recommendation', () => {
    const v = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine }))
    const ids = v.disclosures.map((d) => d.id)
    expect(ids).toContain('ss-claim-fixed')
    expect(ids).toContain('niit')
    for (const d of v.disclosures) expect(d.text.length, `${d.id} has real copy`).toBeGreaterThan(10)
  })

  // The state-tax note is the one household-DEPENDENT member of what used to be the "ALWAYS" set. It
  // says the delta "compares federal tax only" — true off the roster, FALSE for a priced household,
  // where it co-rendered with a spine that had just named their state (found live on `?seed=nc`).
  it('the state-tax scope note rides an UNPRICED household and DROPS for a priced one', () => {
    const payload = leaveMoreRec()
    const unpriced = disclosuresFor(payload, undefined).find((d) => d.id === 'state-tax')
    expect(unpriced, 'off the roster the federal-only scope note is true and must ride').toBeDefined()
    expect(unpriced!.text).toBe(copy.recDiscStateTax)
    // Every member of the shipped roster drops it — not just the one that surfaced the defect. A new
    // PricedState cannot silently join this list: `composeRecStateTaxDisclosure`'s switch is exhaustive.
    for (const state of ['NC', 'PA', 'FL'] as const) {
      expect(
        disclosuresFor(payload, state).find((d) => d.id === 'state-tax'),
        `${state} priced ⇒ "compares federal tax only" is false and must not render`,
      ).toBeUndefined()
    }
    // NON-VACUITY: the drop is surgical — the household still reads its other disclosures.
    const ncIds = disclosuresFor(payload, 'NC').map((d) => d.id)
    expect(ncIds, 'the drop takes the state note ONLY').toContain('ss-claim-fixed')
    expect(ncIds).toContain('niit')
  })

  // THE WIRE, not just the composer: the defect was never a wrong decision — `pricedStateForRun` was
  // computed in Result and simply never handed down, so the builder could not have known. Pin that the
  // view actually FORWARDS its opt, or a future refactor restores the false sentence with tests green.
  it('recommendationView FORWARDS pricedState to the disclosure composer', () => {
    const nc = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine, pricedState: 'NC' }))
    expect(nc.disclosures.map((d) => d.id), 'the opt reaches the builders').not.toContain('state-tax')
    const noOpt = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine }))
    expect(noOpt.disclosures.map((d) => d.id), 'omitting it keeps the shipped not-priced words').toContain('state-tax')
  })

  it('the heir-bracket disclosure rides LEAVE-MORE (names the assumed bracket, r7-editable) — mutant b', () => {
    const payload = leaveMoreRec({ heirBracket: 0.24 })
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    const heir = v.disclosures.find((d) => d.id === 'heir-bracket')
    expect(heir, 'leave-more carries the heir-bracket disclosure (dropping it fails here)').toBeDefined()
    expect(heir!.disposition, 'the heir-bracket seat is r7-editable').toBe('r7-editable')
    expect(heir!.text, 'names the assumed bracket percent').toContain(formatBracketPercent(0.24))
    // pay-less-tax has no heir bracket ⇒ no heir-bracket disclosure (the leave-more-only gate). Drive
    // `disclosuresFor` directly (the pure composer) so the check needs no pay-less-tax-consistent arms.
    const payLessTax: SolveRecommendation = { ...payload, goal: 'pay-less-tax', heirBracket: undefined }
    expect(disclosuresFor(payLessTax, undefined).find((d) => d.id === 'heir-bracket'), 'no heir bracket on pay-less-tax').toBeUndefined()
  })

  it('the ACA SLCSP caveat rides ONLY when the delta leans on ACA (the named-driver signal)', () => {
    const leans = asRec(recommendationView(committed(leaveMoreRec({ namedDriver: 'aca-enhanced-subsidies' })), { spineConfidence: spine }))
    expect(leans.disclosures.find((d) => d.id === 'aca-slcsp'), 'ACA-leaning delta discloses SLCSP/CSR').toBeDefined()
    const noLean = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine }))
    expect(noLean.disclosures.find((d) => d.id === 'aca-slcsp'), 'a non-ACA delta does not').toBeUndefined()
  })
})

// ---- §S3b — the two-arm comparison viz view model ------------------------------------------------

describe('recommendationView — the two-arm viz props', () => {
  it('ACTIVE mode composes the viz: winner/baseline magnitudes + resolved labels; the aria carries all figures', () => {
    const payload = leaveMoreRec()
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.viz, 'an active delta shows the two-arm viz').toBeDefined()
    expect(v.viz!.withoutMagnitude).toBe(payload.noActionBaseline.headlineStatisticB)
    expect(v.viz!.withMagnitude).toBe(payload.winner.headlineStatisticB)
    expect(v.viz!.labels.withLabel).toBe(copy.recVizWithLabel)
    expect(v.viz!.labels.withoutLabel).toBe(copy.recVizWithoutLabel)
    // A2 AT-parity: the delta magnitude is reachable inside the role="img" aria sentence.
    const delta = formatDeltaDollar(payload.winner.headlineStatisticB - payload.noActionBaseline.headlineStatisticB)
    expect(v.viz!.labels.deltaLabel).toBe(`$${delta}`)
    expect(v.viz!.labels.ariaSummary).toContain(delta)
  })

  it('F-E: the viz aria ENDPOINTS join the $X.XM prose dialect (≥ $1M absolutes); the DELTA stays grouped', () => {
    // Portfolio-scale absolutes (≥ $1M): winner mean 5,760,000 vs baseline mean 5,560,000, delta 200,000.
    const winner = armFor('leave-more', HB, 'taxable-first', 'taxable-first', { terminalTaxableReal: [4_000_000, 6_000_000], terminalPretaxReal: [1_000_000, 1_000_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const baseline = armFor('leave-more', HB, 'proportional', 'proportional', { terminalTaxableReal: [3_800_000, 5_800_000], terminalPretaxReal: [1_000_000, 1_000_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const payload = leaveMoreRec({ winner, noActionBaseline: baseline, skewDisclosure: { meanReal: winner.headlineStatisticB, medianReal: winner.headlineStatisticB, p10Real: 0, p90Real: 0, skewDirection: 'symmetric', meanMinusMedianReal: 0 } })
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    const aria = v.viz!.labels.ariaSummary
    // each portfolio ENDPOINT reads the humane "$X.XM" prose, never full grouped digits.
    expect(aria).toContain(`$${formatAbsoluteDollar(winner.headlineStatisticB)}`)
    expect(aria).toContain(`$${formatAbsoluteDollar(baseline.headlineStatisticB)}`)
    expect(aria, 'the endpoints are the $X.XM dialect').toMatch(/\$\d+(\.\d+)?M/)
    // the DELTA between them stays grouped digits (a smaller difference reads naturally grouped).
    const delta = formatDeltaDollar(winner.headlineStatisticB - baseline.headlineStatisticB)
    expect(aria, 'the delta stays grouped digits').toContain(`$${delta}`)
    // the delta label (the bar) is unchanged — grouped digits.
    expect(v.viz!.labels.deltaLabel).toBe(`$${delta}`)
  })

  it('NO-CHANGE mode shows NO viz (never a fabricated ~$0 two-bar delta)', () => {
    const v = asRec(recommendationView(committed(leaveMoreRec({ noChange: true })), { spineConfidence: spine }))
    expect(v.mode).toBe('no-change')
    expect(v.viz, 'the compose reassurance stands alone').toBeUndefined()
  })
})

// ---- §S4 — the runner-up comparison viz (winner vs runner-up, one tap down) -----------------------

describe('recommendationView — the §S4 runner-up comparison viz', () => {
  it('ACTIVE leave-more, winner AHEAD at seed-B: the runner-up carries the two-arm viz (recommended vs runner-up)', () => {
    const payload = leaveMoreRec() // default fixture: winner (576k) displays ahead of runner-up (546k)
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    const rv = v.runnerUp!.viz
    expect(rv, 'the winner displays ahead → the picture ships').toBeDefined()
    // the recommended arm = the winner (its hatch/triangle identity is preserved across both vizzes).
    expect(rv!.withMagnitude).toBe(payload.winner.headlineStatisticB)
    expect(rv!.withoutMagnitude).toBe(payload.runnerUp!.headlineStatisticB)
    expect(rv!.labels.withLabel).toBe(copy.recVizWithLabel)
    expect(rv!.labels.withoutLabel).toBe(copy.recVizRunnerUpLabel)
    // A2 AT-parity: the winner-vs-runner-up GAP is reachable in the delta label AND the role="img" aria.
    const gap = formatDeltaDollar(payload.winner.headlineStatisticB - payload.runnerUp!.headlineStatisticB)
    expect(rv!.labels.deltaLabel).toBe(`$${gap}`)
    expect(rv!.labels.ariaSummary).toContain(gap)
  })

  it('the A-decides / B-displays INVERSION drops the picture (never a chart contradicting the ranking); the hedged TEXT is kept', () => {
    // The runner-up DISPLAYS ahead of the winner at seed-B (a near-tie inverted on the display seed).
    // Drawing "the recommended strategy" with a shorter bar than the runner-up is calm-but-wrong, so
    // the view model suppresses the viz; the honest "came out ahead more often" text is retained.
    const higherRunnerUp = armFor('leave-more', HB, 'bracket-fill', 'bracket-fill', { terminalTaxableReal: [700_000, 900_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const payload = leaveMoreRec({ runnerUp: higherRunnerUp })
    expect(higherRunnerUp.headlineStatisticB, 'the runner-up displays ahead of the winner').toBeGreaterThan(payload.winner.headlineStatisticB)
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.runnerUp!.viz, 'no picture on a display inversion').toBeUndefined()
    expect(v.runnerUp!.why, 'the runner-up is still retained as hedged text').toBe(copy.recRunnerUpWhy)
  })

  it('pay-less-tax orients the gate by LOWER lifetime tax: winner-pays-less ships the picture, winner-pays-more drops it', () => {
    const goal: RecommendationGoal = 'pay-less-tax'
    const winner = armFor(goal, undefined, 'bracket-fill', 'bracket-fill', { lifetimeTaxPaidReal: [40_000, 40_000] })
    const baseline = armFor(goal, undefined, 'proportional', 'proportional', { lifetimeTaxPaidReal: [55_000, 55_000] })
    const runnerUp = armFor(goal, undefined, 'taxable-first', 'taxable-first', { lifetimeTaxPaidReal: [50_000, 50_000] })
    const payload = { ...leaveMoreRec(), goal, heirBracket: undefined, winner, noActionBaseline: baseline, runnerUp, gradeStatistic: 'pay-less-tax' as const, skewDisclosure: undefined }
    const ahead = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(ahead.runnerUp!.viz, 'the winner pays LESS tax → ahead → the picture ships').toBeDefined()
    // a pay-less-tax winner whose tax displays HIGHER than the runner-up's inverts → picture dropped.
    const invWinner = armFor(goal, undefined, 'bracket-fill', 'bracket-fill', { lifetimeTaxPaidReal: [60_000, 60_000] })
    const inverted = { ...payload, winner: invWinner }
    expect(asRec(recommendationView(committed(inverted), { spineConfidence: spine })).runnerUp!.viz, 'winner pays MORE → dropped').toBeUndefined()
  })

  it('NO-CHANGE mode carries NO runner-up viz (the primary viz is suppressed too — never a fabricated compare)', () => {
    const v = asRec(recommendationView(committed(leaveMoreRec({ noChange: true })), { spineConfidence: spine }))
    expect(v.mode).toBe('no-change')
    expect(v.runnerUp!.viz, 'no winner-ahead delta to draw in no-change').toBeUndefined()
    expect(v.runnerUp!.why, 'the runner-up text is still retained').toBe(copy.recRunnerUpWhy)
  })
})

// ---- §S3b — the grade SIGNAL state + the seam-(ii) shape note -------------------------------------

describe('recommendationView — the grade signal state + the ShapeDisclosure seam', () => {
  it('the grade signal glyph is source-bound to the grade FLAG (never re-derived from the word)', () => {
    expect(asRec(recommendationView(committed(leaveMoreRec({ grade: grade('just-do-it') })), { spineConfidence: spine })).grade.signalState).toBe('confident')
    expect(asRec(recommendationView(committed(leaveMoreRec({ grade: grade('coin-flip') })), { spineConfidence: spine })).grade.signalState).toBe('coin-flip')
    expect(asRec(recommendationView(committed(leaveMoreRec({ grade: undefined })), { spineConfidence: spine })).grade.signalState).toBe('ungraded')
  })

  it('SEAM (ii): the ShapeDisclosure note lights from the payload’s OWN disclosedDirectional (not an empty default)', () => {
    // The FIXTURE defaults to disclosedDirectional: [] — the real mint is non-empty on any
    // default-assumptions run (methodology.productionMarket + survivorSpendingRatio, both live
    // directional substrate; corrected 2026-08-20). This arm proves the empty case stays quiet.
    expect(asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine })).grade.shapeNote).toBeUndefined()
    // The day a substrate ships directional, the note lights from the figure’s OWN disclosure (the hawk
    // phasing law: the figure and its disclosure land together, never fed from an empty default).
    const withSubstrate = leaveMoreRec({ disclosedDirectional: ['medicare-part-b-trend'] })
    expect(asRec(recommendationView(committed(withSubstrate), { spineConfidence: spine })).grade.shapeNote).toBe(copy.recGradeNoteShape)
  })
})

// ---- F1 — the winner-vs-baseline seed-B display inversion (wall #1's render corollary) ------------

describe('recommendationView — the A-decides / B-displays inversion suppresses the fabricated dollar hero', () => {
  it('leave-more, winner DISPLAYS BEHIND the no-action baseline at seed-B: NO dollar hero, NO viz, the honest compose register', () => {
    // The seed-A-crowned winner shows a SMALLER bequest than the baseline at seed-B (a near-tie inverted
    // on the display seed). "keeps ~$X more" here would sign-strip a NEGATIVE advantage into a fabricated
    // positive claim, and a winner-ahead bar would contradict the ranking — both calm-but-wrong.
    const higherBaseline = armFor('leave-more', HB, 'proportional', 'proportional', {
      terminalTaxableReal: [900_000, 1_100_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0],
    })
    const payload = leaveMoreRec({ noActionBaseline: higherBaseline })
    expect(payload.winner.headlineStatisticB, 'the winner displays BEHIND the baseline').toBeLessThan(payload.noActionBaseline.headlineStatisticB)
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    // routed to the honest no-dollar register — winner and baseline are display-indistinguishable.
    expect(v.mode).toBe('no-change')
    expect(v.grade.deltaFigure, 'no fabricated dollar magnitude').toBeUndefined()
    expect(v.grade.heroLine, 'the "already on a strong path" reassurance, never "keeps ~$X more"').toBe(copy.recComposeAlready)
    expect(v.grade.heroLine).not.toMatch(/more/)
    // no primary viz (so no positive winner-ahead aria claim) AND no runner-up picture on the inversion.
    expect(v.viz, 'no fabricated winner-ahead bars / positive aria').toBeUndefined()
    expect(v.runnerUp?.viz, 'no runner-up picture in the no-dollar register').toBeUndefined()
    expect(v.runnerUp?.why, 'the runner-up TEXT is still retained (R23)').toBe(copy.recRunnerUpWhy)
  })

  it('pay-less-tax, winner PAYS MORE tax than the baseline at seed-B: same inversion suppression (goal-oriented)', () => {
    const goal: RecommendationGoal = 'pay-less-tax'
    const winner = armFor(goal, undefined, 'bracket-fill', 'bracket-fill', { lifetimeTaxPaidReal: [62_000, 62_000] }) // pays MORE
    const baseline = armFor(goal, undefined, 'proportional', 'proportional', { lifetimeTaxPaidReal: [45_000, 45_000] }) // pays less
    const payload = { ...leaveMoreRec(), goal, heirBracket: undefined, winner, noActionBaseline: baseline, runnerUp: undefined, gradeStatistic: 'pay-less-tax' as const, skewDisclosure: undefined }
    expect(payload.winner.headlineStatisticB, 'the winner pays MORE (displays behind)').toBeGreaterThan(payload.noActionBaseline.headlineStatisticB)
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.mode).toBe('no-change')
    expect(v.grade.deltaFigure).toBeUndefined()
    expect(v.grade.heroLine).toBe(copy.recComposeAlready)
    expect(v.viz).toBeUndefined()
  })

  it('CONTROL: winner DISPLAYS AHEAD ⇒ the normal active delta-as-hero path is unchanged (the guard is scoped to real inversions)', () => {
    const payload = leaveMoreRec() // default: winner ahead of baseline
    expect(payload.winner.headlineStatisticB).toBeGreaterThan(payload.noActionBaseline.headlineStatisticB)
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    const expectedDelta = formatDeltaDollar(payload.winner.headlineStatisticB - payload.noActionBaseline.headlineStatisticB)
    expect(v.mode).toBe('active')
    expect(v.grade.deltaFigure).toBe(expectedDelta)
    expect(v.grade.heroLine).toBe(slots.recDeltaLeaveMore(expectedDelta))
    expect(v.viz, 'the active two-arm viz still ships').toBeDefined()
  })
})

// ---- the ZERO-COLLAPSE sibling: a winner-ahead delta that FORMATS to $0 (no zero-floor) ------------

describe('recommendationView — a winner-ahead delta that formats to $0 routes to the no-dollar register', () => {
  it('leave-more: winner DISPLAYS AHEAD but the seed-B delta rounds to a formatted $0 ⇒ NO "$0 more" hero, NO viz, the compose register', () => {
    // The winner leads the baseline by $40 at seed-B — a REAL survival winner (not the prior, not sub-tenth,
    // and winnerDisplaysAhead is TRUE so this is NOT the inversion arm) — but formatDeltaDollar has no
    // zero-floor: $40 rounds to '0'. "Leaves about $0 more" is an absurd active claim (calm-but-wrong).
    // Baseline mean = default winner mean (576,000) − 40; only the baseline is overridden so the default
    // skewDisclosure.meanReal still equals the (untouched) winner headline (the objective≡headline guard).
    const nearTieBaseline = armFor('leave-more', HB, 'proportional', 'proportional', {
      terminalTaxableReal: [499_960, 499_960], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0],
    })
    const payload = leaveMoreRec({ noActionBaseline: nearTieBaseline })
    const delta = payload.winner.headlineStatisticB - payload.noActionBaseline.headlineStatisticB
    expect(delta, 'the winner displays AHEAD by a hair').toBeGreaterThan(0)
    expect(formatDeltaDollar(delta), 'but the delta formats to a bare $0').toBe('0')
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.mode).toBe('no-change')
    expect(v.grade.deltaFigure, 'no fabricated $0 magnitude').toBeUndefined()
    expect(v.grade.heroLine, 'the "already on a strong path" reassurance, never "…about $0 more"').toBe(copy.recComposeAlready)
    expect(v.grade.heroLine).not.toMatch(/\$?0/)
    expect(v.viz, 'no $0-delta two-bar viz').toBeUndefined()
    expect(v.runnerUp?.viz, 'no runner-up picture in the no-dollar register').toBeUndefined()
  })

  it('MIRROR: an active winner (real primary delta) whose winner-vs-runner-up GAP formats to $0 draws NO runner-up viz', () => {
    // The PRIMARY delta (winner 576k vs baseline 426k = 150,000) does not collapse ⇒ active mode, primary
    // viz ships. But the runner-up is a near-tie: winner leads it by $40 (winnerDisplaysAhead TRUE), which
    // formatDeltaDollar rounds to '0' — a $0-gap two-bar picture is the same absurd compare, so it's dropped.
    const nearTieRunnerUp = armFor('leave-more', HB, 'bracket-fill', 'bracket-fill', {
      terminalTaxableReal: [499_960, 499_960], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0],
    })
    const payload = leaveMoreRec({ runnerUp: nearTieRunnerUp })
    const gap = payload.winner.headlineStatisticB - payload.runnerUp!.headlineStatisticB
    expect(gap, 'the winner leads the runner-up by a hair').toBeGreaterThan(0)
    expect(formatDeltaDollar(gap), 'the gap formats to a bare $0').toBe('0')
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.mode, 'the primary delta (150k) still makes this an active rec').toBe('active')
    expect(v.grade.deltaFigure, 'the primary dollar hero still shows').toBeDefined()
    expect(v.runnerUp!.viz, 'no $0-gap runner-up picture').toBeUndefined()
    expect(v.runnerUp!.why, 'the runner-up TEXT is still retained (R23)').toBe(copy.recRunnerUpWhy)
  })

  it('CONTROL: a delta JUST ABOVE the collapse threshold ($100) still renders the dollar hero (the guard is scoped to real $0 collapses)', () => {
    // $100 is the first magnitude that survives formatDeltaDollar's smallest step ('100', not '0'), so the
    // active delta-as-hero path is unchanged — the guard suppresses only a genuine formatted-$0 collapse.
    const justAboveBaseline = armFor('leave-more', HB, 'proportional', 'proportional', {
      terminalTaxableReal: [499_900, 499_900], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0],
    })
    const payload = leaveMoreRec({ noActionBaseline: justAboveBaseline })
    const delta = payload.winner.headlineStatisticB - payload.noActionBaseline.headlineStatisticB
    expect(delta).toBe(100)
    const expectedDelta = formatDeltaDollar(delta)
    expect(expectedDelta, 'above the threshold ⇒ a non-zero figure').toBe('100')
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.mode).toBe('active')
    expect(v.grade.deltaFigure).toBe(expectedDelta)
    expect(v.grade.heroLine).toBe(slots.recDeltaLeaveMore(expectedDelta))
    expect(v.viz, 'the active two-arm viz still ships').toBeDefined()
  })
})

// ---------------------------------------------------------------------------------------------
// The DELTA hero's median qualification (the median-advantage increment, 2026-07-23): the hero's
// "$X more" is a MEAN of the per-future advantage; when its skew is upside the TYPICAL future
// gains less, and the lockup says so. Reads payload.deltaSkew (the PAIRED winner-vs-baseline
// diffs) — never the leave-more LEVEL channel (arm 7 kills that swap).
// ---------------------------------------------------------------------------------------------
describe('recommendationView — the delta heros median qualification (deltaSkew)', () => {
  const upsideDelta = (medianReal: number, meanReal = 150_000) => {
    // The vacuity lens's latent-trap guard: this helper hardcodes 'upside', so a call with
    // median ≥ mean would mint an INCOHERENT fixture that could green a wrong predicate.
    if (!(meanReal > medianReal)) throw new Error('upsideDelta requires mean > median (upside by definition)')
    return upsideDeltaUnchecked(medianReal, meanReal)
  }
  const upsideDeltaUnchecked = (medianReal: number, meanReal: number) => ({
    meanReal,
    medianReal,
    p10Real: Math.min(0, medianReal),
    p90Real: meanReal * 2,
    skewDirection: 'upside' as const,
    meanMinusMedianReal: meanReal - medianReal,
  })

  it('upside + a positive display-distinct median → the quote, BOTH endpoints in the DELTA dialect', () => {
    // leaveMoreRec's hero delta is exactly 150,000 (mean 576k − 426k) → deltaFigure '150,000'.
    const v = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: upsideDelta(40_000) })), { spineConfidence: spine }))
    expect(v.grade.deltaFigure).toBe('150,000')
    expect(v.grade.deltaQualifier).toBe(slots.recDeltaTypical('150,000', '40,000'))
    // The DELTA dialect (grouped digits — the hero's own ruler), never the $X.XM prose dialect,
    // even at a portfolio-scale median (rule 36: one ruler per axis; the level quote is the $X.XM one).
    const big = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: upsideDelta(1_200_000, 2_400_000) })), { spineConfidence: spine }))
    expect(big.grade.deltaQualifier).toBe(slots.recDeltaTypical('150,000', '1,200,000'))
    expect(big.grade.deltaQualifier).not.toMatch(/\$\d+(\.\d+)?M\b/)
  })

  it('a MATERIALLY negative typical names the setback — never "little or nothing" flooring a real loss (review wf_6f89fe6f-35a P2)', () => {
    // median −$5,000: half the futures sit $5,000-or-more BEHIND — the behind arm quotes it in the
    // delta dialect. The old none-arm here was the optimistic sin inside this very channel.
    const v = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: upsideDelta(-5_000) })), { spineConfidence: spine }))
    expect(v.grade.deltaQualifier).toBe(slots.recDeltaTypicalBehind('150,000', '5,000'))
    expect(v.grade.deltaQualifier).toContain('behind')
  })

  it('a sub-step typical (either side of zero) → the honest no-dollar arm (never a fabricated median dollar)', () => {
    // tiny NEGATIVE (formats to '0'): "little or nothing" is the honest register, not a "$0 behind".
    const tinyNeg = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: upsideDelta(-30) })), { spineConfidence: spine }))
    expect(tinyNeg.grade.deltaQualifier).toBe(slots.recDeltaTypicalNone('150,000'))
    // tiny POSITIVE (formats to '0') routes the SAME honest arm.
    const sub = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: upsideDelta(30) })), { spineConfidence: spine }))
    expect(sub.grade.deltaQualifier).toBe(slots.recDeltaTypicalNone('150,000'))
  })

  it('a median that rounds to the heros own figure adds nothing → quiet (source-bound to the DISPLAYED strings)', () => {
    // 149,600 formats to '150,000' — the same displayed magnitude as the hero.
    const v = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: upsideDelta(149_600) })), { spineConfidence: spine }))
    expect(v.grade.deltaQualifier).toBeUndefined()
  })

  it('downside / symmetric skew stays quiet (the shown mean UNDERSTATES the typical — conservative)', () => {
    const symmetric = asRec(recommendationView(committed(leaveMoreRec()), { spineConfidence: spine }))
    expect(symmetric.grade.deltaQualifier).toBeUndefined()
    const downside = asRec(recommendationView(committed(leaveMoreRec({
      deltaSkew: { meanReal: 150_000, medianReal: 200_000, p10Real: 0, p90Real: 300_000, skewDirection: 'downside', meanMinusMedianReal: -50_000 },
    })), { spineConfidence: spine }))
    expect(downside.grade.deltaQualifier).toBeUndefined()
  })

  it('the no-dollar register (no-change / inversion) carries NO qualifier — nothing to qualify', () => {
    const noChange = asRec(recommendationView(committed(leaveMoreRec({ noChange: true, deltaSkew: upsideDelta(40_000) })), { spineConfidence: spine }))
    expect(noChange.grade.deltaFigure).toBeUndefined()
    expect(noChange.grade.deltaQualifier).toBeUndefined()
    // an absent deltaSkew (no tax lens) is carried honestly — quiet, never a crash.
    const absent = asRec(recommendationView(committed(leaveMoreRec({ deltaSkew: undefined })), { spineConfidence: spine }))
    expect(absent.grade.deltaQualifier).toBeUndefined()
  })

  it('INDEPENDENCE (the level-for-delta swap mutant): an upside LEVEL with a symmetric DELTA fires the level quote and keeps the qualifier quiet', () => {
    const winner = armFor('leave-more', HB, 'taxable-first', 'taxable-first', { terminalTaxableReal: [4_000_000, 6_000_000], terminalPretaxReal: [1_000_000, 1_000_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const mean = winner.headlineStatisticB
    const median = mean - 1_600_000
    const payload = leaveMoreRec({
      winner,
      skewDisclosure: { meanReal: mean, medianReal: median, p10Real: median - 800_000, p90Real: mean + 1_000_000, skewDirection: 'upside', meanMinusMedianReal: mean - median },
      // the DELTA channel stays symmetric — a qualifier that reads the LEVEL channel would fire here.
    })
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.skew, 'the LEVEL quote fires').toBeDefined()
    expect(v.grade.deltaQualifier, 'the DELTA qualifier stays quiet — different vector, different channel').toBeUndefined()
  })
})

// ---- the WINNING-PLAN card (2026-08-05) ------------------------------------------------------------
//
// The card that closes "the recommendation never says what to DO". Its scoping to the ACTIVE register
// IS the correctness argument (the full proof is on `winnerActionView`), so these arms pin the
// CONSEQUENCES of that proof, not merely the strings: the crowned amount floors, the household's own
// amount does not, and the two conversions are compared FIELD BY FIELD, never via `sameDecumulationPlan`.
describe('recommendationView — the winning-plan card (what the crowned plan SETS)', () => {
  const CLOCK: BandPlanClockAnchor = { startCalendarYear: 2026, yearsSincePlanBuilt: 0 }
  const opts = { spineConfidence: spine, planClock: CLOCK }
  const conv = (annualAmountReal: number, startYearOffset: number, years: number): RothConversionPlan => ({
    annualAmountReal,
    startYearOffset,
    years,
  })
  const withConversion = (arm: SolveArm, c: RothConversionPlan | null): SolveArm => ({ ...arm, conversion: c })
  /** The card, asserted present — the arms that expect it ABSENT read `winnerAction` directly. */
  const cardOf = (
    payload: SolveRecommendation,
    o: Parameters<typeof recommendationView>[1] = opts,
  ): WinnerActionView => {
    const card = asRec(recommendationView(committed(payload), o)).winnerAction
    expect(card, 'this arm expects the card to render').toBeDefined()
    if (card === undefined) throw new Error('unreachable')
    return card
  }

  it('names the ORDER with the sequencing sheet’s own shipped label + gloss, never a re-typed strategy name', () => {
    const base = leaveMoreRec()
    const card = cardOf({ ...base, winner: withConversion(base.winner, conv(43_617, 0, 9)) })
    expect(card.orderLabel).toBe(copy.leverPolicyTaxableFirst)
    expect(card.orderGloss).toBe(copy.leverPolicyTaxableFirstHelp)
    // The reused gloss is why no imperative had to be authored: every shipped one is third-person, so
    // it clears the UNIVERSAL advice-verb gate that a "Draw your brokerage down first" would trip.
    expect(lintCopy(card.orderGloss, ['advice-verb'])).toEqual([])
  })

  it('states the crowned conversion through the shipped duration vocabulary — one home, not a second phrasing', () => {
    const base = leaveMoreRec()
    const card = cardOf({ ...base, winner: withConversion(base.winner, conv(43_617, 0, 9)) })
    expect(card.conversionLine).toBe(slots.rothPlanRanked('43,000', 9, 2026, false))
    expect(card.conversionNote, 'the household converts nothing, so nothing is being replaced').toBeUndefined()
  })

  it('the crowned amount ROUNDS DOWN — the hero’s dialect would quote it PAST the rail it was anchored under', () => {
    const base = leaveMoreRec()
    const card = cardOf({ ...base, winner: withConversion(base.winner, conv(43_617, 0, 9)) })
    expect(card.conversionLine).toContain('~$43,000')
    // NON-VACUITY, and the whole reason the actionable dialect exists: the sibling formatter this very
    // surface uses for the hero renders the SAME input as 44,000 — $383 ABOVE the anchor, quoted to a
    // reader who can type it into the Roth lever and cross the cliff the candidate was built under.
    expect(formatDeltaDollar(43_617)).toBe('44,000')
    expect(card.conversionLine, 'the unsafe dialect must never reach this figure').not.toContain('44,000')
  })

  it('the HOUSEHOLD’S own amount renders EXACTLY — flooring their typed figure would be a misquote', () => {
    const base = leaveMoreRec()
    // The winner converts nothing and they do: the recommendation IS the removal. Silence here would
    // leave a card rendering only an order row while looking complete (the `?seed=health` shape, where
    // winner and baseline run the SAME order and the conversion is the entire recommendation).
    const card = cardOf({
      ...base,
      winner: withConversion(base.winner, null),
      noActionBaseline: withConversion(base.noActionBaseline, conv(43_617, 0, 4)),
    })
    expect(card.conversionLine).toBe(slots.rothPlanTakenOut('43,617'))
    expect(card.conversionLine).toContain('~$43,617')
    // NON-VACUITY: the actionable dialect — correct for OUR figure — would have shaved $617 off THEIRS.
    expect(card.conversionLine, 'the reader’s own number is never floored').not.toContain('43,000')
  })

  it('both convert on different schedules: the crowned one REPLACES theirs (applyCandidate strips the base’s)', () => {
    const base = leaveMoreRec()
    // THEIRS IS DELIBERATELY UN-ROUND. The first cut sampled 20,000, which floors to ITSELF — so both
    // dialects returned '20,000' and the assertion proved nothing about which one the note uses
    // (ultramode 2026-08-05, the testing lens). 20,450 separates them.
    const card = cardOf({
      ...base,
      winner: withConversion(base.winner, conv(43_617, 0, 9)),
      noActionBaseline: withConversion(base.noActionBaseline, conv(20_450, 0, 4)),
    })
    expect(card.conversionNote).toBe(slots.rothPlanReplaces('20,450'))
    expect(card.conversionNote, 'their figure is quoted whole, never floored').toContain('~$20,450')
    expect(formatActionableDollar(20_450), 'the dialect the note must NOT use').toBe('20,000')
  })

  it('MUTANT KILLER — a change the two dialects would render IDENTICALLY says nothing about replacing', () => {
    // The crowned amount floors and theirs renders exact, so a rail-anchored $21,900 against a typed
    // $21,000 both display "~$21,000" — and the note would announce a $900/yr change with two identical
    // figures, which is the don't-make-them-think law inverted. Gate on the DISPLAYED strings, the same
    // source-bound discipline `deltaCollapsesToZero` uses one function up.
    const base = leaveMoreRec()
    const card = cardOf({
      ...base,
      winner: withConversion(base.winner, conv(21_900, 0, 9)),
      noActionBaseline: withConversion(base.noActionBaseline, conv(21_000, 0, 4)),
    })
    expect(formatActionableDollar(21_900), 'the two really do collide at display precision').toBe('21,000')
    expect(formatEnteredDollar(21_000)).toBe('21,000')
    expect(card.conversionLine, 'the crowned schedule still states itself').toContain('~$21,000')
    expect(card.conversionNote, 'two identical figures can never carry a replacement claim').toBeUndefined()
  })

  it('MUTANT KILLER — an identical schedule under a different ORDER says nothing about replacing it', () => {
    // `sameDecumulationPlan` short-circuits on POLICY before it reads a single conversion field, so
    // gating the replacement clause on it would announce a Roth change to a household whose conversion
    // is byte-identical and whose withdrawal ORDER is the only thing moving. Winner `taxable-first`,
    // baseline `proportional` — different plans, identical conversions.
    const base = leaveMoreRec()
    const same = conv(20_000, 0, 4)
    const card = cardOf({
      ...base,
      winner: withConversion(base.winner, same),
      noActionBaseline: withConversion(base.noActionBaseline, { ...same }),
    })
    expect(card.conversionLine, 'the crowned schedule still states itself').toBe(
      slots.rothPlanRanked('20,000', 4, 2026, false),
    )
    expect(card.conversionNote, 'nothing about the conversion is changing — so say nothing about it').toBeUndefined()
  })

  it('neither plan converts: the conversion row is OMITTED, never a "none" said to a household that has none', () => {
    const card = cardOf(leaveMoreRec())
    expect(card.conversionLine).toBeUndefined()
    expect(card.conversionNote).toBeUndefined()
    expect(card.orderLabel, 'the order half still answers "by doing what?"').toBe(copy.leverPolicyTaxableFirst)
  })

  it('an AGED vault NEVER says the recommendation has started — a plan nobody adopted began nothing', () => {
    const base = leaveMoreRec()
    // Grid windows always pin `startYearOffset: 0` = the plan's BUILD year, so `offsetHasPassed(0, n>0)`
    // is TRUE on every vault more than a year old — i.e. every ordinary returning household. Reusing
    // `rothPlanEcho` here shipped "started in 2026" for a schedule they had never run (ultramode 2026-08-05,
    // seven lenses); the echo owns that wording because IT describes a plan the household already holds.
    const card = cardOf({ ...base, winner: withConversion(base.winner, conv(43_617, 0, 9)) }, {
      spineConfidence: spine,
      planClock: { startCalendarYear: 2026, yearsSincePlanBuilt: 3 },
    })
    expect(card.conversionLine).toBe(slots.rothPlanRanked('43,000', 9, 2026, true))
    // THE DEFECT, pinned directly: no commencement claim in any tense.
    expect(card.conversionLine, 'nothing has started — they have not adopted this plan').not.toContain('started')
    expect(card.conversionLine, 'and it must not promise a start that is already behind them').not.toContain(
      'starting',
    )
    // …while still carrying the two facts the row exists for, and the plan's own first year.
    expect(card.conversionLine).toContain('~$43,000')
    expect(card.conversionLine).toContain('9 years')
    expect(card.conversionLine).toContain('2026')
    expect(card.conversionLine, 'the build year is never re-based onto the wall clock').not.toContain('2029')
    // NON-VACUITY: the echo's passed arm — the string this used to ship — really does claim a start,
    // so the assertions above are a real choice between two available wordings.
    expect(slots.rothPlanEcho('43,000', 2026, true, 9)).toContain('started in 2026')
  })

  it('a ONE-YEAR window on an aged vault agrees in number — "that year", never "those years" (the at/past-RMD clamp)', () => {
    const base = leaveMoreRec()
    // `conversionWindowFor` (solveAnchor.ts) clamps the window to ≥ 1 year, so every at/past-RMD household
    // ranks a ONE-year schedule — and on an aged vault it renders the PASSED arm, which hardcoded the plural
    // "Those years are counted from…" after a correctly-singular "for 1 year" (shipped until 2026-09-04; no
    // test covered `years: 1, passed: true`).
    const card = cardOf({ ...base, winner: withConversion(base.winner, conv(43_617, 0, 1)) }, {
      spineConfidence: spine,
      planClock: { startCalendarYear: 2026, yearsSincePlanBuilt: 3 },
    })
    expect(card.conversionLine).toBe(slots.rothPlanRanked('43,000', 1, 2026, true))
    expect(card.conversionLine).toContain('for 1 year.')
    expect(card.conversionLine, 'number agreement: one year is never "those years"').not.toContain('years')
    expect(card.conversionLine, 'the one fact the second sentence carries: WHICH year').toContain('That year is 2026')
    // The passed-arm laws hold on the singular arm too: no commencement claim in any tense, and the build
    // year is never re-based onto the wall clock.
    expect(card.conversionLine).not.toContain('started')
    expect(card.conversionLine).not.toContain('starting')
    expect(card.conversionLine).not.toContain('2029')
    // The un-passed singular arm keeps the echo's plain wording (the window sentence is shared).
    expect(slots.rothPlanRanked('43,000', 1, 2026, false)).toBe(
      'Converting ~$43,000 a year for 1 year, starting in 2026.',
    )
  })

  it('a FRESH plan still reads as plainly as the echo did — the fix costs the common case nothing', () => {
    const base = leaveMoreRec()
    const card = cardOf({ ...base, winner: withConversion(base.winner, conv(43_617, 0, 9)) })
    expect(card.conversionLine).toContain('starting in 2026')
  })

  it('NO-CHANGE register: the card does not render, even when the crowned plan converts', () => {
    const base = leaveMoreRec()
    const payload = { ...base, noChange: true, winner: withConversion(base.winner, conv(43_617, 0, 9)) }
    const v = asRec(recommendationView(committed(payload), opts))
    expect(v.mode).toBe('no-change')
    expect(v.winnerAction, 'the hero already says the honest thing there').toBeUndefined()
    expect(v.grade.heroLine).toBe(copy.recComposeAlready)
  })

  it('NO PLAN CLOCK: the card degrades to absent rather than stating a year it cannot know', () => {
    const base = leaveMoreRec()
    const payload = { ...base, winner: withConversion(base.winner, conv(43_617, 0, 9)) }
    const v = asRec(recommendationView(committed(payload), { spineConfidence: spine }))
    expect(v.mode, 'the register is unchanged — only the card drops').toBe('active')
    expect(v.winnerAction).toBeUndefined()
  })

  it('a `custom` winner fails CLOSED — "My own order" can never BE the named recommendation', () => {
    // Unreachable in the engine: `custom` is excluded from SEARCHED_POLICIES, so the only custom
    // candidate is the injected user baseline, and crowning THAT makes `sameDecumulationPlan` compare
    // it with itself ⇒ noChange ⇒ the no-change register. This arm pins the BELT to that proof — were
    // the anchoring ever to move underneath us, rendering a first-person radio caption AS the
    // recommendation would be worse than rendering nothing.
    const base = leaveMoreRec()
    const payload = {
      ...base,
      winner: { ...base.winner, policy: 'custom' as const, drawdownOrder: ['taxable', 'pretax', 'roth'] as const },
    }
    const v = asRec(recommendationView(committed(payload), opts))
    expect(v.mode).toBe('active')
    expect(v.winnerAction).toBeUndefined()
    // …and the un-rendered key really is the first-person caption the card must never speak.
    expect(copy[v.winnerStrategyKey]).toBe(copy.leverPolicyCustom)
    expect(copy.leverPolicyCustom).toMatch(/\bmy\b/i)
  })
})
