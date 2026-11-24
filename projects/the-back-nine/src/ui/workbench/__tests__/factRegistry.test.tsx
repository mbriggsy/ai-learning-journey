// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { intakeSteps } from '@intake/questions'
import { survivorNoteFor } from '@intake/OtherIncomeEntry'
import { workingYearLeftOverWaitingWords } from '@intake/workingYearLeftOver'
import { workingYearLeftOverShownState } from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'
import { planClockAnchor } from '../../bandAnnotations'
import { leftOverLineKey } from '../../assumptionRegistry'
import { copy, slots } from '../../copy'
import { DEV_SEEDS } from '../../devSeeds'
import { FactsPage } from '../FactsPage'
import { composeFacts, type FactStop } from '../factsChrome'
import { ACCOUNT_FACTS, DRAFT_FACTS, shownFacts, type StepSectionId } from '../factRegistry'
import { FULL, GOVERNED } from './factDrafts'

/**
 * THE FIELD WALK (workbench plan U8's test scenario; R14, R15): every field of the saved plan is either shown on the
 * facts page or argued away (`factRegistry.ts`, compile-enforced at every level). This walks the runtime half: the
 * page, rendered over made-up households that hold every field between them, stamps every SHOWN field's line
 * (`data-fact`) behind a door the registry names for it (`data-fact-door`), and stamps nothing the registry doesn't
 * know.
 */

afterEach(cleanup)

const ALL_STEP_SECTIONS: readonly StepSectionId[] = [
  'names', 'work', 'income', 'social-security', 'retirement-state', 'spend', 'health-quote', 'employer-coverage',
  'oop-medical', 'working-income', 'irmaa-seed', 'medicare-extras', 'accounts', 'other-income', 'working-cost',
  'working-ledger',
]

/** Every stamp the page renders over `draft`, with the door each sits behind. */
function stampsOf(draft: ScenarioDraft): Map<string, Set<string>> {
  const sections = composeFacts({
    draft,
    stepIds: intakeSteps(draft).map((s) => s.id),
    anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear),
    stop: { route: 'dated', year: draft.startCalendarYear + 4, track: 'full', marked: false },
  })
  const { container } = render(<FactsPage sections={sections} onOpen={() => {}} />)
  const out = new Map<string, Set<string>>()
  for (const el of container.querySelectorAll('[data-fact]')) {
    const door = el.closest('[data-fact-door]')?.getAttribute('data-fact-door') ?? '(no door)'
    for (const stamp of (el.getAttribute('data-fact') ?? '').split(' ').filter((s) => s !== '')) {
      const doors = out.get(stamp) ?? new Set<string>()
      doors.add(door)
      out.set(stamp, doors)
    }
  }
  cleanup()
  return out
}

