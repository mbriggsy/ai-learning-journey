// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BudgetBuilder, medicalExceedsTotal } from '../BudgetBuilder'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy, slots } from '@ui/copy'
import { formatMoney } from '../fields'
import type { BudgetLineItem } from '@shared/model'

/**
 * The budget-builder SHEET (U9b — council 2026-07-02 Q1/Q5 + the seven build-gates).
 * Direct mounts over a real store-minted draft: the component is presentational +
 * local state over props, so the commit SEAM (onApply/onEscape/onClose routing, the
 * R19 gate, the announce) is what this battery pins. The STORE-level atomic-patch
 * arm lives in budgetSpendStep.test.tsx (the flow-wired mount); the door arms live
 * in resultBudgetDoor.test.tsx.
 *
 * Key laws under test:
 *  - R19 timing: errors silent until touched (or an Apply attempt), then adjacent
 *    per-kind messages; warnings NEVER block.
 *  - Blocked Apply: aria-disabled (never native disabled) + the ANNOUNCED reason —
 *    tested from the app's real closed-at-mount shape (the announcer must survive
 *    the sheet's conditional portal — insight 047's consumer-#2 shape).
 *  - Q5 structural shell: opening persists nothing; an empty Apply is the escape
 *    when a budget GOVERNS, and BLOCKS with the announced reason when none does
 *    (Card 9: a silent close made the primary a second Cancel) — never `budget: []`.
 *  - Build-gate 1: the lines-target NETS the injected OOP medical (max(0, S−M));
 *    absent/zero M withholds the target+carried lines, never fabricates.
 *  - Close-without-apply preserves local edits; a clean reopen re-seeds from the
 *    governing draft.
 */

// jsdom has no matchMedia (useReducedMotion reads it) — provide a benign stub.
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
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
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

/** A store-minted draft (never a hand-built literal) with the given patch applied. */
function draftWith(mutate?: (d: ScenarioDraft) => ScenarioDraft): ScenarioDraft {
  const m = freshModel()
  if (mutate) m.update(mutate)
  return m.getSnapshot().draft
}

const line = (patch?: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: '',
  annualAmountReal: 30_000,
  tier: 'essentials',
  startYear: 0,
  ...patch,
})

const noop = () => {}

function Host({
  draft,
  open = true,
  onApply = noop,
  onEscape = noop,
  onClose = noop,
}: {
  draft: ScenarioDraft
  open?: boolean
  onApply?: (items: readonly BudgetLineItem[]) => void
  onEscape?: () => void
  onClose?: () => void
}) {
  return <BudgetBuilder open={open} draft={draft} onApply={onApply} onEscape={onEscape} onClose={onClose} />
}

const applyBtn = () => screen.getByRole('button', { name: copy.budgetApply })
const addBtn = () => screen.getByRole('button', { name: copy.budgetAddLine })
const sheetLiveRegion = () => document.querySelector('.budget-sheet > .sr-only[role="status"]')

