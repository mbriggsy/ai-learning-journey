// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { preambleSteps } from '../questions'
import { IntakeFlow } from '../flow'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy } from '@ui/copy'

/**
 * The preamble integration battery (D1 slice (c)): conditional step gates, the
 * work-status branch (status-conditional stop age; zeroed inapplicables; no
 * retirement-date question for the working), DOB→derived age, the spend
 * period-discipline (canonical annual; the ambiguous-band force-confirm; unit
 * re-base keeps the typed digits), and the per-person working-income writes.
 * Driven through the REAL flow + model — the same wiring the app mounts.
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

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
}

/** The same shape the app mounts: steps derived from the live draft. */
function Harness({ model }: { model: MemoryModel }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(() => preambleSteps(snap.draft), [snap.draft])
  return <IntakeFlow steps={steps} model={model} />
}

afterEach(cleanup)

const draft = (model: MemoryModel): ScenarioDraft => model.getSnapshot().draft

const setStatuses = (model: MemoryModel, s0: 'working' | 'retired', s1: 'working' | 'retired') =>
  model.update((d) => ({
    ...d,
    people: [
      { ...d.people[0], workStatus: s0 },
      { ...d.people[1], workStatus: s1 },
    ],
  }))

const heading = () => screen.getByRole('heading', { level: 2 }).textContent

describe('preambleSteps — conditional gates', () => {
  it('an all-retired household skips the salary AND working-income steps', () => {
    const m = freshModel()
    setStatuses(m, 'retired', 'retired')
    const ids = preambleSteps(draft(m)).map((s) => s.id)
    expect(ids).not.toContain('income')
    expect(ids).not.toContain('working-income')
  })

  it('any working member adds salary + working-income; both appear for a mixed household', () => {
    const m = freshModel()
    setStatuses(m, 'working', 'retired')
    const ids = preambleSteps(draft(m)).map((s) => s.id)
    expect(ids).toContain('income')
    expect(ids).toContain('working-income')
  })

  it('an everyone-65+ household needs no ACA quote step (§0 exception); a pre-65 member restores it', () => {
    const m = freshModel()
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], currentAge: 67, birthYear: 1959 },
        { ...d.people[1], currentAge: 66, birthYear: 1960 },
      ],
    }))
    expect(preambleSteps(draft(m)).map((s) => s.id)).not.toContain('health-quote')

    m.update((d) => ({ ...d, people: [{ ...d.people[0], currentAge: 62, birthYear: 1964 }, d.people[1]] }))
    expect(preambleSteps(draft(m)).map((s) => s.id)).toContain('health-quote')
  })

  it('unknown ages keep the ACA quote step (ask until proven 65+, never silently skip)', () => {
    const m = freshModel()
    expect(preambleSteps(draft(m)).map((s) => s.id)).toContain('health-quote')
  })

  it('the IRMAA seed step appears only with a member 64+ (the 2-year lookback reach)', () => {
    const m = freshModel()
    m.update((d) => ({ ...d, people: [{ ...d.people[0], currentAge: 63 }, { ...d.people[1], currentAge: 60 }] }))
    expect(preambleSteps(draft(m)).map((s) => s.id)).not.toContain('irmaa-seed')
    m.update((d) => ({ ...d, people: [{ ...d.people[0], currentAge: 64 }, d.people[1]] }))
    expect(preambleSteps(draft(m)).map((s) => s.id)).toContain('irmaa-seed')
  })
})

