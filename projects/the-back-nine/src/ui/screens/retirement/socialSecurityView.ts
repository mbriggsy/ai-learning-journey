/**
 * src/ui/screens/retirement/socialSecurityView.ts: Retirement → Social Security, the pure composers (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC9; ref 2.14; `rc-analysis/FRAME_social-security-cumulative-break-even.png`,
 * `comparison-tab-social-security-module__…png`, `summary-tab-social-security-module__…png`,
 * `FRAME_social-security-action-items-filing-instructions.png`).
 *
 * THE STRATEGIES ({@link claimStrategies}). Each is one claim age per person not yet claimed: your plan's own ages; the
 * earliest whole age still open, `max(62, current age)` (the `claim-age` lever takes whole years and refuses an age
 * already passed, `whatIf.ts`'s `claim-age-in-the-past`); full retirement age rounded up to the whole year
 * (`fraMonthsForBirthYear`), never before the current age; and 70. A strategy is a claim-age bundle holding a lever only
 * where its age differs from the plan's, so a strategy that IS the plan is the empty bundle (the plan's own rows and
 * reading, no run). Strategies with the same ages for everyone coincide: the first in order is kept (your plan's own
 * ages first) and a line names which coincide. A person already claiming is fixed, said in words, and never in a bundle.
 * B9 does not search for the claim ages that do the most yet (map gap 7): no strategy is called that, and one stopgap line
 * says so.
 *
 * ONE FUTURE, NAMED. Every yearly figure is the steady market's (the ledger's `socialSecurity` per year), so every chart
 * title and key-metric sentence names it, and a one-path figure is never read as the odds (plan 4.0). The odds under
 * each Summary bar are each strategy's own many-futures reading, through the one ring composer (`ringFace`).
 *
 * MONEY HAS A GRAIN (insight 146). The lifetime totals, their difference and the running totals the break-even compares
 * are each snapped to the grain they print at before they are compared or differenced, so "about the same" means equal
 * as printed, and a crossing is never decided on dollars the page cannot show.
 *
 * THE BREAK-EVEN ({@link breakEvenIndex}) is the year the side that started behind passes the other FOR GOOD, whichever
 * picker holds the later claim: two streams whose onsets are decoupled (two claim ages, a survivor benefit, a death
 * before the later claim) can cross more than once (insight 045), so the last change of lead is the one that holds. Only
 * the steady market's years while one of you lives are read: a crossing after the second death is not one.
 */
import { fraMonthsForBirthYear } from '@engine/constants/socialSecurity'
import { householdBenefits } from '@engine/socialSecurityBenefit'
import { SS_CLAIM_MAX, SS_CLAIM_MIN } from '@intake/sanity'
import { niceLattice, type DollarLattice } from '@viz/bandData'
import type { LedgerYearRow, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy, slots } from '../../copy'
import { formatDeltaDollar, mmAxisFormatterFor } from '../../money'
import { ringFace } from '../../ringReading'
import { tablePerson, type TableMeta, type TablePerson } from '../../workbench/tableRun'
import type { WhatIfReading } from '../../workbench/whatIfRun'
import { lifespansLine } from '../../workbench/yearTableChrome'
import { compactDollars } from '../tax/summaryView'
import type { RunRows } from './cashFlowsView'

// ── The strategies ──────────────────────────────────────────────────────────────────────────────────────────────

export type StrategyId = 'plan' | 'earliest' | 'fra' | 'seventy'

/** RightCapital's order (its "Current strategy" first once "optimal" is set aside). */
export const STRATEGY_ORDER: readonly StrategyId[] = ['plan', 'earliest', 'fra', 'seventy']

const LABEL: Readonly<Record<StrategyId, string>> = {
  plan: copy.claimsStrategyPlan,
  earliest: copy.claimsStrategyEarliest,
  fra: copy.claimsStrategyFra,
  seventy: copy.claimsStrategySeventy,
}

const PHRASE: Readonly<Record<StrategyId, string>> = {
  plan: copy.claimsPhrasePlan,
  earliest: copy.claimsPhraseEarliest,
  fra: copy.claimsPhraseFra,
  seventy: copy.claimsPhraseSeventy,
}