/** Commit a value through a blur-committing field (the intake primitives' contract). */
const commitField = (input: HTMLElement, value: string) => {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('BudgetBuilder — the Q5 structural shell', () => {
  it('opening over NO budget renders zero rows and commits nothing (the shell persists only on Apply)', () => {
    const onApply = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.querySelectorAll('.budget-line')).toHaveLength(0)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('an empty Apply while NO budget governs BLOCKS and SPEAKS — never a silent second Cancel (Card 9, 2026-08-01)', () => {
    // The cold-read panel's 7-of-7 convergence, and it is the UNIVERSAL first-open frame: `rows`
    // seeds from `draft.budget ?? []`, nothing in the store ever writes `budget`, and there is no
    // essentials template anywhere in the repo — so every first open of this sheet is empty.
    // "Use this budget" is the filled primary over that empty list; falling through to onClose()
    // made it functionally identical to the quiet Cancel link beside it, with nothing on screen
    // saying so (the insight-100 family — a promise verb owes a rendered outcome). It now rides
    // the file's ONE blocked-commit idiom: aria-disabled (never native disabled, so it stays
    // focusable to speak) + the announced reason. Build-gate 2 is untouched — `[]` still never
    // reaches the store. The EMPTY+GOVERNING escape is a different arm and keeps its own test below.
    const onApply = vi.fn()
    const onEscape = vi.fn()
    const onClose = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} onEscape={onEscape} onClose={onClose} />)

    // The RENDERED half — the muted, operable state (save.css's global opacity 0.55 rule, a
    // LIGHTNESS cue and never hue, so the colour-blind law is satisfied).
    expect(applyBtn()).toHaveAttribute('aria-disabled', 'true')
    expect(applyBtn()).not.toBeDisabled()

    // THE EMPHASIS FLIP (Briggsy's call, 2026-08-02). Blocking the CTA was only half the fix: the
    // frame still pointed its weight at the control that cannot act while the one real path forward
    // ("Add a line") was a small underlined link beneath it. On the empty frame the two trade
    // places. Asserted as CLASS rather than computed style on purpose — jsdom does not load the
    // stylesheets, so a computed-opacity assertion here would be vacuously green; the real pixel
    // proof is the Chromium run recorded in the commit.
    expect(addBtn(), 'the only path forward wears the primary on the empty frame').toHaveClass('btn-primary')
    expect(applyBtn(), 'and the CTA that cannot act drops to quiet').toHaveClass('btn-quiet')

    // The BEHAVIOURAL half — the mutant-killer: pressing it is not a close.
    fireEvent.click(applyBtn())
    expect(onClose).not.toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
    expect(onEscape).not.toHaveBeenCalled()
    expect(sheetLiveRegion()!.textContent).toBe(copy.budgetApplyEmpty)

    // …AND THE FLIP REVERSES THE MOMENT IT SHOULD — the same predicate, driven the other way, so
    // neither half can be satisfied by a component that simply hardcodes one arrangement. Adding a
    // line makes "Use this budget" the genuine next step and it takes the primary back.
    fireEvent.click(addBtn())
    expect(applyBtn(), 'a line exists — the CTA is the real next step again').toHaveClass('btn-primary')
    expect(addBtn(), 'and "Add a line" returns to quiet').toHaveClass('btn-quiet')
    // Still aria-disabled, for a DIFFERENT and honest reason: the fresh line carries NaN until an
    // amount is typed (freshLine's "never a silent 0"). Blocked-because-empty and
    // blocked-because-invalid are different states and must not be conflated.
    expect(applyBtn()).toHaveAttribute('aria-disabled', 'true')

    // NON-VACUITY, on the SAME predicate the assertion above negates: the onClose spy DOES fire,
    // and the way out is still one tap (R8's never-a-gate).
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCancel }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('an empty Apply while a budget GOVERNS routes to ESCAPE (rows all removed = back to a single number)', () => {
    const onApply = vi.fn()
    const onEscape = vi.fn()
    const governing = draftWith((d) => ({ ...d, budget: [line()], annualSpendingReal: 30_000 }))
    render(<Host draft={governing} onApply={onApply} onEscape={onEscape} />)
    // Remove the one seeded row, then Apply the now-empty sheet.
    fireEvent.click(screen.getByRole('button', { name: slots.budgetRemoveLine(copy.budgetCatFood) }))
    fireEvent.click(applyBtn())
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('the escape hatch renders ONLY when a budget governs, and fires onEscape', () => {
    const onEscape = vi.fn()
    const { rerender } = render(<Host draft={draftWith()} onEscape={onEscape} />)
    expect(screen.queryByRole('button', { name: copy.budgetBackToSingle })).toBeNull()

    rerender(<Host draft={draftWith((d) => ({ ...d, budget: [line()] }))} onEscape={onEscape} />)
    fireEvent.click(screen.getByRole('button', { name: copy.budgetBackToSingle }))
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('a fresh line defaults to other + essentials (the err-STICKY unclassified pick) with NO amount', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    expect(screen.getByLabelText(copy.budgetCatLabel)).toHaveValue('other')
    expect(screen.getByLabelText(copy.budgetTierEssentials)).toBeChecked()
    expect(screen.getByLabelText(copy.budgetAmountLabel)).toHaveValue('')
  })
})

describe('BudgetBuilder — R19 validation timing + per-kind errors', () => {
  it('a fresh line shows NO error until touched or an Apply attempt (silent while typing)', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('an Apply attempt reveals the missing-amount error and does NOT commit', () => {
    const onApply = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} />)
    fireEvent.click(addBtn())
    fireEvent.click(applyBtn())
    expect(screen.getByText(copy.errBudgetAmountNonFinite)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('blurring a field marks its LINE touched — the error shows on leave, not next Apply', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    commitField(screen.getByLabelText(copy.budgetAmountLabel), 'garbage')
    expect(screen.getByText(copy.errBudgetAmountNonFinite)).toBeInTheDocument()
  })

  it('a NEGATIVE seeded amount renders its own message on attempt (UI entry cannot type it; a draft can carry it)', () => {
    const governing = draftWith((d) => ({ ...d, budget: [line({ annualAmountReal: -500 })] }))
    render(<Host draft={governing} />)
    fireEvent.click(applyBtn())
    expect(screen.getByText(copy.errBudgetAmountNegative)).toBeInTheDocument()
  })

  it('a NEGATIVE seeded start year renders its own message on attempt', () => {
    const governing = draftWith((d) => ({ ...d, budget: [line({ startYear: -2 })] }))
    render(<Host draft={governing} />)
    fireEvent.click(applyBtn())
    expect(screen.getByText(copy.errBudgetWindowNegativeStart)).toBeInTheDocument()
  })

  it('a non-integer window entry (cleared to NaN by the integer field) names the whole-years rule on blur', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    commitField(screen.getByLabelText(copy.budgetWindowFromLabel), '2.5')
    expect(screen.getByText(copy.errBudgetWindowNonInteger)).toBeInTheDocument()
  })

  it('a reversed window (through < from) names the swap on blur', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    commitField(screen.getByLabelText(copy.budgetWindowFromLabel), '5')
    commitField(screen.getByLabelText(copy.budgetWindowThroughLabel), '2')
    expect(screen.getByText(copy.errBudgetWindowReversed)).toBeInTheDocument()
  })

  // ultramode 2026-07-02 (P2/P3): the Through field must NOT silently swallow an invalid
  // non-empty entry as lifelong. Empty = lifelong (valid); "2.5"/"-3" = a typo that every
  // OTHER field surfaces — the Through field owes the same honesty affordance (insight 054).
  it('a non-integer THROUGH-year entry names the whole-years rule and blocks Apply (never silently lifelong)', () => {
    const onApply = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} />)
    fireEvent.click(addBtn())
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '12,000')
    commitField(screen.getByLabelText(copy.budgetWindowThroughLabel), '2.5')
    expect(screen.getByText(copy.errBudgetWindowNonInteger)).toBeInTheDocument()
    fireEvent.click(applyBtn())
    expect(onApply).not.toHaveBeenCalled() // blocked — not committed as a lifelong line
  })

  it('a NEGATIVE through-year entry also errors (not swallowed to lifelong)', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    commitField(screen.getByLabelText(copy.budgetWindowThroughLabel), '-3')
    expect(screen.getByText(copy.errBudgetWindowNonInteger)).toBeInTheDocument()
  })

  it('a CLEARED through-year is still the lifelong encoding — empty is valid, only invalid errors', () => {
    const onApply = vi.fn()
    const governing = draftWith((d) => ({ ...d, budget: [line({ endYear: 12 })], annualSpendingReal: 30_000 }))
    render(<Host draft={governing} onApply={onApply} />)
    commitField(screen.getByLabelText(copy.budgetWindowThroughLabel), '')
    expect(screen.queryByRole('alert')).toBeNull() // empty is not an error
    fireEvent.click(applyBtn())
    expect(onApply).toHaveBeenCalledTimes(1)
    const item = onApply.mock.calls[0]![0][0] as BudgetLineItem
    expect('endYear' in item).toBe(false) // absent = lifelong
  })

  it('one bad line does not leak its error onto a clean sibling (errors are line-scoped)', () => {
    const governing = draftWith((d) => ({
      ...d,
      budget: [line(), line({ category: 'travel', annualAmountReal: -1 })],
    }))
    render(<Host draft={governing} />)
    fireEvent.click(applyBtn())
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.textContent).toBe(copy.errBudgetAmountNegative)
  })
})

