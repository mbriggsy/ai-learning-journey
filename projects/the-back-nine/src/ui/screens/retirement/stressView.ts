/**
 * src/ui/screens/retirement/stressView.ts: Retirement → Stress Test's views (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC11; ref 2.13). PURE: the committed answer, the plan's own reading, the stress offers, the settings and each bar's run
 * in; the page's and the tray's views out. Every word through `copy.ts`.
 *
 * THE COUNTS: every bar's count is the ring's one composer (`ringFace`): "X of 10" below the ceiling, "better than 9 in
 * 10" at it, never a percent and never "10 of 10"; the bar stands to the ring's arc (0 to 9, the ceiling's full less one).
 * BASELINE IS THE PLAN'S OWN READING (`planReadingFor`, no run), so its count is exactly the one Probability prints for
 * your plan. On the working route every bar reads the same stop year, the plan's base offset (the runner's core), and the
 * page says which year in the ring's own caption words (the window's last year, said as that, where the answer found no
 * date). While the answer is worked out again the bars stay, under the re-figuring line.
 *
 * WHAT A BAR SHOWS: its count where its run landed (held under "Loading…" while a newer run is in flight); no column while
 * it has none yet, or where its reading has no number (indeterminate: the ring's own words, never a 0-height bar); and a
 * stress that failed or could not run on the plan's futures prints no count and says why in the notes, never a count from
 * another bar. A stress with nothing to act on in this plan draws no bar and says so by name. A plan reading with no number
 * draws no chart at all (there is nothing to stress against). A stress reading with no number names itself in the notes
 * (its empty slot carries no label). Where every stressed bar has a number and reads Baseline's count, one note says no
 * stress moved it a whole step.
 */
import { STRESS_IDS, STRESS_RANGES, type StressId, type StressRefusal } from '@intake/stress'
import type { StressChartBar, StressBarRole } from '@viz/charts/stressBarsOptions'
import { copy, slots } from '../../copy'
import { ringFace } from '../../ringReading'
import type { WhatIfReading } from '../../workbench/whatIfRun'
import type { StressBarId, StressBarRun, StressOffers, StressSettings } from '../../workbench/useStress'

/** Each bar's colour slot (`palette.ts`'s `RC_SERIES`): RightCapital's hue for it, never its only cue. */
export const STRESS_COLOR: Readonly<Record<StressBarId | 'baseline', number>> = {
  baseline: 6,
  'social-security': 3,
  'out-of-pocket': 12,
  'subsidy-rules': 4,
  combined: 8,
}

const NAME: Readonly<Record<StressBarId, string>> = {
  'social-security': copy.stressSocialSecurity,
  'out-of-pocket': copy.stressOutOfPocket,
  'subsidy-rules': copy.stressSubsidyRules,
  combined: copy.stressCombined,
}

/** A stress's size in words ("20% less"), from the settings that ran it. */
function detailOf(id: StressBarId, settings: StressSettings): string {
  if (id === 'social-security') return slots.stressPctLess(settings.pct['social-security'])
  if (id === 'out-of-pocket') return slots.stressPctHigher(settings.pct['out-of-pocket'])
  if (id === 'subsidy-rules') return copy.stressSubsidySub
  return copy.stressCombinedSub
}

const REFUSAL_WORDS: Readonly<Record<Exclude<StressRefusal['kind'], 'size-outside-range'>, string>> = {
  'no-benefit': copy.stressRefusedNoBenefit,
  'no-out-of-pocket': copy.stressRefusedNoOop,
  'no-marketplace-years': copy.stressRefusedNoMarketplace,
  'already-current-law': copy.stressRefusedCurrentLaw,
}

/** Why a stress the plan does not offer draws no bar (a size outside its range never reaches here: the slider holds it). */
export function offerWords(refusal: StressRefusal): string {
  return refusal.kind === 'size-outside-range' ? slots.stressBarWithheld(NAME[refusal.id]) : REFUSAL_WORDS[refusal.kind]
}

