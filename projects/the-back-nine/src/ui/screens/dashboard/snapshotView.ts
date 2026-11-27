/**
 * src/ui/screens/dashboard/snapshotView.ts: Dashboard → Snapshot's one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC3; ref 2.1). `Snapshot.tsx` draws what this returns and decides nothing:
 * every honesty decision of the page lives here (insight 048: a rule inline in a render is untested).
 *
 * THE CARDS AND WHAT EACH ROUTE SHOWS (RC3, "Reads, and what each route shows"):
 * - the ring card: the elevated answer (`selectElevatedAnswer`) through `ringReading.ts`, the ring reading the ONE plan
 *   reading (`planReadingFor`); every answer state per plan 4.0; the page's one state clause; the R13 caveat;
 * - two stat rings from the plan's steady-future ledger rows (`tableRunFor`), each figure on exactly the population its
 *   label names (insight 141): retired, income tax summed over every row ("Lifetime"); working, over the rows after
 *   work stops (no `workingYear` and at or past the run's own stop offset), "after you stop working"; the withdrawal
 *   rate in the first of those rows (its draws, `draw` plus `hsaSpend`, over its start-of-year invested balance);
 *   every label says "in the steady future" (a one-path figure is never read as the odds); where those rows are the
 *   essentials-only pass (`TableMeta.track` 'floor': a floor-keyed band, the lifestyle track undated) a line under both
 *   dials says so, since the rate and the tax then read essentials spending, not the full budget;
 * - Invested accounts, never "net worth" (B9 holds no home, debts or bank accounts): the entered balances by kind, their
 *   total, "as entered" (with the aged-balances year where it applies) and the stopgap line;
 * - the fan: the shown answer's own band, already cut where the cohort thins (`answerView.ts`'s `spineBand` and
 *   `dateBand` call `truncateFanAtThinCohort`), with the named moments `deriveSpineBandAnnotations` and
 *   `deriveDateBandAnnotations` built for it (the date's carries the stop-year marker); under it the date route's track
 *   note (`bandTrackNote`: whose world the range prices) and, on an aged plan, the premise (`fanPremise`);
 * - Recommendations: a current saved record or this session's solve, in one sentence with its grade words. On an
 *   unsaved solve only "Keep this recommendation"; "Try it in the plan" only with a current saved record whose action
 *   builds a bundle (`recommendationBundle`); nothing labelled Apply. The working route shows its line and no link.
 *
 * READ-ONLY: a read-only view carries no write action (the Keep is the page's one write).
 */
import type { MemoryModelSnapshot, SolveAnswer } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import type { BandFan, LedgerYearRow, SavedRecommendationV3 } from '@shared/model'
import type { XAnnotation } from '@viz/bandData'
import type { FanLabels } from '@viz/charts/fanOptions'
import { isDateRoute, missingRequiredFacts, pricedStateForRun, spineMedicarePriced, accountSources, type SourceAccount } from '@intake/intakeMap'
import { blockedLeadFor, missingFactLines } from '@intake/missingFacts'
import { selectElevatedAnswer } from '../../answerView'
import { planClockAnchor, type BandPlanClockAnchor } from '../../bandAnnotations'
import { copy, slots } from '../../copy'
import { staticDisclosures } from '../../entryCopy'
import { bandTrackNote, fanPremise, type FanPremise } from '../../fanNotes'
import { formatEnteredDollar, formatMmDollar, mmAxisFormatterFor } from '../../money'
import { recommendationView } from '../../recommendationView'
import { savedRecordCardView, type RecommendationSaveView, type SavedRecordStanding } from '../../recommendationSaveView'
import { ringReading, type RingView } from '../../ringReading'
import { SAVED_RECORD_COPY } from '../../savedRecordCopy'
import { axisNumberAt, type TimeAxis } from '../../displaySettings'
import { composeVerdictStateNote } from '../../stateTaxDisclosure'
import { recommendationBundle } from '../../workbench/railChrome'
import type { TableMeta } from '../../workbench/tableRun'
import { planReadingFor } from '../../workbench/whatIfRun'

/** The plan's steady-future rows as the shell holds them for the shown answer. */
export type SteadyRows =
  | { readonly kind: 'rows'; readonly rows: readonly LedgerYearRow[]; readonly meta: TableMeta }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'withheld'; readonly words: string }
  | { readonly kind: 'error' }

