import { describe, expect, it } from 'vitest'
import {
  confirmedWorkingYearCost,
  enteredWorkingYearCost,
  heldYesBelowQuote,
  isWorkingYearCostStale,
  workingCostBelowMedical,
  workingYearCostStaleness,
  workingYearCostStaleSentence,
  workingYearQuote,
  workingYearStateTaxReading,
  writeClearedWorkingYearCost,
  writeConfirmedWorkingYearCost,
  writeEnteredWorkingYearCost,
  writeKeptWorkingYearCost,
  writeWorkingYearCostPeriod,
} from '../workingYearQuote'
// The joined note (W's sentence and its lean) is composed in `workingYearLeftOver` (the U11 walk's (ae)): every
// draft in this file carries no left-over answer, so its lean is the spending-alone one wherever the spending rose.
import { workingYearCostStaleNote } from '../workingYearLeftOver'
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
// Every draft here carries no left-over answer, so the note (`workingYearCostStaleNote`) is the sentence and,
// where the spending rose past the held figure, the spending-alone lean. Build 2's words for a "saved" answer
// waiting on W (the year-level lean on the note; the clause and the check at the quote on the line) are pinned
// in `workingYearLeftOver.test.ts`, on the Result in `resultPayCheckLine.test.tsx` and on the gate in
// `reentry.test.tsx`; the panel's W row, which draws the note, in `assumptionPanel.test.tsx`.
describe('the stale sentence names the cause that moved (KTD21)', () => {
  it('the sentence comes split from its lean: `rose` exactly where the spending rose past the held figure, with both figures as the sentence prints them (the U11 walk’s (ae))', () => {
    const nc0 = base({ retirementState: 'NC' })
    const yes = (quotedReal: number): WorkingYearCostV3 => ({ kind: 'confirmed', quotedReal, stateTaxReading: 'agi-derived' })
    expect(workingYearCostStaleSentence({ ...nc0, annualSpendingReal: 90_000, workingYearCost: yes(84_000) })).toEqual({
      rose: true,
      sentence: slots.workingCostStaleQuote('84,000', '90,000'),
      held: '84,000',
      quote: '90,000',
    })
    // Under a dollar apart, both print to the cent, and the split carries the cent strings the sentence used.
    expect(workingYearCostStaleSentence({ ...nc0, annualSpendingReal: 84_000.4, workingYearCost: yes(84_000) })).toEqual({
      rose: true,
      sentence: slots.workingCostStaleQuote('84,000.00', '84,000.40'),
      held: '84,000.00',
      quote: '84,000.40',
    })
    // The unrisen arm carries the held figure too (U11 walk 3, b9-4): the clause after it names it ("Until you
    // confirm or change your $84,000 figure").
    expect(workingYearCostStaleSentence({ ...nc0, annualSpendingReal: 78_000, workingYearCost: yes(84_000) })).toEqual({
      rose: false,
      sentence: slots.workingCostStaleQuote('84,000', '78,000'),
      held: '84,000',
    })
    expect(workingYearCostStaleSentence({ ...nc0, workingYearCost: yes(84_000) })).toBeNull()
  })

  const confirmedAt = (quotedReal: number, stateTaxReading: WorkingYearStateTaxReading): WorkingYearCostV3 => ({
    kind: 'confirmed',
    quotedReal,
    stateTaxReading,
  })
  const nc = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => base({ retirementState: 'NC', ...over })

  it('absent or still matching: no sentence', () => {
    expect(workingYearCostStaleNote(nc())).toBeNull()
    expect(workingYearCostStaleNote(nc({ workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBeNull()
  })

  it('the spending moved: both yearly figures and which way the last one leans; with no spending left to quote, no second figure', () => {
    // Spending ROSE past the figure the household said yes to: the answer can look better than it is.
    expect(workingYearCostStaleNote(nc({ annualSpendingReal: 90_000, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      `${slots.workingCostStaleQuote('84,000', '90,000')} ${slots.workingCostStaleLeansBetter('84,000')}`,
    )
    // Spending FELL under it: no lean at all. For this draft (no left-over answer, so nothing is credited at
    // either figure) the answer is identical wherever no year runs short at either figure, and "can look
    // worse" read as "the real answer is better" (b9-7, withdrawn). For a "saved" answer the two runs differ
    // wherever the run on the checked W carries the stored figure again (derived from build 2's R8, not
    // measured), and which way that moves the answer is unmeasured, so no lean is said there either (R16).
    expect(workingYearCostStaleNote(nc({ annualSpendingReal: 78_000, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      slots.workingCostStaleQuote('84,000', '78,000'),
    )
    expect(workingYearCostStaleNote(nc({ annualSpendingReal: undefined, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      slots.workingCostStaleQuoteGone('84,000'),
    )
  })

  it('a move under a dollar prints both figures to the cent — never "$84,000 … now $84,000" (the whole-file review)', () => {
    // The check stales at the cent (above); in whole dollars both figures would read 84,000.
    expect(workingYearCostStaleNote(nc({ annualSpendingReal: 84_000.4, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      `${slots.workingCostStaleQuote('84,000.00', '84,000.40')} ${slots.workingCostStaleLeansBetter('84,000.00')}`,
    )
    expect(workingYearCostStaleNote(nc({ annualSpendingReal: 83_999.6, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      slots.workingCostStaleQuote('84,000.00', '83,999.60'),
    )
    // A move of a dollar or more keeps whole dollars.
    expect(workingYearCostStaleNote(nc({ annualSpendingReal: 84_001, workingYearCost: confirmedAt(84_000, 'agi-derived') }))).toBe(
      `${slots.workingCostStaleQuote('84,000', '84,001')} ${slots.workingCostStaleLeansBetter('84,000')}`,
    )
  })

  it('the state moved alone: the state words, by kind', () => {
    const pa = nc({ retirementState: 'PA' })
    expect(workingYearCostStaleNote({ ...pa, workingYearCost: confirmedAt(84_000, 'agi-derived') })).toBe(
      slots.workingCostStaleStateConfirmed('84,000'),
    )
    expect(
      workingYearCostStaleNote({
        ...pa,
        workingYearCost: { kind: 'entered', amountReal: 96_000, entryPeriod: 'month', stateTaxReading: 'agi-derived' },
      }),
    ).toBe(slots.workingCostStaleStateEntered('96,000'))
  })

  it('both moved: one sentence naming both causes, and the lean where the spending ROSE past the figure; with no spending left to quote, no second figure', () => {
    // The spending alone now comes to more than the yes, whatever the state did: a state's income tax either
    // belongs in W (adding to it) or is priced apart (adding nothing), so it never brings W back below the
    // spending. The lean rides as it does on the spending alone (the U11 walk's (ac)).
    expect(
      workingYearCostStaleNote(nc({ retirementState: 'PA', annualSpendingReal: 90_000, workingYearCost: confirmedAt(84_000, 'agi-derived') })),
    ).toBe(`${slots.workingCostStaleBoth('84,000', '90,000')} ${slots.workingCostStaleLeansBetter('84,000')}`)
    // The spending FELL under it and the state moved: no lean (as on the spending alone).
    expect(
      workingYearCostStaleNote(nc({ retirementState: 'PA', annualSpendingReal: 78_000, workingYearCost: confirmedAt(84_000, 'agi-derived') })),
    ).toBe(slots.workingCostStaleBoth('84,000', '78,000'))
    expect(
      workingYearCostStaleNote(nc({ retirementState: 'PA', annualSpendingReal: undefined, workingYearCost: confirmedAt(84_000, 'agi-derived') })),
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

  it('"keep" over a held YES makes the quote it said yes to a KEPT figure, yearly, under the CURRENT reading, stamped with today’s quote (ruling 34; build 2’s KTD10)', () => {
    // The quote has moved on (the spending figure is now $78,000); the kept figure is the OLD quote, and
    // the stamp is the quote the stale note showed — today's.
    const yes = base({
      retirementState: 'NC',
      annualSpendingReal: 78_000,
      workingYearCost: { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' },
    })
    expect(writeKeptWorkingYearCost(yes).workingYearCost).toEqual({
      ...entered(84_000, 'year', 'agi-derived'),
      keptOverQuoteReal: 78_000,
    })
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

/**
 * THE KEEP STAMP (build 2's KTD10, R13; U5). A stale yes kept through the stale note's door became an
 * entered figure that never went stale on the spending again. The keep now stamps it with the quote the
 * note showed, and a stamped figure goes stale when today's quote rises ABOVE THE FIGURE. Every figure is
 * typed by hand: a household spending $80,000 a year (yearly, no budget) said yes to $84,000 before its
 * spending fell to $80,000, then kept $84,000.
 */
describe('the keep stamp: a kept yes goes stale when the spending rises past it (build 2’s KTD10, R13)', () => {
  /** An NC household spending `spend` a year, no budget, holding `w`. */
  const at = (spend: number | undefined, w: WorkingYearCostV3, over: Partial<ScenarioDraft> = {}): ScenarioDraft =>
    base({ retirementState: 'NC', annualSpendingReal: spend, spendEntryPeriod: 'year', workingYearCost: w, ...over })
  const yes84: WorkingYearCostV3 = { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'agi-derived' }
  /** What the keep must store: $84,000 a year, kept over the $80,000 quote its note showed. */
  const kept84: WorkingYearCostV3 = {
    kind: 'entered',
    amountReal: 84_000,
    entryPeriod: 'year',
    stateTaxReading: 'agi-derived',
    keptOverQuoteReal: 80_000,
  }
  const typed = (amountReal: number, stateTaxReading: WorkingYearStateTaxReading = 'agi-derived'): WorkingYearCostV3 => ({
    kind: 'entered',
    amountReal,
    entryPeriod: 'year',
    stateTaxReading,
  })

  it('keeping $84,000 over a quote of $80,000 stores the stamp; at $85,000 it is stale on the spending, says so, and leans', () => {
    const stale = at(80_000, yes84)
    expect(workingYearCostStaleness(stale), 'the yes is stale before the keep').toEqual({ quoteMoved: true, readingMoved: false })
    const kept = writeKeptWorkingYearCost(stale)
    expect(kept.workingYearCost).toEqual(kept84)
    expect(workingYearCostStaleness(kept), 'fresh once kept').toBeNull()
    // The spending rises to $85,000, past the kept figure.
    const risen = { ...kept, annualSpendingReal: 85_000 }
    expect(workingYearCostStaleness(risen)).toEqual({ quoteMoved: true, readingMoved: false })
    expect(isWorkingYearCostStale(risen)).toBe(true)
    expect(heldYesBelowQuote(risen), 'the door is withheld below the quote (ruling 34)').toBe(true)
    // It names the spending, never the state, and appends the rosy-side lean.
    expect(workingYearCostStaleNote(risen)).toBe(
      `${slots.workingCostStaleKeptQuote('84,000', '85,000')} ${slots.workingCostStaleLeansBetter('84,000')}`,
    )
  })

  it('the words, typed by hand: the lean states the spending as the fact it is, never an "If" (the U11 walk’s (af)), and a both-causes sentence names the new state answer (its (ac))', () => {
    expect(workingYearCostStaleNote(at(85_000, kept84))).toBe(
      'You kept $84,000 a year, but your spending figures have changed since — they now come to $85,000 a year. ' +
        'Your spending alone now comes to more than $84,000, so this answer can look better than it really is.',
    )
    expect(workingYearCostStaleNote(at(90_000, kept84, { retirementState: 'PA' }))).toBe(
      'You kept $84,000 a year, but your spending figures and your state answer have changed since. Your spending now comes ' +
        'to $90,000 a year, and your new state answer changes which state’s income tax this figure should hold. ' +
        'Your spending alone now comes to more than $84,000, so this answer can look better than it really is.',
    )
    expect(workingYearCostStaleNote(at(90_000, yes84, { retirementState: 'PA' }))).toBe(
      'You said yes to $84,000 a year, but your spending figures and your state answer have changed since. Your spending ' +
        'now comes to $90,000 a year, and your new state answer changes which state’s income tax this figure should hold. ' +
        'Your spending alone now comes to more than $84,000, so this answer can look better than it really is.',
    )
  })

  it('THE REFERENT IS THE FIGURE, never the stamp: unmoved, fallen, risen short of the figure, or level with it — fresh; one cent past it — stale', () => {
    // A quote between the stamp ($80,000) and the figure ($84,000) leaves the answer standing: the household
    // kept a figure at least what it spends, and its door would show there, so a stale keyed to the stamp
    // could never be cured by a keep that carries the stamp forward.
    for (const spend of [80_000, 79_000, 82_000, 84_000, 84_000.004]) {
      expect(workingYearCostStaleness(at(spend, kept84)), `spending ${spend}`).toBeNull()
      expect(heldYesBelowQuote(at(spend, kept84)), `spending ${spend}`).toBe(false)
      expect(workingYearCostStaleNote(at(spend, kept84)), `spending ${spend}`).toBeNull()
    }
    // The cent is the grain (KTD21): $84,000.01 is above $84,000, and both print to the cent.
    const cent = at(84_000.01, kept84)
    expect(workingYearCostStaleness(cent)).toEqual({ quoteMoved: true, readingMoved: false })
    expect(workingYearCostStaleNote(cent)).toBe(
      `${slots.workingCostStaleKeptQuote('84,000.00', '84,000.01')} ${slots.workingCostStaleLeansBetter('84,000.00')}`,
    )
  })

  it('a kept figure says "kept", never "entered": the state alone, and the state with the spending', () => {
    // NC → PA moves the reading; the spending unmoved at $80,000 (below the figure).
    expect(workingYearCostStaleNote(at(80_000, kept84, { retirementState: 'PA' }))).toBe(slots.workingCostStaleStateKept('84,000'))
    // The state alone prints one figure in whole dollars, even with a quote a few cents under it.
    expect(workingYearCostStaleNote(at(83_999.6, kept84, { retirementState: 'PA' }))).toBe(slots.workingCostStaleStateKept('84,000'))
    // Both: the spending rose to $90,000 AND the state moved — one sentence, both causes, and the lean: a kept
    // figure is stale on the spending only once the spending passes it, so here the spending alone always
    // sits above it, and the state's tax can only add to what W should hold (the U11 walk's (ac); the walk
    // read the lean missing from this sentence alone). The state on its own above carries no lean: a state
    // move can cut the tax on pay as easily as raise it.
    expect(workingYearCostStaleness(at(90_000, kept84, { retirementState: 'PA' }))).toEqual({ quoteMoved: true, readingMoved: true })
    expect(workingYearCostStaleNote(at(90_000, kept84, { retirementState: 'PA' }))).toBe(
      `${slots.workingCostStaleKeptBoth('84,000', '90,000')} ${slots.workingCostStaleLeansBetter('84,000')}`,
    )
    // A TYPED figure keeps its own words: the state alone, whatever the spending did.
    expect(workingYearCostStaleNote(at(90_000, typed(84_000), { retirementState: 'PA' }))).toBe(slots.workingCostStaleStateEntered('84,000'))
  })

  it('after a state move, a keep of the kept figure keeps the stamp — and a later rise past it still stales it', () => {
    const moved = at(80_000, kept84, { retirementState: 'PA' })
    expect(workingYearCostStaleness(moved)).toEqual({ quoteMoved: false, readingMoved: true })
    expect(heldYesBelowQuote(moved), 'the door shows: $84,000 is not below $80,000').toBe(false)
    const keptAgain = writeKeptWorkingYearCost(moved)
    expect(keptAgain.workingYearCost).toEqual({ ...kept84, stateTaxReading: 'class-based' })
    expect(workingYearCostStaleness(keptAgain)).toBeNull()
    expect(workingYearCostStaleness({ ...keptAgain, annualSpendingReal: 85_000 })).toEqual({ quoteMoved: true, readingMoved: false })
  })

  it('a keep of a kept figure the spending has risen past keeps the stamp, so it stays stale: the keep that guards it cannot cure it', () => {
    // The face withholds the door here (`heldYesBelowQuote`), but the radio's re-tap reaches the same writer.
    const risen = at(85_000, kept84)
    const again = writeKeptWorkingYearCost(risen)
    expect(again.workingYearCost).toEqual(kept84)
    expect(workingYearCostStaleness(again)).toEqual({ quoteMoved: true, readingMoved: false })
  })

  it('a typed figure drops the stamp, and is never staled by any quote', () => {
    const typedOver = writeEnteredWorkingYearCost(at(80_000, kept84), 84_000, 'year')
    expect(typedOver.workingYearCost).toEqual(typed(84_000))
    for (const spend of [85_000, 120_000, 1_000_000]) {
      expect(workingYearCostStaleness({ ...typedOver, annualSpendingReal: spend }), `spending ${spend}`).toBeNull()
      expect(heldYesBelowQuote({ ...typedOver, annualSpendingReal: spend }), `spending ${spend}`).toBe(false)
    }
  })

  it('a typed $70,000, stale on a state move with the quote at $84,000, is kept: no stamp, and fresh through a later rise', () => {
    const staleTyped = at(84_000, typed(70_000, 'class-based'))
    expect(workingYearCostStaleness(staleTyped)).toEqual({ quoteMoved: false, readingMoved: true })
    // A typed figure below the quote still gets its door (ruling 21): it answered no quote.
    expect(heldYesBelowQuote(staleTyped)).toBe(false)
    const kept = writeKeptWorkingYearCost(staleTyped)
    expect(kept.workingYearCost).toEqual(typed(70_000))
    expect('keptOverQuoteReal' in (kept.workingYearCost ?? {}), 'a keep of a typed figure never mints one').toBe(false)
    expect(workingYearCostStaleness({ ...kept, annualSpendingReal: 90_000 })).toBeNull()
  })

  it('a unit tap on a KEPT figure CONVERTS it and carries the stamp: "each month" is $7,000 a month, the same $84,000 a year (the U11 walk’s (ab))', () => {
    // $84,000 a year kept, then "each month" tapped. The household never typed those digits (the keep took the
    // quote it said yes to), so there is no 12× misentry for a re-read to undo (KTD17's re-read is for TYPED
    // digits): the unit moves and the money stays — the box shows 7,000 under "Each month", and the row's
    // "$84,000 a year — the figure you kept" stays true. Walk 1 read "$1,008,000 a year — the figure you kept".
    const monthly = writeWorkingYearCostPeriod(at(80_000, kept84), 'month')
    expect(monthly.workingYearCost).toEqual({ ...kept84, entryPeriod: 'month' })
    // The trip back is the kept figure exactly, in both directions: a kept MONTHLY figure tapped to a year.
    const back = writeWorkingYearCostPeriod(monthly, 'year')
    expect(back.workingYearCost).toEqual(kept84)
    expect(writeWorkingYearCostPeriod(back, 'month').workingYearCost).toEqual({ ...kept84, entryPeriod: 'month' })
    // The same unit is a no-op.
    expect(writeWorkingYearCostPeriod(monthly, 'month')).toBe(monthly)
    // A kept figure the spending has already passed stays exactly as stale in EITHER unit: the stale test reads
    // the yearly figure, and a unit tap no longer moves it. (Under the re-read, "each month" made it $1,008,000
    // a year — fresh — and the walk's Continue let it through at twelve times the figure.)
    const staleKept = at(90_000, kept84)
    const staleMonthly = writeWorkingYearCostPeriod(staleKept, 'month')
    expect(staleMonthly.workingYearCost).toEqual({ ...kept84, entryPeriod: 'month' })
    expect(workingYearCostStaleness(staleMonthly)).toEqual({ quoteMoved: true, readingMoved: false })
    expect(heldYesBelowQuote(staleMonthly), 'the door stays withheld in the month view').toBe(true)
    expect(workingYearCostStaleNote(staleMonthly)).toBe(workingYearCostStaleNote(staleKept))
    const roundTrip = writeWorkingYearCostPeriod(staleMonthly, 'year')
    expect(roundTrip.workingYearCost).toEqual(kept84)
    expect(workingYearCostStaleness(roundTrip)).toEqual({ quoteMoved: true, readingMoved: false })
    // A TYPED figure still re-reads its digits (the 12× repair), stamp-free, beside it.
    const typedYearly = at(80_000, typed(84_000))
    expect(writeWorkingYearCostPeriod(typedYearly, 'month').workingYearCost).toEqual({ ...typed(84_000), amountReal: 1_008_000, entryPeriod: 'month' })
  })

  it('a keep where no quote is left to show stamps the quote the yes said yes to — never unstamped, so a later spending figure still counts', () => {
    // The spending cleared: the note reads "no spending figure to offer now", and the door shows.
    const gone = at(undefined, yes84)
    expect(workingYearCostStaleNote(gone)).toBe(slots.workingCostStaleQuoteGone('84,000'))
    expect(heldYesBelowQuote(gone)).toBe(false)
    const kept = writeKeptWorkingYearCost(gone)
    expect(kept.workingYearCost).toEqual({ ...kept84, keptOverQuoteReal: 84_000 })
    // No quote: nothing to compare, fresh. A spending figure entered later above $84,000 stales it.
    expect(workingYearCostStaleness(kept)).toBeNull()
    expect(workingYearCostStaleness({ ...kept, annualSpendingReal: 90_000 })).toEqual({ quoteMoved: true, readingMoved: false })
  })

  it('a keep of a yes stale only on the state stamps today’s quote, which is the one it said yes to', () => {
    const stateOnly = at(84_000, yes84, { retirementState: 'PA' })
    expect(workingYearCostStaleness(stateOnly)).toEqual({ quoteMoved: false, readingMoved: true })
    expect(writeKeptWorkingYearCost(stateOnly).workingYearCost).toEqual({
      ...kept84,
      stateTaxReading: 'class-based',
      keptOverQuoteReal: 84_000,
    })
  })

  it('the stamp reads the quote off the draft the write is HANDED: a budget quote stamps the budget’s figure', () => {
    // Home $20,000 + Groceries $9,600 = $29,600, and the yes was to $36,000.
    const d = base({
      retirementState: 'NC',
      budget: [HOME, GROCERIES],
      workingYearCost: { kind: 'confirmed', quotedReal: 36_000, stateTaxReading: 'agi-derived' },
    })
    expect(writeKeptWorkingYearCost(d).workingYearCost).toEqual({
      kind: 'entered',
      amountReal: 36_000,
      entryPeriod: 'year',
      stateTaxReading: 'agi-derived',
      keptOverQuoteReal: 29_600,
    })
  })
})
