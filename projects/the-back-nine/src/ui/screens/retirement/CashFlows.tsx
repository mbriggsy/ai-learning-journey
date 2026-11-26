/**
 * src/ui/screens/retirement/CashFlows.tsx: Retirement → Cash Flows (plan docs/plans/6-rightcapital-ui-plan.md, RC6; ref
 * 2.16; `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`, `-06.png`, `…-accounts-tab-…-02.png`).
 * It renders what `cashFlowsView` returns and works out no figure.
 *
 * The page: the title, the intro (the plan's many-futures answer, as every one-future page carries it: R9, a one-path
 * table never stands alone as the odds; its box holds the tallest form the next answer can take, so a re-figured answer
 * moves no tap target below it, insights 035 and 065), the folder tabs Summary and Accounts with "Today's dollars"
 * beside them, and the panel: the header row (the Summary's title or breadcrumb, or the Accounts table switcher, at the
 * left; the future select, the plan select and the download at the right, each select a fixed width so a switch moves
 * neither), then the table, which scrolls sideways in its own frame with Year and Age held, then the sentences: which
 * future this is, each year's notes, what each account column holds, the notes, the stopgaps, and the R13 caveat last.
 *
 * Maps (RC20, `Maps.tsx`) is the first folder tab, as RightCapital orders them: its title is its view select (the flow or
 * the tiles), the future and plan selects stay where they are, it offers no download (no table: RightCapital's Maps has
 * none), and its year scrubber and map take the table's place.
 *
 * A drill or a breadcrumb press swaps the table in place with no motion (a table read again and again is no place for
 * it: the motion law's frequency rule), and puts focus on the panel's title, which names where the reader now is.
 * The CSV is built here from the view's own cells and handed to the browser as a file: nothing leaves the page.
 */
import { useEffect, useId, useRef, type ReactNode, type Ref } from 'react'
import { Download } from 'lucide-react'
import { Button, Caveat, DataTable, PageFrame, Select, type DataTableColumn } from '../../kit'
import { copy } from '../../copy'
import { DisplayDoor } from '../settings/DisplayDrawer'
import type { TableView } from '../../workbench/tableRun'
import type { AccountsTable, CashFlowsPick, CashFlowsTab, CashFlowsView, CfNode, CfRow, SummaryDrill } from './cashFlowsView'
import { Maps } from './Maps'
import type { MapsChoice } from './mapsView'

/** The plan's many-futures answer over the page, with the tallest forms it can take held in a hidden copy. */
export interface PinnedIntroWords {
  readonly label: string
  readonly status?: string
  readonly lead: string
  readonly second?: string
  /** Every form each line can take next (`reserveForms`, beside the shown one), drawn invisibly in the same cell. */
  readonly reserveStatuses: readonly string[]
  readonly reserveLeads: readonly string[]
  readonly reserveSeconds: readonly string[]
}

/** The key's separator and the breadcrumb's: glyphs, not words. */
const KEY_SEPARATOR = ': '
const CRUMB_SEPARATOR = '/'

/** Lines stacked in one grid cell: the cell is as tall as the tallest. */
function Stack({ lines, className }: { readonly lines: readonly string[]; readonly className: string }) {
  return (
    <div className="grid">
      {lines.map((line, i) => (
        <p key={i} className={`col-start-1 row-start-1 ${className}`}>
          {line}
        </p>
      ))}
    </div>
  )
}

export interface CashFlowsProps {
  /** "Today's dollars" beside the folder tabs opens the Display drawer (RC18); absent, the plain words. */
  readonly onDisplay?: () => void
  readonly view: CashFlowsView
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly intro: PinnedIntroWords
  readonly caveat: readonly string[]
  readonly onTab: (tab: CashFlowsTab) => void
  readonly onDrill: (drill: SummaryDrill | null) => void
  readonly onAccounts: (table: AccountsTable) => void
  readonly onFuture: (future: TableView) => void
  readonly onPick: (pick: CashFlowsPick) => void
  /** Maps' year scrubber (sim-year t) and its view select. */
  readonly onMapYear: (t: number) => void
  readonly onMapView: (choice: MapsChoice) => void
}

