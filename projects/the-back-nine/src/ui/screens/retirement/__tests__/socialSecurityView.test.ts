import { describe, expect, it } from 'vitest'
import { simulate } from '@engine/simulate'
import { DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import { householdBenefits } from '@engine/socialSecurityBenefit'
import { applyBundle } from '@intake/whatIf'
import type { LedgerYearRow, WhatIfLeverV6 } from '@shared/model'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { formatDeltaDollar } from '../../../money'
import { tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { whatIfRunFor, type WhatIfReading } from '../../../workbench/whatIfRun'
import { headlineAnswer } from '../../tax/__tests__/fixtures'
import type { RunRows } from '../cashFlowsView'
import {
  breakEvenIndex,
  claimsComparisonView,
  claimsSettledView,
  claimsSteps,
  claimsSummaryView,
  claimStrategies,
  cumulative,
  fraWholeYears,
  lifetimeTotal,
  snapToGrain,
  type ClaimChoices,
  type ReadingState,
  type StrategyId,
} from '../socialSecurityView'

/**
 * Retirement → Social Security (Act 6 · RC9): the strategies (each a claim-age bundle on the plan, changing claim ages
 * and nothing else; a claimed person never in one; an age never refused as past), the coinciding line, the break-even
 * from hand-built series and from the engine's own rows with real benefits and a death in the steady market (insight
 * 045), the lifetime totals as the rows' sums on the printed grain (insight 146), the filing steps naming each person
 * once, and no strategy called "optimal" or "best" (map gap 7 is not built).
 */

const RETIRED = DEV_SEEDS.retired
const DATE = DEV_SEEDS.date
const HEALTHSS = DEV_SEEDS.healthss

type Choices = Extract<ClaimChoices, { kind: 'choices' }>
const choicesOf = (d: ScenarioDraft): Choices => {
  const c = claimStrategies(d)
  if (c.kind !== 'choices') throw new Error(c.kind)
  return c
}
const person = (d: ScenarioDraft, i: number, patch: Partial<ScenarioDraft['people'][number]>): ScenarioDraft => ({
  ...d,
  people: d.people.map((p, k) => (k === i ? { ...p, ...patch } : p)) as unknown as ScenarioDraft['people'],
})

/** A draft with every person's claim age replaced (the only field a strategy may move). */
const withClaims = (d: ScenarioDraft, ages: readonly (number | null)[]): ScenarioDraft => ({
  ...d,
  people: d.people.map((p, i) => (ages[i] === null || ages[i] === undefined ? p : { ...p, socialSecurityClaimAge: ages[i]! })) as unknown as ScenarioDraft['people'],
})

function steadyRows(answer: ModelAnswer, bundle: readonly WhatIfLeverV6[]): { rows: readonly LedgerYearRow[]; meta: TableMeta } {
  const run = bundle.length === 0 ? tableRunFor(answer) : whatIfRunFor(answer, 1, bundle)
  if (run.kind !== 'run' || run.views.steady.kind !== 'run') throw new Error(`no steady run: ${run.kind}`)
  const { params, seed, options } = run.views.steady.request
  const out = simulate(params, seed, options)
  if (out.indeterminate || out.infeasible) throw new Error('the steady run failed')
  const rows = out.distribution.ledgerRows
  if (rows === undefined || rows.length === 0) throw new Error('no ledger')
  return { rows, meta: run.meta }
}
const ready = (r: { rows: readonly LedgerYearRow[]; meta: TableMeta }): RunRows => ({ kind: 'ready', rows: r.rows, meta: r.meta, updating: false, answerKey: 'k1' })

/** A hand-built run: one person (the first of `retired`), `ss` the Social Security of each year, alive through `lastT`. */
function handRun(ss: readonly number[], lastT: number, ranOut = false, patch: Partial<TableMeta> = {}): RunRows {
  const meta: TableMeta = {
    ...steadyRows(headlineAnswer(RETIRED), []).meta,
    people: [{ label: 'Alex', mid: 'Alex', possessive: 'Alex’s', pronoun: 'Alex’s', you: false, currentAge: 66, lastAge: 66 + lastT }],
    route: 'spine' as const,
    ...patch,
  }
  const rows = ss.map((v, t) => ({ t, socialSecurity: v, ranOut: ranOut && t === ss.length - 1 }) as unknown as LedgerYearRow)
  return { kind: 'ready', rows, meta, updating: false, answerKey: 'k1' }
}

const NOTES = (c: Choices, stateClause: string | null = null, planClockYears = 0) => ({ choices: c, stateClause, planClockYears })

describe('the strategies', () => {
  it('retired (Alex 66, Sam 65, both born after 1959, both planning 67): your plan’s ages, as early as possible, 70; full retirement age coincides with the plan and shows once, the line saying so', () => {
    const c = choicesOf(RETIRED)
    expect(c.strategies.map((s) => [s.id, s.ages])).toEqual([
      ['plan', [67, 67]],
      ['earliest', [66, 65]],
      ['seventy', [70, 70]],
    ])
    expect(c.coincide).toEqual([slots.claimsCoincideMany('Your plan’s own ages and claiming at full retirement age', 'Alex at 67 and Sam at 67')])
    expect(c.fixed).toEqual([])
    expect(c.strategies[0]!.bundle, 'your plan’s ages are the plan itself: no run').toEqual([])
  })

  it('each strategy’s bundle changes claim ages and nothing else (U14’s field-by-field check), and none is refused', () => {
    for (const d of [RETIRED, DATE, person(RETIRED, 0, { currentAge: 64, birthYear: 1962 })]) {
      for (const s of choicesOf(d).strategies) {
        expect(s.bundle.every((l) => l.kind === 'claim-age'), `${s.id}: claim-age levers only`).toBe(true)
        const applied = applyBundle(d, s.bundle)
        if (!applied.ok) throw new Error(`${s.id} refused: ${applied.refusal.kind}`)
        expect(applied.draft, `${s.id}: only the claim ages move`).toEqual(withClaims(d, s.ages))
        expect(applied.stopOffsetYears, `${s.id}: never a stop-year lever`).toBeUndefined()
      }
    }
  })

  it('a person aged 64 is offered 64, never 62; 70 is 70', () => {
    const d = person(RETIRED, 0, { currentAge: 64, birthYear: 1962 })
    const c = choicesOf(d)
    expect(c.strategies.find((s) => s.id === 'earliest')!.ages[0]).toBe(64)
    expect(c.strategies.find((s) => s.id === 'seventy')!.ages[0]).toBe(70)
    for (const s of c.strategies) for (const l of s.bundle) expect(l.kind === 'claim-age' && l.claimAge >= 62 && l.claimAge >= (d.people[l.personIndex]!.currentAge ?? 0)).toBe(true)
  })

  it('a 1957 birth’s full-retirement strategy is 67 (66 and 6 months, rounded up to the whole year)', () => {
    expect(fraWholeYears(1957)).toBe(67)
    expect(fraWholeYears(1954)).toBe(66)
    const d = person(person(RETIRED, 0, { birthYear: 1957, currentAge: 63, socialSecurityClaimAge: 64 }), 1, { birthYear: 1957, currentAge: 63, socialSecurityClaimAge: 64 })
    const c = choicesOf({ ...d, startCalendarYear: 2020 })
    expect(c.strategies.find((s) => s.id === 'fra')!.ages).toEqual([67, 67])
  })

  it('a person already claiming is fixed, said in words, and never in a bundle', () => {
    const d = person(RETIRED, 1, { socialSecurityClaimAge: 62 })
    const c = choicesOf(d)
    for (const s of c.strategies) {
      expect(s.ages[1], `${s.id}: Sam has no age to choose`).toBeNull()
      expect(s.bundle.some((l) => l.kind === 'claim-age' && l.personIndex === 1), `${s.id}: Sam never in a bundle`).toBe(false)
    }
    expect(c.fixed).toHaveLength(1)
    expect(c.fixed[0]).toMatch(/^Sam already receives Social Security, about ~\$[\d,]+ a year, so Sam’s age stays as it is in every strategy\.$/)
    // One chooser: the coinciding line speaks of her alone.
    expect(c.coincide).toEqual([slots.claimsCoincideOne('Alex', 'your plan’s own ages and claiming at full retirement age', 67, 2)])
  })

  it('a lower earner already claiming while the higher earner has not filed receives their own benefit only: the spousal part waits for the other’s claim (the engine’s `spousalStart`)', () => {
    // Sam (pia 6,000, under half of Alex's 30,000) claimed at 62; Alex, 66, files at 67.
    const d = person(RETIRED, 1, { socialSecurityClaimAge: 62, pia: 6_000 })
    const c = choicesOf(d)
    const sam = c.people[1]!
    const [, samAmounts] = householdBenefits(d.people.map((p) => ({ piaAnnual: p.pia!, claimAge: p.socialSecurityClaimAge!, birthYear: p.birthYear! })))
    expect(samAmounts!.spousalExcessAnnual, 'the fixture carries a spousal part').toBeGreaterThan(0)
    expect(sam.benefit).toBeCloseTo(samAmounts!.ownAnnual, 6)
    // The engine's own first year pays Sam alone (Alex has not claimed): the figure the line prints.
    expect(steadyRows(headlineAnswer(d), []).rows[0]!.socialSecurity).toBeCloseTo(sam.benefit, 0)
    expect(c.fixed[0]).toBe(slots.claimsFixed('Sam', false, 'Sam’s', formatDeltaDollar(samAmounts!.ownAnnual)))
  })

  it('a person already filed with no benefit of their own while the other has not filed is paid nothing yet: said with no figure, never "about ~$0 a year"', () => {
    // Sam (pia 0) filed at 62; Alex, 66, files at 67: Sam's spousal part waits for Alex's claim.
    const d = person(RETIRED, 1, { socialSecurityClaimAge: 62, pia: 0 })
    const c = choicesOf(d)
    expect(c.people[1]!.benefit).toBe(0)
    expect(c.fixed).toEqual([slots.claimsFixedSpousalPending('Sam', false, 'Sam’s', 'Alex', false)])
    expect(c.fixed[0]).not.toMatch(/\$/)
    // The filing steps say the same: filed, the spousal part waiting on Alex, never "already receives Social Security".
    const steps = claimsSteps(c.strategies[0]!, c.people, d.startCalendarYear, 0)
    expect(steps.steps[1]).toBe(slots.claimsStepSpousalPending('Sam', false, 'Sam’s', 'Alex', false))
    expect(steps.steps.join(' ')).not.toMatch(/already receives/)
  })

  it('a chooser already at full retirement age: as early as possible and full retirement age coincide, shown once', () => {
    const d = person(person(RETIRED, 0, { currentAge: 67, birthYear: 1959, socialSecurityClaimAge: 68 }), 1, { socialSecurityClaimAge: 62 })
    const c = choicesOf({ ...d, people: [{ ...d.people[0]!, socialSecurityClaimAge: 68 }, d.people[1]!] as unknown as ScenarioDraft['people'] })
    // Alex is 67 (born 1959, full retirement age 67): as early as possible and full retirement age are both 67.
    expect(c.strategies.map((s) => s.id)).toEqual(['plan', 'earliest', 'seventy'])
    expect(c.coincide).toEqual([slots.claimsCoincideOne('Alex', 'claiming as early as possible and claiming at full retirement age', 67, 2)])
  })

  it('everyone already claiming (healthss): no choice left; each one’s benefit and the lifetime total, the rows’ sum', () => {
    const c = claimStrategies(HEALTHSS)
    if (c.kind !== 'all-claimed') throw new Error(c.kind)
    const r = steadyRows(headlineAnswer(HEALTHSS), [])
    const v = claimsSettledView(c.people, ready(r), null, 0)
    expect(v.lines[0]).toBe(copy.claimsNoChoiceLeft)
    expect(v.lines.slice(1, 3).every((l) => /already receives? about ~\$[\d,]+ a year\.$/.test(l))).toBe(true)
    const last = Math.max(...r.meta.people.map((p) => p.lastAge - p.currentAge))
    const sum = r.rows.slice(0, last + 1).reduce((a, x) => a + x.socialSecurity, 0)
    expect(v.lines[3]).toBe(slots.claimsLifetimeTotal(formatDeltaDollar(snapToGrain(sum))))
    // The benefit each one is said to receive is the household's first-year paid figure, split (the engine's own amounts).
    const each = c.people.map((p) => p.benefit)
    expect(each[0]! + each[1]!).toBeCloseTo(r.rows[0]!.socialSecurity, 0)
    expect(v.lines, 'current rows: no re-figuring line').not.toContain(copy.answerRefiguringCaption)
    // Rows from before the latest change: the old figures stay, said as not yet carrying the change.
    const stale = claimsSettledView(c.people, { ...(ready(r) as Extract<RunRows, { kind: 'ready' }>), updating: true }, null, 0)
    expect(stale.lines.at(-1)).toBe(copy.answerRefiguringCaption)
  })

  it('no one with a benefit: the page says there is nothing to compare', () => {
    const d = person(person(RETIRED, 0, { pia: 0 }), 1, { pia: 0 })
    expect(claimStrategies(d)).toEqual({ kind: 'none' })
  })
})

describe('the break-even', () => {
  it('hand-built: the later claim trails, then passes for good; the index is that year', () => {
    // A: nothing for 4 years, then 30k; B: 20k from the start.
    const a = cumulative([0, 0, 0, 0, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000])
    const b = cumulative([20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000])
    const t = breakEvenIndex(a, b)
    expect(t).not.toBeNull()
    expect(a[t!]! > b[t!]!).toBe(true)
    expect(a[t! - 1]! <= b[t! - 1]!).toBe(true)
    for (let k = t!; k < a.length; k++) expect(a[k]! > b[k]!).toBe(true)
    expect(breakEvenIndex(b, a), 'either picker holds the later claim: the same crossing').toBe(t)
  })

  it('hand-built: no crossing is no break-even', () => {
    expect(breakEvenIndex(cumulative([10, 10, 10].map((x) => x * 1_000)), cumulative([5, 5, 5].map((x) => x * 1_000)))).toBeNull()
    expect(breakEvenIndex([0, 0, 0], [0, 0, 0])).toBeNull()
  })

  it('hand-built: two crossings (a stream that inverts, insight 045) read the last change of lead, the one that holds', () => {
    const a = [0, 100_000, 200_000, 300_000, 500_000, 700_000]
    const b = [50_000, 100_000, 250_000, 280_000, 600_000, 650_000]
    expect(breakEvenIndex(a, b)).toBe(5)
  })

  it('a tie at the printed grain is no lead: $3,000 apart on a million is the same as printed', () => {
    expect(breakEvenIndex([1_000_000, 1_003_000], [1_001_000, 1_000_000])).toBeNull()
  })

  it('the comparison view: a crossing marks the ring and its age; a crossing after the steady market’s second death is not shown', () => {
    const c = choicesOf(RETIRED)
    const early = Array.from({ length: 20 }, () => 20_000)
    const late = Array.from({ length: 20 }, (_, t) => (t < 4 ? 0 : 30_000))
    const cut = 18 // the crossing lands inside 20 years
    const both = (lastT: number) =>
      claimsComparisonView({ chart: 'cumulative', a: 'seventy', b: 'plan', notes: NOTES(c), rows: { seventy: handRun(late, lastT), plan: handRun(early, lastT) } })
    const inside = both(cut)
    if (inside.kind !== 'pair') throw new Error(inside.kind)
    const tCross = breakEvenIndex(cumulative(late), cumulative(early))!
    expect(tCross).toBeLessThanOrEqual(cut)
    expect(inside.crossing).toEqual({ age: 66 + tCross, value: cumulative(late)[tCross], label: slots.claimsBreakEvenAge(66 + tCross) })
    expect(inside.hero).toBe(slots.claimsBreakEvenAge(66 + tCross))
    expect(inside.heroLine).toBe(slots.claimsBreakEvenLine('Alex’s', RETIRED.startCalendarYear + tCross, copy.claimsPhraseSeventy, copy.claimsPhrasePlan))
    // The second death before the crossing: the years past it are never read, so there is no break-even.
    const before = both(tCross - 1)
    if (before.kind !== 'pair') throw new Error(before.kind)
    expect(before.crossing).toBeUndefined()
    // Here the year before the crossing is a tie at the printed grain (240,000 each): the totals come out about the same
    // by the last year read, never one side "staying ahead" through it.
    expect(before.hero).toBe(copy.claimsAboutSame)
    expect(before.series[0].points.at(-1)!.age, 'the lines stop at the second death').toBe(66 + tCross - 1)
    // A year earlier still, the plan leads through the last year read: no break-even.
    const earlier = both(tCross - 2)
    if (earlier.kind !== 'pair') throw new Error(earlier.kind)
    expect(earlier.crossing).toBeUndefined()
    expect(earlier.hero).toBe(copy.claimsNoBreakEven)
  })

  it('no break-even: the side that leads is the one with the last lead, never the side a tie in the last year falls to', () => {
    const c = choicesOf(RETIRED)
    // Running totals: claiming at 70 [0, 0, 30,000], your plan [10,000, 20,000, 30,000]: the plan led, then a tie.
    const v = claimsComparisonView({ chart: 'cumulative', a: 'seventy', b: 'plan', notes: NOTES(c), rows: { seventy: handRun([0, 0, 30_000], 2), plan: handRun([10_000, 10_000, 10_000], 2) } })
    if (v.kind !== 'pair') throw new Error(v.kind)
    // The two totals print the same in the last year: no side leads there, so the line says they come out about the
    // same by then (the yearly view's "About the same"), never that the plan "stays ahead through" it.
    expect(v.hero).toBe(copy.claimsAboutSame)
    expect(v.heroLine).toBe(slots.claimsLevelByLine(RETIRED.startCalendarYear + 2, 'Alex’s', 68, copy.claimsPhraseSeventy, copy.claimsPhrasePlan))
    const annual = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c), rows: { seventy: handRun([0, 0, 30_000], 2), plan: handRun([10_000, 10_000, 10_000], 2) } })
    expect(annual.kind === 'pair' && annual.hero).toBe(copy.claimsAboutSame)
    // A lead that holds through the last year still says so, naming the side that led.
    const held = claimsComparisonView({ chart: 'cumulative', a: 'seventy', b: 'plan', notes: NOTES(c), rows: { seventy: handRun([0, 0, 25_000], 2), plan: handRun([10_000, 10_000, 10_000], 2) } })
    if (held.kind !== 'pair') throw new Error(held.kind)
    expect(held.hero).toBe(copy.claimsNoBreakEven)
    expect(held.heroLine).toBe(slots.claimsNoBreakEvenLine(RETIRED.startCalendarYear + 2, 'Alex’s', 68, copy.claimsPhrasePlan, copy.claimsPhraseSeventy))
  })

  it('the engine’s own rows, real benefits and a death in the steady market (retired: 70 against your plan’s 67): the crossing holds to the last year read, and the yearly view prints the lifetime difference', () => {
    const answer = headlineAnswer(RETIRED)
    const c = choicesOf(RETIRED)
    const seventy = c.strategies.find((s) => s.id === 'seventy')!
    const plan = steadyRows(answer, [])
    const late = steadyRows(answer, seventy.bundle)
    // The steady market carries a first death before its end (one stream steps down to a survivor's).
    const deaths = plan.meta.people.map((p) => p.lastAge - p.currentAge)
    expect(Math.min(...deaths)).toBeLessThan(Math.max(...deaths))
    const rows = { seventy: ready(late), plan: ready(plan) }
    const v = claimsComparisonView({ chart: 'cumulative', a: 'seventy', b: 'plan', notes: NOTES(c), rows })
    if (v.kind !== 'pair') throw new Error(v.kind)
    const last = Math.max(...deaths)
    const ya = late.rows.slice(0, last + 1).map((r) => r.socialSecurity)
    const yb = plan.rows.slice(0, last + 1).map((r) => r.socialSecurity)
    expect(ya.some((x) => x > 0) && yb.some((x) => x > 0), 'real benefits, never a zero fixture').toBe(true)
    const t = breakEvenIndex(cumulative(ya), cumulative(yb))
    expect(t, 'claiming three years later pulls ahead inside these lifespans').not.toBeNull()
    {
      if (t === null) throw new Error('no crossing')
      expect(v.crossing?.age).toBe(66 + t)
      const ca = cumulative(ya)
      const cb = cumulative(yb)
      const leaderA = snapToGrain(ca[t]!) > snapToGrain(cb[t]!)
      for (let k = t; k <= last; k++) expect(leaderA ? snapToGrain(ca[k]!) >= snapToGrain(cb[k]!) : snapToGrain(cb[k]!) >= snapToGrain(ca[k]!), `year ${k} holds the lead`).toBe(true)
    }
    const yearly = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c), rows })
    if (yearly.kind !== 'pair') throw new Error(yearly.kind)
    const diff = snapToGrain(lifetimeTotal(ya)) - snapToGrain(lifetimeTotal(yb))
    expect(yearly.hero).toBe(formatDeltaDollar(diff) === '0' ? copy.claimsAboutSame : slots.claimsMoreHero(formatDeltaDollar(diff), diff > 0 ? 'more' : 'less'))
    // One scale for both strategies (insight 169).
    expect(yearly.lattice.ceiling).toBeGreaterThanOrEqual(Math.max(...ya, ...yb))
    expect(yearly.series.map((s) => [s.name, s.role])).toEqual([
      [copy.claimsStrategySeventy, 'alternative'],
      [copy.claimsStrategyPlan, 'compared'],
    ])
    expect(yearly.title).toBe(slots.claimsInSteady(copy.claimsChartAnnual))
  })
})

