import { describe, expect, it } from 'vitest'
import {
  confirmedWorkingYearCost,
  enteredWorkingYearCost,
  isWorkingYearCostStale,
  workingCostBelowMedical,
  workingYearCostStaleness,
  workingYearCostStaleText,
  workingYearQuote,
  workingYearStateTaxReading,
  writeClearedWorkingYearCost,
  writeConfirmedWorkingYearCost,
  writeEnteredWorkingYearCost,
  writeKeptWorkingYearCost,
  writeWorkingYearCostPeriod,
} from '../workingYearQuote'
import { isDateRoute, missingRequiredFacts, pricedStateForRun } from '../intakeMap'
import { threeThenMore } from '../AnswerStrip'
import { STATE_TAX_PROFILES } from '@engine/constants/stateTax'
import type { StateBaseSystem } from '@engine/constants'
import {
  STATE_ROSTER,
  type BudgetLineItem,
  type WorkingYearCostV3,
  type WorkingYearStateTaxReading,
} from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '@ui/devSeeds'
import { slots } from '@ui/copy'

/**
 * The pay check's W on the intake side (`docs/plans/features/working-year-pay-check-build-spec.md`
 * KTD5, KTD18, KTD21; U7's test scenarios): the quote the W question offers, the state-tax reading
 * the answer is given under, and the one stale predicate. Every expected figure below is typed by
 * hand from the draft's own lines and the KTD5 tier rule (DND 012), never read back from the module.
 */

const base = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => ({
  people: [{}, {}],
  enteredAccounts: [],
  incomeStreams: [],
  tickerClassifications: {},
  health: {},
  annualSpendingReal: 84_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'test',
  ...over,
})

const line = (
  category: BudgetLineItem['category'],
  label: string,
  annualAmountReal: number,
  tier: BudgetLineItem['tier'],
  startYear = 0,
  endYear?: number,
): BudgetLineItem => ({
  category,
  label,
  annualAmountReal,
  tier,
  startYear,
  ...(endYear !== undefined ? { endYear } : {}),
})

/** Two essentials the household lives on in a working year, the anchor every budget arm extends. */
const HOME = line('housing', 'Home', 20_000, 'essentials')
const GROCERIES = line('food', 'Groceries', 9_600, 'essentials')

