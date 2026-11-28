// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { BudgetLineItem, WorkingYearCostV3, WorkingYearLeftOverV5 } from '@shared/model'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { intakeStepIds } from '@intake/steps'
import { workingYearLedgerForRun } from '@intake/intakeMap'
import { formatMoney } from '@intake/moneyFormat'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { setupPage, stepWalkIds } from '../../../setup/stepperView'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'

/**
 * The Pre-retirement living expenses drawer as the pay check's W step and money-picture step (Act 6 · RC14 ported these
 * arms from the walk's `src/intake/__tests__/workingCostStep.test.tsx`, deleted with `flow.tsx` and `questions.tsx`;
 * `docs/plans/features/working-year-pay-check-build-spec.md` U8, KTD3/4/5/17/21, rulings 10, 34 and 38; build 2's
 * left-over question, `working-year-surplus-build-spec.md` U7, R5/R6, KTD8/10, R13). Rendered through `DrawerFor` over the
 * real store (`profileStore`), as the shell and the first-run stepper mount it: the W families open the face alone
 * (`costOnly`, the stepper's Expenses W card, the walk's W step), the money-picture and left-over families the whole
 * drawer (Goals' money picture card, the walk's last step).
 *
 * THE WALK'S CONTINUE IS THE DRAWER'S SAVE. Where the walk held on its W step, Save is refused: the gate's words (or the
 * figure's own) show at the fork or at the figure and the store's draft is untouched. Where the walk went on, Save passes
 * and the store holds the W the walk wrote. Every expected figure is typed by hand, as the walk's arms typed them.
 *
 * Retired with the walk (each named in the RC14 port's report): the step counts (the stepper's six pages are fixed;
 * which walk steps sit on each is the sequence arm below), Back's discard of a refused figure and the arrival-fresh face
 * (nothing refused ever leaves the drawer's buffer, and no error shows before a Save), and "Continue completes the walk".
 */

afterEach(cleanup)

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** `date`'s household with no W: quote $84,000 a year, shown as $7,000 a month. */
const dateNoW = (): ScenarioDraft => {
  const { workingYearCost: _none, ...rest } = DEV_SEEDS.date
  return rest
}
const confirmed = (quotedReal: number, stateTaxReading: WorkingYearCostV3['stateTaxReading'] = 'unpriced'): WorkingYearCostV3 => ({
  kind: 'confirmed',
  quotedReal,
  stateTaxReading,
})
/** `d` with the left-over answer replaced (`undefined`: the key absent, R1's "unanswered"). */
const withLeftOver = (d: ScenarioDraft, answer: WorkingYearLeftOverV5 | undefined): ScenarioDraft => {
  const { workingYearLeftOver: _drop, ...rest } = d
  return answer === undefined ? rest : { ...rest, workingYearLeftOver: answer }
}
/** Build 2's figures, the plan's or a seed's documented ones: `date`'s printed year-0 Left over is $16,985, and
 *  `datesavedmoved` stores $16,985 against a live $27,537 (its seed docblock, hand-derived by `year0check.mts`). */
const LEFT_OVER_DATE = 16_985
const LEFT_OVER_MOVED_LIVE = 27_537

// ── the drawer ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Mount the drawer over `model` (a reopen is a fresh mount over the same store, as the host keys each open). */
function mount(model: MemoryModel, costOnly: boolean, onClose = vi.fn()) {
  render(
    <DrawerFor
      target={costOnly ? { kind: 'working-cost', costOnly: true } : { kind: 'working-cost' }}
      model={model}
      open
      readOnly={false}
      onClose={onClose}
      onClosed={() => {}}
      finalFocus={() => null}
    />,
  )
  return onClose
}
/** The W question alone (the stepper's Expenses W card: the walk's W step). */
function openW(start: ScenarioDraft) {
  const store = profileStore(start)
  const onClose = mount(store.model, true)
  return { ...store, onClose }
}
/** The whole drawer (the money picture and the left-over question below the W question). */
function openAll(start: ScenarioDraft) {
  const store = profileStore(start)
  const onClose = mount(store.model, false)
  return { ...store, onClose, dialog: screen.getByRole('dialog', { name: copy.profileWorkingCostName }) }
}

/** Save: the walk's Continue. */
const save = () => act(() => fireEvent.click(screen.getByRole('button', { name: copy.profileDrawerSave })))
const stored = (m: MemoryModel) => m.getSnapshot().draft.workingYearCost
const storedLeftOver = (m: MemoryModel) => m.getSnapshot().draft.workingYearLeftOver
/** A refused Save: the alert says `words`, the store's draft is the one it was. */
const expectRefused = (m: MemoryModel, before: ScenarioDraft, words: string) => {
  expect(screen.getByRole('alert')).toHaveTextContent(words)
  expect(m.getSnapshot().draft, 'nothing refused reaches the store').toBe(before)
}

const FORK_NAME = /^Is \$[\d,.]+ a year about what a year costs while you’re working\?$/
const fork = () => screen.getByRole('group', { name: FORK_NAME })
const figureBox = () => screen.getByLabelText(copy.workingCostAmountLabel)
const typeFigure = (value: string) => {
  const input = figureBox()
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}
const pick = (labelKey: 'workingCostYes' | 'workingCostDifferent' | 'periodMonth' | 'periodYear') =>
  fireEvent.click(screen.getByRole('radio', { name: copy[labelKey] }))
const describedTextsOf = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '').split(' ').filter((i) => i !== '').map((i) => document.getElementById(i)?.textContent)

// ── the left-over question ───────────────────────────────────────────────────────────────────────────────────────────

type LeftOverLabel = 'workingLedgerLeftOverSaved' | 'workingLedgerLeftOverSpent' | 'workingLedgerLeftOverNotSure'
const LEFT_OVER_LABELS: readonly LeftOverLabel[] = ['workingLedgerLeftOverSaved', 'workingLedgerLeftOverSpent', 'workingLedgerLeftOverNotSure']
const leftOverRadio = (labelKey: LeftOverLabel) => screen.getByRole('radio', { name: copy[labelKey] })
const pickLeftOver = (labelKey: LeftOverLabel) => fireEvent.click(leftOverRadio(labelKey))
const leftOverGroup = () => screen.getByRole('group', { name: copy.workingLedgerLeftOverLegend })
const queryLeftOverGroup = () => screen.queryByRole('group', { name: copy.workingLedgerLeftOverLegend })
/** Either check sentence, by its words before the first figure: the absence arms query this. */
const [CHECK_PREFIX = ''] = slots.workingLedgerLeftOverCheckNoDeposits('§').split('§')
const CHECK_WORDS = (ownText: string) => CHECK_PREFIX.length > 0 && ownText.startsWith(CHECK_PREFIX)

/** Every text node in the page's body on one side of `el`, in document order ("below": after it and outside it). */
const textBeside = (el: HTMLElement, side: 'above' | 'below'): string => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const parts: string[] = []
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const pos = el.compareDocumentPosition(n)
    const keep =
      side === 'above'
        ? (pos & Node.DOCUMENT_POSITION_PRECEDING) !== 0
        : (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) === 0
    if (keep) parts.push(n.textContent ?? '')
  }
  return parts.join('|')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

describe('where the pay check’s two questions sit (KTD17; the stepper places them now)', () => {
  it('W and the money picture close the DATE route, W on Expenses (the question alone) and the picture last on Goals (the whole drawer); neither on the all-retired route', () => {
    const d = dateNoW()
    expect(intakeStepIds(d).slice(-3)).toEqual(['other-income', 'working-cost', 'working-ledger'])
    expect(stepWalkIds(d, 'expenses').at(-1)).toBe('working-cost')
    expect(stepWalkIds(d, 'goals').at(-1)).toBe('working-ledger')
    const expenses = setupPage(d, 'expenses')
    const goals = setupPage(d, 'goals')
    if (expenses.kind !== 'cards' || goals.kind !== 'cards') throw new Error('[test setup] both are card pages')
    expect(expenses.view.cards.find((c) => c.id === 'working-cost')?.target).toEqual({ kind: 'working-cost', costOnly: true })
    expect(goals.view.cards.at(-1)).toMatchObject({ id: 'money-picture', target: { kind: 'working-cost' } })
    // Every worker flipped to retired (and the seed's own retired household): both questions leave.
    const allRetired: ScenarioDraft = { ...d, people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 58 }, d.people[1]] }
    for (const [name, r] of [['flipped', allRetired], ['retired', DEV_SEEDS.retired]] as const) {
      expect(intakeStepIds(r), name).not.toContain('working-cost')
      expect(intakeStepIds(r), name).not.toContain('working-ledger')
      const e = setupPage(r, 'expenses')
      const g = setupPage(r, 'goals')
      if (e.kind !== 'cards' || g.kind !== 'cards') throw new Error('[test setup] both are card pages')
      expect(e.view.cards.map((c) => c.id), name).not.toContain('working-cost')
      expect(g.view.cards.map((c) => c.id), name).not.toContain('money-picture')
    }
  })
})

