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
import { resolveInitialTheme } from './lib/theme'
import App from './App'

// Apply the chosen theme BEFORE first paint (no FOUC). Precedence (see resolveInitialTheme):
// ?theme= URL override > localStorage (the user's toggle) > null = follow the OS via @media.
// data-theme on <html> wins over prefers-color-scheme (see tokens.semantic.css).
const stored = (() => {
  try {
    return localStorage.getItem('theme')
  } catch {
    return null
  }
})()
const forced = new URLSearchParams(window.location.search).get('theme')
const initialTheme = resolveInitialTheme(forced, stored)
if (initialTheme) {
  document.documentElement.dataset.theme = initialTheme
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
