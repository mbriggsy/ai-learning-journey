// Self-hosted variable fonts (CSP: font-src 'self' — no CDN; precached for offline
// via the woff2 glob in vite.config.ts). Fraunces opsz = words/display; Source Sans 3
// = body/UI and every numeral (the figure law in src/ui/styles/tokens.css).
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/source-sans-3/index.css'
import './ui/styles/tokens.css'
import './ui/styles/base.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@ui/App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
