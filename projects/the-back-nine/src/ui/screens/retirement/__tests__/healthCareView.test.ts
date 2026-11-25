/**
 * Retirement → Health Care's composers (plan RC10's Test scenarios): no part is ever a stack total; every part's legend
 * says "middle cost each year"; a year below the cohort bar draws nothing; the marketplace cliff share prints over a
 * year only where most futures buy marketplace cover, in the sheet's count words, naming its base; IRMAA's words are the
 * sheet composer's; the working route names the steady market and carries its stopgap; the lifetime figure is the
 * median of each future's own sum; the tray's facts open their drawers and the subsidy row is a what-if.
 */
import { describe, expect, it } from 'vitest'
import type { HealthReadout, HealthReadoutYear, LedgerYearRow, TaxAwareDistribution } from '@shared/model'
import { acaEnhancedSubsidyStatus } from '@engine/constants/health'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { intakeSteps } from '@intake/questions'
import { pricedStateForRun } from '@intake/intakeMap'
import { DEV_SEEDS } from '@ui/devSeeds'
import { copy, slots } from '../../../copy'
import { composeHealthSheet } from '../../../healthSheetChrome'
import { planClockAnchor } from '../../../bandAnnotations'
import { composeFacts } from '../../../workbench/factsChrome'
import type { TableMeta } from '../../../workbench/tableRun'
import { cliffRuns, healthCareView, healthTrayView, HEALTH_PARTS, lifetimeMedians, type HealthChartsView } from '../healthCareView'

const FRESH = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 1
const draft = DEV_SEEDS.health // Alex 61, Sam 59, retired, a marketplace quote pair

const year = (k: number, over: Partial<HealthReadoutYear> = {}): HealthReadoutYear => ({
  yearsFromNow: k,
  acaNetPremiumP50: 0,
  medicareBaseP50: 0,
  irmaaSurchargeP50: 0,
  medicareExtrasP50: 0,
  medicareEnrolledP50: 0,
  acaMagiP50: 60_000,
  irmaaMagiP50: 60_000,
  ssBenefitP50: 0,
  overCliffFraction: 0,
  acaPricedFraction: 0,
  cohortFraction: 1,
  ...over,
})

/** Four marketplace years, then Medicare; the cohort thins below the bar from year 9. */
const readout: HealthReadout = {
  byYear: [
    year(1, { acaNetPremiumP50: 8_900, acaPricedFraction: 1, overCliffFraction: 0.04 }),
    year(2, { acaNetPremiumP50: 9_000, acaPricedFraction: 1, overCliffFraction: 0.16 }),
    year(3, { acaNetPremiumP50: 9_050, acaPricedFraction: 1, overCliffFraction: 0.21 }),
    year(4, { acaNetPremiumP50: 9_100, acaPricedFraction: 0.1, overCliffFraction: 0.5 }),
    year(5, { acaNetPremiumP50: 4_600, medicareBaseP50: 2_700, medicareExtrasP50: 2_900, medicareEnrolledP50: 1, acaPricedFraction: 1, overCliffFraction: 0.97 }),
    year(6, { medicareBaseP50: 5_800, irmaaSurchargeP50: 0, medicareExtrasP50: 5_900, medicareEnrolledP50: 2, irmaaMagiP50: 90_000 }),
    year(7, { medicareBaseP50: 6_000, medicareExtrasP50: 5_900, medicareEnrolledP50: 2 }),
    year(8, { medicareBaseP50: 6_100, medicareExtrasP50: 5_900, medicareEnrolledP50: 2, cohortFraction: 0.5 }),
    year(9, { medicareBaseP50: 6_300, medicareExtrasP50: 5_900, medicareEnrolledP50: 2, cohortFraction: 0.49 }),
    year(10, { medicareBaseP50: 6_400, medicareExtrasP50: 5_900, medicareEnrolledP50: 2, cohortFraction: 0.3 }),
  ],
}

/** Per-future lifetime premiums whose part-medians do NOT add up to the median of the sums. */
const taxAware = {
  lifetimeNetPremiumReal: [10_000, 50_000, 90_000],
  lifetimeMedicareCostReal: [300_000, 200_000, 100_000],
} as unknown as TaxAwareDistribution

const retired = (over: { readout?: HealthReadout; taxAware?: TaxAwareDistribution } = {}) =>
  healthCareView({
    answer: { kind: 'headline', draft, readout: 'readout' in over ? over.readout : readout, taxAware: over.taxAware ?? taxAware },
    steady: { kind: 'loading' },
    todayEpochDay: FRESH,
    sincePlanBuilt: 0,
  })

const charts = (v: ReturnType<typeof healthCareView>): HealthChartsView => {
  if (v.kind !== 'charts') throw new Error(`expected charts, got words: ${v.words}`)
  return v
}

