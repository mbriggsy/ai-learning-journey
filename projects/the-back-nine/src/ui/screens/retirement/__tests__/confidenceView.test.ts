import { describe, expect, it } from 'vitest'
import { runEngine } from '@engine/engineProtocol'
import { fromWire } from '@engine/engineWire'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { buildSpineParams } from '@intake/intakeMap'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { NEVER_DEPLETED, type BandFanYear, type DateOffsetReading, type DateSearchOutcome, type DateTrackOutcome, type SimulationResult } from '@shared/model'
import { composeAnswerNotes } from '../../../answerNotes'
import { copy, slots } from '../../../copy'
import { DEV_SEEDS } from '../../../devSeeds'
import type { TimeAxis } from '../../../displaySettings'
import { axisTicks } from '@viz/charts/fanOptions'
import { confidenceView, runOutCounts, runOutShare, type ConfidenceView } from '../confidenceView'

/**
 * Confidence's composer (Act 6 · RC7, the plan's RC7 test scenarios that belong to the tab): the run-out share's count
 * and its words, the retired route's two charts and key metrics read off a REAL engine run of the `retired` seed, the
 * working route's stop marker and stopgap line, and an aged plan's named moments. `Confidence.tsx` draws what this
 * returns (insight 048).
 */

const RETIRED = DEV_SEEDS.retired
const DIP = DEV_SEEDS.dip

function realRun(draft: ScenarioDraft): SimulationResult {
  const params = buildSpineParams(draft)
  if (params === null) throw new Error('no spine params')
  const decoded = fromWire(runEngine(params, draft.seed!, { bandFan: true, survivorConditioned: true }))
  if (!decoded.ok) throw new Error(decoded.reason)
  return decoded.result
}
const RETIRED_RUN = realRun(RETIRED)

const headlineAnswer = (draft: ScenarioDraft, result: SimulationResult): ModelAnswer =>
  ({ kind: 'headline', tier: 'final', draft, inputKey: 'k1', result }) as unknown as ModelAnswer

const snap = (draft: ScenarioDraft, answer: ModelAnswer): MemoryModelSnapshot => ({
  draft,
  answer,
  displayed: null,
  solve: { kind: 'idle' },
  spend: { kind: 'idle' },
  refiguring: false,
  runningInWorker: false,
})

const view = (
  s: MemoryModelSnapshot,
  wallCalendarYear = s.draft.startCalendarYear,
  over: { readonly readOnly?: boolean; readonly agedBalancesYear?: number; readonly timeAxis?: TimeAxis } = {},
): ConfidenceView =>
  confidenceView({
    snapshot: s,
    onRetry: () => {},
    readOnly: over.readOnly ?? false,
    timeAxis: over.timeAxis ?? 'ages',
    notes: composeAnswerNotes(s, {
      readOnly: over.readOnly ?? false,
      stalenessNote: false,
      leftOverClauseHost: false,
      wallCalendarYear,
      agedBalancesYear: over.agedBalancesYear,
    }),
  })

const chart = (v: ConfidenceView) => {
  if (v.kind !== 'chart') throw new Error(`[test] ${v.kind}`)
  return v
}

describe('runOutCounts: the futures run out by each year', () => {
  it('counts the real depletions before each year, never the never-depleted sentinel, and never goes down', () => {
    // Depleted in simulated years 0, 2, 2 and 9; two never deplete. A path depleted in year d is at $0 by the fan's
    // year d + 1.
    const d = [2, NEVER_DEPLETED, 0, 9, NEVER_DEPLETED, 2]
    const counts = runOutCounts(d, 12)
    expect(counts).toEqual([0, 1, 1, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4])
    for (let x = 0; x <= 12; x++) {
      expect(counts[x]).toBe(d.filter((y) => y !== NEVER_DEPLETED && y < x).length)
      if (x > 0) expect(counts[x]!).toBeGreaterThanOrEqual(counts[x - 1]!)
    }
    // The sentinel is never a run-out, at any year.
    expect(runOutCounts([NEVER_DEPLETED, NEVER_DEPLETED], 40).every((c) => c === 0)).toBe(true)
  })

  it('a depletion past the last year asked for is not counted inside it', () => {
    expect(runOutCounts([30, 1], 10)).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  })
})

