import { describe, expect, it } from 'vitest'
import { runEngine } from '@engine/engineProtocol'
import { fromWire } from '@engine/engineWire'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { buildSpineParams } from '@intake/intakeMap'
import { applyBundle } from '@intake/whatIf'
import { createLaneGroup, type EngineRunRequest } from '@store/runLanes'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft, StickyDisplay } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import { isDepleted, type DateOffsetReading, type DateSearchOutcome, type DateTrackOutcome, type Headline, type SavedRecommendationV3, type SimulationResult } from '@shared/model'
import { BAR_RUNG } from '@viz/curveMarks'
import { niceLattice } from '@viz/bandData'
import { composeAnswerNotes } from '../../../answerNotes'
import { copy, slots } from '../../../copy'
import { dateOddsText } from '../../../dateOdds'
import { DEV_SEEDS } from '../../../devSeeds'
import { spendingBasisLine } from '../../../survivorLines'
import { formatDeltaDollar, formatPerMonth, mmAxisFormatterFor } from '../../../money'
import { recommendationBundle } from '../../../workbench/railChrome'
import { createWhatIfSlot, headlineExtras, whatIfSlotView, type WhatIfReading, type WhatIfSlotLanes, type WhatIfSlotView } from '../../../workbench/whatIfRun'
import { snapshotView } from '../../dashboard/snapshotView'
import { landingPick, probabilityView, recommendedOffer, shareRowNotes, type HalfView, type ProbabilityInput, type ProbabilityView } from '../probabilityView'

/**
 * Probability's composer (Act 6 · RC4, the plan's RC4 test scenarios that belong to the page): every honesty law of the
 * two halves, the intro, the key-metric column, the states and the Odds by stop year chart is decided here and read by
 * `Probability.tsx` (insight 048). The retired route reads a REAL engine run of the `retired` seed (never a typed
 * reading); the working route's curves are hand-built so each law is pinned on the curve it names.
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

function applyBundleOk(draft: ScenarioDraft, bundle: ProbabilityInput['whatIf']['bundle']): ScenarioDraft {
  const applied = applyBundle(draft, bundle)
  if (!applied.ok) throw new Error(`[test setup] refused: ${applied.refusal.kind}`)
  return applied.draft
}

const headlineAnswer = (draft: ScenarioDraft, result: SimulationResult): ModelAnswer =>
  ({ kind: 'headline', tier: 'final', draft, inputKey: 'k1', result }) as unknown as ModelAnswer

const snap = (draft: ScenarioDraft, answer: ModelAnswer, over: Partial<MemoryModelSnapshot> = {}): MemoryModelSnapshot => ({
  draft,
  answer,
  displayed: null,
  solve: { kind: 'idle' },
  spend: { kind: 'idle' },
  refiguring: false,
  runningInWorker: false,
  ...over,
})

const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({ offsetYears, survivalFraction: qlb, quantizedLowerBound: qlb, clears: qlb >= 0.85 })
/** A curve over offsets 0..n-1 from the given quantized lower bounds. */
const curveOf = (qlbs: readonly number[]): DateOffsetReading[] => qlbs.map((q, i) => reading(i, q))

// A dipped curve: offset 2 clears then 3 dips below the line, the durable date is 5; offsets 8 to 10 read at the ceiling,
// so the TALLEST column (10, at the ceiling) is not the crown.
const DIP_CURVE = curveOf([0.5, 0.7, 0.88, 0.8, 0.84, 0.86, 0.9, 0.92, 0.96, 0.97, 0.97])
const confirmed = (curve: DateOffsetReading[], offsetYears: number, dips: readonly number[] = []): DateTrackOutcome => ({
  kind: 'confirmed-date',
  offsetYears,
  grade: { quantizedLowerBound: curve[offsetYears]!.quantizedLowerBound, survivalFraction: curve[offsetYears]!.quantizedLowerBound, marginAboveBar: 0.01 },
  nonMonotoneOffsets: dips,
  curve,
})
const LIFESTYLE = confirmed(DIP_CURVE, 5, [2])

const dateAnswer = (
  draft: ScenarioDraft,
  floor: DateTrackOutcome,
  lifestyle: DateTrackOutcome,
  band: { offsetYears: number; track: 'floor' | 'lifestyle' } | undefined,
  tier: 'final' | 'provisional' = 'final',
): ModelAnswer =>
  ({
    kind: 'date',
    tier,
    draft,
    inputKey: 'k1',
    outcome: {
      kind: 'dates',
      tier,
      floor,
      lifestyle,
      windowTopYears: DATE_OFFSET_WINDOW_TOP,
      seed: 1,
      ...(band !== undefined ? { band: { ...band, fan: { byYear: [] }, outcomeState: 'on-track' } } : {}),
    } as unknown as DateSearchOutcome,
  }) as unknown as ModelAnswer

function input(snapshot: MemoryModelSnapshot, over: Partial<ProbabilityInput> = {}): ProbabilityInput {
  const wallCalendarYear = snapshot.draft.startCalendarYear
  return {
    snapshot,
    wallCalendarYear,
    readOnly: false,
    onRetry: () => {},
    notes: composeAnswerNotes(snapshot, { readOnly: false, stalenessNote: false, leftOverClauseHost: false, wallCalendarYear }),
    whatIf: { pick: 'new', bundle: [], view: null },
    chart: 'rings',
    sameScale: true,
    ...over,
  }
}

const reads = (v: ProbabilityView) => {
  if (v.kind !== 'reading') throw new Error(`[test] ${v.kind}`)
  return v
}
const ringCentre = (h: { ring: { kind: string; face?: { centre?: string } } }): string | undefined => (h.ring.kind === 'face' ? h.ring.face?.centre : undefined)

/** A ready what-if slot view for one reading (and the spine's extras). */
const readyView = (whatIf: WhatIfReading, plan: WhatIfReading, extras?: object): WhatIfSlotView => ({
  kind: 'shown',
  many: { kind: 'ready', value: { plan, whatIf, ...(extras !== undefined ? { extras } : {}) }, answerKey: 'a', updating: false },
  steady: { kind: 'loading' },
  rough: { kind: 'loading' },
  planHealth: { kind: 'loading' },
})

const headline = (n: number, state: Headline['outcomeState'] = 'on-track'): Headline => ({ outcomeState: state, xOfTen: { value: n, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 })
const SPEND_LEVER = [{ kind: 'spending', op: 'total', annualSpendingReal: 80_000 }] as unknown as ProbabilityInput['whatIf']['bundle']

describe('RAW, everywhere the clone prints a count (RC4’s ruling): a held sticky triple never prints', () => {
  it('one snapshot whose `displayed` holds 8 over a raw 9 prints 9 on Snapshot’s ring and every Probability count', () => {
    const answer = headlineAnswer(RETIRED, { ...RETIRED_RUN, headline: headline(9) })
    const held: StickyDisplay = { xOfTen: 8, outcomeState: 'on-track', spendPerMonthReal: RETIRED_RUN.dollar.spendPerMonthReal, direction: RETIRED_RUN.dollar.direction }
    const s = snap(RETIRED, answer, { displayed: held })
    const nine = slots.xOfTen(9)
    const eight = slots.xOfTen(8)
    // Snapshot's ring.
    const home = snapshotView({ snapshot: s, wallCalendarYear: RETIRED.startCalendarYear, readOnly: false, onRetry: () => {}, steady: { kind: 'waiting' }, recommendation: { solve: s.solve, save: { kind: 'none' }, todayEpochDay: 20_000 }, timeAxis: 'ages' })
    expect(home.ring.view.kind === 'reading' && home.ring.view.face.centre).toBe(nine)
    // Probability: both rings (the empty what-if reads the plan), the intro sentence, the difference line.
    const v = reads(probabilityView(input(s)))
    expect(ringCentre(v.halves.compared)).toBe(nine)
    expect(ringCentre(v.halves.alternative)).toBe(nine)
    expect(v.intro.lead).toContain(nine)
    const printed = JSON.stringify(v)
    expect(printed).not.toContain(eight)
    // With a lever pulled whose run reads 9 as well, the difference line speaks the raw 9 on both sides.
    const pulled = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: readyView({ kind: 'headline', headline: headline(9) }, { kind: 'headline', headline: headline(9) }) } })))
    expect(pulled.metrics.difference).toBe(slots.workbenchRailEven(nine))
  })
})

