/**
 * src/ui/screens/profile/blueprintView.ts: Profile → Blueprint, its pure composer (Act 6 · RC15; plan
 * docs/plans/6-rightcapital-ui-plan.md, RC15; ref 2.6). The plan on one page as tiles, on three folder tabs: Net Worth
 * (each person's accounts), Goals (a timeline of the household's events) and Income, Savings, Expenses (swim lanes).
 * Every tile opens the SAME drawer as its Profile card: the tiles are composed from the Profile pages' own views
 * (`profileView.ts`), so a target can never drift. Decides every word and every tile; the page draws and decides nothing.
 *
 * THE LAWS IT HOLDS:
 * - colour is never the only signal: every tile carries its category word (drawn in small caps above its name), and the
 *   legend names each colour in words;
 * - no joint column (B9 holds no joint ownership, critique 13): an account is its owner's; the household's spending is
 *   one row under both people, said in words ("Both of you");
 * - the headline is "Invested accounts: $X", never a net worth (no home, debts or bank accounts are asked yet), with the
 *   Net Worth page's own stopgap lines word for word;
 * - THE TIMELINE'S CALENDAR (insight 167): a budget line's years count from the household's work stop (year 0 = the
 *   first retirement year; the engine's anchor, `simulate.ts`, is the latest planned retirement offset). An all-retired
 *   household's anchor is the plan's first year (`startCalendarYear`, the drawer's own help says so). A working
 *   household's anchor IS the answer: the crowned date's offset, from the answer's own build year (`heroLead`'s
 *   calendar claim). So the stop tile and the budget lines take calendar years only from a SETTLED answer (the final
 *   tier, not re-figuring, a date crowned); otherwise they sit in "After work stops", placed by years after it. A
 *   calendar year is never faked, and a provisional date is never printed here at all;
 * - decisions read from the answer, never from ages (insight 132): the work-optional date is the answer's sentence;
 *   Medicare is worded as eligibility ("Eligible at 65"), and for a member still working as what the engine prices
 *   (from 65, or from the stop if later), never as an enrollment asserted from an age;
 * - every timeline year prints both people's ages beside it, on the engine's own clock (age = current age + years from
 *   the plan's first year), so a distance is never read without its calendar year (insight 134).
 *
 * READ-ONLY (plan 4.0): a view-only tab's view carries no Add menu; its drawers open with no Save (the drawers read it).
 */
import type { BudgetLineItem, DateTrackOutcome } from '@shared/model'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { ACCOUNT_KINDS, INCOME_TYPES } from '@shared/model'
import { budgetGoverns } from '@budget/budgetModel'
import { formatMoney } from '@intake/moneyFormat'
import { kindLabel } from '@intake/accountKinds'
import { incomeTypeLabel } from '@intake/otherIncome'
import { isDateRoute } from '@intake/intakeMap'
import { lineDisplayName } from '@intake/budgetLines'
import { copy, slots } from '../../copy'
import type { BandPlanClockAnchor } from '../../bandAnnotations'
import { heroLead } from '../../dateHero'
import { composeDateSplit } from '../../dateSplit'
import { tablePerson } from '../../workbench/tableRun'
import {
  accountCardName,
  expensesView,
  incomeView,
  netWorthView,
  savingsView,
  treatmentOf,
  type AddMenuView,
  type CardView,
  type DrawerTarget,
} from './profileView'

export type BlueprintTab = 'net-worth' | 'goals' | 'ise'
export const BLUEPRINT_TABS: readonly BlueprintTab[] = ['net-worth', 'goals', 'ise']

/** The colour a tile's edge and the legend's dash carry (the page maps each to a theme token). */
export type TileTone = 'green' | 'blue' | 'orange' | 'sky' | 'coral'

export interface LegendItem {
  readonly id: string
  readonly label: string
  readonly tone: TileTone
}

