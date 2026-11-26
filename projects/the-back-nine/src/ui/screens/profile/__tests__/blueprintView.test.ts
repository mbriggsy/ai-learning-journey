import { describe, expect, it } from 'vitest'
import type { DateSearchOutcome, DateTrackOutcome } from '@shared/model'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { heroLead } from '../../../dateHero'
import { blueprintView, legendFor, type BlueprintInput, type BlueprintTile, type BlueprintView } from '../blueprintView'
import { expensesView, incomeView, savingsView } from '../profileView'
import { tablePerson } from '../../../workbench/tableRun'

/**
 * Profile → Blueprint's composer (Act 6 · RC15; plan RC15's test scenarios): every tile names its category in words; no
 * joint column; every tile opens its Profile card's own drawer; the Goals timeline orders by year and prints both ages;
 * the work-optional date is the SETTLED answer's (a provisional or re-figuring answer prints no year at all); a working
 * household's budget lines take calendar years only from that date (insight 167). Every expected year is derived from the
 * fixture's own `startCalendarYear` and ages, never typed (insight 166).
 */

const retired = DEV_SEEDS.retired // Alex 66 and Sam 65, both retired; one traditional IRA, Alex's
const working = DEV_SEEDS.date // Alex 58 working, Sam 60 retired; Alex's 401(k), Sam's Roth IRA
const budgetRetired = DEV_SEEDS.budget // a retired couple with a budget, every line from year 0
const budgetWorking = DEV_SEEDS.datesplit // a working couple with a budget

const ANCHOR = (d: ScenarioDraft) => ({ startCalendarYear: d.startCalendarYear, yearsSincePlanBuilt: 0 })
const input = (draft: ScenarioDraft, over: Partial<BlueprintInput> = {}): BlueprintInput => ({
  draft,
  tab: 'net-worth',
  readOnly: false,
  agedBalancesYear: undefined,
  answer: { kind: 'pending' },
  refiguring: false,
  anchor: ANCHOR(draft),
  ...over,
})

function tilesOf(v: BlueprintView): BlueprintTile[] {
  const b = v.body
  if (b.kind === 'net-worth') return b.columns.flatMap((c) => [...c.tiles])
  if (b.kind === 'goals') return [...b.groups, ...(b.after?.groups ?? [])].flatMap((g) => [...g.tiles]).concat(b.unplaced?.tiles ?? [])
  return b.lanes.flatMap((l) => [...(l.cells ?? []).flatMap((c) => [...c.tiles]), ...(l.shared?.tiles ?? [])])
}

const track = (offsetYears: number, kind: 'confirmed-date' | 'window-edge-unconfirmed' = 'confirmed-date'): DateTrackOutcome => ({
  kind,
  offsetYears,
  grade: { quantizedLowerBound: 0.9, survivalFraction: 0.92, marginAboveBar: 0.05 },
  nonMonotoneOffsets: [],
  curve: [],
})
const noDate: DateTrackOutcome = { kind: 'no-date-in-window', bestQuantizedLowerBound: 0.6, nonMonotoneOffsets: [], curve: [] } as unknown as DateTrackOutcome
const dateAnswer = (draft: ScenarioDraft, t: DateTrackOutcome, tier: 'final' | 'provisional' = 'final'): ModelAnswer =>
  ({
    kind: 'date',
    tier,
    draft,
    inputKey: 'k',
    outcome: { kind: 'dates', tier, floor: t, lifestyle: t, windowTopYears: 15, seed: 1 } as unknown as DateSearchOutcome,
  }) as ModelAnswer

