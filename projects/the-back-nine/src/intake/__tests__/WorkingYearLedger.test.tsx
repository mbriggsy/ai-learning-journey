// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { WorkingYearHeldBackRaise, WorkingYearLedger, WorkingYearLedgerLaterYear, WorkingYearLedgerYear0 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy, slots } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { WorkingYearLedgerPicture, WorkingYearLedgerUnknown, laterLines } from '../WorkingYearLedger'
import { workingYearLedgerForRun } from '../intakeMap'
import { confirmedWorkingYearCost } from '../workingYearQuote'
import { formatMoney } from '../fields'

/**
 * The money picture's face (`docs/plans/features/working-year-pay-check-build-spec.md` R16, KTD12, U8) over
 * HAND-BUILT pictures — the component computes nothing, so every branch of its wording is reachable
 * without an engine run; the one real-seed arm proves it shows the producer's dollars as they are.
 * Assertions read TEXT only (color stripped): the groups, the minus signs, the bottom line's word and sign.
 */

afterEach(cleanup)

const amt = (dollars: number) => ({ dollars, exact: dollars })

/** What the run does with year 0's held-back months (the schedule's crediting rule), by reason. */
const NO_RAISE: WorkingYearHeldBackRaise = { credited: false, untilBirthMonth: false, pastFullRetirementAge: false }
const raise = (over: Partial<WorkingYearHeldBackRaise>): WorkingYearHeldBackRaise => ({ ...NO_RAISE, ...over })

const year0 = (over: Partial<WorkingYearLedgerYear0> = {}): WorkingYearLedgerYear0 => ({
  calendarYear: 2026,
  comingIn: { pay: amt(60_000), socialSecurity: amt(0), otherIncome: amt(0) },
  socialSecurityHeldBack: amt(0),
  withheldBasis: 'law',
  heldBackRaise: NO_RAISE,
  goingOut: { payrollTax: amt(4_590), taxOnOutsideIncome: amt(1_200), ownDeposits: amt(6_000), workingYearCost: amt(50_000) },
  taxOnOutsideIncomeState: amt(0),
  bottomLine: -1_790,
  cash: -1_790,
  alsoFromSavings: { medicarePremiums: amt(0), medicareSurcharge: amt(0), medicareExtras: amt(0) },
  savingsTaxLine: true,
  ...over,
})

const later = (yearsIn: number, bottomLine: number, events: WorkingYearLedgerLaterYear['events'], over: Partial<WorkingYearLedgerLaterYear> = {}): WorkingYearLedgerLaterYear => ({
  yearsIn,
  calendarYear: 2026 + yearsIn,
  events,
  bottomLine,
  cash: bottomLine,
  withheldBasis: 'law',
  ...over,
})

const draft = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => ({
  ...DEV_SEEDS.date,
  people: [{ ...DEV_SEEDS.date.people[0], name: 'Alex' }, { ...DEV_SEEDS.date.people[1], name: 'Sam' }],
  workingYearCost: { kind: 'entered', amountReal: 50_000, entryPeriod: 'year', stateTaxReading: 'unpriced' },
  ...over,
})

const renderPicture = (ledger: WorkingYearLedger, d: ScenarioDraft = draft(), headingLevel: 3 | 4 = 3, aged = false) =>
  render(<WorkingYearLedgerPicture ledger={ledger} draft={d} headingLevel={headingLevel} aged={aged} />)

/** The `<dd>` value beside a `<dt>` label. */
const valueOf = (label: string) => {
  const dt = screen.getByText(label, { selector: 'dt' })
  return dt.parentElement?.querySelector('.wy-row__value')?.textContent
}

