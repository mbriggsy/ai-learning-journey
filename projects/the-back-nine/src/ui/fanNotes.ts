/**
 * src/ui/fanNotes.ts: the lines that ride with a balance fan wherever it draws (Snapshot's fan card and Confidence;
 * plan docs/plans/6-rightcapital-ui-plan.md, 4.0's disclosure map). Pure; every word through `copy.ts`.
 *
 * - THE TRACK NOTE (`bandTrackNote`, the old date hero's `bandTracknote`, ported whole when RC4a deleted
 *   `FuckOffDate.tsx` and left it with no reader): on the date route every fan says whose world it prices, read off the
 *   band's OWN published track (`band.track`), never split-ness (council 2026-07-30). Floor-keyed (the lifestyle track
 *   undated, the band on the essentials pass): "prices your essentials only"; lifestyle-keyed: it affirms the full
 *   budget, with the working-year figure where the run counts one apart from the spending (W8-R7). With a budget both
 *   spending levels are named; without one there is no second level to name (never a fabricated figure). While a run on
 *   newer inputs is in flight, the line adds that the latest change isn't in these figures yet.
 * - THE AGED PREMISE (`fanPremise`, U17 §S2): a fan that draws the "Plan built" moment draws modelled years between the
 *   build and today, so it ships beside the sentence saying so: the save's year where the balances were saved in an
 *   earlier year (`agedBalancesYear`), else the build year (a re-saver's balances are this year's, the picture still runs
 *   from the build). Its re-confirm door rides only where the tab can write.
 */
import type { XAnnotation } from '@viz/bandData'
import type { FuckOffDateView } from './answerView'
import { copy, slots } from './copy'
import { formatAbsoluteDollar } from './money'

type DatesView = Extract<FuckOffDateView, { kind: 'dates' }>

/** The fan's track note on the date route; null where no band draws. */
export function bandTrackNote(view: Pick<DatesView, 'band' | 'spendLevels' | 'workingYearFigure' | 'refiguring'>): string | null {
  const band = view.band
  if (band === undefined) return null
  const t = band.track
  const s = view.spendLevels
  const w = view.workingYearFigure
  let note: string
  if (s === undefined) {
    note = t === 'floor' ? copy.bandPricesEssentialsNote : w === undefined ? copy.bandPricesFullBudgetNote : slots.bandCountsWorkingYearsNote(w.figure, w.quote, w.last)
  } else {
    const full = formatAbsoluteDollar(s.full)
    const essentials = formatAbsoluteDollar(s.essentials)
    // Both levels are the first year's ("to start"); a repeat charged in it is named (gap 4's U15) right after the FULL
    // figure, which holds it: after the essentials figure an extra's repeat would read as inside the essentials (the
    // review of gap 4's line half). On the floor arm the full figure is the last sentence, so it follows it there.
    const repeat = s.firstYearRepeat
    note =
      t === 'floor'
        ? slots.bandPricesEssentialsWithLevels(essentials, full) + (repeat !== undefined ? ` ${repeat}` : '')
        : w === undefined
          ? slots.bandPricesFullBudgetWithLevels(full, essentials, repeat)
          : slots.bandCountsWorkingYearsWithLevels(w.figure, w.last, full, essentials, repeat)
  }
  return view.refiguring === true ? `${note} ${copy.answerRefiguringCaption}` : note
}

/** The aged fan's premise line and its door. */
export interface FanPremise {
  readonly text: string
  /** The guided re-walk (re-confirm your numbers); absent on a read-only tab, whose words say where it happens. */
  readonly door?: { readonly label: string }
}

/** The premise beside a fan whose moments draw "Plan built" (an aged plan); null on a fresh one. */
export function fanPremise(
  moments: readonly XAnnotation[],
  agedBalancesYear: number | undefined,
  buildYear: number,
  readOnly: boolean,
): FanPremise | null {
  if (!moments.some((m) => m.id === 'built')) return null
  const text = agedBalancesYear !== undefined ? slots.bandAgedPremiseSaved(agedBalancesYear) : slots.bandAgedPremiseFresh(buildYear)
  // "Until you re-confirm" with no door would point at nothing: a read-only tab says where it happens.
  return readOnly ? { text: `${text} ${copy.bandPremiseReadOnly}` } : { text, door: { label: copy.bandPremiseReconfirmCta } }
}
