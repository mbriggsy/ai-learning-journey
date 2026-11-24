/**
 * src/ui/screens/retirement/probabilityView.ts: Retirement → Analysis → Probability's one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4; ref 2.7, 2.8). `Probability.tsx` draws what this returns and decides
 * nothing: every honesty decision of the page lives here (insight 048: a rule inline in a render is untested).
 *
 * THE PAGE. Two equal halves inside one panel: on the RIGHT the compared plan ("Your plan", its reading the ONE plan
 * reading, `planReadingFor`, plan 4.0); on the LEFT the alternative, its picker offering the new what-if (the one
 * what-if the shell keeps, `useWhatIf`; with no lever pulled it reads "No changes yet" beside the plan's own reading,
 * since the empty bundle IS the plan, U14) and the saved recommendation's own action (`recommendationBundle`), offered
 * ONLY while the store reads the record as current and never on the working route (the solve does not run there, so no
 * record exists to run; the rule is stated here, `recommendedOffer`, never left to a runtime null).
 *
 * RAW, EVERYWHERE A COUNT IS PRINTED (RC4's ruling, 2026-11-24): the rings, the intro sentence (`composeVerdictReading`
 * fed `rawDisplayed`, the triple the sticky seam would adopt with no history) and the difference line read the engine's
 * own quantized headline; nothing here reads `snapshot.displayed`. The difference line keys on the two PRINTED counts
 * (insight 099).
 *
 * THE TWO ROUTES (plan 4.0, "The two routes"; RC4's bullets):
 * - retired (`answer.kind === 'headline'`): the intro is the confidence statement; each half shows its ring, the survivor
 *   row (with its spending basis) and the essentials row, each only where present, and the balance bar: the median of
 *   the run's `terminalValuesReal`, labelled for what it is (each future's balance when the second of you dies, capped
 *   at the plan's last year), never "ending assets"; the two bars share one scale. The key-metric column carries the
 *   statement's spend clause, the difference line and the state clause.
 * - working (`answer.kind === 'date'`): the intro is the two-dates sentence (the graded date first, under the provisional
 *   tag while provisional); each ring reads the odds at the stop year its half runs at and names it ("if you stop in
 *   2031"); no balance bar and no survivor row on either half (the survivor stopgap line stands in their place, until
 *   section 6's "the working household's readings at its date" lands); the key-metric column carries the date's odds
 *   and the difference line. The chart menu adds "Odds by stop year" (`oddsChart`).
 *
 * STATES: pending (the computing frame, never a number), compute-error (the retry), the fallback (the missing facts named,
 * the page waits), re-figuring (the old answer stays, the line above it), provisional (the tag), the what-if's `waiting`
 * (until the final tier lands), its refusal or withheld words, its error, and a what-if in flight (the half fades under
 * "Loading…" with its numbers kept, where it has numbers to keep).
 *
 * READ-ONLY: the page carries no write action in RC4a (Apply and Keep arrive with the tray, RC4b and RC5), so a read-only
 * view and a writable one compose alike; `readOnly` is taken so the tray's commit has its seam.
 */
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { rawDisplayed } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import type { DateTrackOutcome, Headline, SavedRecommendationV3, WhatIfLeverV6 } from '@shared/model'
import { isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { blockedLeadFor, missingFactLines } from '@intake/missingFacts'
import { BAR_RUNG, agedLadderMarks, curveMarks, offsetHasPassed, type CurveMark } from '@viz/curveMarks'
import { niceLattice, type DollarLattice } from '@viz/bandData'
import type { OddsSeries } from '@viz/charts/oddsByStopYearOptions'
import type { AnswerNotes } from '../../answerNotes'
import { selectElevatedAnswer } from '../../answerView'
import { copy, slots } from '../../copy'
import { dateOddsText } from '../../dateOdds'
import { floorLineText, heroLead } from '../../dateHero'
import { composeDateSplit } from '../../dateSplit'
import { dateTradeoffPoint } from '../../dateTradeoff'
import { staticDisclosures } from '../../entryCopy'
import { formatMmDollar, mmAxisFormatterFor } from '../../money'
import { OUTCOME_PRESENTATION } from '../../outcomeStates'
import { ringFace, type RingFace } from '../../ringReading'
import { spendingBasisLine } from '../../survivorLines'
import { floorRelief } from '../../twoTier'
import { composeVerdictReading, reserveClauseFor, spendClauseFor, verdictReadingText } from '../../verdictSentence'
import { readingCount, readingText, recommendationBundle, refusalWords } from '../../workbench/railChrome'
import type { TableRun } from '../../workbench/tableRun'
import { headlineExtras, planReadingFor, type HeadlineExtras, type WhatIfReading, type WhatIfSlotView } from '../../workbench/whatIfRun'
import { chartWords } from '../dashboard/snapshotView'

// ── Inputs ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the left picker shows: the new what-if (the tray's working bundle) or the saved recommendation. */
export type LeftPick = 'new' | 'recommended'

/** Which chart the panel draws (the title's menu; "Odds by stop year" on the working route only). */
export type ProbabilityChart = 'rings' | 'odds'

export interface ProbabilityWhatIf {
  /** The left side's pick (the shell's one what-if's mode). */
  readonly pick: LeftPick
  /** The bundle the slot runs for that pick (the recommendation's own on `recommended`, the household's otherwise). */
  readonly bundle: readonly WhatIfLeverV6[]
  /** The slot's view for that bundle (`useWhatIf`'s `view`; null while no run is asked or its first state is pending). */
  readonly view: WhatIfSlotView | null
}

export interface ProbabilityInput {
  readonly snapshot: MemoryModelSnapshot
  readonly wallCalendarYear: number
  readonly readOnly: boolean
  readonly onRetry: () => void
  /** Every note the answer carries (`composeAnswerNotes`): the state, Medicare and extras lines read from it. */
  readonly notes: AnswerNotes
  readonly whatIf: ProbabilityWhatIf
  /** The DISK's remembered recommendation and the store's verdict on it (IntakeApp's `recordCard`). */
  readonly record?: { readonly record: SavedRecommendationV3; readonly status: SavedRecommendationStatus }
  readonly chart: ProbabilityChart
}

// ── The view ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ReadingRow {
  readonly text: string
  /** The row's second line (the survivor's spending basis and income step-down; the essentials' trim note). */
  readonly notes: readonly string[]
}

