/**
 * src/ui/kit/DataTable.tsx: the year-by-year table every Cash Flows view is (plan 3.1; ref 2.0 "Tables";
 * `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`), on TanStack Table v9: a 2 px plum rule
 * across the top, group-header rows on `--stone-250` over their columns (groups may nest: RightCapital's Cash inflows
 * band over its Income inflows group), the column-header row on `--stone-200` with labels that wrap between words,
 * numbers right-aligned with thousands separators and no `$`, negatives in parentheses (`tableNumber`, or the screen's
 * own words), a very faint zebra, the leading Year and Age columns sticky, a header that drills in drawn underlined (a
 * button; a column or a group can drill), and the download button above at the right.
 *
 * On the phone (and wherever the columns outgrow the panel) the table scrolls sideways inside its own frame, the lead
 * columns staying put, and the page never does (ref 2.21). The frame is a focusable named region, so a keyboard
 * reader can scroll it; the table is named by the heading above it (`labelledBy`), never a `<caption>`, which scrolls
 * with the table and is cut at the frame's edge (landmines, UI and product).
 *
 * Row headers: a column marked `rowHeader` is each row's `th scope="row"`, so every cell is tied to its year (or, in a
 * row group, to the run it belongs to). `rowGroup` draws each run of rows sharing a key in its own `<tbody>`, and a
 * `spanGroup` column once per group (`th scope="rowgroup"`, spanning its rows): U15's paired form, a year over two runs.
 *
 * Busy (rows from before the latest change, kept while the new ones are worked out): `aria-busy`, the rows dimmed, and
 * a dashed rule down the frame's left edge, so the state never rests on the dimming alone. The rule's width is held in
 * every state (transparent when idle), so going busy moves nothing.
 */
import { Fragment, useMemo } from 'react'
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
  /** The row's header cell (`th scope="row"`). */
  readonly rowHeader?: boolean
  /** Drawn once per row group, spanning its rows (`th scope="rowgroup"`). Needs `rowGroup`. */
  readonly spanGroup?: boolean
  /** The header drills in (ref 2.0: underlined headers are clickable). */
  readonly onDrill?: () => void
}

export interface DataColumnGroup<Row> {
  readonly id: string
  readonly header: string
  readonly columns: readonly DataTableColumn<Row>[]
  /** The group's header drills in (RightCapital's underlined Income Inflows over its columns). */
  readonly onDrill?: () => void
}

export type DataTableColumn<Row> = DataColumn<Row> | DataColumnGroup<Row>

export interface DataTableProps<Row> {
  /** The id of the heading that names the table (it sits above the frame, never inside it). */
  readonly labelledBy: string
  readonly columns: readonly DataTableColumn<Row>[]
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  /** Rows sharing a key are one group, drawn in their own `<tbody>`. */
  readonly rowGroup?: (row: Row) => string
  /** A numeric cell's text; the kit's whole-dollar, parenthesised-negative format by default. */
  readonly formatNumber?: (n: number) => string
  /** The download button above the table (ref 2.0), its words and its handler. */
  readonly download?: { readonly label: string; readonly onDownload: () => void }
  /** Rows from before the latest change, kept on screen while the new ones are worked out. */
  readonly busy?: boolean
  readonly className?: string
}

const features = tableFeatures({})

const isGroup = <Row,>(c: DataTableColumn<Row>): c is DataColumnGroup<Row> => 'columns' in c

/** The sticky offsets of the first two lead columns (each lead column is 5rem wide). */
const LEAD_OFFSET = ['left-0', 'left-20'] as const

/** A group's name, by how many lead columns are held: it sticks just right of them (and short of the frame's right edge)
 *  while any of its group is in view, and it wraps to the part of the frame the leads leave, so a group scrolled under
 *  the held Year and Age still names its columns (U13's phone look: "Alex's IRA inherited in 2021" read "A inherited
 *  in 2021" under them, its three figures named by nothing). Inside the cell's 0.75rem padding; `100cqw` is the frame. */
const GROUP_NAME_HELD = [
  'left-3 max-w-[calc(100cqw_-_1.5rem)]',
  'left-[5.75rem] max-w-[calc(100cqw_-_6.5rem)]',
  'left-[10.75rem] max-w-[calc(100cqw_-_11.5rem)]',
] as const

const DRILL_CLASSES = 'cursor-pointer underline underline-offset-4 hover:text-stone-900'

/** The white gutters between header groups, drawn inside each cell (inset shadows), never as side borders: a collapsed
 *  table's side border runs up through the 2 px plum top rule and cut a white gap in it where each band began. */
const BAND_GUTTERS = 'shadow-[inset_2px_0_0_var(--color-bg),inset_-2px_0_0_var(--color-bg)]'

