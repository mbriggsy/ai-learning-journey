import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
// NOTE: style imports added in Commit 3, motion side-effect imports in Commit 4.
// Phase-1-done main.tsx (plan §1.6) is the union of all three commits.
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
      <App />
    </BrowserRouter>
  </StrictMode>,
)
