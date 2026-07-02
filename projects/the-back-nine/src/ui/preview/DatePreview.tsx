/*
 * src/ui/preview/DatePreview.tsx — the DEV-ONLY D2 fuck-off-date preview harness.
 *
 * Renders the elevated FuckOffDate surface across the three first-class date outcomes (+ free-today,
 * + the non-monotone/ACA-cliff variant, + the non-answer modes), driven by representative fixtures,
 * so the landed magic moment can be SEEN — screenshot-verified through Chromium before, and N=1
 * laptop cold-read by, the reviewer. Reached at ?preview=date (DEV-gated in main.tsx, dead-code-
 * eliminated from prod). Scaffolding labels are dev-only locals (never the product copy catalog).
 */
import { FuckOffDate } from '../FuckOffDate'
import { DATE_FIXTURES, DATE_WINDOW_TOP, type DateFixtureKey } from './dateFixtures'
import './preview.css'

const T = {
  pageTitle: 'D2 — The fuck-off date',
  pageNote:
    'Dev-only preview (?preview=date). The elevated, landed date surface for a not-yet-retired household — the three first-class outcomes (confirmed / window-edge / no-date) + free-today + the non-monotone (ACA-cliff) disclosure + the date↔confidence tradeoff (clean confirmed only) + the non-answer modes. The on-demand confidence-curve drawer is a deliberate follow-up. FIRST-DRAFT disclosure + tradeoff wording — the cold-read’s call.',
  cases: [
    { key: 'freeToday', label: 'confirmed — free today (Y=0)' },
    { key: 'confirmed', label: 'confirmed — N years out' },
    { key: 'confirmedNonMonotone', label: 'confirmed + non-monotone (ACA cliff)' },
    { key: 'windowEdge', label: 'window-edge (unconfirmed tail)' },
    { key: 'noDate', label: 'no date in window' },
  ] satisfies readonly { key: DateFixtureKey; label: string }[],
  pendingLabel: 'pending',
  errorLabel: 'compute-error',
} as const

const noop = (): void => undefined

export default function DatePreview() {
  return (
    <main className="preview">
      <header className="preview__head">
        <h1 className="preview__title">{T.pageTitle}</h1>
        <p className="preview__note">{T.pageNote}</p>
      </header>

      <section className="preview__grid" aria-label={T.pageTitle}>
        {T.cases.map((c) => (
          <article key={c.key} className="preview__case">
            <p className="preview__case-label">{c.label}</p>
            <FuckOffDate
              view={{
                kind: 'dates',
                // The aliased pair is the value-coincident degenerate — the single-date render.
                floor: DATE_FIXTURES[c.key],
                lifestyle: DATE_FIXTURES[c.key],
                windowTopYears: DATE_WINDOW_TOP,
              }}
            />
          </article>
        ))}
        <article className="preview__case">
          <p className="preview__case-label">{T.pendingLabel}</p>
          <FuckOffDate view={{ kind: 'pending' }} />
        </article>
        <article className="preview__case">
          <p className="preview__case-label">{T.errorLabel}</p>
          <FuckOffDate view={{ kind: 'compute-error', onRetry: noop }} />
        </article>
      </section>
    </main>
  )
}
