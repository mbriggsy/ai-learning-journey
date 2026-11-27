import { describe, expect, it } from 'vitest'
import {
  applyState,
  composePaired,
  composeReadings,
  floorUnread,
  kindsOf,
  leftOverNoteFor,
  leverTarget,
  orderPairedColumns,
  pairedColumnsFor,
  PAIRED_COLUMNS,
  railOffers,
  readingCount,
  recommendationBundle,
  refusalWords,
  stopWords,
  withLever,
  type HouseholdPairedColumnId,
} from '../railChrome'
import type { TableMeta, TablePerson } from '../tableRun'
import type { WhatIfReading } from '../whatIfRun'
import { applyBundle } from '@intake/whatIf'
import { workingYearLeftOverShownState } from '@intake/intakeMap'
import { totalAcrossBuckets } from '@engine/sequencing'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import type { LedgerYearRow, SavedRecommendationV3, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'

/**
 * The lever rail's composer (workbench plan U15; R17 to R20, R22, KTD12, KTD15): what the rail offers, the two readings'
 * words (the counts and nothing else, R20), Apply's withheld and left-over states, and the paired rows (each figure one
 * field of its own run's row).
 */

const person = (label: string): TablePerson => ({ label, mid: label, possessive: `${label}’s`, pronoun: `${label}’s`, you: false, currentAge: 60, lastAge: 88 })

const META: TableMeta = {
  sources: { taxable: [], roth: [], hsa: [], pretax: [], pretaxByPerson: [[], []], inherited: [] },
  track: 'full',
  route: 'dated',
  startCalendarYear: 2026,
  people: [person('Sam'), person('Alex')],
  investmentByPerson: [],
  stateTaxReading: 'agi-derived',
  statePriced: true,
  leftOverState: 'spent',
  inherited: [],
}

/** A row whose every money field holds its own distinct non-zero value, offset by `base` (two runs never share one). */
function row(t: number, base: number, over: Partial<LedgerYearRow> = {}): LedgerYearRow {
  let n = base + t * 100
  const v = () => (n += 7)
  return {
    t,
    start: { taxable: 0, pretax: v(), roth: v(), hsa: v() },
    conversion: v(),
    rmd: v(),
    draw: { taxable: v(), pretax: v(), roth: v() },
    hsaSpend: v(),
    rmdToTaxable: 0,
    contribution: { taxable: v(), pretax: v(), roth: v(), hsa: v() },
    leftOverCredit: 0,
    growthScale: 1.02,
    end: { taxable: 0, pretax: v(), roth: v(), hsa: v() },
    taxPaid: v(),
    premiums: { acaNet: v(), medicare: v(), irmaaSurcharge: v(), medicareExtras: v() },
    filing: 'mfj',
    alive: [true, true],
    rolledOver: false,
    earlyPretaxDraw: false,
    ranOut: false,
    payByPerson: [v(), v()],
    payTaxableByPerson: [v(), v()],
    otherIncomeByPerson: [
      { gross: v(), taxable: v() },
      { gross: v(), taxable: v() },
    ],
    socialSecurity: v(),
    spending: v(),
    incomeNotKept: 0,
    ...over,
  }
}

/** The field each paired column must read, typed here by hand from the plan's column list (never from the composer). */
const FIELD: Readonly<Record<HouseholdPairedColumnId, (r: LedgerYearRow) => number | undefined>> = {
  'pay-0': (r) => r.payByPerson[0],
  'pay-1': (r) => r.payByPerson[1],
  'social-security': (r) => r.socialSecurity,
  spending: (r) => r.spending,
  marketplace: (r) => r.premiums.acaNet,
  'put-in-pretax': (r) => r.contribution.pretax,
  'put-in-roth': (r) => r.contribution.roth,
  'put-in-taxable': (r) => r.contribution.taxable,
  'put-in-hsa': (r) => r.contribution.hsa,
  'to-roth': (r) => r.conversion,
  required: (r) => r.rmd,
  'taken-taxable': (r) => r.draw.taxable,
  'taken-pretax': (r) => r.draw.pretax,
  'taken-roth': (r) => r.draw.roth,
  'income-tax': (r) => r.taxPaid,
  'tax-on-pay': (r) => r.workingYear?.taxOnOutsideIncome,
  payroll: (r) => r.workingYear?.payrollTax,
  'end-total': (r) => r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa,
}

const headline = (x: number, state: 'on-track' | 'borderline' | 'off-track' | 'over-funded' | 'indeterminate' = 'on-track'): WhatIfReading => ({
  kind: 'headline',
  headline: { xOfTen: { value: x, marginToEdge: 0.1 }, outcomeState: state, stateMarginToEdge: 0.1 },
})
const offset = (offsetYears: number, quantizedLowerBound: number): WhatIfReading => ({
  kind: 'offset',
  reading: { offsetYears, survivalFraction: quantizedLowerBound + 0.02, quantizedLowerBound, clears: quantizedLowerBound >= 0.8 },
  track: 'full',
})

describe('composeReadings — the two counts, each under its own run’s name, and nothing else (R19, R20)', () => {
  const base = { route: 'spine' as const, startCalendarYear: 2026, floorUnread: false }

  it('equal counts give the even line', () => {
    const v = composeReadings({ ...base, plan: headline(7), whatIf: { kind: 'ready', reading: headline(7), updating: false } })
    expect(v.even).toBe(slots.workbenchRailEven(v.plan.text!))
    expect(v.plan.label).toBe(copy.workbenchRailPlanLabel)
    expect(v.whatIf.label).toBe(copy.workbenchRailWhatIfLabel)
  })

  it('pending, error, refused and updating give no difference line at all', () => {
    for (const whatIf of [
      { kind: 'pending' } as const,
      { kind: 'error' } as const,
      { kind: 'refused', words: 'x' } as const,
      { kind: 'empty' } as const,
      { kind: 'ready', reading: headline(7), updating: true } as const,
    ]) {
      const v = composeReadings({ ...base, plan: headline(7), whatIf })
      expect(v.even, whatIf.kind).toBeUndefined()
      expect(v.floorUnread, whatIf.kind).toBeUndefined()
    }
  })

  it('a plan at 6 beside a what-if at 8, and the reverse, each speak every count under its own run’s label', () => {
    for (const [p, w] of [
      [6, 8],
      [8, 6],
    ] as const) {
      const v = composeReadings({ ...base, plan: headline(p), whatIf: { kind: 'ready', reading: headline(w), updating: false } })
      expect(v.plan).toMatchObject({ label: copy.workbenchRailPlanLabel, text: slots.xOfTen(p) })
      expect(v.whatIf).toMatchObject({ label: copy.workbenchRailWhatIfLabel, text: slots.xOfTen(w) })
      expect(v.even).toBeUndefined()
    }
  })

  it('the ceiling is never even with a 9: "better than 9 in 10" and "about 9 of 10" are two counts', () => {
    expect(readingCount(headline(9, 'over-funded'))).toEqual({ n: 10, ceiling: true })
    expect(readingCount(offset(3, 0.96))).toEqual({ n: 10, ceiling: true })
    const v = composeReadings({ ...base, plan: headline(9), whatIf: { kind: 'ready', reading: headline(9, 'over-funded'), updating: false } })
    expect(v.even).toBeUndefined()
    expect(readingCount(headline(0, 'indeterminate'))).toBeNull()
  })

  it('OQ6: a working household’s odds name the stop year they read: the answer’s date, the lever’s, or the window’s top', () => {
    const dated = composeReadings({ ...base, route: 'dated', plan: offset(5, 0.9), whatIf: { kind: 'ready', reading: offset(7, 0.9), updating: false } })
    expect(dated.plan.note).toBe(slots.workbenchRailStopsPlan(2031))
    expect(dated.whatIf.note).toBe(slots.workbenchRailStopsWhatIf(2033))
    const top = DATE_OFFSET_WINDOW_TOP
    const noDate = composeReadings({ ...base, route: 'no-date', plan: offset(top, 0.6), whatIf: { kind: 'pending' } })
    expect(noDate.plan.note).toBe(slots.workbenchRailStopsPlanNoDate(2026 + top))
    expect(noDate.plan.note).toContain('no date in its window')
  })

  it('on the floor track, a spending what-if on extra lines only says so in place of the even line', () => {
    const v = composeReadings({ ...base, plan: headline(7), whatIf: { kind: 'ready', reading: headline(7), updating: false }, floorUnread: true })
    expect(v.even).toBeUndefined()
    expect(v.floorUnread).toBe(copy.workbenchRailFloorUnread)
  })
})

describe('floorUnread — which spending what-ifs the floor pass never reads', () => {
  const draft = DEV_SEEDS.budget
  const travel = draft.budget!.find((l) => l.tier === 'discretionary')!
  const food = draft.budget!.find((l) => l.tier === 'essentials')!
  const replace = (line: typeof travel, over: Partial<typeof travel>): WhatIfLeverV6 => ({ kind: 'spending', op: 'replace', line: { ...line, id: line.id!, ...over } })

  it('extra lines only (changed, taken out, added) on the floor track: unread', () => {
    expect(floorUnread('floor', draft, [replace(travel, { annualAmountReal: 1_000 })])).toBe(true)
    expect(floorUnread('floor', draft, [{ kind: 'spending', op: 'remove', lineId: travel.id! }])).toBe(true)
    expect(floorUnread('floor', draft, [{ kind: 'spending', op: 'add', line: { id: 'new', category: 'travel', label: 'Boat', annualAmountReal: 9_000, tier: 'discretionary', startYear: 0 } }])).toBe(true)
  })

  it('an essential line, an extra line turned essential, another lever, or the full track: read', () => {
    expect(floorUnread('floor', draft, [replace(food, { annualAmountReal: 1_000 })])).toBe(false)
    expect(floorUnread('floor', draft, [replace(travel, { tier: 'essentials' })])).toBe(false)
    expect(floorUnread('floor', draft, [replace(travel, { annualAmountReal: 1 }), { kind: 'aca-subsidy', enhanced: true }])).toBe(false)
    expect(floorUnread('full', draft, [replace(travel, { annualAmountReal: 1 })])).toBe(false)
    expect(floorUnread('floor', draft, [])).toBe(false)
  })
})

describe('applyState — Apply is withheld for a stop year and the mix, with words (KTD15, the plan’s U15)', () => {
  const draft = DEV_SEEDS.dip
  const stop: WhatIfLeverV6 = { kind: 'stop-year', calendarYear: draft.startCalendarYear + 3 }
  const mix: WhatIfLeverV6 = { kind: 'mix', stockPct: 60, bondPct: 40, cashPct: 0 }
  const aca: WhatIfLeverV6 = { kind: 'aca-subsidy', enhanced: true }

  it('a stop-only bundle, a mixed bundle holding a stop year, and any bundle holding a mix: each withheld with its reason', () => {
    expect(applyState(draft, [stop], true)).toEqual({ kind: 'withheld', words: copy.workbenchRailApplyWithheldStop })
    expect(applyState(draft, [aca, stop], true)).toEqual({ kind: 'withheld', words: copy.workbenchRailApplyWithheldStop })
    expect(applyState(draft, [mix], true)).toEqual({ kind: 'withheld', words: copy.workbenchRailApplyWithheldMix })
    expect(applyState(draft, [aca, mix], true)).toEqual({ kind: 'withheld', words: copy.workbenchRailApplyWithheldMix })
    expect(applyState(draft, [stop, mix], true)).toEqual({ kind: 'withheld', words: copy.workbenchRailApplyWithheldBoth })
    // Each reason says that taking those out lets the rest apply as compared.
    for (const k of ['workbenchRailApplyWithheldStop', 'workbenchRailApplyWithheldMix', 'workbenchRailApplyWithheldBoth'] as const) {
      expect(copy[k]).toContain('the rest applies exactly as compared')
    }
  })

  it('the rest of the bundle, once those are out: open on a current reading, waiting otherwise; empty says so', () => {
    expect(applyState(draft, [aca], true).kind).toBe('open')
    expect(applyState(draft, [aca], false).kind).toBe('waiting')
    expect(applyState(draft, [], true).kind).toBe('empty')
  })
})

describe('the left-over note — a spending what-if on a plan with a confirmed working-year cost (the adversary’s L3)', () => {
  const draft = DEV_SEEDS.datesaved
  const line = draft.budget?.[0]
  const spend: WhatIfLeverV6 =
    line !== undefined && line.id !== undefined
      ? { kind: 'spending', op: 'replace', line: { ...line, id: line.id, annualAmountReal: line.annualAmountReal - 6_000 } }
      : { kind: 'spending', op: 'total', annualSpendingReal: (draft.annualSpendingReal ?? 0) - 6_000 }

  it('[test setup] the seed carries the left over, and the spending lever applies', () => {
    expect(['saved', 'saved-moved']).toContain(workingYearLeftOverShownState(draft))
    expect(applyBundle(draft, [spend]).ok).toBe(true)
  })

  it('Apply’s words say the working-year cost must be confirmed again; after the write the plan waits on W, never a silent re-confirm', () => {
    expect(leftOverNoteFor(draft, [spend])).toBe(true)
    expect(applyState(draft, [spend], true)).toEqual({ kind: 'open', leftOverNote: copy.workbenchRailApplyLeftOver })
    const applied = applyBundle(draft, [spend])
    if (!applied.ok) throw new Error('[test setup] the spending lever applies')
    expect(workingYearLeftOverShownState(applied.draft)).toBe('waiting-on-w')
    expect(applied.draft.workingYearCost).toEqual(draft.workingYearCost)
  })

  it('deposits and the regime move no working-year quote: no note', () => {
    expect(leftOverNoteFor(draft, [{ kind: 'aca-subsidy', enhanced: true }])).toBe(false)
    expect(leftOverNoteFor(DEV_SEEDS.dip, [spend])).toBe(workingYearLeftOverShownState(DEV_SEEDS.dip) === 'saved')
  })
})

describe('railOffers — only the choices KTD15 calls open', () => {
  it('a working household: the stop year offers every year of the date window, the plan’s among them, and both stop', () => {
    const d = DEV_SEEDS.dip
    const offers = railOffers(d, d.startCalendarYear + 5)
    expect(offers.stop?.years).toEqual(Array.from({ length: DATE_OFFSET_WINDOW_TOP + 1 }, (_, k) => d.startCalendarYear + k))
    expect(offers.stop?.planYear).toBe(d.startCalendarYear + 5)
    expect(offers.stop?.working).toEqual(d.people.flatMap((p, i) => (p.workStatus === 'working' ? [i] : [])))
  })

  it('an all-retired household gets no stop-year lever, and no deposits lever', () => {
    const offers = railOffers(DEV_SEEDS.retired, undefined)
    expect(offers.stop).toBeUndefined()
    expect(offers.deposits).toEqual([])
  })

  it('deposits only on a working owner’s accounts; claim ages only where the claim is not yet in effect', () => {
    const d: ScenarioDraft = {
      ...DEV_SEEDS.dip,
      people: [
        { ...DEV_SEEDS.dip.people[0], workStatus: 'working', currentAge: 60, socialSecurityClaimAge: 67, pia: 30_000 },
        { ...DEV_SEEDS.dip.people[1], workStatus: 'retired', currentAge: 68, socialSecurityClaimAge: 66, pia: 20_000 },
      ],
    }
    const offers = railOffers(d, undefined)
    expect(offers.deposits.every((o) => d.people[o.ownerIndex]!.workStatus === 'working')).toBe(true)
    expect(offers.claims.map((c) => c.personIndex)).toEqual([0])
  })

  it('the Roth plan needs pre-tax money; the subsidy regime needs a priced marketplace', () => {
    const noPretax: ScenarioDraft = { ...DEV_SEEDS.retired, enteredAccounts: DEV_SEEDS.retired.enteredAccounts.filter((a) => a.kind === 'roth-ira' || a.kind === 'brokerage') }
    expect(railOffers(noPretax, undefined).roth).toBeUndefined()
    expect(railOffers(DEV_SEEDS.retired, undefined).roth).toBeDefined()
    expect(railOffers(DEV_SEEDS.health, undefined).aca).toBeDefined()
    expect(railOffers(DEV_SEEDS.retired, undefined).aca).toBeUndefined()
  })

  it('a budget offers its lines by id; no budget offers the one figure', () => {
    expect(railOffers(DEV_SEEDS.budget, undefined).spending).toMatchObject({ kind: 'lines' })
    expect(railOffers(DEV_SEEDS.retired, undefined).spending).toEqual({ kind: 'total', plan: DEV_SEEDS.retired.annualSpendingReal })
  })
})

describe('the bundle the rail holds', () => {
  it('one lever per target: a second commit replaces, null drops, and the order never matters to a run', () => {
    const a: WhatIfLeverV6 = { kind: 'aca-subsidy', enhanced: true }
    const b: WhatIfLeverV6 = { kind: 'claim-age', personIndex: 0, claimAge: 68 }
    const b2: WhatIfLeverV6 = { kind: 'claim-age', personIndex: 0, claimAge: 70 }
    let bundle = withLever([], 'aca-subsidy', a)
    bundle = withLever(bundle, 'claim-age:0', b)
    bundle = withLever(bundle, 'claim-age:0', b2)
    expect(bundle).toEqual([a, b2])
    expect(withLever(bundle, 'aca-subsidy', null)).toEqual([b2])
    expect(kindsOf([b2, a])).toEqual(['claim-age', 'aca-subsidy'])
  })

  it('the recommendation’s bundle is the record’s own order and Roth plan; a record saved before version 6 has none', () => {
    const rec = (action: SavedRecommendationV3['action']) => ({ action }) as unknown as SavedRecommendationV3
    const plan = { annualAmountReal: 30_000, startYearOffset: 1, years: 4 }
    expect(recommendationBundle(rec({ candidateId: 'x', policy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'], rothConversion: { kind: 'plan', plan } }))).toEqual([
      { kind: 'withdrawal-order', policy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'] },
      { kind: 'roth', conversion: { kind: 'plan', plan } },
    ])
    expect(recommendationBundle(rec({ candidateId: 'x', policy: 'bracket-fill', rothConversion: { kind: 'none' } }))).toEqual([
      { kind: 'withdrawal-order', policy: 'bracket-fill' },
      { kind: 'roth', conversion: { kind: 'none' } },
    ])
    expect(recommendationBundle(rec({ candidateId: 'x', policy: 'bracket-fill' }))).toBeNull()
  })

  it('the stop-year words: both earners stop together; one earner by name', () => {
    expect(stopWords(DEV_SEEDS.dip, [0, 1], 2033)).toBe(slots.workbenchRailStopBoth(2033))
    expect(stopWords({ ...DEV_SEEDS.dip, people: [{ ...DEV_SEEDS.dip.people[0], name: 'Sam' }, DEV_SEEDS.dip.people[1]] }, [0], 2033)).toBe(slots.workbenchRailStopOne('Sam', false, 2033))
  })

  it('every refusal has its own words', () => {
    const kinds = [
      { kind: 'duplicate-target', lever: 'roth', target: 'household' },
      { kind: 'stop-year-all-retired' },
      { kind: 'stop-year-outside-window', calendarYear: 2050, offsetYears: 24 },
      { kind: 'line-gone', lineId: 'x' },
      { kind: 'line-already-there', lineId: 'x' },
      { kind: 'spending-no-budget' },
      { kind: 'spending-total-on-budget' },
      { kind: 'budget-dropped' },
      { kind: 'account-gone', accountId: 'x' },
      { kind: 'deposits-owner-not-working', accountId: 'x' },
      { kind: 'deposits-field-not-on-kind', accountId: 'x', field: 'hsaEmployerAnnual' },
      { kind: 'deposits-over-limit', accountId: 'x', rule: 'contribution-over-ceiling' },
      { kind: 'person-gone', personIndex: 1 },
      { kind: 'claim-age-already-claimed', personIndex: 0 },
      { kind: 'claim-age-in-the-past', personIndex: 0, claimAge: 60 },
      { kind: 'no-seed' },
      { kind: 'futures-differ', field: 'paths' },
    ] as const
    const words = kinds.map((r) => refusalWords(r, 2026))
    expect(new Set(words).size).toBe(kinds.length)
    for (const w of words) expect(w.length).toBeGreaterThan(10)
  })
})

describe('the paired form — each figure one field of its own run’s row (R5), rows paired by year', () => {
  const draft = DEV_SEEDS.dip
  const planRows = [row(0, 1000), row(1, 1000)]
  const whatIfRows = [row(0, 50_000), row(1, 50_000)]

  it('each lever kind pairs its own columns, plus income tax and the year’s end total; a bundle pairs the union', () => {
    const acct = draft.enteredAccounts.find((a) => a.id !== undefined && a.kind === '401k')!
    expect(pairedColumnsFor([{ kind: 'stop-year', calendarYear: 2030 }], draft)).toEqual(['pay-0', 'pay-1', 'income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'spending', op: 'total', annualSpendingReal: 1 }], draft)).toEqual(['spending', 'income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'deposits', accountId: acct.id!, annualContribution: 1 }], draft)).toEqual(['put-in-pretax', 'income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'mix', stockPct: 50, bondPct: 50, cashPct: 0 }], draft)).toEqual(['income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'roth', conversion: { kind: 'none' } }], draft)).toEqual(['to-roth', 'required', 'income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'withdrawal-order', policy: 'bracket-fill' }], draft)).toEqual(['taken-taxable', 'taken-pretax', 'taken-roth', 'income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'claim-age', personIndex: 0, claimAge: 68 }], draft)).toEqual(['social-security', 'income-tax', 'end-total'])
    expect(pairedColumnsFor([{ kind: 'aca-subsidy', enhanced: true }], draft)).toEqual(['marketplace', 'income-tax', 'end-total'])
    expect(
      pairedColumnsFor([{ kind: 'aca-subsidy', enhanced: true }, { kind: 'claim-age', personIndex: 0, claimAge: 68 }], draft),
    ).toEqual(['social-security', 'marketplace', 'income-tax', 'end-total'])
  })

  it('each cell is its own run’s field: the plan’s from the plan’s row, the what-if’s from the what-if’s (a swap reds it)', () => {
    const columns = [...PAIRED_COLUMNS]
    const table = composePaired({ columns, plan: { rows: planRows, meta: META }, whatIf: { rows: whatIfRows, meta: META } })
    table.rows.forEach((r, k) => {
      r.cells.forEach((cell, i) => {
        const id = table.columns[i]!.id
        expect(cell.plan?.value, `${id} plan, t=${k}`).toBe(FIELD[id as HouseholdPairedColumnId](planRows[k]!))
        expect(cell.whatIf?.value, `${id} what-if, t=${k}`).toBe(FIELD[id as HouseholdPairedColumnId](whatIfRows[k]!))
      })
    })
  })

  it('the year-end total counts each inherited IRA (the Act 5 plan’s U12: the engine’s row total, never the four buckets alone)', () => {
    const inherited = (end: number) => [{ start: 0, booked: 0, required: 0, taken: 0, aboveRequired: 0, movedToTaxable: 0, leftTheRun: 0, end, last: false }]
    const plan = [row(0, 0, { inherited: inherited(5_000) })]
    const whatIf = [row(0, 900, { inherited: inherited(9_000) })]
    const cell = composePaired({ columns: ['end-total'], plan: { rows: plan, meta: META }, whatIf: { rows: whatIf, meta: META } }).rows[0]!.cells[0]!
    expect(cell.plan?.value).toBe(FIELD['end-total'](plan[0]!)! + 5_000)
    expect(cell.whatIf?.value).toBe(FIELD['end-total'](whatIf[0]!)! + 9_000)
  })

  it('the year’s end total is the engine’s own sum of the row’s year-end balances', () => {
    const table = composePaired({ columns: ['end-total'], plan: { rows: planRows, meta: META }, whatIf: { rows: whatIfRows, meta: META } })
    expect(table.rows[0]!.cells[0]!.plan?.value).toBe(totalAcrossBuckets(planRows[0]!.end))
  })

  it('a column neither run fills is left out; income tax and the end total always stay', () => {
    const zero = (rows: LedgerYearRow[]) => rows.map((r) => ({ ...r, draw: { ...r.draw, taxable: 0 }, taxPaid: 0 }))
    const table = composePaired({
      columns: ['taken-taxable', 'taken-pretax', 'income-tax', 'end-total'],
      plan: { rows: zero(planRows), meta: META },
      whatIf: { rows: zero(whatIfRows), meta: META },
    })
    expect(table.columns.map((c) => c.id)).toEqual(['taken-pretax', 'income-tax', 'end-total'])
  })

  it('a run that runs out early: its later years print no figure, and the year it runs out is said by run', () => {
    const short = [row(0, 50_000, { ranOut: true })]
    const table = composePaired({ columns: ['spending'], plan: { rows: planRows, meta: META }, whatIf: { rows: short, meta: META } })
    expect(table.rows[0]!.notes).toEqual([slots.workbenchPairRanOut(copy.workbenchRailWhatIfLabel, 2026)])
    expect(table.rows[1]!.cells[0]!.whatIf).toBeNull()
    expect(table.rows[1]!.cells[0]!.plan).not.toBeNull()
  })

  it('the yield stopgap shows under the run whose taxable ledger holds money, named for that run only (c3-adv-hidden-work-4)', () => {
    const withTaxable = whatIfRows.map((r) => ({ ...r, end: { ...r.end, taxable: 40_000 } }))
    const table = composePaired({ columns: ['spending'], plan: { rows: planRows, meta: META }, whatIf: { rows: withTaxable, meta: META } })
    expect(table.yieldLines).toHaveLength(1)
    expect(table.yieldLines[0]!.startsWith(`${copy.workbenchRailWhatIfLabel}: `)).toBe(true)
  })
})

