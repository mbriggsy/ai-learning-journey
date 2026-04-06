import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '@client/shared/MotionProvider'
import { applyTheme } from '@client/shared/theme'
import { Board } from './Board'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <Board />
    </MotionProvider>
  </StrictMode>
)