export function DataTable<Row extends RowData>({
  labelledBy,
  columns,
  rows,
  rowKey,
  rowGroup,
  formatNumber = tableNumber,
  download,
  busy = false,
  className,
}: DataTableProps<Row>) {
  const { defs, specs, groups } = useMemo(() => {
    const helper = createColumnHelper<typeof features, Row>()
    const specs = new Map<string, DataColumn<Row>>()
    const groups = new Map<string, DataColumnGroup<Row>>()
    const build = (c: DataTableColumn<Row>): ColumnDef<typeof features, Row, unknown> => {
      if (isGroup(c)) {
        groups.set(c.id, c)
        return helper.group({ id: c.id, header: c.header, columns: c.columns.map(build) }) as ColumnDef<typeof features, Row, unknown>
      }
      specs.set(c.id, c)
      return helper.accessor((row: Row) => c.value(row), { id: c.id, header: c.header }) as ColumnDef<typeof features, Row, unknown>
    }
    const defs = columns.map(build)
    return { defs, specs, groups }
  }, [columns])

  const data = useMemo(() => [...rows], [rows])
  const table = useTable({ features, columns: defs, data, getRowId: (row: Row) => rowKey(row) })

  const leaves = useMemo(() => [...specs.values()], [specs])
  const leadIndex = (id: string): number => {
    let i = 0
    for (const spec of leaves) {
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
  const leadCount = Math.min(LEAD_OFFSET.length, leaves.filter((s) => s.lead).length)

  // The body's row groups: each run of rows sharing a key (or each row alone).
  const bodies = useMemo(() => {
    const out: { key: string; rows: Row[] }[] = []
    for (const row of rows) {
      const key = rowGroup === undefined ? rowKey(row) : rowGroup(row)
      const last = out[out.length - 1]
      if (rowGroup !== undefined && last !== undefined && last.key === key) last.rows.push(row)
      else out.push({ key, rows: [row] })
    }
    return out
  }, [rows, rowGroup, rowKey])

  const cellText = (spec: DataColumn<Row>, row: Row): string => {
    const v = spec.value(row)
    return typeof v === 'number' && spec.numeric ? formatNumber(v) : String(v)
  }

  const bodyRow = (row: Row, first: boolean, span: number, zebra: string) => (
    <tr key={rowKey(row)} data-row-key={rowKey(row)} className={zebra}>
      {leaves.map((spec) => {
        if (spec.spanGroup && rowGroup !== undefined && !first) return null
        const classes = cn('bg-inherit px-3 py-1.5', spec.numeric ? 'text-right' : 'text-left', leadClasses(spec.id))
        const text = cellText(spec, row)
        if (spec.spanGroup && rowGroup !== undefined) {
          return (
            <th key={spec.id} scope="rowgroup" rowSpan={span} className={cn(classes, 'align-top font-regular whitespace-nowrap')}>
              {text}
            </th>
          )
        }
        if (spec.rowHeader) {
          return (
            <th key={spec.id} scope="row" className={cn(classes, 'font-regular', spec.lead ? 'whitespace-nowrap' : 'min-w-28')}>
              {/* A row header that is not a lead (a run's name) wraps between words inside a held measure. */}
              {spec.lead ? text : <span className="block max-w-48">{text}</span>}
            </th>
          )
        }
        return (
          <td key={spec.id} className={cn(classes, 'whitespace-nowrap')}>
            {text}
          </td>
        )
      })}
    </tr>
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {download !== undefined ? (
        <div className="flex justify-end">
          <Button variant="secondary" icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={download.onDownload}>
            {download.label}
          </Button>
        </div>
      ) : null}
      <div
        role="region"
        aria-labelledby={labelledBy}
        tabIndex={0}
        data-table-frame=""
        data-busy={busy || undefined}
        className={cn('@container max-w-full overflow-x-auto border-l-2 border-dashed', busy ? 'border-stone-600' : 'border-transparent')}
      >
        <table
          aria-labelledby={labelledBy}
          aria-busy={busy || undefined}
          className="w-full border-t-2 border-plum text-body text-stone-900 tabular-nums"
        >
          <thead>
            {headerGroups.map((group, rowIndex) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const id = header.column.id
                  const spec = specs.get(id)
                  const isLeafRow = rowIndex === lastRow
                  if (header.isPlaceholder || (!isLeafRow && spec !== undefined)) {
                    // Inside a group's band the blank carries the band's fill (no white hole under "Cash outflows"); a
                    // column under no group (Year, Age) stays white above its header, as RightCapital draws it.
                    const inBand = header.column.parent !== undefined
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        aria-hidden="true"
                        className={cn(inBand ? cn(BAND_GUTTERS, 'bg-stone-250') : 'bg-bg', leadClasses(id))}
                      />
                    )
                  }
                  if (spec === undefined) {
                    const g = groups.get(id)
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        scope="colgroup"
                        data-group={id}
                        className={cn(BAND_GUTTERS, 'bg-stone-250 px-3 py-2 text-center font-regular text-stone-900')}
                      >
                        <span className={cn('sticky right-3 inline-block', GROUP_NAME_HELD[leadCount])} data-group-name="">
                          {g?.onDrill !== undefined ? (
                            <button type="button" onClick={g.onDrill} className={DRILL_CLASSES}>
                              {g.header}
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </span>
                      </th>
                    )
                  }
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      data-col={spec.id}
                      className={cn(
                        'bg-stone-200 px-3 py-2 align-bottom font-regular text-stone-600',
                        spec.numeric ? 'text-right' : 'text-left',
                        leadClasses(spec.id),
                      )}
                    >
                      {spec.onDrill !== undefined ? (
                        <button type="button" onClick={spec.onDrill} className={cn(DRILL_CLASSES, spec.numeric && 'text-right')}>
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
          {rowGroup === undefined ? (
            <tbody className={cn(busy && 'opacity-60')}>
              {rows.map((row) => bodyRow(row, true, 1, 'odd:bg-bg even:bg-stone-50'))}
            </tbody>
          ) : (
            bodies.map((b, i) => (
              <Fragment key={b.key}>
                <tbody data-row-group={b.key} className={cn('border-t border-stone-300', busy && 'opacity-60')}>
                  {/* The group's fill sits on each row, never the tbody alone: a sticky lead cell's bg-inherit copies its
                      row's, and a row with no fill of its own let the scrolled figures show through the held year. */}
                  {b.rows.map((row, k) => bodyRow(row, k === 0, b.rows.length, i % 2 === 0 ? 'bg-bg' : 'bg-stone-50'))}
                </tbody>
              </Fragment>
            ))
          )}
        </table>
      </div>
    </div>
  )
}