describe('the lifetime totals and the Summary', () => {
  const answer = headlineAnswer(RETIRED)
  const c = choicesOf(RETIRED)
  const rows: Partial<Record<StrategyId, RunRows>> = {}
  for (const s of c.strategies) rows[s.id] = ready(steadyRows(answer, s.bundle))
  const reading = (n: number, updating = false): ReadingState => ({ kind: 'ready', reading: { kind: 'headline', headline: { outcomeState: 'on-track', xOfTen: { value: n, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 } } as unknown as WhatIfReading, updating })
  const readings: Partial<Record<StrategyId, ReadingState>> = { plan: reading(8), earliest: reading(7), seventy: reading(8) }

  it('each bar is its run’s row sum on the printed grain, with its odds; your plan’s ages the compared side', () => {
    const v = claimsSummaryView({ notes: NOTES(c), rows, readings })
    if (v.kind !== 'bars') throw new Error(v.kind)
    for (const b of v.bars) {
      const r = rows[b.id] as Extract<RunRows, { kind: 'ready' }>
      const last = Math.max(...r.meta.people.map((p) => p.lastAge - p.currentAge))
      const sum = r.rows.slice(0, last + 1).reduce((a, x) => a + Math.max(0, x.socialSecurity), 0)
      expect(b.total, b.id).toBe(snapToGrain(sum))
      expect(b.figure).toBe(slots.claimsFigure(formatDeltaDollar(snapToGrain(sum))))
      expect(b.role).toBe(b.id === 'plan' ? 'compared' : 'alternative')
    }
    expect(v.bars.map((b) => b.odds)).toEqual([slots.xOfTen(8), slots.xOfTen(7), slots.xOfTen(8)])
    const top = Math.max(...v.bars.map((b) => b.total!))
    expect(v.hero).toBe(slots.claimsFigure(formatDeltaDollar(top)))
    expect(v.side[0], 'the odds under each bar are explained beside the hero').toBe(copy.claimsOddsNote)
    expect(v.lattice.ceiling).toBeGreaterThanOrEqual(top)
  })

  it('a strategy whose money runs out first leaves every other bar’s lifetime total whole: each bar sums its own years', () => {
    const full = Array.from({ length: 20 }, () => 20_000)
    const late = Array.from({ length: 20 }, (_, t) => (t < 4 ? 0 : 30_000))
    const v = claimsSummaryView({ notes: NOTES(c), rows: { plan: handRun(full, 19), earliest: handRun([20_000, 20_000, 20_000], 19, true), seventy: handRun(late, 19) }, readings })
    if (v.kind !== 'bars') throw new Error(v.kind)
    expect(v.bars.map((b) => [b.id, b.total])).toEqual([
      ['plan', 400_000],
      ['earliest', null],
      ['seventy', 480_000],
    ])
    expect(v.hero).toBe(slots.claimsFigure(formatDeltaDollar(480_000)))
    // A strategy with no lifetime total: the claim narrows to the strategies with one, never "the most of these strategies".
    expect(v.heroLine).toBe(slots.claimsSummaryLine(copy.claimsPhraseSeventy, 1, true))
    expect(v.heroLine).not.toMatch(/the most of these strategies/)
    // Every bar totalled: the plain claim.
    const whole = claimsSummaryView({ notes: NOTES(c), rows: { plan: handRun(full, 19), earliest: handRun(full, 19), seventy: handRun(late, 19) }, readings })
    expect(whole.kind === 'bars' && whole.heroLine).toBe(slots.claimsSummaryLine(copy.claimsPhraseSeventy, 1))
  })

  it('on a floor-keyed band the steady rows are the essentials-only pass, said under both views (the ran-out lines come from them)', () => {
    const full = Array.from({ length: 20 }, () => 20_000)
    const floor = (ranOut = false) => handRun(ranOut ? [20_000, 20_000, 20_000] : full, 19, ranOut, { track: 'floor' })
    const summary = claimsSummaryView({ notes: NOTES(c), rows: { plan: floor(), earliest: floor(true), seventy: floor() }, readings })
    if (summary.kind !== 'bars') throw new Error(summary.kind)
    expect(summary.notes).toContain(copy.claimsFloorTrack)
    const pair = claimsComparisonView({ chart: 'annual', a: 'earliest', b: 'plan', notes: NOTES(c), rows: { earliest: floor(true), plan: floor() } })
    expect(pair.kind === 'pair' && pair.notes).toContain(copy.claimsFloorTrack)
    // The full budget's rows: no such line.
    const fullRun = claimsSummaryView({ notes: NOTES(c), rows: { plan: handRun(full, 19), earliest: handRun(full, 19), seventy: handRun(full, 19) }, readings })
    expect(fullRun.kind === 'bars' && fullRun.notes).not.toContain(copy.claimsFloorTrack)
  })

  it('on the essentials-only pass the odds under the bars say so beside them (the ring’s own note)', () => {
    const floor: ReadingState = { kind: 'ready', reading: { kind: 'offset', reading: offsetReading({ offsetYears: 5, survivalFraction: 0.8 }, DATE_SEARCH_PATHS.final), track: 'floor' }, updating: false }
    const v = claimsSummaryView({ notes: NOTES(c), rows, readings: { ...readings, plan: floor, earliest: floor, seventy: floor } })
    if (v.kind !== 'bars') throw new Error(v.kind)
    expect(v.side).toContain(copy.snapshotRingEssentialsNote)
    const full = claimsSummaryView({ notes: NOTES(c), rows, readings })
    if (full.kind !== 'bars') throw new Error(full.kind)
    expect(full.side).not.toContain(copy.snapshotRingEssentialsNote)
  })

  it('a strategy’s odds from before the latest change mark the bars as updating, never as current', () => {
    const v = claimsSummaryView({ notes: NOTES(c), rows, readings: { ...readings, seventy: reading(8, true) } })
    if (v.kind !== 'bars') throw new Error(v.kind)
    expect(v.updating).toBe(true)
  })

  it('the page’s state clause prints under both views; the working route names the year work stops (a dated plan and a no-date one)', () => {
    const summary = claimsSummaryView({ notes: NOTES(c, 'STATE'), rows, readings })
    if (summary.kind !== 'bars') throw new Error(summary.kind)
    expect(summary.notes.at(-1)).toBe('STATE')
    const run = (route: 'dated' | 'no-date') => handRun([20_000, 20_000, 20_000], 2, false, { route, stopYear: 2031 })
    const dated = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c, 'STATE'), rows: { seventy: run('dated'), plan: run('dated') } })
    if (dated.kind !== 'pair') throw new Error(dated.kind)
    expect(dated.notes).toContain(slots.claimsWorkStops(2031))
    expect(dated.notes.at(-1)).toBe('STATE')
    const noDate = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c), rows: { seventy: run('no-date'), plan: run('no-date') } })
    if (noDate.kind !== 'pair') throw new Error(noDate.kind)
    expect(noDate.notes).toContain(slots.claimsWorkStopsNoDate(2031))
  })

  it('a strategy still running shows words, never a part of the bars', () => {
    expect(claimsSummaryView({ notes: NOTES(c), rows: { ...rows, seventy: { kind: 'loading' } }, readings }).kind).toBe('words')
    expect(claimsSummaryView({ notes: NOTES(c), rows, readings: { ...readings, earliest: { kind: 'loading' } } }).kind).toBe('words')
  })

  it('a run whose money ran out before the steady market’s end prints no lifetime total and says why', () => {
    const v = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c), rows: { seventy: handRun([20_000, 20_000, 20_000], 10, true), plan: handRun([20_000, 20_000, 20_000, 20_000], 10) } })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.hero).toBe(copy.claimsNoTotal)
    expect(v.heroLine).toBe(slots.claimsRanOut(copy.claimsStrategySeventy, RETIRED.startCalendarYear + 2))
  })

  it('the same two strategies picked: words, never a picture of one against itself', () => {
    expect(claimsComparisonView({ chart: 'annual', a: 'plan', b: 'plan', notes: NOTES(c), rows }).kind).toBe('words')
  })

  it('the pickers default to the first strategy that is not the plan, against your plan’s ages', () => {
    const v = claimsComparisonView({ chart: 'annual', a: undefined, b: undefined, notes: NOTES(c), rows })
    expect([v.a, v.b]).toEqual(['earliest', 'plan'])
  })

  it('"optimal" and "best" appear nowhere on the page', () => {
    const all = JSON.stringify([
      claimsSummaryView({ notes: NOTES(c), rows, readings }),
      claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c), rows }),
      claimsComparisonView({ chart: 'cumulative', a: 'earliest', b: 'seventy', notes: NOTES(c), rows }),
      claimsSteps(c.strategies[2]!, c.people, RETIRED.startCalendarYear, 0),
      c,
      Object.entries(copy).filter(([k]) => k.startsWith('claims') || k === 'shellPageSocialSecurity'),
    ])
    expect(all).not.toMatch(/optimal|optimi[sz]|\bbest\b/i)
  })
})