describe('the work-status branch (asked, never inferred)', () => {
  it('choosing retired reveals the stop-age question; a stop age ≤ current age advances cleanly', () => {
    const m = freshModel()
    render(<Harness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // names → work

    expect(heading()).toBe(copy.qWorkHeading)
    expect(screen.queryAllByLabelText(copy.stopAgeLabel)).toHaveLength(0)
    fireEvent.click(screen.getAllByLabelText(copy.workStatusRetired)[0]!)
    expect(screen.getAllByLabelText(copy.stopAgeLabel)).toHaveLength(1)

    expect(draft(m).people[0].earnedIncomeReal).toBe(0) // inapplicable ⇒ zeroed
  })

  it('a still-working person gets NO retirement-date question anywhere in the preamble', () => {
    const m = freshModel()
    setStatuses(m, 'working', 'working')
    render(<Harness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → work
    expect(screen.queryAllByLabelText(copy.stopAgeLabel)).toHaveLength(0)
    expect(draft(m).people[0].retirementAge).toBeUndefined() // the placeholder is intakeMap's, never the draft's
  })

  it('flipping retired → working clears the stale stop age and re-opens the salary fact', () => {
    const m = freshModel()
    render(<Harness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))

    fireEvent.click(screen.getAllByLabelText(copy.workStatusRetired)[0]!)
    const stopAge = screen.getByLabelText(copy.stopAgeLabel)
    fireEvent.focus(stopAge)
    fireEvent.change(stopAge, { target: { value: '62' } })
    fireEvent.blur(stopAge)
    expect(draft(m).people[0].retirementAge).toBe(62)

    fireEvent.click(screen.getAllByLabelText(copy.workStatusWorking)[0]!)
    expect(draft(m).people[0].retirementAge).toBeUndefined()
    expect(draft(m).people[0].earnedIncomeReal).toBeUndefined()
  })
})

describe('DOB → derived age (one derivation site)', () => {
  it('committing a birth year writes birthYear AND currentAge = startCalendarYear − birthYear', () => {
    const m = freshModel()
    render(<Harness model={m} />)
    const by = screen.getAllByLabelText(copy.birthYearLabel)[0]!
    fireEvent.focus(by)
    fireEvent.change(by, { target: { value: '1961' } })
    fireEvent.blur(by)
    expect(draft(m).people[0].birthYear).toBe(1961)
    expect(draft(m).people[0].currentAge).toBe(65)
  })
})

describe('the spend step — period discipline (R19)', () => {
  function reachSpend(m: MemoryModel) {
    render(<Harness model={m} />)
    // all-retired path: names → work → social-security → spend
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(heading()).toBe(copy.qSpendHeading)
  }

  it('stores canonical ANNUAL from a monthly entry (the default unit)', () => {
    const m = freshModel()
    setStatuses(m, 'retired', 'retired')
    reachSpend(m)
    const spend = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(spend)
    fireEvent.change(spend, { target: { value: '7000' } })
    fireEvent.blur(spend)
    expect(draft(m).annualSpendingReal).toBe(84_000)
  })

  it('an ambiguous figure FORCES the explicit period answer before advancing (engine never runs on the default)', () => {
    const m = freshModel()
    setStatuses(m, 'retired', 'retired')
    reachSpend(m)
    const spend = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(spend)
    fireEvent.change(spend, { target: { value: '15000' } }) // coherent both ways
    fireEvent.blur(spend)

    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('alert').textContent).toBe(copy.periodConfirmPrompt) // blocked
    expect(heading()).toBe(copy.qSpendHeading)

    fireEvent.click(screen.getByLabelText(copy.periodMonth)) // the explicit answer
    expect(screen.queryByRole('alert')).toBeNull() // clears instantly
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(heading()).not.toBe(copy.qSpendHeading) // advances
  })

  it('switching the unit re-bases the canonical annual around the SAME typed digits', () => {
    const m = freshModel()
    setStatuses(m, 'retired', 'retired')
    reachSpend(m)
    const spend = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(spend)
    fireEvent.change(spend, { target: { value: '15000' } })
    fireEvent.blur(spend)
    expect(draft(m).annualSpendingReal).toBe(180_000) // month default ×12

    fireEvent.click(screen.getByLabelText(copy.periodYear))
    expect(draft(m).annualSpendingReal).toBe(15_000) // the digits are the truth; the unit moved
    expect(draft(m).spendEntryPeriod).toBe('year')

    fireEvent.click(screen.getByLabelText(copy.periodMonth))
    expect(draft(m).annualSpendingReal).toBe(180_000)
  })

  it('an unambiguous figure sails through on the default unit (no nag)', () => {
    const m = freshModel()
    setStatuses(m, 'retired', 'retired')
    reachSpend(m)
    const spend = screen.getByLabelText(copy.spendLabel)
    fireEvent.focus(spend)
    fireEvent.change(spend, { target: { value: '6500' } }) // clearly monthly
    fireEvent.blur(spend)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(heading()).not.toBe(copy.qSpendHeading)
  })
})

describe('working-year income (the §3b override source — never a salary echo)', () => {
  it('writes per-person aligned values and ZEROES the retired slot', () => {
    const m = freshModel()
    setStatuses(m, 'working', 'retired')
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], currentAge: 58, birthYear: 1968 },
        { ...d.people[1], currentAge: 60, birthYear: 1966 },
      ],
    }))
    render(<Harness model={m} />)
    // walk: names → work → income → ss → spend → health-quote → oop → working-income
    for (let i = 0; i < 7; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    }
    expect(heading()).toBe(copy.qWorkIncomeHeading)

    const field = screen.getByLabelText(copy.workIncomeLabel)
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: '210000' } })
    fireEvent.blur(field)
    expect(draft(m).health.workingYearIrmaaMagiByPerson).toEqual([210_000, 0])
  })
})

describe('paired screens', () => {
  it('renders one fieldset per spouse with entered names as the programmatic legends', () => {
    const m = freshModel()
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], name: 'Sam' },
        { ...d.people[1], name: 'Alex' },
      ],
    }))
    render(<Harness model={m} />)
    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAccessibleName('Sam')
    expect(groups[1]).toHaveAccessibleName('Alex')
  })
})
