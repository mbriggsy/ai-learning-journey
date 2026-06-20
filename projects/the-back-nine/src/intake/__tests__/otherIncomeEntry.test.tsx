// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { OtherIncomeEntry, survivorNoteFor } from '../OtherIncomeEntry'
import { IntakeFlow } from '../flow'
import { intakeSteps } from '../questions'
import { compileIncomeStreams } from '../otherIncome'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { IncomeStream } from '@shared/model'
import { copy, slots } from '@ui/copy'

/**
 * R40 U4 — the OtherIncomeEntry form + the other-income loop. The form is the
 * in-flow gate (atomic commit, no-safe-default fields required-to-save); the
 * row summary surfaces the widow's NUMBERS in plain language (never a raw
 * survivorPct). Driven through the REAL flow + model where loop mechanics matter.
 */

const nullClient: EngineClient = {
  runningInWorker: true,
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
  },
}

/** Two named people, both 65, one already-retired (so currentAge is present —
 *  the already-receiving anchor needs it). */
function modelWithPeople(): MemoryModel {
  const m = createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
  m.update((d) => ({
    ...d,
    people: [
      { name: 'Jim', workStatus: 'retired', currentAge: 66, birthYear: 1960, retirementAge: 64 },
      { name: 'Jane', workStatus: 'retired', currentAge: 65, birthYear: 1961, retirementAge: 63 },
    ],
  }))
  return m
}

const setMoney = (label: string, value: string) => {
  const input = screen.getByLabelText(label)
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

function renderEntry(model: MemoryModel, onSave = vi.fn(), initial?: IncomeStream) {
  render(
    <OtherIncomeEntry
      draft={model.getSnapshot().draft}
      initial={initial}
      onSave={onSave}
      onCancel={() => {}}
    />,
  )
  return { onSave }
}

afterEach(cleanup)

describe('OtherIncomeEntry — type-conditional anatomy (the KTD-6 union as a form)', () => {
  it('a pension surfaces the survivor-%, NEVER an alimony date or annuity kind', () => {
    renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    expect(screen.getByLabelText(copy.incomeSurvivorLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText(copy.incomeAlimonyPre2019)).toBeNull()
    expect(screen.queryByLabelText(copy.incomeAnnuityQualified)).toBeNull()
  })

  it('alimony asks the agreement date (NOT a survivor-% — 0 by law) + the modify follow-up only when pre-2019', () => {
    renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypeAlimony))
    expect(screen.queryByLabelText(copy.incomeSurvivorLabel)).toBeNull() // 0 by law — not asked
    expect(screen.getByLabelText(copy.incomeAlimonyPre2019)).toBeInTheDocument()
    // The modify follow-up appears ONLY for a pre-2019 agreement.
    expect(screen.queryByLabelText(copy.incomeAlimonyModifiedNo)).toBeNull()
    fireEvent.click(screen.getByLabelText(copy.incomeAlimonyPre2019))
    expect(screen.getByLabelText(copy.incomeAlimonyModifiedNo)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(copy.incomeAlimonyPost2018))
    expect(screen.queryByLabelText(copy.incomeAlimonyModifiedNo)).toBeNull() // post-2018 ⇒ no follow-up
  })

  it('a non-qualified annuity asks the exclusion fraction; a qualified one does not', () => {
    renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypeAnnuity))
    expect(screen.queryByLabelText(copy.incomeExclusionLabel)).toBeNull()
    fireEvent.click(screen.getByLabelText(copy.incomeAnnuityNonQualified))
    expect(screen.getByLabelText(copy.incomeExclusionLabel)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(copy.incomeAnnuityQualified))
    expect(screen.queryByLabelText(copy.incomeExclusionLabel)).toBeNull()
  })

  it('the fixed-pct COLA rate field appears ONLY for fixed-pct (required-and-finite, KTD-2)', () => {
    renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    expect(screen.queryByLabelText(copy.incomeColaPctLabel)).toBeNull()
    fireEvent.click(screen.getByLabelText(copy.incomeColaFixed))
    expect(screen.getByLabelText(copy.incomeColaPctLabel)).toBeInTheDocument()
  })

  it('the start-age field appears only for "starts later" — "receiving now" anchors at the owner age (KTD-8b)', () => {
    renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    expect(screen.queryByLabelText(copy.incomeStartAgeLabel)).toBeNull()
    fireEvent.click(screen.getByLabelText(copy.incomeTimingLater))
    expect(screen.getByLabelText(copy.incomeStartAgeLabel)).toBeInTheDocument()
  })
})

