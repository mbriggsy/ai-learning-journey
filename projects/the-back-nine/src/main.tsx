// The cascade-layer order comes FIRST (Act 6, plan 6 section 2.1): every old sheet below sits in `@layer legacy`,
// the new token sheet in `theme` / `base` / `utilities`, so the old surfaces keep their cascade untouched.
import './ui/styles/layers.css'
// Self-hosted variable fonts (CSP: font-src 'self' — no CDN; precached for offline
// via the woff2 glob in vite.config.ts). Fraunces opsz = words/display; Source Sans 3
// = body/UI and every numeral (the figure law in src/ui/styles/tokens.css).
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/source-sans-3/index.css'
// Act 6's one face (RC1's token sheet names it as `--font-ui`): the shell's `.rc-root` surfaces render in it since RC2.
import '@fontsource-variable/figtree/index.css'
import './ui/styles/tokens.css'
import './ui/styles/base.css'
import './ui/styles/app.css'
// Act 6's token sheet (Tailwind's theme + utilities, no global preflight; the old sheets above share no token name).
import './ui/styles/theme.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { CSPProvider } from '@base-ui/react/csp-provider'
import { App } from '@ui/App'
import { applySeriesVars } from '@viz/charts/seriesVars'
import { fanBandVars } from '@viz/charts/fanOptions'

// The chart series colours, once, through the CSSOM (`style-src 'self'` allows it; a runtime <style> it would not):
// `--highcharts-color-N` on the root's own style beats every stylesheet, so Highcharts' default palette never shows.
applySeriesVars(document.documentElement.style)
// …and the fan's two fills (`RC_BAND` at its two stops), the same way.
for (const [name, value] of fanBandVars()) document.documentElement.style.setProperty(name, value)

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

// DEV-only preview harness, reached at `?preview=refiguring&seed=<key>` (W9-R7's re-figuring window:
// the real app on the seed, every run after its first final held — the module's docblock says why).
// The old heroes' previews (`?preview`, `?preview=date`) left with the heroes at Act 6's RC4.
// `import.meta.env.DEV` is a static `false` in the production build, so this whole branch — and the
// dynamic import it gates — is dead-code-eliminated: the harness never ships.
const search = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
const previewParam = search?.get('preview') ?? null
const Preview = previewParam === 'refiguring' ? lazy(() => import('@ui/preview/RefiguringPreview')) : null

// DEV-only intake seed (`?seed=<key>`) — jumps the REAL product path straight to a
// worded result without hand-driving the intake (devSeeds.ts). Same DEV gate, so it
// is `null` in prod and the seed module is never reached (dynamically imported in
// IntakeApp, so it is dead-code-eliminated too). `?preview` takes precedence.
const seedParam = search?.get('seed') ?? null

// DEV-only vault planter (`?vault=<key>`) — plants an encrypted vault from a dev seed and drops onto
// the unlock screen (passphrase pre-filled), so decrypt-on-return can be exercised WITHOUT re-driving
// the intake + Save ceremony. Same DEV gate → DCE'd from prod (the planting graph is dynamically
// imported in App). `?preview`/`?seed` take precedence (a `?vault` is ignored when either is present).
const vaultParam = search?.get('vault') ?? null

createRoot(rootEl).render(
  <StrictMode>
    {/* Base UI renders no <style> element under this (its two scrollbar rules live in theme.css); plan 6, 2.1 decision 1. */}
    <CSPProvider disableStyleElements>
      {Preview ? (
        <Suspense fallback={null}>
          <Preview />
        </Suspense>
      ) : (
        <App seed={seedParam} vaultSeed={vaultParam} />
      )}
    </CSPProvider>
  </StrictMode>,
)
