import { useMemo, type ReactNode } from 'react'
import type { WorkingYearLedger } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { ledgerPicture, ledgerUnknownLines, type RowSpec } from './workingYearLedgerRows'

/**
 * The working-year money picture (`docs/plans/features/working-year-pay-check-build-spec.md` R16,
 * KTD12, U8) — the year-0 check in the household's own numbers, then every later working year that
 * changes or runs short. ONE component for the intake's picture step (legends `h3`, under the step's
 * `h2`) and the assumption panel's W row (legends `h4`, under the panel's section `h3`s — Phase B
 * ruling 13).
 *
 * IT COMPUTES NO MONEY LINE. Every line is the engine producer's (`workingYearLedger`, read through
 * `intakeMap.workingYearLedgerForRun`): whole dollars already rounded so the lines sum to the bottom
 * line exactly. `workingYearLedgerRows.ts` chooses which nonzero lines to show and words them; its two detail figures
 * read the run's built input — the investment income the tax line names (`buildDateInput`'s own
 * array) and the W line's monthly echo (the answer's yearly figure ÷ 12).
 *
 * NEVER COLOR ALONE, NEVER AN ALARM: grouped `<dl>`s under legends that each say "a year"; every
 * outflow carries a minus sign as well as its group; the bottom line carries a word AND a sign; no
 * `role="alert"`, no live region. Later years are worded conditionally ("if you're still working
 * in …") — the picture never reads a crown — and a run of short years no event explains collapses
 * into one line that names the first year's cause.
 */

type HeadingLevel = 3 | 4

function Legend({ level, children }: { readonly level: HeadingLevel; readonly children: ReactNode }) {
  return level === 3 ? (
    <h3 className="wy-group__legend">{children}</h3>
  ) : (
    <h4 className="wy-group__legend">{children}</h4>
  )
}

function Group({
  level,
  legend,
  rows,
}: {
  readonly level: HeadingLevel
  readonly legend: string
  readonly rows: readonly RowSpec[]
}) {
  if (rows.length === 0) return null
  return (
    <section className="wy-group">
      <Legend level={level}>{legend}</Legend>
      <dl className="wy-rows">
        {/* Index keys: two rows can share a label (two members' later-year reasons never do today,
            but a key collision would silently drop a row). */}
        {rows.map((r, i) => (
          <div
            key={i}
            className={`wy-row${r.emphasis === true ? ' wy-row--bottom' : ''}${r.stack === true ? ' wy-row--stack' : ''}`}
          >
            <dt className="wy-row__label">{r.label}</dt>
            <dd className="wy-row__value">{r.value}</dd>
            {(r.details ?? []).map((d, j) => (
              <dd key={j} className="wy-row__detail">
                {d}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </section>
  )
}

export function WorkingYearLedgerPicture({
  ledger,
  draft,
  headingLevel,
  aged,
}: {
  readonly ledger: WorkingYearLedger
  readonly draft: ScenarioDraft
  readonly headingLevel: HeadingLevel
  /** The plan clock (`planClockAnchor`): the plan was built before this calendar year, so the picture
   *  shows its first working year as entered. */
  readonly aged: boolean
}) {
  // The rows are `workingYearLedgerRows.ts`'s (moved out of this file by Act 6 · RC13b, unchanged).
  const p = useMemo(() => ledgerPicture(ledger, draft, aged), [ledger, draft, aged])
  return (
    <div className="wy-ledger">
      <p className="field-help">{p.lead}</p>
      <Group level={headingLevel} legend={p.comingIn.legend} rows={p.comingIn.rows} />
      <Group level={headingLevel} legend={p.goingOut.legend} rows={p.goingOut.rows} />
      <Group level={headingLevel} legend={p.bottom.legend} rows={p.bottom.rows} />
      <Group level={headingLevel} legend={p.savings.legend} rows={p.savings.rows} />
      {p.savingsTax !== null && <p className="field-help">{p.savingsTax}</p>}
      <Group level={headingLevel} legend={p.later.legend} rows={p.later.rows} />
    </div>
  )
}

/** The `'unknown'` face (U8): no `<dl>` and no zeros — one calm line, then what stands in the way in
 *  the answer strip's own words (`missingFactLines`, the panel echo's composer): the facts still to
 *  enter, the ones this version cannot price with the strip's own closing line, or — with nothing
 *  missing — a plain "can't work it out" (the engine refused the run). The lead says "yet" only where
 *  every blocker is one the household can still enter.
 *
 *  `echoStrip` is each host's to say: the PANEL's row echoes the strip (its sheet covers it); the
 *  WALK's step does not, because the strip sits at the top of the same screen and names every blocker
 *  already — the step points there instead of printing the same two lines twice (the b9-5 re-walk). */
export function WorkingYearLedgerUnknown({
  draft,
  echoStrip,
}: {
  readonly draft: ScenarioDraft
  readonly echoStrip: boolean
}) {
  return (
    <div className="wy-ledger wy-ledger--unknown">
      {ledgerUnknownLines(draft, echoStrip).map((line) => (
        <p key={line} className="field-help">
          {line}
        </p>
      ))}
    </div>
  )
}