describe('Probability, the retired route (`retired`, a real engine run)', () => {
  const s = snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN))
  const v = reads(probabilityView(input(s)))

  it('the right ring reads the headline, its count through the X-of-10 slots', () => {
    const h = RETIRED_RUN.headline
    expect(ringCentre(v.halves.compared)).toBe(h.outcomeState === 'over-funded' ? slots.xOfTenAtCeiling() : slots.xOfTen(h.xOfTen.value))
    expect(v.halves.compared.title).toBe(copy.probabilityPlanTitle)
  })

  it('the survivor row appears exactly when the run carries a survivor reading, with its spending basis', () => {
    const sr = RETIRED_RUN.survivorReading
    const row = v.halves.compared.rows.find((r) => r.text.startsWith(slots.probabilitySurvivorRow('').trim()))
    expect(row !== undefined).toBe(sr !== undefined)
    // Without a survivor reading, no survivor row.
    const { survivorReading: _gone, ...noSurvivor } = RETIRED_RUN
    const bare = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, noSurvivor as SimulationResult)))))
    expect(bare.halves.compared.rows.some((r) => r.text.startsWith('As the survivor'))).toBe(false)
  })

  it('the survivor row prints the survivor reading’s own count, never the headline’s, and its spending basis is said once under both halves', () => {
    const sr = RETIRED_RUN.survivorReading
    if (sr === undefined) throw new Error('[test] the retired seed is a couple: its run carries a survivor reading')
    const basis = spendingBasisLine(sr.spendingBasis)
    // The retired seed's basis is steady, so the line is drawn (the e2e retired frame arm reads it on the page too).
    expect(basis?.startsWith('This assumes about $')).toBe(true)
    const planted = { ...RETIRED_RUN, headline: headline(5, 'borderline'), survivorReading: { ...sr, outcomeState: 'on-track' as const, xOfTen: { ...sr.xOfTen, value: 8 } } }
    const w = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, planted)))))
    for (const side of ['alternative', 'compared'] as const) {
      const row = w.halves[side].rows.find((r) => r.text.startsWith('As the survivor'))
      expect(row?.text, `${side}: the survivor’s own count`).toBe(`As the survivor: ${slots.xOfTen(8)}`)
      expect(row?.notes, `${side}: the basis is shared, not repeated in the half`).toEqual([])
    }
    expect(w.sharedNotes).toContain(basis)
  })

  const stepDownLine = (drop: string) =>
    `If one of you is on your own later, the household’s monthly income steps down about ~$${drop} — as one Social Security benefit ends. Taxes also move to a single filer’s brackets.`

  it('the survivor row carries the income step-down after its basis (the old survivor card’s context), said once under both halves when both match', () => {
    const sr = RETIRED_RUN.survivorReading
    if (sr === undefined) throw new Error('[test] the retired seed is a couple: its run carries a survivor reading')
    const drop = formatPerMonth(sr.incomeStepDownMonthlyReal)
    expect(drop, '[test setup] the retired couple’s income steps down').not.toBe('0')
    expect(v.sharedNotes).toEqual([spendingBasisLine(sr.spendingBasis), stepDownLine(drop)])
    // A drop that rounds to $0 prints no step-down line, never "about $0".
    const flat = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, { ...RETIRED_RUN, survivorReading: { ...sr, incomeStepDownMonthlyReal: 0.2 } })))))
    expect(flat.sharedNotes).toEqual([spendingBasisLine(sr.spendingBasis)])
    expect(JSON.stringify(flat)).not.toContain('steps down')
  })

  it('a what-if that moves the step-down (a claim age): each half keeps its own, the basis they share said once', () => {
    const sr = RETIRED_RUN.survivorReading
    if (sr === undefined) throw new Error('[test] the retired seed is a couple: its run carries a survivor reading')
    const planExtras = headlineExtras(RETIRED_RUN)
    const whatIfExtras = { ...planExtras, survivorReading: { ...sr, incomeStepDownMonthlyReal: sr.incomeStepDownMonthlyReal + 500 } }
    const plan: WhatIfReading = { kind: 'headline', headline: RETIRED_RUN.headline }
    const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: readyView(plan, plan, whatIfExtras) } })))
    const survivorNotes = (side: 'alternative' | 'compared') => w.halves[side].rows.find((r) => r.text.startsWith('As the survivor'))?.notes
    expect(survivorNotes('compared')).toEqual([stepDownLine(formatPerMonth(sr.incomeStepDownMonthlyReal))])
    expect(survivorNotes('alternative')).toEqual([stepDownLine(formatPerMonth(sr.incomeStepDownMonthlyReal + 500))])
    expect(w.sharedNotes).toEqual([spendingBasisLine(sr.spendingBasis)])
  })

  it('the essentials row appears only when the floor reading differs from the headline (the relief gate)', () => {
    const same = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, { ...RETIRED_RUN, floorReading: RETIRED_RUN.headline })))))
    expect(same.halves.compared.rows.some((r) => r.text.startsWith('Essentials only'))).toBe(false)
    const differs = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, { ...RETIRED_RUN, headline: headline(6, 'borderline'), floorReading: headline(9) })))))
    expect(differs.halves.compared.rows.map((r) => r.text)).toContain(slots.probabilityEssentialsRow(slots.xOfTen(9)))
  })

  it('the bar’s median equals the median of terminalValuesReal, and its label says “when the second of you dies”', () => {
    const sorted = [...RETIRED_RUN.distribution.terminalValuesReal].sort((a, b) => a - b)
    const n = sorted.length
    const median = n % 2 === 1 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2
    expect(v.halves.compared.barMedian).toBe(median)
    expect(v.bars).toBeDefined()
    expect(v.bars!.label).toContain('when the second of you dies')
    expect(v.bars!.caption).toContain('when the second of you dies')
    expect(JSON.stringify(v)).not.toMatch(/ending assets/i)
    // The empty what-if is the plan itself: its bar reads the plan's median, on one shared scale.
    expect(v.halves.alternative.barMedian).toBe(median)
    expect(v.bars!.scales.alternative).toBe(v.bars!.scales.compared)
    expect(v.bars!.scales.compared.lattice.ceiling).toBeGreaterThanOrEqual(median)
    // Each printed figure is a projected dollar figure: it wears "~".
    expect(v.bars!.figures.compared?.startsWith('~')).toBe(true)
    expect(v.bars!.figures.alternative?.startsWith('~')).toBe(true)
  })

  it('the Display drawer’s "same scale" (Act 6 · RC18): on, ONE lattice for both bars and no line; off, each bar on the lattice over its own median and the line that says the heights don’t compare', () => {
    const planExtras = headlineExtras(RETIRED_RUN)
    const median = v.halves.compared.barMedian!
    // A what-if whose median is 40% of the plan's: on one scale its bar stands well short of the plan's.
    const small = median * 0.4
    const plan: WhatIfReading = { kind: 'headline', headline: RETIRED_RUN.headline }
    const at = (sameScale: boolean) =>
      reads(probabilityView(input(s, { sameScale, whatIf: { pick: 'new', bundle: SPEND_LEVER, view: readyView(plan, plan, { ...planExtras, terminalMedianReal: small }) } }))).bars!
    const one = at(true)
    expect(one.scales.alternative).toBe(one.scales.compared)
    expect(one.scales.compared.lattice).toEqual(niceLattice(median))
    expect(one.ownScales).toBeUndefined()
    const own = at(false)
    expect(own.scales.alternative.lattice).toEqual(niceLattice(small))
    expect(own.scales.compared.lattice).toEqual(niceLattice(median))
    expect(own.scales.alternative.lattice.ceiling, '[test setup] the two own scales differ').toBeLessThan(own.scales.compared.lattice.ceiling)
    expect(own.scales.alternative.axisDollar(own.scales.alternative.lattice.ceiling)).toBe(mmAxisFormatterFor(own.scales.alternative.lattice.ceiling)(own.scales.alternative.lattice.ceiling))
    expect(own.ownScales).toBe(copy.probabilityBarOwnScales)
    expect(own.figures).toEqual(one.figures)
    // Off, but both medians the same (no lever pulled: the empty what-if IS the plan): one lattice, so the heights
    // still compare and no line says otherwise.
    const same = reads(probabilityView(input(s, { sameScale: false }))).bars!
    expect(same.scales.alternative.lattice).toEqual(same.scales.compared.lattice)
    expect(same.ownScales).toBeUndefined()
  })

  it('every median at $0 (half or more of the futures use their savings up first): words in the bars’ place, never a silent gap', () => {
    const spent = { ...RETIRED_RUN, distribution: { ...RETIRED_RUN.distribution, terminalValuesReal: [0, 0, 0, 5] } }
    const w = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, spent)))))
    expect(w.bars).toBeUndefined()
    expect(w.barsNone).toBe(copy.probabilityBarNone)
    expect(w.halves.compared.barMedian).toBe(0)
  })

  it('no lever pulled: the left half reads the plan’s own reading, and the line beside the halves says “No changes yet”', () => {
    expect(v.halves.alternative.status, 'said once, in the key-metric column').toBeUndefined()
    expect(v.halves.alternative.ring).toEqual(v.halves.compared.ring)
    expect(v.metrics.difference).toBe(copy.probabilityNoChanges)
    expect(v.halves.alternative.title).toBe(copy.probabilityPickNew)
  })

  it('the intro is the confidence statement, and the key-metric column carries its spend clause', () => {
    const h = RETIRED_RUN.headline
    expect(v.intro.lead).toContain(copy.confidenceCoverageCaption)
    expect(v.intro.lead).toContain(h.outcomeState === 'over-funded' ? slots.xOfTenAtCeiling() : slots.xOfTen(h.xOfTen.value))
    expect(v.metrics.lines.length).toBeGreaterThan(0)
    expect(v.charts.map((c) => c.id)).toEqual(['rings'])
    expect(v.odds).toBeUndefined()
  })

  it('the difference line speaks the two printed counts and nothing else', () => {
    const plan: WhatIfReading = { kind: 'headline', headline: headline(7) }
    const w = reads(
      probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, { ...RETIRED_RUN, headline: headline(7) })), { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: readyView({ kind: 'headline', headline: headline(8) }, plan) } })),
    )
    expect(w.metrics.difference).toBe(slots.probabilityDifference(slots.xOfTen(7), slots.xOfTen(8), copy.probabilityPickNew.toLowerCase()))
    expect(ringCentre(w.halves.alternative)).toBe(slots.xOfTen(8))
  })

  it('a what-if in flight with no figure shows the working words; with an older figure it fades under Loading and keeps it', () => {
    const pending = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: null } })))
    expect(pending.halves.alternative.status).toBe(copy.workbenchRailWorking)
    expect(pending.metrics.difference).toBeNull()
    const older: WhatIfSlotView = {
      kind: 'shown',
      many: { kind: 'ready', value: { plan: { kind: 'headline', headline: headline(7) }, whatIf: { kind: 'headline', headline: headline(6) } }, answerKey: 'old', updating: true },
      steady: { kind: 'loading' },
      rough: { kind: 'loading' },
      planHealth: { kind: 'loading' },
    }
    const veiled = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: older } })))
    expect(veiled.halves.alternative.loading).toBe(true)
    expect(ringCentre(veiled.halves.alternative)).toBe(slots.xOfTen(6))
  })

  it('a refused what-if says why by name, and runs nothing', () => {
    const refused = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: { kind: 'refused', refusal: { kind: 'no-seed' } } } })))
    expect(refused.halves.alternative.status).toBeDefined()
    expect(refused.halves.alternative.ring.kind).toBe('empty')
  })
})

