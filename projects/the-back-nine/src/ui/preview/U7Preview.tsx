/*
 * src/ui/preview/U7Preview.tsx — the DEV-ONLY U7 confidence-statement preview harness.
 *
 * Renders every outcome state + the non-verdict modes through the real ConfidenceStatement, driven
 * by representative fixtures, so the six verdict glyphs (designed blind) and the whole surface can
 * be SEEN — screenshot-verified through Chromium before, and N=1 laptop cold-read by, the reviewer
 * (the Act-2 exit gate; the reviewer is color-blind, the exact user this channel serves).
 *
 * Reached at ?preview, DEV-gated in main.tsx (dead-code-eliminated from the production build). The
 * scaffolding LABELS below are dev-only (they never ship), so they live as locals rendered via
 * {expression} — never bare JSXText (the src/ui copy-fence) — rather than polluting the product
 * copy catalog + the copyGuard with state names.
 */
import { ConfidenceStatement } from '../ConfidenceStatement'
import { HOUSEHOLD_ANNOTATIONS, PREVIEW_ORDER, READING_FIXTURES } from './fixtures'
import type { OutcomeState } from '@shared/model'
import './preview.css'

const T = {
  pageTitle: 'U7 — Confidence statement',
  pageNote:
    'Dev-only preview (?preview). Every outcome state + the non-verdict modes, driven by representative fixtures. The “Study the range” drawer is the on-demand band. The N=1 laptop cold-read is the Act-2 exit gate — the silhouette-legibility call is the reviewer’s.',
  modesTitle: 'Non-verdict modes',
  survivorTitle: 'Survivor readout',
  survivorDeferredLabel: 'deferred — engine-blocked',
  survivorNote:
    'The engine emits no survivor-conditioned distribution yet (U7 item e). That additive, presence-keyed output is its own unit before this second statement can render.',
  pendingLabel: 'pending',
  errorLabel: 'compute-error',
  stateLabels: {
    'over-funded': 'over-funded',
    'on-track': 'on-track',
    borderline: 'borderline',
    'off-track': 'off-track',
    'already-failing': 'already-failing',
    indeterminate: 'indeterminate',
  } satisfies Record<OutcomeState, string>,
} as const

const noop = (): void => undefined

export default function U7Preview() {
  return (
    <main className="preview">
      <header className="preview__head">
        <h1 className="preview__title">{T.pageTitle}</h1>
        <p className="preview__note">{T.pageNote}</p>
      </header>

      <section className="preview__grid" aria-label={T.pageTitle}>
        {PREVIEW_ORDER.map((state) => (
          <article key={state} className="preview__case" data-state={state}>
            <p className="preview__case-label">{T.stateLabels[state]}</p>
            <ConfidenceStatement
              view={{
                kind: 'reading',
                ...READING_FIXTURES[state],
                bandAnnotations: HOUSEHOLD_ANNOTATIONS,
                provisional: false,
              }}
            />
          </article>
        ))}
      </section>

      <section className="preview__block">
        <h2 className="preview__block-title">{T.modesTitle}</h2>
        <div className="preview__grid">
          <article className="preview__case" data-state="pending">
            <p className="preview__case-label">{T.pendingLabel}</p>
            <ConfidenceStatement view={{ kind: 'pending' }} />
          </article>
          <article className="preview__case" data-state="compute-error">
            <p className="preview__case-label">{T.errorLabel}</p>
            <ConfidenceStatement view={{ kind: 'compute-error', onRetry: noop }} />
          </article>
        </div>
      </section>

      <section className="preview__block">
        <h2 className="preview__block-title">{T.survivorTitle}</h2>
        <div className="preview__grid">
          <article className="preview__case">
            <p className="preview__case-label">{T.survivorDeferredLabel}</p>
            <p className="preview__note">{T.survivorNote}</p>
          </article>
        </div>
      </section>
    </main>
  )
}
