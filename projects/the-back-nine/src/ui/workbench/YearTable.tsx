/*
 * src/ui/workbench/YearTable.tsx — the year-by-year table (workbench plan U7). It renders what `composeYearTable`
 * returns and nothing else: no figure is worked out here.
 *
 * The three named states (U7's Approach): FIRST LOAD, a reserved frame with status words; UPDATING, the prior rows stay,
 * marked in words and with a cue that is not color (a dashed rule beside the rows, dimmed ink), `aria-busy` set; ERROR,
 * one calm sentence and the rows withheld, with no retry (a lane never re-sends after a failure, KTD13; the answer's
 * own retry is on the front room); the way back is the room's own "Back to your answer", always on screen.
 *
 * Reading the table: a box holds up to three lines, each one figure, named under the column's header ("Pay / Other
 * income", "Put in / Taken out / Left"). A put-in figure wears "+", a taken-out one "−": the direction never rests on
 * color. "~" marks the tool's projection; year 0's entered pay, other income and spending print without it.
 */
import { Fragment } from 'react'
import { copy } from '../copy'
import type { ComposedTable, TableFigure, TableGroup, TableLine } from './yearTableChrome'

export type YearTableState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly table: ComposedTable; readonly updating: boolean }
  | { readonly kind: 'error' }
  | { readonly kind: 'withheld'; readonly words: string }

const GROUP_LABEL: Readonly<Record<TableGroup, string>> = {
  in: copy.workbenchGroupIn,
  out: copy.workbenchGroupOut,
  savings: copy.workbenchGroupSavings,
}

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/** The projection mark and the key's separator: glyphs, not words (R11's "~"). */
const APPROX = '~'
const KEY_SEPARATOR = ': '
const AGE_SEPARATOR = ' / '
/** A person no longer alive that year. */
const GONE = '–'

function Figure({ f }: { readonly f: TableFigure }) {
  return (
    <span className="wb-fig">
      {f.sign !== '' && <span className="wb-fig__sign">{f.sign}</span>}
      {f.approx && <span className="wb-fig__approx">{APPROX}</span>}
      {grouped.format(f.dollars)}
    </span>
  )
}

function Box({ lines }: { readonly lines: readonly TableLine[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="wb-line">
          {line === null ? ' ' : <Figure f={line} />}
        </span>
      ))}
    </>
  )
}

/** Each run of same-group columns, for the header's first row. */
function groupRuns(table: ComposedTable): { readonly group: TableGroup; readonly span: number }[] {
  const runs: { group: TableGroup; span: number }[] = []
  for (const c of table.columns) {
    const last = runs[runs.length - 1]
    if (last !== undefined && last.group === c.group) last.span++
    else runs.push({ group: c.group, span: 1 })
  }
  return runs
}

function Table({ table, updating }: { readonly table: ComposedTable; readonly updating: boolean }) {
  const width = table.columns.length + 1
  return (
    <div className={updating ? 'wb-table-wrap wb-table-wrap--updating' : 'wb-table-wrap'}>
      <table className="wb-table" aria-busy={updating || undefined}>
        <caption className="wb-table__caption">{copy.workbenchTableCaption}</caption>
        <thead>
          <tr className="wb-table__groups">
            <th scope="col" className="wb-th wb-th--year" rowSpan={2}>
              <span className="wb-th__name">{copy.workbenchColYear}</span>
              <span className="wb-th__lines">{copy.workbenchColAges}</span>
              <span className="wb-th__lines">{table.ageLabels.join(AGE_SEPARATOR)}</span>
            </th>
            {groupRuns(table).map((run, i) => (
              <th key={i} scope="colgroup" colSpan={run.span} className="wb-th wb-th--group">
                {GROUP_LABEL[run.group]}
              </th>
            ))}
          </tr>
          <tr>
            {table.columns.map((c) => (
              <th key={c.id} scope="col" className="wb-th" data-col={c.id}>
                <span className="wb-th__name">{c.header}</span>
                {c.lineLabels.map((l, i) => (
                  <span key={i} className="wb-th__lines">
                    {l}
                  </span>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <Fragment key={row.t}>
              {row.steadyFrom !== undefined && (
                <tr className="wb-divider">
                  <td colSpan={width}>{row.steadyFrom}</td>
                </tr>
              )}
              <tr className={row.notes.length > 0 ? 'wb-row wb-row--noted' : 'wb-row'} data-year={row.year}>
                <th scope="row" className="wb-td wb-td--year">
                  <span className="wb-line wb-year">{row.year}</span>
                  <span className="wb-line wb-ages">{row.ages.map((a) => (a === null ? GONE : String(a))).join(AGE_SEPARATOR)}</span>
                </th>
                {row.cells.map((lines, i) => (
                  <td key={table.columns[i]!.id} className="wb-td">
                    <Box lines={lines} />
                  </td>
                ))}
              </tr>
              {row.notes.length > 0 && (
                <tr className="wb-notes">
                  <td colSpan={width}>
                    {row.notes.map((n, i) => (
                      <p key={i} className="wb-note">
                        {n}
                      </p>
                    ))}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function YearTable({ state }: { readonly state: YearTableState }) {
  if (state.kind === 'loading') {
    return (
      <div className="wb-state wb-state--loading" role="status" aria-busy="true">
        <p className="wb-state__words">{copy.workbenchTableLoading}</p>
      </div>
    )
  }
  if (state.kind === 'error') {
    // The way back is the room's own "Back to your answer" above, always on screen: a second button of the same
    // name here would be two controls for one action.
    return (
      <div className="wb-state" role="alert">
        <p className="wb-state__words">{copy.workbenchTableError}</p>
      </div>
    )
  }
  if (state.kind === 'withheld') {
    return (
      <div className="wb-state" role="status">
        <p className="wb-state__words">{state.words}</p>
      </div>
    )
  }
  const { table, updating } = state
  return (
    <div className="wb-table-region">
      {updating && (
        <p className="wb-updating" role="status">
          {copy.workbenchTableUpdating}
        </p>
      )}
      <Table table={table} updating={updating} />
      <section className="wb-key" aria-labelledby="wb-key-heading">
        <h3 id="wb-key-heading" className="wb-key__heading">
          {copy.workbenchSourcesHeading}
        </h3>
        <ul className="wb-key__list">
          {table.sourceKey.map((e) => (
            <li key={e.label} className="wb-key__entry">
              <span className="wb-key__label">{e.label}</span>
              {KEY_SEPARATOR}
              {e.accounts}
            </li>
          ))}
        </ul>
      </section>
      {table.notes.map((n) => (
        <p key={n} className="wb-foot">
          {n}
        </p>
      ))}
    </div>
  )
}