describe('every tab', () => {
  for (const tab of ['net-worth', 'goals', 'ise'] as const) {
    it(`${tab}: every tile prints a category word from the legend, and the legend names every colour it uses`, () => {
      for (const d of [retired, working, budgetRetired, budgetWorking]) {
        const v = blueprintView(input(d, { tab }))
        const legend = legendFor(tab)
        const tiles = tilesOf(v)
        expect(tiles.length).toBeGreaterThan(0)
        for (const t of tiles) {
          const entry = legend.find((l) => l.id === t.legend)
          expect(entry, `${t.id}: its legend entry`).toBeDefined()
          expect(t.category, `${t.id}: its category word`).toBe(entry!.label)
          expect(t.tone).toBe(entry!.tone)
        }
        expect(new Set(tiles.map((t) => t.id)).size, 'tile ids unique on a tab (focus returns by id)').toBe(tiles.length)
      }
    })
  }

  it('read-only: no Add menu on any tab', () => {
    for (const tab of ['net-worth', 'goals', 'ise'] as const) expect(blueprintView(input(working, { tab, readOnly: true })).add).toBeNull()
    expect(blueprintView(input(working, { tab: 'net-worth' })).add?.label).toBe(copy.profileAddAccount)
    expect(blueprintView(input(working, { tab: 'ise' })).add?.label).toBe(copy.blueprintAdd)
  })
})

describe('Net Worth', () => {
  it('two columns, one per person, never a joint one; each account in its owner’s column once, opening its drawer on what it holds', () => {
    const b = blueprintView(input(working)).body
    if (b.kind !== 'net-worth') throw new Error('[test]')
    expect(b.columns).toHaveLength(2)
    working.enteredAccounts.forEach((a, index) => {
      const col = b.columns[a.ownerIndex]!
      expect(col.tiles.filter((t) => t.id === `account-${index}`)).toHaveLength(1)
      expect(col.tiles.find((t) => t.id === `account-${index}`)!.target).toEqual({ kind: 'account', index, facet: 'holdings' })
    })
    expect(b.columns[0]!.person).toEqual({ name: 'Alex', age: slots.bpAge(working.people[0].currentAge!) })
  })

  it('the headline is the invested accounts’ total, never a net worth, with the Net Worth page’s stopgap lines word for word', () => {
    const v = blueprintView(input(retired))
    expect(v.headline).toBe(slots.profileInvestmentTotal(copy.snapshotInvestedTitle, '$1,120,000'))
    expect(v.headline).not.toMatch(/net worth/i)
    expect(v.headlineFigure).toBe(true)
    expect(v.notes).toContain(copy.snapshotInvestedStopgap)
    expect(v.notes).toContain(copy.profileInheritedIraStopgap)
  })

  it('a person with no account says so in their column', () => {
    const b = blueprintView(input(retired)).body
    if (b.kind !== 'net-worth') throw new Error('[test]')
    expect(b.columns[1]!.tiles).toEqual([])
    expect(b.columns[1]!.empty).toBe(slots.bpNoAccounts('Sam’s'))
  })
})

