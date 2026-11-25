import { describe, expect, it } from 'vitest'
import { OUTCOME_STATES } from '@shared/model'
import { spineMedicarePriced } from '@intake/intakeMap'
import { formatActionableDollar, formatBracketPercent, formatDeltaDollar, formatEnteredDollar } from '../../../money'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { composeVerdictStateNote } from '../../../stateTaxDisclosure'
import { recommendationView, type RecommendedView } from '../../../recommendationView'
import { armFigure, goalLeadPremiseHolds, heroWords, rankedList, strategiesView, DEFAULT_HEIR_BRACKET, type StrategiesInput, type StrategiesView, type WinnerView } from '../strategiesView'
import { compactDollars, summaryView } from '../summaryView'
import { armFor, committed, grade, headlineAnswer, leaveMoreRec, payLessRec, record, snap } from './fixtures'

/**
 * Tax → Tax Strategies → Strategies' composer (Act 6 · RC8, the plan's test scenarios): the three-row list and its
 * pruned-figure rule, the shades and the near-tie words, the hero and its skew line, every state, the empty state's
 * blocks, Keep and Try, the working route, the record card's faces, and the goal picker's verdict-gated lead (ported
 * from the deleted `goalLeadGate.test.tsx` and `GoalPicker.test.tsx`).
 */

const RETIRED = DEV_SEEDS.retired
const bequestOf = (taxable: [number, number]) => ({ terminalTaxableReal: taxable, terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
const base = (o: Partial<StrategiesInput> = {}): StrategiesInput => ({
  snapshot: snap(RETIRED, headlineAnswer(RETIRED)),
  picked: { goal: 'leave-more', heirBracket: DEFAULT_HEIR_BRACKET },
  save: { kind: 'none' },
  readOnly: false,
  todayEpochDay: 20_400,
  wallCalendarYear: RETIRED.startCalendarYear,
  repick: false,
  ...o,
})
const solved = (payload = leaveMoreRec(), o: Partial<StrategiesInput> = {}) => base({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), committed(payload)), ...o })
const solveView = (v: StrategiesView) => {
  if (v.kind !== 'solve') throw new Error(`expected the solve page, got ${v.kind}`)
  return v
}
const winnerOf = (v: StrategiesView): WinnerView => {
  const w = solveView(v).winner
  if (w === undefined) throw new Error('no Winner card')
  return w
}