describe('the W question — the quote, the gate and "yes" (KTD3, KTD5)', () => {
  it('quotes the spending figure in its own period, above a legend naming the yearly figure "Yes" sets, with no answer checked and no alert', () => {
    openW(dateNoW())
    expect(screen.getByText(slots.workingCostQuoteMonthly('7,000', '84,000'))).toBeInTheDocument()
    const group = fork()
    // The legend names the figure "Yes" sets, the yearly quote (copy-law F8 at U11 walk 5).
    expect(group).toHaveAccessibleName(slots.workingCostLegendFigure('84,000'))
    expect(within(group).getByRole('radio', { name: copy.workingCostYes })).not.toBeChecked()
    expect(within(group).getByRole('radio', { name: copy.workingCostDifferent })).not.toBeChecked()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // Gap 4's U15 (KTD4's stopgap): a line in the quote that doesn't go up with prices counts at its first-year price.
  it('a budget whose quote counts a fixed-dollar line says it counts at its first-year price, and the fork reads it; none on `dip`', () => {
    openW(DEV_SEEDS.datefixed)
    expect(screen.getByText(slots.workingCostQuoteRatedNoteAt(2026))).toBeInTheDocument()
    expect(fork()).toHaveAccessibleDescription(expect.stringContaining(slots.workingCostQuoteRatedNoteAt(2026)))
    cleanup()
    openW(DEV_SEEDS.dip)
    expect(screen.queryByText(slots.workingCostQuoteRatedNoteAt(2026))).toBeNull()
  })

  it('a Save with W unanswered is refused at the fork, invalid and required, described by the gate AND the quote; the store untouched', () => {
    const { model, recompute } = openW(dateNoW())
    const before = model.getSnapshot().draft
    save()
    expectRefused(model, before, copy.errWorkingCostUnanswered)
    expect(recompute).not.toHaveBeenCalled()
    const group = fork()
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveAttribute('aria-required', 'true')
    // …and the figure the "yes" would keep: a forms-mode reader hears the quote, not a bare question.
    const described = describedTextsOf(group)
    expect(described).toContain(copy.errWorkingCostUnanswered)
    expect(described).toContain(slots.workingCostQuoteMonthly('7,000', '84,000'))
  })

  it('"yes" after a refused Save clears the gate, and Save stores the quote as a confirmed answer with its reading', () => {
    const { model, onClose } = openW(dateNoW())
    save()
    pick('workingCostYes')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(fork()).not.toHaveAttribute('aria-invalid')
    save()
    expect(stored(model)).toEqual(confirmed(84_000))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the help is two lists, what to count and what to leave out, plus the state sentence for the DRAFT’s reading (KTD18)', () => {
    // The count list names the state's income tax on pay exactly where the state sentence asks the household to ADD it
    // (unpriced, or a class-based state like PA), after the local tax (the walk-6 round review's L3-1).
    const cases: readonly [ScenarioDraft['retirementState'], string, boolean][] = [
      [undefined, copy.workingCostHelpStateUnpriced, true],
      ['elsewhere', copy.workingCostHelpStateUnpriced, true],
      ['NC', copy.workingCostHelpStateAgiDerived, false],
      ['PA', copy.workingCostHelpStateClassBased, true],
      ['FL', copy.workingCostHelpStateNone, false],
    ]
    const countFor = (stateTax: boolean): readonly string[] => [
      copy.workingCostHelpCountSpend,
      copy.workingCostHelpCountPremiums,
      copy.workingCostHelpCountMedicare,
      copy.workingCostHelpCountLocalTax,
      ...(stateTax ? ['any state income tax on pay'] : []),
      copy.workingCostHelpCountStateDeduction,
    ]
    const leaveOut = [
      copy.workingCostHelpLeaveOutPayrollTax,
      copy.workingCostHelpLeaveOutIncomeTax,
      copy.workingCostHelpLeaveOutSavings,
      copy.workingCostHelpLeaveOutMedicare,
    ]
    for (const [state, sentence, stateTax] of cases) {
      openW({ ...dateNoW(), ...(state === undefined ? {} : { retirementState: state }) })
      // Each list sits right under its own lead, its items in order: never one run-on paragraph.
      const countLead = screen.getByText(copy.workingCostHelpCountLead)
      const leaveLead = screen.getByText(copy.workingCostHelpLeaveOutLead)
      expect(countLead.compareDocumentPosition(leaveLead) & Node.DOCUMENT_POSITION_FOLLOWING, 'count, then leave out').toBeTruthy()
      const items = (lead: HTMLElement) => within(lead.parentElement!).getAllByRole('listitem').map((li) => li.textContent)
      expect([items(countLead), items(leaveLead)], state ?? 'no state').toEqual([countFor(stateTax), leaveOut])
      expect(screen.getByText(sentence)).toBeInTheDocument()
      cleanup()
    }
    // R1's items, named in every household's help, each in the list it belongs to.
    const counted = countFor(false).join(' | ')
    for (const named of [
      'what you spend',
      'health premiums',
      'taken from pay',
      'buys on their own',
      'someone still working',
      'anyone not on Medicare yet',
      'city wage tax or earned-income tax',
      'state disability or family-leave',
      'Medicare premiums of anyone on Medicare who is still working',
      'only once they stop working',
    ]) {
      expect(counted, named).toContain(named)
    }
    const left = leaveOut.join(' | ')
    for (const named of ['federal Social Security and Medicare tax', 'federal income tax', 'what you put into savings', 'Medicare premiums for anyone who has stopped working']) {
      expect(left, named).toContain(named)
    }
  })

  it('a state sentence that asks for the tax on pay says ADD it, never "keep", which reads as already counted', () => {
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
    openW({ ...dateNoW(), budget, health: { ...dateNoW().health, oopMedicalAnnual: 6_000 }, annualSpendingReal: 45_000 })
    expect(screen.getByText(slots.workingCostQuoteBudgetMedical('36,000', '6,000'))).toBeInTheDocument()
    expect(screen.getByText(slots.workingCostLeftOutMore('Travel, Boat, Golf', 2))).toBeInTheDocument()
  })
})

describe('the W question — a figure of their own (KTD4, KTD17, ruling 10)', () => {
  it('"a different figure" over a held confirmed answer CLEARS W, so Save is refused until a figure is given', () => {
    const { model } = openW({ ...dateNoW(), workingYearCost: confirmed(84_000) })
    const before = model.getSnapshot().draft
    expect(screen.getByRole('radio', { name: copy.workingCostYes })).toBeChecked()
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    expect(figureBox()).toHaveValue('')
    save()
    expectRefused(model, before, copy.errWorkingCostUnanswered)
  })

  it('the untapped period is MONTH: 7,000 saves as 84,000 a year; 9,000 asks the unit until it is tapped, then saves as 108,000', () => {
    const { model } = openW(dateNoW())
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('7000')
    save()
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'unpriced' })
    const before = model.getSnapshot().draft
    typeFigure('9000')
    save()
    expectRefused(model, before, copy.periodConfirmPrompt)
    // An explicit press on the period it already shows answers it.
    pick('periodMonth')
    save()
    expect(stored(model)).toMatchObject({ kind: 'entered', amountReal: 108_000, entryPeriod: 'month' })
  })

  it('a W-ABSENT plan typing 9,000 on its first W is asked the unit (the figure box carries it), and nothing reaches the store', () => {
    const { model } = openW(dateNoW())
    const before = model.getSnapshot().draft
    pick('workingCostDifferent')
    typeFigure('9000')
    save()
    expectRefused(model, before, copy.periodConfirmPrompt)
    expect(figureBox()).toHaveAttribute('aria-invalid', 'true')
  })

  it('tapping "each year" re-bases the TYPED digits: 40,000 typed under month is asked, then saves as 40,000 a year', () => {
    const { model } = openW(dateNoW())
    pick('workingCostDifferent')
    typeFigure('40000')
    save()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
    pick('periodYear')
    expect(figureBox()).toHaveValue('40,000')
    save()
    expect(stored(model)).toMatchObject({ kind: 'entered', amountReal: 40_000, entryPeriod: 'year' })
  })

  it('a figure typed after the period is tapped lands in that period (5,000 a month saves as 60,000 a year)', () => {
    const { model } = openW(dateNoW())
    pick('workingCostDifferent')
    pick('periodMonth')
    typeFigure('5000')
    save()
    expect(stored(model)).toMatchObject({ amountReal: 60_000, entryPeriod: 'month' })
  })

  it('a restored entered answer never re-asks the unit when its amount is edited (the face marks its unit answered at mount)', () => {
    const { model } = openW({ ...dateNoW(), workingYearCost: { kind: 'entered', amountReal: 96_000, entryPeriod: 'month', stateTaxReading: 'unpriced' } })
    expect(figureBox()).toHaveValue('8,000')
    typeFigure('9000')
    save()
    expect(stored(model)).toMatchObject({ kind: 'entered', amountReal: 108_000, entryPeriod: 'month' })
  })

  it('an entered $0 is refused with the calm zero message at the figure; it never rides into the store', () => {
    const { model, recompute } = openW(dateNoW())
    const before = model.getSnapshot().draft
    pick('workingCostDifferent')
    pick('periodYear')
    typeFigure('0')
    save()
    expectRefused(model, before, copy.errWorkingCostZero)
    expect(figureBox()).toHaveAttribute('aria-invalid', 'true')
    expect(recompute).not.toHaveBeenCalled()
  })

  it('clearing the typed figure clears W (never a figure-less answer), and Save asks again with the store untouched', () => {
    const { model } = openW({ ...dateNoW(), workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced' } })
    const before = model.getSnapshot().draft
    typeFigure('')
    save()
    expectRefused(model, before, copy.errWorkingCostUnanswered)
  })

  it('a W below the out-of-pocket medical figure saves (never refused) and says so, quoting both figures', () => {
    const { model, onClose } = openW({
      ...dateNoW(),
      health: { ...dateNoW().health, oopMedicalAnnual: 8_000 },
      workingYearCost: { kind: 'entered', amountReal: 7_999, entryPeriod: 'year', stateTaxReading: 'unpriced' },
    })
    expect(screen.getByText(slots.workingCostBelowMedical('7,999', '8,000'))).toBeInTheDocument()
    typeFigure('7998')
    save()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(stored(model)).toMatchObject({ kind: 'entered', amountReal: 7_998 })
  })

  it('a period tap never outlives the drawer: tapped "each year" with no figure, closed, reopened, 84,000 under the month it shows is asked', () => {
    const { model } = openW(dateNoW())
    pick('workingCostDifferent')
    pick('periodYear') // said "a year" before typing anything
    cleanup() // closed with nothing saved
    mount(model, true)
    const before = model.getSnapshot().draft
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('84000')
    save()
    expectRefused(model, before, copy.periodConfirmPrompt)
  })

  it('a saved figure’s unit stands on reopening: "each year" shows, and a retyped figure is not re-asked', () => {
    const { model } = openW(dateNoW())
    pick('workingCostDifferent')
    pick('periodYear')
    typeFigure('90000')
    save()
    cleanup()
    mount(model, true)
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    typeFigure('95000')
    save()
    expect(stored(model)).toMatchObject({ amountReal: 95_000, entryPeriod: 'year' })
  })
})

describe('the W question — a stale answer (KTD21)', () => {
  it('a confirmed answer whose quote moved opens with NO answer checked and the calm note; Save is refused with the note still a note; "yes" answers it at today’s quote', () => {
    const { model } = openW(DEV_SEEDS.datecoststale)
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleQuote('84,000', '78,000'))
    save()
    expectRefused(model, DEV_SEEDS.datecoststale, copy.errWorkingCostUnanswered)
    expect(screen.getByRole('note')).toBeInTheDocument() // the note stays a note
    pick('workingCostYes')
    expect(screen.queryByRole('note')).toBeNull()
    save()
    expect(stored(model)).toEqual(confirmed(78_000))
  })

  it('an entered answer whose state reading moved opens prefilled in its own period, and "keep" re-stamps it as it stands, focus landing on the answer', () => {
    const { model } = openW({
      ...dateNoW(),
      retirementState: 'PA',
      workingYearCost: { kind: 'entered', amountReal: 90_000, entryPeriod: 'month', stateTaxReading: 'agi-derived' },
    })
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    expect(figureBox()).toHaveValue('7,500')
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleStateEntered('90,000'))
    // A real tap focuses the button first (jsdom's click does not), and the button unmounts under it.
    const keep = screen.getByRole('button', { name: slots.workingCostKeepMonthly('7,500') })
    keep.focus()
    fireEvent.click(keep)
    expect(screen.queryByRole('note')).toBeNull()
    // Focus never falls away: it lands on the answer that now stands.
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: copy.workingCostDifferent }))
    save()
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 90_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
  })

  it('a stale YES kept through the door reads as a figure of their own, yearly, and saves stamped as kept, never asked its unit (ruling 34; build 2’s KTD10)', () => {
    // Without the door, keeping $84,000 meant "a different figure", which clears a confirmed answer, unmounting the only
    // place $84,000 is named. (The focus and the fresh save are `expensesGoalsSave.test.tsx`'s datecoststale arm.)
    const { model } = openW(DEV_SEEDS.datecoststale)
    const keep = screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })
    expect(screen.getByRole('note')).toContainElement(keep)
    fireEvent.click(keep)
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    expect(figureBox()).toHaveValue('84,000')
    save()
    expect(screen.queryByRole('alert')).toBeNull()
    // The stamp records the $78,000 quote the note showed, so a later rise past $84,000 still says so.
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced', keptOverQuoteReal: 78_000 })
  })

  it('a stale YES below today’s quote gets NO keep door (a one-tap keep would land W under what they now spend); at or above it the door is there', () => {
    const { model } = openW({ ...DEV_SEEDS.datecoststale, annualSpendingReal: 96_000 })
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleQuote('84,000', '96,000'))
    expect(screen.queryByRole('button', { name: /^Keep / })).toBeNull()
    pick('workingCostYes')
    save()
    expect(stored(model)).toEqual(confirmed(96_000))
    cleanup()
    openW({ ...DEV_SEEDS.datecoststale, annualSpendingReal: 84_000, retirementState: 'FL' })
    expect(screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })).toBeInTheDocument()
  })
})