describe('Probability, the working route (hand-built curves on `dip`)', () => {
  const answer = dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' })
  const s = snap(DIP, answer)
  const v = reads(probabilityView(input(s)))

  it('the right ring equals round(quantizedLowerBound·10) of the committed curve at the base offset, captioned with its year', () => {
    const expected = Math.round(DIP_CURVE[5]!.quantizedLowerBound * 10)
    expect(ringCentre(v.halves.compared)).toBe(slots.xOfTen(expected))
    const ring = v.halves.compared.ring
    expect(ring.kind === 'face' && ring.face.caption).toBe(slots.snapshotRingStopIn(DIP.startCalendarYear + 5))
  })

  it('no bar on either half, and the survivor stopgap line on both', () => {
    expect(v.bars).toBeUndefined()
    expect(v.halves.compared.barMedian).toBeUndefined()
    expect(v.halves.compared.stopgap).toBe(copy.probabilitySurvivorStopgap)
    expect(v.halves.alternative.stopgap).toBe(copy.probabilitySurvivorStopgap)
    expect(v.halves.compared.rows).toEqual([])
  })

  it('a stop-year what-if’s ring names its own year', () => {
    const plan: WhatIfReading = { kind: 'offset', reading: DIP_CURVE[5]!, track: 'full' }
    const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: readyView({ kind: 'offset', reading: DIP_CURVE[8]!, track: 'full' }, plan) } })))
    const ring = w.halves.alternative.ring
    expect(ring.kind === 'face' && ring.face.caption).toBe(slots.snapshotRingStopIn(DIP.startCalendarYear + 8))
    expect(ringCentre(w.halves.alternative)).toBe(slots.xOfTenAtCeiling())
    // The difference line on offset readings: the plan's 9 against the what-if's ceiling are two counts, never "Both read".
    expect(w.metrics.difference).toBe(slots.probabilityDifference(dateOddsText(DIP_CURVE[5]!.quantizedLowerBound), dateOddsText(DIP_CURVE[8]!.quantizedLowerBound), copy.probabilityPickNew.toLowerCase()))
    // Two offsets that both print 9 read even.
    const nine = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: readyView({ kind: 'offset', reading: DIP_CURVE[6]!, track: 'full' }, plan) } })))
    expect(nine.metrics.difference).toBe(slots.workbenchRailEven(dateOddsText(DIP_CURVE[5]!.quantizedLowerBound)))
  })

  it('the intro is the hero date sentence; the dip note rides it; Recommended is never offered here', () => {
    expect(v.intro.lines).toContain(copy.dateNonMonotoneNote)
    expect(v.picker.items.map((i) => i.value)).toEqual(['new'])
    expect(v.charts.map((c) => c.id)).toEqual(['rings', 'odds'])
  })

  it('a provisional answer wears the provisional tag; a re-figuring one the re-figuring line over the old answer', () => {
    const prov = reads(probabilityView(input(snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }, 'provisional')))))
    expect(prov.intro.eyebrow).toBe(copy.answerProvisionalTag)
    const refig = reads(probabilityView(input(snap(DIP, answer, { refiguring: true }))))
    expect(refig.intro.eyebrow).toBe(copy.answerRefiguringDate)
    expect(ringCentre(refig.halves.compared)).toBe(ringCentre(v.halves.compared))
  })

  it('a what-if waiting on the final tier says so (U14 runs what-ifs at the final tier only)', () => {
    const prov = snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }, 'provisional'))
    const w = reads(probabilityView(input(prov, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: null } })))
    expect(w.halves.alternative.status).toBe(copy.probabilityWaitingFinal)
  })

  it('the window-edge tell rides the intro on a window-edge date', () => {
    const edge: DateTrackOutcome = {
      kind: 'window-edge-unconfirmed',
      offsetYears: 10,
      grade: { quantizedLowerBound: 0.97, survivalFraction: 0.97, marginAboveBar: 0.12 },
      nonMonotoneOffsets: [],
      curve: DIP_CURVE,
    }
    const e = reads(probabilityView(input(snap(DIP, dateAnswer(DIP, edge, edge, { offsetYears: 10, track: 'lifestyle' })))))
    expect(e.intro.lines).toContain(copy.dateWindowEdgeNote)
  })
})

