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

// DEV-only U7 confidence-statement preview harness, reached at `?preview`. `import.meta.env.DEV` is
// a static `false` in the production build, so this whole branch — and the dynamic import it gates —
// is dead-code-eliminated: the harness never ships and never counts against the entry-JS budget.
const U7Preview = import.meta.env.DEV ? lazy(() => import('@ui/preview/U7Preview')) : null
const previewing =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')

createRoot(rootEl).render(
  <StrictMode>
    {previewing && U7Preview ? (
      <Suspense fallback={null}>
        <U7Preview />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
