/*
 * src/ui/workbench/YearTable.tsx — the year-by-year table (workbench plan U7). It renders what `composeYearTable`
 * returns and nothing else: no figure is worked out here.
 *
 * The three named states (U7's Approach): FIRST LOAD, a reserved frame with status words; UPDATING, the prior rows stay,
 * marked in words and with a cue that is not color (a dashed rule beside the rows, dimmed ink), `aria-busy` set on the
 * table, the words spoken once by the room's own live region (U8); ERROR,
 * one calm sentence and the rows withheld, with no retry (a lane never re-sends after a failure, KTD13; the answer's
 * own retry is on the front room); the way back is the room's own "Back to your answer", always on screen.
 *
 * Reading the table: a box holds up to three lines, each one figure, named under the column's header ("Pay / Other
 * income", "Put in / Taken out / Left"). A put-in figure wears "+", a taken-out one "−": the direction never rests on
 * color. "~" marks the tool's projection; year 0's entered pay, other income and spending print without it.
 */
import { Fragment, useId } from 'react'
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

function LabelledFigure({ f, label }: { readonly f: TableFigure; readonly label: string | undefined }) {
  return (
    <>
      {label !== undefined && label !== '' && <span className="sr-only">{`${label}${KEY_SEPARATOR}`}</span>}
      <Figure f={f} />
    </>
  )
}

/** A box's lines. A sighted reader names each figure by its place under the header's line names; a screen reader
 *  hears no place, and a blank line is silent, so each figure carries its line's name in hidden text ("Medicare:
 *  ~7,568" where the marketplace line above it is blank). A one-line column's header names its one figure. */
function Box({ lines, labels }: { readonly lines: readonly TableLine[]; readonly labels: readonly string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="wb-line">
          {line === null ? ' ' : <LabelledFigure f={line} label={labels[i]} />}
        </span>
      ))}
    </>
  )
}

/** Whose age is which, in the year column's header: "Sam / Alex". Each name stays whole and carries the slash after it,
 *  so the line can break only between people: two names at the name ceiling on one unbreakable line held the year
 *  column at 261 px (1280 px scrolled sideways, and the phone's held year column took most of its frame). */
function People({ labels }: { readonly labels: readonly string[] }) {
  const slash = AGE_SEPARATOR.trimEnd()
  return (
    <span className="wb-th__people">
      {labels.map((label, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="wb-th__person">{i < labels.length - 1 ? `${label}${slash}` : label}</span>
        </Fragment>
      ))}
    </span>
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
  // The table's name sits above its frame, never in it: a `<caption>` is as wide as the table, so on a phone, where the
  // table scrolls inside its frame, the sentence ran past the frame's edge and was cut.
  const captionId = useId()
  return (
    <>
      <p id={captionId} className="wb-table__caption">
        {copy.workbenchTableCaption}
      </p>
      <div className={updating ? 'wb-table-wrap wb-table-wrap--updating' : 'wb-table-wrap'}>
        <table className="wb-table" aria-labelledby={captionId} aria-busy={updating || undefined}>
          <thead>
            <tr className="wb-table__groups">
              <th scope="col" className="wb-th wb-th--year" rowSpan={2}>
                <span className="wb-th__name">{copy.workbenchColYear}</span>
                <span className="wb-th__lines">{copy.workbenchColAges}</span>
                <People labels={table.ageLabels} />
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
                {/* A row's sentences sit in a block of their own inside the full-width cell, so on the phone, where the
                    table scrolls in its frame, each block holds to the frame's edge and wraps at its width (workbench.css). */}
                {row.steadyFrom !== undefined && (
                  <tr className="wb-divider">
                    <td colSpan={width}>
                      <p className="wb-divider__words">{row.steadyFrom}</p>
                    </td>
                  </tr>
                )}
                <tr className={row.notes.length > 0 ? 'wb-row wb-row--noted' : 'wb-row'} data-year={row.year}>
                  <th scope="row" className="wb-td wb-td--year">
                    <span className="wb-line wb-year">{row.year}</span>
                    <span className="wb-line wb-ages">{row.ages.map((a) => (a === null ? GONE : String(a))).join(AGE_SEPARATOR)}</span>
                  </th>
                  {row.cells.map((lines, i) => (
                    <td key={table.columns[i]!.id} className="wb-td">
                      <Box lines={lines} labels={table.columns[i]!.lineLabels} />
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
    </>
  )
}

export function YearTable({ state }: { readonly state: YearTableState }) {
  if (state.kind === 'loading') {
    return (
      <div className="wb-state wb-state--loading" role="status">
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
      {/* Spoken through the room's one live region on the change (WorkbenchRoom): no role of its own. */}
      {updating && <p className="wb-updating">{copy.workbenchTableUpdating}</p>}
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
