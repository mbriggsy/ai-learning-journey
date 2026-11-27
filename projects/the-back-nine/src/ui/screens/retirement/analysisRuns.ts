/**
 * src/ui/screens/retirement/analysisRuns.ts: what Analysis's Comparisons, Savings and Retirement Details tabs share
 * (plan docs/plans/6-rightcapital-ui-plan.md, RC17). PURE: the shell hands each tab's composer the rows it already runs
 * (your plan's steady and rough lanes, the what-if slots: no new engine call path), and this file turns them into ready
 * sides, years, ages and windows.
 *
 * THE TWO SIDES are Probability's: the alternative on the left (the what-if, a kept what-if or Recommended; green and
 * solid) and the plan it is compared against on the right (your plan unless its picker says otherwise; blue with the
 * second cue). With no what-if open beside your plan the alternative is absent: the tabs show your plan alone and say so,
 * never a second line copied from the first.
 *
 * A LEDGER ROW IS THE END OF A SIM-YEAR (insight 134; `LedgerLoopRow`): row t is calendar year `startCalendarYear + t`,
 * its flows happened during the year, `start` is the year's opening and `end` its close. The money-ran-out row
 * (`ranOut`) records what the year ASKED for, forfeits its deposits, closes at zero and does not reconcile: no figure
 * here counts its flows as paid, and the rows (and every axis) end there, which the tabs say.
 *
 * THE FIRST RETIRED YEAR is the run's own stop year (`TableMeta.stopYear`, which a what-if's stop-year lever moves), or
 * row one on the all-retired route. "What a side holds as retirement begins" is that row's OPENING (`start`): what the
 * household retires with, before the year's first withdrawal.
 *
 * WINDOWS (insight 175): two runs can end in different years (a run whose money runs out stops there). Each figure picks
 * its years here and its sentence names them; nothing sums each run to its own end.
 */
import { ledgerRowEndTotal, ledgerRowInheritedSpent, ledgerRowStartTotal } from '@engine/sequencing'
import type { LedgerYearRow } from '@shared/model'
import type { TableMeta } from '../../workbench/tableRun'
import { copy, slots } from '../../copy'
import type { TimeAxis } from '../../displaySettings'
import type { RunRows } from './cashFlowsView'

export type AnalysisFuture = 'steady' | 'rough'
export type SideId = 'alternative' | 'compared'

/** One side as the shell hands it over: its names and its rows in the future shown. */
export interface RunSide {
  readonly id: SideId
  /** As its picker shows it; opens a sentence. */
  readonly title: string
  /** Inside a sentence: a built-in name in lower case, a kept what-if's as typed. */
  readonly mid: string
  readonly rows: RunRows
  /** These rows are your plan's own lane (`analysisSides`). Retirement Details points at Cash Flows' "Your plan beside
   *  the what-if" only where the compared side is your plan and the alternative is not (round 2, R2F2). */
  readonly plan?: boolean
}

export interface ReadySide {
  readonly id: SideId
  readonly title: string
  readonly mid: string
  readonly rows: readonly LedgerYearRow[]
  readonly meta: TableMeta
  readonly updating: boolean
  readonly plan?: boolean
}

/** Everything a tab's composer reads. */
export interface AnalysisInput {
  readonly future: AnalysisFuture
  /** The right side: your plan unless its picker says otherwise. Always present. */
  readonly compared: RunSide
  /** The left side, or null: no what-if open beside your plan. */
  readonly alternative: RunSide | null
  readonly timeAxis: TimeAxis
  /** The page's one state clause (`composeVerdictStateNote`), on every chart's notes (plan 4.0's disclosure map). */
  readonly stateClause: string | null
  /** The rough market's words (`workbenchRoughWhat` over the committed window). */
  readonly roughWhat: string
  /** A read-only tab: no door that writes (plan 4.0). */
  readonly readOnly: boolean
}

export type SidesGate =
  | { readonly kind: 'words'; readonly words: string }
  | { readonly kind: 'ready'; readonly sides: readonly ReadySide[]; readonly updating: boolean }

/** The sides shown, alternative first: the first side's withheld words, else an error, else "working out" until every
 *  side's rows are ready, and two sides only once both stand on one answer (Cash Flows' paired rule). */
export function gateSides(input: Pick<AnalysisInput, 'compared' | 'alternative'>): SidesGate {
  const all = input.alternative === null ? [input.compared] : [input.alternative, input.compared]
  for (const s of all) if (s.rows.kind === 'withheld') return { kind: 'words', words: s.rows.words }
  if (all.some((s) => s.rows.kind === 'error')) return { kind: 'words', words: copy.analysisRunsError }
  const ready: ReadySide[] = []
  for (const s of all) {
    if (s.rows.kind !== 'ready') return { kind: 'words', words: copy.analysisRunsWaiting }
    ready.push({ id: s.id, title: s.title, mid: s.mid, rows: s.rows.rows, meta: s.rows.meta, updating: s.rows.updating, ...(s.plan === true ? { plan: true } : {}) })
  }
  const keys = new Set(all.map((s) => (s.rows.kind === 'ready' ? s.rows.answerKey : '')))
  if (keys.size > 1) return { kind: 'words', words: copy.analysisRunsWaiting }
  return { kind: 'ready', sides: ready, updating: ready.some((s) => s.updating) }
}

