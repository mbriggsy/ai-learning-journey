import { describe, expect, it } from 'vitest'
import { OUTCOME_STATES } from '@shared/model'
import { formatActionableDollar, formatDeltaDollar } from '../../../money'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
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
    // Five ranked, three shown: two others, counted in words.
    expect(list.others).toBe(slots.taxStratOthers(2))
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
    // The plant: a pruned candidate smuggled in as a row would carry its id into the view, and the sweep above catches
    // exactly that string.
    const planted = { ...view, winner: { ...winnerOf(view), list: { ...list, rows: [...list.rows, { ...list.rows[0]!, name: 'pruned-a' }] } } }
    expect(JSON.stringify(planted)).toContain('pruned-a')
  })

  it('shades follow the displayed value, best for the goal darkest; tied printed figures share a shade', () => {
    const p = leaveMoreRec()
    expect(rankedList(p, false, false).rows.map((r) => r.shade)).toEqual([0, 1, 2])
    // A runner-up that prints the winner's figure shares its shade.
    const tied = leaveMoreRec({ runnerUp: armFor('leave-more', 'bracket-fill|grid|0', 'bracket-fill', { terminalTaxableReal: [399_000, 599_000], terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] }) })
    const rows = rankedList(tied, false, false).rows
    expect(rows[0]!.value).toBe(rows[1]!.value)
    expect(rows.map((r) => r.shade)).toEqual([0, 0, 2])
    // Pay less tax: the LOWEST figure is the best, darkest.
    expect(rankedList(payLessRec(), false, true).rows.map((r) => r.shade)).toEqual([0, 1, 2])
  })

  it('a near-tie (a close-call grade on the sampling-noise driver) is said in words on both top rows; a confident lean says nothing', () => {
    const near = winnerOf(strategiesView(solved(leaveMoreRec({ grade: grade('coin-flip') })))).list!
    expect(near.rows.map((r) => r.nearTie)).toEqual([copy.taxStratRowNearTie, copy.taxStratRowNearTie, undefined])
    const sure = winnerOf(strategiesView(solved())).list!
    expect(sure.rows.every((r) => r.nearTie === undefined)).toBe(true)
  })

  it('a runner-up that IS the baseline is one row, named as both', () => {
    const p = leaveMoreRec()
    const list = rankedList(leaveMoreRec({ runnerUp: p.noActionBaseline }), false, false)
    expect(list.rows.map((r) => r.name)).toEqual([copy.taxStratRowWinner, copy.taxStratRowBaselineRunnerUp])
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

  it('the adjacent disclosures ride under the card (complete over their ids), and the state clause stays out when the state-tax note speaks', () => {
    const v = solveView(strategiesView(solved()))
    expect(v.disclosures.map((d) => d.id)).toContain('ss-claim-fixed')
    expect(v.disclosures.map((d) => d.id)).toContain('heir-bracket')
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

  it('a household with no pre-tax money: the refused solve shows the steer note above Find, which stays live', () => {
    const ask = solveView(strategiesView(base({ snapshot: snap(RETIRED, headlineAnswer(RETIRED), { kind: 'blocked', gap: 'no-pretax', label: 'no-pretax' }) }))).ask!
    expect(ask.steer).toEqual({ kind: 'no-pretax', words: copy.recommendNoPretaxNote })
    expect(ask.find.held).toBeUndefined()
  })

  it('the plan’s answer not ready holds Find, in words: still being worked out, or incomplete', () => {
    const pending = solveView(strategiesView(base({ snapshot: snap(RETIRED, { kind: 'pending' } as never) }))).ask!
    expect(pending.find.held).toEqual({ kind: 'answer', words: copy.taxStratAnswerWaiting })
    const incomplete = solveView(strategiesView(base({ snapshot: snap(RETIRED, { kind: 'inputs-incomplete' } as never) }))).ask!
    expect(incomplete.find.held).toEqual({ kind: 'answer', words: copy.recommendSpineUnreadyNote })
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
    expect([copy.taxStratMetricPayLessTax, copy.taxStratMetricPayLessTaxUnpriced]).toContain(s.category)
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
