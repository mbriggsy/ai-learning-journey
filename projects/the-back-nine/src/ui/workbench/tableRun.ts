/*
 * src/ui/workbench/tableRun.ts — the year-by-year table's runs, from the store's committed answer (workbench plan
 * U7, KTD9).
 *
 * The table shows the run behind the answer it sits beside, so everything here is built from the COMMITTED answer's
 * own draft and its own date outcome (`answer.draft`, `answer.outcome`), never from the live draft: an edit made while
 * a date search is still running can never show new facts at the old date's offset. A run is asked for only on a
 * FINAL answer: a provisional date is never crowned as final (`docs/architecture.md`'s provisional-class rule), so the
 * table waits for the final tier, and until then any earlier rows stay, marked as updating.
 *
 * Each committed answer yields two requests on one base, one per view: the steady future and the rough one
 * (`steadyFuture`, `roughFuture`), each a one-path run of U2's named future with U3's ledger rows on the base's own
 * spending pass. They are cheap (one path), so both run up front and the view switch is one tap with no wait. The
 * account grouping (`base.sources`) and the people's names ride with the request, captured from the same draft that
 * compiled the run (insight 081): the composer never reads the live draft. A what-if's rows (U14, `whatIfRun.ts`) come
 * from the same core ({@link tableRequestsOn}), so the plan's rows and the what-if's are built by one piece of code.
 */
import { buildTableBase, workingYearLeftOverShownState, type AccountSources, type TableBase } from '@intake/intakeMap'
import { workingYearStateTaxReading } from '@intake/workingYearQuote'
import type { LeftOverShownState } from '@intake/workingYearLeftOverState'
import { steadyFuture } from '@engine/simulate'
import { roughFuture } from '@engine/reference/roughSequence'
import { sampleDeathYearOffset } from '@engine/longevity'
import { isPricedState } from '@engine/constants/stateTax'
import type { EngineRunRequest } from '@store/runLanes'
import type { ModelAnswer } from '@store/memoryModel'
import { kindLabel } from '@intake/accountKinds'
import type { AccountKind, EnteredAccount, NamedFuture, WorkingYearStateTaxReading } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { LongevityPerson } from '@engine/longevity'
import { copy, slots } from '../copy'

export type TableView = 'steady' | 'rough'

/** How the table speaks of one person (copy.ts's slot contract): the entered name, else "you" / "your spouse". */
export interface TablePerson {
  /** Column-header form: the name, or "You" / "Your spouse". */
  readonly label: string
  /** Mid-sentence form: the name, or "you" / "your spouse". */
  readonly mid: string
  /** "Sam’s", "your", "your spouse’s". */
  readonly possessive: string
  /** "Sam’s", "yours", "your spouse’s". */
  readonly pronoun: string
  /** The first person's fallback: the verb agrees with "you". */
  readonly you: boolean
  readonly currentAge: number
  /** This person's age in the last year they are alive in the table's future (both views share the lifespans). */
  readonly lastAge: number
}

/** One inherited IRA as its run names it (the Act 5 plan's U13), in `OverlayParams.inheritedIras`' order, which is the
 *  order every row's `inherited` entries keep (`accountSources`' `inherited` list, `buildOverlay`). */
export interface TableInherited {
  /** Mid-sentence: "Alex’s IRA inherited in 2023", "your IRA inherited in 2023". */
  readonly name: string
  /** A column's header: the same words, the first letter capital. */
  readonly label: string
}

