/**
 * src/ui/twoFuturesChrome.ts — fills the string-free TwoFutures renderer + composes the delta
 * readout sentences from a resolved {@link TwoArmOutcome} (the oddsLadderChrome/bandPanelChrome
 * pattern: viz draws, THIS layer speaks — every word from copy.ts, every number through a slot).
 *
 * THE DELTA GRAMMAR (R10/R12, plan §U10 "the delta itself — made honest"):
 *   - PRIMARY: the natural-frequency shift in the SAME "X of 10" register as the spine —
 *     SURVIVOR-basis when both arms observed one (the emotional headline number), joint fallback.
 *   - The QUANTIZED readings drive the words (the engine's own rounding — never re-derived);
 *     equal quantized readings across SAME-state arms render the calm EVEN line, never a
 *     suppressed delta and never a fabricated difference the quantize deliberately absorbed.
 *   - The delta lines DELIBERATELY speak the conservative count: the engine clamps each arm's
 *     emitted count to ≤ 9, so the ceiling proportion never renders here (an over-funded arm
 *     reads "9 of 10" — council 2026-07-18 Q4b ratified the count; folding the ceiling in would
 *     mint a fresh of/in collision inside one sentence). A state CHANGE between arms adds the
 *     verdict-transition rider — that is how an over-funded arm surfaces past the clamp — and
 *     equal counts across a state move render the count-only line, never the false "doesn't
 *     look to change much" (Q4d: the recommend-second suppression).
 *   - "~N years" is a HEDGED SECONDARY tied to its stated percentile, present only when the
 *     engine emitted a real median for BOTH arms (never fabricated).
 */
import type { OutcomeState, TwoArmOutcome, TwoArmReading } from '@shared/model'
import {
  twoFuturesCeiling,
  type TwoFuturesLabels,
  type TwoFuturesPoint,
  type TwoFuturesReadoutRow,
  type TwoFuturesXTick,
} from '@viz/TwoFutures'
import { buildYTicks, type YTick } from '@viz/bandData'
import { COHORT_FADE } from '@viz/bandGeometry'
import { copy, slots } from './copy'
import { OUTCOME_PRESENTATION } from './outcomeStates'
import { axisDollarFormatterFor, formatAxisDollar } from './money'
import { deriveBandAgesAt, deriveDecadeAgeTicks, type BandSavedAnchor } from './bandAnnotations'

/** The verdict WORD for a state (null for indeterminate — a two-arm outcome's arms are never
 *  indeterminate by construction, so a null here simply withholds the transition rider). */
const stateWord = (state: OutcomeState): string | null => {
  const key = OUTCOME_PRESENTATION[state].verdictWordKey
  return key === null ? null : copy[key]
}

export interface TwoFuturesView {
  /** The chart's two median series (undefined when either arm carried no fan). */
  readonly series?: {
    readonly withArm: readonly TwoFuturesPoint[]
    readonly withoutArm: readonly TwoFuturesPoint[]
    readonly labels: TwoFuturesLabels
    /** Fan-parity axis + hover chrome (station-2 cold-read 2026-07-08): the y dollar lattice
     *  (the fan's OWN buildYTicks over the shared humane ceiling), intermediate x year ticks,
     *  and per-integer-year readout rows — every figure pre-formatted HERE (string-free viz). */
    readonly yTicks: readonly YTick[]
    readonly xTicks: readonly TwoFuturesXTick[]
    readonly rows: readonly TwoFuturesReadoutRow[]
  }
  /** The hero delta sentence (frequency-first, hedge-bearing). */
  readonly deltaLine: string
  /** The verdict-state transition rider — present iff the arms' states differ. */
  readonly stateLine?: string
  /** The hedged "~N years" secondary — present iff both arms had a real median depletion year. */
  readonly yearsLine?: string
}

const oddsOf = (r: TwoArmReading): string => slots.xOfTen(r.headline.xOfTen.value)
const survivorOddsOf = (r: TwoArmReading): string =>
  r.survivorReading === undefined ? oddsOf(r) : slots.xOfTen(r.survivorReading.xOfTen.value)

function points(r: TwoArmReading): readonly TwoFuturesPoint[] | undefined {
  if (r.bandFan === undefined) return undefined
  // The dead-cohort law (the band's own COHORT_FADE.full threshold — the same line the scrub
  // withholds dollars past): a median over a handful of still-living paths is noise wearing a
  // line's confidence, and it spikes at the horizon tail (seen live, ?seed=dip 2026-07-03).
  // TRUNCATE the series where the living cohort thins — the chart simply ends, honest.
  return r.bandFan.byYear
    .filter((y) => y.cohortFraction >= COHORT_FADE.full)
    .map((y) => ({ yearsFromNow: y.yearsFromNow, medianReal: y.p50 }))
}

