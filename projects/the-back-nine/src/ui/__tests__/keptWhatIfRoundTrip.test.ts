import { describe, expect, it } from 'vitest'
import { applyBundle } from '@intake/whatIf'
import type { ScenarioDraft } from '@store/memoryModel'
import { scenarioIdentityKey, type CurrentScenario, type KeptWhatIfV6 } from '@shared/model'
import { DEV_SEEDS } from '../devSeeds'
import { draftFromScenario } from '../draftFromScenario'
import { currentEpochDay, scenarioFromDraft } from '../scenarioFromDraft'
import { deriveResultSave, persistSeedFor } from '../resultSave'
import { applyState, refusalWords } from '../workbench/railChrome'
import { copy } from '../copy'

/**
 * Kept what-ifs across a save and a reopen (plan 6, RC5's test scenarios; insights 073 and 102): the list survives with
 * the same bytes on a plan aged by DAYS (time never passes inside a test run, so the age is written into the fixture's
 * `savedAt`); an account a kept what-if points at, edited, saved and reopened, is still pointed at; with its targeted line
 * and account deleted and new ones added, saved and reopened, the what-if still says gone (a new entry never takes a
 * pointed-at id); a kept stop year on a household that has since fully retired says so and runs nothing; a kept bundle
 * holding a stop year withholds Apply with its reason.
 */

const AGE_DAYS = 40

/** A save: the draft through the codec, the disk's own scenario. */
function save(draft: ScenarioDraft): CurrentScenario {
  const ready = scenarioFromDraft(draft)
  if (!ready.ready) throw new Error(`[test setup] ${ready.detail}`)
  return ready.scenario
}
/** A reopen: the disk's scenario back to a draft (ids minted where missing, as the open does). */
function reopen(disk: CurrentScenario): ScenarioDraft {
  const hydrated = draftFromScenario(disk)
  if (!hydrated.ok) throw new Error('[test setup] the reopen refused')
  return hydrated.draft
}

/** The budget household opened once, so every account and line carries its id. */
const opened = reopen(save(DEV_SEEDS.budget))
const account = opened.enteredAccounts[0]!
const line = opened.budget![0]!
const KEPT: readonly KeptWhatIfV6[] = [
  { id: 'kept-deposit', name: 'Save more', levers: [{ kind: 'deposits', accountId: account.id!, annualContribution: 12_000 }] },
  { id: 'kept-line', name: 'Smaller line', levers: [{ kind: 'spending', op: 'replace', line: { ...line, id: line.id!, annualAmountReal: Math.round(line.annualAmountReal / 2) } }] },
  { id: 'kept-order', name: 'Pre-tax first', levers: [{ kind: 'withdrawal-order', policy: 'pre-tax-first' }] },
]

describe('a plan holding kept what-ifs, saved and reopened', () => {
  it(`saved ${AGE_DAYS} days ago and reopened: the list re-encodes with the same bytes, and the plan reads saved`, () => {
    const disk: CurrentScenario = { ...save({ ...opened, keptWhatIfs: KEPT }), savedAt: currentEpochDay() - AGE_DAYS }
    const draft = reopen(disk)
    const again = scenarioFromDraft(draft)
    if (!again.ready) throw new Error(again.detail)
    expect(JSON.stringify(again.scenario.keptWhatIfs), 'the same bytes').toBe(JSON.stringify(disk.keptWhatIfs))
    expect(scenarioIdentityKey(again.scenario), 'no wall-clock stamp outside scenarioIdentity (insight 073)').toBe(scenarioIdentityKey(disk))
    expect(again.scenario.savedAt, 'the stamp itself moved').not.toBe(disk.savedAt)
    expect(deriveResultSave({ kind: 'saved', scenario: persistSeedFor(again.scenario, disk.savedAt) }, again)).toEqual({ kind: 'clean' })
  })

  it('an account a kept what-if points at, edited, saved and reopened, is still pointed at', () => {
    const edited: ScenarioDraft = {
      ...opened,
      keptWhatIfs: KEPT,
      enteredAccounts: opened.enteredAccounts.map((a, i) => (i === 0 ? { ...a, valueToday: a.valueToday + 25_000 } : a)),
    }
    const back = reopen(save(edited))
    const lever = back.keptWhatIfs![0]!.levers[0]!
    expect(lever.kind === 'deposits' && back.enteredAccounts.some((a) => a.id === lever.accountId)).toBe(true)
    // Pointed at, so it is judged on that account (here: its owner no longer works, said by name), never "gone".
    const applied = applyBundle(back, KEPT[0]!.levers)
    expect(applied.ok ? null : applied.refusal.kind).not.toBe('account-gone')
  })

  it('AE8’s twist: the targeted line and account deleted, new ones added, saved and reopened, the what-if still says gone', () => {
    const newLine = { ...line, id: undefined, label: 'New line', annualAmountReal: 1_200 }
    const newAccount = { ...account, id: undefined }
    const changed = {
      ...opened,
      keptWhatIfs: KEPT,
      enteredAccounts: [...opened.enteredAccounts.slice(1), newAccount],
      budget: [...opened.budget!.slice(1), newLine],
    } as unknown as ScenarioDraft
    const back = reopen(save(changed))
    // The new entries took fresh ids, never the ones the kept what-ifs point at.
    expect(back.enteredAccounts.some((a) => a.id === account.id)).toBe(false)
    expect(back.budget!.some((l) => l.id === line.id)).toBe(false)
    const deposit = applyBundle(back, back.keptWhatIfs![0]!.levers)
    const spend = applyBundle(back, back.keptWhatIfs![1]!.levers)
    expect(deposit.ok ? null : deposit.refusal).toEqual({ kind: 'account-gone', accountId: account.id })
    expect(spend.ok ? null : spend.refusal).toEqual({ kind: 'line-gone', lineId: line.id })
    expect(refusalWords({ kind: 'account-gone', accountId: account.id! }, back.startCalendarYear)).toBe(copy.workbenchRailRefusedAccountGone)
    expect(refusalWords({ kind: 'line-gone', lineId: line.id! }, back.startCalendarYear)).toBe(copy.workbenchRailRefusedLineGone)
  })
})

describe('a kept stop year (a calendar year)', () => {
  const working = DEV_SEEDS.dip
  // The year is the plan's own start plus an offset, never a typed calendar year a real clock will pass (insight 166).
  const stop = { kind: 'stop-year', calendarYear: working.startCalendarYear + 3 } as const

  it('on a household that has since fully retired, says so and runs nothing', () => {
    const retired: ScenarioDraft = { ...working, people: working.people.map((p) => ({ ...p, workStatus: 'retired' as const })) as unknown as ScenarioDraft['people'] }
    const applied = applyBundle(retired, [stop])
    expect(applied.ok ? null : applied.refusal).toEqual({ kind: 'stop-year-all-retired' })
    expect(refusalWords({ kind: 'stop-year-all-retired' }, retired.startCalendarYear)).toBe(copy.workbenchRailRefusedAllRetired)
  })

  it('reopened in the tray, withholds Apply with its reason; without the stop year the rest can apply', () => {
    expect(applyState(working, [stop], true)).toEqual({ kind: 'withheld', words: copy.workbenchRailApplyWithheldStop })
    expect(applyState(working, [{ kind: 'withdrawal-order', policy: 'pre-tax-first' }], true).kind).toBe('open')
  })
})
