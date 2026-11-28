/**
 * src/engine/homeSale.ts: the taxed part of a home sale's gain, ONE rule (gap 5's plan,
 * `docs/plans/features/one-time-money-in-build-spec.md`, R8, KTD4 to KTD6). The year loop reads it (U9) and intake's
 * drawer read-back calls it too (U10), so the run and the words can never compute a sale's tax base differently (the
 * `workingYearCredit` precedent in `moneyGrain.ts`).
 *
 * ONE FRAME (KTD4). The household types the sale amount in TODAY's dollars and the price paid in the FIXED dollars it
 * was paid in, and the statute's exclusion is fixed too (`homeSaleExclusion`, frozen since 1997). The caller hands the
 * household-figure deflator for the sale year (intake's `nominalDeflator`), and both fixed figures are divided by that
 * one number, so the gain and the part left out are compared in the same dollars. This module reads no price index of
 * its own.
 *
 * WHICH AMOUNT A PATH LEAVES OUT (KTD6, R8). An excludable sale (intake's flag: the main-home answer, and no other
 * main-home sale 2 or fewer calendar years before) leaves out the joint figure while two people are living, and in the
 * first year with one living after the household started as two; the single figure in any later survivor year and for
 * a household that started as one; nothing when not excludable. A person is living in sim year t while
 * `t < deathOffset` (`simulate.ts`), so they are counted through the year they die, and the first year with one living
 * is the earliest `deathOffset` itself: always within §121(b)(4)'s "not later than 2 years after the date of death".
 * The year after may not be, so it gets the single figure (gloomy, never rosy).
 *
 * A LOSS IS NOT A DEDUCTION. A home sold for less than was paid has no taxed gain: every figure here is floored at $0,
 * and a loss on one home never offsets another's gain (each sale is its own call).
 *
 * PURE: no clock, entropy or environment. Called only for a year in which someone is living (R6: after both have died
 * the sale is not counted, so no caller asks).
 */
import { homeSaleExclusion } from './constants/tax'
import type { HomeSaleGainInput, OneTimeInflowParams } from '@shared/model'

/** One sale's figures, as intake hands them to the engine (KTD4). Declared in the shared model, where the engine's
 *  params item carries it (`OneTimeInflowParams.homeSale`, U9), and re-exported here beside the rule that reads it. */
export type { HomeSaleGainInput }

/** A sale's gain in one path's sale year, in today's dollars. */
export interface HomeSaleGain {
  /** The whole gain before any exclusion, floored at $0: what a state that leaves nothing out taxes (KTD7). */
  readonly wholeGainReal: number
  /** The part of the gain left out on this path in this year (0 when not excludable, never more than the gain). */
  readonly excludedReal: number
  /** The federally taxed part, floored at $0: the year's long-term capital gain (R8). */
  readonly taxedReal: number
}

/** Does this path leave out the JOINT figure in sim year `t` (KTD6)? Two or more people started, and the first death
 *  has not come before this year: everyone is living (`t` before every `deathOffset`), or this is the first year with
 *  one living (`t` equal to the earliest `deathOffset`). A household that started as one never does. */
export function homeSaleJointExclusionAt(t: number, deathOffsets: readonly number[]): boolean {
  if (deathOffsets.length < 2) return false
  return t <= Math.min(...deathOffsets)
}

/**
 * The gain of one sale on one path in its sale year `t` (KTD4, KTD6): the sale amount less the price paid deflated to
 * the sale year, less the exclusion deflated the same way when the sale is excludable. `deathOffsets` holds, for each
 * person who started in the household, the first sim year they are not living, as `simulate.ts` builds it.
 */
export function homeSaleTaxableGain(sale: HomeSaleGainInput, t: number, deathOffsets: readonly number[]): HomeSaleGain {
  const costReal = sale.paidDollars / sale.deflator
  const wholeGainReal = Math.max(0, sale.soldForReal - costReal)
  if (!sale.excludable) return { wholeGainReal, excludedReal: 0, taxedReal: wholeGainReal }
  const figure = homeSaleJointExclusionAt(t, deathOffsets) ? homeSaleExclusion.value.joint : homeSaleExclusion.value.single
  const excludedReal = Math.min(wholeGainReal, figure / sale.deflator)
  return { wholeGainReal, excludedReal, taxedReal: wholeGainReal - excludedReal }
}

/** The state channels of one year's sales (KTD7), each PRESENT only when a sale of its kind is dated in the year. */
export interface HomeSaleStateChannels {
  /** The federally taxed slices of the year's excludable sales (NC taxes them; PA exempts a main-home gain whole). */
  readonly homeSaleGainExcludable?: number
  /** The whole gains of the year's other sales (with no exclusion that is their federal slice; NC and PA tax them). */
  readonly homeSaleGainNotExcludable?: number
}

/** One sim year's home sales on one path (U9): the federal slice and the state channels, summed over the year's sales
 *  with every sale's figures floored at $0 by {@link homeSaleTaxableGain} before summing (a loss on one home never
 *  offsets another's gain). */
export interface HomeSaleYear {
  /** The federally taxed slice: the year's long-term gain from its sales (R8). */
  readonly taxedReal: number
  readonly stateChannels: HomeSaleStateChannels
}

/**
 * The home sales dated in `calendarYear` (sim year `t`), on a path whose people's first sim years not living are
 * `deathOffsets` (KTD6), or `undefined` when no sale is dated in it — so every caller keeps its literal no-sale
 * expression in such a year (insight 093). Gifts are skipped. The caller asks only for a year someone is living (R6).
 */
export function homeSaleYear(
  items: readonly OneTimeInflowParams[],
  calendarYear: number,
  t: number,
  deathOffsets: readonly number[],
): HomeSaleYear | undefined {
  let any = false
  let taxedReal = 0
  let excludable: number | undefined
  let notExcludable: number | undefined
  for (const item of items) {
    const sale = item.homeSale
    if (sale === undefined || item.year !== calendarYear) continue
    any = true
    const gain = homeSaleTaxableGain(sale, t, deathOffsets)
    taxedReal += gain.taxedReal
    if (sale.excludable) excludable = (excludable ?? 0) + gain.taxedReal
    else notExcludable = (notExcludable ?? 0) + gain.wholeGainReal
  }
  if (!any) return undefined
  return {
    taxedReal,
    stateChannels: {
      ...(excludable !== undefined ? { homeSaleGainExcludable: excludable } : {}),
      ...(notExcludable !== undefined ? { homeSaleGainNotExcludable: notExcludable } : {}),
    },
  }
}

/** Does the run's list carry a home sale? (Every reader of a sale's tax keys on this, never on the list alone: a
 *  gift-only run is byte-identical to the gift half, U9.) */
export function carriesHomeSale(items: readonly OneTimeInflowParams[] | undefined): items is readonly OneTimeInflowParams[] {
  return items !== undefined && items.some((item) => item.homeSale !== undefined)
}