export interface BlueprintTile {
  /** Stamped as `data-profile-card`: focus comes back here when its drawer closes. Unique on its tab. */
  readonly id: string
  /** The legend entry it belongs to (Edit hides by it). */
  readonly legend: string
  /** The category word, drawn in small caps above the name (never the colour alone). */
  readonly category: string
  readonly tone: TileTone
  readonly name: string
  readonly value?: string
  readonly note?: string
  /** The answer's own work-optional date (the crown); its sentence is tied to the R13 caveat. */
  readonly crowned?: boolean
  readonly target: DrawerTarget
}

export interface BlueprintPerson {
  readonly name: string
  /** "Age 66", or null with no age entered. */
  readonly age: string | null
}

export interface NetWorthColumn {
  readonly person: BlueprintPerson
  readonly tiles: readonly BlueprintTile[]
  /** The column's words when it holds no account. */
  readonly empty: string | null
}

export interface TimelineGroup {
  readonly key: string
  /** The year ("2031") or the years-after-the-stop words. */
  readonly label: string
  /** Both people's ages that year ("Alex 63 · Sam 65"); null in the after-the-stop groups (no calendar year). */
  readonly ages: string | null
  readonly tiles: readonly BlueprintTile[]
}

export interface IseLane {
  readonly id: 'income' | 'savings' | 'expenses'
  readonly label: string
  /** One cell per person; null for the household's own row (`shared`). */
  readonly cells: readonly { readonly tiles: readonly BlueprintTile[]; readonly empty: string | null }[] | null
  readonly shared?: { readonly label: string; readonly tiles: readonly BlueprintTile[] }
}

export type BlueprintBody =
  | { readonly kind: 'net-worth'; readonly columns: readonly NetWorthColumn[] }
  | {
      readonly kind: 'goals'
      readonly groups: readonly TimelineGroup[]
      readonly after: { readonly heading: string; readonly intro: string; readonly groups: readonly TimelineGroup[] } | null
      readonly unplaced: { readonly heading: string; readonly tiles: readonly BlueprintTile[] } | null
    }
  | { readonly kind: 'ise'; readonly people: readonly BlueprintPerson[]; readonly lanes: readonly IseLane[] }

export interface BlueprintView {
  readonly title: string
  readonly intro: string
  readonly tabsLabel: string
  readonly tabs: readonly { readonly id: BlueprintTab; readonly label: string }[]
  readonly tab: BlueprintTab
  readonly legendLabel: string
  readonly legend: readonly LegendItem[]
  readonly headline: string
  /** The headline prints a figure (Net Worth's total): tied to the R13 caveat. */
  readonly headlineFigure: boolean
  /** Lines under the headline (Net Worth's stopgaps; the hidden categories). */
  readonly notes: readonly string[]
  readonly edit: { readonly label: string; readonly legend: string }
  /** Absent on a read-only tab, and on Goals (its Profile page adds nothing either). */
  readonly add: AddMenuView | null
  readonly body: BlueprintBody
  /** Lines under the body (Goals' one-figure spending line). */
  readonly lines: readonly string[]
  /** The Goals tab over the answer's own sentence (the crowned date, or the no-date words), whatever Edit hides: the
   *  spending tiles read the crowned date even with the stops hidden. The panel draws the StaleBanner's lines then (the
   *  review's E3; milestone 3's review, round 2; `Shell.tsx`). */
  readonly answerShown: boolean
}

export interface BlueprintInput {
  readonly draft: ScenarioDraft
  readonly tab: BlueprintTab
  readonly readOnly: boolean
  readonly agedBalancesYear: number | undefined
  /** The store's committed answer and its re-figuring flag (the working household's stop year is the answer's). */
  readonly answer: ModelAnswer
  readonly refiguring: boolean
  /** The plan clock (`planClockAnchor`): the work-optional sentence reads it, as Snapshot's does. */
  readonly anchor: BandPlanClockAnchor
  /** Legend ids Edit has hidden on this tab. */
  readonly hidden?: ReadonlySet<string>
}

