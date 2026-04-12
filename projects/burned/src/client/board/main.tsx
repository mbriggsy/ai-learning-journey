import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import '@client/shared/tokens/semantic.board.css'
import '@client/shared/tokens/fonts.css'
import { MotionProvider } from '@client/shared/MotionProvider'
import { ReducedMotionProvider } from '@client/shared/ReducedMotionProvider'
import { ErrorBoundary } from '@client/shared/ErrorBoundary'
import { Board } from './Board'

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