export type RingSlot =
  | { readonly kind: 'face'; readonly face: RingFace }
  /** No figure to draw: the ring empty, the words in its caption. */
  | { readonly kind: 'empty'; readonly caption: string }

export interface HalfView {
  readonly side: 'alternative' | 'compared'
  /** The half's name ("Your plan", "New what-if", "Recommended"). */
  readonly title: string
  readonly ring: RingSlot
  /** A run in flight over numbers that stay put: the half fades under "Loading…". */
  readonly loading: boolean
  /** One line under the ring: "No changes yet", the what-if's waiting, refusal or error words. */
  readonly status?: string
  readonly rows: readonly ReadingRow[]
  /** The working route's survivor stopgap, in place of the survivor row. */
  readonly stopgap?: string
  /** The median balance at the second death, in today's dollars (the retired route; absent while unread). */
  readonly barMedian?: number
}

export interface BarsView {
  readonly label: string
  readonly note: string
  /** The line under the halves that names what the bars hold: the label, then its note. */
  readonly caption: string
  readonly description: string
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  /** Each half's printed figure (`~`), keyed by side; absent where the half has no bar to draw. */
  readonly figures: { readonly alternative?: string; readonly compared?: string }
}

export interface IntroView {
  /** The re-figuring line, else the provisional tag: one slot, one line. */
  readonly eyebrow?: string
  /** The answer's lead: the confidence statement's word and count (retired), the hero date sentence (working). */
  readonly lead: string
  /** The rest of the answer's words: the essentials date line (working), its notes. */
  readonly lines: readonly string[]
}

export interface MetricsView {
  /** The lines the key-metric column carries, in order. */
  readonly lines: readonly string[]
  /** The spend clause's widest form while its figure is pending (held hidden, so the landing moves nothing). */
  readonly clauseReserve?: string
  /** Where the spend clause's figure stands (the first line's hook for the "lands without moving anything" arm). */
  readonly spend?: 'pending' | 'sized' | 'unsized'
  /** The difference line (or "No changes yet"), in its own slot so a reading landing moves nothing below it. */
  readonly difference: string | null
}