export interface ClaimStrategy {
  readonly id: StrategyId
  /** The picker's, the legend's and the bar's name. */
  readonly label: string
  /** The name inside a sentence ("claiming at 70"). */
  readonly phrase: string
  /** Each person's claim age in this strategy; null for a person who has no choice (already claiming, or no benefit). */
  readonly ages: readonly (number | null)[]
  /** The claim-age levers: one per person whose age here differs from the plan's (empty: the plan itself). */
  readonly bundle: readonly WhatIfLeverV6[]
}

/** One person as the page speaks of them. */
export interface ClaimPerson {
  readonly index: number
  readonly words: TablePerson
  readonly currentAge: number
  readonly planAge: number
  readonly birthYear: number
  /** Social Security already started (the engine's own test: claimed once the current age reaches the claim age). */
  readonly claimed: boolean
  /** A claim age to choose: not yet claimed, and a benefit to claim (their own, or a spouse's through theirs). */
  readonly chooser: boolean
  /** The yearly benefit in today's dollars this year, the engine's own amounts (`householdBenefits`): the own benefit,
   *  plus the spousal part only once the other person has filed (the engine pays it from the later of the two claims,
   *  `benefitYear.ts`'s `spousalStart`). */
  readonly benefit: number
}

export type ClaimChoices =
  | {
      readonly kind: 'choices'
      readonly people: readonly ClaimPerson[]
      readonly strategies: readonly ClaimStrategy[]
      /** Which strategies coincide, one line per set (the dropped ones named beside the one kept). */
      readonly coincide: readonly string[]
      /** A line per person whose age is fixed (already claiming, or no benefit). */
      readonly fixed: readonly string[]
    }
  /** Everyone with a benefit already claims it: no choice left. */
  | { readonly kind: 'all-claimed'; readonly people: readonly ClaimPerson[] }
  /** No one has a benefit. */
  | { readonly kind: 'none' }

const capitalize = (s: string): string => (s === '' ? s : s[0]!.toUpperCase() + s.slice(1))

/** Full retirement age rounded up to the whole year (66 and 2 to 10 months for births from 1955 to 1959 → 67). */
export function fraWholeYears(birthYear: number): number {
  return Math.ceil(fraMonthsForBirthYear(birthYear, 'retirement') / 12)
}

/** The people of a committed draft, as the page speaks of them. */
export function claimPeople(draft: ScenarioDraft): readonly ClaimPerson[] {
  const people = draft.people
  // A committed final answer's draft is complete; a person missing a fact is never offered a choice.
  const facts = people.map((p) =>
    p.pia !== undefined && p.socialSecurityClaimAge !== undefined && p.birthYear !== undefined && p.currentAge !== undefined
      ? { pia: p.pia, claim: p.socialSecurityClaimAge, birthYear: p.birthYear, age: p.currentAge }
      : null,
  )
  const known = facts.every((f) => f !== null)
  const benefits = known ? householdBenefits(facts.map((f) => ({ piaAnnual: f!.pia, claimAge: f!.claim, birthYear: f!.birthYear }))) : []
  return people.map((_, i): ClaimPerson => {
    const f = facts[i] ?? null
    const age = f?.age ?? 0
    const claimed = f !== null && f.age >= f.claim
    const other = facts[1 - i] ?? null
    const hasBenefit = f !== null && (f.pia > 0 || (people.length === 2 && other !== null && other.pia > 0))
    const b = benefits[i]
    // The spousal part starts at the later of the two claims (`bothAliveYearBenefit`'s `spousalStart`): only the part the
    // engine already pays this year is "already received".
    const otherFiled = other !== null && other.age >= other.claim
    return {
      index: i,
      words: tablePerson(draft, i, age, age),
      currentAge: age,
      planAge: f?.claim ?? 0,
      birthYear: f?.birthYear ?? 0,
      claimed,
      chooser: known && !claimed && hasBenefit,
      benefit: b === undefined ? 0 : b.ownAnnual + (otherFiled ? b.spousalExcessAnnual : 0),
    }
  })
}

/** Each strategy's age for one person who chooses. */
function ageFor(id: StrategyId, p: ClaimPerson): number {
  if (id === 'plan') return p.planAge
  if (id === 'earliest') return Math.max(SS_CLAIM_MIN, p.currentAge)
  if (id === 'fra') return Math.max(fraWholeYears(p.birthYear), p.currentAge)
  return Math.max(SS_CLAIM_MAX, p.currentAge)
}