// ── Shared ───────────────────────────────────────────────────────────────────────────────────────────────────────

const BOTH = [0, 1] as const
const dollars = (v: number): string => slots.workbenchFactDollars(formatMoney(Math.round(v)))
const person = (d: ScenarioDraft, i: number) => tablePerson(d, i, 0, 0)

function personOf(d: ScenarioDraft, i: number): BlueprintPerson {
  const age = d.people[i]?.currentAge
  return { name: person(d, i).label, age: age === undefined ? null : slots.bpAge(age) }
}

/** A Profile card as a tile: its kind's legend, its name, its first row as "label: value", its note. */
function tileOf(card: CardView, legend: LegendItem): BlueprintTile {
  const row = card.rows[0]
  return {
    id: card.id,
    legend: legend.id,
    category: legend.label,
    tone: legend.tone,
    name: card.name,
    ...(row !== undefined ? { value: slots.bpRowValue(row.label, row.value) } : {}),
    ...(card.note !== undefined ? { note: card.note } : {}),
    target: card.target,
  }
}

/** The person a Profile card belongs to, by its drawer target (null: the household's). */
function ownerOf(d: ScenarioDraft, target: DrawerTarget): number | null {
  switch (target.kind) {
    case 'salary':
    case 'social-security':
    case 'work-invest':
    case 'person':
      return target.index
    case 'income':
      return d.incomeStreams[target.index]?.ownerIndex ?? null
    case 'account':
      return d.enteredAccounts[target.index]?.ownerIndex ?? null
    default:
      return null
  }
}

// ── Net Worth ────────────────────────────────────────────────────────────────────────────────────────────────────

/** B9's four tax treatments, in the Investment pages' colours (pre-tax orange, Roth green, taxable blue, HSA sky). */
const TREATMENTS: readonly LegendItem[] = [
  { id: 'pretax', label: copy.investBucketPretax, tone: 'orange' },
  { id: 'roth', label: copy.investBucketRoth, tone: 'green' },
  { id: 'taxable', label: copy.investBucketTaxable, tone: 'blue' },
  { id: 'hsa', label: copy.investBucketHsa, tone: 'sky' },
]
const treatmentLegend = (label: string): LegendItem => TREATMENTS.find((t) => t.label === label)!

function netWorthBody(d: ScenarioDraft): BlueprintBody {
  return {
    kind: 'net-worth',
    columns: BOTH.map((i) => {
      const tiles: BlueprintTile[] = []
      d.enteredAccounts.forEach((a, index) => {
        if (a.ownerIndex !== i) return
        const legend = treatmentLegend(treatmentOf(a.kind))
        tiles.push({
          id: `account-${index}`,
          legend: legend.id,
          category: legend.label,
          tone: legend.tone,
          name: accountCardName(d, a),
          value: dollars(a.valueToday),
          // The Net Worth page's own target: the account's drawer on what it holds.
          target: { kind: 'account', index, facet: 'holdings' },
        })
      })
      return { person: personOf(d, i), tiles, empty: tiles.length === 0 ? slots.bpNoAccounts(person(d, i).possessive) : null }
    }),
  }
}

// ── Goals ────────────────────────────────────────────────────────────────────────────────────────────────────────

const GOALS_LEGEND: readonly LegendItem[] = [
  { id: 'retirement', label: copy.profileKindRetirement, tone: 'green' },
  { id: 'social-security', label: copy.profileKindSocialSecurity, tone: 'blue' },
  { id: 'medicare', label: copy.profileKindMedicare, tone: 'sky' },
  { id: 'spending', label: copy.blueprintCatSpending, tone: 'coral' },
]
const goalsLegend = (id: string): LegendItem => GOALS_LEGEND.find((l) => l.id === id)!

/** Where the household's work stop sits: a calendar year (settled), or only words (the answer still to come). */
export type StopAnchor =
  | { readonly kind: 'calendar'; readonly year: number; readonly lead?: string; readonly edge?: boolean }
  | { readonly kind: 'unknown'; readonly lead?: string }

