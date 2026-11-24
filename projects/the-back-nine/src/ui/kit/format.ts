/**
 * src/ui/kit/format.ts: the kit's one table-figure format (plan 4.0, "Figures"; ref 3.5): whole dollars with
 * thousands separators, no `$`, negatives in parentheses. A screen may pass its own format to `DataTable`; this is the
 * default. Pure, so the kit never reaches for `copy.ts` or a screen's composer to print a cell.
 */

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** `1234.4` → `1,234`; `-1234` → `(1,234)`; a figure that rounds to zero prints `0`, never `(0)` or `-0`. */
export function tableNumber(n: number): string {
  if (!Number.isFinite(n)) return ''
  const rounded = Math.round(n)
  if (rounded === 0) return '0'
  return rounded < 0 ? `(${whole.format(-rounded)})` : whole.format(rounded)
}
