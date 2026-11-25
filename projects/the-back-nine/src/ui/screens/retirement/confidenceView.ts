/**
 * src/ui/screens/retirement/confidenceView.ts: Retirement → Analysis → Confidence's one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC7; ref 2.9; `rc-analysis/confidence-tab-retirement-analysis__…png`,
 * `FRAME_confidence-legend-toggled-median-only.png`). `Confidence.tsx` draws what this returns and decides nothing: every
 * honesty decision of the tab lives here (insight 048: a rule inline in a render is untested). The page's title, intro,
 * states and R13 caveat are Probability's (`probabilityView.ts`): the two tabs are one page, one answer.
 *
 * THE FAN. "Range of balances, your plan": the plan's own fan full size, the same chart and the same words as Snapshot's
 * card (`fanLabels`, `fanOptions.ts`), already cut where the cohort thins (`answerView.ts`'s `spineBand` and `dateBand`,
 * the cut kept: plan 4.0's disclosure map), with its named moments (`deriveSpineBandAnnotations`, or on the working route
 * `deriveDateBandAnnotations`, which carries the stop-year marker at the band's `offsetYears`; an aged plan's "Plan built"
 * and "Today"). It reads the plan only: a what-if run carries no fan, so the title names your plan and takes no picker.
 *
 * THE RUN-OUT SHARE (retired route only). Under the fan, on its age axis, how many futures in every 100 have run out of
 * money by each year: the count of `distribution.depletionYears` that are real depletions (`isDepleted`: the
 * never-depleted sentinel never counts) and fell in a year before that one, over every path the run made. A path that
 * depletes in simulated year d is at $0 at the end of that year, which the fan's grid calls `yearsFromNow` d + 1
 * (`decumulation.ts`, `simulate.ts`'s fan fold), so by year x the run-out count is the depletions with d < x. Over the
 * plan's whole horizon that is every depletion, so its share is exactly 1 − `survivalFraction`. The words are
 * "about N in 100 futures" from a WHOLE-COUNT rounding of count × 100 ÷ paths (integer arithmetic first, so a share that
 * sits on .5 rounds the same on every engine), with the edges worded apart (`runOutShare`): fewer than 1 in 100 (rounds
 * below 1, none run out included: a sample's zero is a bound, never "no future", the false certainty the 10-of-10 clamp
 * refuses; never "0 in 100"), more than 99 in 100 (rounds to 100 while some future holds), every future. Never a
 * percent, never the X-of-10 slots (a 3% share would round to a false "0 of 10").
 *
 * THE KEY-METRIC COLUMN. Retired: the share by the last year the fan draws (the age the "Plan horizon" moment names) and
 * the share over the whole plan (the one the ring's count reads), then the page's notes as Probability carries them (the
 * Medicare affirmation, the state clause) and its footnotes. Working: the one stopgap line in the run-out chart's place
 * (plan 6's "the working household's readings at its date"), then the same notes. On an aged plan (the fan draws "Plan
 * built") the column carries the premise (`fanPremise`) first, with its re-confirm door where the tab can write.
 *
 * UNDER THE FAN, on the working route: the track note (`bandTrackNote`), whose world the range prices.
 */
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { isDepleted, type BandFan } from '@shared/model'
import type { XAnnotation } from '@viz/bandData'
import type { FanLabels } from '@viz/charts/fanOptions'
import type { RunOutLabels, RunOutPoint } from '@viz/charts/runOutOptions'
import type { AnswerNotes } from '../../answerNotes'
import { selectElevatedAnswer } from '../../answerView'
import { copy, slots } from '../../copy'
import { bandTrackNote, fanPremise, type FanPremise } from '../../fanNotes'
import { chartWords, fanLabels } from '../dashboard/snapshotView'

// ── The run-out share ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * The run-out count by each year on the fan's grid, 0 through `lastYear`: `counts[x]` is the paths whose depletion year
 * is a real one (the sentinel never counts) and earlier than x. Non-decreasing by construction.
 */
export function runOutCounts(depletionYears: readonly number[], lastYear: number): readonly number[] {
  const byYear = new Array<number>(lastYear + 1).fill(0)
  for (const d of depletionYears) if (isDepleted(d) && d + 1 <= lastYear) byYear[d + 1]!++
  for (let x = 1; x <= lastYear; x++) byYear[x]! += byYear[x - 1]!
  return byYear
}

/** The share's words, one kind per edge (exhaustive, insight 147): fewer than 1 (none included), about N, more than 99,
 *  every future. */
export type RunOutShareKind = 'fewer' | 'about' | 'more' | 'every'

