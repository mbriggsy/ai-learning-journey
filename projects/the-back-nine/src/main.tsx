// Self-hosted variable fonts (CSP: font-src 'self' — no CDN; precached for offline
// via the woff2 glob in vite.config.ts). Fraunces opsz = words/display; Source Sans 3
// = body/UI and every numeral (the figure law in src/ui/styles/tokens.css).
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/source-sans-3/index.css'
import './ui/styles/tokens.css'
import './ui/styles/base.css'
import './ui/styles/app.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@ui/App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

// DEV-only preview harnesses, reached at `?preview` (the U7 confidence surfaces) and `?preview=date`
// (the D2 fuck-off-date surface). `import.meta.env.DEV` is a static `false` in the production build,
// so this whole branch — and the dynamic imports it gates — is dead-code-eliminated: the harnesses
// never ship and never count against the entry-JS budget.
const previewParam = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null
const Preview =
  previewParam === null
    ? null
    : previewParam === 'date' || previewParam === 'd2'
      ? lazy(() => import('@ui/preview/DatePreview'))
      : lazy(() => import('@ui/preview/U7Preview'))

createRoot(rootEl).render(
  <StrictMode>
    {Preview ? (
      <Suspense fallback={null}>
        <Preview />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