describe('BudgetBuilder — the blocked Apply (aria-disabled + the announced reason)', () => {
  it('while blocked, Apply is aria-disabled (never native disabled — it must stay focusable to speak)', () => {
    render(<Host draft={draftWith()} />)
    fireEvent.click(addBtn())
    expect(applyBtn()).toHaveAttribute('aria-disabled', 'true')
    expect(applyBtn()).not.toBeDisabled()
  })

  it('ANNOUNCES the blocked reason through the sheet live region — from the app’s real closed-at-mount shape', async () => {
    // Both real mounts (Result, the governed spend step) mount the sheet CLOSED and
    // open it later — the announcer must bind to the live-region node that only
    // exists while the sheet is open (the consumer-#2 trap, insight 047).
    const onApply = vi.fn()
    const draft = draftWith()
    const { rerender } = render(<Host draft={draft} open={false} onApply={onApply} />)
    rerender(<Host draft={draft} open onApply={onApply} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    fireEvent.click(addBtn())
    fireEvent.click(applyBtn())
    expect(onApply).not.toHaveBeenCalled()
    expect(sheetLiveRegion()).not.toBeNull()
    expect(sheetLiveRegion()!.textContent).toBe(copy.budgetApplyBlocked)
  })

  it('fixing the line unblocks: the error drops, aria-disabled clears, Apply commits', () => {
    const onApply = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} />)
    fireEvent.click(addBtn())
    fireEvent.click(applyBtn()) // blocked — attempted
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '12,000')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(applyBtn()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(applyBtn())
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0]![0]).toEqual([
      { category: 'other', label: '', annualAmountReal: 12_000, tier: 'essentials', startYear: 0 },
    ])
  })
})

