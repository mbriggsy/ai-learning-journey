/**
 * Money and percent text for intake (D1's currency discipline): the parse a field commits through and the format it
 * displays, read by the fields and by every module that quotes an entered figure (`sanity.ts`, the working-year
 * quote and left over, the workbench's chrome). Moved out of `fields.tsx` by Act 6's RC0, unchanged, so no `.ts`
 * module imports a component file.
 */

const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Parse a human money string → raw number (strip $ , spaces). Empty/garbage →
 *  undefined (an absent fact — burned/062 sentinel territory, never 0). */
export function parseMoney(text: string): number | undefined {
  // $ and whitespace are pure formatting noise — strip them. COMMAS are
  // magnitude-bearing, so VALIDATE the grouping before stripping: plain digits
  // OR correctly-grouped thousands, optional single decimal. This rejects the
  // silent magnitude traps strip-then-Number admits — misgrouped commas
  // ('100,00'→10000), exponent ('1e6'→1000000), hex ('0x186a0'→100000) — so a
  // fat-fingered figure shows its absent-fact state, never a plausible-but-wrong
  // number (the calm-but-wrong class on a financial field; D1 review AB2).
  const cleaned = text.replace(/[$\s]/g, '')
  if (cleaned === '') return undefined
  if (!/^(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/.test(cleaned)) return undefined
  const n = Number(cleaned.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function formatMoney(value: number | undefined): string {
  return value === undefined ? '' : usd.format(value)
}

const usdCents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Two figures for one sentence, in whole dollars — unless they round to the SAME dollar, where both
 *  print to the cent so the sentence still shows that they differ (a comparison made at the cent,
 *  like KTD21's stale check, must never read "$84,000 … now $84,000"). */
export function formatMoneyPair(a: number, b: number): readonly [string, string] {
  const whole = [formatMoney(a), formatMoney(b)] as const
  return whole[0] === whole[1] && a !== b ? [usdCents.format(a), usdCents.format(b)] : whole
}

/** Parse a human percent string → raw FRACTION (e.g. "50" → 0.5, "2.5" → 0.025).
 *  Empty/garbage → undefined (an absent fact — never 0; burned/062). Accepts a
 *  bounded magnitude only (a plain number, optional single decimal); rejects the
 *  same exponent/hex/misgroup traps `parseMoney` does. */
export function parsePercent(text: string): number | undefined {
  const cleaned = text.replace(/[%\s]/g, '')
  if (cleaned === '') return undefined
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n / 100 : undefined
}

/** The decimals of a percent a percent box shows: the one grain {@link formatPercent} and {@link snapPercentToShown} read. */
const PERCENT_DIGITS = 2
const pctFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: PERCENT_DIGITS })

export function formatPercent(fraction: number | undefined): string {
  return fraction === undefined ? '' : pctFmt.format(fraction * 100)
}

/**
 * A parsed rate snapped to the grain its box shows, so the figure stored and judged is the figure on screen (gap 4's
 * review, leftover (e)): "15.004" is the 15% the box shows (inside "up to 15%"), "0.001" is the 0% it shows (refused
 * beside it as not more than 0%), never a hidden 15.004% refused under a "15" or a hidden 0.001% allowed under a "0". A
 * figure already on the grain keeps its exact parse, so "3.75" stores `3.75 / 100` to the bit.
 */
export function snapPercentToShown(fraction: number): number {
  const scale = 100 * 10 ** PERCENT_DIGITS
  const snapped = Math.round(fraction * scale) / scale
  return Math.abs(snapped - fraction) < 1e-12 ? fraction : snapped
}
