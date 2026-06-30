// @vitest-environment jsdom
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { intakeSteps } from '../questions'
import { IntakeFlow } from '../flow'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy, slots } from '@ui/copy'
import { formatMoney } from '../fields'
import { OOP_MEDICAL_TYPICAL_HOUSEHOLD } from '../referenceData'

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
  const steps = useMemo(() => intakeSteps(snap.draft), [snap.draft])
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

describe('intakeSteps — conditional gates', () => {
  it('an all-retired household skips the salary AND working-income steps', () => {
    const m = freshModel()
    setStatuses(m, 'retired', 'retired')
    const ids = intakeSteps(draft(m)).map((s) => s.id)
    expect(ids).not.toContain('income')
    expect(ids).not.toContain('working-income')
  })

  it('any working member adds salary + working-income; both appear for a mixed household', () => {
    const m = freshModel()
    setStatuses(m, 'working', 'retired')
    const ids = intakeSteps(draft(m)).map((s) => s.id)
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
    expect(intakeSteps(draft(m)).map((s) => s.id)).not.toContain('health-quote')

    m.update((d) => ({ ...d, people: [{ ...d.people[0], currentAge: 62, birthYear: 1964 }, d.people[1]] }))
    expect(intakeSteps(draft(m)).map((s) => s.id)).toContain('health-quote')
  })

  it('unknown ages keep the ACA quote step (ask until proven 65+, never silently skip)', () => {
    const m = freshModel()
    expect(intakeSteps(draft(m)).map((s) => s.id)).toContain('health-quote')
  })

  it('the IRMAA seed step appears only with a member 64+ (the 2-year lookback reach)', () => {
    const m = freshModel()
    m.update((d) => ({ ...d, people: [{ ...d.people[0], currentAge: 63 }, { ...d.people[1], currentAge: 60 }] }))
    expect(intakeSteps(draft(m)).map((s) => s.id)).not.toContain('irmaa-seed')
    m.update((d) => ({ ...d, people: [{ ...d.people[0], currentAge: 64 }, d.people[1]] }))
    expect(intakeSteps(draft(m)).map((s) => s.id)).toContain('irmaa-seed')
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

describe('the Social Security step — monthly PIA + claim-YEAR (the integration-review reframe)', () => {
  const retiredCouple = (m: MemoryModel, p0: Partial<ScenarioDraft['people'][0]> = {}) =>
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], workStatus: 'retired', currentAge: 65, birthYear: 1961, ...p0 },
        { ...d.people[1], workStatus: 'retired', currentAge: 65, birthYear: 1961 },
      ],
    }))
  function reachSs(m: MemoryModel) {
    render(<Harness model={m} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // names → work
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // work → social-security
    expect(heading()).toBe(copy.qSsHeading)
  }

  it('PIA: a MONTHLY entry stores the canonical annual (×12) the engine reads', () => {
    const m = freshModel()
    retiredCouple(m)
    reachSs(m)
    const pia = screen.getAllByLabelText(copy.ssAmountLabel)[0]!
    fireEvent.focus(pia)
    fireEvent.change(pia, { target: { value: '2500' } })
    fireEvent.blur(pia)
    expect(draft(m).people[0].pia).toBe(30_000) // 2500 × 12
  })

  it('PIA: the field DISPLAYS the stored annual back as the monthly figure (/12, round-trip)', () => {
    const m = freshModel()
    retiredCouple(m, { pia: 36_000 })
    reachSs(m)
    const pia = screen.getAllByLabelText(copy.ssAmountLabel)[0] as HTMLInputElement
    expect(pia.value).toBe('3,000') // 36,000 / 12
  })

  it('claim: a YEAR entry stores the derived whole-year claim age (year − birthYear)', () => {
    const m = freshModel()
    retiredCouple(m)
    reachSs(m)
    const claim = screen.getAllByLabelText(copy.ssClaimLabel)[0]!
    fireEvent.focus(claim)
    fireEvent.change(claim, { target: { value: '2028' } }) // 2028 − 1961 = 67
    fireEvent.blur(claim)
    expect(draft(m).people[0].socialSecurityClaimAge).toBe(67)
  })

  it('claim: the field DISPLAYS the year (birthYear + stored age) and echoes the derived age', () => {
    const m = freshModel()
    retiredCouple(m, { socialSecurityClaimAge: 70 })
    reachSs(m)
    const claim = screen.getAllByLabelText(copy.ssClaimLabel)[0] as HTMLInputElement
    expect(claim.value).toBe('2031') // 1961 + 70 — no thousands separator on a year
    expect(screen.getByText(slots.ssClaimAge(70))).toBeInTheDocument()
  })

  it('a YEARLY figure fat-fingered into the MONTHLY PIA box is blocked on advance (the ×12 ceiling)', () => {
    const m = freshModel()
    retiredCouple(m)
    reachSs(m)
    const pia = screen.getAllByLabelText(copy.ssAmountLabel)[0]!
    fireEvent.focus(pia)
    fireEvent.change(pia, { target: { value: '30000' } }) // a yearly total → 30,000 × 12 = 360,000 stored
    fireEvent.blur(pia)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('alert').textContent).toBe(copy.errPiaCeiling) // blocked at the field
    expect(heading()).toBe(copy.qSsHeading) // did not advance
  })

  it('a claim YEAR that derives an out-of-window age fires the claim-window rule (the year→age→validation chain)', () => {
    const m = freshModel()
    retiredCouple(m)
    reachSs(m)
    const claim = screen.getAllByLabelText(copy.ssClaimLabel)[0]!
    fireEvent.focus(claim)
    fireEvent.change(claim, { target: { value: '2020' } }) // 2020 − 1961 = 59, below 62
    fireEvent.blur(claim)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('alert').textContent).toBe(copy.errSsClaimWindow)
    expect(heading()).toBe(copy.qSsHeading)
  })

  it('states each person’s derived full retirement age (the cold-read FRA echo)', () => {
    const m = freshModel()
    retiredCouple(m) // both born 1961 → FRA 67 (804 months)
    reachSs(m)
    expect(screen.getAllByText(slots.fraEcho(804))).toHaveLength(2)
  })

  it('the FRA echo renders years AND months for an off-cohort birth year', () => {
    const m = freshModel()
    retiredCouple(m, { birthYear: 1959, currentAge: 67 }) // 1959 → FRA 66y10m (802 months)
    reachSs(m)
    expect(slots.fraEcho(802)).toBe('Your full retirement age is 66 years, 10 months.')
    expect(screen.getByText(slots.fraEcho(802))).toBeInTheDocument() // person 0; spouse (1961) shows "67"
  })

  it('claim: hints the valid 62–70 window before entry, then echoes the age once a year lands', () => {
    const m = freshModel()
    retiredCouple(m) // both 1961 → window 2023 (age 62) – 2031 (age 70)
    reachSs(m)
    expect(screen.getAllByText(slots.ssClaimWindow(2023, 2031))).toHaveLength(2)
    const claim = screen.getAllByLabelText(copy.ssClaimLabel)[0]!
    fireEvent.focus(claim)
    fireEvent.change(claim, { target: { value: '2028' } }) // 2028 − 1961 = 67
    fireEvent.blur(claim)
    expect(screen.getByText(slots.ssClaimAge(67))).toBeInTheDocument()
    expect(screen.getAllByText(slots.ssClaimWindow(2023, 2031))).toHaveLength(1) // only the untouched spouse
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

    // C3 → B (simplified): the step asks ONE field per working spouse — investment income on
    // top of the salary already entered; a retired spouse's slot is zeroed.
    const investment = screen.getByLabelText(copy.workInvestmentLabel)
    fireEvent.focus(investment)
    fireEvent.change(investment, { target: { value: '30000' } })
    fireEvent.blur(investment)
    expect(draft(m).health.workingYearInvestmentByPerson).toEqual([30_000, 0])
  })
})