export const yearOf = (meta: TableMeta, r: LedgerYearRow): number => meta.startCalendarYear + r.t

/** The living people's ages in a row ("ages 62 and 60"). */
export function agesIn(meta: TableMeta, r: LedgerYearRow): string {
  const ages = meta.people.flatMap((p, i) => (r.alive[i] === false ? [] : [p.currentAge + r.t]))
  return slots.analysisAges(ages.length > 0 ? ages : meta.people.map((p) => p.currentAge + r.t))
}

/** The first retired row's t: the run's stop year, or row one on the all-retired route. */
export function firstRetiredT(meta: TableMeta): number {
  if (meta.route === 'spine' || meta.stopYear === undefined) return 0
  return Math.max(0, meta.stopYear - meta.startCalendarYear)
}

/** A row's year-end invested total: the engine's own (`ledgerRowEndTotal`, the four buckets plus each inherited IRA). */
export const endTotal = (r: LedgerYearRow): number => ledgerRowEndTotal(r)
/** A row's opening invested total (`ledgerRowStartTotal`). */
export const startTotal = (r: LedgerYearRow): number => ledgerRowStartTotal(r)

/** What a year takes from the accounts toward its need: the three draws, the HSA's spend and each inherited IRA's
 *  spent part (what it paid out less what moved to taxable). Never a conversion, never a required withdrawal moved to
 *  taxable (both move money between accounts), and never an inherited balance that left the run at the heir's death.
 *  Retirement Details divides it by {@link startTotal}, which counts the inherited ledgers, so it must count their
 *  spending too (the Act 5 plan's U12). */
export const withdrawn = (r: LedgerYearRow): number => {
  const general = r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend
  return r.inherited === undefined ? general : general + ledgerRowInheritedSpent(r)
}

/** The year's health premiums: the marketplace premium after its credit, the Medicare bill (its surcharge already in it,
 *  `irmaaSurcharge` is part of `medicare`) and the entered extras. */
export const premiumsOf = (r: LedgerYearRow): number => r.premiums.acaNet + r.premiums.medicare + r.premiums.medicareExtras

/** The income a year lives on that is not a withdrawal: Social Security and other income, less the part past what the
 *  year spends that the tool does not keep (`incomeNotKept`). */
export const keptIncome = (r: LedgerYearRow): number =>
  Math.max(0, r.socialSecurity + r.otherIncomeByPerson.reduce((s, o) => s + o.gross, 0) - r.incomeNotKept)

/** The run's last row and whether its money ran out there. */
export function endOf(side: ReadySide): { readonly year: number; readonly ranOut: boolean; readonly row: LedgerYearRow | undefined } {
  const last = side.rows.at(-1)
  return { year: side.meta.startCalendarYear + (last?.t ?? 0), ranOut: last?.ranOut === true, row: last }
}

/** The rows a figure may count as paid: every row but the money-ran-out one. */
export const paidRows = (side: ReadySide): readonly LedgerYearRow[] => side.rows.filter((r) => !r.ranOut)

/** The retired rows a figure may count as paid. */
export const retiredPaidRows = (side: ReadySide): readonly LedgerYearRow[] => {
  const from = firstRetiredT(side.meta)
  return side.rows.filter((r) => !r.ranOut && r.t >= from)
}

/** The working rows a figure may count as paid: before the first retired year, never the money-ran-out row. */
export const workingPaidRows = (side: ReadySide): readonly LedgerYearRow[] => {
  const before = firstRetiredT(side.meta)
  return side.rows.filter((r) => !r.ranOut && r.t < before)
}

/** The ran-out note over the sides shown: every run whose money ran out, named with its year, and, where a figure counts
 *  only the years every side reaches, `through` (that last year, said in the note). Absent where no side ran out. */
export function ranOutNote(sides: readonly ReadySide[], steady: boolean, through: number | null): string | undefined {
  const out = sides.flatMap((s) => {
    const e = endOf(s)
    return e.ranOut ? [{ name: s.mid, year: e.year }] : []
  })
  if (out.length === 0) return undefined
  return slots.analysisRanOut(out, steady, sides.length > 1 ? through : null)
}

/** The last year every side's rows reach (a run's money-ran-out row included: its close is zero, the money gone). */
export const lastSharedYear = (sides: readonly ReadySide[]): number => Math.min(...sides.map((s) => endOf(s).year))

/** The years both sides' retired rows share, from the later first retired year to the earlier last paid row: one window
 *  for a comparison, so neither side's total differs by its years alone. Null where they share none. */
export function sharedRetiredWindow(sides: readonly ReadySide[]): { readonly from: number; readonly through: number } | null {
  let from = -Infinity
  let through = Infinity
  for (const s of sides) {
    const rows = retiredPaidRows(s)
    if (rows.length === 0) return null
    from = Math.max(from, yearOf(s.meta, rows[0]!))
    through = Math.min(through, yearOf(s.meta, rows.at(-1)!))
  }
  return from <= through ? { from, through } : null
}