/** The AGES-LESS fallback x ticks (an ages-unknown household only): year-count steps between the
 *  endpoints — decade steps on a long horizon, fives on a short one; a tick never lands within
 *  the pad of either endpoint label. The KNOWN-ages path speaks the fan's ages dialect instead
 *  (deriveDecadeAgeTicks — Briggsy's 2026-07-10 cold-read consistency ruling). Pure, exported. */
const X_TICK_ENDPOINT_PAD = 3
export function deriveTwoFuturesXTicks(horizonYears: number): TwoFuturesXTick[] {
  if (!Number.isFinite(horizonYears) || horizonYears < 8) return []
  const step = horizonYears <= 16 ? 5 : 10
  const ticks: TwoFuturesXTick[] = []
  for (let y = step; y <= horizonYears - X_TICK_ENDPOINT_PAD; y += step) {
    ticks.push({ years: y, label: `${y}` })
  }
  return ticks
}

/**
 * Compose the whole view from a two-arm outcome. `withLabel`/`withoutLabel` name THIS control's
 * arms (the Roth lever and the sequencing picker word their own series). Returns null for the
 * indeterminate/infeasible outcomes — the surfaces own those calm states.
 *
 * `ages` is the household's CURRENT whole-year ages `[ageA, ageB]`. Known ages put the whole
 * x-axis in the fan's dialect (Briggsy's 2026-07-10 cold-read: "the x-axis should be ages —
 * consistency"): the today endpoint reads word + pair ("Today 66 / 65"), intermediate ticks are
 * the SAME decade-age rule the fan's annotations ride (deriveDecadeAgeTicks), the right endpoint
 * is the ages pair at the chart's own last drawn year — deliberately NOT the fan's "Plan horizon"
 * word, because this chart ends at the dead-cohort TRUNCATION, which can be an earlier year than
 * the fan's horizon (two same-named endpoints holding different years would be the era-naked-twins
 * defect) — and the scrub readout rides the same closure (deriveBandAgesAt), so a scrubbed age can
 * never disagree with a tick. Absent ⇒ year-count ticks, and the readout's ages line drops.
 */