describe('the paired form — an inherited IRA’s own columns (U17)', () => {
  const inheritedOf = (required: number, taken: number) => ({ start: 0, booked: 0, required, taken, aboveRequired: taken - required, movedToTaxable: 0, leftTheRun: 0, end: 0, last: false })
  const named = (accountId: string, name: string) => ({ name, label: name, accountId })
  const A = named('acct-a', 'Alex’s IRA inherited in 2023')
  const B = named('acct-b', 'Alex’s IRA inherited in 2021')

  it('a pace lever brings that account’s required and taken columns, after the household’s own withdrawals, and no other account’s', () => {
    const pace: WhatIfLeverV6 = { kind: 'inherited-pace', accountId: 'acct-a', pace: { kind: 'even' } }
    expect(pairedColumnsFor([pace, { kind: 'withdrawal-order', policy: 'taxable-first' }], DEV_SEEDS.inherited)).toEqual([
      'taken-taxable',
      'taken-pretax',
      'taken-roth',
      'inherited-required:acct-a',
      'inherited-taken:acct-a',
      'income-tax',
      'end-total',
    ])
    // Each id once, in the given order among the inherited pairs, wherever the household's columns came in.
    expect(orderPairedColumns(['end-total', 'inherited-taken:acct-b', 'income-tax', 'spending', 'inherited-taken:acct-b'])).toEqual(['spending', 'inherited-taken:acct-b', 'income-tax', 'end-total'])
  })

  it('each cell is its own run’s entry for that account, found by the account’s id, never by position (the two runs list it apart)', () => {
    const planMeta: TableMeta = { ...META, inherited: [A, B] }
    const whatIfMeta: TableMeta = { ...META, inherited: [B, A] }
    const planRows = [row(0, 1_000, { inherited: [inheritedOf(3_000, 3_000), inheritedOf(0, 15_000)] })]
    const whatIfRows = [row(0, 2_000, { inherited: [inheritedOf(0, 15_000), inheritedOf(3_000, 21_000)] })]
    const table = composePaired({
      columns: ['inherited-required:acct-a', 'inherited-taken:acct-a', 'income-tax', 'end-total'],
      plan: { rows: planRows, meta: planMeta },
      whatIf: { rows: whatIfRows, meta: whatIfMeta },
    })
    expect(table.columns.map((c) => c.header).slice(0, 2)).toEqual([slots.workbenchPairRequiredOf(A.label), slots.workbenchPairTakenFrom(A.label)])
    const [required, taken] = table.rows[0]!.cells
    expect([required!.plan?.value, required!.whatIf?.value]).toEqual([3_000, 3_000])
    expect([taken!.plan?.value, taken!.whatIf?.value]).toEqual([3_000, 21_000])
  })

  it('a column whose account the plan’s run does not name is left out (no header to give it)', () => {
    const table = composePaired({ columns: ['inherited-taken:gone', 'income-tax', 'end-total'], plan: { rows: [row(0, 1)], meta: META }, whatIf: { rows: [row(0, 2)], meta: META } })
    expect(table.columns.map((c) => c.id)).toEqual(['income-tax', 'end-total'])
  })

  it('every lever kind has a target, and two accounts’ or two people’s levers never share one', () => {
    expect(leverTarget({ kind: 'inherited-pace', accountId: 'acct-a', pace: { kind: 'even' } })).toBe('inherited-pace:acct-a')
    expect(leverTarget({ kind: 'inherited-pace', accountId: 'acct-b', pace: { kind: 'even' } })).toBe('inherited-pace:acct-b')
    expect(leverTarget({ kind: 'stop-year', calendarYear: 2030 })).toBe('stop-year')
    expect(leverTarget({ kind: 'mix', stockPct: 60, bondPct: 40, cashPct: 0 })).toBe('mix')
    expect(leverTarget({ kind: 'roth', conversion: { kind: 'none' } })).toBe('roth')
    expect(leverTarget({ kind: 'withdrawal-order', policy: 'proportional' })).toBe('withdrawal-order')
    expect(leverTarget({ kind: 'aca-subsidy', enhanced: true })).toBe('aca-subsidy')
  })
})