/** What the composer and the heading need beside the rows, all captured from the run's own compile. */
export interface TableMeta {
  readonly sources: AccountSources
  /** Each inherited IRA the run carries a ledger for, named (empty where it carries none). */
  readonly inherited: readonly TableInherited[]
  readonly track: 'full' | 'floor'
  readonly route: 'spine' | 'dated' | 'no-date'
  /** The plan's build year: row one's calendar year (t = 0). */
  readonly startCalendarYear: number
  readonly people: readonly TablePerson[]
  /** The date route: the calendar year work stops in this table's run. */
  readonly stopYear?: number
  /** Beside `stopYear`: the answer's own stop (the band's, or the window top) or a what-if's stop-year lever
   *  (`buildTableBase`'s `stopFrom`), so the heading names a lever's year as the what-if's, never the answer's date. */
  readonly stopFrom?: 'answer' | 'lever'
  /** Each person's working-year investment income as THIS run carries it (the run's own params: the date route only,
   *  working members only, `buildDateInput`), else empty. The engine prices a person's figure only in a year they work,
   *  so KTD32's yield line covers every other year. Never the draft's raw field: a member switched to retired keeps a
   *  stale figure there that the run never prices (the U7 review's RUN-1). */
  readonly investmentByPerson: readonly number[]
  /** The W step's state-tax reading (`workingYearStateTaxReading`, the money picture's own): what the pay check's
   *  income tax holds, and whether the state's tax on pay sits in the household's figure for a working year. */
  readonly stateTaxReading: WorkingYearStateTaxReading
  /** Whether this run prices the household's state income tax (its own overlay's state, roster-filtered): where it
   *  doesn't, no income tax figure here holds a state tax, and the heading says so. */
  readonly statePriced: boolean
  /** Build 2's left-over shown state for the answer's draft (the one draft-level read): why a working year's left
   *  over the run credits nothing is not kept. */
  readonly leftOverState: LeftOverShownState
  /** The saved left over this run carries (its own params; absent where nothing is carried): the stored half of the
   *  credit's cap, so a row can name the cap that binds. */
  readonly leftOverSaved?: number
}

/** One view's request, or the rough market's refusal by name (a market whose correlation is not 0). */
export type ViewRequest = { readonly kind: 'run'; readonly request: EngineRunRequest } | { readonly kind: 'refused'; readonly reason: string }

export type TableRun =
  /** The table's two requests for this committed answer. `key` names the answer they belong to. */
  | {
      readonly kind: 'run'
      readonly key: string
      readonly meta: TableMeta
      readonly views: Readonly<Record<TableView, ViewRequest>>
    }
  /** The answer is not one the table can be built on: the reason the table says. */
  | { readonly kind: 'withheld'; readonly reason: 'no-run' | 'no-date-answer' | 'band-missing' | 'no-ledger' }
  /** No final answer yet (pending, provisional, or none): any rows shown stay, marked as updating. */
  | { readonly kind: 'waiting' }
  /** The answer is an error: the table shows its calm error. */
  | { readonly kind: 'answer-error' }

/** The seed a named-future run carries. Its draws are the named scores, so no random draw is read; the seed is
 *  only echoed back. */
export const TABLE_SEED = 1

/** The person's words, as copy.ts's slots take them. */
export function tablePerson(draft: ScenarioDraft, i: number, currentAge: number, lastAge: number): TablePerson {
  const entered = draft.people[i]?.name?.trim()
  if (entered !== undefined && entered !== '') {
    const possessive = `${entered}’s`
    return { label: entered, mid: entered, possessive, pronoun: possessive, you: false, currentAge, lastAge }
  }
  return i === 0
    ? { label: copy.personYou, mid: 'you', possessive: 'your', pronoun: 'yours', you: true, currentAge, lastAge }
    : { label: copy.personSpouse, mid: 'your spouse', possessive: 'your spouse’s', pronoun: 'your spouse’s', you: false, currentAge, lastAge }
}

/** An entered account named by its owner and its kind ("your Roth IRA", "Sam’s 401(k)"). An inherited IRA is named by
 *  the year its owner died as well ("Alex’s IRA inherited in 2023"), so two of one heir's read apart (the Act 5 plan's
 *  U13) and each says when its ten-year clock started. Every screen that names an entered account names it here. */
export function enteredAccountName(draft: ScenarioDraft, a: EnteredAccount): string {
  const possessive = tablePerson(draft, a.ownerIndex, 0, 0).possessive
  const deathYear = ACCOUNT_NAMING[a.kind] === 'death-year' ? a.inherited?.ownerDeathYear : undefined
  return deathYear !== undefined ? slots.inheritedIraOf(possessive, deathYear) : slots.workbenchAccountOf(possessive, kindLabel(a.kind))
}

/** How each kind's account is named: by its kind's words, or by the year its owner died. Exhaustive over the kinds
 *  (KTD20, insight 147), so a kind added later is named by a reviewed line, never by omission. */