describe('the out-of-pocket step — the optional-field BLS reference hint (cold-read)', () => {
  function reachOop(m: MemoryModel) {
    render(<Harness model={m} />)
    // retired + both under 65 → health-quote + oop appear, no income/working-income steps
    for (let i = 0; i < 10 && heading() !== copy.qOopHeading; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    }
    expect(heading()).toBe(copy.qOopHeading)
  }

  it('shows the grounded conservative hint while the field is empty, and hides it once a figure is entered', () => {
    const m = freshModel()
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], workStatus: 'retired', currentAge: 60, birthYear: 1966 },
        { ...d.people[1], workStatus: 'retired', currentAge: 60, birthYear: 1966 },
      ],
    }))
    reachOop(m)
    const hint = slots.oopHint(
      formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.annual),
      formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.federalAverageApproxAnnual),
    )
    expect(screen.getByText(hint)).toBeInTheDocument()

    const field = screen.getByLabelText(copy.oopLabel)
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: '5000' } })
    fireEvent.blur(field)
    expect(screen.queryByText(hint)).toBeNull()
    expect(draft(m).health.oopMedicalAnnual).toBe(5_000)
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
    // Exactly one PERSON group per spouse, named by the entered names (the sex
    // segmented control nests its own fieldset inside each — query by name).
    expect(screen.getByRole('group', { name: 'Sam' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Alex' })).toBeInTheDocument()
  })
})