describe('OtherIncomeEntry — the no-safe-default atomic-commit gate (R40.7)', () => {
  it('a pension WITHOUT a survivor-% never commits (no safe default — the optimistic widow sin)', () => {
    const { onSave } = renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    setMoney(copy.incomeAmountLabel, '30000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaReal))
    // survivor-% left EMPTY — the gate holds the form open.
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('an already-receiving pension WITH a survivor-% commits: startAge anchored at the owner age (KTD-8b)', () => {
    const { onSave } = renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension)) // Jim, owner 0, age 66
    setMoney(copy.incomeAmountLabel, '30000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaReal))
    setMoney(copy.incomeSurvivorLabel, '50') // percent → fraction 0.5
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      ownerIndex: 0,
      type: 'pension',
      annualRealToday: 30_000,
      startAge: 66, // anchored at the owner's current age (already-receiving)
      colaMode: 'real-flat',
      survivorPct: 0.5,
    })
  })

  it('a fixed-pct stream WITHOUT a colaPct never commits, and names the missing rate (calm, not coerced to 0)', () => {
    const { onSave } = renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    setMoney(copy.incomeAmountLabel, '40000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaFixed))
    setMoney(copy.incomeSurvivorLabel, '100')
    // colaPct left EMPTY.
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(copy.errIncomeColaPct)
  })

  it('alimony commits with survivorPct DERIVED to 0 (by law), carrying the agreement date', () => {
    const { onSave } = renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypeAlimony))
    setMoney(copy.incomeAmountLabel, '18000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaNominal))
    fireEvent.click(screen.getByLabelText(copy.incomeAlimonyPost2018))
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      type: 'alimony',
      executedAfter2018: true,
      survivorPct: 0, // derived, never asked
    })
  })

  it('a non-qual annuity needs the exclusion fraction to commit; a qualified one needs only the kind', () => {
    // non-qual: missing exclusion ⇒ no commit
    const { onSave } = renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypeAnnuity))
    setMoney(copy.incomeAmountLabel, '20000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaNominal))
    setMoney(copy.incomeSurvivorLabel, '50')
    fireEvent.click(screen.getByLabelText(copy.incomeAnnuityNonQualified))
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(onSave).not.toHaveBeenCalled()
    setMoney(copy.incomeExclusionLabel, '40') // → 0.4
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      type: 'annuity',
      qualified: false,
      exclusionFraction: 0.4,
    })
  })

  it('the advanced tier (end age + basis-recovery taxable) is collapsed by default; opening it reveals the optional fields', () => {
    renderEntry(modelWithPeople())
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    expect(screen.queryByLabelText(copy.incomeEndAgeLabel)).toBeNull()
    expect(screen.queryByLabelText(copy.incomeTaxableLabel)).toBeNull()
    const toggle = screen.getByRole('button', { name: copy.incomeAdvancedToggle })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText(copy.incomeEndAgeLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(copy.incomeTaxableLabel)).toBeInTheDocument()
  })
})