describe('the four parts: never stacked, one scale, one age range', () => {
  it('draws exactly the four parts, each bar its own part’s middle cost (no series is a total of others)', () => {
    const v = charts(retired())
    expect(v.parts.map((p) => p.id)).toEqual(HEALTH_PARTS)
    const at = (part: string, i: number) => v.parts.find((p) => p.id === part)!.bars[i]!.value
    // Year 5: every part has a figure; each bar is that part's own median, never the sum of the four.
    expect([at('aca', 4), at('medicare', 4), at('irmaa', 4), at('extras', 4)]).toEqual([4_600, 2_700, 0, 2_900])
    const sum = 4_600 + 2_700 + 2_900
    for (const p of v.parts) for (const b of p.bars) expect(b.value).not.toBe(sum)
  })

  it('every part’s legend says "middle cost each year"', () => {
    for (const p of charts(retired()).parts) expect(p.legend).toBe(copy.healthLegendMiddle)
    expect(copy.healthLegendMiddle).toBe('Middle cost each year')
  })

  it('a year below the cohort bar draws nothing: the bars stop at the last quotable year, on every part', () => {
    const v = charts(retired())
    for (const p of v.parts) expect(p.bars.length).toBe(8) // years 1..8 (cohort 0.5 is the bar itself)
    expect(v.ages).toEqual({ first: 61, last: 68 })
  })

  it('row k sits at calendar start + k − 1 and age + k − 1 (insight 134: a premium is a flow paid during sim-year k − 1)', () => {
    const b = charts(retired()).parts[0]!.bars[0]!
    expect([b.age, b.year]).toEqual([61, draft.startCalendarYear])
    expect(b.point).toBe(slots.healthYearPoint('Alex’s age', 61, draft.startCalendarYear, copy.healthPartAca, '8,900'))
  })

  it('the four share one lattice, topped over the largest bar of any part', () => {
    const v = charts(retired())
    const top = Math.max(...v.parts.flatMap((p) => p.bars.map((b) => b.value)))
    expect(v.lattice.ceiling).toBeGreaterThanOrEqual(top)
  })
})

describe('the marketplace cliff share', () => {
  it('prints over a year only where at least half the futures buy marketplace cover, in the sheet’s count words', () => {
    const runs = charts(retired()).parts.find((p) => p.id === 'aca')!.cliff
    // Year 1 rounds to 0 (nothing); years 2 and 3 are 2 of 10 (one stretch); year 4 is priced in 1 of 10 futures (no
    // share, however high its over-cliff fraction); year 5 rounds to 10, the adverse ceiling.
    expect(runs.map((r) => [r.fromAge, r.toAge, r.label])).toEqual([
      [62, 63, slots.xOfTen(2)],
      [65, 65, 'more than 9 in 10'],
    ])
  })

  it('a year where 10% of futures price the marketplace prints no share', () => {
    const only = { byYear: [year(1, { acaNetPremiumP50: 9_000, acaPricedFraction: 0.1, overCliffFraction: 0.9 })] }
    expect(cliffRuns(only, 61, 'Alex’s age')).toEqual([])
  })

  it('never prints "10 of 10" and never good-news words (insight 089)', () => {
    for (const r of charts(retired()).parts[0]!.cliff) {
      expect(r.label).not.toMatch(/10 of 10|better than/)
      expect(r.point).not.toMatch(/10 of 10|better than/)
    }
  })

  it('names its base: the futures that buy marketplace cover that year', () => {
    const v = charts(retired())
    for (const r of v.parts[0]!.cliff) expect(r.point).toContain('of the futures that buy marketplace cover that year')
    expect(copy.healthCliffKey).toContain('of the futures that buy marketplace cover that year')
    expect(v.notes.find((g) => g.id === 'aca')!.lines).toContain(copy.healthCliffKey)
  })

  it('only the marketplace part carries a cliff, and the working route none', () => {
    const v = charts(retired())
    for (const p of v.parts.filter((x) => x.id !== 'aca')) expect(p.cliff).toEqual([])
    for (const p of charts(working()).parts) expect(p.cliff).toEqual([])
  })

  it('the count’s key rides the marketplace chart exactly when a bracket draws, naming its base', () => {
    const v = charts(retired())
    const aca = v.parts.find((p) => p.id === 'aca')!
    expect(aca.cliff.length, '[test setup] the retired draft draws a bracket').toBeGreaterThan(0)
    expect(aca.cliffKey).toBe(copy.healthCliffCaption)
    expect(copy.healthCliffCaption).toContain('futures that buy marketplace cover')
    for (const p of v.parts.filter((x) => x.id !== 'aca')) expect(p.cliffKey).toBeUndefined()
    for (const p of charts(working()).parts) expect(p.cliffKey).toBeUndefined()
  })
})