describe('the rail’s words never lean (R20)', () => {
  const LEAN = [/\bhelps? you\b/i, /\bcosts? you\b/i, /\bbetter\b/i, /\bworse\b/i, /\bsafer\b/i]
  const leans = (text: string) => LEAN.some((re) => re.test(text))

  it('the ban bites on samples it must catch, and lets the levers’ own words pass', () => {
    for (const s of ['This helps you retire sooner.', 'Stopping later costs you nothing.', 'A better plan.', 'This reads worse.', 'A safer order.']) {
      expect(leans(s), s).toBe(true)
    }
    for (const s of ['Stop a year later.', slots.workbenchRailStopBoth(2033), copy.trayBack]) expect(leans(s), s).toBe(false)
  })

  it('no rail, tray or paired-form string with no measured reading in it leans', () => {
    const statics = (Object.entries(copy) as [string, string][]).filter(([k]) => k.startsWith('workbenchRail') || k.startsWith('workbenchPair') || k.startsWith('tray'))
    expect(statics.length).toBeGreaterThan(60)
    const rendered = [
      slots.workbenchRailStopsPlan(2031),
      slots.workbenchRailStopsPlanNoDate(2036),
      slots.workbenchRailStopsWhatIf(2033),
      slots.workbenchRailStopBoth(2033),
      slots.workbenchRailStopOne('Sam', false, 2033),
      slots.workbenchRailPlanValue('$1 a year'),
      slots.workbenchRailBackName('Spending'),
      slots.workbenchRailMixSum('90'),
      slots.workbenchRailRefusedStopWindow(2026, 2036),
      slots.workbenchPairRanOut('This what-if', 2049),
      slots.workbenchRailRecAction('Pre-tax first', 'none'),
      slots.trayDollars('12,000'),
      slots.trayAge(67),
      slots.trayMixPlan('60'),
    ]
    for (const [k, v] of statics) expect(leans(v), `${k}: "${v}"`).toBe(false)
    for (const v of rendered) expect(leans(v), v).toBe(false)
  })
})