describe('the W question — the fork’s own words, read before any Save (forms mode)', () => {
  it('the fork names the figure it offers, says it is required, and is described by the quote alone, with no alert yet', () => {
    openW(dateNoW())
    const group = fork()
    expect(group).toHaveAttribute('aria-required', 'true')
    expect(describedTextsOf(group)).toEqual([slots.workingCostQuoteMonthly('7,000', '84,000')])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('on a stale answer the fork is described by the stale note first, then the quote', () => {
    openW(DEV_SEEDS.datecoststale)
    expect(describedTextsOf(fork())).toEqual([slots.workingCostStaleQuote('84,000', '78,000'), slots.workingCostQuoteMonthly('6,500', '78,000')])
  })
})

describe('the W question — answering forgives the gate (B4 of the Phase B review)', () => {
  it('after "a different figure", a Save with no figure asks AT the figure, never under the answered fork', () => {
    const { model } = openW(dateNoW())
    const before = model.getSnapshot().draft
    save()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    pick('workingCostDifferent')
    expect(fork()).not.toHaveAttribute('aria-invalid')
    save() // still no figure: refused again, and the message sits where the household is answering
    expectRefused(model, before, copy.errWorkingCostUnanswered)
    expect(fork()).not.toHaveAttribute('aria-invalid')
    expect(within(fork()).queryByRole('alert'), 'never under the answered fork').toBeNull()
    const figure = figureBox()
    expect(figure).toHaveAttribute('aria-invalid', 'true')
    expect(describedTextsOf(figure)).toContain(copy.errWorkingCostUnanswered)
  })

  it('a $0 quote: no fork and no quote; a refused Save says why AT the figure; 5,500 a month (under the period floor) then saves as 66,000', () => {
    const { annualSpendingReal: _s, ...noSpend } = dateNoW()
    const { model } = openW(noSpend)
    expect(screen.queryByRole('group', { name: FORK_NAME })).toBeNull()
    expect(screen.queryByText(/Your spending figure is/)).toBeNull()
    save()
    expectRefused(model, noSpend, copy.errWorkingCostUnanswered)
    const field = figureBox()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(describedTextsOf(field)).toContain(copy.errWorkingCostUnanswered)
    typeFigure('5500')
    save()
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 66_000, entryPeriod: 'month', stateTaxReading: 'unpriced' })
  })

  it('answering is forgiving: "a different figure" after a refused Save takes the gate’s message away until the next Save (it never moves, unasked, to the figure just opened)', () => {
    openW(dateNoW())
    save()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    pick('workingCostDifferent')
    expect(screen.queryByRole('alert'), 'the fork is answered: its refusal goes').toBeNull()
    expect(figureBox(), 'the figure was never refused').not.toHaveAttribute('aria-invalid')
  })

  it('typing is answering: the first keystroke after a refused Save clears the refusal at the figure until the next Save (both the fork’s figure and a $0 quote’s)', () => {
    const { annualSpendingReal: _s, ...noSpend } = dateNoW()
    for (const [name, d, before] of [
      ['a different figure', dateNoW(), () => pick('workingCostDifferent')],
      ['a $0 quote', noSpend, () => {}],
    ] as const) {
      openW(d)
      before()
      save()
      const figure = figureBox()
      expect(figure, `${name}: refused`).toHaveAttribute('aria-invalid', 'true')
      fireEvent.focus(figure)
      fireEvent.change(figure, { target: { value: '7' } })
      expect(screen.queryByRole('alert'), `${name}: the keystroke forgives`).toBeNull()
      expect(figure, name).not.toHaveAttribute('aria-invalid')
      cleanup()
    }
  })

  it('answering the unit forgives its refusal: a press on the period it already shows takes the prompt away until the next Save', () => {
    openW(dateNoW())
    pick('workingCostDifferent')
    typeFigure('9000')
    save()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
    pick('periodMonth')
    expect(screen.queryByRole('alert'), 'the unit is answered: the prompt goes').toBeNull()
  })
})

