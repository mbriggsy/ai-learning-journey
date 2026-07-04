import { describe, it, expect } from 'vitest'
import { copy, slots, staticDisclosures, HEDGE_TOKENS, type CopyKey } from '../copy'
import {
  lintCopy,
  isVerdictKey,
  isMortalityKey,
  isControlKey,
  DIRECTIVE_VERBS,
  type CopyGate,
} from '../copyGuard'

/*
 * copyGuard enumerates the catalog and asserts every entry passes its applicable gates. Three
 * gates are UNIVERSAL (a sure outcome / an advice imperative / a superlative is a sin in EVERY
 * voice); `free-numeral` is scoped to the verdict surface (isVerdictKey — intake carries factual
 * numerals); `catastrophe` is survivor-scoped. The ADVERSARIAL CORPUS below tests the threat CLASS,
 * not the lexicon tokens — it is the regression net that fails loud when the lexicon rots (the gate
 * is a tripwire + net, NOT a proof; the N=1 cold-read is the human oracle). staticDisclosures is
 * OUT by design (proven meaningful below). See copyGuard.ts for the full rationale.
 */

describe('copyGuard — R12 honesty by construction (U7)', () => {
  const entries = Object.entries(copy) as [CopyKey, string][]

  // --- the three UNIVERSAL gates over the whole catalog ---
  it('no catalog string asserts a sure outcome (false-certainty — UNIVERSAL)', () => {
    for (const [k, v] of entries) {
      expect(lintCopy(v, ['false-certainty']), `${k}: "${v}"`).toEqual([])
    }
  })

  it('no catalog string carries an advice imperative (advice-verb — UNIVERSAL)', () => {
    for (const [k, v] of entries) {
      expect(lintCopy(v, ['advice-verb']), `${k}: "${v}"`).toEqual([])
    }
  })

  // --- superlative + free-numeral: verdict surface only. "best" appears legitimately in the
  //     product's framing question ("how do we do it best?") and numerals are factual in intake;
  //     the CROWNING sin and the false-precision sin only bite on the verdict/recommendation copy. ---
  it('verdict/answer copy crowns no superlative and carries no free-numeral claim', () => {
    const verdict = entries.filter(([k]) => isVerdictKey(k))
    expect(verdict.length, 'the verdict subset is non-empty (isVerdictKey works)').toBeGreaterThan(0)
    for (const [k, v] of verdict) {
      expect(lintCopy(v, ['superlative', 'free-numeral']), `${k}: "${v}"`).toEqual([])
    }
  })

  it('survivor + dead-cohort copy carries no catastrophe/alarm lexicon (no "widow’s penalty"; the thin-note stays gentle)', () => {
    const mortality = entries.filter(([k]) => isMortalityKey(k))
    expect(mortality.length, 'there IS mortality-facing copy to guard').toBeGreaterThan(0)
    // control arm: prove the scope extension is live — the dead-cohort note IS now in the gated set.
    expect(
      mortality.some(([k]) => k === 'bandReadoutThinNote'),
      'the dead-cohort thin-note is catastrophe-gated (council 2026-06-28)',
    ).toBe(true)
    for (const [k, v] of mortality) {
      expect(lintCopy(v, ['catastrophe']), `${k}: "${v}"`).toEqual([])
    }
  })

  // --- slots: render with representative args, then scan. Slots are the SANCTIONED numeric channel,
  //     so they are NOT free-numeral scanned; the verdict voice still must hold. Record<keyof typeof
  //     slots, …> makes a new slot without a sample a COMPILE error (no silent no-op — burned/070). ---
  const SLOT_RENDER: Record<keyof typeof slots, string> = {
    questionPosition: slots.questionPosition(3),
    ssClaimAge: slots.ssClaimAge(64),
    ssClaimWindow: slots.ssClaimWindow(2030, 2038),
    fraEcho: slots.fraEcho(803),
    accountSummary: slots.accountSummary('401(k)', 'You', '120,000'),
    accountsTotal: slots.accountsTotal('1,400,000'),
    incomeSummary: slots.incomeSummary('Pension', 'You', '30,000'),
    incomeSurvivorNote: slots.incomeSurvivorNote('Your spouse', 'you', 0.5),
    bandClockAges: slots.bandClockAges(63, 61),
    bandClockTodayDesc: slots.bandClockTodayDesc(63, 61),
    bandClockHorizonDesc: slots.bandClockHorizonDesc(93, 91),
    bandClockWorkStopsDesc: slots.bandClockWorkStopsDesc(64, 62),
    bandClockAgesDesc: slots.bandClockAgesDesc(80, 78),
    bandAtRange: slots.bandAtRange(23, '$420k', '$1.2M', '$780k'),
    bandAtRangeRuin: slots.bandAtRangeRuin(23, '$120k'),
    bandAtRangeGone: slots.bandAtRangeGone(23),
    xOfTen: slots.xOfTen(7),
    xOfTenAtCeiling: slots.xOfTenAtCeiling(),
    dateInYears: slots.dateInYears(8),
    noDateInWindow: slots.noDateInWindow(30),
    withOdds: slots.withOdds('7 of 10'),
    dateTradeoff: slots.dateTradeoff(2, slots.xOfTen(8)),
    ladderOffsetTick: slots.ladderOffsetTick(6),
    ladderMarkAria: slots.ladderMarkAria(6, slots.xOfTen(9), 'crown'),
    noDateHowClose: slots.noDateHowClose(slots.xOfTen(7)),
    dateFloorCovered: slots.dateFloorCovered(4, slots.withOdds(slots.xOfTen(9)), true),
    budgetAnchorLead: slots.budgetAnchorLead('78,000'),
    budgetLinesTarget: slots.budgetLinesTarget('71,500'),
    budgetMedicalCarried: slots.budgetMedicalCarried('6,500'),
    budgetRunningTotal: slots.budgetRunningTotal('70,000'),
    budgetTierSplit: slots.budgetTierSplit('36,000', '42,000'),
    spendBudgetTotal: slots.spendBudgetTotal('78,000'),
    budgetRemoveLine: slots.budgetRemoveLine('Groceries'),
    stepDownNote: slots.stepDownNote(2030),
    oopHint: slots.oopHint('3,000', '3,400'),
    factsMore: slots.factsMore(3),
    verdictRoomClause: slots.verdictRoomClause('430'),
    verdictTrimClause: slots.verdictTrimClause('280'),
    verdictRethinkClause: slots.verdictRethinkClause(),
    verdictHoldClause: slots.verdictHoldClause(),
    verdictSurvivorStepDown: slots.verdictSurvivorStepDown('1,200'),
    // P3·U10 — the two-futures delta readouts (frequency-first, hedge-bearing by construction;
    // the samples double as the require-hedge control corpus below).
    rothDeltaSurvivor: slots.rothDeltaSurvivor(slots.xOfTen(8), slots.xOfTen(6)),
    rothDeltaJoint: slots.rothDeltaJoint(slots.xOfTen(8), slots.xOfTen(7)),
    rothDeltaEven: slots.rothDeltaEven(slots.xOfTen(7)),
    rothStateShift: slots.rothStateShift('Off track', 'On track'),
    rothYearsSecondary: slots.rothYearsSecondary(3, 'more'),
    sequencingDelta: slots.sequencingDelta(slots.xOfTen(8), slots.xOfTen(7)),
    rothPlanEcho: slots.rothPlanEcho('40,000', 2, 5),
    // P3·U11 — the Healthcare sheet's readout slots (require-hedge-swept by their prefixes).
    acaCostStatus: slots.acaCostStatus('June 4, 2026'),
    acaCostStatusEnhanced: slots.acaCostStatusEnhanced('June 4, 2026'),
    acaCostNet: slots.acaCostNet('11,200'),
    acaCostCliff: slots.acaCostCliff(slots.xOfTen(3)),
    acaCostCliffOverCliff: slots.acaCostCliffOverCliff(slots.xOfTen(3), '84,600'),
    dateFloorNotWithin: slots.dateFloorNotWithin(11),
    dateFloorNotWithinEither: slots.dateFloorNotWithinEither(11),
    shadowRateLine: slots.shadowRateLine(34),
    shadowRateHeadroom: slots.shadowRateHeadroom('66,600', '84,600', '18,000'),
    irmaaStepNowBase: slots.irmaaStepNowBase('4,900'),
    irmaaStepNowSurcharged: slots.irmaaStepNowSurcharged('7,300', '2,400'),
    irmaaStepNext: slots.irmaaStepNext('218,000', '150,000', '68,000', '2,300', true),
    healthFigPerYear: slots.healthFigPerYear('8,900'),
    healthFigRoom: slots.healthFigRoom('19,500'),
    healthFigCents: slots.healthFigCents(22),
    healthFigStepAdd: slots.healthFigStepAdd('1,100'),
    subsidyRegimeCostDelta: slots.subsidyRegimeCostDelta('96,000', '128,000'),
  }

  it('every U10 delta-readout slot WEARS a hedge (the control readouts are slot-composed, so the require-hedge sweep must reach the rendered samples here)', () => {
    const deltaSlots = [
      'rothDeltaSurvivor', 'rothDeltaJoint', 'rothDeltaEven', 'rothStateShift',
      'rothYearsSecondary', 'sequencingDelta',
    ] as const
    for (const name of deltaSlots) {
      expect(lintCopy(SLOT_RENDER[name], ['require-hedge']), `${name}: "${SLOT_RENDER[name]}"`).toEqual([])
    }
  })

  it('every slot has a render sample — no silent no-op (burned/070)', () => {
    expect(Object.keys(SLOT_RENDER).sort()).toEqual(Object.keys(slots).sort())
  })

  it('slot outputs hold the verdict voice (no advice / superlative / false-certainty; catastrophe on survivor)', () => {
    for (const [name, rendered] of Object.entries(SLOT_RENDER)) {
      const gates: CopyGate[] = ['false-certainty', 'advice-verb', 'superlative']
      // mortality net (not just survivor): the already-failing rethink clause is catastrophe-gated too.
      if (isMortalityKey(name)) gates.push('catastrophe')
      expect(lintCopy(rendered, gates), `${name}: "${rendered}"`).toEqual([])
    }
  })

  it('verdict money-clauses hardcode no numeral in the template (slot-discipline)', () => {
    const S = '§§§' // a non-numeric sentinel — any digit left is a hardcoded one in the template
    for (const rendered of [
      slots.verdictRoomClause(S),
      slots.verdictTrimClause(S),
      slots.verdictSurvivorStepDown(S),
    ]) {
      expect(lintCopy(rendered, ['free-numeral']), rendered).toEqual([])
    }
    expect(lintCopy(slots.verdictHoldClause(), ['free-numeral'])).toEqual([])
    expect(lintCopy(slots.verdictRethinkClause(), ['free-numeral'])).toEqual([]) // figure-less by construction
  })

  // --- C3 (council 2026-06-29): the work-income field means FULL working-year income (pay +
  //     working-year investment income), NEVER salary-only. Source-bound regression — the killed
  //     Option-A nudge must stay dead and the additive meaning must stay present. This guards the
  //     MEANING; the universal gates above guard the voice. ---
  it('workIncome copy carries Option B (simplified): investment-only ask, no salary echo, disclosed (C3)', () => {
    const investHelp = copy.workInvestmentHelp
    const intro = copy.workIncomeIntro
    const disclosure = copy.workIncomeDisclosure
    // (a) no Option-A salary echo / "just what work pays" anywhere in the work-income copy
    for (const v of [intro, copy.workInvestmentLabel, investHelp, disclosure]) {
      expect(v, 'no salary-echo / "just what work pays" Option-A framing').not.toMatch(
        /usually the same|same as the pay|just what work pays|only what work pays/i,
      )
    }
    // (b) investment income is its OWN named, additive field
    expect(investHelp, 'investment field names interest/dividends/investment').toMatch(/interest|dividends|investment/i)
    // (c) the explicit-none affordance (a blank can never become a silent $0)
    expect(investHelp, 'enter 0 if none — explicit, never a silent skip').toMatch(/\b0\b|none/i)
    // (d) no completeness assertion / no double-count-inviting "everything"
    expect(investHelp, 'asserts no completeness / invites no double-count').not.toMatch(
      /the figure medicare looks at|all of it|everything you/i,
    )
    // (e) the modeled streams stay excluded (KTD-9 no-double-count)
    expect(investHelp, 'still excludes the modeled streams').toMatch(/pension|rental|annuity|alimony/i)
    // (f) the steady-pay simplification is DISCLOSED (conservative-or-disclose)
    expect(disclosure, 'discloses the steady-pay simplification').toMatch(/higher|steady pay/i)
  })

  // --- the ADVERSARIAL COVERAGE CORPUS: the threat CLASS, not the lexicon tokens (burned/070) ---
  // Real-world calm-but-wrong phrasings the gate MUST catch (sourced from the foundation's
  // adversarial review — every one of these bypassed the first draft).
  it('the false-certainty gate catches the assured-outcome + plain-language families (coverage)', () => {
    const mustCatch = [
      // assured-outcome family (review round 1)
      'Set for life.',
      'Your money will outlast you.',
      'There is no chance of running out.',
      'Your money won’t run out.',
      'This money lasts forever.',
      'This plan is bulletproof.',
      'An ironclad retirement.',
      'You can be assured this plan lasts.',
      'You will have more than enough every year.',
      'Your savings never deplete.',
      'There will always be enough.',
      'This plan can’t fail.',
      'You are covered no matter what.',
      'There is no way to outlive this money.',
      // plain-language certainty family (review round 2)
      'Your retirement is secure.',
      'Your money is safe.',
      'This is a safe bet.',
      'Your money will last a lifetime.',
      'You can count on this lasting.',
      'Your nest egg is rock-solid.',
      'You can sleep easy.',
      'A foolproof plan.',
      'This is a slam dunk.',
      'Worry-free retirement.',
      'Never have to worry about money.',
      'You have plenty to spare.',
      'Your income is locked.',
      'The plan holds no matter the market.',
      'You won’t ever run short.',
      // preamble evasions — the negation guard turned against itself (round 2)
      'There is no doubt your money will last forever.',
      'There is no doubt this is bulletproof.',
      'Without a doubt this is set for life.',
      'Make no mistake this plan is bulletproof.',
      'There is no question your money will never run out.',
      'There is no doubt your savings never deplete.',
      'You have nothing to fear and your money lasts forever.',
      'No fee plan and it is guaranteed.',
      'Nothing can stop your guaranteed income from never running out.',
      // round-3: uncontracted internal negation (the corpus blind spot — only the contraction was tested)
      'Your money will not run out.',
      'It will not fail.',
      'Your savings will not deplete.',
      // round-3: more plain-language certainty + quantifier/assertion frames
      'You are comfortably covered for life.',
      'You are covered for life.',
      'Set up for life.',
      'You will be comfortable for the rest of your life.',
      'You will never go broke.',
      'You will never be broke.',
      'You can breathe easy.',
      'You can stop worrying.',
      'No more money worries.',
      'There is zero chance of running out.',
      'There is no possibility of running out.',
      'There is no scenario where you run out.',
      'Money in the bank.',
      'You are home free.',
    ]
    for (const s of mustCatch) {
      expect(lintCopy(s, ['false-certainty']).length, `MUST catch: "${s}"`).toBeGreaterThan(0)
    }
  })

  it('the advice gate catches off-list money verbs, assertive recommendations, and hidden clause breaks', () => {
    const mustCatch = [
      // imperative money verbs (round 1 + 2)
      'Park the surplus in a Roth.',
      'Stash it in a taxable account.',
      'Ladder your conversions.',
      'Harvest losses before December.',
      'Roll the old plan into an IRA.',
      'Draw from the taxable account first.',
      'Spend down the pre-tax bucket first.',
      'Defer claiming Social Security as long as you can.',
      'Front-load conversions in the gap years.',
      'Tap the brokerage first.',
      'Earmark the surplus for a Roth.',
      'Sock away the extra in a taxable account.',
      'Sweep the extra into a Roth.',
      'Shovel the surplus into a Roth.',
      // mid-sentence advice + hidden clause breaks (round 1)
      'Given the brackets, you’ll want to convert to Roth.',
      'There looks to be room, so convert to Roth this year.',
      'Our suggestion: convert to Roth.',
      // assertive recommendations with NO imperative verb (round 2)
      'A Roth conversion makes the most sense here.',
      'The recommendation is to delay Social Security.',
      'Converting to Roth now is wise.',
      'Delaying Social Security is the smart call.',
      'A Roth conversion is the way to go.',
      'Conversions to Roth are advisable here.',
      'Doing Roth conversions in the gap years pays off.',
      // round-3: no-adjective crown + "pays to" / "better off" / "the obvious move" / first-person
      'The play here is to convert.',
      'The move is to convert.',
      'It pays to convert now.',
      'You are better off converting.',
      'The obvious move is to convert.',
      'The clear choice is to convert.',
      'My advice is to convert.',
      'My recommendation is to convert.',
    ]
    for (const s of mustCatch) {
      expect(lintCopy(s, ['advice-verb']).length, `MUST catch: "${s}"`).toBeGreaterThan(0)
    }
  })

  // The most honest hedges a retirement tool can say — the gate MUST NOT flag them (guards the
  // negation logic from regressing into pushing authors toward weaker phrasings).
  it('the negation guard lets honest hedges pass (no false positives on real disclaimers)', () => {
    const mustNotCatch = [
      'Nothing here is certain — the future could go either way.',
      'It is not certain to last.',
      'There are no guarantees in any projection.',
      'Your money might not outlast you.',
      'There won’t always be enough.',
      'We can’t promise the market cooperates.',
      'No projection is ever guaranteed.',
      'This is not a sure thing.',
      'Nothing is risk-free.',
      'There are never any guarantees.',
      'We would never claim this is certain.',
      // round-3 regression guards: dropping 'scenario' from the affirming-strip must NOT re-flag the
      // honest hedge, and the new "covered for life" pattern must stay negation-guarded.
      'There is no scenario where this is certain.',
      'You may not be covered for life.',
      'There is no doubt this could fall short.',
    ]
    for (const s of mustNotCatch) {
      expect(lintCopy(s, ['false-certainty']), `MUST NOT catch: "${s}"`).toEqual([])
    }
  })

  // --- non-vacuous firing controls (each gate provably fires — burned/070) ---
  it('the gate is non-vacuous — planted violations are caught on every gate', () => {
    expect(lintCopy('You should max out your Roth this year.', ['advice-verb']).length).toBeGreaterThan(0)
    expect(lintCopy('Convert to a Roth now.', ['advice-verb']).length).toBeGreaterThan(0)
    expect(lintCopy('We recommend delaying Social Security.', ['advice-verb']).length).toBeGreaterThan(0)
    expect(lintCopy('This is the optimal strategy.', ['superlative']).length).toBeGreaterThan(0)
    expect(lintCopy('Your retirement is guaranteed.', ['false-certainty']).length).toBeGreaterThan(0)
    expect(lintCopy('You have 8 of 10 odds.', ['free-numeral']).length).toBeGreaterThan(0)
    expect(lintCopy('This is the widow’s penalty.', ['catastrophe']).length).toBeGreaterThan(0)
  })

  it('false-certainty flags the CLAIM but not the benign adjective ("term-certain")', () => {
    expect(lintCopy('This outcome is certain.', ['false-certainty']).length, 'is certain → claim').toBeGreaterThan(0)
    expect(lintCopy('It is certain to last.', ['false-certainty']).length, 'certain to → claim').toBeGreaterThan(0)
    expect(lintCopy('a term-certain annuity, say.', ['false-certainty']), 'term-certain is a benign term').toEqual([])
    expect(lintCopy('Only certain accounts need this.', ['false-certainty']), 'certain accounts is benign').toEqual([])
  })

  it('field-operation imperatives are NOT flagged (the allowlisted class — R40-U4)', () => {
    for (const phrase of [
      'Skip this if none applies.',
      'Set an age only if it ends earlier.',
      'Lower it only if part is a tax-free return of basis.',
      'Leave blank to treat it as fully taxable.',
      'Add this account.',
      'Tap again to remove.',
    ]) {
      expect(lintCopy(phrase, ['advice-verb']), phrase).toEqual([])
    }
  })

  // --- scope seam (owned by copyGuard, not a duplicated prefix sniff) ---
  it('isVerdictKey captures the anticipated verdict/recommendation surface, excludes intake', () => {
    for (const k of [
      'verdictHeadline', 'recommendSequencing', 'confidenceStatement', 'strategyLead',
      'outcomeOnTrack', 'answerPending', 'dateFreeToday', 'readoutMain',
      'fuckOffDate', 'workOptionalDate', 'headlineVerdict', // the headline feature — verdict word isn't the prefix
    ]) {
      expect(isVerdictKey(k), `${k} is verdict copy (free-numeral must gate it)`).toBe(true)
    }
    for (const k of [
      'birthYearLabel', 'errSsClaimWindow', 'kind401k', 'incomeColaPctHelp', 'spendHelp',
      'incomeAlimonyDateHelp', // intake "date" key — must NOT match (it carries a factual year)
    ]) {
      expect(isVerdictKey(k), `${k} is intake copy (its factual numerals are legitimate)`).toBe(false)
    }
  })

  it('DIRECTIVE_VERBS includes "validate" — load-bearing for the staticDisclosures-exclusion proof', () => {
    expect(DIRECTIVE_VERBS).toContain('validate')
  })

  it('staticDisclosures is deliberately OUT of the gate — proven meaningful: its directive WOULD trip', () => {
    // copyGuard never enumerates staticDisclosures; this asserts WHY (so the exclusion can't
    // silently become vacuous — burned/070). The R13 line is a legal mandatory directive.
    expect(lintCopy(staticDisclosures.honestLimitsValidate, ['advice-verb']).length).toBeGreaterThan(0)
  })

  // ============================================================================================
  // U10 — the require-hedge gate (the INVERSE shape): a control readout / recommendation headline
  // must WEAR a hedge, so a plan-moving claim is never a bald "buys you 3 years" (R12). The gate is
  // control-SCOPED (isControlKey) — never run over terse honest verdicts ("On track"). Contract #4,
  // docs/plans/3-controls.md. The U10-6 UI strings land the control keys LATER; today the sweep is
  // empty, so the canary + adversarial corpus carry the non-vacuity proof.
  // ============================================================================================

  const controlGates: CopyGate[] = ['false-certainty', 'advice-verb', 'superlative', 'require-hedge']

  it('every control readout passes the ban-gates AND wears a hedge (require-hedge — sweeps when U10-6 lands)', () => {
    for (const [k, v] of entries.filter(([k]) => isControlKey(k))) {
      expect(lintCopy(v, controlGates), `${k}: "${v}"`).toEqual([])
    }
    // slot-rendered control readouts too (the numeric channel — rendered via SLOT_RENDER, as the
    // other loops do). Both sweeps are empty TODAY; the machinery below proves they are not vacuous.
    for (const [name, rendered] of Object.entries(SLOT_RENDER).filter(([name]) => isControlKey(name))) {
      expect(lintCopy(rendered, controlGates), `${name}: "${rendered}"`).toEqual([])
    }
  })

  it('the require-hedge machinery works end-to-end (predicate scope + gate polarity — non-vacuity canary)', () => {
    // predicate: control readouts IN, chart chrome + terse verdicts OUT
    expect(isControlKey('rothDeltaReadout'), 'a roth readout is control-scoped').toBe(true)
    expect(isControlKey('sequencingPolicyNote'), 'a sequencing readout is control-scoped').toBe(true)
    expect(isControlKey('twoFuturesDeltaHeadline'), 'the two-futures delta headline is control-scoped').toBe(true)
    expect(isControlKey('ladderBarLabel'), 'ladder chart chrome is NOT control-scoped').toBe(false)
    expect(isControlKey('bandLegendMedian'), 'band chart chrome is NOT control-scoped').toBe(false)
    expect(isControlKey('outcomeOnTrack'), 'a terse honest verdict wears no forced hedge').toBe(false)
    expect(isControlKey('survivorReadoutEyebrow'), 'an existing survivor readout is NOT swept in').toBe(false)
    // gate polarity: a bald deterministic claim FAILS, a hedged one PASSES
    expect(lintCopy('The conversion saves you three years.', ['require-hedge']).length, 'bald → fail').toBeGreaterThan(0)
    expect(lintCopy('Converting could help in about 8 of 10 futures.', ['require-hedge']), 'hedged → pass').toEqual([])
  })

  it('require-hedge catches bald deterministic control claims (≥8) — the calm-but-wrong family', () => {
    const mustFail = [
      'This conversion buys you 3 years.',
      'Converting saves $40,000.',
      'This strategy wins.',
      'Your taxes will drop.',
      'The Roth conversion adds four years to the plan.',
      'Sequencing taxable first gives you an extra $12,000.',
      'The survivor keeps $1,200 more a month.',
      'This move puts the survivor over the line.',
      'The delta is three years.',
      'Converting now is the difference.',
    ]
    for (const s of mustFail) {
      expect(lintCopy(s, ['require-hedge']).length, `MUST fail (no hedge): "${s}"`).toBeGreaterThan(0)
    }
  })

  it('require-hedge passes properly hedged control readouts (≥8), incl. the "X of 10" frequency frame', () => {
    const mustPass = [
      'Converting could help in about 8 of 10 futures.',
      `The survivor’s money lasts in ${slots.xOfTen(8)} futures instead of ${slots.xOfTen(6)}.`,
      'This looks to be worth roughly a few years longer, around the median.',
      'A conversion may lift the survivor toward steadier ground.',
      'These odds assume today’s plan; a different order can move them.',
      'Sequencing taxable first tends to stretch the taxable bucket.',
      `Converting lands you near ${slots.withOdds(slots.xOfTen(8))}.`,
      'The survivor keeps about ~$1,200 more a month, most likely.',
      'Delaying often leaves a little more room before Medicare.',
      'We estimate the shift is usually small.',
    ]
    for (const s of mustPass) {
      expect(lintCopy(s, ['require-hedge']), `MUST pass (hedged): "${s}"`).toEqual([])
    }
  })

  it('require-hedge is non-vacuous — a hedge-less string always goes red, and the catalog can never empty', () => {
    // With no hedge token present — equivalently, as if HEDGE_TOKENS were EMPTIED (no matcher can
    // ever fire) — the gate flags EVERY string. That is the loud failure an emptied catalog produces,
    // never a silent green (burned/070).
    expect(lintCopy('The conversion changes the plan.', ['require-hedge']).length).toBeGreaterThan(0)
    expect(HEDGE_TOKENS.length, 'the hedge catalog is never empty').toBeGreaterThan(0)
    // Load-bearing proof: the sole hedge token IS what flips the verdict — drop it from the same
    // sentence and it goes red (so a catalog that failed to cover it would wrongly flag honest copy).
    expect(lintCopy('Converting could change the plan.', ['require-hedge']), 'with a hedge → clean').toEqual([])
    expect(lintCopy('Converting changes the plan.', ['require-hedge']).length, 'hedge removed → red').toBeGreaterThan(0)
  })

  it('the hedge catalog already covers honest verdict/plan copy — a future re-scope never rewords it', () => {
    // ladderPlanCaveat is chart chrome (NOT control-scoped today), but were it ever pulled under
    // require-hedge it already wears a hedge ("assume" + "can move them") — the tokens must cover it
    // so the gate never pressures an author to reword honest copy.
    expect(lintCopy(copy.ladderPlanCaveat, ['require-hedge']), copy.ladderPlanCaveat).toEqual([])
    // the verdict magnitude clauses wear theirs too ("looks to be" / "toward").
    expect(lintCopy(slots.verdictRoomClause('430'), ['require-hedge'])).toEqual([])
    expect(lintCopy(slots.verdictTrimClause('280'), ['require-hedge'])).toEqual([])
  })
})