/** A reading as a bar: its count words and the height it stands to (null where the reading has no number: no column). */
function barOf(reading: WhatIfReading, startCalendarYear: number): { readonly count: string; readonly height: number | null } {
  const face = ringFace(reading, startCalendarYear)
  return { count: face.centre ?? face.caption, height: face.arc ?? null }
}

export interface StressViewInput {
  readonly startCalendarYear: number
  /** The plan's own many-futures reading (`planReadingFor`), or null where the answer gives none. */
  readonly plan: WhatIfReading | null
  /** The plan's age in years (`yearsSincePlanBuilt`): a stop year it has passed reads in the past. */
  readonly planClockYears: number
  readonly offers: StressOffers
  /** The settings the bars ran (the committed ones, never the tray's pending edits). */
  readonly committed: StressSettings
  readonly bars: ReadonlyMap<StressBarId, StressBarRun>
  /** The page's one state clause (`composeVerdictStateNote`), or null. */
  readonly stateClause: string | null
  /** The answer is being worked out again (`snapshot.refiguring`): the bars shown are from before the latest change. */
  readonly refiguring: boolean
  /** The answer found no date in its window: the reading is the window's last year (`buildTableBase`'s `no-date` route). */
  readonly noDate: boolean
}

export type StressPageView =
  | { readonly kind: 'words'; readonly words: string }
  | {
      readonly kind: 'bars'
      readonly title: string
      /** The re-figuring line while the answer is worked out again (the bars kept are from before the latest change). */
      readonly tag?: string
      /** The stop year every bar reads (the working route), and the essentials-only line where the reading is that pass. */
      readonly readsAt: readonly string[]
      readonly bars: readonly StressChartBar[]
      readonly axisTitle: string
      readonly description: string
      /** A run in flight: the chart fades under "Loading…" with its counts kept. */
      readonly loading: boolean
      /** Under the chart: the stopgap first, then why any stress shows no count, then the state clause. */
      readonly notes: readonly string[]
    }

export function stressView(input: StressViewInput): StressPageView {
  const { plan, startCalendarYear, committed } = input
  if (plan === null) return { kind: 'words', words: copy.stressNoReading }
  const baseline = barOf(plan, startCalendarYear)
  // An indeterminate plan reading has no number to stress against.
  if (baseline.height === null) return { kind: 'words', words: copy.stressNoReading }
  const bars: StressChartBar[] = [
    {
      id: 'baseline',
      name: copy.stressBaseline,
      detail: copy.stressBaselineSub,
      ...baseline,
      role: 'baseline',
      colorIndex: STRESS_COLOR.baseline,
      point: slots.stressBarPoint(copy.stressBaseline, copy.stressBaselineSub, baseline.count),
    },
  ]
  const why: string[] = []
  let loading = false
  for (const id of STRESS_IDS) {
    const refusal = input.offers[id]
    if (refusal !== null && committed.on[id]) why.push(offerWords(refusal))
  }
  for (const id of [...STRESS_IDS, 'combined'] as const) {
    const run = input.bars.get(id)
    if (run === undefined) continue
    const name = NAME[id]
    const detail = detailOf(id, committed)
    const role: StressBarRole = id === 'combined' ? 'combined' : 'stress'
    let shown: { readonly count: string; readonly height: number | null } = { count: '', height: null }
    if (run.kind === 'ready') {
      shown = barOf(run.reading, startCalendarYear)
      if (run.updating) loading = true
    } else if (run.kind === 'loading') {
      loading = true
      if (run.held !== undefined) shown = barOf(run.held, startCalendarYear)
    } else if (run.kind === 'error' || run.kind === 'answer-error') why.push(slots.stressBarError(name))
    else why.push(slots.stressBarWithheld(name))
    // A reading with no number draws an empty slot (no label on a null column): its words go in the notes.
    if ((run.kind === 'ready' || (run.kind === 'loading' && run.held !== undefined)) && shown.height === null) why.push(slots.stressBarNoCount(name))
    bars.push({
      id,
      name,
      detail,
      ...shown,
      role,
      colorIndex: STRESS_COLOR[id],
      point: slots.stressBarPoint(name, detail, shown.count === '' ? copy.stressRunsWaiting : shown.count),
    })
  }
  // Every stressed bar has a count and reads Baseline's: say so, or the equal bars read as "did the stress even run?".
  // A bar with no number (no count, withheld, failed) is never counted as one that did not move.
  const stressed = bars.slice(1)
  const noneMoves = !loading && stressed.length > 0 && stressed.every((b) => b.height !== null && b.count === baseline.count)
  const readsAt: string[] = []
  if (plan.kind === 'offset') {
    const caption = ringFace(plan, startCalendarYear, input.planClockYears).caption
    readsAt.push(input.noDate ? slots.stressReadsAtNoDate(caption) : slots.stressReadsAt(caption))
    if (plan.track === 'floor') readsAt.push(copy.snapshotRingEssentialsNote)
  }
  return {
    kind: 'bars',
    title: copy.stressTitle,
    ...(input.refiguring ? { tag: copy.answerRefiguringCaption } : {}),
    readsAt,
    bars,
    axisTitle: copy.stressAxisTitle,
    description: copy.stressDescription,
    loading,
    notes: [copy.stressStopgap, ...(noneMoves ? [copy.stressNoneMoves] : []), ...why, ...(input.stateClause !== null ? [input.stateClause] : [])],
  }
}