describe('Probability, a floor-dated household (`datemixed`): both rings read the floor curve', () => {
  const floorCurve = curveOf([0.6, 0.86, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9])
  const lifeCurve = curveOf([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.8, 0.8])
  const floor = confirmed(floorCurve, 1)
  const life: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: lifeCurve }
  const d = DEV_SEEDS.datemixed
  const s = snap(d, dateAnswer(d, floor, life, { offsetYears: 1, track: 'floor' }))
  const note = (h: HalfView) => (h.ring.kind === 'face' ? h.ring.face.note : undefined)
  const floorAt = (offsetYears: number): WhatIfReading => ({ kind: 'offset', reading: floorCurve[offsetYears]!, track: 'floor' })

  it('the plan’s ring reads the floor track at the band’s offset, never the lifestyle curve', () => {
    const v = reads(probabilityView(input(s)))
    expect(ringCentre(v.halves.compared)).toBe(slots.xOfTen(Math.round(floorCurve[1]!.quantizedLowerBound * 10)))
    // The empty what-if reads the plan: the floor curve too.
    expect(ringCentre(v.halves.alternative)).toBe(ringCentre(v.halves.compared))
  })

  it('both rings name the essentials pass, under the no-date lead: a floor count never reads as the full budget’s', () => {
    const v = reads(probabilityView(input(s)))
    expect(v.intro.lead).toBe(slots.noDateInWindow(DATE_OFFSET_WINDOW_TOP))
    expect(note(v.halves.compared)).toBe(copy.snapshotRingEssentialsNote)
    expect(note(v.halves.alternative)).toBe(copy.snapshotRingEssentialsNote)
    // A landed what-if on the floor track names it too (one pass on both sides, never the plan's alone).
    const extras = [{ kind: 'spending', op: 'remove', lineId: 'line-travel' }] as unknown as ProbabilityInput['whatIf']['bundle']
    const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: extras, view: readyView(floorAt(1), floorAt(1)) } })))
    expect(note(w.halves.alternative)).toBe(copy.snapshotRingEssentialsNote)
  })

  it('an extras-only what-if beside your plan says why the odds can’t move, in place of "Both read" (U15’s floorUnread line)', () => {
    const extras = [{ kind: 'spending', op: 'remove', lineId: 'line-travel' }] as unknown as ProbabilityInput['whatIf']['bundle']
    const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: extras, view: readyView(floorAt(1), floorAt(1)) } })))
    expect(w.metrics.difference).toBe(copy.workbenchRailFloorUnread)
    expect(w.metrics.differenceReserve.length, 'the reserve holds the reason, so its landing moves nothing').toBeGreaterThanOrEqual(copy.workbenchRailFloorUnread.length)
    // An essential line moves the floor: equal counts there are the even line, never the reason.
    const essentials = [{ kind: 'spending', op: 'remove', lineId: 'line-food' }] as unknown as ProbabilityInput['whatIf']['bundle']
    const e = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: essentials, view: readyView(floorAt(1), floorAt(1)) } })))
    expect(e.metrics.difference).toBe(slots.workbenchRailEven(dateOddsText(floorCurve[1]!.quantizedLowerBound)))
    // The full track (a lifestyle-keyed band) never prints it.
    const full = snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }))
    const fullAt: WhatIfReading = { kind: 'offset', reading: DIP_CURVE[5]!, track: 'full' }
    const f = reads(probabilityView(input(full, { whatIf: { pick: 'new', bundle: extras, view: readyView(fullAt, fullAt) } })))
    expect(f.metrics.difference).not.toBe(copy.workbenchRailFloorUnread)
  })

  it('your plan on the LEFT (the empty what-if) beside an extras-only kept what-if says the same reason, never "Both read"', () => {
    const extras = [{ kind: 'spending', op: 'remove', lineId: 'line-travel' }] as unknown as ProbabilityInput['whatIf']['bundle']
    const dk: ScenarioDraft = { ...d, keptWhatIfs: [{ id: 'x', name: 'Fewer trips', levers: extras }] as unknown as NonNullable<ScenarioDraft['keptWhatIfs']> }
    const sk = snap(dk, dateAnswer(dk, floor, life, { offsetYears: 1, track: 'floor' }))
    const v = reads(probabilityView(input(sk, { whatIf: { pick: 'new', bundle: [], view: null }, compared: { pick: 'kept:x', bundle: extras, view: readyView(floorAt(1), floorAt(1)) } })))
    expect(v.halves.compared.title).toBe('Fewer trips')
    expect(v.metrics.difference).toBe(copy.workbenchRailFloorUnread)
  })
})

describe('Probability on an aged plan whose crowned stop year has passed (`datearrived`’s shape)', () => {
  it('the ring keeps the plan’s own count (the "Stopping then" odds) and says the year is past, never "if you stop in" it', () => {
    // Built six years ago; the lifestyle crown at offset 5 is last year.
    const wall = DIP.startCalendarYear + 6
    const s = snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }))
    const v = reads(probabilityView(input(s, {
      wallCalendarYear: wall,
      notes: composeAnswerNotes(s, { readOnly: false, stalenessNote: false, leftOverClauseHost: false, wallCalendarYear: wall }),
    })))
    const ring = v.halves.compared.ring
    expect(ring.kind === 'face' && ring.face.caption).toBe(slots.snapshotRingStoppedIn(DIP.startCalendarYear + 5))
    expect(ringCentre(v.halves.compared)).toBe(slots.xOfTen(Math.round(DIP_CURVE[5]!.quantizedLowerBound * 10)))
  })
})

