// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { AccountEntry } from '../AccountEntry'
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
import { copy } from '@ui/copy'

/**
 * The account loop battery (D1 slice (d)): kind-conditional anatomy (basis →
 * brokerage; employer match → employer plans; HSA employer contribution → HSA),
 * the always-asked exact stock/bond/cash allocation (sum-to-100 enforced), the
 * C1 ceiling checks (fire AND boundary-pass, including the 60–63 super band and
 * the combined employer+employee HSA family ceiling), and loop list mechanics.
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

  it('an invalid (non-100) split is NEVER silently committed as a default blend — the flow-gate names it (burned/062)', () => {
    const m = modelWith({})
    const { onSave } = renderEntry(m)
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '100000')
    // 60 + 30 + 20 = 110 ≠ 100 — AllocationEntry refuses to emit it (no onClassify).
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '20' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    // The account commits (kind + balance present) but carries NO blend — never a
    // stale/partial default — so missingRequiredFacts NAMES it (the honest gate that
    // keeps an unallocated account from reaching the engine with a guessed mix).
    expect(onSave).toHaveBeenCalledTimes(1)
    const account = onSave.mock.calls[0]![0]
    expect(account.manualBlend).toBeUndefined()
    const missing = missingRequiredFacts({
      ...m.getSnapshot().draft,
      enteredAccounts: [account],
    }).map((f) => f.labelKey)
    expect(missing).toContain('classifierLegend')
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
    expect(screen.getByRole('alert').textContent).toBe(copy.errContributionCeiling)

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
    expect(screen.getByRole('alert').textContent).toBe(copy.errContributionCeiling)
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
    expect(screen.getByRole('alert').textContent).toBe(copy.errAdditionsCeiling)
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
    // Walk to the accounts step (the last step).
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
