// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { AccountEntry } from '../AccountEntry'
import { unsavedBuffersHeld } from '../unsavedBuffer'
import { IntakeFlow } from '../flow'
import { intakeSteps } from '../questions'
import { missingRequiredFacts } from '../intakeMap'
import { contributionCeilingFor, annualAdditionsCeilingFor } from '../sanity'
import {
  annualAdditions415c2026,
  catchUpForAge,
  employerPlan2026,
  ira2026,
} from '@engine/constants/contributions'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy, slots } from '@ui/copy'
import { formatMoney } from '../moneyFormat'

/**
 * The account loop battery (D1 slice (d)): kind-conditional anatomy (basis →
 * brokerage; employer match → employer plans; HSA employer contribution → HSA),
 * the always-asked exact stock/bond/cash allocation (sum-to-100 enforced), the
 * C1 ceiling checks (fire AND boundary-pass, including the 60–63 super band and
 * the combined employer+employee HSA family ceiling), and loop list mechanics.
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

function modelWith(p0: Partial<ScenarioDraft['people'][0]>): MemoryModel {
  const m = createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
  m.update((d) => ({
    ...d,
    people: [
      { name: 'Sam', workStatus: 'working', currentAge: 61, birthYear: 1965, ...p0 },
      { name: 'Alex', workStatus: 'retired', currentAge: 65, birthYear: 1961, retirementAge: 63 },
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

function renderEntry(model: MemoryModel, onSave = vi.fn()) {
  render(
    <AccountEntry draft={model.getSnapshot().draft} onSave={onSave} onCancel={() => {}} />,
  )
  return { onSave }
}

afterEach(cleanup)

describe('AccountEntry — kind-conditional anatomy', () => {
  it('basis → brokerage; match → employer plans; HSA-employer → HSA; contributions need a working owner', () => {
    const m = modelWith({})
    renderEntry(m)
    // No kind picked: no basis, no match, no HSA-employer.
    expect(screen.queryByLabelText(copy.accountBasisLabel)).toBeNull()
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()
    expect(screen.queryByLabelText(copy.accountHsaEmployerLabel)).toBeNull()
    expect(screen.getByLabelText(copy.accountContributionLabel)).toBeInTheDocument() // owner works

    fireEvent.click(screen.getByLabelText(copy.kindBrokerage))
    expect(screen.getByLabelText(copy.accountBasisLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()

    fireEvent.click(screen.getByLabelText(copy.kind401k))
    expect(screen.queryByLabelText(copy.accountBasisLabel)).toBeNull()
    expect(screen.getByLabelText(copy.accountMatchLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText(copy.accountHsaEmployerLabel)).toBeNull()

    // HSA: the employer CONTRIBUTION field (→ hsa bucket), never the pretax match.
    fireEvent.click(screen.getByLabelText(copy.kindHsa))
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()
    expect(screen.getByLabelText(copy.accountHsaEmployerLabel)).toBeInTheDocument()
  })

  it('a retired owner sees no contribution questions (the inapplicable class)', () => {
    const m = modelWith({})
    render(
      <AccountEntry
        draft={m.getSnapshot().draft}
        initial={{ ownerIndex: 1, kind: '401k', valueToday: 100_000 }}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByLabelText(copy.accountContributionLabel)).toBeNull()
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()
  })
})

describe('AccountEntry — allocation entry (exact %)', () => {
  it('the stock/bond/cash split is always asked (no ticker, no quick-pick) and enforces sum-to-100', () => {
    const m = modelWith({})
    renderEntry(m)
    // The three % fields render unconditionally — there is no ticker input and no
    // "mostly stocks" quick-pick to expand from.
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '20' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(copy.errClassifierSum) // 110 ≠ 100
    // Color-blind-safe a11y law: the sum error must be reachable as text ON the field —
    // every % input carries aria-invalid AND aria-describedby pointing at the error node.
    for (const labelKey of ['classifierStockPct', 'classifierBondPct', 'classifierCashPct'] as const) {
      const field = screen.getByLabelText(copy[labelKey])
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAttribute('aria-describedby', alert.id)
    }

    // Forgive on re-edit (the alert + the field association clear the instant a field is touched).
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText(copy.classifierCashPct)).not.toHaveAttribute('aria-describedby')
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a committed account carries the entered exact blend', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '5' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      kind: 'roth-ira',
      valueToday: 100_000,
      manualBlend: { kind: 'exact', stockPct: 70, bondPct: 25, cashPct: 5 },
    })
  })

  // The 2026-08-20 intake walk's silent-discard finding, closed 2026-09-03: a TYPED split that
  // does not make 100 used to be a child-local error that "Add this account" ignored — the account
  // committed with NO blend and no message, and the debt resurfaced only as a generic "Still
  // needed: How is it invested?" over a question the household believes it answered. Now the
  // parent hears the three-way state (valid | blank | invalid) and BLOCKS Add on invalid with the
  // child's own alert forced visible; BLANK keeps flowing to the missing-fact gate (below).
  it('a TYPED but non-100 split BLOCKS Add with the sum error on every field; repairing it commits the repaired blend (burned/062 — never a silent discard)', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '20' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).not.toHaveBeenCalled() // 110 ≠ 100 — the editor stays open
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(copy.errClassifierSum)
    for (const labelKey of ['classifierStockPct', 'classifierBondPct', 'classifierCashPct'] as const) {
      const field = screen.getByLabelText(copy[labelKey])
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAttribute('aria-describedby', alert.id)
    }
    // Repair → the repaired blend commits (the block is a gate, not a dead end).
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    })
  })

  it('Add without a prior blur still blocks a typed non-100 split (the tap that lands before the blur reported)', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    // No blur: jsdom's click fires none, and a same-task blur+tap has the same shape (insight 036).
    expect(screen.queryByRole('alert')).toBeNull() // silent while typing (validate-on-blur law)
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).not.toHaveBeenCalled()
    const alert = screen.getByRole('alert') // the Add-time block FORCES the same alert node
    expect(alert.textContent).toBe(copy.errClassifierSum)
    // Both halves of the association law on the FORCED path (the blur path pins them above).
    for (const labelKey of ['classifierStockPct', 'classifierBondPct', 'classifierCashPct'] as const) {
      const field = screen.getByLabelText(copy[labelKey])
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAttribute('aria-describedby', alert.id)
    }
    // Forgiven on re-edit — the forced error clears the instant a leg is touched.
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('EDITING a committed valid blend into a non-100 split never re-commits the stale valid one (the second arm)', () => {
    const m = modelWith({})
    const onSave = vi.fn()
    render(
      <AccountEntry
        draft={m.getSnapshot().draft}
        initial={{
          ownerIndex: 0,
          kind: 'roth-ira',
          valueToday: 100_000,
          manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
        }}
        onSave={onSave}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText(copy.classifierStockPct)).toHaveValue('60')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '70' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierStockPct))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).not.toHaveBeenCalled() // the screen shows 70/30/10 — the old 60/30/10 must not ship
    expect(screen.getByRole('alert').textContent).toBe(copy.errClassifierSum)
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierStockPct))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    })
  })

  it('a BLANK allocation commits without a blend and the flow-gate NAMES it — the honest not-answered-yet channel, unchanged', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    // Nothing typed in any leg — not an invalid split, a question not yet answered.
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const account = onSave.mock.calls[0]![0]
    expect(account.manualBlend).toBeUndefined()
    const missing = missingRequiredFacts({
      ...m.getSnapshot().draft,
      enteredAccounts: [account],
    }).map((f) => f.labelKey)
    expect(missing).toContain('classifierLegend')
  })

  it('a blank leg reads as zero — 100 / blank / blank is a VALID 100/0/0 split (unchanged semantics)', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '100' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierStockPct))
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      manualBlend: { kind: 'exact', stockPct: 100, bondPct: 0, cashPct: 0 },
    })
  })

  it('Add without a prior blur on a VALID split commits the FRESH blend — and a valid-then-changed split with no blur is blocked (the keystroke report is load-bearing)', () => {
    // Arm 1: the keystroke report carries a valid split to Add with no blur in between.
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave })) // no blur
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    })

    cleanup()
    // Arm 2: a valid split changed to invalid with NO blur must not commit the stale valid one.
    const { onSave: onSave2 } = renderEntry(modelWith({}))
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '20' } }) // now 110
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave })) // still no blur
    expect(onSave2).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(copy.errClassifierSum)
  })

  it('CLEARING every leg of a committed blend is not an error — the account re-commits blend-less and the gate names it (the blank report is reachable)', () => {
    const m = modelWith({})
    const onSave = vi.fn()
    render(
      <AccountEntry
        draft={m.getSnapshot().draft}
        initial={{
          ownerIndex: 0,
          kind: 'roth-ira',
          valueToday: 100_000,
          manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
        }}
        onSave={onSave}
        onCancel={() => {}}
      />,
    )
    for (const labelKey of ['classifierStockPct', 'classifierBondPct', 'classifierCashPct'] as const) {
      fireEvent.change(screen.getByLabelText(copy[labelKey]), { target: { value: '' } })
    }
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    expect(screen.queryByRole('alert')).toBeNull() // blank is "not answered", never a sum error
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const account = onSave.mock.calls[0]![0]
    expect(account.manualBlend).toBeUndefined() // the old 60/30/10 is GONE, not re-committed
    const missing = missingRequiredFacts({
      ...m.getSnapshot().draft,
      enteredAccounts: [account],
    }).map((f) => f.labelKey)
    expect(missing).toContain('classifierLegend')
  })

  it('a leg typed with a % sign is the number it shows ("60%" = 60); a leg that is not a plain 0–100 number is refused as ITS OWN fault, never as the sum\'s', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60%' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: ' 30 ' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    })

    cleanup()
    // "1e2" used to be silently valued as 100 by a bare Number(); it is refused, and the
    // message names the leg, not the sum (which would be a false diagnosis).
    const { onSave: onSave2 } = renderEntry(modelWith({}))
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '1e2' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierStockPct))
    expect(screen.getByRole('alert').textContent).toBe(copy.errClassifierNumber)
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave2).not.toHaveBeenCalled()
    // 150 sums with nothing to 100 and is out of range — same message, same block.
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '150' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierStockPct))
    expect(screen.getByRole('alert').textContent).toBe(copy.errClassifierNumber)
  })

  it('a legacy `simple` blend seeds the legs it will re-commit (cash ⇒ 0 / 0 / 100), never three blanks over a live blend', () => {
    const m = modelWith({})
    const onSave = vi.fn()
    render(
      <AccountEntry
        draft={m.getSnapshot().draft}
        initial={{ ownerIndex: 0, kind: 'roth-ira', valueToday: 100_000, manualBlend: { kind: 'simple', choice: 'cash' } }}
        onSave={onSave}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByLabelText(copy.classifierStockPct)).toHaveValue('0')
    expect(screen.getByLabelText(copy.classifierBondPct)).toHaveValue('0')
    expect(screen.getByLabelText(copy.classifierCashPct)).toHaveValue('100')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    // Untouched, the household's own prior answer re-commits — and it IS what the screen showed.
    expect(onSave.mock.calls[0]![0].manualBlend).toEqual({ kind: 'simple', choice: 'cash' })
  })
})

describe('AccountEntry — a blocked Add ALWAYS names the missing fact (WCAG 3.3.1), never a silent dead button', () => {
  it('Add with no kind picked names the kind; picking one clears the line; Add with no balance names the balance, BOUND to that field', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    // Nothing answered — the old code returned silently here (a live-looking button that did nothing).
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(copy.errAccountKindRequired)
    // Answering the fact forgives the line (no lingering alert over a supplied answer).
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    expect(screen.queryByRole('alert')).toBeNull()
    // Kind picked, balance blank: the balance line, associated with the balance field.
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).not.toHaveBeenCalled()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(copy.errAccountValueRequired)
    const balance = screen.getByLabelText(copy.accountValueLabel)
    expect(balance).toHaveAttribute('aria-invalid', 'true')
    expect(balance).toHaveAttribute('aria-describedby', expect.stringContaining(alert.id))
    // Forgiven on re-edit: the first keystroke drops the line.
    fireEvent.focus(balance)
    fireEvent.change(balance, { target: { value: '1' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(balance, { target: { value: '100000' } })
    fireEvent.blur(balance)
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('the kind group advertises requiredness up front — aria-required on every radio and the visible "(required)" marker, text not color', () => {
    renderEntry(modelWith({}))
    expect(screen.getByLabelText(copy.kindRothIra)).toHaveAttribute('aria-required', 'true')
    expect(screen.getByLabelText(copy.kind401k)).toHaveAttribute('aria-required', 'true')
    expect(screen.getByText(copy.fieldRequiredMarker)).toBeInTheDocument()
  })
})

describe('AccountEntry — HSA employer contribution', () => {
  it('a committed HSA carries BOTH the personal and the employer contribution', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindHsa))
    setMoney(copy.accountValueLabel, '20000')
    setMoney(copy.accountContributionLabel, '2000')
    setMoney(copy.accountHsaEmployerLabel, '1000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      kind: 'hsa',
      annualContribution: 2000,
      hsaEmployerAnnual: 1000,
    })
  })

  it('employer + personal share the ONE HSA family ceiling — combined over fires, exactly at it passes', () => {
    const ceiling = contributionCeilingFor('hsa', 61)!
    // Personal one dollar under the ceiling + a matching-sized employer dollar →
    // combined strictly over → the same calm contribution-ceiling message.
    const { onSave } = renderEntry(modelWith({ currentAge: 61, birthYear: 1965 }))
    fireEvent.click(screen.getByLabelText(copy.kindHsa))
    setMoney(copy.accountValueLabel, '20000')
    setMoney(copy.accountContributionLabel, String(ceiling - 1000))
    setMoney(copy.accountHsaEmployerLabel, '1001')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).not.toHaveBeenCalled()
    // The message QUOTES the actual family limit (F10) — expected string BUILT from the slot
    // + the real ceiling helper, never a re-typed dollar.
    expect(screen.getByRole('alert').textContent).toBe(
      slots.errContributionCeiling(formatMoney(ceiling)),
    )

    cleanup()
    // Exactly at the combined ceiling passes (the boundary is legal).
    const { onSave: onSave2 } = renderEntry(modelWith({ currentAge: 61, birthYear: 1965 }))
    fireEvent.click(screen.getByLabelText(copy.kindHsa))
    setMoney(copy.accountValueLabel, '20000')
    setMoney(copy.accountContributionLabel, String(ceiling - 1000))
    setMoney(copy.accountHsaEmployerLabel, '1000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave2).toHaveBeenCalledTimes(1)
  })
})

describe('AccountEntry — the C1 ceilings (fire AND boundary-pass)', () => {
  it('the 61-yo super-band maximum passes; one dollar over fires (deferral + the 60–63 super band)', () => {
    const m = modelWith({ currentAge: 61, birthYear: 1965 })
    const ceiling = contributionCeilingFor('401k', 61)!
    // The COMPOSITION under test: ceiling = canonical deferral + the age band
    // (values themselves are source-bound in the constants module — never
    // re-typed here, per the single-source gate). The super band is its own
    // COLA figure, strictly above the regular catch-up AND not 150% of it
    // (the C1 derivation trap).
    const superBand = catchUpForAge(61, 'employerPlan')
    expect(ceiling).toBe(employerPlan2026.value.electiveDeferral + superBand)
    expect(superBand).toBeGreaterThan(catchUpForAge(55, 'employerPlan'))
    expect(superBand).not.toBe(1.5 * catchUpForAge(55, 'employerPlan'))

    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kind401k))
    setMoney(copy.accountValueLabel, '500000')
    setMoney(copy.accountContributionLabel, String(ceiling))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1) // boundary passes

    cleanup()
    const { onSave: onSave2 } = renderEntry(modelWith({ currentAge: 61, birthYear: 1965 }))
    fireEvent.click(screen.getByLabelText(copy.kind401k))
    setMoney(copy.accountValueLabel, '500000')
    setMoney(copy.accountContributionLabel, String(ceiling + 1))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave2).not.toHaveBeenCalled() // fires — stays open
    // Slot-built, source-bound pin (F10): the quoted limit IS the age-61 super-band ceiling.
    expect(screen.getByRole('alert').textContent).toBe(
      slots.errContributionCeiling(formatMoney(ceiling)),
    )
  })

  it('IRA ceiling: base + the age-50 catch-up combined; under 50 the bare base', () => {
    expect(contributionCeilingFor('roth-ira', 61)).toBe(
      ira2026.value.contributionLimit + catchUpForAge(61, 'ira'),
    )
    expect(catchUpForAge(61, 'ira')).toBeGreaterThan(0)
    expect(contributionCeilingFor('traditional-ira', 45)).toBe(ira2026.value.contributionLimit)
  })

  it('contribution + match above the §415(c) cap PLUS the band fires; at it passes', () => {
    const ceiling = annualAdditionsCeilingFor(61)
    // The band sits ON TOP — never the bare cap (the C1 note's explicit trap).
    expect(ceiling).toBe(annualAdditions415c2026.value + catchUpForAge(61, 'employerPlan'))
    expect(ceiling).toBeGreaterThan(annualAdditions415c2026.value)

    const deferral = employerPlan2026.value.electiveDeferral
    const { onSave } = renderEntry(modelWith({ currentAge: 61, birthYear: 1965 }))
    fireEvent.click(screen.getByLabelText(copy.kind401k))
    setMoney(copy.accountValueLabel, '500000')
    setMoney(copy.accountContributionLabel, String(deferral))
    setMoney(copy.accountMatchLabel, String(ceiling - deferral))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave).toHaveBeenCalledTimes(1)

    cleanup()
    const { onSave: onSave2 } = renderEntry(modelWith({ currentAge: 61, birthYear: 1965 }))
    fireEvent.click(screen.getByLabelText(copy.kind401k))
    setMoney(copy.accountValueLabel, '500000')
    setMoney(copy.accountContributionLabel, String(deferral))
    setMoney(copy.accountMatchLabel, String(ceiling - deferral + 1))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave2).not.toHaveBeenCalled()
    // Slot-built, source-bound pin (F10): the quoted limit IS the §415(c) cap + the band.
    expect(screen.getByRole('alert').textContent).toBe(
      slots.errAdditionsCeiling(formatMoney(ceiling)),
    )
  })

  it('a brokerage contribution is uncapped (no statutory ceiling)', () => {
    expect(contributionCeilingFor('brokerage', 61)).toBeNull()
  })
})

describe('the accounts step — loop mechanics through the real flow', () => {
  function Harness({ model }: { model: MemoryModel }) {
    const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
    const steps = useMemo(() => intakeSteps(snap.draft), [snap.draft])
    return <IntakeFlow steps={steps} model={model} />
  }

  it('add → list → edit → remove, all through the single draft (back-nav-safe)', () => {
    const m = modelWith({})
    render(<Harness model={m} />)
    // Walk to the accounts step (the other-income loop follows it, and on the date route the pay
    // check's two steps).
    while (screen.getByRole('heading', { level: 2 }).textContent !== copy.qAccountsHeading) {
      fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    }

    expect(screen.getByText(copy.accountsEmpty)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.addAccount }))
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '250000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))

    expect(m.getSnapshot().draft.enteredAccounts).toHaveLength(1)
    expect(m.getSnapshot().draft.enteredAccounts[0]).toMatchObject({
      ownerIndex: 0,
      kind: 'roth-ira',
      valueToday: 250_000,
    })
    expect(screen.getByText(/Roth IRA · Sam · \$250,000/)).toBeInTheDocument()

    // Remove is two-tap (D1 review DA4): first tap arms the confirm, second
    // removes — no undo once gone.
    fireEvent.click(screen.getByRole('button', { name: copy.accountRemove }))
    expect(m.getSnapshot().draft.enteredAccounts).toHaveLength(1) // armed, not yet removed
    fireEvent.click(screen.getByRole('button', { name: copy.accountRemoveConfirm }))
    expect(m.getSnapshot().draft.enteredAccounts).toHaveLength(0)
    expect(screen.getByText(copy.accountsEmpty)).toBeInTheDocument()
  })
})

describe('AccountEntry — the open-buffer hold (the unsaved-work guard’s second operand)', () => {
  // The whole form is component state until Add commits it, invisible to the draft-reading guard:
  // over a saved-and-clean vault an eight-field account would reload away with no dialog. The form
  // HOLDS while it has moved from what it opened with, and releases on every exit.
  it('a blank new form holds nothing; the first committed field holds; clearing it back releases; unmount releases', () => {
    const { unmount } = render(
      <AccountEntry draft={modelWith({}).getSnapshot().draft} onSave={vi.fn()} onCancel={() => {}} />,
    )
    expect(unsavedBuffersHeld()).toBe(0) // an open-but-empty form is not alarm-when-fine
    setMoney(copy.accountValueLabel, '100000')
    expect(unsavedBuffersHeld()).toBe(1)
    setMoney(copy.accountValueLabel, '')
    expect(unsavedBuffersHeld()).toBe(0) // back to what it opened with — nothing to lose
    fireEvent.click(screen.getByLabelText(copy.kindBrokerage))
    expect(unsavedBuffersHeld()).toBe(1)
    unmount()
    expect(unsavedBuffersHeld()).toBe(0) // Cancel / Add / a crash all leave the same way
  })
})

describe('AccountEntry — the stable id (schema version 6, the workbench plan’s U9)', () => {
  it('Add mints a fresh random id, never one an account, a line or a kept what-if holds or names', () => {
    const m = modelWith({})
    m.update((d) => ({
      ...d,
      enteredAccounts: [{ id: 'acct-held', ownerIndex: 1, kind: 'roth-ira', valueToday: 5_000 }],
      budget: [{ id: 'line-held', category: 'food', label: '', annualAmountReal: 1_000, tier: 'essentials', startYear: 0 }],
      keptWhatIfs: [{ id: 'wi-held', name: 'n', levers: [{ kind: 'deposits', accountId: 'acct-named', annualContribution: 1 }] }],
    }))
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindBrokerage))
    setMoney(copy.accountValueLabel, '40000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    const id = (onSave.mock.calls[0]![0] as { id?: string }).id
    expect(id).toMatch(/^[0-9a-f]{24}$/)
    expect(['acct-held', 'line-held', 'wi-held', 'acct-named']).not.toContain(id)
  })

  it('editing a committed account’s balance keeps its id — the form rebuilds the account, and carries the id across', () => {
    const m = modelWith({})
    const initial = { id: 'acct-kept', ownerIndex: 0, kind: 'brokerage', valueToday: 100_000, basis: 60_000 } as const
    const onSave = vi.fn()
    render(<AccountEntry draft={m.getSnapshot().draft} initial={initial} onSave={onSave} onCancel={() => {}} />)
    setMoney(copy.accountValueLabel, '120000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(onSave.mock.calls[0]![0]).toEqual({ ...initial, valueToday: 120_000 })
  })

  it('through the real accounts step: add, edit, add, remove the first, add — every account keeps its id through the edit, and the ids stay unique', () => {
    const m = modelWith({})
    function Harness() {
      const snap = useSyncExternalStore(m.subscribe, m.getSnapshot)
      const steps = useMemo(() => intakeSteps(snap.draft), [snap.draft])
      return <IntakeFlow steps={steps} model={m} />
    }
    render(<Harness />)
    while (screen.getByRole('heading', { level: 2 }).textContent !== copy.qAccountsHeading) {
      fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    }
    const add = (kindLabel: string, value: string) => {
      fireEvent.click(screen.getByRole('button', { name: copy.addAccount }))
      fireEvent.click(screen.getByLabelText(kindLabel))
      setMoney(copy.accountValueLabel, value)
      fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    }
    const ids = () => m.getSnapshot().draft.enteredAccounts.map((a) => a.id)
    add(copy.kindRothIra, '250000')
    const [first] = ids()
    fireEvent.click(screen.getAllByRole('button', { name: copy.accountEdit })[0]!)
    setMoney(copy.accountValueLabel, '260000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(m.getSnapshot().draft.enteredAccounts[0]).toMatchObject({ id: first, valueToday: 260_000 })
    add(copy.kindBrokerage, '50000')
    fireEvent.click(screen.getAllByRole('button', { name: copy.accountRemove })[0]!)
    fireEvent.click(screen.getByRole('button', { name: copy.accountRemoveConfirm }))
    add(copy.kindBrokerage, '50000') // two accounts with identical facts
    const after = ids()
    expect(after).toHaveLength(2)
    expect(after.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(after).size).toBe(2)
    expect(after).not.toContain(first)
  })
})