export interface SnapshotRecommendationInput {
  readonly solve: SolveAnswer
  /** The strategy slot's save state (`deriveRecommendationSave`), or `none`. */
  readonly save: RecommendationSaveView
  /** The DISK's remembered recommendation and the store's verdict on it (IntakeApp's `recordCard`). */
  readonly record?: { readonly record: SavedRecommendationV3; readonly status: SavedRecommendationStatus }
  readonly todayEpochDay: number
}

export interface SnapshotInput {
  readonly snapshot: MemoryModelSnapshot
  readonly wallCalendarYear: number
  readonly readOnly: boolean
  readonly onRetry: () => void
  readonly steady: SteadyRows
  readonly agedBalancesYear?: number
  readonly recommendation: SnapshotRecommendationInput
  /** The Display drawer's time axis (`displaySettings.ts`): the fan's x axis on the first person's age or the year. */
  readonly timeAxis: TimeAxis
}

export interface StatFigure {
  /** The bold figure in the dial (absent: nothing to print, the note says why). */
  readonly value?: string
  /** The dial's short caption. */
  readonly short: string
  /** The full label under the dial: the population and "in the steady future". */
  readonly label: string
  readonly note?: string
}

export type StatsView =
  | {
      readonly kind: 'figures'
      readonly rate: StatFigure
      readonly tax: StatFigure
      /** The rows are the essentials-only pass: the line under both dials that says so. */
      readonly trackNote?: string
    }
  | { readonly kind: 'words'; readonly rate: StatFigure; readonly tax: StatFigure; readonly words: string }

export interface InvestedView {
  readonly title: string
  readonly rows: readonly { readonly label: string; readonly value: string }[]
  readonly total: { readonly label: string; readonly value: string }
  readonly asEntered: string
  readonly stopgap: string
}

export type FanCardView =
  | {
      readonly kind: 'chart'
      readonly fan: BandFan
      readonly moments: readonly XAnnotation[]
      readonly labels: FanLabels
      /** The date route: whose world the range prices (`bandTrackNote`). */
      readonly trackNote?: string
      /** An aged plan: the modelled years' premise, with its re-confirm door where the tab can write (`fanPremise`). */
      readonly premise?: FanPremise
    }
  | { readonly kind: 'words'; readonly words: string }

export type RecCardView =
  | { readonly kind: 'working-route'; readonly words: string }
  | { readonly kind: 'none'; readonly words: string; readonly findOne: string }
  | { readonly kind: 'pending'; readonly words: string }
  | { readonly kind: 'stale'; readonly heading: string; readonly body: string }
  | { readonly kind: 'unavailable'; readonly words: string }
  | { readonly kind: 'held'; readonly heading: string; readonly reasons: readonly string[] }
  | {
      readonly kind: 'recommended'
      readonly strategy: string
      readonly grade?: string
      readonly hero: string
      /** Present only on an unsaved solve the tab can keep; `noDollarRegister` rides the save ticket (the record keeps
       *  which register the card spoke, `RecommendationSurface.tsx`'s ticket). */
      readonly keep?: { readonly label: string; readonly noDollarRegister: boolean }
      readonly status?: string
      readonly refused?: { readonly heading: string; readonly body: string }
      readonly tryIt?: { readonly label: string }
    }
  | {
      readonly kind: 'record'
      readonly heading: string
      readonly standing: SavedRecordStanding
      /** The non-colour mark on a record that no longer holds (it stands on its own with no clauses). */
      readonly supersededMark?: string
      readonly savedIn?: string
      readonly tryIt?: { readonly label: string }
    }

export interface SnapshotView {
  readonly ring: {
    readonly title: string
    readonly view: RingView
    /** The fallback's words: the lead and the missing facts. */
    readonly missing?: { readonly lead: string; readonly lines: readonly string[] }
    /** The page's one state clause (`composeVerdictStateNote`), on a shown answer. */
    readonly stateClause: string | null
  }
  readonly stats: StatsView
  readonly invested: InvestedView
  /** `valuesLine`: what the y axis counts, printed over the chart (the chart draws no axis title). */
  readonly fan: { readonly title: string; readonly valuesLine: string; readonly view: FanCardView }
  readonly rec: { readonly title: string; readonly view: RecCardView }
  /** The R13 caveat's lines (the kit's `Caveat`). */
  readonly caveat: readonly string[]
}

