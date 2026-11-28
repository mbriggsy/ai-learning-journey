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

/** One sale's figures, as intake hands them to the engine (KTD4). */
export interface HomeSaleGainInput {
  /** What the home sells for after agent fees and closing costs (the amount realized), in TODAY's dollars. */
  readonly soldForReal: number
  /** What was paid for it, plus buying costs and improvements, in the FIXED dollars it was paid in. */
  readonly paidDollars: number
  /** Whether any of the gain may be left out (KTD6: decided by intake from the main-home answer and the list). */
  readonly excludable: boolean
  /** The household-figure deflator for the sale year (fixed dollars ÷ this = today's dollars), at least 1. */
  readonly deflator: number
}

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