describe('Odds by stop year: the four honesty rules, and the lines under the chart', () => {
  const s = snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }))
  const odds = reads(probabilityView(input(s, { chart: 'odds' }))).odds!
  const hero = odds.series[0]!

  it('the on-track line is drawn at BAR_RUNG (8.5), so clearing reads by position', () => {
    expect(odds.barRung).toBe(BAR_RUNG)
    expect(BAR_RUNG).toBe(8.5)
    for (const c of hero.columns) expect(c.rung >= 9).toBe(c.clears)
  })

  it('the crown sits on the durable date, never the tallest column', () => {
    const crowned = hero.columns.filter((c) => c.isCrown)
    expect(crowned.map((c) => c.year)).toEqual([DIP.startCalendarYear + 5])
    const tallest = Math.max(...hero.columns.map((c) => c.rung))
    expect(crowned[0]!.rung).toBeLessThan(tallest)
    expect(crowned[0]!.lines[0]).toBe(copy.ladderCrownLabel)
    expect(crowned[0]!.inline).toBe(slots.oddsInline([copy.ladderCrownLabel, slots.xOfTen(crowned[0]!.rung)]))
  })

  it('a dipped year wears its “doesn’t hold” word', () => {
    const dipped = hero.columns.find((c) => c.year === DIP.startCalendarYear + 2)!
    expect(dipped.isDip).toBe(true)
    expect(dipped.lines).toEqual([slots.xOfTen(dipped.rung), copy.oddsDipWord])
    expect(dipped.inline).toBe(slots.oddsInline([slots.xOfTen(dipped.rung), copy.oddsDipWord]))
  })

  it('a column at the ceiling prints “better than 9 in 10”, never “10 of 10”', () => {
    const ceiling = hero.columns.filter((c) => c.rung >= 10)
    expect(ceiling.length).toBeGreaterThan(0)
    // The ceiling's words, over two lines, read whole as "better than 9 in 10".
    for (const c of ceiling) expect(c.lines.slice(-2).join(' ')).toBe(slots.xOfTenAtCeiling())
    for (const c of ceiling) expect(c.inline.endsWith(slots.xOfTenAtCeiling())).toBe(true)
    expect(JSON.stringify(odds.series)).not.toContain('10 of 10')
    expect(odds.labels.yTick(10)).not.toBe('10 of 10')
  })

  it('a no-date track draws no crown, and the curve’s explanation stands under it', () => {
    const none: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: curveOf([0.5, 0.6, 0.7, 0.8, 0.82, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]) }
    const o = reads(probabilityView(input(snap(DIP, dateAnswer(DIP, none, none, undefined)), { chart: 'odds' }))).odds!
    expect(o.series.flatMap((x) => x.columns).some((c) => c.isCrown)).toBe(false)
    expect(o.notes).toContain(slots.noDateHowClose(slots.xOfTen(8)))
  })

  it('a provisional curve wears the provisional tag', () => {
    const o = reads(probabilityView(input(snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }, 'provisional')), { chart: 'odds' }))).odds!
    expect(o.tag).toBe(copy.answerProvisionalTag)
  })

  it('on an aged plan no passed stop year is plotted', () => {
    const aged = input(s, { chart: 'odds', wallCalendarYear: DIP.startCalendarYear + 3 })
    const o = reads(probabilityView({ ...aged, notes: composeAnswerNotes(s, { readOnly: false, stalenessNote: false, leftOverClauseHost: false, wallCalendarYear: DIP.startCalendarYear + 3, agedBalancesYear: DIP.startCalendarYear }) })).odds!
    const years = o.series[0]!.columns.map((c) => c.year)
    expect(Math.min(...years)).toBe(DIP.startCalendarYear + 3)
    expect(o.notes).toContain(slots.ladderCaveatAgedBalances(DIP.startCalendarYear))
  })

  it('a split household draws the essentials track beside it, hatched and named, every bar printing its count', () => {
    const floorCurve = curveOf([0.86, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9])
    const floor = confirmed(floorCurve, 0)
    const o = reads(probabilityView(input(snap(DIP, dateAnswer(DIP, floor, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' })), { chart: 'odds' }))).odds!
    expect(o.series.map((x) => [x.id, x.hatched])).toEqual([
      ['hero', false],
      ['floor', true],
    ])
    for (const c of o.series[1]!.columns) expect(c.lines.length).toBeGreaterThan(0)
    expect(o.series[1]!.name).toBe(copy.oddsSeriesFloor)
    expect(o.series[1]!.columns.some((c) => c.isCrown)).toBe(false)
  })

  it('a split household’s essentials columns never say “your date” in their tooltip or screen-reader words (no crown is drawn there)', () => {
    // The essentials track is dated at offset 0 (`curveMarks` crowns it), but the chart draws the crown on the hero only.
    const floorCurve = curveOf([0.86, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9])
    const o = reads(probabilityView(input(snap(DIP, dateAnswer(DIP, confirmed(floorCurve, 0), LIFESTYLE, { offsetYears: 5, track: 'lifestyle' })), { chart: 'odds' }))).odds!
    const yourDate = '— your date'
    const floorCols = o.series[1]!.columns
    expect(floorCols.some((c) => c.describe.includes(yourDate))).toBe(false)
    // The undrawn crown reads as the year it is: clearing the line.
    expect(floorCols[0]!.describe).toBe(slots.oddsPoint(DIP.startCalendarYear, copy.oddsSeriesFloor, slots.xOfTen(floorCols[0]!.rung), 'clears', false))
    // The hero's drawn crown keeps its words.
    expect(o.series[0]!.columns.filter((c) => c.describe.includes(yourDate)).map((c) => c.year)).toEqual([DIP.startCalendarYear + 5])
  })

  it('the retired route offers no Odds by stop year', () => {
    const r = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN)), { chart: 'odds' })))
    expect(r.chart).toBe('rings')
    expect(r.odds).toBeUndefined()
  })
})

describe('Odds by stop year carries the answer’s notes (it has no key-metric column)', () => {
  it('dip (a working household, its state unpriced): exactly one state clause on the odds view, in its footnote row', () => {
    const s = snap(DIP, dateAnswer(DIP, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }))
    const inp = input(s, { chart: 'odds' })
    expect(inp.notes.stateNote, '[test] dip carries a state clause').not.toBeNull()
    const v = reads(probabilityView(inp))
    expect(v.chart).toBe('odds')
    expect(v.noteLines).toEqual([inp.notes.stateNote])
    // Everything the odds view prints under its chart and in its footnote row (the rings view's key-metric column is not drawn).
    const printed = [...v.odds!.notes, ...v.noteLines, ...v.footnotes]
    expect(printed.filter((l) => l === inp.notes.stateNote)).toHaveLength(1)
    // The rings view keeps it last in the key-metric column, once.
    expect(v.metrics.lines.filter((l) => l === inp.notes.stateNote)).toHaveLength(1)
  })

  it('date65 (Medicare priced): the affirmation rides with the residual it qualifies, just above it', () => {
    const d = DEV_SEEDS.date65
    const s = snap(d, dateAnswer(d, LIFESTYLE, LIFESTYLE, { offsetYears: 5, track: 'lifestyle' }))
    const inp = input(s, { chart: 'odds' })
    const priced = inp.notes.medicarePriced
    if (priced === null) throw new Error('[test] date65 is Medicare-priced')
    const v = reads(probabilityView(inp))
    const row = [...v.noteLines, ...v.footnotes]
    expect(row.indexOf(priced.affirmation)).toBeGreaterThanOrEqual(0)
    expect(row.indexOf(priced.affirmation) + 1).toBe(row.indexOf(priced.residual))
  })
})