describe('Strategies: the ranked list (three rows, the rest counted, never drawn)', () => {
  it('holds exactly the winner, the runner-up and the baseline, each with its levers and its seed-B figure, then the line naming the others', () => {
    const p = leaveMoreRec()
    const list = winnerOf(strategiesView(solved(p))).list!
    expect(list.rows.map((r) => r.role)).toEqual(['winner', 'runner-up', 'baseline'])
    expect(list.rows.map((r) => r.value)).toEqual([p.winner, p.runnerUp!, p.noActionBaseline].map((a) => slots.taxStratValue(formatDeltaDollar(a.headlineStatisticB))))
    expect(list.rows[0]!.levers).toEqual([copy.leverPolicyTaxableFirst, slots.taxStratRothRow(formatActionableDollar(21_900), 5)])
    expect(list.rows[2]!.levers).toEqual([copy.leverPolicyProportional, copy.taxStratNoConversion])
    // Five ranked, three shown: 'pruned-a' ranks above your plan today and 'pruned-b' below it, so the line says both
    // (never "all ranked below these", which is false about 'pruned-a').
    expect(list.others).toBe(slots.taxStratOthersAbove(1, 1))
    // None of the unshown above your plan today: the plain count.
    const allBelow = leaveMoreRec({ rankedIds: [p.winner.id, p.runnerUp!.id, p.noActionBaseline.id, 'pruned-a', 'pruned-b'] })
    expect(rankedList(allBelow, false).others).toBe(slots.taxStratOthers(2))
    // Two above, none below.
    const allAbove = leaveMoreRec({ rankedIds: [p.winner.id, p.runnerUp!.id, 'pruned-a', 'pruned-b', p.noActionBaseline.id] })
    expect(rankedList(allAbove, false).others).toBe(slots.taxStratOthersAbove(2, 0))
  })

  it('carries no pruned candidate’s id, levers or score anywhere in the view (a planted pruned row fails), and no rank number', () => {
    const view = strategiesView(solved())
    const text = JSON.stringify(view)
    expect(text).not.toContain('pruned-a')
    expect(text).not.toContain('pruned-b')
    expect(text).not.toContain('selectionScore')
    const list = winnerOf(view).list!
    for (const row of list.rows) {
      expect(Object.keys(row)).not.toContain('rank')
      expect(row.name, 'a row names its strategy, never a position').not.toMatch(/^\s*#?\d/)
    }
  })

  it('shades follow the displayed value, best for the goal darkest; tied printed figures share a shade', () => {
    const p = leaveMoreRec()
    expect(rankedList(p, false).rows.map((r) => r.shade)).toEqual([0, 1, 2])
    // A runner-up that prints the winner's figure shares its shade (and, printing the same, carries no "prints higher" note).
    const tied = leaveMoreRec({ runnerUp: armFor('leave-more', 'bracket-fill|grid|0', 'bracket-fill', { terminalTaxableReal: [399_000, 599_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] }) })
    const rows = rankedList(tied, false).rows
    expect(rows[0]!.value).toBe(rows[1]!.value)
    expect(rows.map((r) => r.shade)).toEqual([0, 0, 2])
    expect(rows[1]!.note).toBeUndefined()
    // Pay less tax: the LOWEST figure is the best, darkest.
    expect(rankedList(payLessRec(), true).rows.map((r) => r.shade)).toEqual([0, 1, 2])
  })

  it('a near-tie (a close-call grade on the sampling-noise driver) is said in words on both top rows; a confident lean says nothing', () => {
    const near = winnerOf(strategiesView(solved(leaveMoreRec({ grade: grade('coin-flip') })))).list!
    expect(near.rows.map((r) => r.nearTie)).toEqual([copy.taxStratRowNearTie, copy.taxStratRowNearTie, undefined])
    const sure = winnerOf(strategiesView(solved())).list!
    expect(sure.rows.every((r) => r.nearTie === undefined)).toBe(true)
  })

  it('on the survival axis (the plan is not over-funded) a near-tie says it is the ODDS that are too close to call, never the dollar figures beside it', () => {
    const near = winnerOf(strategiesView(solved(leaveMoreRec({ grade: grade('coin-flip'), gradeStatistic: 'survival' })))).list!
    expect(near.rows.map((r) => r.nearTie)).toEqual([copy.taxStratRowNearTieOdds, copy.taxStratRowNearTieOdds, undefined])
  })

  it('a runner-up whose figure beats the recommended one’s in the goal’s direction says why it still ranks second', () => {
    // Leave more: the runner-up prints a HIGHER bequest than the recommended strategy, and is shaded darkest.
    const higher = leaveMoreRec({ runnerUp: armFor('leave-more', 'bracket-fill|grid|0', 'bracket-fill', bequestOf([700_000, 900_000])) })
    const rows = rankedList(higher, false).rows
    expect(rows[1]!.shade, 'the runner-up prints the best figure').toBe(0)
    expect(rows.map((r) => r.note)).toEqual([undefined, slots.recRunnerUpAheadHere(true), undefined])
    // Pay less tax: the runner-up prints a LOWER cost.
    const lower = payLessRec({ runnerUp: armFor('pay-less-tax', 'taxable-first|grid|0', 'taxable-first', { lifetimeTaxPaidReal: [30_000, 30_000] }) })
    expect(rankedList(lower, true).rows.map((r) => r.note)).toEqual([undefined, slots.recRunnerUpAheadHere(false), undefined])
    // The usual order: no note on any row.
    expect(rankedList(leaveMoreRec(), false).rows.every((r) => r.note === undefined)).toBe(true)
    expect(rankedList(payLessRec(), true).rows.every((r) => r.note === undefined)).toBe(true)
  })

  it('your plan today’s Roth conversion is quoted by its amount alone, never its unscreened window', () => {
    // 40 years typed on a shorter horizon: a quoted length would name years nothing was priced over.
    const own = leaveMoreRec({ noActionBaseline: armFor('leave-more', 'proportional|user|0', 'proportional', bequestOf([300_000, 400_000]), { annualAmountReal: 12_345, startYearOffset: 3, years: 40 }) })
    const rows = rankedList(own, false).rows
    expect(rows[2]!.levers).toEqual([copy.leverPolicyProportional, slots.taxStratRothRowOwn(formatEnteredDollar(12_345))])
    expect(rows[2]!.levers.join(' ')).not.toMatch(/\d+ years?\b|\b20\d\d\b/)
    // The compared strategies' rows keep their own words.
    expect(rows[0]!.levers).toEqual([copy.leverPolicyTaxableFirst, slots.taxStratRothRow(formatActionableDollar(21_900), 5)])
  })

  it('a runner-up that IS the baseline is one row, named as both', () => {
    const p = leaveMoreRec()
    const list = rankedList(leaveMoreRec({ runnerUp: p.noActionBaseline }), false)
    expect(list.rows.map((r) => r.name)).toEqual([copy.taxStratRowWinner, copy.taxStratRowBaselineRunnerUp])
  })

  // The live roster holds a no-conversion household's plan twice: the injected baseline and the grid's conversion-0 point
  // for the same order (`solverCandidateId`'s real `<arm>:<policy>:<amount>` ids). The twin scores the same and the
  // stable sort puts it just before the baseline.
  const realIds = (o: Partial<Parameters<typeof leaveMoreRec>[0]> = {}) => {
    const p = leaveMoreRec()
    return {
      winner: { ...p.winner, id: 'grid:taxable-first:21900' },
      runnerUp: { ...p.runnerUp!, id: 'grid:bracket-fill:0' },
      noActionBaseline: { ...p.noActionBaseline, id: 'baseline:proportional:0' },
      ...o,
    }
  }

  it('the baseline’s twin ranked above your plan today is never counted as another strategy that beat it', () => {
    const ids = realIds()
    const twinAbove = leaveMoreRec({ ...ids, rankedIds: [ids.winner.id, ids.runnerUp.id, 'grid:proportional:0', ids.noActionBaseline.id, 'grid:proportional:21900'] })
    // Only the one real strategy below is counted (the twin, ranked between, is your plan today).
    expect(rankedList(twinAbove, false).others).toBe(slots.taxStratOthers(1))
    // A real strategy above still counts as above; the twin beside it does not.
    const realAbove = leaveMoreRec({ ...ids, rankedIds: [ids.winner.id, ids.runnerUp.id, 'grid:bracket-fill:21900', 'grid:proportional:0', ids.noActionBaseline.id] })
    expect(rankedList(realAbove, false).others).toBe(slots.taxStratOthersAbove(1, 0))
    // A converting baseline has no twin: the grid's conversion-0 point for its order is a different plan.
    const converting = leaveMoreRec({
      ...ids,
      noActionBaseline: { ...ids.noActionBaseline, id: 'baseline:proportional:12345', conversion: { annualAmountReal: 12_345, startYearOffset: 0, years: 5 } },
      rankedIds: [ids.winner.id, ids.runnerUp.id, 'grid:proportional:0', 'baseline:proportional:12345'],
    })
    expect(rankedList(converting, false).others).toBe(slots.taxStratOthersAbove(1, 0))
  })

  it('a runner-up that is the baseline’s twin is the one "Your plan today, the runner-up" row, never your plan printed twice', () => {
    const ids = realIds()
    const twin = { ...ids.noActionBaseline, id: 'grid:proportional:0' }
    const p = leaveMoreRec({ ...ids, runnerUp: twin, rankedIds: [ids.winner.id, twin.id, ids.noActionBaseline.id, 'grid:bracket-fill:0'] })
    const list = rankedList(p, false)
    expect(list.rows.map((r) => r.name)).toEqual([copy.taxStratRowWinner, copy.taxStratRowBaselineRunnerUp])
    expect(list.others).toBe(slots.taxStratOthers(1))
  })
})

describe('Strategies: the Winner card', () => {
  it('the hero follows the goal: leave-more’s bequest, pay-less-tax’s all-in on a priced run, income tax alone on an unpriced one', () => {
    const lm = recommendationView(committed(leaveMoreRec())) as RecommendedView
    expect(heroWords(lm, false)).toEqual({ hero: slots.taxStratHeroLeaveMore(lm.grade.deltaFigure!), average: copy.taxStratHeroAverage })
    const plt = recommendationView(committed(payLessRec()), { healthcarePriced: true }) as RecommendedView
    expect(heroWords(plt, true).hero).toBe(slots.taxStratHeroPayLessTax(formatDeltaDollar(15_000)))
    const unpriced = recommendationView(committed(payLessRec())) as RecommendedView
    expect(heroWords(unpriced, false).hero).toBe(slots.taxStratHeroPayLessTaxUnpriced(formatDeltaDollar(15_000)))
  })

  it('the skew line shows exactly when the skew disclosure says so (upside, and a median that prints apart)', () => {
    expect(winnerOf(strategiesView(solved())).skew, 'symmetric: quiet').toBeUndefined()
    const p = leaveMoreRec()
    const upside = leaveMoreRec({ skewDisclosure: { meanReal: p.winner.headlineStatisticB, medianReal: 2_100_000, p10Real: 0, p90Real: 0, skewDirection: 'upside', meanMinusMedianReal: 1 } })
    expect(winnerOf(strategiesView(solved(upside))).skew).toBe(slots.recSkewMedian('2.1M'))
  })

  it('names how many strategies were compared, the winner’s levers as chips and its sentence, and the grade word', () => {
    const w = winnerOf(strategiesView(solved()))
    expect(w.compared).toBe(slots.taxStratCompared(5))
    expect(w.chips).toEqual([copy.leverPolicyTaxableFirst, slots.taxStratRothRow(formatActionableDollar(21_900), 5)])
    expect(w.sentence).toContain(copy.leverPolicyTaxableFirstHelp)
    expect(w.grade).toEqual({ word: copy.recommendGradeConfident, signal: 'confident' })
    expect(w.runnerUp).toEqual({ summary: copy.recSeeRunnerUp, why: copy.recRunnerUpWhy })
  })
})

describe('Strategies: every state renders its copy, and no bars or list where the rule says none', () => {
  it('no change: the reassurance alone, no figure, no list, no levers; Summary draws no bars', () => {
    const p = leaveMoreRec({ noChange: true })
    const w = winnerOf(strategiesView(solved(p)))
    expect(w.mode).toBe('no-change')
    expect(w.hero).toBe(copy.recComposeAlready)
    expect(w.average).toBeUndefined()
    expect(w.list).toBeUndefined()
    expect(w.chips).toEqual([])
    expect(summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(p)))).toEqual({ kind: 'words', words: copy.recComposeAlready })
  })

  it('a seed-B display inversion (the winner shows behind the baseline) routes to the same reassurance: no dollar, no list, no bars', () => {
    const p = leaveMoreRec()
    const inverted = leaveMoreRec({ noActionBaseline: { ...p.noActionBaseline, distributionB: p.winner.distributionB, headlineStatisticB: p.winner.headlineStatisticB + 50_000 } })
    // The guard reads the arm's own distribution, so the baseline's distribution moves with its figure.
    const shifted = armFor('leave-more', inverted.noActionBaseline.id, 'proportional', { terminalTaxableReal: [450_000, 650_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const q = leaveMoreRec({ noActionBaseline: shifted })
    const w = winnerOf(strategiesView(solved(q)))
    expect(w.mode).toBe('no-change')
    expect(w.list).toBeUndefined()
    expect(summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(q))).kind).toBe('words')
  })

  it('the surplus regime still renders the card (its copy is the hero’s)', () => {
    const w = winnerOf(strategiesView(solved(leaveMoreRec({ surplusRegime: true }))))
    expect(w.mode).toBe('active')
    expect(w.hero).toBe(slots.taxStratHeroLeaveMore(formatDeltaDollar(150_000)))
  })

  it('an ungraded call drops the grade word and says why in words', () => {
    const w = winnerOf(strategiesView(solved(leaveMoreRec({ grade: undefined, gradeUnavailable: { reason: 'b-floor' } }))))
    expect(w.grade).toBeUndefined()
    expect(w.notes).toContain(copy.recGradeNoteUngraded)
  })

  it('withheld conversion levers name their hold under the winner, with the coupling caveat', () => {
    const p = leaveMoreRec({
      withheldConversionLevers: [{ id: 'x', policy: 'taxable-first', annualAmountReal: 10_000, startYearOffset: 0, years: 3, reason: { kind: 'medicare-trend-unsourced' }, anchoredRail: undefined }],
    })
    const w = winnerOf(strategiesView(solved(p)))
    expect(w.withheld).toEqual({ heading: copy.recommendWithheldConversionsHeading, reasons: [copy.recHoldTrend], coupling: copy.recHoldCoupling })
  })

  it('a still-directional figure puts the shape disclosure in the footnote row', () => {
    const v = solveView(strategiesView(solved(leaveMoreRec({ disclosedDirectional: ['methodology.productionMarket'] as never }))))
    expect(v.footnotes).toContain(copy.recGradeNoteShape)
  })

  it('the adjacent disclosures ride under the card, and the state clause stays out when the state-tax note speaks', () => {
    // An unpriced state (the retired seed names none): the state-tax disclosure speaks, so the footnotes carry no clause.
    const v = solveView(strategiesView(solved()))
    expect(v.disclosures.map((d) => d.id)).toEqual(['ss-claim-fixed', 'niit', 'state-tax', 'heir-bracket'])
    expect(v.footnotes).toEqual([])
    // A priced state (NC): no state-tax disclosure, so the footnote row carries the state's own clause.
    const nc = DEV_SEEDS.nc
    const priced = solveView(strategiesView(base({ snapshot: snap(nc, headlineAnswer(nc), committed(leaveMoreRec())) })))
    expect(priced.disclosures.map((d) => d.id)).not.toContain('state-tax')
    expect(priced.footnotes).toEqual([composeVerdictStateNote('NC', false)])
    // The empty state: no disclosures, the clause alone.
    const empty = solveView(strategiesView(base()))
    expect(empty.disclosures).toEqual([])
    expect(empty.footnotes).toEqual([copy.verdictStateUnpricedNote])
  })

  it('pay less tax on a run that priced health premiums: the hero counts both, and the scope disclosure says what is and isn’t counted', () => {
    expect(spineMedicarePriced(RETIRED), 'the retired seed prices Medicare (else this arm proves nothing)').toBe(true)
    const v = solveView(strategiesView(solved(payLessRec(), { picked: { goal: 'pay-less-tax', heirBracket: DEFAULT_HEIR_BRACKET } })))
    expect(v.winner!.hero).toBe(slots.taxStratHeroPayLessTax(formatDeltaDollar(15_000)))
    expect(v.disclosures.map((d) => d.id)).toContain('all-in-scope')
    const s = summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(payLessRec())))
    if (s.kind !== 'bars') throw new Error(s.kind)
    expect(s.category).toBe(copy.taxStratMetricPayLessTax)
    expect(s.hero).toBe(v.winner!.hero)
  })

  it('Calculating: the bold sentence and the label, nothing else to press', () => {
    const v = solveView(strategiesView(base({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'pending', label: 'solving', fingerprint: 'fp' as never }) })))
    expect(v.calculating).toEqual({ sentence: copy.recommendPendingLabel, label: copy.taxStratCalculating })
    expect(v.ask).toBeUndefined()
    expect(v.winner).toBeUndefined()
  })

  it('stale, unavailable and held each show their words above the empty state', () => {
    const stale = solveView(strategiesView(base({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'stale', label: 'inputs-changed' }) })))
    expect(stale.notice).toEqual({ kind: 'stale', heading: copy.recommendStaleHeading, lines: [copy.recommendStaleBody] })
    expect(stale.ask?.find.label).toBe(copy.taxStratFind)
    const failed = solveView(strategiesView(base({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'compute-error', reason: 'x' }) })))
    expect(failed.notice).toEqual({ kind: 'unavailable', lines: [copy.recommendUnavailable] })
  })
})

