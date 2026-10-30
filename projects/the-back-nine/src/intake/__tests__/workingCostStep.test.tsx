// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { intakeSteps } from '../questions'
import { IntakeFlow } from '../flow'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { BudgetLineItem, WorkingYearCostV3 } from '@shared/model'
import { copy, slots } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { deriveResultSave } from '@ui/resultSave'
import { scenarioFromDraft } from '@ui/scenarioFromDraft'
import { isDateRoute, workingYearLedgerForRun } from '../intakeMap'
import { fieldErrorId } from '../FieldError'
import { formatMoney } from '../fields'
import { WORKING_COST_ANSWER_FIELD } from '../sanity'

/**
 * The pay check's W step and money-picture step (`docs/plans/features/working-year-pay-check-build-spec.md`
 * U8; KTD3, KTD5, KTD17, KTD21), driven through the REAL flow and model — the wiring the app mounts. The
 * flow is handed the tail of the real step list (other income → W → the picture), so every step is the
 * one `intakeSteps` builds for the live draft. Every expected figure is typed by hand.
 */

const nullClient: EngineClient = {
  runningInWorker: true,
  reset: () => {},
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSpendSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestSpendEpoch: async () => {},
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function modelWith(draft: ScenarioDraft): MemoryModel {
  const m = createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
  m.update(() => draft)
  return m
}

const TAIL = new Set(['other-income', 'working-cost', 'working-ledger'])

/** The app's own shape — steps derived from the live draft — cut to the tail of the walk. */
function Harness({ model, from = 'working-cost' }: { model: MemoryModel; from?: string }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(() => {
    const all = intakeSteps(snap.draft).filter((s) => TAIL.has(s.id))
    return all.slice(all.findIndex((s) => s.id === from))
  }, [snap.draft, from])
  return <IntakeFlow steps={steps} model={model} />
}

afterEach(cleanup)

const heading = () => screen.getByRole('heading', { level: 2 }).textContent
const next = () => fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
const back = () => fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
const w = (m: MemoryModel) => m.getSnapshot().draft.workingYearCost
const typeFigure = (value: string) => {
  const input = screen.getByLabelText(copy.workingCostAmountLabel)
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}
const pick = (labelKey: 'workingCostYes' | 'workingCostDifferent' | 'periodMonth' | 'periodYear') =>
  fireEvent.click(screen.getByRole('radio', { name: copy[labelKey] }))

/** `date`'s household with no W — quote $84,000 a year, shown as $7,000 a month. */
const dateNoW = (): ScenarioDraft => {
  const { workingYearCost: _none, ...rest } = DEV_SEEDS.date
  return rest
}
const confirmed = (quotedReal: number, stateTaxReading: WorkingYearCostV3['stateTaxReading'] = 'unpriced'): WorkingYearCostV3 => ({
  kind: 'confirmed',
  quotedReal,
  stateTaxReading,
})

describe('the pay check’s steps in the sequence (KTD17)', () => {
  it('both steps close the DATE route, after the other-income loop, and never appear on the all-retired route', () => {
    const ids = intakeSteps(dateNoW()).map((s) => s.id)
    expect(ids.slice(-3)).toEqual(['other-income', 'working-cost', 'working-ledger'])
    const retired = intakeSteps(DEV_SEEDS.retired).map((s) => s.id)
    expect(retired).not.toContain('working-cost')
    expect(retired).not.toContain('working-ledger')
    expect(retired.at(-1)).toBe('other-income')
  })

  it('the step count never moves while the household answers W (no draft gate on either step)', () => {
    const before = intakeSteps(dateNoW()).length
    expect(intakeSteps({ ...dateNoW(), workingYearCost: confirmed(84_000) }).length).toBe(before)
    expect(intakeSteps({ ...dateNoW(), workingYearCost: confirmed(1) }).length).toBe(before)
  })

  it('flipping every worker to retired removes both steps', () => {
    const d = dateNoW()
    const allRetired: ScenarioDraft = {
      ...d,
      people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 58 }, d.people[1]],
    }
    expect(intakeSteps(allRetired).map((s) => s.id)).not.toContain('working-cost')
  })
})