describe('the W question — the period mark follows the unit on screen (ruling 38, the whole-file review)', () => {
  // `date`'s household said yes to $90,000; its spending is now $84,000, so the yes is stale and above today's quote:
  // the Keep door shows (ruling 34).
  const staleYes = (): ScenarioDraft => ({ ...dateNoW(), workingYearCost: confirmed(90_000) })
  const enteredYearly = (): ScenarioDraft => ({
    ...dateNoW(),
    workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced' },
  })
  const expectAsked = (model: MemoryModel) => {
    const before = model.getSnapshot().draft
    save()
    expectRefused(model, before, copy.periodConfirmPrompt)
  }

  it('Keep a stale yes, clear the kept figure, pick a different figure: 84,000 under the month it shows is asked', () => {
    const { model } = openW(staleYes())
    fireEvent.click(screen.getByRole('button', { name: slots.workingCostKeepYearly('90,000') }))
    expect(figureBox()).toHaveValue('90,000')
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    typeFigure('')
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('84000')
    expectAsked(model)
  })

  it('Keep a stale yes, then "yes", then a different figure: the same 84,000 is asked', () => {
    const { model } = openW(staleYes())
    fireEvent.click(screen.getByRole('button', { name: slots.workingCostKeepYearly('90,000') }))
    pick('workingCostYes')
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('84000')
    expectAsked(model)
  })

  it('a reviewed yearly figure, cleared: the face asks the unit of the next figure, under the untapped month', () => {
    const { model } = openW(enteredYearly())
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    typeFigure('')
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    typeFigure('84000')
    expectAsked(model)
  })

  it('a reviewed yearly figure replaced by "yes": a different figure opens at the untapped MONTH, never an untapped year', () => {
    openW(enteredYearly())
    pick('workingCostYes')
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
    expect(screen.getByRole('radio', { name: copy.periodYear })).not.toBeChecked()
  })

  it('a unit TAPPED on this face stands after a "yes": year stays checked and 84,000 typed under it saves as a year, unasked', () => {
    const { model } = openW(dateNoW())
    pick('workingCostDifferent')
    pick('periodYear')
    typeFigure('84000')
    pick('workingCostYes')
    pick('workingCostDifferent')
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    typeFigure('84000')
    save()
    expect(stored(model)).toMatchObject({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year' })
  })
})

describe('the W question — a stale entered answer: only a keystroke or a keep answers it (B6 of the Phase B review)', () => {
  // Entered at $7,000 a month under FL (no state income tax); the state answer then moved to PA, whose tax on pay the
  // household now holds inside W (KTD18), so the answer is stale.
  const staleEntered = (entryPeriod: 'month' | 'year' = 'month'): ScenarioDraft => ({
    ...dateNoW(),
    retirementState: 'PA',
    workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod, stateTaxReading: 'none' },
  })

  it('a pass through the figure with no keystroke (a tab to Save) leaves it stale and Save names both ways out; a retype re-stamps it and saves', () => {
    const start = staleEntered()
    const { model } = openW(start)
    const input = figureBox()
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(screen.getByRole('note')).toBeInTheDocument()
    save()
    // The question visibly holds an answer, so the gate names the ways out, the note's door in its own words and a
    // retype, never "answer it above" (the U11 walk's (ad)).
    expectRefused(model, start, slots.errWorkingCostStaleKeep(slots.workingCostKeepMonthly('7,000')))
    expect(screen.getByRole('button', { name: slots.workingCostKeepMonthly('7,000') }), 'the door it names is on screen').toBeInTheDocument()
    // A real retype of the same figure passes through other text on the way.
    const again = figureBox()
    fireEvent.focus(again)
    fireEvent.change(again, { target: { value: '700' } })
    fireEvent.change(again, { target: { value: '7000' } })
    fireEvent.blur(again)
    expect(screen.queryByRole('note')).toBeNull()
    save()
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
  })

  it('a re-tap of the held figure’s own radio keeps it, as the door does', () => {
    const { model } = openW(staleEntered())
    const figure = screen.getByRole('radio', { name: copy.workingCostDifferent })
    expect(figure).toBeChecked()
    fireEvent.click(figure)
    expect(screen.queryByRole('note')).toBeNull()
    save()
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
  })

  it('the keep door quotes the figure in the unit it was given: a yearly answer reads its yearly figure', () => {
    openW(staleEntered('year'))
    expect(screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })).toBeInTheDocument()
  })
})