describe('Goals', () => {
  const goals = (d: ScenarioDraft, over: Partial<BlueprintInput> = {}) => {
    const b = blueprintView(input(d, { tab: 'goals', ...over })).body
    if (b.kind !== 'goals') throw new Error('[test]')
    return b
  }
  const groupOf = (b: ReturnType<typeof goals>, id: string) => b.groups.find((g) => g.tiles.some((t) => t.id === id))

  it('a retired household: years in order, both ages beside each on the engine’s clock; each stop, claim and Medicare in its year', () => {
    const b = goals(retired)
    const years = b.groups.map((g) => Number(g.label))
    expect(years).toEqual([...years].sort((x, y) => x - y))
    const start = retired.startCalendarYear
    const [alex, sam] = retired.people
    const yearOf = (now: number, age: number) => start + (age - now)
    expect(groupOf(b, 'retirement-0')!.label).toBe(String(yearOf(alex.currentAge!, alex.retirementAge!)))
    expect(groupOf(b, 'ss-1')!.label).toBe(String(yearOf(sam.currentAge!, sam.socialSecurityClaimAge!)))
    const medicare = groupOf(b, 'medicare-1')!
    expect(medicare.label).toBe(String(yearOf(sam.currentAge!, 65)))
    expect(medicare.ages).toBe(slots.bpAges([slots.bpAgeOf('Alex', alex.currentAge! + (65 - sam.currentAge!)), slots.bpAgeOf('Sam', 65)]))
    expect(medicare.tiles.find((t) => t.id === 'medicare-1')!.value, 'eligibility, never an enrollment').toBe(copy.blueprintMedicareRetired)
    expect(b.after).toBeNull()
    expect(b.unplaced).toBeNull()
  })

  it('Goals’ tiles open the Profile cards’ own drawers: the person drawer, the Social Security drawer, the Medicare drawer', () => {
    const tiles = tilesOf(blueprintView(input(retired, { tab: 'goals' })))
    expect(tiles.find((t) => t.id === 'retirement-1')!.target).toEqual({ kind: 'person', index: 1 })
    expect(tiles.find((t) => t.id === 'ss-0')!.target).toEqual({ kind: 'social-security', index: 0 })
    expect(tiles.find((t) => t.id === 'medicare-0')!.target).toEqual({ kind: 'medicare' })
  })

  it('a retired household’s budget lines take the plan’s first year as year 0 (the drawer’s own frame)', () => {
    const b = goals(budgetRetired)
    const first = budgetRetired.budget![0]!
    const tile = b.groups.flatMap((g) => g.tiles).find((t) => t.id === 'bp-line-0')!
    expect(groupOf(b, 'bp-line-0')!.label).toBe(String(budgetRetired.startCalendarYear + first.startYear))
    expect(tile.value).toBe(slots.bpLineFrom(first.annualAmountReal.toLocaleString('en-US'), budgetRetired.startCalendarYear + first.startYear))
    expect(tile.target).toEqual({ kind: 'living' })
    expect(b.groups.some((g) => g.tiles.length === 0)).toBe(false)
  })

  it('one spending figure: no spending tiles, and the line that says why', () => {
    expect(tilesOf(blueprintView(input(retired, { tab: 'goals' }))).some((t) => t.legend === 'spending')).toBe(false)
    expect(blueprintView(input(retired, { tab: 'goals' })).lines).toEqual([copy.blueprintSpendingOneFigure])
  })

  it('a working household before its answer: the stop and every budget line wait in "After work stops", with no calendar year and no date', () => {
    const b = goals(budgetWorking)
    const after = b.after!
    expect(after.groups[0]!.label).toBe(slots.bpAfterStop(0))
    expect(after.groups.every((g) => g.ages === null)).toBe(true)
    const stop = after.groups[0]!.tiles.find((t) => t.id === 'retirement-0')!
    expect(stop.value).toBe(copy.profileFindsDate)
    expect(stop.crowned).toBeUndefined()
    // Both work here: both stops wait; no budget line is on the calendar; the claims and Medicare (ages) are.
    expect(after.groups[0]!.tiles.find((t) => t.id === 'retirement-1')!.value).toBe(copy.profileFindsDate)
    expect(b.groups.flatMap((g) => g.tiles).some((t) => t.legend === 'spending' || t.legend === 'retirement')).toBe(false)
    expect(groupOf(b, 'ss-0')).toBeDefined()
    // A retired member's own stop stays on the calendar (its year is an entered age, not the answer's).
    expect(groupOf(goals(working), 'retirement-1')).toBeDefined()
    const lifelong = budgetWorking.budget!.findIndex((l) => l.endYear === undefined)
    const tile = after.groups.flatMap((g) => g.tiles).find((t) => t.id === `bp-line-${lifelong}`)!
    expect(tile.value).toBe(slots.bpLineOnward(budgetWorking.budget![lifelong]!.annualAmountReal.toLocaleString('en-US')))
  })

  it('a SETTLED date: the crowned stop and the budget lines take the answer’s calendar (its build year plus the crowned offset)', () => {
    const offset = 6
    const answer = dateAnswer(budgetWorking, track(offset))
    const b = goals(budgetWorking, { answer })
    const stopYear = budgetWorking.startCalendarYear + offset
    const stopGroup = groupOf(b, 'retirement-0')!
    expect(stopGroup.label).toBe(String(stopYear))
    const stop = stopGroup.tiles.find((t) => t.id === 'retirement-0')!
    expect(stop.crowned).toBe(true)
    expect(stop.value).toBe(heroLead(track(offset), 15, ANCHOR(budgetWorking)))
    budgetWorking.budget!.forEach((line, k) => {
      expect(groupOf(b, `bp-line-${k}`)!.label, `line ${k}`).toBe(String(stopYear + line.startYear))
    })
    expect(b.after).toBeNull()
    // The date's distance never stands alone: its year group carries both ages.
    expect(stopGroup.ages).toBe(
      slots.bpAges([slots.bpAgeOf('Alex', budgetWorking.people[0].currentAge! + offset), slots.bpAgeOf('Sam', budgetWorking.people[1].currentAge! + offset)]),
    )
  })

  it('a window-edge date says it sits at the edge of what the math can confirm', () => {
    const b = goals(working, { answer: dateAnswer(working, track(15, 'window-edge-unconfirmed')) })
    expect(b.groups.flatMap((g) => g.tiles).find((t) => t.id === 'retirement-0')!.note).toBe(copy.dateWindowEdgeNote)
  })

  it('a provisional or re-figuring date prints no year at all (never a provisional date without its tag: here, none)', () => {
    for (const over of [{ answer: dateAnswer(working, track(6), 'provisional') }, { answer: dateAnswer(working, track(6)), refiguring: true }]) {
      const b = goals(working, over)
      expect(groupOf(b, 'retirement-0')).toBeUndefined()
      expect(b.after!.groups[0]!.tiles.find((t) => t.id === 'retirement-0')!.value).toBe(copy.profileFindsDate)
      expect(tilesOf(blueprintView(input(working, { tab: 'goals', ...over }))).some((t) => t.crowned === true)).toBe(false)
    }
  })

  it('no date in the window: the answer’s own sentence, and no calendar year for the stop', () => {
    const b = goals(working, { answer: dateAnswer(working, noDate) })
    const stop = b.after!.groups[0]!.tiles.find((t) => t.id === 'retirement-0')!
    expect(stop.value).toBe(slots.noDateInWindow(15))
  })

  it('a member still working: Medicare reads as what the engine prices (from 65, or from the stop if later)', () => {
    const tiles = tilesOf(blueprintView(input(working, { tab: 'goals' })))
    expect(tiles.find((t) => t.id === 'medicare-0')!.value).toBe(copy.blueprintMedicareWorking)
    expect(tiles.find((t) => t.id === 'medicare-1')!.value).toBe(copy.blueprintMedicareRetired)
  })

  it('answerShown: the Goals tab over the answer’s sentence (the crowned date, the no-date words), whatever Edit hides; false while pending or on another tab (the review’s E3)', () => {
    const settled = { tab: 'goals' as const, answer: dateAnswer(working, track(4)) }
    expect(blueprintView(input(working, settled)).answerShown).toBe(true)
    expect(blueprintView(input(working, { tab: 'goals', answer: dateAnswer(working, noDate) })).answerShown, 'the no-date words are the answer too').toBe(true)
    expect(blueprintView(input(working, { tab: 'goals' })).answerShown, 'pending: no sentence').toBe(false)
    expect(blueprintView(input(working, { ...settled, tab: 'net-worth' })).answerShown).toBe(false)
    // Milestone 3's review, round 2: with the stops hidden the spending tiles still read the crowned date.
    expect(blueprintView(input(working, { ...settled, hidden: new Set(['retirement']) })).answerShown, 'Edit hid the stops').toBe(true)
    expect(blueprintView(input(working, { ...settled, hidden: new Set(['retirement', 'social-security', 'medicare', 'spending']) })).answerShown, 'every category hidden').toBe(true)
    expect(blueprintView(input(retired, { tab: 'goals' })).answerShown, 'a retired household’s timeline prints no answer').toBe(false)
  })

  it('a fact still missing puts its tile in "Not on the timeline yet", never at a guessed year', () => {
    const { socialSecurityClaimAge: _gone, ...noClaim } = working.people[1]
    const d = { ...working, people: [working.people[0], noClaim] } as ScenarioDraft
    const b = goals(d)
    expect(b.unplaced!.tiles.map((t) => t.id)).toEqual(['ss-1'])
    expect(b.unplaced!.tiles[0]!.value).toBe(copy.profileNotAnswered)
  })
})