describe('the other-income loop — widow’s-numbers summary + the not-saved affordance', () => {
  function Harness({ model }: { model: MemoryModel }) {
    const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
    const steps = useMemo(() => intakeSteps(snap.draft), [snap.draft])
    return <IntakeFlow steps={steps} model={model} />
  }

  const walkToOtherIncome = () => {
    let guard = 0
    while (screen.getByRole('heading', { level: 2 }).textContent !== copy.qOtherIncomeHeading) {
      // The spend step's period force-confirm blocks a blind Next until the unit
      // is explicitly answered (R19) — tap it (the figure was entered annual).
      const periodYear = screen.queryByLabelText(copy.periodYear)
      if (periodYear !== null) fireEvent.click(periodYear)
      fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
      if (++guard > 20) throw new Error('walk did not reach the other-income step')
    }
  }

  it('renders the form, toggles already-receiving, commits, and surfaces the widow’s number — never a raw survivorPct', () => {
    const m = modelWithPeople()
    // The spend + ACA preamble facts so the flow can reach the (last) other-income step.
    m.update((d) => ({
      ...d,
      annualSpendingReal: 60_000,
      spendEntryPeriod: 'year',
      health: { ...d.health, irmaaMagiSeed: [50_000, 50_000] },
    }))
    render(<Harness model={m} />)
    walkToOtherIncome()

    expect(screen.getByText(copy.otherIncomeEmpty)).toBeInTheDocument()
    // The not-saved-yet affordance is a role=note (NOT an alert, NOT a red badge).
    const note = screen.getByRole('note')
    expect(note.textContent).toBe(copy.notSavedYet)

    fireEvent.click(screen.getByRole('button', { name: copy.addOtherIncome }))
    // Owner Jane (index 1); a pension she's receiving now, 50% survivor.
    fireEvent.click(screen.getByLabelText('Jane'))
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    setMoney(copy.incomeAmountLabel, '24000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaReal))
    setMoney(copy.incomeSurvivorLabel, '50')
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))

    // Committed to the single draft.
    expect(m.getSnapshot().draft.incomeStreams).toHaveLength(1)
    const stream = m.getSnapshot().draft.incomeStreams[0]!
    expect(stream).toMatchObject({ ownerIndex: 1, type: 'pension', survivorPct: 0.5 })

    // The widow's NUMBER in plain language: Jim would keep 50% if Jane passes.
    // (keeper = the OTHER spouse, owner = the stream owner.) Never a raw 0.5.
    expect(screen.getByText(slots.incomeSurvivorNote('Jim', 'Jane', 0.5))).toBeInTheDocument()
    expect(screen.queryByText(/0\.5/)).toBeNull() // the raw fraction never appears
  })

  it('the loop edits + two-tap removes through the single draft (back-nav-safe)', () => {
    const m = modelWithPeople()
    m.update((d) => ({
      ...d,
      annualSpendingReal: 60_000,
      spendEntryPeriod: 'year',
      health: { ...d.health, irmaaMagiSeed: [50_000, 50_000] },
      incomeStreams: [
        { ownerIndex: 0, type: 'rental', annualRealToday: 18_000, startAge: 66, colaMode: 'real-flat', survivorPct: 1 },
      ],
    }))
    render(<Harness model={m} />)
    walkToOtherIncome()

    // The row summary uses the income slot (type · owner · ~$X/yr).
    expect(
      screen.getByText(slots.incomeSummary(copy.incomeTypeRental, 'Jim', '18,000')),
    ).toBeInTheDocument()
    // survivorPct 1 ⇒ "keep all of this" (the full-continuation widow note).
    expect(screen.getByText(slots.incomeSurvivorNote('Jane', 'Jim', 1))).toBeInTheDocument()

    // Two-tap remove (no undo once gone).
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeRemove }))
    expect(m.getSnapshot().draft.incomeStreams).toHaveLength(1) // armed, not removed
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeRemoveConfirm }))
    expect(m.getSnapshot().draft.incomeStreams).toHaveLength(0)
    expect(screen.getByText(copy.otherIncomeEmpty)).toBeInTheDocument()
  })
})

