/**
 * Settings' pure composer (Act 6 · RC18): R7's completeness walk over the registry (every seat the registry promises is a
 * row on some tab), each row's line following its value, each editable row's door to its one home, and the read-only
 * face with no door anywhere (plan 4.0).
 */
import { describe, expect, it } from 'vitest'
import type { ScenarioDraft } from '@store/memoryModel'
import { productionMarket } from '@engine/reference/methodology'
import { formatPercent } from '@intake/moneyFormat'
import { workingCostValueLine } from '@intake/assumptionLines'
import { workingYearCostStaleness } from '@intake/workingYearQuote'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { planClockAnchor } from '../../../bandAnnotations'
import { requiredSeats, type AssumptionSeat } from '../../../assumptionRegistry'
import { SETTINGS_TABS, settingsRows, settingsView, type SettingsRow, type SettingsTab } from '../settingsView'

const anchorOf = (d: ScenarioDraft) => planClockAnchor(d.startCalendarYear, d.startCalendarYear)
const rowsOf = (d: ScenarioDraft, readOnly = false) => settingsRows(d, readOnly, anchorOf(d))
const allRows = (d: ScenarioDraft, readOnly = false): readonly SettingsRow[] => SETTINGS_TABS.flatMap((t) => rowsOf(d, readOnly)[t])
const row = (d: ScenarioDraft, seat: AssumptionSeat): SettingsRow => {
  const r = allRows(d).find((x) => x.seat === seat)
  if (r === undefined) throw new Error(`no ${seat} row`)
  return r
}

const RETIRED = DEV_SEEDS.retired
const LEAVE_MORE: ScenarioDraft = { ...RETIRED, chosenGoal: 'leave-more' }
const SAVED = DEV_SEEDS.datesaved
const STALE = DEV_SEEDS.datecoststale

describe('R7’s completeness walk: every assumption the answer uses has a Settings row', () => {
  it('every seat the registry promises is a row on some tab, over households that open every gated row between them', () => {
    const shown = new Set([RETIRED, LEAVE_MORE, SAVED, STALE].flatMap((d) => allRows(d).map((r) => r.seat)))
    for (const seat of requiredSeats()) expect(shown, seat).toContain(seat)
    // Not vacuous: the walk reads both halves of the registry (a draft field's row and a methodology disclosure's).
    expect(requiredSeats()).toContain('survivor-ratio')
    expect(requiredSeats()).toContain('working-year-tax')
  })

  it('each seat sits on exactly one tab', () => {
    for (const d of [LEAVE_MORE, SAVED]) {
      const byTab = rowsOf(d)
      const seen = new Map<AssumptionSeat, SettingsTab>()
      for (const t of SETTINGS_TABS) for (const r of byTab[t]) {
        expect(seen.get(r.seat), `${r.seat} on ${seen.get(r.seat)} and ${t}`).toBeUndefined()
        seen.set(r.seat, t)
      }
    }
  })

  it('the gated rows show only where they act: W and the left over on the date route, the heirs’ bracket under leave-more', () => {
    const retired = allRows(RETIRED).map((r) => r.seat)
    expect(retired).not.toContain('working-year-cost')
    expect(retired).not.toContain('working-year-left-over')
    expect(retired, 'pay-less-tax or no goal: the bracket ranks nothing').not.toContain('heir-bracket')
    expect(allRows(LEAVE_MORE).map((r) => r.seat)).toContain('heir-bracket')
    expect(allRows(SAVED).map((r) => r.seat)).toEqual(expect.arrayContaining(['working-year-cost', 'working-year-left-over']))
  })
})