describe('the W question — a kept yes goes stale when the spending rises past it (build 2’s KTD10, R13)', () => {
  // `date`'s household said yes to $84,000; its spending has since fallen to $80,000 a year, so the yes is stale and above
  // today's quote: the Keep door shows (ruling 34). The spending's rise is the Living expenses drawer's Save (the store),
  // then this drawer reopens over it.
  const KEPT: WorkingYearCostV3 = { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced', keptOverQuoteReal: 80_000 }
  const keepDoor = () => screen.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })
  const riseTo85 = (model: MemoryModel) => {
    cleanup()
    model.update((d) => ({ ...d, annualSpendingReal: 85_000 }))
    mount(model, true)
  }

  it('kept over $80,000, then the spending rises to $85,000: the note names the spending and leans, no door shows, and Save is refused naming both figures; "yes" answers it', () => {
    const { model } = openW({ ...dateNoW(), annualSpendingReal: 80_000, workingYearCost: confirmed(84_000) })
    fireEvent.click(keepDoor())
    expect(screen.queryByRole('note')).toBeNull()
    save()
    expect(stored(model)).toEqual(KEPT)
    riseTo85(model)
    expect(screen.getByRole('note')).toHaveTextContent(`${slots.workingCostStaleKeptQuote('84,000', '85,000')} ${slots.workingCostStaleLeansBetter('84,000')}`)
    expect(screen.queryByRole('button', { name: /^Keep / })).toBeNull()
    expect(screen.getByRole('radio', { name: copy.workingCostDifferent })).toBeChecked()
    const before = model.getSnapshot().draft
    save()
    // No door here, so the gate names both ways out with both figures (the U11 walk's (ad)).
    expectRefused(model, before, slots.errWorkingCostStaleBelowQuote('84,000', '85,000'))
    expect(screen.getByRole('alert')).not.toHaveTextContent(copy.errWorkingCostUnanswered)
    pick('workingCostYes')
    expect(screen.queryByRole('note')).toBeNull()
    save()
    expect(stored(model)).toEqual(confirmed(85_000))
  })

  it('a re-tap of the held answer on a kept figure the spending has risen past keeps the stamp, so the note stays and Save is refused', () => {
    const start: ScenarioDraft = { ...dateNoW(), annualSpendingReal: 85_000, workingYearCost: KEPT }
    const { model } = openW(start)
    fireEvent.click(screen.getByRole('radio', { name: copy.workingCostDifferent }))
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleKeptQuote('84,000', '85,000'))
    save()
    expectRefused(model, start, slots.errWorkingCostStaleBelowQuote('84,000', '85,000'))
  })

  it('after a state move, the door and the re-tap each keep the stamp, and a later rise past the figure still stales it', () => {
    for (const keepBy of ['door', 're-tap'] as const) {
      const { model } = openW({ ...dateNoW(), annualSpendingReal: 80_000, retirementState: 'FL', workingYearCost: KEPT })
      expect(screen.getByRole('note'), keepBy).toHaveTextContent(slots.workingCostStaleStateKept('84,000'))
      if (keepBy === 'door') fireEvent.click(keepDoor())
      else fireEvent.click(screen.getByRole('radio', { name: copy.workingCostDifferent }))
      expect(screen.queryByRole('note'), keepBy).toBeNull()
      save()
      expect(stored(model), keepBy).toEqual({ ...KEPT, stateTaxReading: 'none' })
      riseTo85(model)
      expect(screen.getByRole('note'), keepBy).toHaveTextContent(slots.workingCostStaleKeptQuote('84,000', '85,000'))
      cleanup()
    }
  })

  it('a figure retyped over a kept one drops the stamp: it is the household’s own, never staled by a rise', () => {
    const { model } = openW({ ...dateNoW(), annualSpendingReal: 80_000, workingYearCost: KEPT })
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    const input = figureBox()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '8400' } })
    fireEvent.change(input, { target: { value: '84000' } })
    fireEvent.blur(input)
    save()
    expect(stored(model)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced' })
    riseTo85(model)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('a unit tap on a kept figure the spending has passed CONVERTS it and carries the stamp: stale in either unit, and Save is refused in each (U5’s review; the U11 walk’s (ab))', () => {
    // (ab): the month view once re-read the kept digits as $1,008,000 a year, which read FRESH, so Continue let the walk
    // through at twelve times the figure. A kept figure converts: $7,000 a month, still stale.
    const start: ScenarioDraft = { ...dateNoW(), annualSpendingReal: 85_000, workingYearCost: KEPT }
    const { model } = openW(start)
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleKeptQuote('84,000', '85,000'))
    pick('periodMonth')
    expect(figureBox()).toHaveValue('7,000')
    expect(screen.getByRole('note')).toHaveTextContent(slots.workingCostStaleKeptQuote('84,000', '85,000'))
    save()
    expectRefused(model, start, slots.errWorkingCostStaleBelowQuote('84,000', '85,000'))
    pick('periodYear')
    expect(figureBox()).toHaveValue('84,000')
    expect(screen.getByRole('note')).toHaveTextContent(`${slots.workingCostStaleKeptQuote('84,000', '85,000')} ${slots.workingCostStaleLeansBetter('84,000')}`)
    save()
    expectRefused(model, start, slots.errWorkingCostStaleBelowQuote('84,000', '85,000'))
  })
})

describe('the W question — Keep’s condition, and a typed figure below today’s spending (council wf_22858e04-f7a (3); the Tier 0 retype entry, prescription (1); F8)', () => {
  it('on `datesavedstale`, Keep’s condition sits above Keep, inside the stale note, as Keep’s description, and Keep sits above the cost lists', () => {
    openW(DEV_SEEDS.datesavedstale)
    const keep = screen.getByRole('button', { name: 'Keep $84,000 a year' })
    const condition =
      'If you pay none of the costs listed below besides what you spend, choose “Yes, that’s about right”. Choose “Keep $84,000 a year” only if you pay some of them and they come to $6,000 a year or less on top of your $78,000 of spending.'
    expect(keep).toHaveAccessibleDescription(condition)
    const conditionEl = screen.getByText(condition)
    expect(conditionEl.compareDocumentPosition(keep) & Node.DOCUMENT_POSITION_FOLLOWING, 'the condition comes first').toBeTruthy()
    expect(keep.compareDocumentPosition(screen.getByText(copy.workingCostHelpCountLead)) & Node.DOCUMENT_POSITION_FOLLOWING, 'the cost lists follow Keep').toBeTruthy()
    expect(conditionEl.closest('[role="note"]'), 'inside the stale note, with its door').toBe(keep.closest('[role="note"]'))
  })

  it('…and on a figure kept at today’s quote (typed by the month, then Florida picked: stale on the reading alone), the figure’s own terms, in its own unit', () => {
    const yes = DEV_SEEDS.datesaved.workingYearCost
    if (yes?.kind !== 'confirmed') throw new Error('[test setup] datesaved holds a yes')
    openW({
      ...DEV_SEEDS.datesaved,
      retirementState: 'FL',
      workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: yes.stateTaxReading },
    })
    expect(screen.getByRole('button', { name: 'Keep $7,000 a month' })).toHaveAccessibleDescription(
      'Choose “Keep $7,000 a month” only if $7,000 a month covers your spending plus the costs listed below.',
    )
  })

  it('the calm note shows under a typed $84,000 below `datesavedrisen`’s $90,000 spending and nowhere for a figure at it; the fork asks about $90,000', () => {
    const NOTE =
      'Your $84,000 a year is below your spending figure of $90,000 a year. A working year almost always costs at least what you spend, so this answer can look better than it really is.'
    const yes = DEV_SEEDS.datesavedrisen.workingYearCost
    if (yes?.kind !== 'confirmed') throw new Error('[test setup] datesavedrisen holds a yes')
    const typed = (amountReal: number): ScenarioDraft => ({
      ...DEV_SEEDS.datesavedrisen,
      workingYearCost: { kind: 'entered', amountReal, entryPeriod: 'year', stateTaxReading: yes.stateTaxReading },
    })
    openW(typed(84_000))
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(screen.queryByRole('alert'), 'calm: never an alert').toBeNull()
    expect(screen.getByRole('group', { name: 'Is $90,000 a year about what a year costs while you’re working?' })).toBeInTheDocument()
    cleanup()
    openW(typed(90_000))
    expect(screen.queryByText(NOTE)).toBeNull()
    expect(screen.queryByText(/is below your spending figure/)).toBeNull()
  })
})

