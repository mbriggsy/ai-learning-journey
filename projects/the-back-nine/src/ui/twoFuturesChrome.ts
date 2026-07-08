/**
 * src/ui/twoFuturesChrome.ts — fills the string-free TwoFutures renderer + composes the delta
 * readout sentences from a resolved {@link TwoArmOutcome} (the oddsLadderChrome/bandPanelChrome
 * pattern: viz draws, THIS layer speaks — every word from copy.ts, every number through a slot).
 *
 * THE DELTA GRAMMAR (R10/R12, plan §U10 "the delta itself — made honest"):
 *   - PRIMARY: the natural-frequency shift in the SAME "X of 10" register as the spine —
 *     SURVIVOR-basis when both arms observed one (the emotional headline number), joint fallback.
 *   - The QUANTIZED readings drive the words (the engine's own rounding — never re-derived);
 *     equal quantized readings render the calm EVEN line, never a suppressed delta and never a
 *     fabricated difference the quantize deliberately absorbed.
 *   - The ceiling composes naturally ("in better than 9 in 10 futures instead of 7 of 10") via
 *     slots.xOfTen / xOfTenAtCeiling; a state CHANGE between arms adds the verdict-transition
 *     rider (the 10/10-clamp pivot).
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
import { formatAxisDollar } from './money'

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

/** Intermediate x-axis year ticks between the endpoints: decade steps on a long horizon, fives on
 *  a short one; a tick never lands within the pad of either endpoint label (the bandAnnotations
 *  horizon-pad idea — an endpoint collision is worse than a missing tick). Pure, exported for tests. */
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
 * `agesAt` is the household-ages closure (deriveBandAgesAt — the SAME slot + rule the fan's
 * readout and axis ride, so a scrubbed age here can never disagree with the band's at the same
 * year); absent ⇒ the readout rows carry '' and the ages line drops.
 */
export function composeTwoFutures(
  outcome: TwoArmOutcome,
  withLabel: string,
  withoutLabel: string,
  deltaSlot: (withOdds: string, withoutOdds: string) => string,
  agesAt?: (yearsFromNow: number) => string,
): TwoFuturesView | null {
  if (outcome.kind !== 'two-arm') return null
  const survivorBasis = outcome.deltaBasis === 'survivor'
  const withOdds = survivorBasis ? survivorOddsOf(outcome.with) : oddsOf(outcome.with)
  const withoutOdds = survivorBasis ? survivorOddsOf(outcome.without) : oddsOf(outcome.without)

  const deltaLine =
    withOdds === withoutOdds
      ? slots.rothDeltaEven(withOdds)
      : survivorBasis
        ? deltaSlot(withOdds, withoutOdds)
        : slots.rothDeltaJoint(withOdds, withoutOdds)

  const fromWord = stateWord(outcome.without.headline.outcomeState)
  const toWord = stateWord(outcome.with.headline.outcomeState)
  const stateLine =
    fromWord !== null && toWord !== null && fromWord !== toWord
      ? slots.rothStateShift(fromWord, toWord)
      : undefined

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
        todayLabel: slots.ladderOffsetTick(0),
        horizonLabel: `${maxYears}`,
        readoutAgesLabel: copy.bandReadoutAgesLabel,
        ariaSummary: `${copy.twoFuturesCaption} ${deltaLine}`,
      },
      // The fan's OWN tick builder over the shared humane ceiling — quarters are clean figures
      // by construction, and the two charts can never grow separate dollar-axis dialects.
      yTicks: buildYTicks(ceiling, formatAxisDollar),
      xTicks: deriveTwoFuturesXTicks(maxYears),
      rows,
    }
  }

  return { deltaLine, ...(stateLine ? { stateLine } : {}), ...(yearsLine ? { yearsLine } : {}), ...(series ? { series } : {}) }
}