describe('the money picture — year 0 (R16)', () => {
  it('groups the lines under legends that each say "a year", every outflow with a minus sign, the bottom line with a word AND a sign', () => {
    renderPicture({ year0: year0(), laterYears: [] })
    for (const legend of [copy.workingLedgerComingIn, copy.workingLedgerGoingOut, copy.workingLedgerBottomLine]) {
      expect(screen.getByRole('heading', { level: 3, name: legend })).toBeInTheDocument()
      expect(legend).toMatch(/a year$/)
    }
    expect(valueOf(copy.workingLedgerPay)).toBe('$60,000')
    expect(valueOf(copy.workingLedgerPayrollTax)).toBe('−$4,590')
    expect(valueOf(copy.workingLedgerIncomeTaxFederal)).toBe('−$1,200')
    expect(valueOf(copy.workingLedgerDeposits)).toBe('−$6,000')
    expect(valueOf(copy.workingLedgerCost)).toBe('−$50,000')
    expect(valueOf(copy.workingLedgerShort)).toBe('−$1,790')
    expect(screen.getByText(copy.workingLedgerShortNote)).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerSavingsTax)).toBeInTheDocument()
  })

  it('shows only the NONZERO lines — no Social Security, other income or savings group when they are $0', () => {
    renderPicture({ year0: year0(), laterYears: [] })
    expect(screen.queryByText(copy.workingLedgerSocialSecurity)).toBeNull()
    expect(screen.queryByText(copy.workingLedgerOtherIncome)).toBeNull()
    expect(screen.queryByRole('heading', { name: copy.workingLedgerAlsoFromSavings })).toBeNull()
    expect(screen.queryByRole('heading', { name: copy.workingLedgerLaterHeading })).toBeNull()
  })

  it('a year left over reads the word and the figure, with the left-over note; at exactly $0 there is no note', () => {
    renderPicture({ year0: year0({ bottomLine: 2_210, cash: 2_210, savingsTaxLine: false }), laterYears: [] })
    expect(valueOf(copy.workingLedgerLeftOver)).toBe('$2,210')
    expect(screen.getByText(copy.workingLedgerLeftOverNote)).toBeInTheDocument()
    expect(screen.queryByText(copy.workingLedgerSavingsTax)).toBeNull()
    cleanup()
    renderPicture({ year0: year0({ bottomLine: 0, cash: 0 }), laterYears: [] })
    expect(valueOf(copy.workingLedgerLeftOver)).toBe('$0')
    expect(screen.queryByText(copy.workingLedgerLeftOverNote)).toBeNull()
  })

  it('the Social Security row shows what is PAID and names what the test held back inside the row — never in the sum', () => {
    renderPicture({
      year0: year0({
        comingIn: { pay: amt(60_000), socialSecurity: amt(8_597), otherIncome: amt(0) },
        socialSecurityHeldBack: amt(9_763),
        heldBackRaise: raise({ credited: true }),
      }),
      laterYears: [],
    })
    expect(valueOf(copy.workingLedgerSocialSecurity)).toBe('$8,597')
    const row = screen.getByText(copy.workingLedgerSocialSecurity, { selector: 'dt' }).parentElement!
    expect(within(row).getByText(slots.workingLedgerSsHeldBack('9,763'))).toBeInTheDocument()
    expect(within(row).getByText(copy.workingLedgerHeldBackNote)).toBeInTheDocument()
  })

  // The raise words say only what the run does with the held-back months (the earnings-test schedule's
  // own crediting rule): every month credited reads the one sentence; otherwise each reason, in order,
  // then "the rest" for any it credits.
  it.each([
    ['the year someone reaches full retirement age (the stopgap)', raise({ untilBirthMonth: true }), [copy.workingLedgerHeldBackNoteUntilBirthMonth]],
    ['someone past full retirement age', raise({ pastFullRetirementAge: true }), [copy.workingLedgerHeldBackNotePastFra]],
    [
      'a younger worker’s own months beside a spouse past it',
      raise({ credited: true, pastFullRetirementAge: true }),
      [copy.workingLedgerHeldBackNotePastFra, copy.workingLedgerHeldBackNoteRest],
    ],
    [
      'a younger worker’s own months beside a spouse in that year',
      raise({ credited: true, untilBirthMonth: true }),
      [copy.workingLedgerHeldBackNoteUntilBirthMonth, copy.workingLedgerHeldBackNoteRest],
    ],
    [
      'all three',
      raise({ credited: true, untilBirthMonth: true, pastFullRetirementAge: true }),
      [copy.workingLedgerHeldBackNoteUntilBirthMonth, copy.workingLedgerHeldBackNotePastFra, copy.workingLedgerHeldBackNoteRest],
    ],
  ] as const)('held back where the run credits some months none — %s — never claims the raise for them', (_name, heldBackRaise, lines) => {
    renderPicture({ year0: year0({ socialSecurityHeldBack: amt(2_760), heldBackRaise }), laterYears: [] })
    const row = screen.getByText(copy.workingLedgerSocialSecurity, { selector: 'dt' }).parentElement!
    const details = [...row.querySelectorAll('.wy-row__detail')].map((d) => d.textContent)
    expect(details).toEqual([slots.workingLedgerSsHeldBack('2,760'), ...lines])
    expect(details).not.toContain(copy.workingLedgerHeldBackNote)
  })

  it('a benefit held back IN FULL still shows its row ($0 paid) with the held-back words', () => {
    renderPicture({ year0: year0({ socialSecurityHeldBack: amt(15_120) }), laterYears: [] })
    expect(valueOf(copy.workingLedgerSocialSecurity)).toBe('$0')
    expect(screen.getByText(slots.workingLedgerSsHeldBack('15,120'))).toBeInTheDocument()
  })

  it('the full-retirement-age year carries the stopgap words (K10), and never the raise the stopgap does not count', () => {
    renderPicture({
      year0: year0({
        socialSecurityHeldBack: amt(780),
        withheldBasis: 'fraYearAtMost',
        heldBackRaise: raise({ untilBirthMonth: true }),
        comingIn: { pay: amt(60_000), socialSecurity: amt(20_000), otherIncome: amt(0) },
      }),
      laterYears: [],
    })
    expect(screen.getByText(slots.workingLedgerSsHeldBackAtMost('780'))).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerHeldBackNoteUntilBirthMonth)).toBeInTheDocument()
    expect(screen.queryByText(copy.workingLedgerHeldBackNote)).toBeNull()
  })

  it('a W given monthly echoes the household’s own unit; a yearly one does not', () => {
    renderPicture(
      { year0: year0(), laterYears: [] },
      draft({ workingYearCost: { kind: 'entered', amountReal: 50_004, entryPeriod: 'month', stateTaxReading: 'unpriced' } }),
    )
    expect(screen.getByText(slots.workingLedgerMonthlyEcho('4,167'))).toBeInTheDocument()
    cleanup()
    renderPicture({ year0: year0(), laterYears: [] })
    expect(document.body.textContent).not.toContain('as you gave it')
    cleanup()
    // A confirmed quote of a monthly spend period echoes too — the step showed it monthly — but never
    // "as you gave it": its unit is the quote's, which a later relabel can move (the b9-3 review).
    renderPicture(
      { year0: year0(), laterYears: [] },
      draft({ annualSpendingReal: 84_000, spendEntryPeriod: 'month', workingYearCost: { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' } }),
    )
    expect(screen.getByText(slots.workingLedgerMonthlyPlain('7,000'))).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('as you gave it')
    cleanup()
    // …and after the spend period is relabelled to a year, no monthly echo at all.
    renderPicture(
      { year0: year0(), laterYears: [] },
      draft({ annualSpendingReal: 84_000, spendEntryPeriod: 'year', workingYearCost: { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' } }),
    )
    expect(document.body.textContent).not.toContain('a month')
  })

  it('a pension in year 0 is its own Coming-in row, so the shown lines still sum to the bottom line (30,000 + 20,000 − 2,295 − 50,000 = −2,295)', () => {
    renderPicture({
      year0: year0({
        comingIn: { pay: amt(30_000), socialSecurity: amt(0), otherIncome: amt(20_000) },
        goingOut: { payrollTax: amt(2_295), taxOnOutsideIncome: amt(0), ownDeposits: amt(0), workingYearCost: amt(50_000) },
        bottomLine: -2_295,
        cash: -2_295,
      }),
      laterYears: [],
    })
    expect(valueOf(copy.workingLedgerOtherIncome)).toBe('$20,000')
    expect(valueOf(copy.workingLedgerShort)).toBe('−$2,295')
  })

  it('a confirmed BUDGET quote never echoes a month, whatever the spend period reads (its unit is the budget’s year)', () => {
    const budget = [{ label: 'Home', category: 'housing' as const, tier: 'essentials' as const, annualAmountReal: 50_000, startYear: 0 }]
    renderPicture(
      { year0: year0(), laterYears: [] },
      draft({ budget, annualSpendingReal: 50_000, spendEntryPeriod: 'month', workingYearCost: { kind: 'confirmed', quotedReal: 50_000, stateTaxReading: 'unpriced' } }),
    )
    expect(document.body.textContent).not.toContain('a month')
  })

  it('Medicare is paid from savings in its own group, never netted, with its income surcharge named inside the row', () => {
    renderPicture({
      year0: year0({ alsoFromSavings: { medicarePremiums: amt(4_100), medicareSurcharge: amt(1_036), medicareExtras: amt(2_928) } }),
      laterYears: [],
    })
    const group = screen.getByRole('heading', { name: copy.workingLedgerAlsoFromSavings }).parentElement!
    expect(within(group).getByText('$4,100')).toBeInTheDocument()
    expect(within(group).getByText(slots.workingLedgerMedicareSurcharge('1,036'))).toBeInTheDocument()
    expect(within(group).getByText('$2,928')).toBeInTheDocument()
    expect(group.textContent).not.toContain('−') // paid from savings, outside the sum: no outflow sign
  })

  it('takes its heading level from the host: h3 in the step, h4 in the panel (ruling 13)', () => {
    renderPicture({ year0: year0(), laterYears: [] }, draft(), 4)
    expect(screen.getByRole('heading', { level: 4, name: copy.workingLedgerComingIn })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('reads the plan clock: an aged plan says it shows its first year as entered', () => {
    renderPicture({ year0: year0(), laterYears: [] }, draft(), 3, true)
    expect(screen.getByText(slots.workingLedgerLeadAged(2026))).toBeInTheDocument()
    cleanup()
    renderPicture({ year0: year0(), laterYears: [] })
    expect(screen.getByText(slots.workingLedgerLead(2026))).toBeInTheDocument()
  })

  it('is never an alarm: no alert, no live region', () => {
    const { container } = renderPicture({ year0: year0(), laterYears: [later(1, -2_000, [{ code: 'stillShort' }])] })
    expect(container.querySelector('[role="alert"], [aria-live], [role="status"]')).toBeNull()
  })
})

describe('the money picture — later working years (KTD12)', () => {
  it('names each year conditionally, with its signed bottom line and its reasons in the household’s names', () => {
    renderPicture({
      year0: year0({ bottomLine: 1_000, cash: 1_000 }),
      laterYears: [
        later(3, 900, [{ code: 'claim', person: 1 }, { code: 'medicareStarts', person: 1 }]),
        later(5, -2_400, [{ code: 'incomeEnds', person: 0 }]),
      ],
    })
    expect(screen.getByText(slots.workingLedgerLaterYear(2029))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterLeftOver('900'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerEventClaim('Sam'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerEventMedicareStarts('Sam'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterYear(2031))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterShort('2,400'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerEventIncomeEnds('Alex'))).toBeInTheDocument()
  })

  it('an unnamed member reads as "you" / "your spouse"', () => {
    const d = draft()
    renderPicture(
      { year0: year0(), laterYears: [later(2, -100, [{ code: 'turns65', person: 0 }, { code: 'catchUpStepDown', person: 1 }])] },
      { ...d, people: [{ ...d.people[0], name: undefined }, { ...d.people[1], name: undefined }] },
    )
    expect(screen.getByText(slots.workingLedgerEventTurns65(copy.workingLedgerWhoYou))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerEventCatchUpStepDown(copy.workingLedgerWhoSpouse))).toBeInTheDocument()
  })

  it('collapses a run of short years no event explains into ONE line naming the first year’s cause', () => {
    renderPicture({
      year0: year0({ bottomLine: 500, cash: 500 }),
      laterYears: [
        later(4, -3_100, [{ code: 'incomeEnds', person: 1 }]),
        later(5, -3_300, [{ code: 'stillShort' }]),
        later(6, -3_400, [{ code: 'stillShort' }]),
        later(7, -3_400, [{ code: 'stillShort' }]),
      ],
    })
    expect(screen.getByText(slots.workingLedgerLaterRun(2030, 2033))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterShortRange('3,100', '3,400'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerEventIncomeEnds('Sam'))).toBeInTheDocument()
    expect(screen.queryByText(slots.workingLedgerLaterYear(2031))).toBeNull()
  })

  it('a run that continues a short year 0 names year 0 as its cause, and equal years read one figure', () => {
    renderPicture({
      year0: year0({ bottomLine: -1_000, cash: -1_000 }),
      laterYears: [later(1, -1_000, [{ code: 'stillShort' }]), later(2, -1_000, [{ code: 'stillShort' }])],
    })
    expect(screen.getByText(slots.workingLedgerLaterRun(2027, 2028))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterShortEach('1,000'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerStillShortSince(2026))).toBeInTheDocument()
  })

  it('a short year no event explains, after a year that was not short, reads the erosion line', () => {
    renderPicture({ year0: year0({ bottomLine: 10, cash: 10 }), laterYears: [later(6, -40, [{ code: 'erosion' }])] })
    expect(screen.getByText(copy.workingLedgerErosion)).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterShort('40'))).toBeInTheDocument()
  })

  it('the household-wide reasons and the full-retirement-age stopgap read in plain words', () => {
    renderPicture({
      year0: year0(),
      laterYears: [
        later(1, -10, [{ code: 'stateRateStep' }]),
        later(3, -20, [{ code: 'seniorBonusSunset' }]),
        later(4, -30, [{ code: 'earningsTestStep' }], { withheldBasis: 'fraYearAtMost' }),
      ],
    })
    expect(screen.getByText(copy.workingLedgerEventStateRate)).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerEventSeniorBonusEnds)).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerEventEarningsTest)).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerLaterAtMost)).toBeInTheDocument()
  })

  it('laterLines: a stillShort year joins the line before it only when CONSECUTIVE and short', () => {
    const lines = laterLines([
      later(1, -5, [{ code: 'claim', person: 0 }]),
      later(2, -5, [{ code: 'stillShort' }]),
      later(4, 7, [{ code: 'turns65', person: 1 }]),
      later(5, -1, [{ code: 'erosion' }]),
      later(6, -2, [{ code: 'stillShort' }]),
      // Never after a year that was not short, and never across a gap (the producer emits neither; the
      // join rule still holds on its own).
      later(7, 3, [{ code: 'turns65', person: 0 }]),
      later(8, -2, [{ code: 'stillShort' }]),
      later(10, -2, [{ code: 'stillShort' }]),
    ])
    expect(lines.map((l) => (l.kind === 'year' ? `y${l.year.yearsIn}` : `r${l.years.map((y) => y.yearsIn).join('-')}`))).toEqual([
      'r1-2',
      'y4',
      'r5-6',
      'y7',
      'r8',
      'r10',
    ])
  })

  it('a named later year at exactly $0 reads left over $0, never short', () => {
    renderPicture({ year0: year0(), laterYears: [later(2, 0, [{ code: 'claim', person: 0 }])] })
    expect(screen.getByText(slots.workingLedgerLaterLeftOver('0'))).toBeInTheDocument()
    expect(screen.queryByText(slots.workingLedgerLaterShort('0'))).toBeNull()
  })

  it('a single short year right after a short year 0 reads ITS OWN shortfall, and a run through the full-retirement-age year keeps the at-most words', () => {
    renderPicture({
      year0: year0(),
      laterYears: [
        later(1, -3_100, [{ code: 'stillShort' }]),
        later(3, -900, [{ code: 'earningsTestStep' }], { withheldBasis: 'fraYearAtMost' }),
        later(4, -900, [{ code: 'stillShort' }]),
      ],
    })
    expect(screen.getByText(slots.workingLedgerLaterYear(2027))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterShort('3,100'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLaterRun(2029, 2030))).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerLaterAtMost)).toBeInTheDocument()
  })
})

