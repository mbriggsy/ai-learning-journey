import { describe, expect, it } from 'vitest'
import { tableRunFor } from '../tableRun'
import { steadyFuture } from '@engine/simulate'
import { roughFuture } from '@engine/reference/roughSequence'
import { buildDateInput, buildSpineParams } from '@intake/intakeMap'
import { DEV_SEEDS } from '../../devSeeds'
import { copy } from '../../copy'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { DateSearchOutcome } from '@shared/model'

/**
 * The table's runs and the meta they carry (workbench plan U7, KTD9): each view asks for its own named future, and
 * every fact the composer and the heading read beside the rows is the run's own, never the draft's raw field.
 */

const headline = (draft: ScenarioDraft): ModelAnswer =>
  ({ kind: 'headline', tier: 'final', draft, inputKey: 'k' }) as unknown as ModelAnswer

const dated = (draft: ScenarioDraft, offsetYears: number): ModelAnswer =>
  ({
    kind: 'date',
    tier: 'final',
    draft,
    outcome: { kind: 'dates', tier: 'final', seed: 1, band: { offsetYears, track: 'lifestyle' } } as unknown as DateSearchOutcome,
    inputKey: 'k',
  }) as unknown as ModelAnswer

describe('tableRunFor — each view asks for its own future', () => {
  it('the steady view carries the steady future and the rough view the rough one (the U7 review’s T1)', () => {
    const run = tableRunFor(headline(DEV_SEEDS.retired))
    if (run.kind !== 'run' || run.views.steady.kind !== 'run' || run.views.rough.kind !== 'run') {
      throw new Error('[test setup] retired: no table run')
    }
    const params = run.views.steady.request.params
    const rough = roughFuture(params)
    if (!rough.ok) throw new Error('[test setup] the rough future was refused')
    expect(run.views.steady.request.options?.namedFuture).toEqual(steadyFuture(params))
    expect(run.views.rough.request.options?.namedFuture).toEqual(rough.future)
    expect(run.views.rough.request.options?.namedFuture).not.toEqual(steadyFuture(params))
  })
})

describe('tableRunFor — the meta is the run’s own', () => {
  it('working-year investment income is what the run prices: working members only, the date route only (RUN-1, W8)', () => {
    // A member switched to retired keeps a stale figure in the draft; the run never prices it, so the table must not
    // say it is counted. The built input is the same with and without the stale figure.
    const stale: ScenarioDraft = { ...DEV_SEEDS.date, health: { ...DEV_SEEDS.date.health, workingYearInvestmentByPerson: [0, 12_000] } }
    const clean: ScenarioDraft = { ...DEV_SEEDS.date, health: { ...DEV_SEEDS.date.health, workingYearInvestmentByPerson: [0, 0] } }
    expect(buildDateInput(stale)?.workingYearInvestmentByPerson, '[test setup] the stale slot builds nothing').toEqual(
      buildDateInput(clean)?.workingYearInvestmentByPerson,
    )
    const run = tableRunFor(dated(stale, 4))
    if (run.kind !== 'run') throw new Error(`[test setup] date: no table run (${run.kind})`)
    expect(run.meta.investmentByPerson.some((x) => x > 0)).toBe(false)
    // The working member's own figure is carried, the retired member's slot is 0.
    const working = tableRunFor(dated(DEV_SEEDS.date, 4))
    if (working.kind !== 'run') throw new Error('[test setup] date: no table run')
    expect(working.meta.investmentByPerson).toEqual([30_000, 0])
    // On the spine nobody works, so a figure left in the draft is never priced.
    const retiredStale: ScenarioDraft = {
      ...DEV_SEEDS.retired,
      health: { ...DEV_SEEDS.retired.health, workingYearInvestmentByPerson: [30_000, 0] },
    }
    expect(buildSpineParams(retiredStale), '[test setup] the spine ignores the field').toEqual(buildSpineParams(DEV_SEEDS.retired))
    const spine = tableRunFor(headline(retiredStale))
    if (spine.kind !== 'run') throw new Error('[test setup] retired: no table run')
    expect(spine.meta.investmentByPerson.some((x) => x > 0)).toBe(false)
  })

  it('whether the run prices a state income tax comes from the run’s own overlay (W6)', () => {
    const at = (draft: ScenarioDraft) => {
      const run = tableRunFor(headline(draft))
      if (run.kind !== 'run') throw new Error('[test setup] no table run')
      return run.meta
    }
    expect(at(DEV_SEEDS.retired).statePriced, 'no state answered').toBe(false)
    expect(at(DEV_SEEDS.elsewhere).statePriced, 'a state the tool does not price').toBe(false)
    expect(at(DEV_SEEDS.nc).statePriced).toBe(true)
    expect(at(DEV_SEEDS.nc).stateTaxReading).toBe('agi-derived')
    expect(at(DEV_SEEDS.pa).stateTaxReading).toBe('class-based')
    expect(at(DEV_SEEDS.retired).stateTaxReading).toBe('unpriced')
  })

  it('the left-over answer’s state and the figure the run carries ride with the run (W3, W4)', () => {
    // `tablewidest` answered "saved": the run carries the figure, and a row can name the cap that binds.
    const saved = tableRunFor(dated(DEV_SEEDS.tablewidest, 6))
    if (saved.kind !== 'run') throw new Error('[test setup] tablewidest: no table run')
    const ask = saved.views.steady
    if (ask.kind !== 'run') throw new Error('[test setup] tablewidest: the steady view was refused')
    expect(saved.meta.leftOverState).toMatch(/^saved/)
    expect(saved.meta.leftOverSaved).toBeGreaterThan(0)
    expect(saved.meta.leftOverSaved).toBe(ask.request.params.overlay?.accumulation?.workingYearLeftOverSavedReal)
    // `date` never answered the question: nothing is carried.
    const unanswered = tableRunFor(dated(DEV_SEEDS.date, 4))
    if (unanswered.kind !== 'run') throw new Error('[test setup] date: no table run')
    expect(unanswered.meta.leftOverState).not.toMatch(/^saved/)
    expect(unanswered.meta.leftOverSaved).toBeUndefined()
  })

  it('a household with Social Security but no savings, pension, other income or premium is held back in words that never say it has no income (W10)', () => {
    const ssOnly: ScenarioDraft = { ...DEV_SEEDS.retired, enteredAccounts: [], incomeStreams: [] }
    expect(ssOnly.people.every((p) => (p.pia ?? 0) > 0), '[test setup] both draw Social Security').toBe(true)
    expect(tableRunFor(headline(ssOnly))).toEqual({ kind: 'withheld', reason: 'no-ledger' })
    // The words name what the condition reads (no account, no pension or other income stream, no premium), so a
    // household living on Social Security is never told it has no income.
    expect(copy.workbenchWithheldNoLedger).toMatch(/no pension or other income/)
    expect(copy.workbenchWithheldNoLedger).not.toMatch(/no savings, income/)
  })
})