describe('Strategies: the empty state', () => {
  it('holds Find with no goal picked, its reason in words; a pick lets it run', () => {
    const held = solveView(strategiesView(base({ picked: { goal: undefined, heirBracket: DEFAULT_HEIR_BRACKET } }))).ask!
    expect(held.find.held).toEqual({ kind: 'goal', words: copy.goalPickerConfirmBlocked })
    expect(held.bracket, 'no goal: no heirs’ bracket (no hollow control)').toBeUndefined()
    const ready = solveView(strategiesView(base())).ask!
    expect(ready.find.held).toBeUndefined()
    expect(ready.bracket?.value).toBe(String(DEFAULT_HEIR_BRACKET))
    expect(ready.goals.map((g) => g.label)).toEqual([copy.goalLeaveMoreLabel, copy.goalPayLessTaxLabel])
  })

  it('the heirs’ bracket sits beside the picker for leave-more only', () => {
    expect(solveView(strategiesView(base({ picked: { goal: 'pay-less-tax', heirBracket: 0.24 } }))).ask!.bracket).toBeUndefined()
    expect(solveView(strategiesView(base({ picked: { goal: 'leave-more', heirBracket: 0.32 } }))).ask!.bracket?.value).toBe('0.32')
  })

  it('a bracket never chosen says the shown rate is the tool’s own starting figure (RC13b: the facts page said it; one is chosen, no such words)', () => {
    const unchosen = solveView(strategiesView(base({ picked: { goal: 'leave-more', heirBracket: DEFAULT_HEIR_BRACKET } }))).ask!.bracket!
    expect(unchosen.help).toContain(slots.taxStratHeirDefault(formatBracketPercent(DEFAULT_HEIR_BRACKET)))
    const chosen = solveView(strategiesView(base({ picked: { goal: 'leave-more', heirBracket: 0.32 } }))).ask!.bracket!
    expect(chosen.help).toBe(copy.assumptionHeirBracketHelp)
  })

  it('a household with no pre-tax money: the refused solve shows the steer note above Find, and Find is held on those words (a press would only refuse again; a plan edit clears it)', () => {
    const ask = solveView(strategiesView(base({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' }) }))).ask!
    expect(ask.steer).toEqual({ kind: 'no-pretax', words: copy.recommendNoPretaxNote })
    expect(ask.find.held).toEqual({ kind: 'no-pretax', words: copy.recommendNoPretaxNote })
  })

  it('the plan’s answer not ready holds Find, in words: still being worked out, or the facts it waits for by name', () => {
    const pending = solveView(strategiesView(base({ snapshot: snap(RETIRED, { kind: 'pending' } as never) }))).ask!
    expect(pending.find.held).toEqual({ kind: 'answer', words: copy.taxStratAnswerWaiting })
    // Idle and missing facts are the fallback, not "being worked out": the held reason is the answer's own lead.
    for (const kind of ['idle', 'inputs-incomplete'] as const) {
      const held = solveView(strategiesView(base({ snapshot: snap(RETIRED, { kind } as never) }))).ask!.find.held
      expect(held, kind).toEqual({ kind: 'answer', words: copy.answerIncomplete })
    }
    // A missing fact is named.
    const [first, second] = RETIRED.people
    const { sex: _sex, ...noSex } = first!
    const gap = { ...RETIRED, people: [noSex, second!] } as never
    const named = solveView(strategiesView(base({ snapshot: snap(gap, { kind: 'idle' } as never) }))).ask!.find.held
    expect(named?.kind).toBe('answer')
    expect(named?.words).toContain(copy.answerStillNeeded)
  })

  it('the picker’s lead is verdict-gated on the RAW outcome: a positive list, so off-track and already-failing omit it and a new state falls silent', () => {
    const leads = new Set(['on-track', 'over-funded', 'borderline'])
    for (const state of OUTCOME_STATES) {
      if (state === 'indeterminate') continue
      const answer = headlineAnswer(RETIRED, state)
      expect(goalLeadPremiseHolds(answer), state).toBe(leads.has(state))
      const ask = solveView(strategiesView(base({ snapshot: snap(RETIRED, answer) }))).ask!
      expect(ask.lead, state).toBe(leads.has(state) ? copy.goalPickerIntro : undefined)
    }
    expect(goalLeadPremiseHolds({ kind: 'pending' } as never), 'no reading: no lead').toBe(false)
  })
})

describe('Strategies: Keep and Try it in the plan', () => {
  it('an unsaved solve offers Keep alone, with its hint; no Try', () => {
    const w = winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'offer', route: 'update' } })))
    expect(w.keep).toEqual({ label: copy.snapshotRecKeep, noDollarRegister: false, hint: copy.recommendSaveHintUpdate })
    expect(w.tryIt).toBeUndefined()
    const ceremony = winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'offer', route: 'ceremony' } })))
    expect(ceremony.keep?.hint).toBe(copy.recommendSaveHintCeremony)
  })

  it('kept and current: the saved badge and Try it in the plan; nothing on the card writes the plan', () => {
    const w = winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'saved' }, record: record(true) })))
    expect(w.status).toEqual({ kind: 'saved', words: copy.recommendSaveSavedBadge })
    expect(w.tryIt).toEqual({ label: copy.snapshotRecTry })
    expect(w.keep).toBeUndefined()
    // A superseded record runs nothing: no Try.
    expect(winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'saved' }, record: record(false) }))).tryIt).toBeUndefined()
  })

  it('a read-only view has no Keep; Find still runs', () => {
    const w = winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'offer', route: 'update' }, readOnly: true })))
    expect(w.keep).toBeUndefined()
    const ask = solveView(strategiesView(base({ readOnly: true }))).ask!
    expect(ask.find.held).toBeUndefined()
  })

  it('a refused write names its reason beside the card; the saving state its pending words', () => {
    expect(winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'refused', reason: 'write' } }))).refused).toEqual({ heading: copy.recommendSaveRefusalWriteHeading, body: copy.recommendSaveRefusalWriteBody })
    expect(winnerOf(strategiesView(solved(leaveMoreRec(), { save: { kind: 'saving' } }))).status).toEqual({ kind: 'saving', words: copy.recommendSavePending })
  })

  it('the re-pick door sits beside a Winner card and opens the empty state under it', () => {
    expect(solveView(strategiesView(solved())).repick).toEqual({ label: copy.recommendRepickCta })
    const open = solveView(strategiesView(solved(leaveMoreRec(), { repick: true })))
    expect(open.repick).toBeUndefined()
    expect(open.ask?.find.label).toBe(copy.taxStratFind)
  })
})

