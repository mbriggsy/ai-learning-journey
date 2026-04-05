import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '@client/shared/MotionProvider'
import { Player } from './Player'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <Player />
    </MotionProvider>
  </StrictMode>
)