describe('runOutShare: "about N in 100 futures", never a percent, never "0 in 100"', () => {
  it('0.3% says fewer than 1 in 100; 3% about 3 in 100; 99.7% more than 99 in 100', () => {
    expect(runOutShare(3, 1000).words).toBe(slots.confidenceShareFewer())
    expect(runOutShare(30, 1000).words).toBe(slots.confidenceShareAbout(3))
    expect(runOutShare(997, 1000).words).toBe(slots.confidenceShareMore())
  })

  it('a share of none is a bound ("fewer than 1 in 100 futures"), never "no future": the 10-of-10 clamp’s false certainty', () => {
    expect(runOutShare(0, 16_000)).toMatchObject({ kind: 'fewer', plural: true, words: slots.confidenceShareFewer() })
    expect(runOutShare(0, 2_000).words).toBe(slots.confidenceShareFewer())
    for (let c = 0; c <= 1000; c++) expect(runOutShare(c, 1000).words).not.toMatch(/\bno future\b/)
  })

  it('exactly every future is said so; the edges round on whole counts', () => {
    expect(runOutShare(16_000, 16_000)).toMatchObject({ kind: 'every', plural: false })
    // One future of 16,000 runs out: never "0 in 100", never "none".
    expect(runOutShare(1, 16_000).kind).toBe('fewer')
    // On the .5 line (80 of 16,000 is exactly 0.5 in 100) it rounds up to 1, the same on every engine.
    expect(runOutShare(80, 16_000)).toMatchObject({ kind: 'about', n: 1 })
    expect(runOutShare(79, 16_000).kind).toBe('fewer')
    // One future of 16,000 holds: never "100 in 100".
    expect(runOutShare(15_999, 16_000).kind).toBe('more')
    // 99.5 in 100 sits on the line and is more than 99; just under it rounds to 99.
    expect(runOutShare(15_920, 16_000).kind).toBe('more')
    expect(runOutShare(15_919, 16_000)).toMatchObject({ kind: 'about', n: 99 })
  })

  it('no count from 0 to every future prints a percent, "0 in 100" or "100 in 100"', () => {
    for (let c = 0; c <= 1000; c++) {
      const w = runOutShare(c, 1000).words
      expect(w).not.toMatch(/%|percent|\b0 in 100|100 in 100/)
    }
  })

  it('a count outside the paths is refused, never worded', () => {
    expect(() => runOutShare(5, 4)).toThrow(RangeError)
    expect(() => runOutShare(-1, 4)).toThrow(RangeError)
    expect(() => runOutShare(1, 0)).toThrow(RangeError)
  })
})

