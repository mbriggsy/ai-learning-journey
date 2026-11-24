/**
 * src/ui/kit/DataTable.tsx: the year-by-year table every Cash Flows view is (plan 3.1; ref 2.0 "Tables";
 * `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`), on TanStack Table v9: a 2 px plum rule
 * across the top, an optional group-header row on `--stone-250` over its columns, the column-header row on
 * `--stone-200` with labels that wrap between words, numbers right-aligned with thousands separators and no `$`,
 * negatives in parentheses (`tableNumber`, or the screen's own format), a very faint zebra, the leading Year and Age
 * columns sticky, a header that drills in drawn underlined (a button), and the download button above at the right.
 *
 * On the phone (and wherever the columns outgrow the panel) the table scrolls sideways inside its own frame, the lead
 * columns staying put, and the page never does (ref 2.21). The frame is a focusable named region, so a keyboard
 * reader can scroll it; the table is named by the heading above it (`labelledBy`), never a `<caption>`, which scrolls
 * with the table and is cut at the frame's edge (landmines, UI and product).
 */
import { useMemo } from 'react'
import { createColumnHelper, tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { Button } from './Button'
import { cn } from './cn'
import { tableNumber } from './format'

export interface DataColumn<Row> {
  readonly id: string
  readonly header: string
  readonly value: (row: Row) => number | string
  /** Right-aligned and printed through the table's number format. */
  readonly numeric?: boolean
  /** A leading column (Year, Age): sticky at the left while the rest scrolls. At most two, first in the list. */
  readonly lead?: boolean
  /** The header drills in (ref 2.0: underlined headers are clickable). */
  readonly onDrill?: () => void
}

export interface DataColumnGroup<Row> {
  readonly id: string
  readonly header: string
  readonly columns: readonly DataColumn<Row>[]
}

export type DataTableColumn<Row> = DataColumn<Row> | DataColumnGroup<Row>

export interface DataTableProps<Row> {
  /** The id of the heading that names the table (it sits above the frame, never inside it). */
  readonly labelledBy: string
  readonly columns: readonly DataTableColumn<Row>[]
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  /** A numeric cell's text; the kit's whole-dollar, parenthesised-negative format by default. */
  readonly formatNumber?: (n: number) => string
  /** The download button above the table (ref 2.0), its words and its handler. */
  readonly download?: { readonly label: string; readonly onDownload: () => void }
  readonly className?: string
}

const features = tableFeatures({})

const isGroup = <Row,>(c: DataTableColumn<Row>): c is DataColumnGroup<Row> => 'columns' in c

/** The sticky offsets of the first two lead columns (each lead column is 5rem wide). */
const LEAD_OFFSET = ['left-0', 'left-20'] as const

export function DataTable<Row extends RowData>({
  labelledBy,
  columns,
  rows,
  rowKey,
  formatNumber = tableNumber,
  download,
  className,
}: DataTableProps<Row>) {
  const { defs, specs } = useMemo(() => {
    const helper = createColumnHelper<typeof features, Row>()
    const specs = new Map<string, DataColumn<Row>>()
    const leaf = (c: DataColumn<Row>) => {
      specs.set(c.id, c)
      return helper.accessor((row: Row) => c.value(row), { id: c.id, header: c.header }) as ColumnDef<typeof features, Row, unknown>
    }
    const defs: ColumnDef<typeof features, Row, unknown>[] = columns.map((c) =>
      isGroup(c) ? helper.group({ id: c.id, header: c.header, columns: c.columns.map(leaf) }) : leaf(c),
    )
    return { defs, specs }
  }, [columns])

  const data = useMemo(() => [...rows], [rows])
  const table = useTable({ features, columns: defs, data, getRowId: (row: Row) => rowKey(row) })

  const leadIndex = (id: string): number => {
    let i = 0
    for (const spec of specs.values()) {
      if (!spec.lead) break
      if (spec.id === id) return i
      i += 1
    }
    return -1
  }
  const leadClasses = (id: string): string | false => {
    const i = leadIndex(id)
    return i >= 0 && i < LEAD_OFFSET.length && cn('sticky z-[1] w-20 min-w-20', LEAD_OFFSET[i])
  }

  const headerGroups = table.getHeaderGroups()
  const lastRow = headerGroups.length - 1

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {download !== undefined ? (
        <div className="flex justify-end">
          <Button variant="secondary" icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={download.onDownload}>
            {download.label}
          </Button>
        </div>
      ) : null}
      <div role="region" aria-labelledby={labelledBy} tabIndex={0} className="max-w-full overflow-x-auto">
        <table aria-labelledby={labelledBy} className="w-full border-t-2 border-plum text-body text-stone-900 tabular-nums">
          <thead>
            {headerGroups.map((group, rowIndex) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const spec = specs.get(header.column.id)
                  const isLeafRow = rowIndex === lastRow
                  if (header.isPlaceholder || (!isLeafRow && spec !== undefined)) {
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        aria-hidden="true"
                        className={cn('bg-bg', leadClasses(header.column.id))}
                      />
                    )
                  }
                  if (!isLeafRow || spec === undefined) {
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        scope="colgroup"
                        className="border-x-2 border-bg bg-stone-250 px-3 py-2 text-center font-regular text-stone-900"
                      >
                        <table.FlexRender header={header} />
                      </th>
                    )
                  }
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        'bg-stone-200 px-3 py-2 align-bottom font-regular text-stone-600',
                        spec.numeric ? 'text-right' : 'text-left',
                        leadClasses(spec.id),
                      )}
                    >
                      {spec.onDrill !== undefined ? (
                        <button
                          type="button"
                          onClick={spec.onDrill}
                          className={cn('cursor-pointer underline underline-offset-4 hover:text-stone-900', spec.numeric && 'text-right')}
                        >
                          {spec.header}
                        </button>
                      ) : (
                        spec.header
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="odd:bg-bg even:bg-stone-50">
                {row.getAllCells().map((cell) => {
                  const spec = specs.get(cell.column.id)
                  const v = cell.getValue()
                  const text = typeof v === 'number' && spec?.numeric ? formatNumber(v) : String(v)
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'bg-inherit px-3 py-1.5 whitespace-nowrap',
                        spec?.numeric ? 'text-right' : 'text-left',
                        leadClasses(cell.column.id),
                      )}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
