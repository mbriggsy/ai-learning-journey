/**
 * The money picture's printed grain, in one leaf (build 2 KTD4): the cent snap, KTD12's bottom line on it, and the
 * finiteness guard they call. Moved out of `workingYearLedger.ts`, unchanged but for `finite`'s error label, so
 * the tax overlay can read the same grain as the picture it prints: the overlay cannot import the ledger, which
 * imports the overlay. This leaf imports nothing (a source test pins it), and `workingYearLedger.ts` re-exports
 * {@link workingYearBottomLine}.
 *
 * PURE: no clock, entropy or environment.
 */

/** `x` itself, or a throw on NaN or ±Infinity (DND 009). The label names this leaf, never a caller: the money
 *  picture and the tax overlay both call it. */
export const finite = (x: number, label: string): number => {
  if (!Number.isFinite(x)) throw new Error(`[moneyGrain] ${label} is not finite (${x}) — DND 009`)
  return x
}

/** How far past a half cent float dust may land and still be read as the tie (a millionth of a cent — far
 *  below any money, and far above the float dust of a sum of real-money terms at any household's scale: one
 *  float step in cents stays under it below about $85 million of cash). */
const HALF_CENT_DUST = 1e-6
/** A figure in whole cents, never −0: the nearest cent, a half-cent tie (within dust) toward −∞ — the gloomy
 *  side of every line and of the cash (`Math.round` would settle the tie by the dust's sign, upward on a
 *  true tie: −$12.005 would read "Short $12"). */
export const toCents = (dollars: number): number => Math.ceil(dollars * 100 - 0.5 - HALF_CENT_DUST) + 0

/** KTD12's bottom line on a cash already in cents. */
export function bottomLineFromCents(cashCents: number): number {
  return cashCents < 0 ? -Math.ceil(-cashCents / 100) : Math.floor(cashCents / 100) + 0
}

/** The picture's bottom line for an engine cash: KTD12's rule on the cash snapped to the cent. */
export function workingYearBottomLine(cash: number): number {
  return bottomLineFromCents(toCents(finite(cash, 'the cash')))
}