/**
 * The year 0 of the budget's frame. An all-retired household: the plan's first year. A working household: the answer's
 * crowned date (its own build year plus its offset), only when the answer is SETTLED (final, not re-figuring, dated);
 * a no-date answer keeps its sentence and no year. Read from the answer, never from ages (insight 132).
 */
export function stopAnchor(d: ScenarioDraft, answer: ModelAnswer, refiguring: boolean, anchor: BandPlanClockAnchor, dateRoute: boolean): StopAnchor {
  if (!dateRoute) return { kind: 'calendar', year: d.startCalendarYear }
  if (answer.kind !== 'date' || answer.outcome.kind !== 'dates' || answer.tier !== 'final' || refiguring) return { kind: 'unknown' }
  const split = composeDateSplit(answer.outcome.floor, answer.outcome.lifestyle)
  const hero: DateTrackOutcome = split.kind === 'single' ? split.track : split.lifestyle
  // The answer's own calendar (heroLead's claim): its build year, with the plan clock that ages it.
  const lead = heroLead(hero, answer.outcome.windowTopYears, { ...anchor, startCalendarYear: answer.draft.startCalendarYear })
  if (hero.kind === 'no-date-in-window') return { kind: 'unknown', lead }
  return { kind: 'calendar', year: answer.draft.startCalendarYear + hero.offsetYears, lead, edge: hero.kind === 'window-edge-unconfirmed' }
}

interface Placed {
  readonly tile: BlueprintTile
  /** A calendar year, a count of years after the stop, or neither (a fact still missing). */
  readonly at: { readonly kind: 'year'; readonly year: number } | { readonly kind: 'after'; readonly years: number } | { readonly kind: 'none' }
  /** Order inside a group: stops, claims, Medicare, then spending. */
  readonly rank: number
}

function lineTile(line: BudgetLineItem, index: number, stop: StopAnchor): Placed {
  const legend = goalsLegend('spending')
  const amount = formatMoney(Math.round(line.annualAmountReal))
  const years = line.endYear === undefined ? null : line.endYear - line.startYear + 1
  const base = { id: `bp-line-${index}`, legend: legend.id, category: legend.label, tone: legend.tone, name: lineDisplayName(line), target: { kind: 'living' } } as const
  if (!Number.isInteger(line.startYear) || line.startYear < 0) return { tile: { ...base, value: copy.profileNotAnswered }, at: { kind: 'none' }, rank: 3 }
  if (stop.kind === 'calendar') {
    const from = stop.year + line.startYear
    const value = years === null ? slots.bpLineFrom(amount, from) : slots.bpLineSpan(amount, years, stop.year + line.endYear!)
    return { tile: { ...base, value }, at: { kind: 'year', year: from }, rank: 3 }
  }
  const value = years === null ? slots.bpLineOnward(amount) : slots.bpLineFor(amount, years)
  return { tile: { ...base, value }, at: { kind: 'after', years: line.startYear }, rank: 3 }
}