/** A difference's direction and its figure in the delta dialect ("the same" where it prints as $0). */
export function direction(ours: number, theirs: number, fig: (n: number) => string): { readonly fig: string; readonly dir: 'more' | 'less' | 'same' } {
  const f = fig(ours - theirs)
  if (f === '0') return { fig: f, dir: 'same' }
  return { fig: f, dir: ours > theirs ? 'more' : 'less' }
}

/** A whole percent's words ("44"); one decimal under 10 ("4.2"), so a withdrawal rate keeps its tenth. */
export const pctWords = (fraction: number): string => {
  const p = fraction * 100
  return p < 10 ? (Math.round(p * 10) / 10).toFixed(1) : String(Math.round(p))
}

/** Whose stop year the rows run at, where the answer found no date (plan 4.0's disclosure map, Cash Flows' `stopLine`):
 *  the tabs then run at the window's last year, which the answer never found, so a side's stop is never read as its date.
 *  One line where every side stops in the same year; where they differ, each side's, named, a stop-year lever's own year
 *  included unless the chart already prints each side's year (`yearsShown`). On the dated route the page's intro
 *  already names the answer's date, so only a stop-year lever's own year is said (milestone 4's review, A6), as Cash
 *  Flows' `stopLine` says it on every route. */
export function stopNotes(sides: readonly ReadySide[], yearsShown: boolean): string[] {
  const noDate = (s: ReadySide) => s.meta.route === 'no-date' && s.meta.stopFrom === 'answer' && s.meta.stopYear !== undefined
  const lever = (s: ReadySide): string[] =>
    !yearsShown && s.meta.stopFrom === 'lever' && s.meta.stopYear !== undefined ? [slots.cashFlowsRunStopsLever(s.title, s.meta.stopYear)] : []
  const first = sides.find(noDate)
  if (first === undefined) return sides.flatMap(lever)
  if (new Set(sides.map((s) => s.meta.stopYear)).size === 1) return [slots.healthNoDate(first.meta.stopYear!)]
  return sides.flatMap((s) => {
    if (noDate(s)) return [slots.cashFlowsRunStopsNoDate(s.title, s.meta.stopYear!)]
    return lever(s)
  })
}

/** The notes every tab's chart carries: which future, the essentials-only level where a run reads it, whose stop year
 *  the rows run at on the no-date route (`stopNotes`), the state clause. */
export function futureNotes(input: AnalysisInput, sides: readonly ReadySide[], yearsShown = false): string[] {
  return [
    input.future === 'steady' ? copy.analysisSteadyWhat : input.roughWhat,
    ...(sides.some((s) => s.meta.track === 'floor') ? [copy.analysisFloorTrack] : []),
    ...stopNotes(sides, yearsShown),
    ...(input.stateClause !== null ? [input.stateClause] : []),
  ]
}

/** The pickers' values and titles, and the rows each candidate side would read, as the shell holds them. */
export interface SidePicks {
  /** Probability's right picker, as it resolved (a pick that can no longer be made reads your plan). */
  readonly rightPick: 'plan' | 'recommended' | `kept:${string}`
  readonly rightTitle: string
  /** The right side's own slot rows (read only where the right side is not your plan). */
  readonly rightRows: RunRows
  /** Probability's left picker. */
  readonly leftPick: 'new' | 'recommended' | `kept:${string}`
  readonly leftTitle: string
  /** The left what-if holds no lever: its empty bundle IS your plan (U14). */
  readonly leftEmpty: boolean
  readonly leftRows: RunRows
  /** Your plan's own lane in the future shown. */
  readonly planRows: RunRows
  /** Your plan's name as its picker shows it. */
  readonly planTitle: string
}

/** The two sides as Probability shows them: the right side is the compared plan (your plan's own lane, or its slot's
 *  rows); the left is the alternative, its own run, except that an empty what-if IS your plan, so beside your plan there
 *  is one side (null), and beside a kept what-if or Recommended it is your plan's rows, named so. A built-in name goes
 *  lower case inside a sentence; a kept what-if's name stays as typed. */
export function analysisSides(p: SidePicks): Pick<AnalysisInput, 'compared' | 'alternative'> {
  const lower = (s: string) => s.toLowerCase()
  const rightPlan = p.rightPick === 'plan'
  const compared: RunSide = {
    id: 'compared',
    title: p.rightTitle,
    mid: rightPlan || p.rightPick === 'recommended' ? lower(p.rightTitle) : p.rightTitle,
    rows: rightPlan ? p.planRows : p.rightRows,
    ...(rightPlan ? { plan: true } : {}),
  }
  const alternative: RunSide | null = p.leftEmpty
    ? rightPlan
      ? null
      : { id: 'alternative', title: p.planTitle, mid: lower(p.planTitle), rows: p.planRows, plan: true }
    : {
        id: 'alternative',
        title: p.leftTitle,
        mid: p.leftPick === 'new' || p.leftPick === 'recommended' ? lower(p.leftTitle) : p.leftTitle,
        rows: p.leftRows,
      }
  return { compared, alternative }
}
