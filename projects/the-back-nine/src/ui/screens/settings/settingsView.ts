/**
 * src/ui/screens/settings/settingsView.ts: the gear's page, Settings (Act 6 · RC18; plan
 * docs/plans/6-rightcapital-ui-plan.md, "RC18"; ref 2.20, `rc-shell/plansettings-02.png`). Pure: no React.
 *
 * Folder tabs (Methodology, then the groups the assumption registry's rows fall into), each a two-column grid of rows.
 * A row is a setting's name, its value, and a plain line under it that changes with the value (the withdrawal order's own
 * explanation, the W answer's value line, the working-year row's arm by `methodologyArmFor`, the left-over line by its
 * shown state). Every row the registry names (`requiredSeats()`) is here: the completeness walk in
 * `__tests__/settingsView.test.ts` is R7's runtime pin.
 *
 * ONE EDITOR PER FACT (insight 058; insight 158): Settings writes nothing itself. An editable row opens its one home: a
 * Profile drawer (the survivor's share, W and the left-over answer, the state, Medicare's extras), whose Save runs the
 * walk's own checks so a refused value never lands; the Action Items tray at the lever's row (the withdrawal order, the
 * Roth plan, the subsidy rules: tried beside the plan and written by Apply, U15's rule); or Tax Strategies (the heirs'
 * bracket, set beside the goal it ranks). A door shows only where its home can act (no hollow door, council 2026-07-03):
 * the tray's withdrawal order needs an account, its Roth row a married couple with pre-tax money (`rothDoorOpen`, the
 * tray's own rule), its subsidy rules a priced pre-65 year.
 *
 * READ-ONLY (plan 4.0): a read-only tab shows every value and line and no door at all.
 */
import type { WhatIfLeverKind } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { productionMarket } from '@engine/reference/methodology'
import { solverAssumedHeirBracket } from '@engine/constants'
import { budgetGoverns } from '@budget/budgetModel'
import { methodologyArmFor, workingCostValueLine } from '@intake/assumptionLines'
import { healthcarePriced, isDateRoute, workingYearLeftOverShownState } from '@intake/intakeMap'
import { formatMoney, formatPercent } from '@intake/moneyFormat'
import { workingYearLeftOverWaitingWords } from '@intake/workingYearLeftOver'
import { LEFT_OVER_FACE } from '@intake/workingYearLeftOverState'
import { workingYearStateTaxReading } from '@intake/workingYearQuote'
import { composeMedicareExtrasTypicalNote } from '../../healthSheetChrome'
import { medicareExtrasDisclosureView } from '@intake/intakeMap'
import { METHODOLOGY_DISCLOSURES, leftOverLineKey, methodologyLines, type AssumptionSeat, type MethodologyDisclosure } from '../../assumptionRegistry'
import { rothPlanStartFor, type BandPlanClockAnchor } from '../../bandAnnotations'
import { copy, slots, type CopyKey } from '../../copy'
import { formatBracketPercent } from '../../money'
import { policyWords, rothDoorOpen } from '../../workbench/railChrome'
import { tablePerson } from '../../workbench/tableRun'
import { extrasValue, stateLabel, type DrawerTarget } from '../profile/profileView'

export const SETTINGS_TABS = ['methodology', 'returns', 'tax', 'health', 'other'] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

const TAB_LABEL: Readonly<Record<SettingsTab, CopyKey>> = {
  methodology: 'settingsTabMethodology',
  returns: 'settingsTabReturns',
  tax: 'settingsTabTax',
  health: 'settingsTabHealth',
  other: 'settingsTabOther',
}
const TAB_HEAD: Readonly<Record<SettingsTab, CopyKey>> = {
  methodology: 'settingsHeadMethodology',
  returns: 'settingsHeadReturns',
  tax: 'settingsHeadTax',
  health: 'settingsHeadHealth',
  other: 'settingsHeadOther',
}