describe('BudgetBuilder — warnings NEVER block (R19 cautions)', () => {
  it('an all-discretionary budget warns about the empty floor and still applies', () => {
    const onApply = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} />)
    fireEvent.click(addBtn())
    fireEvent.click(screen.getByLabelText(copy.budgetTierDiscretionary))
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '9,000')
    expect(screen.getByText(copy.budgetWarnZeroEssentials)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull() // a caution, never an alert
    fireEvent.click(applyBtn())
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('a budget with no line active at year 0 warns about the silent anchor and still applies', () => {
    const onApply = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} />)
    fireEvent.click(addBtn())
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '9,000')
    commitField(screen.getByLabelText(copy.budgetWindowFromLabel), '3')
    expect(screen.getByText(copy.budgetWarnNoYearZero)).toBeInTheDocument()
    fireEvent.click(applyBtn())
    expect(onApply).toHaveBeenCalledTimes(1)
  })
})

describe('BudgetBuilder — the reconciliation readout (build-gate 1: the OOP-medical net)', () => {
  const S = 80_000
  const M = 8_000

  it('with S and a positive M: anchor lead, lines target = max(0, S−M), and the carried-medical line', () => {
    const draft = draftWith((d) => ({
      ...d,
      annualSpendingReal: S,
      health: { ...d.health, oopMedicalAnnual: M },
    }))
    render(<Host draft={draft} />)
    expect(screen.getByText(slots.budgetAnchorLead(formatMoney(S)))).toBeInTheDocument()
    expect(screen.getByText(slots.budgetLinesTarget(formatMoney(S - M)))).toBeInTheDocument()
    expect(screen.getByText(slots.budgetMedicalCarried(formatMoney(M)))).toBeInTheDocument()
  })

  it('M > S: the honest exceeds line REPLACES the lines-target — never "about $0 into the lines" beside "about $M carried" (F10)', () => {
    const draft = draftWith((d) => ({
      ...d,
      annualSpendingReal: 5_000,
      health: { ...d.health, oopMedicalAnnual: 6_500 },
    }))
    render(<Host draft={draft} />)
    expect(
      screen.getByText(slots.budgetMedicalExceedsTotal(formatMoney(6_500), formatMoney(5_000))),
    ).toBeInTheDocument()
    // The contradictory "$0 into the lines below" line must NOT render beside it.
    expect(screen.queryByText(slots.budgetLinesTarget(formatMoney(0)))).toBeNull()
    // The carried line still renders — it stays true (the medical needs no line here).
    expect(screen.getByText(slots.budgetMedicalCarried(formatMoney(6_500)))).toBeInTheDocument()
  })

  it('M === S renders the EXISTING readout byte-identically (a $0 lines-target is the truth there — the M>=S mutant-killer)', () => {
    const draft = draftWith((d) => ({
      ...d,
      annualSpendingReal: 6_500,
      health: { ...d.health, oopMedicalAnnual: 6_500 },
    }))
    render(<Host draft={draft} />)
    expect(screen.getByText(slots.budgetLinesTarget(formatMoney(0)))).toBeInTheDocument()
    expect(
      screen.queryByText(slots.budgetMedicalExceedsTotal(formatMoney(6_500), formatMoney(6_500))),
    ).toBeNull()
  })

  it('with NO M: the target and carried lines are WITHHELD (raw S would invite committing S+M), anchor still shows', () => {
    const draft = draftWith((d) => ({ ...d, annualSpendingReal: S }))
    render(<Host draft={draft} />)
    expect(screen.getByText(slots.budgetAnchorLead(formatMoney(S)))).toBeInTheDocument()
    expect(screen.queryByText(slots.budgetLinesTarget(formatMoney(S)))).toBeNull()
    expect(screen.queryByText(slots.budgetMedicalCarried(formatMoney(0)))).toBeNull()
  })

  it('with NO S (defensive mount): the readout withholds its anchor lines — never a fabricated figure', () => {
    const draft = draftWith((d) => ({ ...d, annualSpendingReal: undefined }))
    render(<Host draft={draft} />)
    expect(document.querySelectorAll('.budget-readout__line')).toHaveLength(0)
  })

  it('medicalExceedsTotal fires STRICTLY above (the pure honesty fork — insight 048 planted-fail arms)', () => {
    expect(medicalExceedsTotal(5_000, 6_500)).toBe(true) // M > S — the contradiction
    expect(medicalExceedsTotal(6_500, 6_500)).toBe(false) // M === S — a $0 target is the truth
    expect(medicalExceedsTotal(80_000, 8_000)).toBe(false) // the ordinary M < S readout
  })

  it('the running total sums ONLY year-0-active finite lines as typed', () => {
    const draft = draftWith((d) => ({
      ...d,
      budget: [line({ annualAmountReal: 30_000 }), line({ category: 'travel', annualAmountReal: 6_000, startYear: 2 })],
      annualSpendingReal: 30_000,
    }))
    render(<Host draft={draft} />)
    expect(screen.getByText(slots.budgetRunningTotal(formatMoney(30_000)))).toBeInTheDocument()
  })

  it('a fresh Add-a-line row (amount untouched) keeps the running-total + tier-split lines ABSENT; the first real dollar starts the scoreboard (Briggsy live read 2026-07-11)', () => {
    // One "Add a line" click mints a NaN-amount row; a readout that then speaks "lines add up
    // to about $0 · essentials $0 · extras $0" over an untouched field is the blank-becomes-a-
    // spoken-zero shape (the R19 family, one level up — his verbatim: "weirdness w/ 78k/year
    // and 0/year lines"). The totals wait for the first FINITE amount anywhere in the list.
    const draft = draftWith((d) => ({ ...d, annualSpendingReal: 78_000 }))
    render(<Host draft={draft} />)
    expect(screen.getByText(slots.budgetAnchorLead(formatMoney(78_000)))).toBeInTheDocument()
    fireEvent.click(addBtn())
    expect(screen.queryByText(slots.budgetRunningTotal(formatMoney(0)))).not.toBeInTheDocument()
    expect(screen.queryByText(slots.budgetTierSplit(formatMoney(0), formatMoney(0)))).not.toBeInTheDocument()
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '12,000')
    expect(screen.getByText(slots.budgetRunningTotal(formatMoney(12_000)))).toBeInTheDocument()
    expect(screen.getByText(slots.budgetTierSplit(formatMoney(12_000), formatMoney(0)))).toBeInTheDocument()
  })

  it('a ramped budget shows the anchor-not-steady-state note; a lifelong-at-0 one does not', () => {
    const ramped = draftWith((d) => ({
      ...d,
      budget: [line(), line({ category: 'travel', annualAmountReal: 6_000, endYear: 10 })],
      annualSpendingReal: 36_000,
    }))
    const { rerender } = render(<Host draft={ramped} />)
    expect(screen.getByText(copy.budgetAnchorRampNote)).toBeInTheDocument()

    const flat = draftWith((d) => ({ ...d, budget: [line()], annualSpendingReal: 30_000 }))
    rerender(<Host draft={flat} open={false} />)
    rerender(<Host draft={flat} open />)
    expect(screen.queryByText(copy.budgetAnchorRampNote)).toBeNull()
  })
})