export interface PickerView {
  readonly label: string
  readonly items: readonly { readonly value: LeftPick; readonly label: string }[]
  readonly value: LeftPick
}

export interface OddsChartView {
  readonly series: readonly OddsSeries[]
  readonly barRung: number
  /** The provisional tag over a provisional curve (or the re-figuring line), shown with the chart's title. */
  readonly tag?: string
  /** The lines under the chart: the no-date explanation, the window-edge tell, the dip note, the plan caveat, the aged
   *  balances clause. */
  readonly notes: readonly string[]
  readonly labels: {
    readonly barLabel: string
    readonly xAxisTitle: string
    readonly yTick: (rung: number) => string
    readonly xTick: (year: number) => string
    readonly description: string
    readonly words: ReturnType<typeof chartWords>
  }
}

export type ProbabilityView =
  | {
      readonly kind: 'reading'
      readonly route: 'headline' | 'date'
      readonly intro: IntroView
      readonly picker: PickerView
      readonly planTitle: string
      readonly vs: string
      /** Words in place of the Recommended pick (a stale record, one saved before version 6, the working route), with
       *  the door their words name. */
      readonly recordNote?: { readonly words: string; readonly door: 'tax-strategies' }
      readonly halves: { readonly alternative: HalfView; readonly compared: HalfView }
      /** The rows' second lines when both halves would print the same ones (no lever changes them): said once, under
       *  both halves, at the full width of the two (measured: printed in each half, a split household's two rows ran the
       *  R13 caveat 36 px past his 731 px window). Absent when the halves' lines differ: each half keeps its own. */
      readonly sharedNotes?: readonly string[]
      readonly bars?: BarsView
      /** The retired route with every median at $0 (half or more of the futures use their savings up first): the words
       *  in the bars' place, never a silently missing picture. */
      readonly barsNone?: string
      readonly metrics: MetricsView
      readonly footnotes: readonly string[]
      readonly charts: readonly { readonly id: ProbabilityChart; readonly label: string }[]
      readonly chart: ProbabilityChart
      readonly odds?: OddsChartView
      readonly caveat: readonly string[]
    }
  | { readonly kind: 'pending'; readonly words: string; readonly caveat: readonly string[] }
  | { readonly kind: 'compute-error'; readonly words: string; readonly retry: string; readonly onRetry: () => void; readonly caveat: readonly string[] }
  | { readonly kind: 'fallback'; readonly lead: string; readonly lines: readonly string[]; readonly caveat: readonly string[] }

const CAVEAT = [staticDisclosures.honestLimitsScope, staticDisclosures.honestLimitsValidate] as const

const WITHHELD_WORDS: Readonly<Record<Extract<TableRun, { kind: 'withheld' }>['reason'], string>> = {
  'no-run': copy.workbenchWithheldNoRun,
  'no-date-answer': copy.workbenchWithheldNoDate,
  'band-missing': copy.workbenchWithheldBand,
  'no-ledger': copy.workbenchWithheldNoLedger,
}

// ── The Recommended pick ────────────────────────────────────────────────────────────────────────────────────────

export type RecommendedOffer =
  | { readonly kind: 'runnable'; readonly bundle: readonly WhatIfLeverV6[] }
  /** A record exists and cannot run: words, no pick. */
  | { readonly kind: 'words'; readonly words: string }
  | { readonly kind: 'none' }

/**
 * THE CURRENT-RECORD RULE, stated once: the Recommended pick runs the saved record's own action (its order and its
 * conversion plan) only while the store reads the record as current; a stale record or one saved before version 6 shows
 * words and runs nothing; the working route never offers it (the solve does not run there, so no record can be born
 * on it, and the store's `recordCard` is withheld there too).
 */
export function recommendedOffer(
  draft: MemoryModelSnapshot['draft'],
  record: ProbabilityInput['record'],
): RecommendedOffer {
  if (isDateRoute(draft) || record === undefined) return { kind: 'none' }
  const bundle = recommendationBundle(record.record)
  if (bundle === null) return { kind: 'words', words: copy.workbenchRailRecOld }
  if (!record.status.current) return { kind: 'words', words: copy.workbenchRailRecStale }
  return { kind: 'runnable', bundle }
}