describe('the money picture — the engine’s own figures (a real seed)', () => {
  it('shows `dateshort`’s year 0 exactly as the producer rounded it, and the lines sum to the bottom line', () => {
    const d = DEV_SEEDS.dateshort
    const ledger = workingYearLedgerForRun(d)
    if (ledger === 'unknown') throw new Error('[test setup] dateshort must draw a picture')
    renderPicture(ledger, d)
    const y = ledger.year0
    const inSum = y.comingIn.pay.dollars + y.comingIn.socialSecurity.dollars + y.comingIn.otherIncome.dollars
    const outSum =
      y.goingOut.payrollTax.dollars + y.goingOut.taxOnOutsideIncome.dollars + y.goingOut.ownDeposits.dollars + y.goingOut.workingYearCost.dollars
    expect(inSum - outSum).toBe(y.bottomLine)
    expect(y.bottomLine).toBeLessThan(0) // the short witness
    expect(valueOf(copy.workingLedgerShort)).toBe(slots.workingLedgerOutflow(formatMoney(-y.bottomLine)))
    expect(valueOf(copy.workingLedgerPay)).toBe(slots.workingLedgerAmount(formatMoney(y.comingIn.pay.dollars)))
    expect(y.socialSecurityHeldBack.dollars).toBeGreaterThan(0) // the early claimant who works
    expect(screen.getByText(slots.workingLedgerSsHeldBack(formatMoney(y.socialSecurityHeldBack.dollars)))).toBeInTheDocument()
    // Alex (63, claimed at 62) is years from full retirement age, so every month held back is credited.
    expect(y.heldBackRaise).toEqual({ credited: true, untilBirthMonth: false, pastFullRetirementAge: false })
    expect(screen.getByText(copy.workingLedgerHeldBackNote)).toBeInTheDocument()
  })

  it('the tax line says what it holds, read off the RUN’s state slice: "federal and state" only where a state tax was charged', () => {
    // `date`'s household (Alex working, $150,000), W confirmed under each state's own reading.
    const ledgerFor = (retirementState: ScenarioDraft['retirementState']) => {
      const base: ScenarioDraft = { ...DEV_SEEDS.date, ...(retirementState === undefined ? {} : { retirementState }) }
      const w = confirmedWorkingYearCost(base)
      if (w === null) throw new Error('[test setup] the quote is $0')
      const d: ScenarioDraft = { ...base, workingYearCost: w }
      const ledger = workingYearLedgerForRun(d)
      if (ledger === 'unknown') throw new Error(`[test setup] ${String(retirementState)} must draw a picture`)
      return { d, ledger }
    }
    const inWLines = [copy.workingLedgerIncomeTaxStateInW, copy.workingLedgerIncomeTaxStatePayInW]
    const cases = [
      // NC taxes everything in the run (agi-derived): a state slice, nothing left for W.
      { state: 'NC', label: copy.workingLedgerIncomeTaxFederalState, slice: true, inW: null },
      // PA: the run prices its tax on the $30,000 of investment income (the slice), never on pay — the
      // W step asked for that, so the line says where it went.
      { state: 'PA', label: copy.workingLedgerIncomeTaxFederalState, slice: true, inW: copy.workingLedgerIncomeTaxStatePayInW },
      // No state set (unpriced): federal only, and the tax on pay — if the state has one — went to W.
      { state: undefined, label: copy.workingLedgerIncomeTaxFederal, slice: false, inW: copy.workingLedgerIncomeTaxStateInW },
      // FL has no income tax: federal only, nothing to fold anywhere.
      { state: 'FL', label: copy.workingLedgerIncomeTaxFederal, slice: false, inW: null },
    ] as const
    for (const c of cases) {
      const { d, ledger } = ledgerFor(c.state)
      expect(ledger.year0.taxOnOutsideIncomeState.dollars > 0, `${String(c.state)}: the run's state slice`).toBe(c.slice)
      renderPicture(ledger, d)
      const row = screen.getByText(c.label, { selector: 'dt' }).parentElement!
      for (const line of inWLines) {
        if (line === c.inW) expect(within(row).getByText(line), `${String(c.state)}`).toBeInTheDocument()
        else expect(within(row).queryByText(line), `${String(c.state)}`).toBeNull()
      }
      cleanup()
    }
  })

  it('the tax line names the working-year investment income its figure includes — the RUN’s figure, $30,000 for `date`', () => {
    const w = confirmedWorkingYearCost(DEV_SEEDS.date)
    if (w === null) throw new Error('[test setup] date quotes $0')
    const d: ScenarioDraft = { ...DEV_SEEDS.date, workingYearCost: w }
    expect(d.health.workingYearInvestmentByPerson, 'the fixture: Alex works with $30,000 of it').toEqual([30_000, 0])
    const ledger = workingYearLedgerForRun(d)
    if (ledger === 'unknown') throw new Error('[test setup] date must draw a picture')
    expect(ledger.year0.goingOut.taxOnOutsideIncome.dollars, 'the line shows').toBeGreaterThan(0)
    renderPicture(ledger, d)
    const row = screen.getByText(copy.workingLedgerIncomeTaxFederal, { selector: 'dt' }).parentElement!
    expect(within(row).getByText(slots.workingLedgerIncomeTaxInvestment('30,000'))).toBeInTheDocument()
    cleanup()
    // A figure the draft holds for a member who no longer works never reaches the run, so the line
    // never names it: the run's own vector, not the draft's.
    const stopped: ScenarioDraft = {
      ...d,
      health: { ...d.health, workingYearInvestmentByPerson: [0, 5_000] },
    }
    const again = workingYearLedgerForRun(stopped)
    if (again === 'unknown') throw new Error('[test setup] the variant must draw a picture')
    renderPicture(again, stopped)
    expect(document.body.textContent).not.toContain('investment income you entered')
  })
})