describe('the money picture (R16, KTD12)', () => {
  it('draws the engine’s own picture for a buildable W household (`dateshort`: year 0 short)', () => {
    const { dialog } = openAll(DEV_SEEDS.dateshort)
    const ledger = workingYearLedgerForRun(DEV_SEEDS.dateshort)
    if (ledger === 'unknown') throw new Error('[test setup] dateshort must draw a picture')
    const picture = dialog.querySelector<HTMLElement>('[data-money-picture]')!
    expect(within(picture).getByRole('heading', { name: copy.workingLedgerComingIn })).toBeInTheDocument()
    expect(within(picture).getByText(slots.workingLedgerOutflow('70,000'))).toBeInTheDocument()
    expect(within(picture).getByText(copy.workingLedgerShort)).toBeInTheDocument()
    expect(within(picture).getByText(slots.workingLedgerOutflow(formatMoney(-ledger.year0.bottomLine)))).toBeInTheDocument()
  })

  it('reads the plan clock off the wall calendar: a plan built in an earlier year says it shows its first year as entered', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date(2027, 5, 15))
      openAll(DEV_SEEDS.dateshort) // built for 2026
      expect(screen.getByText(slots.workingLedgerLeadAged(2026))).toBeInTheDocument()
      cleanup()
      vi.setSystemTime(new Date(2026, 5, 15))
      openAll(DEV_SEEDS.dateshort)
      expect(screen.getByText(slots.workingLedgerLead(2026))).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('an unbuildable household (`datesolo`) reads one calm line naming why: no list, no zeros; and its Save still passes', () => {
    const { dialog, onClose } = openAll(DEV_SEEDS.datesolo)
    const picture = dialog.querySelector<HTMLElement>('[data-money-picture]')!
    expect(within(picture).getByText(copy.workingLedgerUnknownLeadFinal)).toBeInTheDocument()
    expect(within(picture).queryByText(copy.workingLedgerUnknownLead)).toBeNull()
    expect(picture.querySelector('dl')).toBeNull()
    expect(picture.textContent).not.toMatch(/\$0\b/)
    save()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('the left-over question (build 2’s U7; R5, R6, KTD8)', () => {
  it('on `date` with nothing answered, it sits below the whole picture, quoting $16,985, with no reply checked; on `datesaved` the stored reply alone is checked', () => {
    openAll(withLeftOver(DEV_SEEDS.date, undefined))
    const group = leftOverGroup()
    for (const labelKey of LEFT_OVER_LABELS) expect(within(group).getByRole('radio', { name: copy[labelKey] }), labelKey).not.toBeChecked()
    // The figure and the check sentence are the group's described-by lines, never its legend (R6).
    expect(describedTextsOf(group)).toEqual([slots.workingLedgerLeftOverFigure('16,985'), slots.workingLedgerLeftOverCheck('16,985', '20,000', '36,985')])
    // The figure it quotes is the one the picture prints as year 0's Left over (KTD8), and the deposits the check sentence
    // sits on are the picture's own row: Alex's $20,000, never $28,000 with the employer's $8,000 match.
    expect(screen.getByText(copy.workingLedgerLeftOver, { selector: 'dt' }).nextElementSibling?.textContent).toBe(slots.workingLedgerAmount('16,985'))
    expect(screen.getByText(copy.workingLedgerDeposits, { selector: 'dt' }).nextElementSibling?.textContent).toBe(slots.workingLedgerOutflow('20,000'))
    // Below the WHOLE picture: every picture heading and printed figure precedes the group, the later years included.
    const picture = document.querySelector<HTMLElement>('[data-money-picture]')!
    const pictureHeadings = within(picture).getAllByRole('heading')
    expect(pictureHeadings.map((h) => h.textContent)).toContain(copy.workingLedgerLaterHeading)
    for (const el of [...pictureHeadings, ...within(picture).getAllByRole('definition')]) {
      expect(el.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING, el.textContent ?? '').not.toBe(0)
    }
    cleanup()
    openAll(DEV_SEEDS.datesaved)
    for (const labelKey of LEFT_OVER_LABELS) {
      const radio = within(leftOverGroup()).getByRole('radio', { name: copy[labelKey] })
      if (labelKey === 'workingLedgerLeftOverSaved') expect(radio, labelKey).toBeChecked()
      else expect(radio, labelKey).not.toBeChecked()
    }
  })

  it('shown under every reply (absent, saved, spent, not sure, saved-moved) and hidden where year 0 is short: never the waiting face for a fresh W', () => {
    // Hidden on `date`'s own household with its spending and its yes both raised to $200,000 (W fresh): $16,985 − $116,000
    // is below $1, so R5 never asks.
    openAll({ ...DEV_SEEDS.date, annualSpendingReal: 200_000, workingYearCost: confirmed(200_000) })
    expect(screen.getByText(copy.workingLedgerShort)).toBeInTheDocument()
    expect(screen.queryByText(/This question waits until you/)).toBeNull()
    expect(screen.queryByRole('note')).toBeNull()
    expect(queryLeftOverGroup(), 'hidden').toBeNull()
    cleanup()
    const shown: readonly [string, ScenarioDraft][] = [
      ['absent', withLeftOver(DEV_SEEDS.date, undefined)],
      ['saved', withLeftOver(DEV_SEEDS.date, { kind: 'saved', quotedReal: LEFT_OVER_DATE })],
      ['spent', withLeftOver(DEV_SEEDS.date, { kind: 'spent' })],
      ['not sure', withLeftOver(DEV_SEEDS.date, { kind: 'not-sure' })],
      ['saved, moved', DEV_SEEDS.datesavedmoved],
    ]
    for (const [name, d] of shown) {
      openAll(d)
      expect(leftOverGroup(), `${name}: shown`).toBeInTheDocument()
      cleanup()
    }
  })

  it('is hidden on `dateshort` (short every year) and on `datelateleftover` (short in year 0, a left over from year 4); shown on `date`', () => {
    openAll(DEV_SEEDS.dateshort)
    expect(screen.getByText(copy.workingLedgerShort)).toBeInTheDocument()
    expect(queryLeftOverGroup()).toBeNull()
    expect(screen.queryByText(CHECK_WORDS)).toBeNull()
    cleanup()
    // `datelateleftover`: year 0 runs $7,695 short while later years print a left over; R5 asks only on year 0's figure.
    openAll(DEV_SEEDS.datelateleftover)
    expect(screen.getByText(copy.workingLedgerShort)).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerOutflow('7,695'))).toBeInTheDocument()
    const laterLeftOver = slots.workingLedgerLaterLeftOver('')
    expect(screen.getAllByText((ownText) => ownText.startsWith(laterLeftOver)).length).toBeGreaterThan(0)
    expect(queryLeftOverGroup()).toBeNull()
    expect(screen.queryByText(CHECK_WORDS)).toBeNull()
    cleanup()
    openAll(DEV_SEEDS.date)
    expect(leftOverGroup()).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLeftOverCheck('16,985', '20,000', '36,985'))).toBeInTheDocument()
    expect(screen.getByText(CHECK_WORDS)).toBeInTheDocument()
  })

  it('at a printed $0 Left over the question does not show; at a printed $1 it does, quoting $1 (R5: at least $1)', () => {
    // W typed by hand above `date`'s $84,000 comes off year 0's bottom line dollar for dollar: $16,985 higher prints $0,
    // $16,984 higher prints $1. A typed figure stales only on its state-tax reading, so W stays fresh in both.
    const typedW = (amountReal: number): ScenarioDraft => ({
      ...DEV_SEEDS.date,
      workingYearCost: { kind: 'entered', amountReal, entryPeriod: 'year', stateTaxReading: 'unpriced' },
    })
    const printedLeftOver = () => screen.getByText(copy.workingLedgerLeftOver, { selector: 'dt' }).nextElementSibling?.textContent
    openAll(typedW(84_000 + 16_985))
    expect(printedLeftOver(), '$0: the picture prints a Left over, not a Short').toBe(slots.workingLedgerAmount('0'))
    expect(queryLeftOverGroup(), '$0').toBeNull()
    expect(screen.queryByText(CHECK_WORDS), '$0').toBeNull()
    expect(screen.queryByText(/This question waits until you/), '$0').toBeNull()
    cleanup()
    openAll(typedW(84_000 + 16_984))
    expect(printedLeftOver(), '$1').toBe(slots.workingLedgerAmount('1'))
    expect(describedTextsOf(leftOverGroup()), '$1').toEqual([slots.workingLedgerLeftOverFigure('1'), slots.workingLedgerLeftOverCheck('1', '20,000', '20,001')])
    expect(screen.getByText(slots.workingLedgerLeftOverAbsentLine('1'))).toBeInTheDocument()
  })

  it('with no deposits row, the check sentence states the left over alone, with nothing to sit on top of', () => {
    expect(CHECK_PREFIX.length, 'the shared opening words').toBeGreaterThan(10)
    expect(slots.workingLedgerLeftOverCheck('1', '2', '3').startsWith(CHECK_PREFIX)).toBe(true)
    // `date` with Alex's 401k contribution and its match taken out: no "What you put into savings" row. The figure is read
    // off the printed Left over row (KTD8: the question quotes the picture's own print).
    const [alex401k, ...others] = DEV_SEEDS.date.enteredAccounts
    if (alex401k === undefined) throw new Error('the premise: `date` enters Alex’s 401k first')
    const { annualContribution: _contribution, employerMatchAnnual: _match, ...noDeposits } = alex401k
    openAll(withLeftOver({ ...DEV_SEEDS.date, enteredAccounts: [noDeposits, ...others] }, undefined))
    expect(screen.queryByText(copy.workingLedgerDeposits, { selector: 'dt' }), 'no deposits row').toBeNull()
    const printed = screen.getByText(copy.workingLedgerLeftOver, { selector: 'dt' }).nextElementSibling?.textContent ?? ''
    const amount = printed.replace(/^\$/, '')
    expect(slots.workingLedgerAmount(amount), 'the premise: a Left over prints').toBe(printed)
    expect(Number(amount.replace(/,/g, '')), 'more left over than `date`’s').toBeGreaterThan(LEFT_OVER_DATE)
    expect(describedTextsOf(leftOverGroup())).toEqual([slots.workingLedgerLeftOverFigure(amount), slots.workingLedgerLeftOverCheckNoDeposits(amount)])
    cleanup()
    openAll(withLeftOver(DEV_SEEDS.date, undefined))
    expect(screen.queryByText(slots.workingLedgerLeftOverCheckNoDeposits('16,985'))).toBeNull()
    expect(screen.getByText(slots.workingLedgerLeftOverCheck('16,985', '20,000', '36,985'))).toBeInTheDocument()
  })

  it('"All of it" on `date` saves { kind: "saved", quotedReal: 16985 } and checks it; "spent" and "not sure" save no figure', () => {
    const { model } = openAll(withLeftOver(DEV_SEEDS.date, undefined))
    pickLeftOver('workingLedgerLeftOverSaved')
    expect(leftOverRadio('workingLedgerLeftOverSaved')).toBeChecked()
    expect(leftOverRadio('workingLedgerLeftOverSpent')).not.toBeChecked()
    expect(screen.getByText(slots.workingLedgerLeftOverSavedLine('16,985'))).toBeInTheDocument()
    save()
    expect(storedLeftOver(model)).toStrictEqual({ kind: 'saved', quotedReal: LEFT_OVER_DATE })
    // "Spent" and "not sure" store no figure (R2): strict, so not even an `undefined` figure key rides.
    pickLeftOver('workingLedgerLeftOverSpent')
    save()
    expect(storedLeftOver(model)).toStrictEqual({ kind: 'spent' })
    pickLeftOver('workingLedgerLeftOverNotSure')
    save()
    expect(storedLeftOver(model)).toStrictEqual({ kind: 'not-sure' })
  })

  it('on `date65` answered "All of it" at its $5,216, the saved line says each working year adds at most $5,216, below later years that print more', () => {
    openAll(withLeftOver(DEV_SEEDS.date65, { kind: 'saved', quotedReal: 5_216 }))
    expect(leftOverRadio('workingLedgerLeftOverSaved')).toBeChecked()
    const savedLine = screen.getByText(slots.workingLedgerLeftOverSavedLine('5,216'))
    const laterLeftOver = slots.workingLedgerLaterLeftOver('')
    const printsMore = screen
      .getAllByText((ownText) => ownText.startsWith(laterLeftOver))
      .filter((el) => Number((el.textContent ?? '').slice(laterLeftOver.length).replace(/,/g, '')) > 5_216)
    expect(printsMore.length, 'the premise: a later year prints more than year 0').toBeGreaterThan(0)
    for (const el of printsMore) expect(el.compareDocumentPosition(savedLine) & Node.DOCUMENT_POSITION_FOLLOWING, el.textContent ?? '').not.toBe(0)
  })

  it('the text above the group, and the group’s own legend and labels, are identical under absent, saved, spent, not sure and saved-moved; only the line below changes (a render diff)', () => {
    const moved = DEV_SEEDS.datesavedmoved
    const states: readonly [string, ScenarioDraft, string][] = [
      ['absent', withLeftOver(moved, undefined), slots.workingLedgerLeftOverAbsentLine('27,537')],
      ['saved', withLeftOver(moved, { kind: 'saved', quotedReal: LEFT_OVER_MOVED_LIVE }), slots.workingLedgerLeftOverSavedLine('27,537')],
      ['spent', withLeftOver(moved, { kind: 'spent' }), slots.workingLedgerLeftOverSpentLine('27,537')],
      ['not sure', withLeftOver(moved, { kind: 'not-sure' }), slots.workingLedgerLeftOverNotSureLine('27,537')],
      ['saved, moved', moved, slots.workingLedgerLeftOverRoseLine('16,985', '27,537')],
    ]
    const above: string[] = []
    const inside: string[] = []
    const below: string[] = []
    for (const [name, d, line] of states) {
      openAll(d)
      const group = leftOverGroup()
      above.push(textBeside(group, 'above'))
      inside.push(group.textContent ?? '')
      below.push(textBeside(group, 'below'))
      expect(group.compareDocumentPosition(screen.getByText(line)) & Node.DOCUMENT_POSITION_FOLLOWING, name).not.toBe(0)
      cleanup()
    }
    expect(above[0]).toContain(slots.workingLedgerLeftOverFigure('27,537'))
    // After the raise the deposits row still reads $20,000, so the check sentence states $27,537 on top of it: $47,537.
    expect(above[0]).toContain(slots.workingLedgerLeftOverCheck('27,537', '20,000', '47,537'))
    for (const [i, [name]] of states.entries()) expect(above[i], name).toBe(above[0])
    for (const key of ['workingLedgerLeftOverLegend', ...LEFT_OVER_LABELS] as const) expect(inside[0], key).toContain(copy[key])
    for (const [i, [name]] of states.entries()) expect(inside[i], name).toBe(inside[0])
    expect(new Set(below).size).toBe(states.length)
    // Not blind to the household: `date`'s picture reads otherwise above the group.
    openAll(withLeftOver(DEV_SEEDS.date, undefined))
    expect(textBeside(leftOverGroup(), 'above')).not.toBe(above[0])
  })

  it('absent’s line differs from not sure’s, and both name the $16,985', () => {
    const absentLine = slots.workingLedgerLeftOverAbsentLine('16,985')
    const notSureLine = slots.workingLedgerLeftOverNotSureLine('16,985')
    openAll(withLeftOver(DEV_SEEDS.date, undefined))
    expect(screen.getByText(absentLine)).toBeInTheDocument()
    expect(screen.queryByText(notSureLine)).toBeNull()
    cleanup()
    openAll(withLeftOver(DEV_SEEDS.date, { kind: 'not-sure' }))
    expect(screen.getByText(notSureLine)).toBeInTheDocument()
    expect(screen.queryByText(absentLine)).toBeNull()
    expect(absentLine).not.toBe(notSureLine)
    for (const l of [absentLine, notSureLine]) expect(l).toContain('$16,985')
  })

  it('on `datesavedmoved`, a re-tap on the already-checked "All of it" saves the live $27,537 and the moved line goes', () => {
    const { model } = openAll(DEV_SEEDS.datesavedmoved)
    const saved = leftOverRadio('workingLedgerLeftOverSaved')
    expect(saved).toBeChecked()
    const movedLine = slots.workingLedgerLeftOverRoseLine('16,985', '27,537')
    expect(screen.getByText(movedLine)).toBeInTheDocument()
    expect(screen.getByText(slots.workingLedgerLeftOverFigure('27,537'))).toBeInTheDocument()
    // A click on a checked radio fires no change event: this is the kit's click path (RC14).
    fireEvent.click(saved)
    expect(screen.queryByText(movedLine)).toBeNull()
    expect(screen.getByText(slots.workingLedgerLeftOverSavedLine('27,537'))).toBeInTheDocument()
    expect(leftOverRadio('workingLedgerLeftOverSaved')).toBeChecked()
    save()
    expect(storedLeftOver(model)).toStrictEqual({ kind: 'saved', quotedReal: LEFT_OVER_MOVED_LIVE })
  })

  it('on `datesavedstale`, the W gate refuses Save; after a yes at today’s quote the question shows $22,985, the stored $16,985 reads as moved, and Save leaves that answer as it was', () => {
    // "All of it" stored at $16,985, then the spending fell from $84,000 to $78,000, so W is stale. A yes at today's
    // $78,000 takes $6,000 less off year 0, so the question then shows $16,985 + $6,000 = $22,985.
    const { model } = openAll(DEV_SEEDS.datesavedstale)
    save()
    expectRefused(model, DEV_SEEDS.datesavedstale, copy.errWorkingCostUnanswered)
    pick('workingCostYes')
    expect(describedTextsOf(leftOverGroup())).toEqual([slots.workingLedgerLeftOverFigure('22,985'), slots.workingLedgerLeftOverCheck('22,985', '20,000', '42,985')])
    expect(leftOverRadio('workingLedgerLeftOverSaved')).toBeChecked()
    expect(screen.getByText(slots.workingLedgerLeftOverRoseLine('16,985', '22,985'))).toBeInTheDocument()
    save()
    expect(stored(model)).toEqual(confirmed(78_000))
    expect(storedLeftOver(model), 'the answer is untouched until a reply is pressed').toStrictEqual({ kind: 'saved', quotedReal: LEFT_OVER_DATE })
  })

  it('never gates: Save passes with the question unanswered or answered, never required, never a field error; the W fork, its twin, is', () => {
    const cases: readonly [string, ScenarioDraft][] = [
      ['unanswered', withLeftOver(DEV_SEEDS.date, undefined)],
      ['saved', withLeftOver(DEV_SEEDS.date, { kind: 'saved', quotedReal: LEFT_OVER_DATE })],
    ]
    for (const [name, d] of cases) {
      const { onClose } = openAll(d)
      const group = leftOverGroup() // on screen, so the silence below is not vacuous
      expect(group, name).not.toHaveAttribute('aria-required')
      for (const radio of within(group).getAllByRole('radio')) expect(radio, name).not.toBeRequired()
      save()
      expect(onClose, `${name}: Save passed`).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert'), name).toBeNull()
      expect(group, name).not.toHaveAttribute('aria-invalid')
      cleanup()
    }
    // The twin: the drawer's one gated choice, the W fork, reads as required and, after a refused Save, shows its error.
    const { onClose } = openAll(dateNoW())
    expect(fork()).toHaveAttribute('aria-required', 'true')
    save()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    expect(fork()).toHaveAttribute('aria-invalid', 'true')
  })
})