export function composeTwoFutures(
  outcome: TwoArmOutcome,
  withLabel: string,
  withoutLabel: string,
  deltaSlot: (withOdds: string, withoutOdds: string) => string,
  ages?: readonly [number, number],
  savedAnchor?: BandSavedAnchor,
): TwoFuturesView | null {
  if (outcome.kind !== 'two-arm') return null
  const survivorBasis = outcome.deltaBasis === 'survivor'
  const withOdds = survivorBasis ? survivorOddsOf(outcome.with) : oddsOf(outcome.with)
  const withoutOdds = survivorBasis ? survivorOddsOf(outcome.without) : oddsOf(outcome.without)

  const fromWord = stateWord(outcome.without.headline.outcomeState)
  const toWord = stateWord(outcome.with.headline.outcomeState)
  const stateLine =
    fromWord !== null && toWord !== null && fromWord !== toWord
      ? slots.rothStateShift(fromWord, toWord)
      : undefined

  // The EVEN line is gated on the state rider being ABSENT: equal clamped counts across a state
  // move (over-funded 0.99 vs on-track 0.90 both read "9 of 10") are NOT "doesn't look to change
  // much" — that line was suppressing a real improvement (or harm) on the recommend-second
  // surface (council 2026-07-18 Q4d). The count-only sibling states the count fact and lets the
  // state rider directly below carry the move.
  const deltaLine =
    withOdds === withoutOdds
      ? stateLine === undefined
        ? slots.rothDeltaEven(withOdds)
        : slots.rothDeltaCountEven(withOdds)
      : survivorBasis
        ? deltaSlot(withOdds, withoutOdds)
        : slots.rothDeltaJoint(withOdds, withoutOdds)

  const yearsLine =
    outcome.medianYearsDelta !== undefined && Math.round(Math.abs(outcome.medianYearsDelta)) >= 1
      ? slots.rothYearsSecondary(
          Math.round(Math.abs(outcome.medianYearsDelta)),
          outcome.medianYearsDelta > 0 ? 'more' : 'fewer',
        )
      : undefined

  const withPts = points(outcome.with)
  const withoutPts = points(outcome.without)
  let series: TwoFuturesView['series']
  if (withPts !== undefined && withoutPts !== undefined && withPts.length > 1 && withoutPts.length > 1) {
    const maxDollar = Math.max(...withPts.map((p) => p.medianReal), ...withoutPts.map((p) => p.medianReal))
    const maxYears = Math.max(
      withPts[withPts.length - 1]!.yearsFromNow,
      withoutPts[withoutPts.length - 1]!.yearsFromNow,
    )
    const ceiling = twoFuturesCeiling(maxDollar)
    const agesAt = ages !== undefined ? deriveBandAgesAt(ages[0], ages[1]) : undefined
    // Per-integer-year readout rows (0..maxYears), keyed off each arm's OWN filtered series — a
    // truncated arm's value is simply ABSENT past its last year (the readout goes quiet exactly
    // where the drawn line ends; never a median quoted past the cohort). Same formatter as the
    // axis ticks, so a scrubbed figure and a gridline figure always share one dialect.
    const withByYear = new Map(withPts.map((p) => [p.yearsFromNow, p.medianReal]))
    const withoutByYear = new Map(withoutPts.map((p) => [p.yearsFromNow, p.medianReal]))
    const rows: TwoFuturesReadoutRow[] = []
    for (let y = 0; y <= maxYears; y++) {
      const w = withByYear.get(y)
      const wo = withoutByYear.get(y)
      rows.push({
        yearsFromNow: y,
        ages: agesAt?.(y) ?? '',
        ...(w !== undefined ? { withValue: formatAxisDollar(w) } : {}),
        ...(wo !== undefined ? { withoutValue: formatAxisDollar(wo) } : {}),
      })
    }
    series = {
      withArm: withPts,
      withoutArm: withoutPts,
      labels: {
        withLabel,
        withoutLabel,
        // The label annotates the DRAWN ceiling gridline, so it formats the SAME ceiling the
        // renderer computes — the raw data max under-reported the line it sat on (ultramode
        // 2026-07-03: an axis reference that understates its own value).
        dollarMaxLabel: `~${formatAxisDollar(ceiling)}`,
        // The x endpoints speak the fan's clock dialect when the ages are known (the 2026-07-10
        // consistency ruling): "Today 66 / 65" left; the AGES PAIR at the chart's last drawn year
        // right — never the "Plan horizon" word (this chart ends at the dead-cohort truncation,
        // which can be an earlier year than the fan's horizon; one word must not name two years).
        // On an AGED plan (the plan clock > 0) the year-0 endpoint is where the PLAN starts, not
        // today — it renames to the fan's own "Plan built" (the one-screen-one-time-base law; the
        // ultramode caller-lens caught this chart as the sibling the band fix missed, 2026-07-10).
        // Re-pointed WITH the band in the same commit (U17 §S0.2, insight 086: splitting a copy
        // key orphans every renderer not re-pointed with it) — the old 'Your save' wording was
        // false for a re-saver on this chart exactly as it was on the fan.
        todayLabel:
          ages !== undefined
            ? `${(savedAnchor?.yearsSincePlanBuilt ?? 0) > 0 ? copy.bandClockBuiltLabel : copy.bandClockTodayLabel} ${slots.bandClockAges(ages[0], ages[1])}`
            : (savedAnchor?.yearsSincePlanBuilt ?? 0) > 0
              ? copy.bandClockBuiltLabel
              : slots.ladderOffsetTick(0),
        horizonLabel: agesAt !== undefined ? agesAt(maxYears) : `${maxYears}`,
        readoutAgesLabel: copy.bandReadoutAgesLabel,
        ariaSummary: `${copy.twoFuturesCaption} ${deltaLine}`,
      },
      // The fan's OWN tick builder over the shared humane ceiling — quarters are clean figures
      // by construction, and the two charts can never grow separate dollar-axis dialects.
      // O8 (2026-07-17): the lattice is unit-LOCKED to its top tick (rule 36) — a $3M ceiling
      // reads "$0.75M…$3M", never "$750k" among "$M" gridlines.
      yTicks: buildYTicks(ceiling, axisDollarFormatterFor(ceiling)),
      // Known ages ⇒ the fan's OWN decade-age tick rule (one canonical home, bandAnnotations) —
      // the two charts can never grow separate clock dialects; ages-less ⇒ year-count fallback.
      xTicks:
        ages !== undefined
          ? deriveDecadeAgeTicks(ages[0], ages[1], maxYears).map((t) => ({
              years: t.yearsFromNow,
              label: t.ages,
            }))
          : deriveTwoFuturesXTicks(maxYears),
      rows,
    }
  }

  return { deltaLine, ...(stateLine ? { stateLine } : {}), ...(yearsLine ? { yearsLine } : {}), ...(series ? { series } : {}) }
}
