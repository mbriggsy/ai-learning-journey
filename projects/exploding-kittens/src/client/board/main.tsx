import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '@client/shared/MotionProvider'
import { ReducedMotionProvider } from '@client/shared/ReducedMotionProvider'
import { ErrorBoundary } from '@client/shared/ErrorBoundary'
import { applyTheme } from '@client/shared/theme'
import { Board } from './Board'

applyTheme()

// Global error reporting
window.addEventListener('error', (e) => console.error('Uncaught:', e.error))
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled:', e.reason))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary autoRecover autoRecoverMs={1000}>
      <MotionProvider>
        <ReducedMotionProvider>
          <Board />
        </ReducedMotionProvider>
      </MotionProvider>
    </ErrorBoundary>
  </StrictMode>
)