const REFUSAL_WORDS = {
  'record-invalid': { heading: copy.recommendSaveRefusalRecordInvalidHeading, body: copy.recommendSaveRefusalRecordInvalidBody },
  write: { heading: copy.recommendSaveRefusalWriteHeading, body: copy.recommendSaveRefusalWriteBody },
  'recovery-locked': { heading: copy.recommendSaveRefusalRecoveryLockedHeading, body: copy.recommendSaveRefusalRecoveryLockedBody },
} as const

// ── The stat rings ──────────────────────────────────────────────────────────────────────────────────────────────

/** The rows after work stops, on the run's own grain: no pay-check lines, and at or past the run's stop offset (a
 *  working year the household priced no pay check for carries no `workingYear`, so the offset is the bound that holds
 *  on every run). On the spine every row is a retired row. */
export function retiredRows(rows: readonly LedgerYearRow[], meta: Pick<TableMeta, 'route' | 'stopYear' | 'startCalendarYear'>): readonly LedgerYearRow[] {
  const stopOffset = meta.route === 'spine' || meta.stopYear === undefined ? undefined : meta.stopYear - meta.startCalendarYear
  return rows.filter((r) => r.workingYear === undefined && (stopOffset === undefined || r.t >= stopOffset))
}

/** The two steady-future figures, each on the population its label names. */
export function steadyStats(rows: readonly LedgerYearRow[], meta: Pick<TableMeta, 'route' | 'stopYear' | 'startCalendarYear'>): {
  readonly taxPaid: number
  /** How many of the years it counts were paid (0: the money ran out first, so the dial prints no figure). */
  readonly taxPaidYears: number
  /** The first retired year's withdrawal rate, as a percent; null where that year opens with no invested money. */
  readonly ratePercent: number | null
  readonly working: boolean
  /** The year the steady run's money runs out, when it does: the tax total stops the year before. */
  readonly ranOutYear?: number
} {
  const working = meta.route !== 'spine'
  const after = retiredRows(rows, meta)
  // The money-ran-out row's tax is what the year ASKED for, never paid (`LedgerLoopRow`): it counts in no total, as on
  // Comparisons (`retiredPaidRows`; milestone 4's review, A3).
  const taxPaid = after.reduce((s, r) => (r.ranOut ? s : s + r.taxPaid), 0)
  const first = after[0]
  let ratePercent: number | null = null
  if (first !== undefined) {
    const draws = first.draw.taxable + first.draw.pretax + first.draw.roth + first.hsaSpend
    const start = first.start.taxable + first.start.pretax + first.start.roth + first.start.hsa
    ratePercent = start > 0 ? (draws / start) * 100 : null
  }
  // Where the run runs out, the total stops the year before: the label names that cut (insight 175; round 3 of
  // milestone 4's review).
  const ranOut = after.find((r) => r.ranOut)
  const ranOutYear = ranOut === undefined ? undefined : meta.startCalendarYear + ranOut.t
  return { taxPaid, taxPaidYears: after.filter((r) => !r.ranOut).length, ratePercent, working, ...(ranOutYear !== undefined ? { ranOutYear } : {}) }
}