describe('Confidence on the retired route (`retired`, a real engine run)', () => {
  const s = snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN))
  const v = chart(view(s))
  const depletions = RETIRED_RUN.distribution.depletionYears
  const paths = depletions.length

  it('the run-out share over the plan’s whole horizon is exactly 1 − survivalFraction, and the run has some run-outs', () => {
    const rawLast = RETIRED_RUN.distribution.bandFan!.byYear.at(-1)!.yearsFromNow
    const whole = runOutCounts(depletions, rawLast).at(-1)!
    expect(whole / paths).toBeCloseTo(1 - RETIRED_RUN.distribution.survivalFraction, 12)
    expect(whole).toBeGreaterThan(0)
  })

  it('the run-out chart runs on the fan’s own years, each point the count over every path, non-decreasing', () => {
    const run = v.runOut!
    expect(run.points.map((p) => p.x)).toEqual(v.fan.byYear.map((y) => y.yearsFromNow))
    const counts = runOutCounts(depletions, v.fan.byYear.at(-1)!.yearsFromNow)
    run.points.forEach((p, i) => {
      expect(p.per100).toBeCloseTo((counts[i]! * 100) / paths, 12)
      if (i > 0) expect(p.per100).toBeGreaterThanOrEqual(run.points[i - 1]!.per100)
      expect(p.tip).toContain(runOutShare(counts[i]!, paths).words)
    })
  })

  it('the fan is cut short of the plan (the facts on `retired`): the charts stop at the cut, and more futures run out past it', () => {
    const rawLast = RETIRED_RUN.distribution.bandFan!.byYear.at(-1)!.yearsFromNow
    const last = v.fan.byYear.at(-1)!.yearsFromNow
    expect(last).toBeLessThan(rawLast)
    expect(depletions.filter((d) => d !== NEVER_DEPLETED && d >= last).length, 'run-outs after the cut').toBeGreaterThan(0)
  })

  it('two spans, never two answers: the chart’s last point is the share by the cut; the whole plan’s names the years past it', () => {
    const last = v.fan.byYear.at(-1)!.yearsFromNow
    const atEnd = runOutShare(runOutCounts(depletions, last).at(-1)!, paths)
    const whole = runOutShare(depletions.filter((d) => d !== NEVER_DEPLETED).length, paths)
    const a = RETIRED.people[0]!.currentAge! + last
    const b = RETIRED.people[1]!.currentAge! + last
    // The chart's last point and the lead sentence are one figure.
    expect(v.runOut!.points.at(-1)!.tip).toContain(atEnd.words)
    expect(v.metrics[0]).toBe(slots.confidenceRunOutBy(a, b, atEnd.words, atEnd.plural))
    // The whole plan's figure is worded as the longer span, naming where the chart stops; never the bare "Over the whole plan".
    expect(v.metrics[1]).toBe(slots.confidenceRunOutWholePast(a, b, whole.words, whole.plural))
    expect(v.metrics).not.toContain(slots.confidenceRunOutWhole(whole.words, whole.plural))
    // That sentence also says why the charts stop there, so the separate cut line is not repeated.
    expect(v.metrics[1]).toContain(`The charts stop at ages ${a} and ${b}`)
    expect(v.metrics).not.toContain(slots.confidenceCutNote(a, b))
  })

  it('the right-hand moment says what that edge is: "Range ends" at the cut, never "Plan horizon"', () => {
    const end = v.moments.find((m) => m.yearsFromNow === v.fan.byYear.at(-1)!.yearsFromNow && m.label !== '')!
    expect(end.label).toBe(copy.bandClockCutLabel)
    expect(v.moments.map((m) => m.label)).not.toContain(copy.bandClockHorizonLabel)
  })

  it('a fan that runs to the plan’s horizon: "Plan horizon", the chart’s last point IS the whole plan’s share, said once, no cut line', () => {
    const fullCohort = { ...RETIRED_RUN.distribution.bandFan!, byYear: RETIRED_RUN.distribution.bandFan!.byYear.map((y) => ({ ...y, cohortFraction: 1 })) }
    const uncut = { ...RETIRED_RUN, distribution: { ...RETIRED_RUN.distribution, bandFan: fullCohort } }
    const w = chart(view(snap(RETIRED, headlineAnswer(RETIRED, uncut))))
    const last = w.fan.byYear.at(-1)!.yearsFromNow
    expect(last).toBe(fullCohort.byYear.at(-1)!.yearsFromNow)
    const end = w.moments.find((m) => m.yearsFromNow === last && m.label !== '')!
    expect(end.label).toBe(copy.bandClockHorizonLabel)
    const whole = runOutShare(depletions.filter((d) => d !== NEVER_DEPLETED).length, paths)
    expect(w.runOut!.points.at(-1)!.per100).toBeCloseTo(100 * (1 - RETIRED_RUN.distribution.survivalFraction), 9)
    expect(w.metrics[0]).toBe(slots.confidenceRunOutWhole(whole.words, whole.plural))
    expect(w.metrics.some((l) => l.startsWith('By ages') || l.startsWith('The charts stop'))).toBe(false)
  })

  it('no word on the tab prints a percent, "0 in 100" or an X-of-10 count', () => {
    const words = [...v.metrics, ...v.runOut!.points.flatMap((p) => [p.tip, p.sentence]), v.runOut!.title, v.title]
    for (const w of words) expect(w).not.toMatch(/%|\b0 in 100|\bof 10\b/)
  })

  it('the fan is the plan’s own, cut where the cohort thins, its moments Today and where the range ends; no stopgap', () => {
    expect(v.fan.byYear.at(-1)!.cohortFraction).toBeGreaterThanOrEqual(0.5)
    expect(v.fan.byYear.length).toBeLessThan(RETIRED_RUN.distribution.bandFan!.byYear.length)
    expect(v.moments.filter((m) => m.label !== '').map((m) => m.label)).toEqual([copy.bandClockTodayLabel, copy.bandClockCutLabel])
    expect(v.stopgap).toBeUndefined()
    expect(v.title).toBe(copy.confidenceChartTitle)
  })

  it('an aged plan names when it was built and where today sits', () => {
    const aged = chart(view(s, RETIRED.startCalendarYear + 3))
    const named = aged.moments.filter((m) => m.label !== '').map((m) => m.label)
    expect(named).toContain(copy.bandClockBuiltLabel)
    expect(named).toContain(copy.bandClockTodayLabel)
  })

  it('an aged fan ships beside its premise (U17 §S2): the build year on a re-save, the save year on an old save, the door only where the tab can write', () => {
    expect(v.premise, 'a fresh plan draws no "Plan built", so no premise').toBeUndefined()
    const fresh = chart(view(s, RETIRED.startCalendarYear + 3))
    expect(fresh.premise).toEqual({ text: slots.bandAgedPremiseFresh(RETIRED.startCalendarYear), door: { label: copy.bandPremiseReconfirmCta } })
    const saved = chart(view(s, RETIRED.startCalendarYear + 3, { agedBalancesYear: RETIRED.startCalendarYear + 1 }))
    expect(saved.premise?.text).toBe(slots.bandAgedPremiseSaved(RETIRED.startCalendarYear + 1))
    const readOnly = chart(view(s, RETIRED.startCalendarYear + 3, { readOnly: true }))
    expect(readOnly.premise).toEqual({ text: `${slots.bandAgedPremiseFresh(RETIRED.startCalendarYear)} ${copy.bandPremiseReadOnly}` })
  })

  it('a cut fan with no run-out past the cut: the one whole-plan line, then the cut line (never dropped)', () => {
    const none = { ...RETIRED_RUN, distribution: { ...RETIRED_RUN.distribution, depletionYears: depletions.map(() => NEVER_DEPLETED) } }
    const w = chart(view(snap(RETIRED, headlineAnswer(RETIRED, none))))
    const last = w.fan.byYear.at(-1)!.yearsFromNow
    const a = RETIRED.people[0]!.currentAge! + last
    const b = RETIRED.people[1]!.currentAge! + last
    expect(w.metrics.slice(0, 2)).toEqual([slots.confidenceRunOutWhole(slots.confidenceShareFewer(), true), slots.confidenceCutNote(a, b)])
  })

  it('the time axis (Act 6 · RC18): ages by default, as before; on the years axis both charts tick on the calendar year and their words say "year"', () => {
    const age0 = RETIRED.people[0]!.currentAge!
    const year0 = RETIRED.startCalendarYear
    const last = v.fan.byYear.at(-1)!.yearsFromNow
    // The default: the fan and the run-out chart on the first person's age, the run-out words about an age.
    expect(v.labels.tickAt(5)).toBe(age0 + 5)
    expect(v.labels.xAxisTitle).toBe(slots.snapshotFanAgeAxis(RETIRED.people[0]!.name!))
    expect(v.runOut!.labels.tickAt(5)).toBe(age0 + 5)
    expect(v.runOut!.title).toBe(slots.confidenceRunOutTitle())
    expect(v.runOut!.labels.words.title).toBe(copy.confidenceRunOutName)
    expect(v.runOut!.labels.description).toBe(slots.confidenceRunOutDescription())
    // The years axis: the same points (the run-out chart's years and its words are untouched), on the calendar year.
    const y = chart(view(s, undefined, { timeAxis: 'years' }))
    expect(y.labels.tickAt(5)).toBe(year0 + 5)
    expect(y.labels.xAxisTitle).toBe(copy.chartAxisYear)
    expect(y.runOut!.labels.tickAt(5)).toBe(year0 + 5)
    expect(axisTicks(last, y.runOut!.labels.tickAt).every((t) => (year0 + t) % 10 === 0)).toBe(true)
    expect(y.runOut!.points).toEqual(v.runOut!.points)
    expect(y.runOut!.title).toBe('Futures that have run out of money by this year, out of every 100')
    expect(y.runOut!.labels.words.title).toBe(copy.confidenceRunOutNameYear)
    expect(y.runOut!.labels.description).toBe(slots.confidenceRunOutDescription('year'))
    expect(y.runOut!.labels.description).toContain('by each year')
    expect(y.metrics).toEqual(v.metrics)
  })
})