/** A list in words: "a", "a and b", "a, b and c". */
const listWords = (items: readonly string[]): string => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)!}`)

/** The strategies for a committed draft (plan RC9). */
export function claimStrategies(draft: ScenarioDraft): ClaimChoices {
  const people = claimPeople(draft)
  const choosers = people.filter((p) => p.chooser)
  if (choosers.length === 0) {
    return people.some((p) => p.claimed && p.benefit > 0) ? { kind: 'all-claimed', people } : { kind: 'none' }
  }
  const all = STRATEGY_ORDER.map((id): ClaimStrategy => {
    const ages = people.map((p) => (p.chooser ? ageFor(id, p) : null))
    const bundle: WhatIfLeverV6[] = []
    people.forEach((p, i) => {
      const age = ages[i]
      if (age !== null && age !== undefined && age !== p.planAge) bundle.push({ kind: 'claim-age', personIndex: p.index, claimAge: age })
    })
    return { id, label: LABEL[id], phrase: PHRASE[id], ages, bundle }
  })
  const kept: ClaimStrategy[] = []
  const groups: ClaimStrategy[][] = []
  for (const s of all) {
    const key = s.ages.join(',')
    const at = kept.findIndex((k) => k.ages.join(',') === key)
    if (at === -1) {
      kept.push(s)
      groups.push([s])
    } else groups[at]!.push(s)
  }
  const coincide = groups
    .filter((g) => g.length > 1)
    .map((g) => {
      const phrases = listWords(g.map((s) => s.phrase))
      const who = choosers.map((p) => ({ mid: p.words.mid, age: g[0]!.ages[p.index]! }))
      return who.length === 1 ? slots.claimsCoincideOne(who[0]!.mid, phrases, who[0]!.age, g.length) : slots.claimsCoincideMany(capitalize(phrases), listWords(who.map((w) => slots.claimsPersonAt(w.mid, w.age))))
    })
  // An already-filed person paid $0 so far (no benefit of their own, the spousal part waiting on the other's filing,
  // `claimPeople`) gets words with no figure: "already receives about ~$0 a year" read as a benefit that is nothing.
  const fixedLine = (p: ClaimPerson): string => {
    const other = people[1 - p.index]
    if (!p.claimed) return slots.claimsNoBenefit(capitalize(p.words.mid), p.words.you)
    if (p.benefit === 0 && other !== undefined && !other.claimed) return slots.claimsFixedSpousalPending(capitalize(p.words.mid), p.words.you, p.words.possessive, other.words.mid, other.words.you)
    return slots.claimsFixed(capitalize(p.words.mid), p.words.you, p.words.possessive, formatDeltaDollar(p.benefit))
  }
  const fixed = people.filter((p) => !p.chooser).map(fixedLine)
  return { kind: 'choices', people, strategies: kept, coincide, fixed }
}

// ── The figures ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The grain a dollar figure prints at (`formatDeltaDollar`'s step), and the figure snapped to it (insight 146). */
export function snapToGrain(dollars: number): number {
  const v = Math.abs(dollars)
  const step = v < 10_000 ? 100 : v < 100_000 ? 1_000 : 10_000
  return Math.sign(dollars) * Math.round(v / step) * step
}

/** The last row index read: the steady market's second death (each person's last age alive in it), never past the rows. */
export function lastIndexOf(meta: TableMeta, rows: readonly LedgerYearRow[]): number {
  return Math.min(rows.length - 1, horizonOf(meta, rows))
}

/** The steady market's second death as a row index (each person's last age alive in it). */
const horizonOf = (meta: TableMeta, rows: readonly LedgerYearRow[]): number => {
  const h = Math.max(...meta.people.map((p) => p.lastAge - p.currentAge))
  return Number.isFinite(h) ? h : rows.length - 1
}

/** The yearly Social Security through the last index. */
export const yearly = (rows: readonly LedgerYearRow[], last: number): number[] => rows.slice(0, last + 1).map((r) => Math.max(0, r.socialSecurity))

/** The running totals of a yearly series. */
export function cumulative(series: readonly number[]): number[] {
  let sum = 0
  return series.map((v) => (sum += v))
}

/** The lifetime total: the sum of the yearly figures (the ledger rows' own `socialSecurity`). */
export const lifetimeTotal = (series: readonly number[]): number => series.reduce((a, b) => a + b, 0)

/**
 * THE BREAK-EVEN: the index from which the side that started behind stays ahead through the last year, or null where the
 * lead never changes for good. Each running total is snapped to its printed grain before the two are compared (a tie at
 * the printed grain is no lead), and only the indices given are read (the caller cuts them at the second death).
 */
export function breakEvenIndex(a: readonly number[], b: readonly number[]): number | null {
  const n = Math.min(a.length, b.length)
  let first = 0
  let lead = 0
  let since = -1
  for (let t = 0; t < n; t++) {
    const d = snapToGrain(a[t]!) - snapToGrain(b[t]!)
    const s = d > 0 ? 1 : d < 0 ? -1 : 0
    if (s === 0) continue
    if (first === 0) first = s
    if (s !== lead) {
      lead = s
      since = t
    }
  }
  return first !== 0 && lead !== first ? since : null
}

/** A ran-out run's last row index (the money ran out before the steady market's last year), else null. */
const ranOutBefore = (meta: TableMeta, rows: readonly LedgerYearRow[]): number | null => {
  const end = rows[rows.length - 1]
  return end !== undefined && end.ranOut && rows.length - 1 < horizonOf(meta, rows) ? rows.length - 1 : null
}

/** A many-futures reading as the odds under a bar ("7 of 10"), through the one ring composer. */
export function oddsWords(reading: WhatIfReading, startCalendarYear: number): string {
  const face = ringFace(reading, startCalendarYear)
  return face.centre ?? face.caption
}

// ── The page's inputs ───────────────────────────────────────────────────────────────────────────────────────────

/** A strategy's many-futures reading, as the page may show it. */
export type ReadingState =
  /** `updating`: the reading is from before the latest change (an older answer's run, or the answer being worked out
   *  again), shown marked, never as current. */
  | { readonly kind: 'ready'; readonly reading: WhatIfReading; readonly updating: boolean }
  | { readonly kind: 'loading' }
  | { readonly kind: 'withheld'; readonly words: string }

export type ClaimsChart = 'annual' | 'cumulative'

export const CLAIMS_CHARTS: readonly { readonly id: ClaimsChart; readonly label: string }[] = [
  { id: 'annual', label: copy.claimsChartAnnual },
  { id: 'cumulative', label: copy.claimsChartCumulative },
]

/** The notes every figured view carries: who is fixed, which strategies coincide, the lifespans the steady market uses,
 *  the working route's stop year, the plan's build year where it is not this year, the page's one state clause. */
export interface ClaimsNotesInput {
  readonly choices: Extract<ClaimChoices, { kind: 'choices' }>
  readonly stateClause: string | null
  /** The plan's age in years (`yearsSincePlanBuilt`): every age and year here is the build year's. */
  readonly planClockYears: number
}

/** On a plan built in an earlier year, the one line that its ages and years are as of that year (the page speaks the
 *  build year's ages: "files at 63, in 2025" read in 2026 would be a present instruction already past). */
const asOfLine = (startCalendarYear: number, planClockYears: number): string[] => (planClockYears > 0 ? [slots.claimsAsOfBuild(startCalendarYear)] : [])

function runNotes(meta: TableMeta, planClockYears: number): string[] {
  const out = [lifespansLine(meta.people)]
  if (meta.route !== 'spine' && meta.stopYear !== undefined) out.push(meta.route === 'no-date' ? slots.claimsWorkStopsNoDate(meta.stopYear) : slots.claimsWorkStops(meta.stopYear))
  // A floor-keyed band: the steady rows (and every ran-out line and "No lifetime total" read from them) are the
  // essentials-only pass once work stops, said as Health Care and Cash Flows say it.
  if (meta.track === 'floor') out.push(copy.claimsFloorTrack)
  out.push(...asOfLine(meta.startCalendarYear, planClockYears))
  return out
}

const pickerItems = (strategies: readonly ClaimStrategy[]) => strategies.map((s) => ({ value: s.id, label: s.label }))

/** The pickers' values: each side's own pick where it is still offered, else A the first strategy other than the plan
 *  and B your plan's own ages (plan RC9: B defaults to your plan). */
export function picks(strategies: readonly ClaimStrategy[], a: StrategyId | undefined, b: StrategyId | undefined): { readonly a: StrategyId; readonly b: StrategyId } {
  const has = (id: StrategyId | undefined) => id !== undefined && strategies.some((s) => s.id === id)
  const firstOther = strategies.find((s) => s.id !== 'plan')?.id ?? 'plan'
  return { a: has(a) ? a! : firstOther, b: has(b) ? b! : 'plan' }
}

// ── Comparison ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface ClaimPoint {
  readonly age: number
  readonly value: number
}

export interface ClaimSeries {
  readonly id: string
  readonly name: string
  readonly role: 'alternative' | 'compared'
  readonly points: readonly ClaimPoint[]
}

export interface ClaimsComparisonInput {
  readonly chart: ClaimsChart
  readonly a: StrategyId | undefined
  readonly b: StrategyId | undefined
  readonly notes: ClaimsNotesInput
  /** Each strategy's steady-market rows (your plan's own: the plan's rows). */
  readonly rows: Partial<Record<StrategyId, RunRows>>
}

export type ClaimsComparisonView =
  | {
      readonly kind: 'words'
      readonly words: string
      readonly a: StrategyId
      readonly b: StrategyId
      readonly items: readonly { readonly value: StrategyId; readonly label: string }[]
      readonly side: readonly string[]
    }
  | {
      readonly kind: 'pair'
      readonly chart: ClaimsChart
      readonly a: StrategyId
      readonly b: StrategyId
      readonly items: readonly { readonly value: StrategyId; readonly label: string }[]
      readonly title: string
      readonly axisTitle: string
      readonly series: readonly [ClaimSeries, ClaimSeries]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      /** The cumulative chart's crossing (the break-even): where the ring sits and its age label. */
      readonly crossing?: { readonly age: number; readonly value: number; readonly label: string }
      readonly hero: string
      readonly heroLine: string
      readonly description: string
      /** Beside the key metric: who is fixed and which strategies coincide. */
      readonly side: readonly string[]
      /** Under the chart: the lifespans the steady market uses, the working route's stop year, the state clause. */
      readonly notes: readonly string[]
      readonly updating: boolean
    }

/** A run's state, reduced to what a view needs. */
type Ready = Extract<RunRows, { kind: 'ready' }>

function readyOrWords(runs: readonly (RunRows | undefined)[]): { readonly ready: readonly Ready[] } | { readonly words: string } {
  for (const r of runs) if (r?.kind === 'withheld') return { words: r.words }
  if (runs.some((r) => r?.kind === 'error')) return { words: copy.claimsRunsError }
  if (runs.some((r) => r === undefined || r.kind !== 'ready')) return { words: copy.claimsRunsWaiting }
  return { ready: runs as readonly Ready[] }
}

export function claimsComparisonView(input: ClaimsComparisonInput): ClaimsComparisonView {
  const { choices } = input.notes
  const strategies = choices.strategies
  const { a, b } = picks(strategies, input.a, input.b)
  const items = pickerItems(strategies)
  const fixedNotes = [...choices.fixed, ...choices.coincide]
  const words = (w: string): ClaimsComparisonView => ({ kind: 'words', words: w, a, b, items, side: fixedNotes })
  if (a === b) return words(copy.claimsPickTwo)
  const sa = strategies.find((s) => s.id === a)!
  const sb = strategies.find((s) => s.id === b)!
  const got = readyOrWords([input.rows[a], input.rows[b]])
  if ('words' in got) return words(got.words)
  const [ra, rb] = got.ready as [Ready, Ready]
  const meta = rb.meta
  const last = Math.min(lastIndexOf(ra.meta, ra.rows), lastIndexOf(rb.meta, rb.rows))
  const ya = yearly(ra.rows, last)
  const yb = yearly(rb.rows, last)
  const first = meta.people[0]!
  const ageAt = (t: number) => first.currentAge + t
  const cumulativeChart = input.chart === 'cumulative'
  const va = cumulativeChart ? cumulative(ya) : ya
  const vb = cumulativeChart ? cumulative(yb) : yb
  const lattice = niceLattice(Math.max(1, ...va, ...vb))
  const notes = [...runNotes(meta, input.notes.planClockYears), ...(input.notes.stateClause !== null ? [input.notes.stateClause] : [])]
  const series: [ClaimSeries, ClaimSeries] = [
    { id: 'claims-a', name: sa.label, role: 'alternative', points: va.map((value, t) => ({ age: ageAt(t), value })) },
    { id: 'claims-b', name: sb.label, role: 'compared', points: vb.map((value, t) => ({ age: ageAt(t), value })) },
  ]
  const base = {
    kind: 'pair' as const,
    chart: input.chart,
    a,
    b,
    items,
    title: slots.claimsInSteady(CLAIMS_CHARTS.find((c) => c.id === input.chart)!.label),
    axisTitle: slots.claimsAgeAxis(capitalize(first.possessive)),
    series,
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    description: cumulativeChart ? copy.claimsCumulativeDescription : copy.claimsAnnualDescription,
    side: fixedNotes,
    notes,
    updating: ra.updating || rb.updating,
  }
  // A run whose money ran out before the steady market's last year stops its rows there: its totals can't be read.
  for (const [s, r] of [
    [sa, ra],
    [sb, rb],
  ] as const) {
    const out = ranOutBefore(r.meta, r.rows)
    if (out !== null) return { ...base, hero: copy.claimsNoTotal, heroLine: slots.claimsRanOut(s.label, r.meta.startCalendarYear + out) }
  }
  if (!cumulativeChart) {
    const diff = snapToGrain(lifetimeTotal(ya)) - snapToGrain(lifetimeTotal(yb))
    const fig = formatDeltaDollar(diff)
    if (fig === '0') return { ...base, hero: copy.claimsAboutSame, heroLine: slots.claimsSameLine(sa.phrase, sb.phrase) }
    return { ...base, hero: slots.claimsMoreHero(fig, diff > 0 ? 'more' : 'less'), heroLine: slots.claimsMoreLine(sa.phrase, sb.phrase) }
  }
  const t = breakEvenIndex(va, vb)
  const year = (i: number) => meta.startCalendarYear + i
  if (t === null) {
    // The lead that holds is the last one at the printed grain (`breakEvenIndex`'s own rule): a tie in the last year is
    // no lead, so it never hands the lead to the side that trailed throughout.
    let lead = 0
    for (let i = Math.min(va.length, vb.length) - 1; i >= 0 && lead === 0; i--) lead = Math.sign(snapToGrain(va[i]!) - snapToGrain(vb[i]!))
    if (lead === 0) return { ...base, hero: copy.claimsAboutSame, heroLine: slots.claimsSamePaid(sa.phrase, sb.phrase) }
    // The totals print the same in the last year read: no side leads there, so never "stays ahead through" it (the
    // yearly view says "About the same" of the same two totals).
    if (snapToGrain(va[last]!) === snapToGrain(vb[last]!))
      return { ...base, hero: copy.claimsAboutSame, heroLine: slots.claimsLevelByLine(year(last), first.possessive, ageAt(last), sa.phrase, sb.phrase) }
    const [leader, other] = lead > 0 ? [sa, sb] : [sb, sa]
    return { ...base, hero: copy.claimsNoBreakEven, heroLine: slots.claimsNoBreakEvenLine(year(last), first.possessive, ageAt(last), leader.phrase, other.phrase) }
  }
  const leaderIsA = snapToGrain(va[t]!) > snapToGrain(vb[t]!)
  const [leader, other] = leaderIsA ? [sa, sb] : [sb, sa]
  const label = slots.claimsBreakEvenAge(ageAt(t))
  return {
    ...base,
    crossing: { age: ageAt(t), value: Math.max(va[t]!, vb[t]!), label },
    hero: label,
    heroLine: slots.claimsBreakEvenLine(capitalize(first.possessive), year(t), leader.phrase, other.phrase),
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ClaimBar {
  readonly id: StrategyId
  readonly name: string
  /** The lifetime total, or null where the run's money ran out first (its total can't be read). */
  readonly total: number | null
  readonly figure: string
  /** The same figure in the axis's `mm` dialect, three figures, for a bar too narrow for the full one (the phone). */
  readonly compactFigure: string
  readonly odds: string
  readonly role: 'alternative' | 'compared'
  readonly point: string
}

export interface ClaimsSummaryInput {
  readonly notes: ClaimsNotesInput
  readonly rows: Partial<Record<StrategyId, RunRows>>
  readonly readings: Partial<Record<StrategyId, ReadingState>>
}

export type ClaimsSummaryView =
  | { readonly kind: 'words'; readonly words: string; readonly side: readonly string[] }
  | {
      readonly kind: 'bars'
      readonly title: string
      readonly bars: readonly ClaimBar[]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly hero: string
      readonly heroLine: string
      readonly oddsLine: string
      readonly description: string
      readonly side: readonly string[]
      readonly notes: readonly string[]
      readonly updating: boolean
    }

export function claimsSummaryView(input: ClaimsSummaryInput): ClaimsSummaryView {
  const { choices } = input.notes
  const fixedNotes = [...choices.fixed, ...choices.coincide]
  const strategies = choices.strategies
  const got = readyOrWords(strategies.map((s) => input.rows[s.id]))
  if ('words' in got) return { kind: 'words', words: got.words, side: fixedNotes }
  for (const s of strategies) {
    const r = input.readings[s.id]
    if (r?.kind === 'withheld') return { kind: 'words', words: r.words, side: fixedNotes }
    if (r === undefined || r.kind !== 'ready') return { kind: 'words', words: copy.claimsRunsWaiting, side: fixedNotes }
  }
  const ready = got.ready
  const meta = ready.find((_, i) => strategies[i]!.id === 'plan')?.meta ?? ready[0]!.meta
  const ranOut: string[] = []
  const bars = strategies.map((s, i): ClaimBar => {
    const r = ready[i]!
    const out = ranOutBefore(r.meta, r.rows)
    if (out !== null) ranOut.push(slots.claimsRanOut(s.label, r.meta.startCalendarYear + out))
    // Each bar totals its OWN years through the steady market's second death: a strategy whose money ran out sets no
    // window for the rest (the runs that last share the same lifespans, so their windows agree).
    const total = out === null ? snapToGrain(lifetimeTotal(yearly(r.rows, lastIndexOf(r.meta, r.rows)))) : null
    const reading = input.readings[s.id] as Extract<ReadingState, { kind: 'ready' }>
    const odds = oddsWords(reading.reading, r.meta.startCalendarYear)
    const figure = total === null ? copy.claimsNoTotal : slots.claimsFigure(formatDeltaDollar(total))
    const compactFigure = total === null ? copy.claimsNoTotal : slots.claimsFigure(compactDollars(total))
    return { id: s.id, name: s.label, total, figure, compactFigure, odds, role: s.id === 'plan' ? 'compared' : 'alternative', point: slots.claimsBarPoint(s.label, figure, odds) }
  })
  const totals = bars.flatMap((b) => (b.total === null ? [] : [b.total]))
  const lattice = niceLattice(Math.max(1, ...totals))
  const notes = [...ranOut, ...runNotes(meta, input.notes.planClockYears), ...(input.notes.stateClause !== null ? [input.notes.stateClause] : [])]
  const shownReadings = strategies.map((s) => input.readings[s.id] as Extract<ReadingState, { kind: 'ready' }>)
  // On the essentials-only pass the odds under the bars are that pass's, said beside them as the ring says it.
  const floorPass = shownReadings.some((r) => r.reading.kind === 'offset' && r.reading.track === 'floor')
  const top = totals.length === 0 ? null : Math.max(...totals)
  const leaders = top === null ? [] : bars.filter((b) => b.total === top)
  const planBar = bars.find((b) => b.id === 'plan')
  const leadPhrase = listWords(leaders.map((b) => strategies.find((s) => s.id === b.id)!.phrase))
  return {
    kind: 'bars',
    title: slots.claimsInSteady(copy.claimsSummaryTitle),
    bars,
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    hero: top === null ? copy.claimsNoTotal : slots.claimsFigure(formatDeltaDollar(top)),
    // A bar with no lifetime total (its money ran out first) narrows the claim to the strategies with one.
    heroLine: top === null ? '' : slots.claimsSummaryLine(leadPhrase, leaders.length, totals.length < bars.length),
    oddsLine:
      leaders.length === 1 && leaders[0]!.id !== 'plan' && planBar !== undefined
        ? slots.claimsSummaryOdds(leaders[0]!.odds, planBar.odds)
        : planBar !== undefined
          ? slots.claimsSummaryOddsPlan(planBar.odds)
          : '',
    description: copy.claimsBarsDescription,
    side: [copy.claimsOddsNote, ...(floorPass ? [copy.snapshotRingEssentialsNote] : []), ...fixedNotes],
    notes,
    updating: ready.some((r) => r.updating) || shownReadings.some((r) => r.updating),
  }
}

// ── No choice left ──────────────────────────────────────────────────────────────────────────────────────────────

export interface ClaimsSettledView {
  readonly lines: readonly string[]
  readonly notes: readonly string[]
}

/** Everyone already claims: each one's benefit and the lifetime total, and that no claim choice is left (plan RC9). While
 *  the plan's rows are from before the latest change (`updating`), the re-figuring line says so beside the old figures. */
export function claimsSettledView(people: readonly ClaimPerson[], plan: RunRows, stateClause: string | null, planClockYears: number): ClaimsSettledView {
  const each = people.map((p) =>
    p.benefit > 0 ? slots.claimsReceives(capitalize(p.words.mid), p.words.you, formatDeltaDollar(p.benefit)) : slots.claimsNoBenefit(capitalize(p.words.mid), p.words.you),
  )
  const lines = [copy.claimsNoChoiceLeft, ...each]
  if (plan.kind !== 'ready') return { lines: [...lines, plan.kind === 'withheld' ? plan.words : plan.kind === 'error' ? copy.claimsRunsError : copy.claimsRunsWaiting], notes: [] }
  const last = lastIndexOf(plan.meta, plan.rows)
  const out = ranOutBefore(plan.meta, plan.rows)
  const total = slots.claimsLifetimeTotal(formatDeltaDollar(snapToGrain(lifetimeTotal(yearly(plan.rows, last)))))
  return {
    lines: [...lines, out === null ? total : slots.claimsRanOut(copy.claimsStrategyPlan, plan.meta.startCalendarYear + out), ...(plan.updating ? [copy.answerRefiguringCaption] : [])],
    notes: [...runNotes(plan.meta, planClockYears), ...(stateClause !== null ? [stateClause] : [])],
  }
}

// ── Action Items: the filing instructions ───────────────────────────────────────────────────────────────────────

export interface ClaimsSteps {
  readonly heading: string
  /** Numbered in order; each person named once. */
  readonly steps: readonly string[]
  readonly note: string
  /** On a plan built in an earlier year: its ages and filing years are as of that year. */
  readonly asOf?: string
}

/** The numbered filing instructions composed from strategy A (RightCapital's Action Items here are instructions).
 *  `planClockYears` is the plan's age in years: the ages and years are the build year's, said once where that is past. */
export function claimsSteps(strategy: ClaimStrategy, people: readonly ClaimPerson[], startCalendarYear: number, planClockYears: number): ClaimsSteps {
  const steps = people.map((p) => {
    const who = capitalize(p.words.mid)
    const age = strategy.ages[p.index]
    if (p.chooser && age !== null && age !== undefined) return slots.claimsStepFiles(who, p.words.you, age, startCalendarYear + (age - p.currentAge))
    // Filed but paid nothing yet (`fixedLine`'s test): the spousal part waits on the other's filing, so never "already
    // receives Social Security".
    const other = people[1 - p.index]
    if (p.claimed && p.benefit === 0 && other !== undefined && !other.claimed) return slots.claimsStepSpousalPending(who, p.words.you, p.words.possessive, other.words.mid, other.words.you)
    return p.claimed ? slots.claimsStepClaimed(who, p.words.you) : slots.claimsNoBenefit(who, p.words.you)
  })
  const asOf = asOfLine(startCalendarYear, planClockYears)[0]
  return { heading: slots.claimsStepsHeading(strategy.label), steps, note: copy.claimsStepsNote, ...(asOf !== undefined ? { asOf } : {}) }
}