describe('the W step — the quote, the gate and "yes" (KTD3, KTD5)', () => {
  it('quotes the spending figure in its own period, above a static legend, with no answer checked', () => {
    render(<Harness model={modelWith(dateNoW())} />)
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByText(slots.workingCostQuoteMonthly('7,000', '84,000'))).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: copy.workingCostLegend })
    expect(within(group).getByRole('radio', { name: copy.workingCostYes })).not.toBeChecked()
    expect(within(group).getByRole('radio', { name: copy.workingCostDifferent })).not.toBeChecked()
    // The legend never carries the figure (KTD17).
    expect(copy.workingCostLegend).not.toMatch(/\d/)
  })

  it('no alert before the first Continue; a blocked Continue shows the gate on the fork, with aria-invalid', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    expect(screen.queryByRole('alert')).toBeNull()
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading) // blocked
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    const group = screen.getByRole('radiogroup', { name: copy.workingCostLegend })
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveAttribute('aria-required', 'true')
    const described = (group.getAttribute('aria-describedby') ?? '').split(' ')
    expect(described).toContain(fieldErrorId(WORKING_COST_ANSWER_FIELD))
    // …and the figure the "yes" would keep: a forms-mode reader hears the quote, not a bare question.
    expect(described.map((i) => document.getElementById(i)?.textContent)).toContain(slots.workingCostQuoteMonthly('7,000', '84,000'))
  })

  it('"yes" stores the quote as a confirmed answer with its reading, clears the gate and advances', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    next() // blocked
    pick('workingCostYes')
    expect(w(m)).toEqual(confirmed(84_000))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('radiogroup', { name: copy.workingCostLegend })).not.toHaveAttribute('aria-invalid')
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('the help is two lists — what to count, what to leave out — plus the state sentence for the DRAFT’s reading (KTD18)', () => {
    const cases: readonly [ScenarioDraft['retirementState'], string][] = [
      [undefined, copy.workingCostHelpStateUnpriced],
      ['elsewhere', copy.workingCostHelpStateUnpriced],
      ['NC', copy.workingCostHelpStateAgiDerived],
      ['PA', copy.workingCostHelpStateClassBased],
      ['FL', copy.workingCostHelpStateNone],
    ]
    const count = [
      copy.workingCostHelpCountSpend,
      copy.workingCostHelpCountPremiums,
      copy.workingCostHelpCountMedicare,
      copy.workingCostHelpCountLocalTax,
      copy.workingCostHelpCountStateDeduction,
    ]
    const leaveOut = [
      copy.workingCostHelpLeaveOutPayrollTax,
      copy.workingCostHelpLeaveOutIncomeTax,
      copy.workingCostHelpLeaveOutSavings,
      copy.workingCostHelpLeaveOutMedicare,
    ]
    for (const [state, sentence] of cases) {
      const d = { ...dateNoW(), ...(state === undefined ? {} : { retirementState: state }) }
      const { container } = render(<Harness model={modelWith(d)} />)
      // Each list sits right under its own lead, its items in order — never one run-on paragraph.
      const lists = [...container.querySelectorAll('.working-cost__help')]
      expect(lists.map((h) => h.querySelector('p')?.textContent)).toEqual([
        copy.workingCostHelpCountLead,
        copy.workingCostHelpLeaveOutLead,
      ])
      expect(lists.map((h) => within(h as HTMLElement).getAllByRole('listitem').map((li) => li.textContent))).toEqual([
        count,
        leaveOut,
      ])
      expect(screen.getByText(sentence)).toBeInTheDocument()
      cleanup()
    }
    // R1's items, named in every household's help — each in the list it belongs to.
    const counted = count.join(' | ')
    for (const named of [
      'what you spend',
      'health premiums',
      'taken from pay',
      'buys on their own',
      'someone still working',
      'anyone not on Medicare yet',
      'city wage tax or earned-income tax',
      'state disability or family-leave',
      // the stopgap for a worker on Medicare (the run charges no Medicare until the stop), with WHOSE
      // stop named — "once work stops" read as the household's, false for a retired spouse
      'Medicare premiums of anyone on Medicare who is still working',
      'only once they stop working',
    ]) {
      expect(counted, named).toContain(named)
    }
    const left = leaveOut.join(' | ')
    for (const named of [
      'federal Social Security and Medicare tax',
      'federal income tax',
      'what you put into savings',
      'Medicare premiums for anyone who has stopped working',
    ]) {
      expect(left, named).toContain(named)
    }
  })

  it('a state sentence that asks for the tax on pay says ADD it — never "keep", which reads as already counted', () => {
    // Tax on pay is taken from pay, so no spending figure holds it: "keep … inside this figure" read as
    // a Yes-able figure that already carried it (the b9-5 Caddie walk), rosy in any state taxing pay.
    for (const sentence of [copy.workingCostHelpStateUnpriced, copy.workingCostHelpStateClassBased]) {
      expect(sentence).toMatch(/\badd\b/i)
      expect(sentence).not.toMatch(/\bkeep\b/i)
    }
  })

  it('a budget quotes its first-year lines plus out-of-pocket medical, yearly, and names what it left out (three, then the rest)', () => {
    const line = (label: string, annualAmountReal: number, over: Partial<BudgetLineItem> = {}): BudgetLineItem => ({
      label,
      category: 'other',
      tier: 'discretionary',
      annualAmountReal,
      startYear: 0,
      ...over,
    })
    const budget: BudgetLineItem[] = [
      line('Home', 30_000, { tier: 'essentials', category: 'housing' }),
      line('Travel', 5_000, { endYear: 3 }),
      line('Boat', 4_000, { startYear: 2 }),
      line('Golf', 3_000, { endYear: 5 }),
      line('Cabin', 2_000, { startYear: 4 }),
      line('Tours', 1_000, { endYear: 2 }),
    ]
    const d: ScenarioDraft = {
      ...dateNoW(),
      budget,
      health: { ...dateNoW().health, oopMedicalAnnual: 6_000 },
      annualSpendingReal: 45_000,
    }
    render(<Harness model={modelWith(d)} />)
    expect(screen.getByText(slots.workingCostQuoteBudgetMedical('36,000', '6,000'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingCostLeftOutMore('Travel, Boat, Golf', 2))).toBeInTheDocument()
  })
})

