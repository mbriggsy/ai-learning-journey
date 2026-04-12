import { useRef } from 'react'
import {
  usePlayerList, useDrawPileCount, useDiscardTop,
  useCurrentTurn,
} from '@client/shared/hooks/useSharedSelectors'
import { PlayerRing } from './PlayerRing'
import { Arena } from './Arena'
import { DrawPile } from './DrawPile'
import { DiscardFan } from './DiscardFan'
import { NopeCountdownBar } from './NopeCountdownBar'
import { AnnouncementFeed } from './AnnouncementFeed'
import { StatusBar } from './StatusBar'
import styles from './GameTable.module.css'

export function GameTable() {
  const players = usePlayerList()
  const drawPileCount = useDrawPileCount()
  const discardTop = useDiscardTop()
  const currentTurn = useCurrentTurn()
  const flashRef = useRef<HTMLDivElement>(null)

  return (
    <div className={styles.table}>
      {/* The Pendleton Agency — war-room felt decoration */}
      <div className={styles.feltBranding} aria-hidden="true" />

      {/* Player ring */}
      <PlayerRing
        players={players}
        currentPlayerId={currentTurn?.currentPlayerId ?? null}
        turnsRemaining={currentTurn?.turnsRemaining ?? 0}
      />

      {/* Center stage — draw pile + discard, tight together */}
      <div className={styles.center}>
        <div className={styles.pileSection}>
          <DrawPile count={drawPileCount} />
          <span className={styles.pileLabel}>Draw</span>
        </div>

        <div className={styles.pileSection}>
          <DiscardFan topCard={discardTop} />
          <span className={styles.pileLabel}>Discard</span>
        </div>
      </div>

      {/* Arena overlaid on center — cards land here during play */}
      <Arena />

      {/* Full-screen event flash — GSAP target */}
      <div ref={flashRef} className={styles.eventFlash} />

      {/* Overlays */}
      <NopeCountdownBar />
      <AnnouncementFeed />

      {/* Comms bar — bottom strip */}
      <StatusBar />
    </div>
  )
}