export interface RunOutShare {
  readonly kind: RunOutShareKind
  /** The whole count in every 100 (1 to 99) on `about`. */
  readonly n?: number
  /** The share in words ("about 6 in 100 futures"). */
  readonly words: string
  /** Whether the words take a plural verb ("futures have", "every future has"). */
  readonly plural: boolean
}

const SHARE_WORDS: Readonly<Record<RunOutShareKind, (n: number) => { readonly words: string; readonly plural: boolean }>> = {
  fewer: () => ({ words: slots.confidenceShareFewer(), plural: true }),
  about: (n) => ({ words: slots.confidenceShareAbout(n), plural: true }),
  more: () => ({ words: slots.confidenceShareMore(), plural: true }),
  every: () => ({ words: copy.confidenceShareEvery, plural: false }),
}

/** `count` of `paths` futures, in words. Throws on a count outside the paths (a producer bug: no honest share). */
export function runOutShare(count: number, paths: number): RunOutShare {
  if (!(Number.isInteger(count) && Number.isInteger(paths) && paths > 0 && count >= 0 && count <= paths)) {
    throw new RangeError(`runOutShare: ${count} of ${paths} futures is not a share`)
  }
  // Integer arithmetic first: count × 100 is exact, so a share on the .5 line rounds alike on every engine.
  const n = Math.round((count * 100) / paths)
  // A count of none is a bound on the sample (fewer than 1 in 100 of the futures the plan ran), never "no future".
  const kind: RunOutShareKind = count === paths ? 'every' : n < 1 ? 'fewer' : n > 99 ? 'more' : 'about'
  return { kind, ...(kind === 'about' ? { n } : {}), ...SHARE_WORDS[kind](n) }
}

// ── The view ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RunOutView {
  /** Printed over the chart (it names the chart's one series and its axis). */
  readonly title: string
  readonly points: readonly RunOutPoint[]
  readonly labels: RunOutLabels
}

export type ConfidenceView =
  | {
      readonly kind: 'chart'
      readonly route: 'headline' | 'date'
      readonly title: string
      readonly fan: BandFan
      readonly moments: readonly XAnnotation[]
      readonly labels: FanLabels
      /** Retired route only. */
      readonly runOut?: RunOutView
      /** Working route only: the line in the run-out chart's place. */
      readonly stopgap?: string
      /** Working route only: whose world the range prices (`bandTrackNote`), under the fan. */
      readonly trackNote?: string
      /** An aged plan: the modelled years' premise and its door (`fanPremise`), heading the key-metric column. */
      readonly premise?: FanPremise
      readonly metrics: readonly string[]
      readonly footnotes: readonly string[]
    }
  | {
      /** No fan to draw (no invested money, no date in the window, no answer yet): the words in its place. */
      readonly kind: 'words'
      readonly title: string
      readonly words: string
      readonly metrics: readonly string[]
      readonly footnotes: readonly string[]
    }

export interface ConfidenceInput {
  readonly snapshot: MemoryModelSnapshot
  readonly notes: AnswerNotes
  readonly onRetry: () => void
  /** A read-only tab: the premise carries no door. */
  readonly readOnly: boolean
}

/** The run-out chart's view and the two metric sentences, from a retired run. */
function retiredRunOut(
  depletionYears: readonly number[],
  lastDrawn: number,
  ageA: number,
  ageB: number,
  labels: FanLabels,
): { readonly view: RunOutView; readonly lines: readonly string[] } | null {
  const paths = depletionYears.length
  if (paths === 0 || lastDrawn < 1) return null
  const counts = runOutCounts(depletionYears, lastDrawn)
  const points: RunOutPoint[] = counts.map((count, x) => {
    const share = runOutShare(count, paths)
    return {
      x,
      per100: (count * 100) / paths,
      tip: [labels.agesAt(x), slots.confidenceRunOutTip(share.words)].join('<br>'),
      sentence: slots.confidenceRunOutPoint(labels.agesAt(x), share.words),
    }
  })
  const atEnd = runOutShare(counts[lastDrawn]!, paths)
  const wholeCount = depletionYears.filter(isDepleted).length
  const whole = runOutShare(wholeCount, paths)
  // One question, one answer: where the charts reach the plan's end their last point IS the whole plan's share and is
  // said once; where they stop short (the cohort cut) the whole plan's share names its span, never a second answer.
  const sameSpan = counts[lastDrawn] === wholeCount
  return {
    view: {
      title: slots.confidenceRunOutTitle(),
      points,
      labels: {
        yTick: (n) => String(n),
        ageAt: labels.ageAt,
        description: slots.confidenceRunOutDescription(),
        words: chartWords(copy.confidenceRunOutName),
      },
    },
    lines: sameSpan
      ? [slots.confidenceRunOutWhole(whole.words, whole.plural)]
      : [
          slots.confidenceRunOutBy(ageA + lastDrawn, ageB + lastDrawn, atEnd.words, atEnd.plural),
          slots.confidenceRunOutWholePast(ageA + lastDrawn, ageB + lastDrawn, whole.words, whole.plural),
        ],
  }
}