function goalsBody(d: ScenarioDraft, stop: StopAnchor): { body: BlueprintBody; lines: string[] } {
  const start = d.startCalendarYear
  const placed: Placed[] = []
  // The engine's clock: a person's age in a year is their current age plus the years from the plan's first year.
  const yearAtAge = (i: number, age: number | undefined): number | null => {
    const now = d.people[i]?.currentAge
    return now === undefined || age === undefined ? null : start + (age - now)
  }
  for (const i of BOTH) {
    const p = d.people[i]
    const who = person(d, i)
    // Each person's stop: a retired person's entered age; a working person's is the answer's date.
    const retirement = goalsLegend('retirement')
    const stopBase = { id: `retirement-${i}`, legend: retirement.id, category: retirement.label, tone: retirement.tone, name: slots.profileRetirementOf(who.possessive), target: { kind: 'person', index: i } } as const
    if (p.workStatus === 'working') {
      if (stop.kind === 'calendar') {
        placed.push({
          tile: {
            ...stopBase,
            value: stop.lead ?? copy.profileFindsDate,
            ...(stop.edge === true ? { note: copy.dateWindowEdgeNote } : {}),
            crowned: true,
          },
          at: { kind: 'year', year: stop.year },
          rank: 0,
        })
      } else {
        placed.push({
          tile: { ...stopBase, value: stop.lead ?? copy.profileFindsDate },
          at: { kind: 'after', years: 0 },
          rank: 0,
        })
      }
    } else if (p.workStatus === 'retired' && p.retirementAge !== undefined) {
      const year = yearAtAge(i, p.retirementAge)
      placed.push({ tile: { ...stopBase, value: slots.profileStoppedAt(p.retirementAge) }, at: year === null ? { kind: 'none' } : { kind: 'year', year }, rank: 0 })
    } else {
      placed.push({ tile: { ...stopBase, value: copy.profileNotAnswered }, at: { kind: 'none' }, rank: 0 })
    }
    // Each claim age (the Income page's Social Security card's drawer).
    const ss = goalsLegend('social-security')
    const claimYear = yearAtAge(i, p.socialSecurityClaimAge)
    placed.push({
      tile: {
        id: `ss-${i}`,
        legend: ss.id,
        category: ss.label,
        tone: ss.tone,
        name: slots.profileSocialSecurityOf(who.possessive),
        value: p.socialSecurityClaimAge === undefined ? copy.profileNotAnswered : slots.bpClaimAt(p.socialSecurityClaimAge),
        target: { kind: 'social-security', index: i },
      },
      at: claimYear === null ? { kind: 'none' } : { kind: 'year', year: claimYear },
      rank: 1,
    })
    // Medicare at 65: eligibility, never an enrollment asserted from an age. For a member still working the engine bills
    // it from 65 or from the stop, whichever is later, so the tile says exactly that.
    const medicare = goalsLegend('medicare')
    const medicareYear = yearAtAge(i, 65)
    placed.push({
      tile: {
        id: `medicare-${i}`,
        legend: medicare.id,
        category: medicare.label,
        tone: medicare.tone,
        name: slots.bpMedicareOf(who.possessive),
        value: medicareYear === null ? copy.profileNotAnswered : p.workStatus === 'working' ? copy.blueprintMedicareWorking : copy.blueprintMedicareRetired,
        target: { kind: 'medicare' },
      },
      at: medicareYear === null ? { kind: 'none' } : { kind: 'year', year: medicareYear },
      rank: 2,
    })
  }
  const lines: string[] = []
  if (budgetGoverns(d.budget) && d.budget !== undefined) d.budget.forEach((line, k) => placed.push(lineTile(line, k, stop)))
  else lines.push(copy.blueprintSpendingOneFigure)

  const byRank = (a: Placed, b: Placed) => a.rank - b.rank
  const agesIn = (year: number): string | null => {
    const parts = BOTH.flatMap((i) => {
      const now = d.people[i]?.currentAge
      return now === undefined ? [] : [slots.bpAgeOf(person(d, i).label, now + (year - start))]
    })
    return parts.length === 0 ? null : slots.bpAges(parts)
  }
  const years = [...new Set(placed.flatMap((p) => (p.at.kind === 'year' ? [p.at.year] : [])))].sort((a, b) => a - b)
  const groups: TimelineGroup[] = years.map((year) => ({
    key: `year-${year}`,
    label: String(year),
    ages: agesIn(year),
    tiles: placed.filter((p) => p.at.kind === 'year' && p.at.year === year).sort(byRank).map((p) => p.tile),
  }))
  const afterYears = [...new Set(placed.flatMap((p) => (p.at.kind === 'after' ? [p.at.years] : [])))].sort((a, b) => a - b)
  const after =
    afterYears.length === 0
      ? null
      : {
          heading: copy.blueprintAfterHeading,
          intro: copy.blueprintAfterIntro,
          groups: afterYears.map((n) => ({
            key: `after-${n}`,
            label: slots.bpAfterStop(n),
            ages: null,
            tiles: placed.filter((p) => p.at.kind === 'after' && p.at.years === n).sort(byRank).map((p) => p.tile),
          })),
        }
  const none = placed.filter((p) => p.at.kind === 'none').sort(byRank).map((p) => p.tile)
  return {
    body: { kind: 'goals', groups, after, unplaced: none.length === 0 ? null : { heading: copy.blueprintUnplacedHeading, tiles: none } },
    lines,
  }
}

