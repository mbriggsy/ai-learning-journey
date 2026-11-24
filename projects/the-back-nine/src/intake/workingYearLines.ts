/** The money picture's later-year lines (`WorkingYearLedger.tsx` words them). Moved out of `WorkingYearLedger.tsx` by
 *  Act 6's RC0, unchanged. */
import type { WorkingYearLedgerLaterYear } from '@shared/model'

const isStillShortOnly = (y: WorkingYearLedgerLaterYear): boolean =>
  y.events.length === 1 && y.events[0]?.code === 'stillShort'

/** A later-year line: one named year, or a run — an anchor short year (or year 0, `anchor: null`)
 *  followed by consecutive short years no event explains. */
export type LaterLine =
  | { readonly kind: 'year'; readonly year: WorkingYearLedgerLaterYear }
  | { readonly kind: 'run'; readonly anchor: WorkingYearLedgerLaterYear | null; readonly years: WorkingYearLedgerLaterYear[] }

/** Collapse each run of `stillShort`-only years into its anchor (KTD12, U8: "short each year from
 *  2030 through 2033", naming the first year's cause). A `stillShort` year always follows a short
 *  year the picture names — a later entry, or year 0 itself. */
export function laterLines(laterYears: readonly WorkingYearLedgerLaterYear[]): readonly LaterLine[] {
  const out: LaterLine[] = []
  for (const y of laterYears) {
    const prev = out[out.length - 1]
    if (isStillShortOnly(y)) {
      const prevLast = prev === undefined ? undefined : prev.kind === 'year' ? prev.year : prev.years[prev.years.length - 1]
      if (prev !== undefined && prevLast !== undefined && prevLast.yearsIn === y.yearsIn - 1 && prevLast.bottomLine < 0) {
        out[out.length - 1] =
          prev.kind === 'year'
            ? { kind: 'run', anchor: prev.year, years: [prev.year, y] }
            : { kind: 'run', anchor: prev.anchor, years: [...prev.years, y] }
        continue
      }
      out.push({ kind: 'run', anchor: null, years: [y] })
      continue
    }
    out.push({ kind: 'year', year: y })
  }
  return out
}