const ACCOUNT_NAMING: Readonly<Record<AccountKind, 'kind' | 'death-year'>> = {
  '401k': 'kind',
  '403b': 'kind',
  'traditional-ira': 'kind',
  'roth-401k': 'kind',
  'roth-ira': 'kind',
  brokerage: 'kind',
  hsa: 'kind',
  'inherited-ira': 'death-year',
}

const capFirst = (s: string): string => (s === '' ? s : s[0]!.toUpperCase() + s.slice(1))

/** The committed answer's key: one per figured answer and tier. The what-if's runs (U14, `whatIfRun.ts`) key on the
 *  same string, so a plan cell and a what-if cell pair only on one answer. */
export function answerKey(answer: Extract<ModelAnswer, { kind: 'headline' | 'date' }>): string {
  return `${answer.kind}:${answer.tier}:${answer.inputKey}`
}

/** The last age each person is alive in a named future, by the engine's own lifespan rule (alive while
 *  t < `sampleDeathYearOffset`). */
function lastAges(future: NamedFuture, people: readonly LongevityPerson[]): number[] {
  return people.map((p, i) => p.currentAge + sampleDeathYearOffset(p, future.longevityU[i] ?? 0.5) - 1)
}

/** The table's runs for the store's current answer. */
export function tableRunFor(answer: ModelAnswer): TableRun {
  if (answer.kind === 'compute-error') return { kind: 'answer-error' }
  if (answer.kind === 'inputs-incomplete') return { kind: 'withheld', reason: 'no-run' }
  if (answer.kind !== 'headline' && answer.kind !== 'date') return { kind: 'waiting' }
  if (answer.tier !== 'final') return { kind: 'waiting' }
  const draft = answer.draft
  const base = buildTableBase(draft, answer.kind === 'date' ? answer.outcome : undefined)
  if (base.kind === 'withheld') return { kind: 'withheld', reason: base.reason }
  return { kind: 'run', key: answerKey(answer), ...tableRequestsOn(draft, base, workingYearLeftOverShownState(draft)) }
}

/**
 * THE CORE the plan's table and a what-if's rows share (U14): a table base → the meta and the two views' requests.
 * `draft` is the one the base was compiled from (the plan's answer draft, or a what-if's copy); `leftOverState` is the
 * left-over state whose credit the run carries (a what-if carries the PLAN's credit, so it passes the plan's state).
 */
export function tableRequestsOn(
  draft: ScenarioDraft,
  base: Extract<TableBase, { kind: 'run' }>,
  leftOverState: LeftOverShownState,
): { readonly meta: TableMeta; readonly views: Readonly<Record<TableView, ViewRequest>> } {
  const params = { ...base.params, paths: 1 }
  const steady = steadyFuture(params)
  const rough = roughFuture(params)
  const options = (namedFuture: NamedFuture) => ({
    namedFuture,
    ledgerRows: true,
    ...(base.track === 'floor' ? { ledgerTrack: 'floor' as const } : {}),
  })
  const ages = lastAges(steady, params.people)
  const accumulation = params.overlay?.accumulation
  const state = params.overlay?.retirementState
  const saved = accumulation?.workingYearLeftOverSavedReal
  return {
    meta: {
      sources: base.sources,
      inherited: base.sources.inherited.map((src) => {
        const name = enteredAccountName(draft, draft.enteredAccounts[src.index]!)
        return { name, label: capFirst(name) }
      }),
      track: base.track,
      route: base.route,
      startCalendarYear: draft.startCalendarYear,
      people: params.people.map((p, i) => tablePerson(draft, i, p.currentAge, ages[i] ?? p.currentAge)),
      ...(base.stopOffsetYears !== undefined ? { stopYear: draft.startCalendarYear + base.stopOffsetYears, stopFrom: base.stopFrom ?? 'answer' } : {}),
      investmentByPerson: accumulation?.workingYearInvestmentByPerson ?? [],
      stateTaxReading: workingYearStateTaxReading(draft),
      statePriced: state !== undefined && isPricedState(state),
      leftOverState,
      ...(saved !== undefined ? { leftOverSaved: saved } : {}),
    },
    views: {
      steady: { kind: 'run', request: { params, seed: TABLE_SEED, options: options(steady) } },
      rough: rough.ok
        ? { kind: 'run', request: { params, seed: TABLE_SEED, options: options(rough.future) } }
        : { kind: 'refused', reason: rough.reason },
    },
  }
}