function statsView(steady: SteadyRows, working: boolean): StatsView {
  const rateBase = { short: copy.snapshotStatRateShort, label: copy.snapshotStatRateLabel }
  const taxBase = { short: copy.snapshotStatTaxShort, label: working ? copy.snapshotStatTaxWorkingLabel : copy.snapshotStatTaxRetiredLabel }
  if (steady.kind === 'rows') {
    const s = steadyStats(steady.rows, steady.meta)
    // With no date in the window the rows stop work at the window's top year (`buildTableBase`), which the ring beside
    // names ("if you stop in 2036"): "after you stop working" alone would point at a date the answer doesn't have.
    const noDateYear = steady.meta.route === 'no-date' ? steady.meta.stopYear : undefined
    const taxLabel =
      s.ranOutYear !== undefined && s.taxPaidYears > 0
        ? slots.snapshotStatTaxThroughLabel(noDateYear ?? (s.working ? 'working' : 'retired'), s.ranOutYear)
        : noDateYear !== undefined ? slots.snapshotStatTaxNoDateLabel(noDateYear) : s.working ? copy.snapshotStatTaxWorkingLabel : copy.snapshotStatTaxRetiredLabel
    const rate = noDateYear !== undefined ? { ...rateBase, label: slots.snapshotStatRateNoDateLabel(noDateYear) } : rateBase
    return {
      kind: 'figures',
      rate: s.ratePercent === null ? { ...rate, note: copy.snapshotStatNoRate } : { ...rate, value: slots.snapshotRate(s.ratePercent) },
      tax:
        s.taxPaidYears === 0
          ? { short: copy.snapshotStatTaxShort, label: taxLabel, note: s.working ? copy.snapshotStatNoTaxWorking : copy.snapshotStatNoTaxRetired }
          : { short: copy.snapshotStatTaxShort, label: taxLabel, value: slots.snapshotApprox(formatMmDollar(s.taxPaid)) },
      ...(steady.meta.track === 'floor' ? { trackNote: copy.snapshotStatFloorTrack } : {}),
    }
  }
  const words = steady.kind === 'withheld' ? steady.words : steady.kind === 'error' ? copy.snapshotStatError : copy.snapshotStatWaiting
  return { kind: 'words', rate: rateBase, tax: taxBase, words }
}

// ── Invested accounts ───────────────────────────────────────────────────────────────────────────────────────────

const dollars = (v: number): string => `$${formatEnteredDollar(v)}`

/** Each account rounded to the dollar FIRST, then summed (Tax Allocation's rule, `investmentView.ts`
 *  `taxAllocationView`): the printed rows add to the printed total, and the total matches Tax Allocation's, cents or not. */
const roundedBalance = (accounts: readonly SourceAccount[]): number =>
  accounts.reduce((s, a) => s + (Number.isFinite(a.valueToday) ? Math.round(a.valueToday) : 0), 0)

export type InvestedKindId = 'taxable' | 'pretax' | 'roth' | 'hsa'

/** The entered balances by kind (taxable, pre-tax, Roth, HSA, in that order) and their total: the ONE split Snapshot's
 *  Invested accounts card and Dashboard → Balance Sheet (RC16) both print, so the two can never disagree. */
export function investedKinds(draft: MemoryModelSnapshot['draft']): {
  readonly kinds: readonly { readonly id: InvestedKindId; readonly label: string; readonly value: number }[]
  readonly total: number
} {
  const src = accountSources(draft)
  const kinds = [
    { id: 'taxable' as const, label: copy.snapshotInvestedTaxable, value: roundedBalance(src.taxable) },
    { id: 'pretax' as const, label: copy.snapshotInvestedPretax, value: roundedBalance(src.pretax) },
    { id: 'roth' as const, label: copy.snapshotInvestedRoth, value: roundedBalance(src.roth) },
    { id: 'hsa' as const, label: copy.snapshotInvestedHsa, value: roundedBalance(src.hsa) },
  ]
  return { kinds, total: kinds.reduce((s, k) => s + k.value, 0) }
}

function investedView(draft: MemoryModelSnapshot['draft'], agedBalancesYear: number | undefined): InvestedView {
  const { kinds, total } = investedKinds(draft)
  return {
    title: copy.snapshotInvestedTitle,
    rows: kinds.map((k) => ({ label: k.label, value: dollars(k.value) })),
    total: { label: copy.snapshotInvestedTotal, value: dollars(total) },
    asEntered: agedBalancesYear === undefined ? copy.snapshotInvestedAsEntered : slots.snapshotInvestedAsEnteredIn(agedBalancesYear),
    stopgap: copy.snapshotInvestedStopgap,
  }
}

/** Highcharts' own spoken words for a chart named `title` (`src/viz/charts/chartA11y.ts`): every chart's screen-reader
 *  region speaks the composer's words, never the module's built-in English. */
export function chartWords(title: string): { readonly title: string; readonly credits: string; readonly end: string; readonly legend: string; readonly legendItem: string } {
  return { title, credits: copy.chartCredits, end: copy.chartEnd, legend: copy.chartLegend, legendItem: copy.chartLegendItem }
}

// ── The fan ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One labels object per answered draft, ages and time axis (Snapshot's card and Confidence share it: one fan, one set of
 *  words), so a recompute that changes nothing about the fan hands the chart
 *  the same words (`FanChart.tsx` redraws only when the picture or its words change). */
const labelCache = new WeakMap<object, Map<string, FanLabels>>()