describe('the words come from the sheet’s composers', () => {
  it('IRMAA’s words are the health sheet composer’s own step card, with the stopgap until a per-year share exists', () => {
    const v = charts(retired())
    const sheet = composeHealthSheet(readout, draft, FRESH, pricedStateForRun(draft), 0)
    const irmaa = v.notes.find((g) => g.id === 'irmaa')!
    expect(irmaa.facts).toEqual(sheet.facts.filter((f) => f.id === 'step'))
    expect(irmaa.lines).toEqual([copy.healthIrmaaStopgap])
  })

  it('every sheet fact lands under its part, and the extras block sits directly under the Medicare card', () => {
    const v = charts(retired())
    const sheet = composeHealthSheet(readout, draft, FRESH, pricedStateForRun(draft), 0)
    expect(v.notes.flatMap((g) => g.facts).map((f) => f.id).sort()).toEqual(sheet.facts.map((f) => f.id).sort())
    const medicare = v.notes.find((g) => g.id === 'medicare')!
    expect(medicare.facts.map((f) => f.id)).toEqual(['medicare'])
    expect(medicare.lines[0]).toBe(copy.medicareExtrasSheetLead)
    // The dated rules line rides the marketplace part (the household has a marketplace quote).
    expect(v.notes.find((g) => g.id === 'aca')!.lines).toContain(sheet.statusLine)
  })

  it('the Medicare affirmation and its residual ship together, the residual carrying the held-flat sentence and the one state clause', () => {
    const f = charts(retired()).footnotes
    const at = f.indexOf(copy.verdictMedicarePriced)
    expect(at).toBeGreaterThanOrEqual(0)
    expect(f[at + 1]).toContain(copy.medicareExtrasSheetHeldFlat)
    expect(f[at + 1]).toContain('State income tax isn’t priced yet')
    // The omissions list drops its state item: the residual already names it (one state clause per page).
    expect(f).toContain(copy.controlHealthOmissionsNoteStatePriced)
    expect(f).not.toContain(copy.controlHealthOmissionsNote)
    expect(f).toContain(copy.controlHealthSurvivorNote)
  })

  it('the HSA line rides only where the plan holds an HSA (the old sheet’s own rule)', () => {
    expect(charts(retired()).footnotes).not.toContain(copy.controlHealthHsaNote)
    const withHsa = { ...draft, enteredAccounts: [...draft.enteredAccounts, { id: 'acct-0-hsa', ownerIndex: 0 as const, kind: 'hsa' as const, valueToday: 20_000 }] }
    const v = healthCareView({ answer: { kind: 'headline', draft: withHsa, readout, taxAware }, steady: { kind: 'loading' }, todayEpochDay: FRESH, sincePlanBuilt: 0 })
    expect(charts(v).footnotes).toContain(copy.controlHealthHsaNote)
  })

  it('a run with no readout charts nothing and says why', () => {
    expect(retired({ readout: undefined })).toEqual({ kind: 'words', words: copy.healthNone })
  })
})

describe('the lifetime figure', () => {
  it('is the median of each future’s own sum, never a sum of medians; each part its own median', () => {
    // Sums per future: 310k, 250k, 190k → median 250k (the part medians happen to add up here; the sets below differ).
    expect(lifetimeMedians(taxAware)).toEqual({ total: 250_000, aca: 50_000, medicare: 200_000 })
    const uneven = { lifetimeNetPremiumReal: [0, 0, 90_000], lifetimeMedicareCostReal: [100_000, 300_000, 0] } as unknown as TaxAwareDistribution
    // Sums 100k, 300k, 90k → median 100k. And a set where the two disagree:
    const differ = { lifetimeNetPremiumReal: [0, 50_000, 60_000], lifetimeMedicareCostReal: [300_000, 0, 10_000] } as unknown as TaxAwareDistribution
    // Sums 300k, 50k, 70k → median 70k; the part medians 50k + 10k = 60k would be the sum-of-medians lie.
    expect(lifetimeMedians(uneven)!.total).toBe(100_000)
    expect(lifetimeMedians(differ)!.total).toBe(70_000)
    const v = charts(retired({ taxAware: differ }))
    expect(v.hero).toBe(slots.healthFigure('70,000'))
    expect(v.metricLines).toEqual([slots.healthLifetimeAca('50,000'), slots.healthLifetimeMedicare('10,000'), copy.healthLifetimeEachOwn])
  })
})

// ── The working route ───────────────────────────────────────────────────────────────────────────────────────────

const row = (t: number, premiums: LedgerYearRow['premiums'], over: Partial<LedgerYearRow> = {}): LedgerYearRow =>
  ({ t, premiums, ranOut: false, ...over }) as unknown as LedgerYearRow

