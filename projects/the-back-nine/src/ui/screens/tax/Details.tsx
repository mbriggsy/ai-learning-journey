/**
 * src/ui/screens/tax/Details.tsx: Tax → Tax Strategies → Details, the panel (plan RC8;
 * `rc-cashflow-tax/help-tax-tax-strategies-details-tab-02.png` to `-04.png`). Draws `taxRunsView.ts`'s details: the
 * heading naming the strategy and its market, the table switcher, the strategy and market selects, then the kit's
 * table (no `$`, negatives in parentheses, Year and Age sticky). The tax-details table (federal tax and the top bracket)
 * waits for map gap 10. A scrolling page.
 */
import { useId, type ReactNode } from 'react'
import { DataTable, LoadingVeil, Select, type DataTableColumn } from '../../kit'
import { copy } from '../../copy'
import { FutureSelect } from './Comparison'
import { DETAILS_PICKS, DETAILS_TABLES, type DetailsPick, type DetailsRow, type DetailsTable, type DetailsView, type TaxFuture } from './taxRunsView'

export function DetailsPanel({
  view,
  table,
  onTable,
  pick,
  onPick,
  future,
  onFuture,
  caveat,
}: {
  readonly view: DetailsView
  readonly table: DetailsTable
  readonly onTable: (t: DetailsTable) => void
  readonly pick: DetailsPick
  readonly onPick: (p: DetailsPick) => void
  readonly future: TaxFuture
  readonly onFuture: (f: TaxFuture) => void
  readonly caveat: ReactNode
}) {
  const headingId = useId()
  const columns: DataTableColumn<DetailsRow>[] =
    view.kind === 'table'
      ? view.columns.map((c) => ({
          id: c.id,
          header: c.header,
          value: (r: DetailsRow) => r.cells[c.id] ?? '',
          ...(c.numeric ? { numeric: true } : {}),
          ...(c.lead ? { lead: true } : {}),
          ...(c.id === 'year' ? { rowHeader: true } : {}),
        }))
      : []
  return (
    <div className="flex flex-col gap-4" data-details={view.kind} data-details-table={table}>
      <div className="flex flex-col gap-4 wide:flex-row wide:items-end wide:justify-between">
        <h2 id={headingId} className="text-chart-title font-regular text-plum" data-details-heading="">
          {view.kind === 'table' ? view.heading : copy.taxStratDetailsTitle}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <Select label={copy.taxStratTableLabel} items={DETAILS_TABLES} value={table} onValueChange={onTable} />
          <Select label={copy.taxStratPlanLabel} items={DETAILS_PICKS} value={pick} onValueChange={onPick} />
          <FutureSelect value={future} onValueChange={onFuture} />
        </div>
      </div>
      {view.kind !== 'table' ? (
        <p className="py-12 text-center text-body text-stone-900" data-details-words="">
          {view.words}
        </p>
      ) : view.empty !== undefined ? (
        <p className="py-8 text-center text-body text-stone-900" data-details-empty="">
          {view.empty}
        </p>
      ) : (
        <LoadingVeil loading={view.updating} label={copy.taxStratRunsWaiting}>
          <DataTable labelledBy={headingId} columns={columns} rows={view.rows} rowKey={(r) => r.key} busy={view.updating} />
        </LoadingVeil>
      )}
      {view.kind === 'table'
        ? view.notes.map((n) => (
            <p key={n} className="text-label text-stone-600">
              {n}
            </p>
          ))
        : null}
      {caveat}
    </div>
  )
}