describe('the W step — a figure of their own (KTD4, KTD17, ruling 10)', () => {
  it('choosing "a different figure" over a held confirmed answer CLEARS the draft’s W, so Continue holds until a figure commits', () => {
    const m = modelWith({ ...dateNoW(), workingYearCost: confirmed(84_000) })
    render(<Harness model={m} />)
    expect(screen.getByRole('radio', { name: copy.workingCostYes })).toBeChecked()
    pick('workingCostDifferent')
    expect(w(m)).toBeUndefined()
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
  })

  it('the untapped period is MONTH: 7,000 stores 84,000 a year and passes; 9,000 asks the unit until it is tapped', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('7000')
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'unpriced' })
    typeFigure('9000')
    expect(w(m)).toMatchObject({ amountReal: 108_000, entryPeriod: 'month' })
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
    // An explicit tap on the period it already shows answers it.
    pick('periodMonth')
    expect(screen.queryByRole('alert')).toBeNull()
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('tapping "each year" re-bases the TYPED digits: 40,000 typed under month is asked, then reads 40,000 a year', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    pick('workingCostDifferent')
    typeFigure('40000')
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
    pick('periodYear')
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 40_000, entryPeriod: 'year' })
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('a figure typed after the period is tapped lands in that period (5,000 a month is 60,000 a year)', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    pick('workingCostDifferent')
    pick('periodMonth')
    typeFigure('5000')
    expect(w(m)).toMatchObject({ amountReal: 60_000, entryPeriod: 'month' })
  })

  it('a restored entered answer never re-asks the unit when its amount is edited (the provenance captured at mount)', () => {
    const m = modelWith({ ...dateNoW(), workingYearCost: { kind: 'entered', amountReal: 96_000, entryPeriod: 'month', stateTaxReading: 'unpriced' } })
    render(<Harness model={m} />)
    expect(screen.getByLabelText(copy.workingCostAmountLabel)).toHaveValue('8,000')
    typeFigure('9000')
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('a hydrated W-ABSENT plan typing 9,000 on its first W is still asked the unit', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    pick('workingCostDifferent')
    typeFigure('9000')
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
  })

  it('an entered $0 blocks with the calm zero message; it never rides into a run', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    pick('workingCostDifferent')
    typeFigure('0')
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 0 })
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostZero)
    expect(screen.getByLabelText(copy.workingCostAmountLabel)).toHaveAttribute('aria-invalid', 'true')
  })

  it('clearing the typed figure clears W (the draft never holds a figure-less answer), and the gate asks again', () => {
    const m = modelWith({ ...dateNoW(), workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced' } })
    render(<Harness model={m} />)
    typeFigure('')
    expect(w(m)).toBeUndefined()
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
  })

  it('a W below the out-of-pocket medical figure runs (never refused) and says so, quoting both figures', () => {
    const d: ScenarioDraft = {
      ...dateNoW(),
      health: { ...dateNoW().health, oopMedicalAnnual: 8_000 },
      workingYearCost: { kind: 'entered', amountReal: 7_999, entryPeriod: 'year', stateTaxReading: 'unpriced' },
    }
    render(<Harness model={modelWith(d)} />)
    expect(screen.getByText(slots.workingCostBelowMedical('7,999', '8,000'))).toBeInTheDocument()
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })
})