function PinnedIntro({ words }: { readonly words: PinnedIntroWords }) {
  // The real lines and the reserve share one grid cell: the cell is as tall as the tallest, so nothing below moves.
  return (
    <div className="grid" data-cash-flows-intro="">
      <div className="col-start-1 row-start-1 flex flex-col gap-1">
        <p className="text-label text-stone-600">
          {words.label}
          {/* Spoken through the shell's one live region on the change: no role of its own. */}
          {words.status !== undefined ? (
            <span className="font-semibold text-stone-900" data-pinned-status="">
              {' '}
              {words.status}
            </span>
          ) : null}
        </p>
        <p className="text-intro text-stone-900">{words.lead}</p>
        {words.second !== undefined ? <p className="text-label text-stone-600">{words.second}</p> : null}
      </div>
      <div className="invisible col-start-1 row-start-1 flex flex-col gap-1" aria-hidden="true">
        <Stack lines={words.reserveStatuses.map((s) => `${words.label} ${s}`)} className="text-label font-semibold" />
        <Stack lines={[words.lead, ...words.reserveLeads]} className="text-intro" />
        {words.second !== undefined || words.reserveSeconds.length > 0 ? (
          <Stack lines={[...(words.second !== undefined ? [words.second] : []), ...words.reserveSeconds]} className="text-label" />
        ) : null}
      </div>
    </div>
  )
}

/** The view's column tree as the kit's columns, each drill wired to its handler. */
function kitColumns(nodes: readonly CfNode[], onDrill: (drill: SummaryDrill) => void): DataTableColumn<CfRow>[] {
  return nodes.map((n): DataTableColumn<CfRow> => {
    if (n.kind === 'group') {
      const drill = n.drill
      return { id: n.id, header: n.header, columns: kitColumns(n.columns, onDrill), ...(drill !== undefined ? { onDrill: () => onDrill(drill) } : {}) }
    }
    return {
      id: n.id,
      header: n.header,
      value: (row) => row.cells[n.id]?.text ?? '',
      numeric: n.numeric,
      ...(n.lead === true ? { lead: true } : {}),
      ...(n.rowHeader === true ? { rowHeader: true } : {}),
      ...(n.spanGroup === true ? { spanGroup: true } : {}),
    }
  })
}

const BOM = String.fromCharCode(0xfeff)

