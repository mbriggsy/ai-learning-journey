// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { AccountEntry } from '../AccountEntry'
import { IntakeFlow } from '../flow'
import { intakeSteps } from '../questions'
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
 * The account loop battery (D1 slice (d)): kind-conditional anatomy, the
 * ticker→blend resolution (share-class family equivalence; the TDF disclosure
 * — a planted unlabeled TDF render fails), the miss→classifier path with
 * ticker-keyed answered-once persistence, the C1 ceiling checks (fire AND
 * boundary-pass, including the 60–63 super band), and loop list mechanics.
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

function renderEntry(model: MemoryModel, onSave = vi.fn(), onClassify = vi.fn()) {
  render(
    <AccountEntry
      draft={model.getSnapshot().draft}
      onSave={onSave}
      onCancel={() => {}}
      onClassifyTicker={onClassify}
    />,
  )
  return { onSave, onClassify }
}

afterEach(cleanup)

describe('AccountEntry — kind-conditional anatomy', () => {
  it('basis appears only for brokerage; match only for employer plans; contributions only for a working owner', () => {
    const m = modelWith({})
    renderEntry(m)
    // No kind picked: no basis, no match.
    expect(screen.queryByLabelText(copy.accountBasisLabel)).toBeNull()
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()
    expect(screen.getByLabelText(copy.accountContributionLabel)).toBeInTheDocument() // owner works

    fireEvent.click(screen.getByLabelText(copy.kindBrokerage))
    expect(screen.getByLabelText(copy.accountBasisLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()

    fireEvent.click(screen.getByLabelText(copy.kind401k))
    expect(screen.queryByLabelText(copy.accountBasisLabel)).toBeNull()
    expect(screen.getByLabelText(copy.accountMatchLabel)).toBeInTheDocument()
  })

  it('a retired owner sees no contribution questions (the inapplicable class)', () => {
    const m = modelWith({})
    render(
      <AccountEntry
        draft={m.getSnapshot().draft}
        initial={{ ownerIndex: 1, kind: '401k', valueToday: 100_000 }}
        onSave={() => {}}
        onCancel={() => {}}
        onClassifyTicker={() => {}}
      />,
    )
    expect(screen.queryByLabelText(copy.accountContributionLabel)).toBeNull()
    expect(screen.queryByLabelText(copy.accountMatchLabel)).toBeNull()
  })
})

describe('AccountEntry — ticker → blend (R37)', () => {
  it('VTI and VTSAX resolve to the SAME family row (share-class equivalence)', () => {
    const m = modelWith({})
    renderEntry(m)
    const ticker = screen.getByLabelText(copy.accountTickerLabel)

    fireEvent.change(ticker, { target: { value: 'vtsax' } })
    const lineA = screen.getByText(/about \d+% stocks/).textContent
    fireEvent.change(ticker, { target: { value: 'VTI' } })
    const lineB = screen.getByText(/about \d+% stocks/).textContent
    expect(lineA).toBe(lineB)
    expect(screen.queryByText(copy.tdfDisclosure)).toBeNull() // not a TDF — no label
  })

  it('a TDF hit renders the held-constant disclosure (the planted unlabeled render fails)', () => {
    const m = modelWith({})
    renderEntry(m)
    fireEvent.change(screen.getByLabelText(copy.accountTickerLabel), { target: { value: 'VFIFX' } })
    // VFIFX = Vanguard Target Retirement 2050 — a tdfTargetYear row in C1.
    expect(screen.getByText(/about \d+% stocks/)).toBeInTheDocument()
    expect(screen.getByText(copy.tdfDisclosure)).toBeInTheDocument()
  })

  it('an unrecognized ticker routes to the classifier and classifies TICKER-KEYED (answered once)', () => {
    const m = modelWith({})
    const { onClassify } = renderEntry(m)
    fireEvent.change(screen.getByLabelText(copy.accountTickerLabel), { target: { value: 'ZZZUNKNOWN' } })
    expect(screen.queryByText(/about \d+% stocks/)).toBeNull()
    fireEvent.click(screen.getByLabelText(copy.classifyBonds))
    expect(onClassify).toHaveBeenCalledWith('ZZZUNKNOWN', { kind: 'simple', choice: 'bonds' })
  })

  it('the advanced expander enforces sum-to-100', () => {
    const m = modelWith({})
    renderEntry(m)
    // Blank ticker → the per-account manual classifier renders.
    fireEvent.click(screen.getByRole('button', { name: copy.classifierAdvanced }))
    fireEvent.change(screen.getByLabelText(copy.classifierStockPct), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(copy.classifierBondPct), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '20' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    expect(screen.getByRole('alert').textContent).toBe(copy.errClassifierSum) // 110 ≠ 100

    fireEvent.change(screen.getByLabelText(copy.classifierCashPct), { target: { value: '10' } })
    fireEvent.blur(screen.getByLabelText(copy.classifierCashPct))
    expect(screen.queryByRole('alert')).toBeNull()
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
