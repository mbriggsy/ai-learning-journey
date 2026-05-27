import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles/reset.css'
import './styles/tokens.physical.css'
import './styles/tokens.semantic.css'
import './styles/fonts.css'
import './styles/global.css'
import './motion/gsap-context' // registers GSAP plugins (side effect)
import './motion/easings' // registers the 4 weighted eases (side effect) — REQUIRED or parseEase fails
import { StatsGate } from './data/StatsGate'
import App from './App'

// Dev-only theme override: ?theme=dark|light forces a mode without toggling the OS.
// data-theme on <html> wins over prefers-color-scheme (see tokens.semantic.css).
const forced = new URLSearchParams(window.location.search).get('theme')
if (forced === 'dark' || forced === 'light') {
  document.documentElement.dataset.theme = forced
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StatsGate>
        <App />
      </StatsGate>
    </BrowserRouter>
  </StrictMode>,
)
