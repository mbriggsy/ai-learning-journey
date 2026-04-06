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
import { PendingPromptBanner } from './PendingPromptBanner'
import { playerName } from './playerName'
import styles from './GameTable.module.css'

export function GameTable() {
  const players = usePlayerList()
  const drawPileCount = useDrawPileCount()
  const discardTop = useDiscardTop()
  const currentTurn = useCurrentTurn()

  const currentPlayerName = currentTurn
    ? playerName(players, currentTurn.currentPlayerId)
    : null

  return (
    <div className={styles.table}>
      {/* Player ring — absolute positioned around the edges */}
      <PlayerRing
        players={players}
        currentPlayerId={currentTurn?.currentPlayerId ?? null}
        turnsRemaining={currentTurn?.turnsRemaining ?? 0}
      />

      {/* Center stage — draw pile, arena, discard */}
      <div className={styles.center}>
        <div className={styles.pileSection}>
          <span className={styles.pileLabel}>Draw</span>
          <DrawPile count={drawPileCount} />
        </div>

        <Arena />

        <div className={styles.pileSection}>
          <span className={styles.pileLabel}>Discard</span>
          <DiscardFan topCard={discardTop} />
        </div>
      </div>

      {/* Turn info */}
      {currentPlayerName && (
        <div className={styles.turnInfo}>
          {currentPlayerName}'s turn
          {currentTurn!.turnsRemaining > 1 && (
            <span className={styles.turnCount}>
              {currentTurn!.turnsRemaining} turns
            </span>
          )}
        </div>
      )}

      {/* Overlays */}
      <NopeCountdownBar />
      <PendingPromptBanner />
      <AnnouncementFeed />
    </div>
  )
}
