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
 * compiled the run (insight 081): the composer never reads the live draft.
 */
import { buildTableBase, type AccountSources } from '@intake/intakeMap'
import { steadyFuture } from '@engine/simulate'
import { roughFuture } from '@engine/reference/roughSequence'
import { sampleDeathYearOffset } from '@engine/longevity'
import type { EngineRunRequest } from '@store/runLanes'
import type { ModelAnswer } from '@store/memoryModel'
import type { NamedFuture } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { LongevityPerson } from '@engine/longevity'
import { copy } from '../copy'

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

/** What the composer and the heading need beside the rows, all captured from the run's own compile. */
export interface TableMeta {
  readonly sources: AccountSources
  readonly track: 'full' | 'floor'
  readonly route: 'spine' | 'dated' | 'no-date'
  /** The plan's build year: row one's calendar year (t = 0). */
  readonly startCalendarYear: number
  readonly people: readonly TablePerson[]
  /** The date route: the calendar year work stops in this table's run. */
  readonly stopYear?: number
  /** The household entered investment income for its working years, so the engine prices it there (KTD32's line
   *  then covers only the years after work stops). */
  readonly investmentEntered: boolean
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

/** The committed answer's key: one per figured answer and tier. */
function answerKey(answer: Extract<ModelAnswer, { kind: 'headline' | 'date' }>): string {
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
  const params = { ...base.params, paths: 1 }
  const steady = steadyFuture(params)
  const rough = roughFuture(params)
  const options = (namedFuture: NamedFuture) => ({
    namedFuture,
    ledgerRows: true,
    ...(base.track === 'floor' ? { ledgerTrack: 'floor' as const } : {}),
  })
  const ages = lastAges(steady, params.people)
  return {
    kind: 'run',
    key: answerKey(answer),
    meta: {
      sources: base.sources,
      track: base.track,
      route: base.route,
      startCalendarYear: draft.startCalendarYear,
      people: params.people.map((p, i) => tablePerson(draft, i, p.currentAge, ages[i] ?? p.currentAge)),
      ...(base.stopOffsetYears !== undefined ? { stopYear: draft.startCalendarYear + base.stopOffsetYears } : {}),
      investmentEntered: (draft.health?.workingYearInvestmentByPerson ?? []).some((x) => (x ?? 0) > 0),
    },
    views: {
      steady: { kind: 'run', request: { params, seed: TABLE_SEED, options: options(steady) } },
      rough: rough.ok
        ? { kind: 'run', request: { params, seed: TABLE_SEED, options: options(rough.future) } }
        : { kind: 'refused', reason: rough.reason },
    },
  }
}