describe('the W step — a stale answer (KTD21)', () => {
  it('a confirmed answer whose quote moved opens with NO answer checked and the calm note (role="note") before any tap', () => {
    const m = modelWith(DEV_SEEDS.datecoststale)
    render(<Harness model={m} />)
    expect(screen.getByRole('radio', { name: copy.workingCostYes })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).not.toBeChecked()
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleQuote('84,000', '78,000'))
    expect(screen.queryByRole('alert')).toBeNull()
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading) // a stale answer cannot complete the walk
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    expect(screen.getByRole('note')).toBeInTheDocument() // the note stays a note
    pick('workingCostYes')
    expect(w(m)).toEqual(confirmed(78_000))
    expect(screen.queryByRole('note')).toBeNull()
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('an entered answer whose state reading moved opens prefilled in its own period, and "keep" re-stamps it as it stands', () => {
    const m = modelWith({
      ...dateNoW(),
      retirementState: 'PA',
      workingYearCost: { kind: 'entered', amountReal: 90_000, entryPeriod: 'month', stateTaxReading: 'agi-derived' },
    })
    render(<Harness model={m} />)
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    expect(screen.getByLabelText(copy.workingCostAmountLabel)).toHaveValue('7,500')
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleStateEntered('90,000'))
    // A real tap focuses the button first (jsdom's click does not), and the button unmounts under it.
    const keep = screen.getByRole('button', { name: slots.workingCostKeepMonthly('7,500') })
    keep.focus()
    fireEvent.click(keep)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 90_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
    expect(screen.queryByRole('note')).toBeNull()
    // Focus never falls to the page: it lands on the answer that now stands.
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: copy.workingCostDifferent }))
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('a stale YES keeps its old figure through the same door — yearly, as the household’s own, never asked its unit (ruling 34)', () => {
    // Without the door, keeping $84,000 meant "a different figure", which clears a confirmed answer —
    // unmounting the only place $84,000 is named — then typing it from memory; the easy Yes cut it.
    const m = modelWith(DEV_SEEDS.datecoststale)
    render(<Harness model={m} />)
    const keep = screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })
    expect(screen.getByRole('note')).toContainElement(keep)
    keep.focus()
    fireEvent.click(keep)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced' })
    expect(screen.queryByRole('note')).toBeNull()
    // It now reads as the household's own figure, in the unit the door named.
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    expect(screen.getByLabelText(copy.workingCostAmountLabel)).toHaveValue('84,000')
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: copy.workingCostDifferent }))
    // $84,000 sits above the period rule's floor, but the door said "a year": Continue is never asked it.
    next()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('a stale YES below today’s quote gets NO keep door — a one-tap keep would land W under what the household now spends', () => {
    // Spending rose past the old yes ($84,000 → $96,000 a year): keeping $84,000 is the rosy side, so it is
    // answered through the fork — Yes to today's figure, or a figure typed on purpose.
    const m = modelWith({ ...DEV_SEEDS.datecoststale, annualSpendingReal: 96_000 })
    render(<Harness model={m} />)
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleQuote('84,000', '96,000'))
    expect(screen.queryByRole('button', { name: /^Keep / })).toBeNull()
    pick('workingCostYes')
    expect(w(m)).toEqual(confirmed(96_000))
    // At or above the quote the door is there (its figure equal to today's: a reading-only stale).
    cleanup()
    const equal = modelWith({ ...DEV_SEEDS.datecoststale, annualSpendingReal: 84_000, retirementState: 'FL' })
    render(<Harness model={equal} />)
    expect(screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })).toBeInTheDocument()
  })

  it('after an upstream edit stales W, ARRIVING at the step shows the note and no alert until Continue', () => {
    const m = modelWith({ ...dateNoW(), workingYearCost: confirmed(84_000) })
    render(<Harness model={m} from="other-income" />)
    next() // into W
    next() // through W (fresh) into the picture — W's gate path is now touched
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
    back() // back to W: still fresh, nothing to show
    back() // back to other income
    m.update((d) => ({ ...d, annualSpendingReal: 90_000 })) // the upstream edit
    next() // arrive at W again
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    next()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    // And Back-then-forward arrives fresh again.
    back()
    next()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('the W step — the fork’s own words, read before any Continue (forms mode)', () => {
  const describedTexts = (el: HTMLElement) =>
    (el.getAttribute('aria-describedby') ?? '').split(' ').filter((i) => i !== '').map((i) => document.getElementById(i)?.textContent)

  it('the fork names the figure it offers and says it is required, with no alert yet', () => {
    render(<Harness model={modelWith(dateNoW())} />)
    const group = screen.getByRole('radiogroup', { name: copy.workingCostLegend })
    expect(group).toHaveAttribute('aria-required', 'true')
    expect(within(group).getByText(copy.fieldRequiredMarker)).toBeInTheDocument()
    expect(describedTexts(group)).toEqual([slots.workingCostQuoteMonthly('7,000', '84,000')])
  })

  it('on a stale answer the fork is described by the stale note first, then the quote', () => {
    render(<Harness model={modelWith(DEV_SEEDS.datecoststale)} />)
    const group = screen.getByRole('radiogroup', { name: copy.workingCostLegend })
    expect(describedTexts(group)).toEqual([
      slots.workingCostStaleQuote('84,000', '78,000'),
      slots.workingCostQuoteMonthly('6,500', '78,000'),
    ])
  })
})

describe('the W step — answering forgives the gate (B4 of the Phase B review)', () => {
  it('"a different figure" clears the fork’s alert; the next Continue asks AT the figure, never under the answered fork', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} />)
    next() // blocked at the fork
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    pick('workingCostDifferent')
    const group = screen.getByRole('radiogroup', { name: copy.workingCostLegend })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(group).not.toHaveAttribute('aria-invalid')
    next() // still no figure: blocked again, and the message sits where the household is answering
    expect(heading()).toBe(copy.qWorkingCostHeading)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(copy.errWorkingCostUnanswered)
    expect(alert.closest('.working-cost__figure'), 'the gate message sits at the figure').not.toBeNull()
    expect(group).not.toHaveAttribute('aria-invalid')
    const figure = screen.getByLabelText(copy.workingCostAmountLabel)
    expect(figure).toHaveAttribute('aria-invalid', 'true')
    expect((figure.getAttribute('aria-describedby') ?? '').split(' ')).toContain(fieldErrorId(WORKING_COST_ANSWER_FIELD))
    // Typing is answering too: the first keystroke clears it until the next Continue.
    fireEvent.focus(figure)
    fireEvent.change(figure, { target: { value: '7' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(figure).not.toHaveAttribute('aria-invalid')
  })
})

describe('the W step — a $0 quote (no spending to offer: the figure is the whole question)', () => {
  const noSpend = (): ScenarioDraft => {
    const { annualSpendingReal: _s, ...rest } = dateNoW()
    return rest
  }

  it('no fork and no quote; a blocked Continue says why AT the figure, which carries the gate', () => {
    const m = modelWith(noSpend())
    render(<Harness model={m} />)
    expect(screen.queryByRole('radiogroup', { name: copy.workingCostLegend })).toBeNull()
    expect(screen.queryByText(/Your spending figure is/)).toBeNull()
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    const field = screen.getByLabelText(copy.workingCostAmountLabel)
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect((field.getAttribute('aria-describedby') ?? '').split(' ')).toContain(fieldErrorId(WORKING_COST_ANSWER_FIELD))
    // The first keystroke forgives it; 5,500 a month (under the period floor) then goes on.
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: '5500' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.blur(field)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 66_000, entryPeriod: 'month', stateTaxReading: 'unpriced' })
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })
})