describe('the facts page’s field walk (R14, R15)', () => {
  it('the made-up households walk every step of the walk, so no section goes unread (non-vacuity)', () => {
    expect([...new Set([FULL, GOVERNED].flatMap((d) => intakeSteps(d).map((s) => s.id)))].sort()).toEqual([...ALL_STEP_SECTIONS].sort())
  })

  it('every shown field is stamped on the page, behind a door the registry names for it; no unknown stamp', () => {
    const seen = new Map<string, Set<string>>()
    for (const draft of [FULL, GOVERNED]) {
      for (const [stamp, doors] of stampsOf(draft)) {
        const all = seen.get(stamp) ?? new Set<string>()
        for (const d of doors) all.add(d)
        seen.set(stamp, all)
      }
    }
    const shown = shownFacts()
    expect(shown.size, '[non-vacuity] the registry shows dozens of fields').toBeGreaterThan(40)
    const missing = [...shown.keys()].filter((stamp) => !seen.has(stamp))
    expect(missing, 'shown fields the page never stamps').toEqual([])
    for (const [stamp, doors] of seen) {
      const allowed = shown.get(stamp as never)
      expect(allowed, `the page stamps "${stamp}", which the registry does not show`).toBeDefined()
      for (const door of doors) expect(allowed, `"${stamp}" sits behind "${door}"`).toContain(door)
    }
  })

  it('a field argued away is never stamped, and every argued field says why in one line', () => {
    for (const [key, d] of [...Object.entries(DRAFT_FACTS), ...Object.entries(ACCOUNT_FACTS).map(([k, v]) => [`account.${k}`, v] as const)]) {
      if (d.kind !== 'not-a-fact') continue
      expect(d.why.length, key).toBeGreaterThan(20)
      expect(d.why.includes('\n'), key).toBe(false)
    }
    // The non-facts: the stamps, the record, and schema version 6's ids and kept what-ifs (the workbench plan's U9) —
    // FULL and GOVERNED carry an id on every account and line and a kept what-if, so the page had each to print.
    const nonFacts = [
      'seed', 'savedAt', 'filing', 'startCalendarYear', 'savedRecommendation', 'taxVintage', 'appDefaultVersion',
      'healthcareVintage', 'taxVintageDetail', 'dateVintage', 'stateTaxVintage', 'keptWhatIfs', 'account.id',
    ]
    expect(FULL.keptWhatIfs?.length, '[non-vacuity] the made-up household keeps a what-if').toBeGreaterThan(0)
    expect(GOVERNED.budget?.every((l) => l.id !== undefined), '[non-vacuity] every line carries an id').toBe(true)
    for (const draft of [FULL, GOVERNED]) {
      const seen = stampsOf(draft)
      for (const key of nonFacts) expect(seen.has(key), key).toBe(false)
    }
    // …and no id or kept what-if name reaches a printed value.
    const values = [FULL, GOVERNED].flatMap((draft) =>
      composeFacts({
        draft,
        stepIds: intakeSteps(draft).map((s) => s.id),
        anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear),
      }).flatMap((s) => s.groups.flatMap((g) => g.lines.map((l) => `${l.label} ${l.value}`))),
    )
    for (const id of ['acct-401k', 'acct-hsa', 'line-food', 'line-travel', 'wi-later', 'Stop later']) {
      expect(values.some((v) => v.includes(id)), id).toBe(false)
    }
  })

  it('a fact reads exactly: no value on the page wears "~" or "about" (R11), the tool’s own extras figure included', () => {
    const values = [FULL, GOVERNED].flatMap((draft) =>
      composeFacts({
        draft,
        stepIds: intakeSteps(draft).map((s) => s.id),
        anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear),
      }).flatMap((s) => s.groups.flatMap((g) => g.lines.map((l) => l.value))),
    )
    expect(values.length).toBeGreaterThan(60)
    // The tool's own Medicare-extras figure is the one value the household didn't give: it says so in words, exactly.
    expect(values).toContain(slots.workbenchFactExtrasToolFigure('244'))
    for (const v of values) {
      expect(v, v).not.toMatch(/~/)
      expect(v, v).not.toMatch(/\babout\b/i)
    }
  })

  it('reads each value in plain words: the spending by the month as entered, a custom order, the Roth plan, a budget line', () => {
    const at = (draft: ScenarioDraft) =>
      composeFacts({
        draft,
        stepIds: intakeSteps(draft).map((s) => s.id),
        anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear),
      }).flatMap((s) => s.groups.flatMap((g) => g.lines))
    const full = at(FULL)
    expect(full.find((l) => l.label === copy.spendLabel)?.value).toBe('$8,000 a month ($96,000 a year)')
    expect(full.find((l) => l.label === copy.assumptionDrawdownName)?.value).toBe('Brokerage, then Pre-tax, then Roth')
    expect(full.find((l) => l.label === copy.assumptionRothName)?.value).toBe(`$40,000 a year for 5 years, starting in ${FULL.startCalendarYear + 1}`)
    const governed = at(GOVERNED)
    expect(governed.find((l) => l.label === copy.spendLabel)?.value).toBe('$47,000 a year, set by your budget') // the lines on in year 0 and out-of-pocket medical
    // No dated stop on this working household: the editor's own year numbers, and the group says what year 0 is.
    expect(governed.find((l) => l.label === 'See the kids')?.value).toBe('$15,000 a year, extra, year 2 through year 9')
    expect(governed.find((l) => l.label === copy.budgetCatFood)?.value).toBe('$12,000 a year, essential, year 0 through year 19')
  })
})

/** The lines of `draft`'s page (every section), with an optional stop. */
const linesOf = (draft: ScenarioDraft, stop?: FactStop) =>
  composeFacts({
    draft,
    stepIds: intakeSteps(draft).map((s) => s.id),
    anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear),
    ...(stop !== undefined ? { stop } : {}),
  }).flatMap((s) => s.groups.flatMap((g) => g.lines))