/** Where an editable row's button goes: its one editing home. */
export type SettingsDoor =
  | { readonly kind: 'drawer'; readonly target: DrawerTarget; readonly label: string }
  | { readonly kind: 'tray'; readonly lever: WhatIfLeverKind; readonly label: string }
  | { readonly kind: 'tax-strategies'; readonly label: string }

export interface SettingsRow {
  readonly seat: AssumptionSeat
  readonly name: string
  /** The value, one line each (the market row's three moments; one person's extras each). */
  readonly values: readonly string[]
  /** The plain lines under the value: what it means, following the value. */
  readonly lines: readonly string[]
  /** Absent on a read-only tab, and where the home cannot act. */
  readonly door?: SettingsDoor
}

export interface SettingsView {
  readonly title: string
  readonly intro: string
  readonly tabsLabel: string
  readonly tabs: readonly { readonly id: SettingsTab; readonly label: string }[]
  readonly tab: SettingsTab
  readonly heading: string
  readonly rows: readonly SettingsRow[]
  /** Under the Methodology grid: where the household's own facts live (Settings is the assumptions, not the facts). */
  readonly footnote?: string
}

export interface SettingsInput {
  readonly draft: ScenarioDraft
  readonly tab: SettingsTab
  readonly readOnly: boolean
  /** The shell's one plan-clock anchor (the Roth row names the conversion's calendar year through it, U17 §S1). */
  readonly anchor: BandPlanClockAnchor
}

const POLICY_HELP: Readonly<Record<ScenarioDraft['drawdownPolicy'], CopyKey>> = {
  proportional: 'leverPolicyProportionalHelp',
  'taxable-first': 'leverPolicyTaxableFirstHelp',
  'pre-tax-first': 'leverPolicyPreTaxFirstHelp',
  'bracket-fill': 'leverPolicyBracketFillHelp',
  custom: 'leverPolicyCustomHelp',
}

/** Percent with its glyph ("5%", "4.1%"), read straight off `productionMarket.value`, never re-typed. */
const pct = (fraction: number): string => `${formatPercent(fraction)}%`

const disclosure = (id: MethodologyDisclosure['id']): MethodologyDisclosure => {
  const m = METHODOLOGY_DISCLOSURES.find((x) => x.id === id)
  if (m === undefined) throw new Error(`settingsView: no methodology row ${id}`)
  return m
}

/** A methodology disclosure as a row: its name, its lines for this draft's arm (the working-year row reads the W arm
 *  where the run carries W, one state-tax line by the W answer's reading, one left-over line by the shown state). */
function disclosureRow(d: ScenarioDraft, id: MethodologyDisclosure['id'], values: readonly string[] = []): SettingsRow {
  const m = disclosure(id)
  const keys =
    m.workingCostLineKeys === undefined
      ? m.lineKeys
      : methodologyLines(m, methodologyArmFor(d), workingYearStateTaxReading(d), workingYearLeftOverShownState(d), workingYearLeftOverWaitingWords(d))
  return { seat: m.seat, name: copy[m.nameKey], values, lines: keys.map((k) => copy[k]) }
}

const personName = (d: ScenarioDraft, i: 0 | 1): string => tablePerson(d, i, 0, 0).possessive