/** The left picker's pick on landing: Recommended where a current saved recommendation can run, else the new what-if. */
export function landingPick(draft: MemoryModelSnapshot['draft'], record: ProbabilityInput['record']): LeftPick {
  return recommendedOffer(draft, record).kind === 'runnable' ? 'recommended' : 'new'
}

/** The halves, with their rows' second lines said once when both halves carry the same rows with the same lines. */
export function shareRowNotes(alternative: HalfView, compared: HalfView): { halves: { alternative: HalfView; compared: HalfView }; sharedNotes?: readonly string[] } {
  const same =
    alternative.rows.length > 0 &&
    alternative.rows.length === compared.rows.length &&
    alternative.rows.every((r, i) => JSON.stringify(r.notes) === JSON.stringify(compared.rows[i]!.notes))
  const notes = alternative.rows.flatMap((r) => r.notes)
  if (!same || notes.length === 0) return { halves: { alternative, compared } }
  const bare = (h: HalfView): HalfView => ({ ...h, rows: h.rows.map((r) => ({ ...r, notes: [] })) })
  return { halves: { alternative: bare(alternative), compared: bare(compared) }, sharedNotes: notes }
}

// ── The halves ──────────────────────────────────────────────────────────────────────────────────────────────────

/** A spine reading's rows: the survivor row with its basis, and the essentials row where the relief gate earns it. */
function headlineRows(headline: Headline, extras: HeadlineExtras, planClockYears: number): ReadingRow[] {
  const rows: ReadingRow[] = []
  const s = extras.survivorReading
  if (s !== undefined && OUTCOME_PRESENTATION[s.outcomeState].verdictWordKey !== null) {
    const basis = spendingBasisLine(s.spendingBasis)
    rows.push({
      text: slots.probabilitySurvivorRow(verdictReadingText(s.outcomeState, s.xOfTen.value)),
      notes: basis === null ? [] : [basis],
    })
  }
  const relief = floorRelief(headline, extras.floorReading, planClockYears)
  if (relief !== null) {
    rows.push({
      text: slots.probabilityEssentialsRow(verdictReadingText(relief.reading.outcomeState, relief.reading.xOfTen.value)),
      notes: relief.showTrimNote ? [copy.floorReadoutTrimNote] : [],
    })
  }
  return rows
}

/** The ring for a reading, on its route. */
function ringOf(reading: WhatIfReading | null, startCalendarYear: number): RingSlot {
  if (reading === null) return { kind: 'empty', caption: copy.snapshotRingNoReading }
  return { kind: 'face', face: ringFace(reading, startCalendarYear) }
}

type AltState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'error' }
  | { readonly kind: 'words'; readonly words: string }
  | { readonly kind: 'ready'; readonly reading: WhatIfReading; readonly extras?: HeadlineExtras; readonly updating: boolean }

/** The alternative's state from the slot (the What if page's own reading of it, `WhatIfPage.tsx`'s `readingState`). */
function altState(input: ProbabilityInput): AltState {
  const { whatIf, snapshot } = input
  if (whatIf.bundle.length === 0) return { kind: 'empty' }
  const a = snapshot.answer
  const v = whatIf.view
  if (v === null) return a.kind === 'date' && a.tier !== 'final' ? { kind: 'waiting' } : { kind: 'pending' }
  if (v.kind === 'refused') return { kind: 'words', words: refusalWords(v.refusal, snapshot.draft.startCalendarYear) }
  if (v.kind === 'withheld') return { kind: 'words', words: WITHHELD_WORDS[v.reason] }
  if (v.kind === 'answer-error') return { kind: 'error' }
  const m = v.many
  if (m.kind === 'loading') return (a.kind === 'date' || a.kind === 'headline') && a.tier !== 'final' ? { kind: 'waiting' } : { kind: 'pending' }
  if (m.kind === 'error') return { kind: 'error' }
  return { kind: 'ready', reading: m.value.whatIf, ...(m.value.extras !== undefined ? { extras: m.value.extras } : {}), updating: m.updating }
}