// ── Income, Savings, Expenses ────────────────────────────────────────────────────────────────────────────────────

const ISE_LEGEND: readonly LegendItem[] = [
  { id: 'income', label: copy.shellPageIncome, tone: 'green' },
  { id: 'savings', label: copy.shellPageSavings, tone: 'blue' },
  { id: 'expenses', label: copy.shellPageExpenses, tone: 'coral' },
]
const iseLegend = (id: IseLane['id']): LegendItem => ISE_LEGEND.find((l) => l.id === id)!

function iseBody(d: ScenarioDraft, readOnly: boolean): BlueprintBody {
  const perPerson = (cards: readonly CardView[], legend: LegendItem, empty: (i: number) => string | null) =>
    BOTH.map((i) => {
      const tiles = cards.filter((c) => ownerOf(d, c.target) === i).map((c) => tileOf(c, legend))
      return { tiles, empty: tiles.length === 0 ? empty(i) : null }
    })
  const income = incomeView(d, readOnly).cards
  const savings = savingsView(d, readOnly).cards
  const expenses = expensesView(d).cards
  return {
    kind: 'ise',
    people: BOTH.map((i) => personOf(d, i)),
    lanes: [
      { id: 'income', label: iseLegend('income').label, cells: perPerson(income, iseLegend('income'), () => null) },
      {
        id: 'savings',
        label: iseLegend('savings').label,
        // A retired person's accounts take no deposits (the Savings page's own rule): the cell says so. A working person's
        // empty cell is that person's own line (the Savings page's sentence is about the household), with door words
        // naming this page's Add menu only where it is drawn (a read-only tab has none). An unanswered work status is
        // never "work has stopped" (milestone 3's review, round 2): the cell says it is still needed, on Family.
        cells: perPerson(savings, iseLegend('savings'), (i) => {
          const status = d.people[i]?.workStatus
          if (status === 'working') return slots.bpNoDepositAccount(person(d, i).possessive, readOnly ? null : { menu: copy.blueprintAdd, item: copy.blueprintAddAccount })
          return status === 'retired' ? copy.blueprintNothingGoesIn : slots.profileWorkUnanswered(person(d, i).possessive)
        }),
      },
      {
        id: 'expenses',
        label: iseLegend('expenses').label,
        cells: null,
        shared: { label: copy.blueprintBothOfYou, tiles: expenses.map((c) => tileOf(c, iseLegend('expenses'))) },
      },
    ],
  }
}

// ── The page ─────────────────────────────────────────────────────────────────────────────────────────────────────

const LEGENDS: Readonly<Record<BlueprintTab, readonly LegendItem[]>> = { 'net-worth': TREATMENTS, goals: GOALS_LEGEND, ise: ISE_LEGEND }
export const legendFor = (tab: BlueprintTab): readonly LegendItem[] => LEGENDS[tab]

/** The Add menus, the Profile pages' own (Net Worth's accounts; Income, Savings, Expenses: income and accounts). */
function addFor(tab: BlueprintTab, d: ScenarioDraft, readOnly: boolean, agedBalancesYear: number | undefined): AddMenuView | null {
  if (readOnly || tab === 'goals') return null
  if (tab === 'net-worth') return netWorthView(d, agedBalancesYear, readOnly).add
  return {
    label: copy.blueprintAdd,
    items: [
      { id: 'income', label: copy.blueprintAddIncome, items: INCOME_TYPES.map((type) => ({ id: type, label: incomeTypeLabel(type), target: { kind: 'new-income', type } as const })) },
      { id: 'account', label: copy.blueprintAddAccount, items: ACCOUNT_KINDS.map((k) => ({ id: k, label: kindLabel(k), target: { kind: 'new-account', accountKind: k } as const })) },
    ],
  }
}