export function fanLabels(draft: MemoryModelSnapshot['draft'], ageA: number, ageB: number, timeAxis: TimeAxis): FanLabels {
  const key = `${ageA}/${ageB}/${timeAxis}`
  const byAges = labelCache.get(draft) ?? new Map<string, FanLabels>()
  labelCache.set(draft, byAges)
  const hit = byAges.get(key)
  if (hit !== undefined) return hit
  const made = composeFanLabels(draft, ageA, ageB, timeAxis)
  byAges.set(key, made)
  return made
}

function composeFanLabels(draft: MemoryModelSnapshot['draft'], ageA: number, ageB: number, timeAxis: TimeAxis): FanLabels {
  const name = (draft.people[0]?.name ?? '').trim()
  // The fan's year 0 is the plan's build year (`startCalendarYear`), at the first person's current age.
  const clock = { startYear: draft.startCalendarYear, startAge: ageA }
  return {
    outer: copy.snapshotFanOuter,
    inner: copy.snapshotFanInner,
    median: copy.snapshotFanMedian,
    outerWords: copy.snapshotFanOuterWords,
    innerWords: copy.snapshotFanInnerWords,
    yAxisTitle: copy.bandYAxis,
    xAxisTitle: timeAxis === 'years' ? copy.chartAxisYear : name === '' ? copy.snapshotFanAgeAxisYou : slots.snapshotFanAgeAxis(name),
    description: copy.snapshotFanDescription,
    words: chartWords(copy.snapshotFanTitle),
    axisDollar: mmAxisFormatterFor,
    figure: formatMmDollar,
    tickAt: (t) => Math.round(axisNumberAt(timeAxis, clock, t)),
    agesAt: (t) => slots.bandClockAgesDesc(Math.round(ageA + t), Math.round(ageB + t)),
    tipRange: slots.snapshotFanTipRange,
    tipInner: slots.snapshotFanTipInner,
    tipMedian: slots.snapshotFanTipMedian,
    point: slots.snapshotFanPoint,
  }
}

function fanView(
  snapshot: MemoryModelSnapshot,
  elevated: ReturnType<typeof selectElevatedAnswer>,
  anchor: BandPlanClockAnchor,
  agedBalancesYear: number | undefined,
  readOnly: boolean,
  timeAxis: TimeAxis,
): FanCardView {
  const answer = snapshot.answer
  if (answer.kind !== 'headline' && answer.kind !== 'date') return { kind: 'words', words: copy.snapshotFanWaiting }
  const draft = answer.draft
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const chart = (fan: BandFan | undefined, moments: readonly XAnnotation[] | undefined, none: string, trackNote: string | null): FanCardView => {
    if (fan === undefined || moments === undefined || ageA === undefined || ageB === undefined) return { kind: 'words', words: none }
    const premise = fanPremise(moments, agedBalancesYear, anchor.startCalendarYear, readOnly)
    return {
      kind: 'chart',
      fan,
      moments,
      labels: fanLabels(draft, ageA, ageB, timeAxis),
      ...(trackNote !== null ? { trackNote } : {}),
      ...(premise !== null ? { premise } : {}),
    }
  }
  if (elevated.kind === 'spine' && elevated.view.kind === 'reading') return chart(elevated.view.band, elevated.view.bandAnnotations, copy.snapshotFanNone, null)
  if (elevated.kind === 'date' && elevated.view.kind === 'dates') {
    const v = elevated.view
    const noDate = v.floor.kind === 'no-date-in-window' && v.lifestyle.kind === 'no-date-in-window'
    return chart(v.band?.fan, v.bandAnnotations, noDate ? copy.snapshotFanNoDate : copy.snapshotFanNone, bandTrackNote(v))
  }
  return { kind: 'words', words: copy.snapshotFanWaiting }
}

// ── Recommendations ─────────────────────────────────────────────────────────────────────────────────────────────