describe('the facts page reads each value as the run reads it (the U8 review)', () => {
  it('F1: the left-over line follows build 2’s shown state, never the stored reply alone (datesavedstale)', () => {
    const d = DEV_SEEDS.datesavedstale
    expect(d.workingYearLeftOver?.kind, '[test setup] a stored "saved" reply').toBe('saved')
    expect(workingYearLeftOverShownState(d)).toBe('waiting-on-w')
    const line = linesOf(d).find((l) => l.label === copy.assumptionWorkingCostLeftOverName)
    expect(line?.value).toBe(copy[leftOverLineKey('waiting-on-w', workingYearLeftOverWaitingWords(d))])
  })

  it('F2: a household under 64 that answered "nothing beyond Part B" sees it, at $0 a month, behind the panel’s extras seat', () => {
    const d: ScenarioDraft = { ...DEV_SEEDS.date, medicareExtrasByPerson: [{ kind: 'none' }, { kind: 'none' }] }
    expect(intakeSteps(d).map((s) => s.id), '[test setup] the walk asks no extras step').not.toContain('medicare-extras')
    const section = composeFacts({ draft: d, stepIds: intakeSteps(d).map((s) => s.id), anchor: planClockAnchor(d.startCalendarYear, d.startCalendarYear) }).find(
      (s) => s.id === 'medicare-extras',
    )
    expect(section?.door).toBe('extras-panel')
    expect(section?.groups.map((g) => g.lines[0]?.value)).toEqual([slots.workbenchFactPerMonth('0'), slots.workbenchFactPerMonth('0')])
  })

  it('F3: a retired owner’s account shows no yearly contributions (the run carries none)', () => {
    const retiredOwner: ScenarioDraft = { ...FULL, people: [{ ...FULL.people[0], workStatus: 'retired', retirementAge: 57, earnedIncomeReal: 0 }, FULL.people[1]] }
    const labels = linesOf(retiredOwner).map((l) => l.label)
    for (const label of [copy.accountContributionLabel, copy.accountMatchLabel, copy.accountHsaEmployerLabel]) expect(labels, label).not.toContain(label)
    expect(linesOf(FULL).map((l) => l.label), '[non-vacuity] the working owner’s show').toContain(copy.accountContributionLabel)
  })

  it('F4: a ramped budget’s total carries the budget’s own anchor note', () => {
    expect(linesOf(GOVERNED).find((l) => l.label === copy.spendLabel)?.note).toBe(copy.budgetAnchorRampNote)
  })

  it('F5: a budget line names its calendar years from the engine’s anchor: the dated stop on the date route, the plan’s first year all-retired', () => {
    const stop: FactStop = { route: 'dated', year: 2032, track: 'full', marked: false }
    expect(linesOf(GOVERNED, stop).find((l) => l.label === 'See the kids')?.value).toBe('$15,000 a year, extra, 2034 through 2041')
    const retired: ScenarioDraft = { ...DEV_SEEDS.budget, budget: [{ category: 'travel', label: 'Trips', annualAmountReal: 9_000, tier: 'discretionary', startYear: 3 }] }
    expect(linesOf(retired).find((l) => l.label === 'Trips')?.value).toBe(`$9,000 a year, extra, from ${retired.startCalendarYear + 3} on`)
  })

  it('F6: an account reads the mix the run reads: a fund’s own (no mix line), a classified ticker’s, or the one entered by hand', () => {
    const groups = composeFacts({ draft: FULL, stepIds: intakeSteps(FULL).map((s) => s.id), anchor: planClockAnchor(FULL.startCalendarYear, FULL.startCalendarYear) })
      .find((s) => s.id === 'accounts')!
      .groups
    const mixOf = (kind: string) => groups.find((g) => g.heading?.includes(kind))?.lines.find((l) => l.label === copy.workbenchFactMix)
    expect(mixOf('401(k)')).toBeUndefined()
    expect(mixOf('Traditional IRA')?.value).toBe('50% stocks, 40% bonds, 10% cash')
    expect(mixOf('Traditional IRA')?.facts).toEqual(['tickerClassifications'])
    expect(mixOf('Brokerage')?.value).toBe('70% stocks, 30% bonds')
  })

  it('F9: a missing required figure reads "Not answered yet"; only the optional out-of-pocket figure reads "Left blank"', () => {
    const d: ScenarioDraft = {
      ...FULL,
      people: [{ ...FULL.people[0], earnedIncomeReal: undefined }, FULL.people[1]],
      health: { ...FULL.health, oopMedicalAnnual: undefined },
    }
    const lines = linesOf(d)
    expect(lines.find((l) => l.label === copy.salaryLabel)?.value).toBe(copy.workbenchFactNotAnswered)
    expect(lines.find((l) => l.label === copy.oopLabel)?.value).toBe(copy.workbenchFactBlank)
  })

  it('F10: a claim already in effect reads "started"; a floor-track stop says essentials-only; an unnamed owner’s verb agrees', () => {
    const p1 = FULL.people[1]
    const claimed: ScenarioDraft = { ...FULL, people: [FULL.people[0], { ...p1, socialSecurityClaimAge: 62 }] }
    expect(linesOf(claimed).filter((l) => l.label === copy.workbenchFactSsStarted)).toHaveLength(1)
    const stop: FactStop = { route: 'dated', year: 2031, track: 'floor', marked: false }
    expect(linesOf(FULL, stop).find((l) => l.label === copy.workbenchFactStop)?.value).toBe(slots.workbenchFactStopYearFloor(2031))
    const unnamed: ScenarioDraft = { ...FULL, people: [{ ...FULL.people[0], name: undefined }, { ...p1, name: undefined }] }
    expect(survivorNoteFor(unnamed, FULL.incomeStreams[1]!)).toBe('This ends if you pass.')
    expect(survivorNoteFor(unnamed, FULL.incomeStreams[0]!)).toBe('You would keep 50% of this if your spouse passes.')
  })
})