/** Drop the tiles of every hidden legend entry (Edit's checklist). */
function hide(body: BlueprintBody, hidden: ReadonlySet<string>): BlueprintBody {
  if (hidden.size === 0) return body
  const keep = (tiles: readonly BlueprintTile[]) => tiles.filter((t) => !hidden.has(t.legend))
  const groups = (gs: readonly TimelineGroup[]) => gs.map((g) => ({ ...g, tiles: keep(g.tiles) })).filter((g) => g.tiles.length > 0)
  switch (body.kind) {
    case 'net-worth':
      return { ...body, columns: body.columns.map((c) => ({ ...c, tiles: keep(c.tiles) })) }
    case 'goals': {
      const after = body.after === null ? null : { ...body.after, groups: groups(body.after.groups) }
      const unplaced = body.unplaced === null ? null : { ...body.unplaced, tiles: keep(body.unplaced.tiles) }
      return {
        ...body,
        groups: groups(body.groups),
        after: after !== null && after.groups.length > 0 ? after : null,
        unplaced: unplaced !== null && unplaced.tiles.length > 0 ? unplaced : null,
      }
    }
    case 'ise':
      return {
        ...body,
        lanes: body.lanes
          .filter((l) => !hidden.has(l.id))
          .map((l) => ({ ...l, ...(l.cells !== null ? { cells: l.cells.map((c) => ({ ...c, tiles: keep(c.tiles) })) } : {}) })),
      }
  }
}

export function blueprintView(input: BlueprintInput): BlueprintView {
  const { draft: d, tab, readOnly, agedBalancesYear, answer, refiguring, anchor } = input
  const hidden = input.hidden ?? new Set<string>()
  const legend = legendFor(tab)
  const dateRoute = isDateRoute(d)
  let body: BlueprintBody
  let headline: string
  let notes: string[] = []
  let lines: string[] = []
  let answerShown = false
  if (tab === 'net-worth') {
    const worth = netWorthView(d, agedBalancesYear, readOnly)
    headline = slots.profileInvestmentTotal(copy.snapshotInvestedTitle, worth.total)
    notes = [...worth.notes]
    body = netWorthBody(d)
  } else if (tab === 'goals') {
    headline = copy.shellPageGoals
    const stop = stopAnchor(d, answer, refiguring, anchor, dateRoute)
    answerShown = stop.lead !== undefined
    const goals = goalsBody(d, stop)
    body = goals.body
    lines = goals.lines
  } else {
    headline = copy.blueprintTabIse
    body = iseBody(d, readOnly)
  }
  const hiddenLabels = legend.filter((l) => hidden.has(l.id)).map((l) => l.label)
  const shown = hide(body, hidden)
  return {
    title: copy.shellPageBlueprint,
    intro: copy.blueprintIntro,
    tabsLabel: copy.blueprintTabsLabel,
    tabs: [
      { id: 'net-worth', label: copy.shellPageNetWorth },
      { id: 'goals', label: copy.shellPageGoals },
      { id: 'ise', label: copy.blueprintTabIse },
    ],
    tab,
    legendLabel: copy.blueprintLegendLabel,
    legend,
    headline,
    headlineFigure: tab === 'net-worth',
    notes: [...notes, ...(hiddenLabels.length > 0 ? [slots.bpHidden(hiddenLabels)] : [])],
    edit: { label: copy.blueprintEdit, legend: copy.blueprintEditLegend },
    add: addFor(tab, d, readOnly, agedBalancesYear),
    body: shown,
    lines,
    answerShown,
  }
}