/** Every tab's rows for a draft: the one composer the page and the completeness walk both read. */
export function settingsRows(d: ScenarioDraft, readOnly: boolean, anchor: BandPlanClockAnchor): Readonly<Record<SettingsTab, readonly SettingsRow[]>> {
  const door = <T extends SettingsDoor>(can: boolean, value: T): { readonly door?: T } => (!readOnly && can ? { door: value } : {})
  const dateRoute = isDateRoute(d)

  // ── Methodology: the calculation options ──
  const drawdown: SettingsRow = {
    seat: 'drawdown',
    name: copy.assumptionDrawdownName,
    values: [policyWords(d.drawdownPolicy, d.drawdownOrder)],
    lines: [copy[POLICY_HELP[d.drawdownPolicy]]],
    ...door(d.enteredAccounts.length > 0, {
      kind: 'tray',
      lever: 'withdrawal-order',
      label: d.drawdownPolicy === 'proportional' ? copy.leverSequencingCta : copy.leverSequencingEditCta,
    } as const),
  }
  const roth = d.rothConversion
  const rothStart = roth === undefined ? undefined : rothPlanStartFor(anchor, roth.startYearOffset)
  const rothRow: SettingsRow = {
    seat: 'roth-conversion',
    name: copy.assumptionRothName,
    values: [
      roth === undefined || rothStart === undefined
        ? copy.assumptionNoneApplied
        : slots.rothPlanEcho(formatMoney(roth.annualAmountReal), rothStart.year, rothStart.passed, roth.years),
    ],
    // The none-line names the tray only where the tray draws the Roth row (`rothDoorOpen`, the tray's own rule), and
    // "apply it there" only where the tab can apply.
    lines: [
      roth !== undefined
        ? copy.settingsRothPlanLine
        : !rothDoorOpen(d)
          ? copy.settingsRothNoneNoPretax
          : readOnly
            ? copy.settingsRothNoneLineReadOnly
            : copy.settingsRothNoneLine,
    ],
    ...door(rothDoorOpen(d), { kind: 'tray', lever: 'roth', label: roth === undefined ? copy.leverRothDoorCta : copy.leverRothDoorEditCta } as const),
  }
  const survivor: SettingsRow = {
    seat: 'survivor-ratio',
    name: copy.assumptionSurvivorRatioLabel,
    values: [`${formatPercent(d.survivorSpendingRatio)}%`],
    lines: [copy.assumptionSurvivorRatioHelp],
    ...door(true, { kind: 'drawer', target: { kind: 'living' }, label: copy.settingsSurvivorRatioDoor } as const),
  }
  const methodology: SettingsRow[] = [drawdown, rothRow, survivor]
  if (dateRoute) {
    // W: the value line is the sentence (it names the figure and where it came from, or that it is unanswered or stale).
    methodology.push({
      seat: 'working-year-cost',
      name: copy.assumptionWorkingCostName,
      values: [workingCostValueLine(d)],
      lines: [],
      ...door(true, { kind: 'drawer', target: { kind: 'working-cost' }, label: copy.settingsWorkingCostDoor } as const),
    })
    // The left-over answer, only where the question is asked (R3's shown state; `LEFT_OVER_FACE`'s 'none' asks nothing).
    const shownState = workingYearLeftOverShownState(d)
    if (LEFT_OVER_FACE[shownState] !== 'none') {
      methodology.push({
        seat: 'working-year-left-over',
        name: copy.assumptionWorkingCostLeftOverName,
        values: [],
        lines: [copy[leftOverLineKey(shownState, workingYearLeftOverWaitingWords(d))]],
        // The door's verb follows the state: unanswered, answer it; answered, change it; waiting on W, the drawer opens
        // on W's own question first (the W row's words).
        ...door(true, {
          kind: 'drawer',
          target: { kind: 'working-cost' },
          label:
            shownState === 'absent'
              ? copy.settingsLeftOverDoor
              : LEFT_OVER_FACE[shownState] === 'waiting'
                ? copy.settingsWorkingCostDoor
                : copy.settingsLeftOverChangeDoor,
        } as const),
      })
    }
  }

  // ── Return assumptions: the market's moments, live off `productionMarket`, and the standing floor line (F8) ──
  const mkt = productionMarket.value
  const market = disclosureRow(d, 'market', [
    slots.assumptionMarketStocks(pct(mkt.stock.mean), pct(mkt.stock.stdDev)),
    slots.assumptionMarketBonds(pct(mkt.bond.mean), pct(mkt.bond.stdDev)),
    slots.assumptionMarketInflation(pct(mkt.inflation.mean)),
  ])
  const returns: SettingsRow[] = [{ ...market, lines: [...market.lines, copy.assumptionMarketFloorNote] }]

  // ── Tax assumptions ──
  const state = d.retirementState
  const stateRow: SettingsRow = {
    seat: 'retirement-state',
    name: copy.stateResidenceLegend,
    // Unanswered, the box says only that (Profile's card sentence would repeat the line under it); the line says the
    // plan prices no state income tax, and whether the bill is in the numbers depends on what the household did (the
    // budget twin names the budget's own mechanism, the O16 chair fix).
    values: [state === undefined ? copy.profileNotAnswered : stateLabel(state)],
    lines: [state === undefined ? (budgetGoverns(d.budget) ? copy.assumptionStateUnsetNoteBudget : copy.assumptionStateUnsetNote) : copy.settingsStateLine],
    ...door(true, { kind: 'drawer', target: { kind: 'state' }, label: copy.settingsStateDoor } as const),
  }
  const tax: SettingsRow[] = [stateRow, disclosureRow(d, 'conversion-tax'), disclosureRow(d, 'working-year-tax')]
  // The heirs' bracket ranks only the leave-more goal's strategies, and Tax Strategies ranks nothing on the date route
  // (its working-route words): anywhere else a row would be a hollow door. Unchosen, the line says the figure is the
  // tool's starting one (Tax Strategies' own words beside its picker).
  if (d.chosenGoal === 'leave-more' && !dateRoute) {
    tax.push({
      seat: 'heir-bracket',
      name: copy.assumptionHeirBracketLabel,
      values: [slots.assumptionHeirBracketOption(formatBracketPercent(d.heirBracket ?? solverAssumedHeirBracket.value))],
      lines: [
        copy.assumptionHeirBracketHelp,
        ...(d.heirBracket === undefined ? [slots.taxStratHeirDefault(formatBracketPercent(solverAssumedHeirBracket.value))] : []),
      ],
      ...door(true, { kind: 'tax-strategies', label: copy.settingsHeirDoor } as const),
    })
  }

  // ── Health care assumptions ──
  const enhanced = d.enhancedSubsidies === true
  const typicalNote = composeMedicareExtrasTypicalNote(medicareExtrasDisclosureView(d))
  const health: SettingsRow[] = [
    {
      seat: 'subsidy-regime',
      name: copy.assumptionRegimeName,
      values: [enhanced ? copy.leverHealthRegimeEnhanced : copy.leverHealthRegimeReverted],
      lines: [enhanced ? copy.leverHealthRegimeEnhancedHelp : copy.leverHealthRegimeRevertedHelp],
      ...door(healthcarePriced(d), { kind: 'tray', lever: 'aca-subsidy', label: copy.settingsAcaDoor } as const),
    },
    {
      seat: 'medicare-extras',
      name: copy.assumptionMedicareExtrasName,
      values: ([0, 1] as const).map((i) => `${slots.profileExtrasOf(personName(d, i))}: ${extrasValue(d, i)}`),
      lines: typicalNote !== undefined ? [typicalNote] : [],
      ...door(true, { kind: 'drawer', target: { kind: 'medicare' }, label: copy.settingsMedicareDoor } as const),
    },
  ]

  // ── Other assumptions: the non-parameter methodology, disclosed (council supersession #1) ──
  const other: SettingsRow[] = [disclosureRow(d, 'longevity'), disclosureRow(d, 'survivor-ss'), disclosureRow(d, 'outlive-order')]

  return { methodology, returns, tax, health, other }
}

export function settingsView({ draft, tab, readOnly, anchor }: SettingsInput): SettingsView {
  const rows = settingsRows(draft, readOnly, anchor)[tab]
  return {
    title: copy.settingsTitle,
    intro: readOnly ? copy.settingsIntroReadOnly : copy.settingsIntro,
    tabsLabel: copy.settingsTabsLabel,
    tabs: SETTINGS_TABS.map((id) => ({ id, label: copy[TAB_LABEL[id]] })),
    tab,
    heading: copy[TAB_HEAD[tab]],
    rows,
    ...(tab === 'methodology' ? { footnote: copy.settingsNotShownHere } : {}),
  }
}