describe('Strategies: the record card and the working route', () => {
  it('a record that holds shows its face above the empty state; a superseded one names every cause in order and the mint year', () => {
    const holds = solveView(strategiesView(base({ record: record(true) }))).record!
    expect(holds.standing).toBe('holds')
    expect(holds.lead).toBe(copy.recommendRecordHolds)
    const old = solveView(strategiesView(base({ record: record(false) }))).record!
    expect(old.standing).toBe('superseded')
    expect(old.lead).toBe(copy.recommendRecordSuperseded)
    expect(old.causes).toEqual([copy.recommendRecordSupersededInputs, copy.recommendRecordSupersededSolver])
    expect(old.savedIn).toMatch(/^Saved in \d{4}\.$/)
  })

  it('the record card stays beside a Winner card too (it is gated on its own data, never on the solve)', () => {
    expect(solveView(strategiesView(solved(leaveMoreRec(), { record: record(false) }))).record?.standing).toBe('superseded')
  })

  it('a working household (dip): the one stopgap line, and no picker, bracket, Find or other view', () => {
    const dip = DEV_SEEDS.dip
    const v = strategiesView(base({ snapshot: snap(dip, headlineAnswer(dip)) }))
    expect(v).toEqual({ kind: 'working-route', words: copy.taxStratWorkingRoute })
  })
})