function downloadCsv(csv: string, name: string): void {
  // A byte-order mark first, so a spreadsheet reads the "~" and "−" marks as written.
  const blob = new Blob([`${BOM}${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  // Revoked a while after the click, never at once: a browser that starts the save after the click returns (WebKit,
  // the phone's) finds the file gone if the link is revoked in the same turn.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function CashFlows({ view, headingRef, intro, caveat, onTab, onDrill, onAccounts, onFuture, onPick, onMapYear, onMapView, onDisplay }: CashFlowsProps) {
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  // A drill, a crumb or a table switch: focus on the panel's title, which names where the reader now is.
  const where = `${view.tabs.value}|${view.breadcrumb?.at(-1)?.drill ?? ''}|${view.accountsSelect?.value ?? ''}`
  const lastWhere = useRef(where)
  useEffect(() => {
    if (lastWhere.current === where) return
    const sameTab = lastWhere.current.split('|')[0] === where.split('|')[0]
    lastWhere.current = where
    if (sameTab) titleRef.current?.focus()
  }, [where])

  const { body } = view
  const title: ReactNode =
    view.mapsSelect !== null ? (
      <div className="flex flex-col gap-1">
        <h2 ref={titleRef} id={titleId} tabIndex={-1} className="sr-only">
          {copy.cashFlowsTabMaps}
        </h2>
        {/* The flow or the tiles; below the laptop tier the tiles always show (`Maps.tsx`), so the select is a laptop's. */}
        <Select
          label={view.mapsSelect.label}
          hideLabel
          items={view.mapsSelect.items}
          value={view.mapsSelect.value}
          onValueChange={onMapView}
          className="hidden w-44 laptop:flex"
        />
      </div>
    ) : view.accountsSelect !== null ? (
      <div className="flex flex-col gap-1">
        <h2 ref={titleRef} id={titleId} tabIndex={-1} className="sr-only">
          {view.accountsSelect.items.find((i) => i.value === view.accountsSelect!.value)?.label}
        </h2>
        <Select
          label={view.accountsSelect.label}
          hideLabel
          items={view.accountsSelect.items}
          value={view.accountsSelect.value}
          onValueChange={onAccounts}
          className="w-72 max-w-full"
        />
      </div>
    ) : (
      <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-chart-title font-regular text-stone-900 outline-none" data-cash-flows-title="">
        {(view.breadcrumb ?? []).map((crumb, i, all) => {
          const last = i === all.length - 1
          return (
            <span key={crumb.label}>
              {i > 0 ? (
                <span aria-hidden="true" className="px-2 text-stone-600">
                  {CRUMB_SEPARATOR}
                </span>
              ) : null}
              {last ? (
                <span aria-current={all.length > 1 ? 'location' : undefined}>{crumb.label}</span>
              ) : (
                <button type="button" onClick={() => onDrill(crumb.drill)} className="cursor-pointer underline underline-offset-4 hover:text-plum">
                  {crumb.label}
                </button>
              )}
            </span>
          )
        })}
      </h2>
    )

  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="cash-flows">
      <PageFrame
        title={copy.shellPageCashFlows}
        headingRef={headingRef}
        intro={<PinnedIntro words={intro} />}
        tabs={{ label: view.tabs.label, items: view.tabs.items, value: view.tabs.value, onValueChange: onTab }}
        valuesNote={<DisplayDoor onOpen={onDisplay} />}
        caveat={<Caveat lines={caveat} />}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-4 laptop:flex-row laptop:items-end laptop:justify-between" data-cash-flows-head="">
            {title}
            <div className="flex flex-wrap items-end gap-3" data-cash-flows-controls="">
              <Select
                label={view.futureSelect.label}
                hideLabel
                items={view.futureSelect.items}
                value={view.futureSelect.value}
                onValueChange={onFuture}
                className="w-44"
              />
              <Select
                label={view.planSelect.label}
                hideLabel
                items={view.planSelect.items}
                value={view.planSelect.value}
                onValueChange={onPick}
                className="w-64 max-w-full"
              />
              {view.tabs.value === 'maps' ? null : (
              <Button
                variant="secondary"
                icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />}
                aria-label={copy.cashFlowsDownloadLabel}
                // Off with no table, and while the rows are from before the latest change (the Updating line says so). Still
                // focusable while off, so a keyboard user's focus stays put when the table goes busy under it.
                disabled={view.csv === null}
                focusableWhenDisabled
                onClick={() => {
                  if (view.csv !== null) downloadCsv(view.csv, view.csvName)
                }}
              >
                {copy.cashFlowsDownload}
              </Button>
              )}
            </div>
          </div>
          {body.kind === 'maps' ? (
            <>
              {view.updating !== null ? (
                <p className="text-label font-semibold text-stone-900" data-cash-flows-updating="">
                  {view.updating}
                </p>
              ) : null}
              <div aria-busy={body.busy || undefined} className={body.busy ? 'opacity-60' : undefined}>
                <Maps view={body.maps} onYear={onMapYear} />
              </div>
            </>
          ) : body.kind === 'state' ? (
            <div role={body.tone} className="flex min-h-40 items-center border-t-2 border-plum py-6 text-body text-stone-600" data-cash-flows-state="">
              <p>{body.words}</p>
            </div>
          ) : (
            <>
              {/* Spoken through the shell's one live region on the change: no role of its own. */}
              {view.updating !== null ? (
                <p className="text-label font-semibold text-stone-900" data-cash-flows-updating="">
                  {view.updating}
                </p>
              ) : null}
              <DataTable
                labelledBy={titleId}
                columns={kitColumns(body.columns, (d) => onDrill(d))}
                rows={body.rows}
                rowKey={(r) => r.key}
                {...(body.paired ? { rowGroup: (r: CfRow) => r.group ?? r.key } : {})}
                busy={body.busy}
              />
            </>
          )}
          {view.lines.length > 0 ? (
            <div className="flex flex-col gap-1 text-label text-stone-600" data-cash-flows-lines="">
              {view.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
          {view.yearNotes.length > 0 ? (
            <section className="flex flex-col gap-1" aria-labelledby={`${titleId}-notes`} data-cash-flows-year-notes="">
              <h3 id={`${titleId}-notes`} className="text-label font-semibold text-stone-900">
                {copy.cashFlowsYearNotesHeading}
              </h3>
              <ul className="flex flex-col gap-1 text-label text-stone-600">
                {view.yearNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {view.sourceKey.length > 0 ? (
            <section className="flex flex-col gap-1" aria-labelledby={`${titleId}-key`} data-cash-flows-key="">
              <h3 id={`${titleId}-key`} className="text-label font-semibold text-stone-900">
                {view.tabs.value === 'maps' ? copy.mapsSourcesHeading : copy.workbenchSourcesHeading}
              </h3>
              <ul className="flex flex-col gap-1 text-label text-stone-600">
                {view.sourceKey.map((e) => (
                  <li key={e.label}>
                    <span className="font-semibold text-stone-900">{e.label}</span>
                    {KEY_SEPARATOR}
                    {e.accounts}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {view.footnotes.length > 0 || view.stopgaps.length > 0 ? (
            <div className="flex flex-col gap-1 text-label text-stone-600" data-cash-flows-notes="">
              {[...view.footnotes, ...view.stopgaps].map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      </PageFrame>
    </div>
  )
}