/** The typed-below runs (the rebuild's KTD6). The drawer is the SHEET host: the W face above it carries the typed-below
 *  note, so the seat opens on the bare lean and names the answer "This" (`TypedBelowSeatHost`), where the walk's step
 *  opened on the counts sentence and "Your answer". The figures are the walk's hand derivation, unchanged. */
describe('the left-over question — a typed figure below the spending (the rebuild’s KTD6)', () => {
  const RIDER = 'except for any difference between the two answers in income tax and Medicare’s income surcharge'
  const GLOSS = ', the extra Medicare premium you pay when your income two years before was high'

  it('on `datesavedtypedmoved` unanswered ($84,000 typed under $105,000): "All of it" draws the lean, the cap sentence, the lead, the runs and the survivor part as a block BELOW the group, in that reading order; "Spent" takes it away; the text above stays put', () => {
    const { model } = openAll(withLeftOver(DEV_SEEDS.datesavedtypedmoved, undefined))
    const group = leftOverGroup()
    expect(describedTextsOf(group)).toEqual([slots.workingLedgerLeftOverFigureAt('84,000', '26,985'), slots.workingLedgerLeftOverCheck('26,985', '20,000', '46,985')])
    expect(slots.workingLedgerLeftOverFigureAt('84,000', '26,985')).toBe('After everything above, at your figure of $84,000 a year, your first working year has $26,985 left over.')
    const above = textBeside(group, 'above')
    const seat = () => document.querySelector<HTMLElement>('[data-left-over-seat]')!
    expect(seat().querySelector('.note-parts'), 'no runs before an answer').toBeNull()
    pickLeftOver('workingLedgerLeftOverSaved')
    const block = seat().querySelector<HTMLElement>('.note-parts')
    expect(block?.tagName, 'two or more runs draw the block').toBe('DIV')
    expect(seat().lastElementChild, 'the block ends the seat').toBe(block)
    // Year 0 at $105,000 leaves $5,985 (the cap); 2029–2032 split at 2031 (the quote's shortfall $4,015 then $3,652, the
    // credit $16,985 then $17,348); the survivor part at 0.75: $63,000 and $78,750, X $15,750.
    expect(block!.querySelector(':scope > p.note-parts__opening')?.textContent).toBe(
      'A working year almost always costs at least your spending of $105,000 a year. At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year. What each answer adds to your savings in each working year you’re both alive:',
    )
    const credit = (gloss: string): readonly string[] => [
      'The answer at your spending would add at most $5,985 a year. Your answer adds at most $26,985 a year.',
      `At your spending, that’s $21,000 a year less in your savings, ${RIDER}${gloss}.`,
    ]
    expect([...block!.querySelectorAll(':scope > ol.note-parts__runs > li.note-parts__run')].map((li) => [...li.children].map((p) => p.textContent))).toEqual([
      ['2026 through 2028, while you’re still working', ...credit(GLOSS)],
      [
        '2029 through 2030, while you’re still working',
        'At your spending, each working year you’re both alive comes up $4,015 short, which would be taken from your savings, and the answer at that spending would add nothing.',
        'Your figure of $84,000 a year leaves those shortfalls out of your answer, which adds at most $16,985 a year, all that’s left over at your figure in those years.',
        `At your spending, that’s at most $21,000 a year less in your savings, ${RIDER}.`,
      ],
      [
        '2031 through 2032, while you’re still working',
        'At your spending, each working year you’re both alive comes up $3,652 short, which would be taken from your savings, and the answer at that spending would add nothing.',
        'Your figure leaves those shortfalls out of your answer, which adds at most $17,348 a year, all that’s left over at your figure in those years.',
        `At your spending, that’s at most $21,000 a year less in your savings, ${RIDER}.`,
      ],
      ['2033 through 2035, while you’re still working', ...credit('')],
    ])
    expect(block!.querySelector(':scope > p.note-parts__closing')?.textContent).toBe(
      'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year. ' +
        `At your spending, that’s at most $15,750 a year less in your savings, ${RIDER}.`,
    )
    expect([...block!.children].map((c) => `${c.tagName} ${c.className}`)).toEqual(['P note-parts__opening', 'OL note-parts__runs', 'P note-parts__closing'])
    expect(block!.querySelector('ol')?.getAttribute('role'), 'a list in the accessibility tree').toBe('list')
    expect(block!.querySelector('ol')?.textContent, 'the survivor part is never one more run').not.toContain('In a working year with only one of you alive')
    expect(group.compareDocumentPosition(block!) & Node.DOCUMENT_POSITION_FOLLOWING, 'below the group').not.toBe(0)
    expect(textBeside(leftOverGroup(), 'above'), 'the text above the group reads no answer').toBe(above)
    pickLeftOver('workingLedgerLeftOverSpent')
    expect(seat().querySelector('.note-parts'), '"Spent" takes the runs away').toBeNull()
    expect(textBeside(leftOverGroup(), 'above')).toBe(above)
    save()
    expect(storedLeftOver(model)).toStrictEqual({ kind: 'spent' })
  })

  it('`datesavedtyped` (one run): the lean, the cap sentence, then the run’s beats and the survivor part as ONE paragraph below the group, closing on "in each working year you’re both alive" ($63,000 at the figure, $67,500 at the spending: AE2)', () => {
    openAll(DEV_SEEDS.datesavedtyped)
    const p = document.querySelector<HTMLElement>('[data-left-over-at-quote]')
    expect(p?.tagName, 'one run is a paragraph').toBe('P')
    expect(p?.textContent).toBe(
      'A working year almost always costs at least your spending of $90,000 a year. ' +
        'At your spending, your first working year would have $10,985 left over, so the answer at that spending would add at most $10,985 in any working year. ' +
        'Your answer adds at most $16,985 a year to your savings. ' +
        `At your spending, that’s $6,000 less in your savings in each working year you’re both alive, ${RIDER}${GLOSS}. ` +
        'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $67,500 at your spending of $90,000 a year. ' +
        `At your spending, that’s at most $4,500 a year less in your savings, ${RIDER}.`,
    )
    expect(leftOverGroup().compareDocumentPosition(p!) & Node.DOCUMENT_POSITION_FOLLOWING, 'below the group').not.toBe(0)
  })
})