const meta = {
  route: 'dated',
  startCalendarYear: 2026,
  stopYear: 2030,
  people: [
    { label: 'Alex', mid: 'Alex', possessive: 'Alex’s', pronoun: 'Alex’s', you: false, currentAge: 66, lastAge: 69 },
    { label: 'Sam', mid: 'Sam', possessive: 'Sam’s', pronoun: 'Sam’s', you: false, currentAge: 65, lastAge: 68 },
  ],
} as unknown as TableMeta

function working() {
  const rows = [
    row(0, { acaNet: 0, medicare: 3_000, irmaaSurcharge: 400, medicareExtras: 2_900 }),
    row(1, { acaNet: 0, medicare: 3_100, irmaaSurcharge: 0, medicareExtras: 2_900 }),
    row(2, { acaNet: 0, medicare: 6_200, irmaaSurcharge: 0, medicareExtras: 5_800 }),
    row(3, { acaNet: 0, medicare: 6_300, irmaaSurcharge: 0, medicareExtras: 5_800 }),
    row(4, { acaNet: 0, medicare: 6_400, irmaaSurcharge: 0, medicareExtras: 5_800 }),
  ]
  return healthCareView({
    answer: { kind: 'date', draft: DEV_SEEDS.date65 },
    steady: { kind: 'ready', rows, meta, updating: false, answerKey: 'k' } as never,
    todayEpochDay: FRESH,
    sincePlanBuilt: 0,
  })
}

describe('the working route: the steady market’s own rows', () => {
  it('names the steady market in the title and legend, and carries the stopgap line', () => {
    const v = charts(working())
    expect(v.route).toBe('working')
    expect(v.title).toBe(slots.healthInSteady(copy.healthChartTitle))
    for (const p of v.parts) expect(p.legend).toBe(copy.healthLegendSteady)
    expect(v.footnotes[0]).toBe(copy.healthWorkingStopgap)
    expect(v.description).toBe(copy.healthDescriptionSteady)
  })

  it('splits the ledger’s Medicare bill into its base and its surcharge, and stops at the steady future’s second death', () => {
    const v = charts(working())
    const part = (id: string) => v.parts.find((p) => p.id === id)!.bars.map((b) => b.value)
    expect(part('medicare')).toEqual([2_600, 3_100, 6_200, 6_300])
    expect(part('irmaa')).toEqual([400, 0, 0, 0])
    expect(v.ages).toEqual({ first: 66, last: 69 })
  })

  it('one path: the parts add up to its total exactly', () => {
    const v = charts(working())
    const total = [3_000 + 2_900, 3_100 + 2_900, 6_200 + 5_800, 6_300 + 5_800].reduce((a, b) => a + b, 0)
    expect(v.hero).toBe(slots.healthFigure(Intl.NumberFormat('en-US').format(Math.round(total / 1_000) * 1_000)))
  })

  it('waits for the steady rows, and says so when they fail', () => {
    const at = (steady: never) => healthCareView({ answer: { kind: 'date', draft: DEV_SEEDS.date65 }, steady, todayEpochDay: FRESH, sincePlanBuilt: 0 })
    expect(at({ kind: 'loading' } as never)).toEqual({ kind: 'words', words: copy.healthRowsWaiting })
    expect(at({ kind: 'error' } as never)).toEqual({ kind: 'words', words: copy.healthRowsError })
  })
})

// ── The tray ────────────────────────────────────────────────────────────────────────────────────────────────────

describe('the Action Items tray: B9’s health inputs', () => {
  const sections = composeFacts({ draft, stepIds: intakeSteps(draft).map((s) => s.id), anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear) })

  it('the subsidy rules are a what-if (the aca-subsidy lever), shown with the plan’s rules', () => {
    const t = healthTrayView(sections, { planEnhanced: false }, false)
    expect(t.aca).toEqual({ label: copy.workbenchRailAcaTitle, value: copy.leverHealthRegimeReverted, help: copy.leverHealthRegimeRevertedHelp, lever: 'aca-subsidy' })
    expect(healthTrayView(sections, undefined, false).aca).toBeUndefined()
  })

  it('each plan fact shows its values and opens its own drawer, saying a change there changes the plan', () => {
    const t = healthTrayView(sections, { planEnhanced: false }, false)
    const oop = t.facts.find((f) => f.id === 'oop-medical')!
    expect(oop.door).toBe('oop-medical')
    expect(oop.rows).toEqual([{ label: copy.oopLabel, value: slots.workbenchFactPerYear('4,000') }])
    expect(t.facts.find((f) => f.id === 'medicare-extras')!.door).toBe('extras-panel')
    expect(t.factsNote).toBe(copy.healthTrayFactsNote)
  })

  it('a read-only tab opens no drawer', () => {
    const t = healthTrayView(sections, { planEnhanced: true }, true)
    for (const f of t.facts) expect(f.door).toBeNull()
    expect(t.factsNote).toBe(copy.healthTrayReadOnly)
  })
})