// ── The page ────────────────────────────────────────────────────────────────────────────────────────────────────

export function probabilityView(input: ProbabilityInput): ProbabilityView {
  const { snapshot, notes, whatIf, record } = input
  const elevated = selectElevatedAnswer(snapshot, input.onRetry, notes.planClock)
  if (elevated.kind === 'fallback') {
    const facts = missingRequiredFacts(snapshot.draft)
    const lines = missingFactLines(facts)
    return {
      kind: 'fallback',
      lead: blockedLeadFor(facts),
      lines: [lines.stillNeeded, lines.cannotPrice].filter((l): l is string => l !== null),
      caveat: CAVEAT,
    }
  }
  if (elevated.view.kind === 'pending') return { kind: 'pending', words: copy.answerPending, caveat: CAVEAT }
  if (elevated.view.kind === 'compute-error') {
    return { kind: 'compute-error', words: copy.answerError, retry: copy.answerRetry, onRetry: elevated.view.onRetry, caveat: CAVEAT }
  }
  const answer = snapshot.answer
  if (answer.kind !== 'headline' && answer.kind !== 'date') {
    return { kind: 'pending', words: copy.answerPending, caveat: CAVEAT }
  }
  const startCalendarYear = answer.draft.startCalendarYear
  const planClockYears = notes.planClock.yearsSincePlanBuilt
  const plan = planReadingFor(answer)
  const offer = recommendedOffer(snapshot.draft, record)
  const pick: LeftPick = whatIf.pick === 'recommended' && offer.kind === 'runnable' ? 'recommended' : 'new'
  const altName = pick === 'recommended' ? copy.probabilityPickRecommended : copy.probabilityPickNew
  const alt = altState(input)

  // ── The right half: the plan's own reading ──
  const planExtras = answer.kind === 'headline' ? headlineExtras(answer.result) : undefined
  const compared: HalfView = {
    side: 'compared',
    title: copy.probabilityPlanTitle,
    ring: ringOf(plan, startCalendarYear),
    loading: false,
    rows: answer.kind === 'headline' && plan?.kind === 'headline' && planExtras !== undefined ? headlineRows(plan.headline, planExtras, planClockYears) : [],
    ...(answer.kind === 'date' ? { stopgap: copy.probabilitySurvivorStopgap } : {}),
    ...(planExtras?.terminalMedianReal !== undefined ? { barMedian: planExtras.terminalMedianReal } : {}),
  }

  // ── The left half: the alternative ──
  const alternative = ((): HalfView => {
    const base = { side: 'alternative' as const, title: altName, ...(answer.kind === 'date' ? { stopgap: copy.probabilitySurvivorStopgap } : {}) }
    switch (alt.kind) {
      case 'empty':
        // The empty bundle IS the plan (U14): the plan's own reading, said to be unchanged.
        // Its words, "No changes yet", are the key-metric column's difference line beside the two halves (one line, said once).
        return { ...base, ring: compared.ring, loading: false, rows: compared.rows, ...(compared.barMedian !== undefined ? { barMedian: compared.barMedian } : {}) }
      case 'waiting':
        return { ...base, ring: { kind: 'empty', caption: copy.probabilityLoading }, loading: false, status: copy.probabilityWaitingFinal, rows: [] }
      case 'pending':
        return { ...base, ring: { kind: 'empty', caption: copy.probabilityLoading }, loading: false, status: copy.workbenchRailWorking, rows: [] }
      case 'error':
        return { ...base, ring: { kind: 'empty', caption: copy.snapshotRingNoReading }, loading: false, status: copy.workbenchRailError, rows: [] }
      case 'words':
        return { ...base, ring: { kind: 'empty', caption: copy.snapshotRingNoReading }, loading: false, status: alt.words, rows: [] }
      case 'ready': {
        const rows = alt.reading.kind === 'headline' && alt.extras !== undefined ? headlineRows(alt.reading.headline, alt.extras, planClockYears) : []
        return {
          ...base,
          ring: ringOf(alt.reading, startCalendarYear),
          loading: alt.updating,
          rows,
          ...(alt.updating ? { status: copy.workbenchRailUpdating } : {}),
          ...(alt.extras?.terminalMedianReal !== undefined ? { barMedian: alt.extras.terminalMedianReal } : {}),
        }
      }
    }
  })()

  // ── The difference line: the two PRINTED counts, and nothing else (insight 099) ──
  const difference = ((): string | null => {
    if (alt.kind === 'empty') return copy.probabilityNoChanges
    if (alt.kind !== 'ready' || alt.updating || plan === null) return null
    const planText = readingText(plan)
    const altText = readingText(alt.reading)
    if (planText === null || altText === null) return null
    const a = readingCount(plan)
    const b = readingCount(alt.reading)
    if (a !== null && b !== null && a.n === b.n && a.ceiling === b.ceiling) return slots.workbenchRailEven(planText)
    return slots.probabilityDifference(planText, altText, altName.toLowerCase())
  })()

  // ── The bars: the retired route only, one shared scale ──
  const bars = ((): BarsView | undefined => {
    if (answer.kind !== 'headline') return undefined
    const medians = [alternative.barMedian, compared.barMedian].filter((m): m is number => m !== undefined && Number.isFinite(m))
    const max = Math.max(0, ...medians)
    if (!(max > 0)) return undefined // the words stand in its place (`barsNone`)
    const lattice = niceLattice(max)
    const figure = (m: number | undefined) => (m === undefined ? undefined : slots.probabilityBarFigure(formatMmDollar(m)))
    const alt = figure(alternative.barMedian)
    const cmp = figure(compared.barMedian)
    return {
      label: copy.probabilityBarLabel,
      note: copy.probabilityBarNote,
      caption: `${copy.probabilityBarLabel}. ${copy.probabilityBarNote}`,
      description: copy.probabilityBarDescription,
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      figures: { ...(alt !== undefined ? { alternative: alt } : {}), ...(cmp !== undefined ? { compared: cmp } : {}) },
    }
  })()

  // ── The intro and the key-metric column, per route ──
  let intro: IntroView
  const metricLines: string[] = []
  let clauseReserve: string | undefined
  let spendState: MetricsView['spend']
  const noteLines: string[] = []
  if (notes.medicarePriced !== null) noteLines.push(notes.medicarePriced.affirmation)
  if (notes.stateNote !== null) noteLines.push(notes.stateNote)
  if (elevated.kind === 'spine' && elevated.view.kind === 'reading' && answer.kind === 'headline') {
    const raw = rawDisplayed(answer)
    const spend = raw === null ? undefined : spendClauseFor(snapshot.spend, raw, answer.result.headline.outcomeState)
    const verdict = raw === null ? null : composeVerdictReading(raw, spend)
    intro = {
      ...(elevated.view.refiguring === true ? { eyebrow: copy.answerRefiguringVerdict } : {}),
      lead: verdict === null ? copy.snapshotRingNoReading : `${verdict.word}: ${verdict.reading} ${copy.confidenceCoverageCaption}.`,
      lines: [],
    }
    if (verdict !== null) metricLines.push(verdict.clause)
    // Held while pending AND once sized: the reserve is the sized sentence at its widest figure, so the landed clause
    // sits inside the box the pending one held (measured: dropping the reserve at the landing moved the R13 caveat
    // 40 px up on `surplus`).
    if (raw !== null && (spend?.kind === 'pending' || spend?.kind === 'sized')) clauseReserve = reserveClauseFor(raw) ?? undefined
    if (spend !== undefined) spendState = spend.kind
  } else if (elevated.kind === 'date' && elevated.view.kind === 'dates') {
    const v = elevated.view
    const refiguring = v.refiguring === true
    const split = composeDateSplit(v.floor, v.lifestyle)
    const hero = split.kind === 'single' ? split.track : split.lifestyle
    const heroDated = hero.kind !== 'no-date-in-window'
    const lines: string[] = []
    if (split.kind === 'split') {
      lines.push(floorLineText(split, v.windowTopYears, notes.planClock, refiguring))
      if (split.inverted) lines.push(copy.dateFloorInversionNote)
    }
    if (hero.kind === 'window-edge-unconfirmed') lines.push(copy.dateWindowEdgeNote)
    if (hero.nonMonotoneOffsets.length > 0) lines.push(copy.dateNonMonotoneNote)
    intro = {
      ...(refiguring
        ? { eyebrow: heroDated ? copy.answerRefiguringDate : copy.answerRefiguringVerdict }
        : v.provisional === true
          ? { eyebrow: copy.answerProvisionalTag }
          : {}),
      lead: heroLead(hero, v.windowTopYears, notes.planClock, refiguring),
      lines,
    }
    if (heroDated) {
      metricLines.push(slots.probabilityDateOdds(dateOddsText(hero.grade.quantizedLowerBound)))
      const tradeoff = dateTradeoffPoint(hero, planClockYears)
      if (tradeoff !== null) metricLines.push(slots.dateTradeoff(tradeoff.yearsSooner, tradeoff.oddsText))
    } else {
      const future = agedLadderMarks(curveMarks(hero), planClockYears)
      if (future.length > 0) metricLines.push(slots.noDateHowClose(slots.xOfTen(future.reduce((mx, m) => Math.max(mx, m.rung), 0))))
    }
  } else {
    intro = { lead: copy.snapshotRingNoReading, lines: [] }
  }
  metricLines.push(...noteLines)

  // ── The footnote row: the Medicare residual and its extras appendix ──
  const footnotes: string[] = []
  if (notes.medicarePriced !== null) footnotes.push(notes.medicarePriced.residual)
  if (notes.medicarePricedNote && notes.medicareExtrasTypicalNote !== undefined) footnotes.push(notes.medicareExtrasTypicalNote)

  // ── The pickers ──
  const items: { value: LeftPick; label: string }[] = [{ value: 'new', label: copy.probabilityPickNew }]
  if (offer.kind === 'runnable') items.push({ value: 'recommended', label: copy.probabilityPickRecommended })
  const recordNote = offer.kind === 'words' ? { words: offer.words, door: 'tax-strategies' as const } : undefined

  // ── The charts: Odds by stop year on the working route ──
  const odds = elevated.kind === 'date' && elevated.view.kind === 'dates' ? oddsChartView(elevated.view, startCalendarYear, planClockYears, notes.agedBalancesYear) : undefined
  const charts: { id: ProbabilityChart; label: string }[] = [{ id: 'rings', label: copy.probabilityChartRings }]
  if (odds !== undefined) charts.push({ id: 'odds', label: copy.probabilityChartOdds })
  const chart: ProbabilityChart = input.chart === 'odds' && odds !== undefined ? 'odds' : 'rings'

  return {
    kind: 'reading',
    route: answer.kind,
    intro,
    picker: { label: copy.probabilityPickerLabel, items, value: pick },
    planTitle: copy.probabilityPlanTitle,
    vs: copy.probabilityVs,
    ...(recordNote !== undefined ? { recordNote } : {}),
    ...shareRowNotes(alternative, compared),
    ...(bars !== undefined ? { bars } : {}),
    ...(answer.kind === 'headline' && bars === undefined && compared.barMedian !== undefined ? { barsNone: copy.probabilityBarNone } : {}),
    metrics: { lines: metricLines, ...(clauseReserve !== undefined ? { clauseReserve } : {}), ...(spendState !== undefined ? { spend: spendState } : {}), difference },
    footnotes,
    charts,
    chart,
    ...(odds !== undefined ? { odds } : {}),
    caveat: CAVEAT,
  }
}