/** The line saying why the charts stop short of the plan, where the drawn fan ends before the engine's (the cohort
 *  cut, `truncateFanAtThinCohort`): the right-hand moment then says "Range ends", never "Plan horizon". */
function cutNote(raw: BandFan | undefined, lastDrawn: number, ageA: number, ageB: number): readonly string[] {
  const rawLast = raw?.byYear[raw.byYear.length - 1]?.yearsFromNow
  return rawLast !== undefined && lastDrawn < rawLast ? [slots.confidenceCutNote(ageA + lastDrawn, ageB + lastDrawn)] : []
}

export function confidenceView({ snapshot, notes, onRetry, readOnly }: ConfidenceInput): ConfidenceView {
  const title = copy.confidenceChartTitle
  // The page's notes, as Probability's key-metric column carries them; its footnote row likewise.
  const noteLines: string[] = []
  if (notes.medicarePriced !== null) noteLines.push(notes.medicarePriced.affirmation)
  if (notes.stateNote !== null) noteLines.push(notes.stateNote)
  const footnotes: string[] = []
  if (notes.medicarePriced !== null) footnotes.push(notes.medicarePriced.residual)
  if (notes.medicarePricedNote && notes.medicareExtrasTypicalNote !== undefined) footnotes.push(notes.medicareExtrasTypicalNote)

  const words = (w: string): ConfidenceView => ({ kind: 'words', title, words: w, metrics: noteLines, footnotes })
  const answer = snapshot.answer
  if (answer.kind !== 'headline' && answer.kind !== 'date') return words(copy.snapshotFanWaiting)
  const draft = answer.draft
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const elevated = selectElevatedAnswer(snapshot, onRetry, notes.planClock)
  const premiseFor = (moments: readonly XAnnotation[]): { premise?: FanPremise } => {
    const premise = fanPremise(moments, notes.agedBalancesYear, notes.planClock.startCalendarYear, readOnly)
    return premise === null ? {} : { premise }
  }

  if (elevated.kind === 'spine' && elevated.view.kind === 'reading' && answer.kind === 'headline') {
    const fan = elevated.view.band
    const moments = elevated.view.bandAnnotations
    if (fan === undefined || moments === undefined || ageA === undefined || ageB === undefined) return words(copy.snapshotFanNone)
    const labels = fanLabels(draft, ageA, ageB)
    const lastDrawn = fan.byYear[fan.byYear.length - 1]!.yearsFromNow
    const run = retiredRunOut(answer.result.distribution.depletionYears, lastDrawn, ageA, ageB, labels)
    const cut = cutNote(answer.result.distribution.bandFan, lastDrawn, ageA, ageB)
    return {
      kind: 'chart',
      route: 'headline',
      title,
      fan,
      moments,
      labels,
      ...(run !== null ? { runOut: run.view } : {}),
      ...premiseFor(moments),
      // Where the run-out lines speak in two, the second already says why the charts stop; where they speak in one (no
      // future runs out past the cut, so the last point IS the whole plan's share) or not at all, the cut line follows.
      metrics: [...(run !== null ? run.lines : []), ...(run === null || run.lines.length < 2 ? cut : []), ...noteLines],
      footnotes,
    }
  }
  if (elevated.kind === 'date' && elevated.view.kind === 'dates') {
    const v = elevated.view
    const noDate = v.floor.kind === 'no-date-in-window' && v.lifestyle.kind === 'no-date-in-window'
    const fan = v.band?.fan
    const moments = v.bandAnnotations
    if (fan === undefined || moments === undefined || ageA === undefined || ageB === undefined) return words(noDate ? copy.snapshotFanNoDate : copy.snapshotFanNone)
    const trackNote = bandTrackNote(v)
    return {
      kind: 'chart',
      route: 'date',
      title,
      fan,
      moments,
      labels: fanLabels(draft, ageA, ageB),
      stopgap: copy.confidenceRunOutStopgap,
      ...(trackNote !== null ? { trackNote } : {}),
      ...premiseFor(moments),
      metrics: [
        ...cutNote(answer.kind === 'date' && answer.outcome.kind === 'dates' ? answer.outcome.band?.fan : undefined, fan.byYear[fan.byYear.length - 1]!.yearsFromNow, ageA, ageB),
        ...noteLines,
      ],
      footnotes,
    }
  }
  return words(copy.snapshotFanWaiting)
}
