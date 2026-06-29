import { lazy, Suspense, useEffect, useState } from 'react'
import { ColdStart } from '@intake/coldStart'
import { copy } from './copy'
import { UpdateToast } from './UpdateToast'
import { Disclaimer } from './Disclaimer'

/**
 * The P2 app body: cold start → the D1 account-level guided intake, with the
 * provisional answer strip co-existing above the questions (cross-cutting #6).
 * Replaces the U0/U1 smoke scaffold — the engine round-trip liveness the smoke
 * readout proved now rides the REAL product path (the CSP e2e drives this
 * intake to a live engine reading under the enforced policy).
 *
 * THE SPLIT: the intake subtree (and its engine tables) is a lazy chunk so the
 * entry JS stays inside the 300 KiB budget; the chunk warms during the
 * cold-start read so Begin never visibly waits (it is also precached for
 * offline). The Suspense fallback is deliberately EMPTY — the warm chunk makes
 * it a sub-frame flash at worst, and a flashed spinner would read as jank.
 */
const IntakeApp = lazy(() => import('./IntakeApp'))

/** `seed` is the DEV-only `?seed=<key>` value (always null in prod — the gate
 *  lives in main.tsx). When present we skip the cold start and mount the intake
 *  straight away so IntakeApp can apply the seed and land on the result. */
export function App({ seed }: { seed?: string | null }) {
  const [began, setBegan] = useState(seed != null)

  useEffect(() => {
    void import('./IntakeApp') // warm the chunk behind the cold-start frame
  }, [])

  return (
    <>
      {/* App-title heading — visually hidden, but it gives every IN-APP view a single
          top-level <h1> so the intake-step and result <h2> headings nest under it.
          The result views otherwise start at <h2> with no <h1> present (the cold-start
          <h1> has unmounted by began=true). Gated on `began` so cold-start keeps its
          own question <h1> (coldStart.tsx:20) — no double-<h1>, exactly one per view.
          Screen-reader heading-nav lands here first, then the verdict. Council
          2026-06-29 (council-decided over the minimalist's verdict-as-h1: one stable
          app-title h1 covers all four result-view headings + intake + error without
          blinking the h1 across SPA states). */}
      {began && <h1 className="sr-only">{copy.appTitle}</h1>}
      {began ? (
        <Suspense fallback={null}>
          <IntakeApp seed={seed} />
        </Suspense>
      ) : (
        <ColdStart onBegin={() => setBegan(true)} />
      )}
      <UpdateToast />
      <Disclaimer />
    </>
  )
}