describe('the quote (KTD5)', () => {
  it('no budget: the spending figure, in the household’s own spend period', () => {
    expect(workingYearQuote(base())).toEqual({
      annualReal: 84_000,
      source: 'spending',
      period: 'month',
      medicalReal: 0,
      leftOut: [],
    })
    expect(workingYearQuote(base({ annualSpendingReal: 60_000, spendEntryPeriod: 'year' }))).toEqual({
      annualReal: 60_000,
      source: 'spending',
      period: 'year',
      medicalReal: 0,
      leftOut: [],
    })
  })

  it('a budget: every first-year line plus the out-of-pocket medical M, yearly', () => {
    // 20,000 + 9,600 + 4,000 of M = 33,600 — quoted yearly even though the household spends monthly
    // (a budget's anchor line is yearly).
    const d = base({ budget: [HOME, GROCERIES], health: { oopMedicalAnnual: 4_000 } })
    expect(workingYearQuote(d)).toEqual({
      annualReal: 33_600,
      source: 'budget',
      period: 'year',
      medicalReal: 4_000,
      leftOut: [],
    })
  })

  it('`dip` quotes $36,000 — Home and Living — and leaves out exactly "Go-go years"', () => {
    // dip: Home 20,000 + Living 16,000 (both essentials, lifelong); "Go-go years" 42,000 is a
    // discretionary line that ends at k = 3, the retirement-only splurge; no M.
    const q = workingYearQuote(DEV_SEEDS.dip)
    expect(q.annualReal).toBe(36_000)
    expect(q.source).toBe('budget')
    expect(q.leftOut).toEqual([{ label: 'Go-go years', category: 'travel' }])
  })

  it('an essential that ENDS (a mortgage paid off at k = 5) stays in the quote', () => {
    const d = base({ budget: [line('housing', 'Mortgage', 24_000, 'essentials', 0, 5), GROCERIES] })
    expect(workingYearQuote(d).annualReal).toBe(33_600) // 24,000 + 9,600
    expect(workingYearQuote(d).leftOut).toEqual([])
  })

  it('a discretionary line that ENDS (travel through k = 3) is out, and named', () => {
    const d = base({ budget: [HOME, line('travel', 'Travel', 15_000, 'discretionary', 0, 3)] })
    expect(workingYearQuote(d).annualReal).toBe(20_000)
    expect(workingYearQuote(d).leftOut).toEqual([{ label: 'Travel', category: 'travel' }])
  })

  it('a discretionary line that starts LATER is out, and named', () => {
    const d = base({ budget: [HOME, line('gifts', 'Grandkids’ college', 10_000, 'discretionary', 4)] })
    expect(workingYearQuote(d).annualReal).toBe(20_000)
    expect(workingYearQuote(d).leftOut).toEqual([{ label: 'Grandkids’ college', category: 'gifts' }])
  })

  it('…even one that starts the very next year (k = 1): any later start is named', () => {
    const d = base({ budget: [HOME, line('travel', 'Cruise', 8_000, 'discretionary', 1)] })
    expect(workingYearQuote(d).annualReal).toBe(20_000)
    expect(workingYearQuote(d).leftOut).toEqual([{ label: 'Cruise', category: 'travel' }])
  })

  it('an ONGOING discretionary line (from k = 0, no end) is in — a working household spends it too', () => {
    const d = base({ budget: [HOME, line('gifts', 'Gifts', 6_000, 'discretionary')] })
    expect(workingYearQuote(d).annualReal).toBe(26_000)
    expect(workingYearQuote(d).leftOut).toEqual([])
  })

  it('a budget with no first-year line and no M quotes $0 (the step then asks for a figure)', () => {
    // An essential that starts at k = 2 is neither active in the first year nor left out.
    const d = base({ budget: [line('other', 'Care', 12_000, 'essentials', 2)] })
    expect(workingYearQuote(d)).toEqual({ annualReal: 0, source: 'budget', period: 'year', medicalReal: 0, leftOut: [] })
    expect(confirmedWorkingYearCost(d), 'nothing to confirm').toBeNull()
  })

  it('five windowed discretionary lines are ALL named, in budget order — the question shows three and "2 more"', () => {
    const names = ['Cruise', 'Europe', 'New car', 'Kitchen', 'Boat']
    const d = base({
      budget: [HOME, ...names.map((n, k) => line('travel', n, 5_000, 'discretionary', 0, k + 1))],
    })
    const q = workingYearQuote(d)
    expect(q.annualReal).toBe(20_000)
    expect(q.leftOut.map((l) => l.label)).toEqual(names)
    // The component applies the shared three-then-more rule over the names.
    expect(threeThenMore(q.leftOut.map((l) => l.label))).toEqual({ shown: ['Cruise', 'Europe', 'New car'], more: 2 })
  })

  it('a non-finite or absent spending figure quotes $0 — never NaN or a stand-in', () => {
    for (const annualSpendingReal of [Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      const d = { ...base(), annualSpendingReal } as unknown as ScenarioDraft
      expect(workingYearQuote(d).annualReal, String(annualSpendingReal)).toBe(0)
      expect(confirmedWorkingYearCost(d), String(annualSpendingReal)).toBeNull()
    }
  })
})

describe('the state-tax reading (KTD18)', () => {
  it('NC leaves its tax out (agi-derived), PA keeps it in (class-based), FL has none; anything else is unpriced', () => {
    expect(workingYearStateTaxReading(base({ retirementState: 'NC' }))).toBe('agi-derived')
    expect(workingYearStateTaxReading(base({ retirementState: 'PA' }))).toBe('class-based')
    expect(workingYearStateTaxReading(base({ retirementState: 'FL' }))).toBe('none')
    expect(workingYearStateTaxReading(base({ retirementState: 'elsewhere' }))).toBe('unpriced')
    expect(workingYearStateTaxReading(base({ retirementState: 'SC' })), 'an unbuilt roster state').toBe('unpriced')
    expect(workingYearStateTaxReading(base()), 'unanswered').toBe('unpriced')
  })

  it('THE DEPARTURE’S WITNESS: an UNBUILDABLE NC date draft still reads agi-derived — the draft’s answer, not the built read', () => {
    // `date` in NC with its marketplace quote removed: a missing fact, so no run builds and the built
    // read is silent. The W question must still tell this NC household what the spend question does.
    const { enrolledPremiumMonthlyToday: _quote, ...health } = DEV_SEEDS.date.health
    const d: ScenarioDraft = { ...DEV_SEEDS.date, retirementState: 'NC', health }
    expect(isDateRoute(d)).toBe(true)
    expect(missingRequiredFacts(d).length, 'unbuildable').toBeGreaterThan(0)
    expect(pricedStateForRun(d), 'the built read has nothing to say').toBeUndefined()
    expect(workingYearStateTaxReading(d)).toBe('agi-derived')
  })

  it('wherever a run builds, the draft reading equals the BUILT read mapped through its base system — every buildable seed, under every state answer', () => {
    // Hand-typed: the base-system classes the four persisted readings name (KTD4).
    const READING: Record<StateBaseSystem, WorkingYearStateTaxReading> = {
      'federal-agi-derived': 'agi-derived',
      'class-based': 'class-based',
      'no-income-tax': 'none',
    }
    const builtReading = (d: ScenarioDraft): WorkingYearStateTaxReading => {
      const state = pricedStateForRun(d)
      return state === undefined ? 'unpriced' : READING[STATE_TAX_PROFILES[state].baseSystem]
    }
    let checked = 0
    let dateChecked = 0
    let pricedChecked = 0
    for (const [key, seed] of Object.entries(DEV_SEEDS)) {
      const { retirementState: _own, ...unanswered } = seed
      for (const state of [undefined, ...STATE_ROSTER]) {
        const d: ScenarioDraft = state === undefined ? unanswered : { ...unanswered, retirementState: state }
        if (missingRequiredFacts(d).length > 0) continue
        expect(workingYearStateTaxReading(d), `${key} · ${state ?? 'unanswered'}`).toBe(builtReading(d))
        checked++
        if (isDateRoute(d)) dateChecked++
        if (builtReading(d) !== 'unpriced') pricedChecked++
      }
    }
    // Non-vacuity: both routes, and priced readings among them.
    expect(dateChecked, 'date-route drafts checked').toBeGreaterThan(0)
    expect(checked - dateChecked, 'spine drafts checked').toBeGreaterThan(0)
    expect(pricedChecked, 'priced readings checked').toBeGreaterThan(0)
  })
})

describe('the answers (KTD4)', () => {
  it('a confirmed answer carries the CENTS-ROUNDED current quote and the current reading', () => {
    // 84,000.006 → 84,000.01 at the cent.
    expect(confirmedWorkingYearCost(base({ annualSpendingReal: 84_000.006, retirementState: 'PA' }))).toEqual({
      kind: 'confirmed',
      quotedReal: 84_000.01,
      stateTaxReading: 'class-based',
    })
  })

  it('an entered answer keeps the household’s own yearly figure and the unit it was typed in', () => {
    expect(enteredWorkingYearCost(base({ retirementState: 'NC' }), 96_000, 'month')).toEqual({
      kind: 'entered',
      amountReal: 96_000,
      entryPeriod: 'month',
      stateTaxReading: 'agi-derived',
    })
  })
})

describe('the stale predicate (KTD21)', () => {
  const confirmedAt = (quotedReal: number, stateTaxReading: WorkingYearStateTaxReading): WorkingYearCostV3 => ({
    kind: 'confirmed',
    quotedReal,
    stateTaxReading,
  })
  const entered = (amountReal: number, stateTaxReading: WorkingYearStateTaxReading): WorkingYearCostV3 => ({
    kind: 'entered',
    amountReal,
    entryPeriod: 'year',
    stateTaxReading,
  })
  // An NC household spending 84,000 a year.
  const nc = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => base({ retirementState: 'NC', ...over })

  it('absent W is never stale', () => {
    expect(workingYearCostStaleness(nc())).toBeNull()
    expect(isWorkingYearCostStale(nc())).toBe(false)
  })

  it('a freshly minted confirmed answer is not stale', () => {
    const d = nc()
    const fresh = { ...d, workingYearCost: confirmedWorkingYearCost(d)! }
    expect(workingYearCostStaleness(fresh)).toBeNull()
    expect(isWorkingYearCostStale(fresh)).toBe(false)
  })

  it('the quote moving by exactly one cent stales a confirmed answer (quoteMoved)', () => {
    const d = nc({ annualSpendingReal: 84_000.01, workingYearCost: confirmedAt(84_000, 'agi-derived') })
    expect(workingYearCostStaleness(d)).toEqual({ quoteMoved: true, readingMoved: false })
    expect(isWorkingYearCostStale(d)).toBe(true)
  })

  it('a move under half a cent is not a move (the cent is the grain)', () => {
    const d = nc({ annualSpendingReal: 84_000.004, workingYearCost: confirmedAt(84_000, 'agi-derived') })
    expect(workingYearCostStaleness(d)).toBeNull()
  })

  it('a state flip NC → PA stales BOTH kinds (readingMoved), the figure unmoved', () => {
    const pa = nc({ retirementState: 'PA' })
    expect(workingYearCostStaleness({ ...pa, workingYearCost: confirmedAt(84_000, 'agi-derived') })).toEqual({
      quoteMoved: false,
      readingMoved: true,
    })
    expect(workingYearCostStaleness({ ...pa, workingYearCost: entered(96_000, 'agi-derived') })).toEqual({
      quoteMoved: false,
      readingMoved: true,
    })
  })

  it('an entered answer is never quoteMoved — it was never the quote', () => {
    // 96,000 entered against an 84,000 quote, then the spending moves to 90,000: still the household's figure.
    expect(workingYearCostStaleness(nc({ workingYearCost: entered(96_000, 'agi-derived') }))).toBeNull()
    expect(
      workingYearCostStaleness(nc({ annualSpendingReal: 90_000, workingYearCost: entered(96_000, 'agi-derived') })),
    ).toBeNull()
  })

  it('a period-only relabel (month ↔ year, the yearly figure unchanged) never stales', () => {
    const w = confirmedAt(84_000, 'agi-derived')
    expect(workingYearCostStaleness(nc({ spendEntryPeriod: 'month', workingYearCost: w }))).toBeNull()
    expect(workingYearCostStaleness(nc({ spendEntryPeriod: 'year', workingYearCost: w }))).toBeNull()
  })
})

// The ONE stale sentence the W step's note, the panel's stale face and the result's line all read: the
// last figure, the current quote where it moved, and which input really moved — never the quote-only
// words for a cause that was the state too, and never "now come to $0" when no quote is left to offer.
describe('the stale sentence names the cause that moved (KTD21)', () => {
  const confirmedAt = (quotedReal: number, stateTaxReading: WorkingYearStateTaxReading): WorkingYearCostV3 => ({
    kind: 'confirmed',
    quotedReal,
    stateTaxReading,
  })
  const nc = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => base({ retirementState: 'NC', ...over })

  it('absent or still matching: no sentence', () => {
    expect(workingYearCostStaleText(nc())).toBeNull()
    expect(workingYearCostStaleText(nc({ workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBeNull()
  })

  it('the spending moved: both yearly figures and which way the last one leans; with no spending left to quote, no second figure', () => {
    // Spending ROSE past the figure the household said yes to: the answer can look better than it is.
    expect(workingYearCostStaleText(nc({ annualSpendingReal: 90_000, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      `${slots.workingCostStaleQuote('84,000', '90,000')} ${slots.workingCostStaleLeansBetter('84,000')}`,
    )
    // Spending FELL under it: no lean at all — where no year runs short at either figure the answer is
    // identical, and "can look worse" read as "the real answer is better" (b9-7, withdrawn).
    expect(workingYearCostStaleText(nc({ annualSpendingReal: 78_000, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      slots.workingCostStaleQuote('84,000', '78,000'),
    )
    expect(workingYearCostStaleText(nc({ annualSpendingReal: undefined, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      slots.workingCostStaleQuoteGone('84,000'),
    )
  })

  it('a move under a dollar prints both figures to the cent — never "$84,000 … now $84,000" (the whole-file review)', () => {
    // The check stales at the cent (above); in whole dollars both figures would read 84,000.
    expect(workingYearCostStaleText(nc({ annualSpendingReal: 84_000.4, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      `${slots.workingCostStaleQuote('84,000.00', '84,000.40')} ${slots.workingCostStaleLeansBetter('84,000.00')}`,
    )
    expect(workingYearCostStaleText(nc({ annualSpendingReal: 83_999.6, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      slots.workingCostStaleQuote('84,000.00', '83,999.60'),
    )
    // A move of a dollar or more keeps whole dollars.
    expect(workingYearCostStaleText(nc({ annualSpendingReal: 84_001, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      `${slots.workingCostStaleQuote('84,000', '84,001')} ${slots.workingCostStaleLeansBetter('84,000')}`,
    )
  })

  it('the state moved alone: the state words, by kind', () => {
    const pa = nc({ retirementState: 'PA' })
    expect(workingYearCostStaleText({ ...pa, workingYearCost: confirmedAt(84_000, 'agi-derived') })).toBe(
      slots.workingCostStaleStateConfirmed('84,000'),
    )
    expect(
      workingYearCostStaleText({
        ...pa,
        workingYearCost: { kind: 'entered', amountReal: 96_000, entryPeriod: 'month', stateTaxReading: 'agi-derived' },
      }),
    ).toBe(slots.workingCostStaleStateEntered('96,000'))
  })

  it('both moved: one sentence naming both causes; with no spending left to quote, no second figure', () => {
    expect(
      workingYearCostStaleText(nc({ retirementState: 'PA', annualSpendingReal: 90_000, workingYearCost: confirmedAt(84_000, 'agi-derived') })),
    ).toBe(slots.workingCostStaleBoth('84,000', '90,000'))
    expect(
      workingYearCostStaleText(nc({ retirementState: 'PA', annualSpendingReal: undefined, workingYearCost: confirmedAt(84_000, 'agi-derived') })),
    ).toBe(slots.workingCostStaleBothGone('84,000'))
  })
})

describe('W below M (KTD17’s note predicate) — strictly below', () => {
  const withM = (w: number): ScenarioDraft =>
    base({
      health: { oopMedicalAnnual: 12_000 },
      workingYearCost: { kind: 'entered', amountReal: w, entryPeriod: 'year', stateTaxReading: 'unpriced' },
    })

  it('W = M is not below; W = M − 1 is', () => {
    expect(workingCostBelowMedical(withM(12_000))).toBe(false)
    expect(workingCostBelowMedical(withM(11_999))).toBe(true)
  })

  it('reads a confirmed answer’s figure the same way', () => {
    const d = base({
      health: { oopMedicalAnnual: 12_000 },
      workingYearCost: { kind: 'confirmed', quotedReal: 11_999, stateTaxReading: 'unpriced' },
    })
    expect(workingCostBelowMedical(d)).toBe(true)
  })

  it('no W, or no M, is never below', () => {
    expect(workingCostBelowMedical(base({ health: { oopMedicalAnnual: 12_000 } }))).toBe(false)
    expect(
      workingCostBelowMedical(
        base({ workingYearCost: { kind: 'entered', amountReal: 1, entryPeriod: 'year', stateTaxReading: 'unpriced' } }),
      ),
    ).toBe(false)
  })
})

describe('the W writes — draft → draft, one set for the step and the panel (U8)', () => {
  const entered = (amountReal: number, entryPeriod: 'month' | 'year', stateTaxReading: WorkingYearStateTaxReading = 'unpriced'): WorkingYearCostV3 => ({
    kind: 'entered',
    amountReal,
    entryPeriod,
    stateTaxReading,
  })

  it('"yes" stores the current quote and reading; a $0 quote is left alone (nothing to confirm)', () => {
    expect(writeConfirmedWorkingYearCost(base({ retirementState: 'NC' })).workingYearCost).toEqual({
      kind: 'confirmed',
      quotedReal: 84_000,
      stateTaxReading: 'agi-derived',
    })
    const nothing = base({ annualSpendingReal: undefined })
    expect(writeConfirmedWorkingYearCost(nothing)).toBe(nothing)
  })

  it('a figure stores the household’s own amount and unit under the current reading', () => {
    expect(writeEnteredWorkingYearCost(base({ retirementState: 'PA' }), 96_000, 'month').workingYearCost).toEqual(
      entered(96_000, 'month', 'class-based'),
    )
  })

  it('"keep" re-stamps a held entered figure under the CURRENT reading, figure and unit unchanged', () => {
    const held = base({ retirementState: 'FL', workingYearCost: entered(90_000, 'year', 'agi-derived') })
    expect(writeKeptWorkingYearCost(held).workingYearCost).toEqual(entered(90_000, 'year', 'none'))
    const monthly = base({ retirementState: 'PA', workingYearCost: entered(96_000, 'month', 'unpriced') })
    expect(writeKeptWorkingYearCost(monthly).workingYearCost).toEqual(entered(96_000, 'month', 'class-based'))
  })

  it('"keep" over a held YES makes the quote it said yes to the household’s own figure, yearly, under the CURRENT reading (ruling 34)', () => {
    // The quote has moved on (the spending figure is now $78,000); the kept figure is the OLD quote.
    const yes = base({
      retirementState: 'NC',
      annualSpendingReal: 78_000,
      workingYearCost: { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' },
    })
    expect(writeKeptWorkingYearCost(yes).workingYearCost).toEqual(entered(84_000, 'year', 'agi-derived'))
    const none = base({ workingYearCost: undefined })
    expect(writeKeptWorkingYearCost(none)).toBe(none)
  })

  it('a unit tap re-bases the TYPED digits and never re-stamps the reading; the same unit is a no-op', () => {
    // 9,000 typed under month (108,000 a year) → "each year" reads 9,000 a year.
    const typedMonthly = base({ retirementState: 'NC', workingYearCost: entered(108_000, 'month', 'unpriced') })
    expect(writeWorkingYearCostPeriod(typedMonthly, 'year').workingYearCost).toEqual(entered(9_000, 'year', 'unpriced'))
    // 40,000 typed under year → "each month" reads 40,000 a month (480,000 a year).
    const typedYearly = base({ workingYearCost: entered(40_000, 'year') })
    expect(writeWorkingYearCostPeriod(typedYearly, 'month').workingYearCost).toEqual(entered(480_000, 'month'))
    expect(writeWorkingYearCostPeriod(typedYearly, 'year')).toBe(typedYearly)
  })

  it('the walk’s clear strips W entirely (never a figure-less entered answer); an absent W is left alone', () => {
    const held = base({ workingYearCost: entered(90_000, 'year') })
    const cleared = writeClearedWorkingYearCost(held)
    expect('workingYearCost' in cleared).toBe(false)
    const none = base()
    expect(writeClearedWorkingYearCost(none)).toBe(none)
  })
})