function recView(snapshot: MemoryModelSnapshot, rec: SnapshotRecommendationInput, readOnly: boolean, wallCalendarYear: number): RecCardView {
  if (isDateRoute(snapshot.draft)) return { kind: 'working-route', words: copy.taxStratWorkingRoute }
  const record = rec.record
  const tryIt = record !== undefined && record.status.current && recommendationBundle(record.record) !== null ? { label: copy.snapshotRecTry } : undefined
  const solve = rec.solve
  if (solve.kind === 'committed' || solve.kind === 'stale' || solve.kind === 'compute-error' || solve.kind === 'pending') {
    const view = recommendationView(solve, {
      pricedState: pricedStateForRun(snapshot.draft),
      healthcarePriced: spineMedicarePriced(snapshot.draft),
      planClock: planClockAnchor(snapshot.draft.startCalendarYear, wallCalendarYear),
    })
    switch (view.kind) {
      case 'pending':
        return { kind: 'pending', words: copy.recommendPendingLabel }
      case 'stale':
        return { kind: 'stale', heading: view.heading, body: view.body }
      case 'unavailable':
        return { kind: 'unavailable', words: view.note }
      case 'held':
        return { kind: 'held', heading: view.heading, reasons: view.reasons }
      case 'recommended': {
        const save = rec.save
        const keep = !readOnly && save.kind === 'offer' ? { label: copy.snapshotRecKeep, noDollarRegister: view.mode === 'no-change' } : undefined
        const status =
          save.kind === 'saved' ? copy.recommendSaveSavedBadge : save.kind === 'saving' ? copy.recommendSavePending : undefined
        const refused = save.kind === 'refused' ? REFUSAL_WORDS[save.reason] : undefined
        return {
          kind: 'recommended',
          strategy: copy[view.winnerStrategyKey],
          ...(view.grade.word !== undefined ? { grade: view.grade.word } : {}),
          hero: view.grade.heroLine,
          ...(keep !== undefined ? { keep } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(refused !== undefined ? { refused } : {}),
          // Try it only once the disk carries THIS recommendation as current (the rail runs a saved record only).
          ...(save.kind === 'saved' && tryIt !== undefined ? { tryIt } : {}),
        }
      }
      default:
        break
    }
  }
  if (record !== undefined) {
    const card = savedRecordCardView(record.status, record.record, rec.todayEpochDay, SAVED_RECORD_COPY)
    return {
      kind: 'record',
      heading: card.heading,
      standing: card.standing,
      ...(card.standing.kind === 'superseded' ? { supersededMark: copy.snapshotRecSuperseded } : {}),
      ...(card.savedIn !== undefined ? { savedIn: card.savedIn } : {}),
      ...(tryIt !== undefined ? { tryIt } : {}),
    }
  }
  return { kind: 'none', words: copy.snapshotRecNone, findOne: copy.snapshotRecFindOne }
}

// ── The page ────────────────────────────────────────────────────────────────────────────────────────────────────

export function snapshotView(input: SnapshotInput): SnapshotView {
  const { snapshot, wallCalendarYear, readOnly, onRetry, steady, agedBalancesYear, recommendation, timeAxis } = input
  const anchor = planClockAnchor(snapshot.draft.startCalendarYear, wallCalendarYear)
  const elevated = selectElevatedAnswer(snapshot, onRetry, anchor)
  const view = ringReading(elevated, planReadingFor(snapshot.answer), snapshot, anchor)
  const answer = snapshot.answer
  const shown = answer.kind === 'headline' || answer.kind === 'date' ? answer : undefined
  const stateClause = shown === undefined ? null : composeVerdictStateNote(pricedStateForRun(shown.draft), false)
  let missing: SnapshotView['ring']['missing']
  if (view.kind === 'fallback') {
    const facts = missingRequiredFacts(snapshot.draft)
    const lines = missingFactLines(facts)
    missing = {
      lead: blockedLeadFor(facts),
      lines: [lines.stillNeeded, lines.cannotPrice].filter((l): l is string => l !== null),
    }
  }
  return {
    ring: { title: copy.snapshotRingTitle, view, ...(missing !== undefined ? { missing } : {}), stateClause },
    stats: statsView(steady, isDateRoute(shown?.draft ?? snapshot.draft)),
    invested: investedView(snapshot.draft, agedBalancesYear),
    fan: { title: copy.snapshotFanTitle, valuesLine: copy.bandYAxis, view: fanView(snapshot, elevated, anchor, agedBalancesYear, readOnly, timeAxis) },
    rec: { title: copy.snapshotRecTitle, view: recView(snapshot, recommendation, readOnly, wallCalendarYear) },
    caveat: [staticDisclosures.honestLimitsScope, staticDisclosures.honestLimitsValidate],
  }
}