describe('BudgetBuilder — Apply payload fidelity', () => {
  it('a cleared Through-year commits a line with the endYear key ABSENT (lifelong — DND/009), never undefined-valued', () => {
    const onApply = vi.fn()
    const governing = draftWith((d) => ({ ...d, budget: [line({ endYear: 12 })], annualSpendingReal: 30_000 }))
    render(<Host draft={governing} onApply={onApply} />)
    commitField(screen.getByLabelText(copy.budgetWindowThroughLabel), '')
    fireEvent.click(applyBtn())
    expect(onApply).toHaveBeenCalledTimes(1)
    const item = onApply.mock.calls[0]![0][0] as BudgetLineItem
    expect('endYear' in item).toBe(false)
  })

  it('removing a middle row keeps its neighbors’ values (stable row identity, never index keys)', () => {
    const onApply = vi.fn()
    const governing = draftWith((d) => ({
      ...d,
      budget: [
        line({ label: 'Groceries', annualAmountReal: 18_000 }),
        line({ category: 'travel', label: 'Trips', annualAmountReal: 6_000, tier: 'discretionary' }),
        line({ category: 'gifts', label: 'Gifts', annualAmountReal: 3_000, tier: 'discretionary' }),
      ],
      annualSpendingReal: 27_000,
    }))
    render(<Host draft={governing} onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: slots.budgetRemoveLine('Trips') }))
    fireEvent.click(applyBtn())
    const items = onApply.mock.calls[0]![0] as readonly BudgetLineItem[]
    expect(items.map((i) => i.label)).toEqual(['Groceries', 'Gifts'])
    expect(items.map((i) => i.annualAmountReal)).toEqual([18_000, 3_000])
  })
})