describe('the money picture — the unknown face (U8)', () => {
  it('names a fact this version cannot price in the strip’s own words, with no list and no zeros', () => {
    const { container } = render(<WorkingYearLedgerUnknown draft={DEV_SEEDS.datesolo} echoStrip />)
    // Nothing the household can add draws a picture: no "yet", and the strip's own closing line.
    expect(screen.getByText(copy.workingLedgerUnknownLeadFinal)).toBeInTheDocument()
    expect(screen.getByText(`${copy.answerCannotPrice} ${copy.employerCoverageUnpriced}`)).toBeInTheDocument()
    expect(screen.getByText(copy.answerCannotPriceTail)).toBeInTheDocument()
    expect(screen.queryByText(copy.workingLedgerUnknownSeeStrip)).toBeNull()
    expect(container.querySelector('dl')).toBeNull()
  })

  it('names facts still to enter apart from a refusal', () => {
    const d = { ...DEV_SEEDS.date, annualSpendingReal: undefined }
    render(<WorkingYearLedgerUnknown draft={d} echoStrip />)
    // Every blocker is one the household can still enter: the lead keeps its "yet".
    expect(screen.getByText(copy.workingLedgerUnknownLead)).toBeInTheDocument()
    expect(screen.getByText(`${copy.answerStillNeeded} ${copy.spendLabel}`, { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(copy.workingLedgerUnknownRefused)).toBeNull()
  })

  it('beside the strip (echoStrip false), points at it instead of printing its lines again — on both kinds of blocker', () => {
    for (const [d, lead] of [
      [DEV_SEEDS.datesolo, copy.workingLedgerUnknownLeadFinal],
      [{ ...DEV_SEEDS.date, annualSpendingReal: undefined }, copy.workingLedgerUnknownLead],
    ] as const) {
      const { container } = render(<WorkingYearLedgerUnknown draft={d} echoStrip={false} />)
      expect(screen.getByText(lead)).toBeInTheDocument()
      expect(screen.getByText(copy.workingLedgerUnknownSeeStrip)).toBeInTheDocument()
      expect(container.textContent).not.toContain(copy.answerCannotPrice)
      expect(container.textContent).not.toContain(copy.answerStillNeeded)
      expect(container.textContent).not.toContain(copy.answerCannotPriceTail)
      cleanup()
    }
  })

  it('with nothing missing (the engine refused the run), says so plainly — and points nowhere, from either host', () => {
    for (const echoStrip of [true, false]) {
      render(<WorkingYearLedgerUnknown draft={DEV_SEEDS.date} echoStrip={echoStrip} />)
      expect(screen.getByText(copy.workingLedgerUnknownRefused)).toBeInTheDocument()
      // The strip names nothing for a refused run, so there is nothing at the top to point at.
      expect(screen.queryByText(copy.workingLedgerUnknownSeeStrip)).toBeNull()
      cleanup()
    }
  })
})
