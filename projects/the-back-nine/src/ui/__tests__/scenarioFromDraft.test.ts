import { describe, it, expect } from 'vitest'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import type { ScenarioDraft } from '@store/memoryModel'

// DEV_SEEDS are complete, engine-valid drafts (the `?seed=` fixtures) — the canonical
// "ready to save" inputs. We mutate copies to plant the incompleteness the gate must catch.

describe('scenarioFromDraft — Save completeness + field-fidelity gate', () => {
  it('a complete draft is ready, and the returned scenario is the field-identical v3 form', () => {
    const draft = DEV_SEEDS.retired
    const r = scenarioFromDraft(draft)
    expect(r.ready).toBe(true)
    if (!r.ready) return
    expect(r.scenario.schemaVersion).toBe(3)
    // Field-fidelity: the answer-producing facts survive the round-trip unchanged.
    expect(r.scenario.seed).toBe(draft.seed)
    expect(r.scenario.annualSpendingReal).toBe(draft.annualSpendingReal)
    expect(r.scenario.people).toHaveLength(2)
    expect(r.scenario.incomeStreams).toEqual(draft.incomeStreams)
    expect(r.scenario.filing).toBe(draft.filing)
    expect(r.scenario.startCalendarYear).toBe(draft.startCalendarYear)
  })

  it('a still-working draft IS saveable — a working person honestly carries no retirementAge (council Option B)', () => {
    // The headline fuck-off-date household: a working person's `retirementAge` is deliberately
    // undefined in the draft (the swept date is the answer, not an input). Under Option B the
    // persisted schema makes it ABSENT-for-working, so the draft round-trips WITHOUT any synthetic
    // placeholder injection — the honest model, validated by the codec biconditional.
    const r = scenarioFromDraft(DEV_SEEDS.date)
    expect(r.ready).toBe(true)
    if (r.ready) {
      expect(r.scenario.people[0]?.workStatus).toBe('working')
      // Honestly absent — never a stored placeholder that flip-to-retired could surface as "entered".
      expect(r.scenario.people[0]?.retirementAge).toBeUndefined()
    }
  })

  it('PLANTED FAIL — a working person carrying a retirementAge (the Option-A masquerade) is REJECTED', () => {
    // The artifact bare-Option-A would have stored: a synthetic age on a still-working person. The
    // codec's SOLE restore gate must refuse to decode it, so it can never masquerade as entered.
    const masquerade: ScenarioDraft = {
      ...DEV_SEEDS.date,
      people: [{ ...DEV_SEEDS.date.people[0], retirementAge: 67 }, DEV_SEEDS.date.people[1]],
    }
    expect(scenarioFromDraft(masquerade).ready).toBe(false)
  })

  it('PLANTED FAIL — a missing seed is not saveable (never minted = never persisted)', () => {
    const noSeed: ScenarioDraft = { ...DEV_SEEDS.retired, seed: undefined }
    expect(scenarioFromDraft(noSeed).ready).toBe(false)
  })

  it('PLANTED FAIL — a missing spend figure is not saveable', () => {
    const noSpend: ScenarioDraft = { ...DEV_SEEDS.retired, annualSpendingReal: undefined }
    expect(scenarioFromDraft(noSpend).ready).toBe(false)
  })

  it('PLANTED FAIL — a DND/009 health-array hole (undefined → JSON null) is caught, never persisted', () => {
    const withHole: ScenarioDraft = {
      ...DEV_SEEDS.date,
      health: { ...DEV_SEEDS.date.health, workingYearInvestmentByPerson: [30_000, undefined] },
    }
    expect(scenarioFromDraft(withHole).ready).toBe(false)
  })

  it('PLANTED FAIL — an incomplete person (no birth year) is not saveable', () => {
    const noBirthYear: ScenarioDraft = {
      ...DEV_SEEDS.retired,
      people: [{ ...DEV_SEEDS.retired.people[0], birthYear: undefined }, DEV_SEEDS.retired.people[1]],
    }
    expect(scenarioFromDraft(noBirthYear).ready).toBe(false)
  })
})