describe('Summary reads the hero’s own statistic (insight 099)', () => {
  it('the bars are the winner’s and the baseline’s seed-B figures, printed as the ranked list prints them, and the hero is the Winner card’s', () => {
    const p = leaveMoreRec()
    const s = summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(p)))
    if (s.kind !== 'bars') throw new Error(s.kind)
    expect(s.winner.statistic).toBe(p.winner.headlineStatisticB)
    expect(s.baseline.statistic).toBe(p.noActionBaseline.headlineStatisticB)
    const rows = winnerOf(strategiesView(solved(p))).list!.rows
    expect([s.winner.figure, s.baseline.figure]).toEqual([rows[0]!.value, rows[2]!.value])
    expect(s.winner.figure).toBe(armFigure(p.winner.headlineStatisticB))
    expect(formatDeltaDollar(s.winner.statistic - s.baseline.statistic)).toBe(formatDeltaDollar(150_000))
    expect(s.hero).toBe(winnerOf(strategiesView(solved(p))).hero)
    expect(s.lattice.ceiling).toBeGreaterThanOrEqual(p.winner.headlineStatisticB)
  })

  it('pay less tax draws the bars too, the recommendation’s the lower, under the goal’s own metric name', () => {
    const s = summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(payLessRec())))
    if (s.kind !== 'bars') throw new Error(s.kind)
    expect(s.winner.statistic).toBeLessThan(s.baseline.statistic)
    expect(s.category).toBe(copy.taxStratMetricPayLessTax)
  })

  it('the key-metric column carries the lines that qualify the hero on the Winner card, and the footnote row its disclosures (insight 160)', () => {
    const p = leaveMoreRec()
    const q = leaveMoreRec({
      deltaSkew: { meanReal: 150_000, medianReal: 40_000, p10Real: 0, p90Real: 0, skewDirection: 'upside', meanMinusMedianReal: 110_000 },
      skewDisclosure: { meanReal: p.winner.headlineStatisticB, medianReal: 2_100_000, p10Real: 0, p90Real: 0, skewDirection: 'upside', meanMinusMedianReal: 1 },
      disclosedDirectional: ['methodology.productionMarket'] as never,
    })
    const v = solveView(strategiesView(solved(q)))
    const w = v.winner!
    expect(w.qualifier, 'the fixture must light the qualifier').toBeDefined()
    expect(w.skew, 'the fixture must light the skew line').toBeDefined()
    const s = summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(q)))
    if (s.kind !== 'bars') throw new Error(s.kind)
    expect(s.qualifier).toBe(w.qualifier)
    expect(s.skew).toBe(w.skew)
    expect(s.shapeNote).toBe(copy.recGradeNoteShape)
    expect(s.footnotes).toEqual(v.disclosures.map((d) => d.text))
    // A priced state: no state-tax disclosure, so the state's own clause rides the footnote row.
    const nc = DEV_SEEDS.nc
    const priced = summaryView(snap(nc, headlineAnswer(nc), committed(p)))
    if (priced.kind !== 'bars') throw new Error(priced.kind)
    expect(priced.footnotes).not.toContain(copy.recDiscStateTax)
    expect(priced.footnotes.at(-1)).toBe(composeVerdictStateNote('NC', false))
  })

  it('the phone’s compact figures are the same figures in the axis’s dialect, three digits', () => {
    expect(compactDollars(5_195_000)).toBe('5.20mm')
    expect(compactDollars(4_950_000)).toBe('4.95mm')
    expect(compactDollars(625_400)).toBe('625k')
    expect(compactDollars(48_250)).toBe(formatDeltaDollar(48_250))
    const s = summaryView(snap(RETIRED, headlineAnswer(RETIRED), committed(leaveMoreRec())))
    expect(s.kind === 'bars' && s.winner.compactFigure).toBe(slots.taxStratValue(compactDollars(leaveMoreRec().winner.headlineStatisticB)))
  })

  it('before a solve: the words and a door to Strategies, no bars', () => {
    expect(summaryView(snap(RETIRED, headlineAnswer(RETIRED)))).toEqual({ kind: 'waiting', words: copy.taxStratWaiting, action: copy.taxStratToStrategies })
  })
})