describe('the filing steps (Action Items)', () => {
  it('a numbered instruction per person, each named once, from strategy A: the age and its year', () => {
    const c = choicesOf(RETIRED)
    const seventy = c.strategies.find((s) => s.id === 'seventy')!
    const s = claimsSteps(seventy, c.people, RETIRED.startCalendarYear, 0)
    expect(s.heading).toBe(slots.claimsStepsHeading(copy.claimsStrategySeventy))
    expect(s.steps).toEqual([
      slots.claimsStepFiles('Alex', false, 70, RETIRED.startCalendarYear + 4),
      slots.claimsStepFiles('Sam', false, 70, RETIRED.startCalendarYear + 5),
    ])
    for (const name of ['Alex', 'Sam']) expect(s.steps.filter((x) => x.includes(name))).toHaveLength(1)
  })

  it('a plan built in an earlier year says its ages and filing years are as of that year, in the steps and under the charts; a plan built this year says nothing', () => {
    const c = choicesOf(RETIRED)
    const seventy = c.strategies.find((s) => s.id === 'seventy')!
    const asOf = slots.claimsAsOfBuild(RETIRED.startCalendarYear)
    expect(claimsSteps(seventy, c.people, RETIRED.startCalendarYear, 1).asOf).toBe(asOf)
    expect(claimsSteps(seventy, c.people, RETIRED.startCalendarYear, 0).asOf).toBeUndefined()
    const rows = { seventy: handRun([20_000, 20_000, 20_000], 2), plan: handRun([20_000, 20_000, 20_000], 2) }
    const aged = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c, null, 1), rows })
    if (aged.kind !== 'pair') throw new Error(aged.kind)
    expect(aged.notes).toContain(asOf)
    const fresh = claimsComparisonView({ chart: 'annual', a: 'seventy', b: 'plan', notes: NOTES(c), rows })
    if (fresh.kind !== 'pair') throw new Error(fresh.kind)
    expect(fresh.notes).not.toContain(asOf)
  })

  it('a person already claiming is named once, as nothing to file', () => {
    const d = person(RETIRED, 1, { socialSecurityClaimAge: 62 })
    const c = choicesOf(d)
    const s = claimsSteps(c.strategies[0]!, c.people, d.startCalendarYear, 0)
    expect(s.steps).toEqual([slots.claimsStepFiles('Alex', false, 67, d.startCalendarYear + 1), slots.claimsStepClaimed('Sam', false)])
  })

  it('an unnamed first person reads as you, the verb agreeing', () => {
    const d = person(RETIRED, 0, { name: '' })
    const c = choicesOf(d)
    const s = claimsSteps(c.strategies.find((x) => x.id === 'seventy')!, c.people, d.startCalendarYear, 0)
    expect(s.steps[0]).toBe(slots.claimsStepFiles('You', true, 70, d.startCalendarYear + 4))
  })
})