describe('each line follows its value', () => {
  it('the withdrawal order’s line is the chosen order’s own explanation', () => {
    const cases: readonly [ScenarioDraft['drawdownPolicy'], string, string][] = [
      ['proportional', copy.leverPolicyProportional, copy.leverPolicyProportionalHelp],
      ['taxable-first', copy.leverPolicyTaxableFirst, copy.leverPolicyTaxableFirstHelp],
      ['pre-tax-first', copy.leverPolicyPreTaxFirst, copy.leverPolicyPreTaxFirstHelp],
      ['bracket-fill', copy.leverPolicyBracketFill, copy.leverPolicyBracketFillHelp],
    ]
    for (const [policy, value, line] of cases) {
      const r = row({ ...RETIRED, drawdownPolicy: policy }, 'drawdown')
      expect(r.values, policy).toEqual([value])
      expect(r.lines, policy).toEqual([line])
    }
  })

  it('the Roth row: none applied, or the plan’s echo naming its calendar year, each with its own line', () => {
    const none = row({ ...RETIRED, rothConversion: undefined }, 'roth-conversion')
    expect(none.values).toEqual([copy.assumptionNoneApplied])
    expect(none.lines).toEqual([copy.settingsRothNoneLine])
    const plan = row({ ...RETIRED, rothConversion: { annualAmountReal: 30_000, startYearOffset: 1, years: 5 } }, 'roth-conversion')
    expect(plan.values).toEqual([slots.rothPlanEcho('30,000', RETIRED.startCalendarYear + 1, false, 5)])
    expect(plan.lines).toEqual([copy.settingsRothPlanLine])
  })

  it('the subsidy rules’ line follows the rules shown', () => {
    expect(row({ ...RETIRED, enhancedSubsidies: true }, 'subsidy-regime').lines).toEqual([copy.leverHealthRegimeEnhancedHelp])
    const { enhancedSubsidies: _e, ...reverted } = RETIRED
    expect(row(reverted as ScenarioDraft, 'subsidy-regime').lines).toEqual([copy.leverHealthRegimeRevertedHelp])
  })

  it('the state: unanswered says the plan prices no state tax (the budget’s twin under a budget); answered, the state and what is priced', () => {
    const unset = row({ ...RETIRED, retirementState: undefined, budget: undefined }, 'retirement-state')
    expect(unset.values).toEqual([copy.profileNotAnswered])
    expect(unset.lines).toEqual([copy.assumptionStateUnsetNote])
    const governed = DEV_SEEDS.budget
    expect(row({ ...governed, retirementState: undefined }, 'retirement-state').lines).toEqual([copy.assumptionStateUnsetNoteBudget])
    const nc = row({ ...RETIRED, retirementState: 'NC' }, 'retirement-state')
    expect(nc.values).toEqual([copy.stateOptionNC])
    expect(nc.lines).toEqual([copy.settingsStateLine])
  })

  it('W’s value line is the answer’s own (stale, or the figure and where it came from), never a second wording', () => {
    expect(workingYearCostStaleness(STALE), 'the fixture is stale').not.toBeNull()
    expect(row(STALE, 'working-year-cost').values).toEqual([workingCostValueLine(STALE)])
    expect(row(SAVED, 'working-year-cost').values).toEqual([workingCostValueLine(SAVED)])
    expect(workingCostValueLine(STALE)).not.toBe(workingCostValueLine(SAVED))
  })

  it('the working-year tax row reads the run’s arm: the pay check’s paragraph where the run carries W, today’s row without', () => {
    const withW = row(SAVED, 'working-year-tax').lines
    const { workingYearCost: _w, ...noW } = SAVED
    const without = row(noW as ScenarioDraft, 'working-year-tax').lines
    expect(withW[0]).toBe(copy.assumptionWorkingYearCheckValue)
    expect(without[0]).toBe(copy.assumptionWorkingYearTaxValue)
  })

  it('the market row prints the live moments (never re-typed) and the standing floor line', () => {
    const m = productionMarket.value
    const market = row(RETIRED, 'market')
    expect(market.values[0]).toBe(slots.assumptionMarketStocks(`${formatPercent(m.stock.mean)}%`, `${formatPercent(m.stock.stdDev)}%`))
    expect(market.lines).toContain(copy.assumptionMarketFloorNote)
  })

  it('the survivor’s share prints as a percent of today’s spending', () => {
    expect(row({ ...RETIRED, survivorSpendingRatio: 0.75 }, 'survivor-ratio').values).toEqual(['75%'])
  })
})

describe('the doors: each editable row opens its one home', () => {
  it('W and the left over open the W drawer; the survivor’s share Living expenses; the state and Medicare their drawers', () => {
    expect(row(SAVED, 'working-year-cost').door).toMatchObject({ kind: 'drawer', target: { kind: 'working-cost' } })
    expect(row(SAVED, 'working-year-left-over').door).toMatchObject({ kind: 'drawer', target: { kind: 'working-cost' } })
    expect(row(RETIRED, 'survivor-ratio').door).toMatchObject({ kind: 'drawer', target: { kind: 'living' } })
    expect(row(RETIRED, 'retirement-state').door).toMatchObject({ kind: 'drawer', target: { kind: 'state' } })
    expect(row(RETIRED, 'medicare-extras').door).toMatchObject({ kind: 'drawer', target: { kind: 'medicare' } })
  })

  it('the withdrawal order, the Roth plan and the subsidy rules open the tray at their lever (Apply writes them, U15)', () => {
    expect(row(RETIRED, 'drawdown').door).toMatchObject({ kind: 'tray', lever: 'withdrawal-order' })
    expect(row(RETIRED, 'roth-conversion').door).toMatchObject({ kind: 'tray', lever: 'roth' })
    expect(row(LEAVE_MORE, 'heir-bracket').door).toMatchObject({ kind: 'tax-strategies' })
  })

  it('no hollow door: no accounts, no withdrawal-order door; no priced pre-65 year, no subsidy-rules door', () => {
    expect(row({ ...RETIRED, enteredAccounts: [] }, 'drawdown').door).toBeUndefined()
    const allMedicare: ScenarioDraft = { ...RETIRED, people: [{ ...RETIRED.people[0], currentAge: 70 }, { ...RETIRED.people[1], currentAge: 70 }] }
    expect(row(allMedicare, 'subsidy-regime').door).toBeUndefined()
  })

  it('disclosures carry no door: they are how the plan is figured, not a choice', () => {
    for (const seat of ['market', 'longevity', 'survivor-ss', 'outlive-order', 'conversion-tax', 'working-year-tax'] as const) {
      expect(row(SAVED, seat).door, seat).toBeUndefined()
    }
  })
})

describe('read-only (plan 4.0)', () => {
  it('a read-only view shows every row and value and carries no door on any tab', () => {
    for (const d of [LEAVE_MORE, SAVED]) {
      const ro = allRows(d, true)
      expect(ro.map((r) => r.seat)).toEqual(allRows(d).map((r) => r.seat))
      expect(ro.map((r) => r.values)).toEqual(allRows(d).map((r) => r.values))
      expect(ro.filter((r) => r.door !== undefined)).toEqual([])
    }
  })

  it('its intro says it changes nothing', () => {
    expect(settingsView({ draft: RETIRED, tab: 'methodology', readOnly: true, anchor: anchorOf(RETIRED) }).intro).toBe(copy.settingsIntroReadOnly)
    expect(settingsView({ draft: RETIRED, tab: 'methodology', readOnly: false, anchor: anchorOf(RETIRED) }).intro).toBe(copy.settingsIntro)
  })
})