describe('The rows’ second lines: said once when both halves carry the same ones', () => {
  const half = (side: 'alternative' | 'compared', notes: readonly string[][]): HalfView =>
    ({ side, title: side, ring: { kind: 'empty', caption: '' }, loading: false, rows: notes.map((n, i) => ({ text: `row ${i}`, notes: n })) }) as unknown as HalfView
  it('the same lines on both halves: one shared list, the halves keep their rows’ headlines only', () => {
    const s = shareRowNotes(half('alternative', [['a'], ['b']]), half('compared', [['a'], ['b']]))
    expect(s.sharedNotes).toEqual(['a', 'b'])
    expect(s.halves.alternative.rows.map((r) => [r.text, r.notes])).toEqual([['row 0', []], ['row 1', []]])
    expect(s.halves.compared.rows.map((r) => r.notes)).toEqual([[], []])
  })
  it('a lever that changes a line (the what-if’s own spending): each half keeps its own changed line, the rest stays shared', () => {
    const s = shareRowNotes(half('alternative', [['a, spending changed'], ['b']]), half('compared', [['a'], ['b']]))
    expect(s.sharedNotes).toEqual(['b'])
    expect(s.halves.alternative.rows.map((r) => r.notes)).toEqual([['a, spending changed'], []])
    expect(s.halves.compared.rows.map((r) => r.notes)).toEqual([['a'], []])
  })
  it('no line in common: nothing is shared', () => {
    expect(shareRowNotes(half('alternative', [['x']]), half('compared', [['y']])).sharedNotes).toBeUndefined()
  })
  it('a half with no rows (still figuring): nothing is shared', () => {
    expect(shareRowNotes(half('alternative', []), half('compared', [['a']])).sharedNotes).toBeUndefined()
  })
})

describe('The Recommended pick: the record’s own action, only while current', () => {
  const current: SavedRecommendationStatus = { current: true } as unknown as SavedRecommendationStatus
  const stale: SavedRecommendationStatus = { current: false } as unknown as SavedRecommendationStatus
  const v6 = {
    action: { policy: 'proportional', rothConversion: { kind: 'none' } },
  } as unknown as SavedRecommendationV3
  const v5 = { action: { policy: 'proportional' } } as unknown as SavedRecommendationV3

  it('a current, runnable record is offered and is the landing pick; it runs the record’s own bundle', () => {
    expect(recommendedOffer(RETIRED, { record: v6, status: current })).toEqual({ kind: 'runnable', bundle: recommendationBundle(v6) })
    expect(landingPick(RETIRED, { record: v6, status: current })).toBe('recommended')
    const s = snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN))
    const v = reads(probabilityView(input(s, { record: { record: v6, status: current }, whatIf: { pick: 'recommended', bundle: recommendationBundle(v6)!, view: null } })))
    expect(v.picker.items.map((i) => i.value)).toEqual(['new', 'recommended'])
    expect(v.picker.value).toBe('recommended')
    expect(v.halves.alternative.title).toBe(copy.probabilityPickRecommended)
  })

  it('a stale record, or one saved before version 6, shows words, names the page with its door, and runs nothing', () => {
    const s = snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN))
    const st = reads(probabilityView(input(s, { record: { record: v6, status: stale } })))
    expect(st.recordNote).toEqual({ words: copy.workbenchRailRecStale, door: 'tax-strategies' })
    expect(st.picker.items.map((i) => i.value)).toEqual(['new'])
    const old = reads(probabilityView(input(s, { record: { record: v5, status: current } })))
    expect(old.recordNote?.words).toBe(copy.workbenchRailRecOld)
    expect(landingPick(RETIRED, { record: v5, status: current })).toBe('new')
    // A pick of Recommended with no runnable record falls back to the new what-if (never a runtime null).
    const fallback = reads(probabilityView(input(s, { record: { record: v6, status: stale }, whatIf: { pick: 'recommended', bundle: [], view: null } })))
    expect(fallback.picker.value).toBe('new')
  })

  it('both sides asked for Recommended (Snapshot’s "Try it in the plan" over a right side showing it): the left shows it, the right reads your plan', () => {
    const s = snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN))
    const bundle = recommendationBundle(v6)!
    const v = reads(probabilityView(input(s, { record: { record: v6, status: current }, whatIf: { pick: 'recommended', bundle, view: null }, compared: { pick: 'recommended', bundle, view: null } })))
    expect(v.halves.alternative.title).toBe(copy.probabilityPickRecommended)
    expect(v.comparedPicker.value).toBe('plan')
    expect(v.halves.compared.title).toBe(copy.probabilityPlanTitle)
  })

  it('on the working route neither picker offers Recommended, whatever the disk holds', () => {
    expect(recommendedOffer(DIP, { record: v6, status: current })).toEqual({ kind: 'none' })
  })
})

describe('The answer states', () => {
  it('pending gives the computing frame and no number; compute-error the retry; the fallback names what it waits for', () => {
    const pending = probabilityView(input(snap(RETIRED, { kind: 'pending' } as unknown as ModelAnswer)))
    expect(pending.kind).toBe('pending')
    expect(JSON.stringify(pending)).not.toMatch(/of 10/)
    const err = probabilityView(input(snap(RETIRED, { kind: 'compute-error' } as unknown as ModelAnswer)))
    expect(err.kind).toBe('compute-error')
    const cleared: ScenarioDraft = { ...RETIRED, annualSpendingReal: undefined } as ScenarioDraft
    const fb = probabilityView(input(snap(cleared, { kind: 'inputs-incomplete' } as unknown as ModelAnswer)))
    expect(fb.kind).toBe('fallback')
    if (fb.kind === 'fallback') expect(fb.lines.length + fb.lead.length).toBeGreaterThan(0)
  })

  it('an already-failing headline prints 0 and an empty arc; the ceiling prints “better than 9 in 10”', () => {
    const failing = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, { ...RETIRED_RUN, headline: headline(0, 'already-failing') })))))
    const ring = failing.halves.compared.ring
    expect(ring.kind === 'face' && ring.face.arc).toBe(0)
    expect(ringCentre(failing.halves.compared)).toBe(slots.xOfTen(0))
    const ceil = reads(probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, { ...RETIRED_RUN, headline: headline(9, 'over-funded') })))))
    expect(ringCentre(ceil.halves.compared)).toBe(slots.xOfTenAtCeiling())
  })

  it('every state carries the R13 caveat lines', () => {
    for (const v of [
      probabilityView(input(snap(RETIRED, { kind: 'pending' } as unknown as ModelAnswer))),
      probabilityView(input(snap(RETIRED, headlineAnswer(RETIRED, RETIRED_RUN)))),
    ]) {
      expect(v.caveat.length).toBe(2)
    }
  })
})