describe('BudgetBuilder — close preserves local edits; a clean reopen re-seeds', () => {
  it('close-without-apply keeps in-progress edits for the session (nothing lost, no drama)', async () => {
    const draft = draftWith((d) => ({ ...d, budget: [line()], annualSpendingReal: 30_000 }))
    const { rerender } = render(<Host draft={draft} />)
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '45,000')
    rerender(<Host draft={draft} open={false} />)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    rerender(<Host draft={draft} open />)
    expect(screen.getByLabelText(copy.budgetAmountLabel)).toHaveValue('45,000')
  })

  it('a reopen with NO pending edits re-seeds rows from the governing draft', async () => {
    const a = draftWith((d) => ({
      ...d,
      budget: [line(), line({ category: 'travel', annualAmountReal: 6_000 })],
      annualSpendingReal: 36_000,
    }))
    const { rerender } = render(<Host draft={a} />)
    expect(document.querySelectorAll('.budget-line')).toHaveLength(2)

    rerender(<Host draft={a} open={false} />)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const b = draftWith((d) => ({ ...d, budget: [line({ annualAmountReal: 50_000 })], annualSpendingReal: 50_000 }))
    rerender(<Host draft={b} open />)
    expect(document.querySelectorAll('.budget-line')).toHaveLength(1)
    expect(screen.getByLabelText(copy.budgetAmountLabel)).toHaveValue('50,000')
  })
})

describe('BudgetBuilder — sheet chrome (overlay contract)', () => {
  it('renders a labelled modal dialog and lands focus on the sheet heading (never an input — phone keyboard rule)', () => {
    render(<Host draft={draftWith()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const heading = screen.getByRole('heading', { name: copy.budgetSheetTitle })
    expect(document.activeElement).toBe(heading)
  })

  it('the Escape key closes (cancel semantics — local edits survive per the close law)', () => {
    const onClose = vi.fn()
    render(<Host draft={draftWith()} onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('a backdrop press closes; a press inside the sheet does not', () => {
    const onClose = vi.fn()
    render(<Host draft={draftWith()} onClose={onClose} />)
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(document.querySelector('.budget-sheet__backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the Cancel button closes without committing', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<Host draft={draftWith()} onApply={onApply} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCancel }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})