// ── The Action Items tray ────────────────────────────────────────────────────────────────────────────────────────────

export type StressTrayRow =
  | {
      readonly id: 'social-security' | 'out-of-pocket'
      readonly label: string
      readonly slider: { readonly min: number; readonly max: number; readonly step: number; readonly value: number }
      readonly value: string
    }
  | { readonly id: 'subsidy-rules'; readonly label: string; readonly value: string }

export interface StressTrayView {
  /** The rows of the stresses this plan offers and the tray has on, in the page's order. */
  readonly rows: readonly StressTrayRow[]
  /** Why each stress the plan does not offer draws no bar. */
  readonly refusals: readonly string[]
  readonly note: string
  /** The tray holds an edit the bars have not run (its words say Refresh shows it). */
  readonly pendingDiffers: boolean
  /** The Edit drawer's checklist: every offered stress, on or off. */
  readonly edit: readonly { readonly id: StressId; readonly label: string; readonly checked: boolean }[]
}

const sameSettings = (a: StressSettings, b: StressSettings): boolean =>
  STRESS_IDS.every((id) => a.on[id] === b.on[id]) && a.pct['social-security'] === b.pct['social-security'] && a.pct['out-of-pocket'] === b.pct['out-of-pocket']

export function stressTrayView(pending: StressSettings, committed: StressSettings, offers: StressOffers): StressTrayView {
  const rows: StressTrayRow[] = []
  const refusals: string[] = []
  const edit: { id: StressId; label: string; checked: boolean }[] = []
  for (const id of STRESS_IDS) {
    const refusal = offers[id]
    if (refusal !== null) {
      refusals.push(offerWords(refusal))
      continue
    }
    edit.push({ id, label: NAME[id], checked: pending.on[id] })
    if (!pending.on[id]) continue
    if (id === 'subsidy-rules') rows.push({ id, label: copy.stressTrayAca, value: copy.stressTrayAcaOn })
    else {
      const r = STRESS_RANGES[id]
      const value = pending.pct[id]
      rows.push({
        id,
        label: id === 'social-security' ? copy.stressTraySs : copy.stressTrayOop,
        slider: { min: r.min, max: r.max, step: r.step, value },
        value: id === 'social-security' ? slots.stressPctLess(value) : slots.stressPctHigher(value),
      })
    }
  }
  return { rows, refusals, note: copy.stressTrayNote, pendingDiffers: !sameSettings(pending, committed), edit }
}