// ── Odds by stop year ───────────────────────────────────────────────────────────────────────────────────────────

/** A mark's non-colour state (crown > dip > clears > below), the old ladder's order. */
const markState = (m: CurveMark): 'crown' | 'dip' | 'clears' | 'below' => (m.isCrown ? 'crown' : m.isDip ? 'dip' : m.clears ? 'clears' : 'below')

/** One track's columns: the curve's own marks (`curveMarks`), re-based on an aged plan (`agedLadderMarks`: a passed
 *  stop year is not plotted), each printed through the X-of-10 slots (the ceiling's words, never "10 of 10"). */
export function oddsColumns(track: DateTrackOutcome, seriesName: string, startCalendarYear: number, planClockYears: number, crownWord: string | null) {
  return agedLadderMarks(curveMarks(track), planClockYears).map((m) => {
    const count = slots.xOfTen(m.rung)
    const year = startCalendarYear + m.planOffsetYears
    // The ceiling's words print over two lines so they sit over their own column (one line ran past the chart's edge).
    const crowned = m.isCrown && crownWord !== null
    // Narrow: the ceiling's words broken before the count, a dipped year's word on a line of its own.
    const lines = [...(crowned ? [crownWord] : []), ...(m.atCeiling ? slots.oddsCeilingLines() : [count]), ...(m.isDip ? [copy.oddsDipWord] : [])]
    // Wide: the same words on one line.
    const inline = slots.oddsInline([...(crowned ? [crownWord] : []), m.atCeiling ? slots.oddsCeilingLines().join(' ') : count, ...(m.isDip ? [copy.oddsDipWord] : [])])
    return {
      year,
      rung: m.rung,
      lines,
      inline,
      describe: slots.oddsPoint(year, seriesName, count, markState(m), m.atCeiling),
      isCrown: m.isCrown && crownWord !== null,
      isDip: m.isDip,
      clears: m.clears,
    }
  })
}

