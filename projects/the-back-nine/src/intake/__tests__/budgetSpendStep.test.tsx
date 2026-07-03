// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { intakeSteps } from '../questions'
import { IntakeFlow } from '../flow'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy, slots } from '@ui/copy'
import { formatMoney } from '../fields'
import type { BudgetLineItem } from '@shared/model'

/**
 * The GOVERNED spend question (U9b — council 2026-07-02 Q4) driven through the REAL
 * flow + model — the store-integration half of the budget battery. Under a governing
 * budget the raw spend field is a budget-blind second writer of `annualSpendingReal`,
 * so the question renders READ-ONLY text (the input node ABSENT, not disabled — an
 * affordance that cannot change the outcome should not exist, insight 054), a steer
 * into the builder, and the sheet's Apply commits the ATOMIC reconciliation patch:
 * the store's `annualSpendingReal` must land at exactly Σ(lines active at year 0) + M
 * (the compile-injected OOP medical) in the SAME update as the items — read from the
 * store's CURRENT draft inside the update, never a render closure (insight 036).
 */

// jsdom has no matchMedia (the sheet's useReducedMotion reads it) — benign stub.
vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('budget-sheet-open')
})

const nullClient: EngineClient = {
  runningInWorker: true,
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
}

/** Mount the flow on the SPEND step alone — the real StepApi wiring, one question. */
function SpendHarness({ model }: { model: MemoryModel }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(
    () => intakeSteps(snap.draft).filter((s) => s.id === 'spend'),
    [snap.draft],
  )
  return <IntakeFlow steps={steps} model={model} />
}

/** The oop-medical step in isolation — the SECOND budget-blind writer the reconciliation
 *  invariant must survive (ultramode 2026-07-02, P1). */
function OopHarness({ model }: { model: MemoryModel }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(
    () => intakeSteps(snap.draft).filter((s) => s.id === 'oop-medical'),
    [snap.draft],
  )
  return <IntakeFlow steps={steps} model={model} />
}

const draft = (model: MemoryModel): ScenarioDraft => model.getSnapshot().draft

const line = (patch?: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: '',
  annualAmountReal: 30_000,
  tier: 'essentials',
  startYear: 0,
  ...patch,
})

const M = 8_000

/** A model whose budget GOVERNS: two lines (one starting later) + an OOP-medical figure,
 *  with the scalar already reconciled the way the atomic patch would leave it. */
function governedModel(): MemoryModel {
  const m = freshModel()
  m.update((d) => ({
    ...d,
    budget: [line(), line({ category: 'travel', label: 'Trips', annualAmountReal: 6_000, tier: 'discretionary', startYear: 3 })],
    annualSpendingReal: 30_000 + M, // Σactive@0 (30k) + M — the reconciled invariant
    health: { ...d.health, oopMedicalAnnual: M },
  }))
  return m
}

const commitField = (input: HTMLElement, value: string) => {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('the spend step under a GOVERNING budget (Q4 — no second writer)', () => {
  it('renders READ-ONLY text: the input node is ABSENT (never disabled), the governed note + steer present', () => {
    const m = governedModel()
    render(<SpendHarness model={m} />)
    // The raw arm's currency input is gone — no input of any kind on the step body.
    expect(document.querySelector('.step-body input')).toBeNull()
    expect(screen.getByText(slots.spendBudgetTotal(formatMoney(38_000)))).toBeInTheDocument()
    expect(screen.getByText(copy.spendBudgetGovernedNote)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.spendEditBudgetCta })).toBeInTheDocument()
  })

  it('a RAMPED governing budget carries the anchor-not-steady-state disclosure on the step', () => {
    render(<SpendHarness model={governedModel()} />)
    expect(screen.getByText(copy.budgetAnchorRampNote)).toBeInTheDocument()
  })

  it('a lifelong-at-0 governing budget does NOT show the ramp disclosure', () => {
    const m = freshModel()
    m.update((d) => ({
      ...d,
      budget: [line()],
      annualSpendingReal: 30_000,
    }))
    render(<SpendHarness model={m} />)
    expect(screen.queryByText(copy.budgetAnchorRampNote)).toBeNull()
  })

  it('the steer opens the sheet seeded with the governing lines', () => {
    render(<SpendHarness model={governedModel()} />)
    fireEvent.click(screen.getByRole('button', { name: copy.spendEditBudgetCta }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.querySelectorAll('.budget-line')).toHaveLength(2)
  })

  it('Apply commits the ATOMIC patch: annualSpendingReal === Σactive@0 + M, in the same update as the items', () => {
    const m = governedModel()
    render(<SpendHarness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.spendEditBudgetCta }))

    // Raise the year-0 food line 30k → 40k; the year-3 travel line stays out of the anchor.
    const amounts = screen.getAllByLabelText(copy.budgetAmountLabel)
    commitField(amounts[0]!, '40,000')
    fireEvent.click(screen.getByRole('button', { name: copy.budgetApply }))

    const d = draft(m)
    expect(d.budget).toHaveLength(2)
    expect(d.budget![0]!.annualAmountReal).toBe(40_000)
    // The reconciliation invariant: Σactive@0 (40k; the year-3 line is not) + M (8k).
    expect(d.annualSpendingReal).toBe(48_000)
    // The governed read-only value re-renders to the SAME figure (one writer, no desync).
    expect(screen.getByText(slots.spendBudgetTotal(formatMoney(48_000)))).toBeInTheDocument()
  })

  it('the escape returns to a single number: budget strictly undefined, the scalar KEEPS its last reconciled value, the raw field returns', () => {
    const m = governedModel()
    render(<SpendHarness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.spendEditBudgetCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.budgetBackToSingle }))

    const d = draft(m)
    expect(d.budget).toBeUndefined()
    expect('budget' in d && d.budget === undefined).toBe(true) // never []
    expect(d.annualSpendingReal).toBe(38_000) // untouched — the scalar keeps governing
    // The raw arm is back: an editable currency input, no governed note, no steer.
    expect(screen.getByLabelText(copy.spendLabel)).toBeInTheDocument()
    expect(screen.queryByText(copy.spendBudgetGovernedNote)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.spendEditBudgetCta })).toBeNull()
  })

  it('removing every line and Applying is the SAME escape (never budget: [])', () => {
    const m = freshModel()
    m.update((d) => ({
      ...d,
      budget: [line()],
      annualSpendingReal: 30_000,
    }))
    render(<SpendHarness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.spendEditBudgetCta }))
    fireEvent.click(screen.getByRole('button', { name: slots.budgetRemoveLine(copy.budgetCatFood) }))
    fireEvent.click(screen.getByRole('button', { name: copy.budgetApply }))

    const d = draft(m)
    expect(d.budget).toBeUndefined()
    expect(d.annualSpendingReal).toBe(30_000)
    expect(screen.getByLabelText(copy.spendLabel)).toBeInTheDocument()
  })
})