describe('Income, Savings, Expenses', () => {
  it('two people’s columns and the household’s row; every tile is its Profile card, opening the same drawer', () => {
    const v = blueprintView(input(working, { tab: 'ise' }))
    const b = v.body
    if (b.kind !== 'ise') throw new Error('[test]')
    expect(b.lanes.map((l) => l.id)).toEqual(['income', 'savings', 'expenses'])
    const cards = [...incomeView(working, false).cards, ...savingsView(working, false).cards, ...expensesView(working).cards]
    for (const t of tilesOf(v)) expect(t.target, t.id).toEqual(cards.find((c) => c.id === t.id)!.target)
    expect(tilesOf(v).map((t) => t.id).sort()).toEqual(cards.map((c) => c.id).sort())
    // Alex's salary and Social Security in Alex's column; Sam (retired) puts nothing in.
    expect(b.lanes[0]!.cells![0]!.tiles.map((t) => t.id)).toEqual(['salary-0', 'ss-0', 'invest-0'])
    expect(b.lanes[1]!.cells![1]!.empty).toBe(copy.blueprintNothingGoesIn)
    expect(b.lanes[2]!.cells).toBeNull()
    expect(b.lanes[2]!.shared!.label).toBe(copy.blueprintBothOfYou)
  })

  // Milestone 3's review, round 2: a blank work status is never "work has stopped".
  it('an unanswered work status: the Savings cell says it is still needed on Family, never that work has stopped', () => {
    const { workStatus: _w, ...sam } = working.people[1]
    const b = blueprintView(input({ ...working, people: [working.people[0], sam] } as ScenarioDraft, { tab: 'ise' })).body
    if (b.kind !== 'ise') throw new Error('[test]')
    expect(b.lanes[1]!.cells![1]!.empty).toBe(slots.profileWorkUnanswered('Sam’s'))
  })

  it('a working person with no deposit account: that person’s own line, door words naming this page’s Add only where it is drawn (the review’s E1)', () => {
    const noAccounts: ScenarioDraft = { ...working, enteredAccounts: [] }
    const cell = (readOnly: boolean) => {
      const b = blueprintView(input(noAccounts, { tab: 'ise', readOnly })).body
      if (b.kind !== 'ise') throw new Error('[test]')
      return b.lanes[1]!.cells![0]!.empty
    }
    const possessive = tablePerson(noAccounts, 0, 0, 0).possessive
    expect(cell(false)).toBe(slots.bpNoDepositAccount(possessive, { menu: copy.blueprintAdd, item: copy.blueprintAddAccount }))
    expect(cell(false)).toContain(copy.blueprintAddAccount)
    expect(cell(true), 'a read-only tab has no Add: no door words').toBe(slots.bpNoDepositAccount(possessive, null))
    expect(cell(true)).not.toContain(copy.blueprintAddAccount)
    expect(blueprintView(input(noAccounts, { tab: 'ise', readOnly: true })).add, '[test setup] no Add menu read-only').toBeNull()
  })
})

describe('Edit', () => {
  it('a hidden category drops its tiles and is named under the headline', () => {
    const v = blueprintView(input(working, { hidden: new Set(['roth']) }))
    expect(tilesOf(v).some((t) => t.legend === 'roth')).toBe(false)
    expect(v.notes).toContain(slots.bpHidden([copy.investBucketRoth]))
    const ise = blueprintView(input(working, { tab: 'ise', hidden: new Set(['savings']) })).body
    expect(ise.kind === 'ise' && ise.lanes.map((l) => l.id)).toEqual(['income', 'expenses'])
  })
})