describe('The state clause names the state the run priced', () => {
  for (const [seed, words] of [
    ['nc', 'North Carolina'],
    ['pa', 'Pennsylvania'],
    ['fl', 'Florida'],
  ] as const) {
    it(`${seed}: the key-metric column names ${words}`, () => {
      const d = DEV_SEEDS[seed]
      const v = reads(probabilityView(input(snap(d, headlineAnswer(d, realRun(d))))))
      expect([...v.metrics.lines, ...v.footnotes].join(' ')).toContain(words)
    })
  }

  it('elsewhere: the unpriced monolith', () => {
    const d = DEV_SEEDS.elsewhere
    const v = reads(probabilityView(input(snap(d, headlineAnswer(d, realRun(d))))))
    expect([...v.metrics.lines, ...v.footnotes].join(' ')).toContain(copy.verdictStateUnpricedNote)
  })
})

describe('RC5: the two-up over kept what-ifs', () => {
  const KEPT = [
    { id: 'a', name: 'Spend less', levers: SPEND_LEVER },
    { id: 'b', name: 'Move', levers: [{ kind: 'withdrawal-order', policy: 'pre-tax-first' }] },
  ] as unknown as NonNullable<ScenarioDraft['keptWhatIfs']>
  const draft: ScenarioDraft = { ...RETIRED, keptWhatIfs: KEPT }
  const s = snap(draft, headlineAnswer(draft, RETIRED_RUN))

  it('both pickers offer the kept what-ifs; neither offers the one the other side shows', () => {
    const v = reads(probabilityView(input(s, { whatIf: { pick: 'kept:a', bundle: SPEND_LEVER, view: null }, compared: { pick: 'kept:b', bundle: KEPT[1]!.levers, view: null } })))
    expect(v.picker.items.map((i) => i.label)).toEqual([copy.probabilityPickNew, 'Spend less'])
    expect(v.comparedPicker.items.map((i) => i.label)).toEqual([copy.probabilityPlanTitle, 'Move'])
    expect(v.halves.alternative.title).toBe('Spend less')
    expect(v.halves.compared.title).toBe('Move')
  })

  it('two kept what-ifs, neither your plan: each half its own reading, both named in the difference line', () => {
    const left = readyView({ kind: 'headline', headline: headline(6) }, { kind: 'headline', headline: headline(7) })
    const right = readyView({ kind: 'headline', headline: headline(8) }, { kind: 'headline', headline: headline(7) })
    const v = reads(probabilityView(input(s, { whatIf: { pick: 'kept:a', bundle: SPEND_LEVER, view: left }, compared: { pick: 'kept:b', bundle: KEPT[1]!.levers, view: right } })))
    expect(ringCentre(v.halves.alternative)).toBe(slots.xOfTen(6))
    expect(ringCentre(v.halves.compared)).toBe(slots.xOfTen(8))
    const text = (n: number) => JSON.stringify(v.metrics.difference).includes(slots.xOfTen(n))
    expect(v.metrics.difference?.startsWith('Move reads')).toBe(true)
    expect(v.metrics.difference).toContain('Spend less reads')
    expect(text(6) && text(8)).toBe(true)
    expect(v.metrics.differenceReserve.length, 'the reserve holds the widest form for these two names').toBeGreaterThanOrEqual(v.metrics.difference!.length)
  })

  it('a reopened kept what-if, edited, is named "changed, not kept" on its half and in its picker', () => {
    const v = reads(probabilityView(input(s, { whatIf: { pick: 'kept:a', bundle: [], view: null, changed: true } })))
    expect(v.halves.alternative.title).toBe(slots.probabilityKeptChanged('Spend less'))
    expect(v.picker.items.find((i) => i.value === 'kept:a')?.label).toBe(slots.probabilityKeptChanged('Spend less'))
  })

  it('a pick that can no longer be made (its kept what-if deleted) reads the default: your plan, the new what-if', () => {
    const v = reads(probabilityView(input(s, { whatIf: { pick: 'kept:gone', bundle: [], view: null }, compared: { pick: 'kept:gone', bundle: [], view: null } })))
    expect(v.picker.value).toBe('new')
    expect(v.comparedPicker.value).toBe('plan')
    expect(v.halves.compared.title).toBe(copy.probabilityPlanTitle)
  })

  it('a refused kept what-if on the right says why in words and prints no count', () => {
    const v = reads(probabilityView(input(s, { compared: { pick: 'kept:b', bundle: KEPT[1]!.levers, view: { kind: 'refused', refusal: { kind: 'account-gone', accountId: 'x' } } } })))
    expect(v.halves.compared.status).toBe(copy.workbenchRailRefusedAccountGone)
    expect(v.halves.compared.ring.kind).toBe('empty')
  })

  it('a read-only view composes alike: the panel carries no write action (the list’s writes are the drawer’s)', () => {
    const a = probabilityView(input(s, { readOnly: true, compared: { pick: 'kept:b', bundle: KEPT[1]!.levers, view: null } }))
    const b = probabilityView(input(s, { readOnly: false, compared: { pick: 'kept:b', bundle: KEPT[1]!.levers, view: null } }))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('The subsidy-rules health line (the register’s Tier 0 line RC10 lost)', () => {
  const HEALTH = DEV_SEEDS.health
  const PLAN_RUN = realRun(HEALTH)
  const answer = headlineAnswer(HEALTH, PLAN_RUN)
  const s = snap(HEALTH, answer)
  const flip = (enhanced: boolean) => [{ kind: 'aca-subsidy', enhanced }] as unknown as ProbabilityInput['whatIf']['bundle']
  const FLIP = flip(HEALTH.enhancedSubsidies !== true)
  // `health`'s committed futures include some that run out: every line here carries Health Care's run-out clause.
  const ro = (line: string): string => `${line} ${copy.healthLifetimeStopsAtRunOut}`

  /** Lanes over the real engine (the worker's own entry), settled as each request arrives. */
  const engineLanes = (): WhatIfSlotLanes => {
    const group = createLaneGroup({ runsInWorker: () => true })
    const lane = () =>
      group.lane(async (r: EngineRunRequest) => {
        const decoded = fromWire(runEngine(r.params, r.seed, r.options))
        return decoded.ok ? { ok: true as const, value: decoded.result } : { ok: false as const, reason: decoded.reason }
      })
    return { many: lane(), steady: lane(), rough: lane(), plan: lane() }
  }
  const settled = async (bundle: ProbabilityInput['whatIf']['bundle']): Promise<WhatIfSlotView> => {
    const slot = createWhatIfSlot(engineLanes())
    slot.ask(answer, HEALTH.seed, bundle)
    for (let i = 0; i < 20; i++) await new Promise<void>((r) => setTimeout(r, 0))
    return whatIfSlotView(slot.getSnapshot())
  }
  /** Each future's own lifetime health total, then the middle of them: computed here, apart from the code under test. */
  const ownMedian = (r: SimulationResult): number => {
    const ta = r.distribution.taxAware!
    const totals = ta.lifetimeNetPremiumReal.map((p, i) => p + ta.lifetimeMedicareCostReal[i]!).sort((a, b) => a - b)
    const m = totals.length / 2
    return totals.length % 2 === 0 ? (totals[m - 1]! + totals[m]!) / 2 : totals[Math.floor(m)]!
  }

  it('red-first on `health`: each rule’s own lifetime health cost beside the odds, the plan’s off its committed futures', async () => {
    const view = await settled(FLIP)
    const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: FLIP, view } })))
    const flipped = fromWire(runEngine(buildSpineParams(applyBundleOk(HEALTH, FLIP))!, HEALTH.seed!, { survivorConditioned: true }))
    if (!flipped.ok) throw new Error(flipped.reason)
    // The raw figures, exactly: each side's own median of per-future totals (never the parts' medians added).
    if (view.kind !== 'shown' || view.many.kind !== 'ready' || view.planHealth.kind !== 'ready') throw new Error('[test] not landed')
    expect(view.many.value.whatIfHealthReal).toBe(ownMedian(flipped.result))
    expect(view.planHealth.value).toBe(ownMedian(PLAN_RUN))
    const a = formatDeltaDollar(ownMedian(flipped.result))
    const b = formatDeltaDollar(ownMedian(PLAN_RUN))
    expect(a, '[non-vacuity] the two rules print different lifetime costs on `health`').not.toBe(b)
    expect(PLAN_RUN.distribution.depletionYears.some(isDepleted), '[non-vacuity] some of the plan’s futures run out').toBe(true)
    expect(w.metrics.health?.line).toBe(ro(slots.subsidyRegimeCostDelta(a, b)))
    expect(w.metrics.health!.reserve.length, 'the reserve holds the widest form').toBeGreaterThanOrEqual(w.metrics.health!.line!.length)
  })

  it('the two sides share futures: a what-if that keeps the plan’s own rules reads the plan’s figure exactly (the even arm)', async () => {
    const same = flip(HEALTH.enhancedSubsidies === true)
    const view = await settled(same)
    if (view.kind !== 'shown' || view.many.kind !== 'ready' || view.planHealth.kind !== 'ready') throw new Error('[test] not landed')
    expect(view.many.value.whatIfHealthReal).toBe(view.planHealth.value)
    const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: same, view } })))
    expect(w.metrics.health?.line).toBe(ro(slots.subsidyRegimeCostEven(formatDeltaDollar(ownMedian(PLAN_RUN)))))
  })

  const landed = (whatIf: number | undefined, plan: Extract<WhatIfSlotView, { kind: 'shown' }>['planHealth'], updating = false): WhatIfSlotView => ({
    kind: 'shown',
    many: {
      kind: 'ready',
      value: { plan: { kind: 'headline', headline: headline(7) }, whatIf: { kind: 'headline', headline: headline(8) }, ...(whatIf !== undefined ? { whatIfHealthReal: whatIf } : {}) },
      answerKey: 'a',
      updating,
    },
    steady: { kind: 'loading' },
    rough: { kind: 'loading' },
    planHealth: plan,
  })
  const ready = (value: number) => ({ kind: 'ready' as const, value, answerKey: 'a', updating: false })

  it('prints nothing until both sides land on the current key, but holds its cell from the first frame', () => {
    for (const view of [null, landed(300_000, { kind: 'loading' }), landed(undefined, ready(330_000)), landed(300_000, ready(330_000), true), landed(300_000, { kind: 'error' })]) {
      const w = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: FLIP, view } })))
      expect(w.metrics.health?.line).toBeNull()
      expect(w.metrics.health?.reserve).toBe(ro(slots.subsidyRegimeCostDelta('9,999,000', '9,999,000')))
    }
  })

  it('where neither side’s futures run out, no run-out clause; a what-if run that runs out adds it (each lifetime sum stops at its run-out)', () => {
    const lasting = { ...PLAN_RUN, distribution: { ...PLAN_RUN.distribution, depletionYears: PLAN_RUN.distribution.depletionYears.map(() => -1) } } as SimulationResult
    const ls = snap(HEALTH, headlineAnswer(HEALTH, lasting))
    const plain = reads(probabilityView(input(ls, { whatIf: { pick: 'new', bundle: FLIP, view: landed(300_000, ready(330_000)) } })))
    expect(plain.metrics.health?.line).toBe(slots.subsidyRegimeCostDelta('300,000', '330,000'))
    // The reserve holds the clause whatever lands (the what-if side's run-out is known only once it lands).
    expect(plain.metrics.health?.reserve).toBe(ro(slots.subsidyRegimeCostDelta('9,999,000', '9,999,000')))
    const view = landed(300_000, ready(330_000))
    if (view.kind !== 'shown' || view.many.kind !== 'ready') throw new Error('[test] not landed')
    const ranOut: WhatIfSlotView = { ...view, many: { ...view.many, value: { ...view.many.value, whatIfHealthRanOut: true } } }
    const flagged = reads(probabilityView(input(ls, { whatIf: { pick: 'new', bundle: FLIP, view: ranOut } })))
    expect(flagged.metrics.health?.line).toBe(ro(slots.subsidyRegimeCostDelta('300,000', '330,000')))
  })

  it('only where the left side tries the subsidy rules beside your plan', () => {
    const view = landed(300_000, ready(330_000))
    const spend = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view } })))
    expect(spend.metrics.health, 'a what-if that leaves the rules alone carries no health cell').toBeUndefined()
    const kept = [{ id: 'k', name: 'Old rules', levers: SPEND_LEVER }] as unknown as NonNullable<ScenarioDraft['keptWhatIfs']>
    const keptDraft: ScenarioDraft = { ...HEALTH, keptWhatIfs: kept }
    const beside = reads(probabilityView(input(snap(keptDraft, headlineAnswer(keptDraft, PLAN_RUN)), { whatIf: { pick: 'new', bundle: FLIP, view }, compared: { pick: 'kept:k', bundle: SPEND_LEVER, view: null } })))
    expect(beside.metrics.health, 'its words name your plan, so beside a kept what-if it is not printed').toBeUndefined()
    const both = reads(probabilityView(input(s, { whatIf: { pick: 'new', bundle: [...SPEND_LEVER, ...FLIP], view } })))
    expect(both.metrics.health?.line).toBe(ro(slots.subsidyRegimeCostDelta('300,000', '330,000')))
  })

  it('the other orientation: a kept what-if that tries the rules on the right, your plan on the left, from the right slot’s view, named', () => {
    const kept = [{ id: 'k', name: 'Old rules', levers: FLIP }] as unknown as NonNullable<ScenarioDraft['keptWhatIfs']>
    const keptDraft: ScenarioDraft = { ...HEALTH, keptWhatIfs: kept }
    const ks = snap(keptDraft, headlineAnswer(keptDraft, PLAN_RUN))
    const w = reads(probabilityView(input(ks, { whatIf: { pick: 'new', bundle: [], view: null }, compared: { pick: 'kept:k', bundle: FLIP, view: landed(300_000, ready(330_000)) } })))
    expect(w.metrics.health?.line).toBe(ro(slots.subsidyRegimeCostDeltaWith('Old rules', '300,000', '330,000')))
    // Premiums, never costs (RC10's As-built): the figure holds no out-of-pocket spending.
    for (const l of [w.metrics.health!.line!, slots.subsidyRegimeCostDelta('1', '2'), slots.subsidyRegimeCostEven('1')]) expect(l).toMatch(/^Lifetime health premiums /)
    expect(w.metrics.health!.reserve.length).toBeGreaterThanOrEqual(w.metrics.health!.line!.length)
    // A left side with changes of its own is not your plan: no line.
    const busy = reads(probabilityView(input(ks, { whatIf: { pick: 'new', bundle: SPEND_LEVER, view: null }, compared: { pick: 'kept:k', bundle: FLIP, view: landed(300_000, ready(330_000)) } })))
    expect(busy.metrics.health).toBeUndefined()
  })
})