describe('the spend step with NO budget (the control arm)', () => {
  it('renders the raw editable field and none of the governed chrome', () => {
    render(<SpendHarness model={freshModel()} />)
    expect(screen.getByLabelText(copy.spendLabel)).toBeInTheDocument()
    expect(screen.queryByText(copy.spendBudgetGovernedNote)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.spendEditBudgetCta })).toBeNull()
  })
})

describe('the OOP-medical step is the SECOND budget-blind writer — must keep the reconciliation invariant (ultramode 2026-07-02, P1)', () => {
  it('under a GOVERNING budget, editing OOP medical re-reconciles annualSpendingReal = Σactive@0 + newM in the SAME update', () => {
    const m = governedModel() // budget: food@30k + travel@3yr; M=8k; annualSpendingReal=38k
    render(<OopHarness model={m} />)
    // Change M 8k -> 20k. The year-0 full total must move to Σactive@0 (30k) + 20k = 50k, so the
    // engine's reconciliation backstop can't fire and demote the confident answer to indeterminate.
    commitField(screen.getByLabelText(copy.oopLabel), '20000')
    const d = draft(m)
    expect(d.health.oopMedicalAnnual).toBe(20_000)
    expect(d.budget).toHaveLength(2) // budget still governs, untouched
    expect(d.annualSpendingReal).toBe(50_000) // 30k year-0 lines + 20k medical — re-reconciled atomically
  })

  it('with NO budget governing, editing OOP medical leaves annualSpendingReal alone (M is a plain input again)', () => {
    const m = freshModel()
    m.update((d) => ({ ...d, annualSpendingReal: 60_000 }))
    render(<OopHarness model={m} />)
    commitField(screen.getByLabelText(copy.oopLabel), '9000')
    const d = draft(m)
    expect(d.health.oopMedicalAnnual).toBe(9_000)
    expect(d.annualSpendingReal).toBe(60_000) // untouched — no budget, no reconciliation to keep
  })
})

// Cold-read 2026-07-03 — the three fixes this file's surface carries:
// (1) the RAW arm gains the in-flow itemize invite (the budget builds where the question is
//     asked, the accounts-step grammar; the Result door remains the later-edit path);
// (2) the tier answer is SEEN used — the governed face reads back essentials vs extras;
// (3) the sheet's quiet close is honestly worded 'Cancel' (was 'Not now').
describe('the raw spend arm — the in-flow itemize invite (cold-read 2026-07-03)', () => {
  it('renders the invite alongside the raw field, and it opens the builder', () => {
    const m = freshModel()
    render(<SpendHarness model={m} />)
    expect(screen.getByLabelText(copy.spendLabel)).toBeInTheDocument() // the raw field stays
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCta }))
    expect(screen.getByRole('heading', { name: copy.budgetSheetTitle })).toBeInTheDocument()
  })

  it('Apply from the raw arm lands the atomic patch and the step becomes the governed face', () => {
    const m = freshModel()
    m.update((d) => ({ ...d, health: { ...d.health, oopMedicalAnnual: M } }))
    render(<SpendHarness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.budgetAddLine }))
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '30000')
    fireEvent.click(screen.getByRole('button', { name: copy.budgetApply }))
    expect(draft(m).annualSpendingReal).toBe(30_000 + M) // Σactive@0 + M — the same invariant
    expect(screen.queryByLabelText(copy.spendLabel)).toBeNull() // the raw input is gone
    expect(screen.getByText(copy.spendBudgetGovernedNote)).toBeInTheDocument()
  })

  it('the invite never gates: a typed number alone leaves the step exactly as before', () => {
    const m = freshModel()
    render(<SpendHarness model={m} />)
    commitField(screen.getByLabelText(copy.spendLabel), '60000')
    expect(draft(m).annualSpendingReal).toBe(60_000 * 12) // month default until declared
    expect(screen.getByRole('button', { name: copy.budgetCta })).toBeInTheDocument()
  })
})

describe('the governed face — the tier readback (cold-read 2026-07-03)', () => {
  it('reads back essentials vs extras from the year-0 lines (lines only — OOP rides its own note)', () => {
    const m = governedModel()
    m.update((d) => ({
      ...d,
      budget: [line(), line({ category: 'travel', annualAmountReal: 12_000, tier: 'discretionary' })],
      annualSpendingReal: 42_000 + M,
    }))
    render(<SpendHarness model={m} />)
    expect(
      screen.getByText(slots.budgetTierSplit(formatMoney(30_000), formatMoney(12_000))),
    ).toBeInTheDocument()
  })
})