/** The chart's view: the tracks the old ladder drew (the hero track; beside it, on a split household, the essentials
 *  track, hatched and named), the bar at `BAR_RUNG`, the crown's word on the hero's crowned year only (never on a
 *  no-date track, never on a crown that has passed), and every honesty line under it. */
export function oddsChartView(
  v: Extract<ReturnType<typeof selectElevatedAnswer>, { kind: 'date' }>['view'] & { kind: 'dates' },
  startCalendarYear: number,
  planClockYears: number,
  agedBalancesYear: number | undefined,
): OddsChartView {
  const split = composeDateSplit(v.floor, v.lifestyle)
  const hero = split.kind === 'single' ? split.track : split.lifestyle
  // A crown that has passed has no word (the hero's sentence already speaks the arrived arm), and a no-date track has no
  // crown at all (`curveMarks` marks none).
  const crownPassed = hero.kind !== 'no-date-in-window' && offsetHasPassed(hero.offsetYears, planClockYears)
  const crownWord = crownPassed ? null : copy.ladderCrownLabel
  const heroName = split.kind === 'split' ? copy.oddsSeriesHero : copy.oddsSeriesSingle
  const series: OddsSeries[] = [{ id: 'hero', name: heroName, hatched: false, columns: oddsColumns(hero, heroName, startCalendarYear, planClockYears, crownWord) }]
  if (split.kind === 'split') {
    series.push({ id: 'floor', name: copy.oddsSeriesFloor, hatched: true, columns: oddsColumns(v.floor, copy.oddsSeriesFloor, startCalendarYear, planClockYears, null) })
  }
  const notes: string[] = []
  if (hero.kind === 'no-date-in-window') {
    const future = agedLadderMarks(curveMarks(hero), planClockYears)
    if (future.length > 0) notes.push(slots.noDateHowClose(slots.xOfTen(future.reduce((mx, m) => Math.max(mx, m.rung), 0))))
  }
  if (hero.kind === 'window-edge-unconfirmed') notes.push(copy.dateWindowEdgeNote)
  if (hero.nonMonotoneOffsets.length > 0) notes.push(copy.dateNonMonotoneNote)
  notes.push(copy.ladderPlanCaveat)
  if (agedBalancesYear !== undefined) notes.push(slots.ladderCaveatAgedBalances(agedBalancesYear))
  const tag = v.refiguring === true ? copy.answerRefiguringCaption : v.provisional === true ? copy.answerProvisionalTag : undefined
  return {
    series,
    barRung: BAR_RUNG,
    ...(tag !== undefined ? { tag } : {}),
    notes,
    labels: ODDS_LABELS,
  }
}

/** One labels object for the life of the page, so a re-render hands the chart the same words (its options rebuild only
 *  when the picture or its words change, `OddsByStopYear.tsx`). */
const ODDS_LABELS: OddsChartView['labels'] = {
  barLabel: copy.ladderBarLabel,
  xAxisTitle: copy.oddsAxisYear,
  yTick: (rung) => slots.xOfTen(rung),
  xTick: slots.oddsYearTick,
  description: copy.oddsChartDescription,
  words: chartWords(copy.probabilityChartOdds),
}
