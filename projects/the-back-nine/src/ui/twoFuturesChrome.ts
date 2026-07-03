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
import type { TwoFuturesLabels, TwoFuturesPoint } from '@viz/TwoFutures'
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
  return r.bandFan.byYear.map((y) => ({ yearsFromNow: y.yearsFromNow, medianReal: y.p50 }))
}

/**
 * Compose the whole view from a two-arm outcome. `withLabel`/`withoutLabel` name THIS control's
 * arms (the Roth lever and the sequencing picker word their own series). Returns null for the
 * indeterminate/infeasible outcomes — the surfaces own those calm states.
 */
export function composeTwoFutures(
  outcome: TwoArmOutcome,
  withLabel: string,
  withoutLabel: string,
  deltaSlot: (withOdds: string, withoutOdds: string) => string,
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
    series = {
      withArm: withPts,
      withoutArm: withoutPts,
      labels: {
        withLabel,
        withoutLabel,
        dollarMaxLabel: `~${formatAxisDollar(maxDollar)}`,
        todayLabel: slots.ladderOffsetTick(0),
        horizonLabel: `${maxYears}`,
        ariaSummary: `${copy.twoFuturesCaption} ${deltaLine}`,
      },
    }
  }

  return { deltaLine, ...(stateLine ? { stateLine } : {}), ...(yearsLine ? { yearsLine } : {}), ...(series ? { series } : {}) }
}
