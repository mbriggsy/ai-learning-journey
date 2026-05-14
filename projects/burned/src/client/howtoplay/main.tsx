import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import '@client/shared/tokens/fonts.css'
import './fonts-mono-htp.css'
import './dossier.css'
import './styles.css'
import { App } from './App'

window.addEventListener('error', (e) => console.error('Uncaught:', e.error))
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled:', e.reason))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