describe('the W step — what leaves by Back (B1 and B2 of the Phase B review)', () => {
  it('a typed $0 never leaves by Back: the draft drops it, so a later route flip still saves', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} from="other-income" />)
    next() // into W
    pick('workingCostDifferent')
    typeFigure('0')
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 0 })
    back()
    expect(heading()).toBe(copy.qOtherIncomeHeading)
    expect(w(m)).toBeUndefined()
    // The household then says the only worker has stopped too: the W step leaves the walk, and the plan
    // still saves (a leftover $0 is refused by the codec, which withdrew Save with nothing said).
    m.update((d) => ({ ...d, people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 58 }, d.people[1]] }))
    const d = m.getSnapshot().draft
    expect(isDateRoute(d)).toBe(false)
    expect(deriveResultSave({ kind: 'unsaved' }, scenarioFromDraft(d))).toEqual({ kind: 'first' })
  })

  it('a figure whose period was never confirmed never leaves by Back either (90,000 under the untapped month)', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} from="other-income" />)
    next()
    pick('workingCostDifferent')
    typeFigure('90000')
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 1_080_000, entryPeriod: 'month' })
    back()
    expect(w(m)).toBeUndefined()
    // Coming back asks afresh: the fork unanswered, no figure held.
    next()
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).not.toBeChecked()
    expect(screen.queryByLabelText(copy.workingCostAmountLabel)).toBeNull()
  })

  it('Back keeps every answer the step’s own Continue would take: a figure under the floor, a tapped unit’s figure, a "yes"', () => {
    const cases: readonly [string, () => void, WorkingYearCostV3][] = [
      ['7,000 under the untapped month', () => { pick('workingCostDifferent'); typeFigure('7000') }, { kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'unpriced' }],
      ['90,000 after tapping "each year"', () => { pick('workingCostDifferent'); pick('periodYear'); typeFigure('90000') }, { kind: 'entered', amountReal: 90_000, entryPeriod: 'year', stateTaxReading: 'unpriced' }],
      ['"yes"', () => pick('workingCostYes'), confirmed(84_000)],
    ]
    for (const [name, answer, expected] of cases) {
      const m = modelWith(dateNoW())
      render(<Harness model={m} from="other-income" />)
      next()
      answer()
      expect(w(m), name).toEqual(expected)
      back()
      expect(w(m), `${name} survives Back`).toEqual(expected)
      cleanup()
    }
  })

  it('a period tap with no figure committed does not outlive the step: back again, 84,000 under the month it shows is asked', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} from="other-income" />)
    next()
    pick('workingCostDifferent')
    pick('periodYear') // said "a year" before typing anything
    back()
    next()
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('84000')
    expect(w(m)).toMatchObject({ amountReal: 1_008_000, entryPeriod: 'month' })
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
  })

  it('a period tap beside a committed figure stands on return: its unit shows, and a retyped figure is not re-asked', () => {
    const m = modelWith(dateNoW())
    render(<Harness model={m} from="other-income" />)
    next()
    pick('workingCostDifferent')
    pick('periodYear')
    typeFigure('90000')
    back()
    next()
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    typeFigure('95000')
    expect(w(m)).toMatchObject({ amountReal: 95_000, entryPeriod: 'year' })
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('arriving by Back over a W that went stale shows the note and no alert, though the gate was met on the way out', () => {
    const m = modelWith({ ...dateNoW(), workingYearCost: confirmed(84_000) })
    render(<Harness model={m} />)
    next() // through W (fresh) into the picture — W's gate path is now touched
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
    m.update((d) => ({ ...d, annualSpendingReal: 90_000 })) // stales W while standing on the picture
    back()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('the W step — a stale entered answer: only a keystroke or a keep answers it (B6 of the Phase B review)', () => {
  // Entered at $7,000 a month under FL (no state income tax); the state answer then moved to PA, whose
  // tax on pay the household now holds inside W (KTD18) — so the answer is stale.
  const staleEntered = (entryPeriod: 'month' | 'year' = 'month'): ScenarioDraft => ({
    ...dateNoW(),
    retirementState: 'PA',
    workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod, stateTaxReading: 'none' },
  })

  it('a pass through the figure with no keystroke (a tab to Continue) leaves it stale; a retype re-stamps it', () => {
    const m = modelWith(staleEntered())
    render(<Harness model={m} />)
    const input = screen.getByLabelText(copy.workingCostAmountLabel)
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(w(m)).toEqual(staleEntered().workingYearCost)
    expect(screen.getByRole('note')).toBeInTheDocument()
    next()
    expect(heading()).toBe(copy.qWorkingCostHeading)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    // A real retype of the same figure passes through other text on the way (focus fills the box with
    // "7000", so the identical value alone fires no change event).
    const again = screen.getByLabelText(copy.workingCostAmountLabel)
    fireEvent.focus(again)
    fireEvent.change(again, { target: { value: '700' } })
    fireEvent.change(again, { target: { value: '7000' } })
    fireEvent.blur(again)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('a re-tap of the held figure’s own radio keeps it, as the door does', () => {
    const m = modelWith(staleEntered())
    render(<Harness model={m} />)
    const figure = screen.getByRole('radio', { name: copy.workingCostDifferent })
    expect(figure).toBeChecked()
    fireEvent.click(figure)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
    expect(screen.queryByRole('note')).toBeNull()
    next()
    expect(heading()).toBe(copy.qWorkingLedgerHeading)
  })

  it('the keep door quotes the figure in the unit it was given: a yearly answer reads its yearly figure', () => {
    render(<Harness model={modelWith(staleEntered('year'))} />)
    expect(screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })).toBeInTheDocument()
  })
})

describe('the money-picture step (R16, KTD12)', () => {
  it('draws the engine’s own picture for a buildable W household, and its Continue completes the walk', () => {
    let completed = 0
    const m = modelWith(DEV_SEEDS.dateshort)
    function Done() {
      const snap = useSyncExternalStore(m.subscribe, m.getSnapshot)
      const steps = useMemo(() => intakeSteps(snap.draft).filter((s) => s.id === 'working-ledger'), [snap.draft])
      return <IntakeFlow steps={steps} model={m} onComplete={() => (completed += 1)} />
    }
    render(<Done />)
    const ledger = workingYearLedgerForRun(DEV_SEEDS.dateshort)
    if (ledger === 'unknown') throw new Error('[test setup] dateshort must draw a picture')
    expect(screen.getByRole('heading', { level: 3, name: copy.workingLedgerComingIn })).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerOutflow('70,000'))).toBeInTheDocument()
    expect(screen.getByText(copy.workingLedgerShort)).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerOutflow(formatMoney(-ledger.year0.bottomLine)))).toBeInTheDocument()
    next()
    expect(completed).toBe(1)
  })

  it('reads the plan clock off the wall calendar: a plan built in an earlier year says it shows its first year as entered', () => {
    const m = modelWith(DEV_SEEDS.dateshort) // built for 2026
    function Picture() {
      const snap = useSyncExternalStore(m.subscribe, m.getSnapshot)
      const steps = useMemo(() => intakeSteps(snap.draft).filter((s) => s.id === 'working-ledger'), [snap.draft])
      return <IntakeFlow steps={steps} model={m} />
    }
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date(2027, 5, 15))
      render(<Picture />)
      expect(screen.getByText(slots.workingLedgerLeadAged(2026))).toBeInTheDocument()
      cleanup()
      vi.setSystemTime(new Date(2026, 5, 15))
      render(<Picture />)
      expect(screen.getByText(slots.workingLedgerLead(2026))).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('an unbuildable household reads one calm line naming why — no list, no zeros — and Continue still completes', () => {
    let completed = 0
    const m = modelWith(DEV_SEEDS.datesolo)
    function Done() {
      const snap = useSyncExternalStore(m.subscribe, m.getSnapshot)
      const steps = useMemo(() => intakeSteps(snap.draft).filter((s) => s.id === 'working-ledger'), [snap.draft])
      return <IntakeFlow steps={steps} model={m} onComplete={() => (completed += 1)} />
    }
    const { container } = render(<Done />)
    // Nothing left to enter would draw a picture here, so no "yet". The walk points at the answer strip
    // (the top of the same screen, which names the blocker) instead of printing its two lines again.
    expect(screen.getByText(copy.workingLedgerUnknownLeadFinal)).toBeInTheDocument()
    expect(screen.queryByText(copy.workingLedgerUnknownLead)).toBeNull()
    expect(screen.getByText(copy.workingLedgerUnknownSeeStrip)).toBeInTheDocument()
    expect(screen.queryByText(`${copy.answerCannotPrice} ${copy.employerCoverageUnpriced}`)).toBeNull()
    expect(screen.queryByText(copy.answerCannotPriceTail)).toBeNull()
    expect(container.querySelector('dl')).toBeNull()
    expect(container.textContent).not.toMatch(/\$0\b/)
    next()
    expect(completed).toBe(1)
  })
})
