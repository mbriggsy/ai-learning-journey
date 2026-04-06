import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '@client/shared/MotionProvider'
import { ReducedMotionProvider } from '@client/shared/ReducedMotionProvider'
import { applyTheme } from '@client/shared/theme'
import { Player } from './Player'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <ReducedMotionProvider>
        <Player />
      </ReducedMotionProvider>
    </MotionProvider>
  </StrictMode>
)