describe('survivorNoteFor — the widow’s-picture wording (golden-pinned, amount-free)', () => {
  const draft = (): ScenarioDraft => {
    const m = modelWithPeople()
    return m.getSnapshot().draft
  }

  it('alimony (0%) → "ends if {owner} passes"', () => {
    const s: IncomeStream = { ownerIndex: 0, type: 'alimony', executedAfter2018: true, annualRealToday: 18_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0 }
    expect(survivorNoteFor(draft(), s)).toBe('This ends if Jim passes.')
  })

  it('100% → "would keep all of this"', () => {
    const s: IncomeStream = { ownerIndex: 1, type: 'rental', annualRealToday: 18_000, startAge: 64, colaMode: 'real-flat', survivorPct: 1 }
    expect(survivorNoteFor(draft(), s)).toBe('Jim would keep all of this if Jane passes.')
  })

  it('a partial share → "would keep N%" (the rounded percent, never a raw fraction)', () => {
    const s: IncomeStream = { ownerIndex: 1, type: 'pension', annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0.5 }
    expect(survivorNoteFor(draft(), s)).toBe('Jim would keep 50% of this if Jane passes.')
  })
})

// A bridge to the compile (U2): a stream committed through the form compiles to
// the correct two-variant leaf — proving the FORM output is engine-consumable.
describe('the form output is engine-consumable (form → compileIncomeStreams)', () => {
  it('a 50%-survivor real-flat pension compiles to a half-weight survivor variant (EXTERNALLY-derived golden)', () => {
    // The exact shape the form commits for "Jane, pension, $24k, receiving now, real-flat, 50% survivor".
    const s: IncomeStream = { ownerIndex: 1, type: 'pension', annualRealToday: 24_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0.5 }
    const out = compileIncomeStreams([s], [66, 65], 6, 0.03)!
    const leaf = out.incomeByPerson[1]!
    // Hand-derived (DND/012): real-flat holds 24_000 every year; survivor = ×0.5 = 12_000.
    expect(leaf.grossFull!.every((v) => v === 24_000)).toBe(true)
    expect(leaf.grossSurvivor!.every((v) => v === 12_000)).toBe(true)
    expect(leaf.taxableFull!.every((v) => v === 24_000)).toBe(true) // pension fully taxable (default)
    expect(out.incomeByPerson[0]).toEqual({}) // Jim has no stream
  })

  it('a teacher’s-pension shape (nominal-flat, 60% survivor) — the COLA-DEFLATION × survivor MAGNITUDE oracle (DND/012)', () => {
    // The most dangerous number in the app: a wife's teacher pension, no COLA (nominal-flat ⇒ erodes
    // in real terms), 60% survivor. Hand-derived by an INDEPENDENT path — NOT by running the compile:
    //   real[t] = 36000 / 1.03^t  (nominal-flat ⇒ pure deflation at the 0.03 point estimate)
    //     t=0: 36000
    //     t=1: 36000 / 1.03            = 34951.456310679610...  (computed long-hand, cross-checked
    //     t=2: 36000 / 1.03^2          = 33933.452728815156...   against the recurrence real[t] =
    //     t=3: 36000 / 1.03^3          = 32945.099736713744...   real[t-1] / 1.03, agreeing to 1e-6)
    //   survivor[t] = real[t] × 0.60   (the per-stream survivor weight, KTD-4)
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 36_000, startAge: 60, colaMode: 'nominal-flat', survivorPct: 0.6 }
    const leaf = compileIncomeStreams([s], [66, 65], 4, 0.03)!.incomeByPerson[0]!
    expect(leaf.grossFull![0]).toBe(36_000) // the KTD-8b anchor (already-receiving)
    expect(leaf.grossFull![1]).toBeCloseTo(34_951.456311, 5)
    expect(leaf.grossFull![2]).toBeCloseTo(33_933.452729, 5)
    expect(leaf.grossFull![3]).toBeCloseTo(32_945.099737, 5)
    // The widow's magnitude: 60% of the deflating curve, per-stream weighted.
    expect(leaf.grossSurvivor![0]).toBeCloseTo(21_600, 5) // 36000 × 0.6
    expect(leaf.grossSurvivor![1]).toBeCloseTo(20_970.873786, 5) // 34951.4563… × 0.6
    expect(leaf.grossSurvivor![3]).toBeCloseTo(19_767.059842, 5) // 32945.0997… × 0.6
  })
})