describe('Confidence on the working route (`dip`)', () => {
  const year = (t: number): BandFanYear => ({ yearsFromNow: t, p10: 500_000, p25: 800_000, p50: 1_000_000 + t, p75: 1_300_000, p90: 1_800_000, cohortFraction: 1 })
  const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({ offsetYears, survivalFraction: qlb, quantizedLowerBound: qlb, clears: qlb >= 0.85 })
  const curve = [0.5, 0.7, 0.8, 0.86, 0.9, 0.92].map((q, i) => reading(i, q))
  const track: DateTrackOutcome = {
    kind: 'confirmed-date',
    offsetYears: 3,
    grade: { quantizedLowerBound: 0.86, survivalFraction: 0.86, marginAboveBar: 0.01 },
    nonMonotoneOffsets: [],
    curve,
  }
  const answer = {
    kind: 'date',
    tier: 'final',
    draft: DIP,
    inputKey: 'k1',
    outcome: {
      kind: 'dates',
      tier: 'final',
      floor: track,
      lifestyle: track,
      windowTopYears: DATE_OFFSET_WINDOW_TOP,
      seed: 1,
      band: { offsetYears: 3, track: 'lifestyle', fan: { byYear: Array.from({ length: 30 }, (_, t) => year(t)) }, outcomeState: 'on-track' },
    } as unknown as DateSearchOutcome,
  } as unknown as ModelAnswer
  const v = chart(view(snap(DIP, answer)))
  /** The same answer on another draft and band (its track, its cohort). */
  const withBand = (draft: ScenarioDraft, band: object): ModelAnswer =>
    ({ ...answer, draft, outcome: { ...(answer as { outcome: object }).outcome, band } }) as unknown as ModelAnswer

  it('a working fan cut where the cohort thins (every real working household’s): "Range ends" at the cut and the cut line, never "Plan horizon"', () => {
    const thinning = Array.from({ length: 30 }, (_, t) => ({ ...year(t), cohortFraction: t <= 20 ? 0.9 : 0.3 }))
    const w = chart(view(snap(DIP, withBand(DIP, { offsetYears: 3, track: 'lifestyle', fan: { byYear: thinning }, outcomeState: 'on-track' }))))
    expect(w.fan.byYear.at(-1)!.yearsFromNow).toBe(20)
    const end = w.moments.find((m) => m.yearsFromNow === 20 && m.label !== '')!
    expect(end.label).toBe(copy.bandClockCutLabel)
    expect(w.moments.map((m) => m.label)).not.toContain(copy.bandClockHorizonLabel)
    expect(w.metrics).toContain(slots.confidenceCutNote(DIP.people[0]!.currentAge! + 20, DIP.people[1]!.currentAge! + 20))
  })

  it('a floor-keyed band (`datemixed`: the lifestyle track undated) says under the fan that it prices the essentials only, with both levels', () => {
    const mixed = DEV_SEEDS.datemixed
    const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve }
    const floorAnswer = {
      ...(withBand(mixed, { offsetYears: 3, track: 'floor', fan: { byYear: Array.from({ length: 30 }, (_, t) => year(t)) }, outcomeState: 'on-track' }) as object),
    } as { outcome: object }
    const a = { ...floorAnswer, outcome: { ...floorAnswer.outcome, lifestyle: noDate } } as unknown as ModelAnswer
    const w = chart(view(snap(mixed, a)))
    // Essentials lines $52,000 plus $8,000 of medical; the full budget's $90,000 of lines plus the same medical.
    expect(w.trackNote).toBe(slots.bandPricesEssentialsWithLevels('60,000', '98,000'))
    expect(w.trackNote).toMatch(/essentials only/)
  })

  it('a lifestyle-keyed band affirms the full budget under the fan (every band says whose world it draws)', () => {
    expect(v.trackNote).toBeDefined()
    expect(v.trackNote).toMatch(/full budget/)
    expect(v.trackNote).not.toMatch(/date above/)
  })

  it('the stop-year marker sits at the band’s offset; the stopgap line stands in the run-out chart’s place', () => {
    expect(v.route).toBe('date')
    const stop = v.moments.find((m) => m.label === copy.bandClockWorkStopsLabel || m.label === copy.bandClockWorkStopsSplitLabel)
    expect(stop?.yearsFromNow).toBe(3)
    expect(v.runOut).toBeUndefined()
    expect(v.stopgap).toBe(copy.confidenceRunOutStopgap)
    expect(chart(view(snap(DIP, answer), undefined, { timeAxis: 'years' })).stopgap).toBe(copy.confidenceRunOutStopgapYear)
    // This hand-built band is never cut (its cohort stays whole): its edge is the plan's horizon and no cut line shows.
    expect(v.moments.find((m) => m.yearsFromNow === 29)?.label).toBe(copy.bandClockHorizonLabel)
    expect(v.metrics.some((l) => l.startsWith('The charts stop'))).toBe(false)
    expect(v.metrics.join(' ')).not.toMatch(/in 100 futures/)
  })
})
