import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import '@client/shared/tokens/semantic.phone.css'
import '@client/shared/tokens/fonts.css'
import { MotionProvider } from '@client/shared/MotionProvider'
import { ReducedMotionProvider } from '@client/shared/ReducedMotionProvider'
import { ErrorBoundary } from '@client/shared/ErrorBoundary'
import { Player } from './Player'
import './player-hardening.css'

// Prefetch motion features chunk — prevents 27KB lazy load on first Nope tap over slow WiFi
void import('@client/shared/motion-features')

// Suppress PWA install prompt — this is a web game, not an app
window.addEventListener('beforeinstallprompt', (e) => e.preventDefault())

// Global error reporting
window.addEventListener('error', (e) => console.error('Uncaught:', e.error))
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled:', e.reason))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary autoRecover autoRecoverMs={2000}>
      <MotionProvider>
        <ReducedMotionProvider>
          <Player />
        </ReducedMotionProvider>
      </MotionProvider>
    </ErrorBoundary>
  </StrictMode>
)
