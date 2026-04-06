import {
  usePlayerList, useDrawPileCount, useDiscardTop,
  useCurrentTurn,
} from '@client/shared/hooks/useSharedSelectors'
import { MinimalCard } from '@client/shared/MinimalCard'
import type { CardType } from '@shared/types'
import { PlayerList } from './PlayerList'
import { NopeCountdownBar } from './NopeCountdownBar'
import { AnnouncementFeed } from './AnnouncementFeed'
import { PendingPromptBanner } from './PendingPromptBanner'
import styles from './GameTable.module.css'

export function GameTable() {
  const players = usePlayerList()
  const drawPileCount = useDrawPileCount()
  const discardTop = useDiscardTop()
  const currentTurn = useCurrentTurn()

  return (
    <div className={styles.table}>
      <PlayerList
        players={players}
        currentPlayerId={currentTurn?.currentPlayerId ?? null}
      />

      <div className={styles.center}>
        <div className={styles.pile}>
          <span className={styles.pileLabel}>Draw Pile</span>
          <span className={styles.pileCount}>{drawPileCount}</span>
        </div>

        <div className={styles.pile}>
          <span className={styles.pileLabel}>Discard</span>
          <div className={styles.discardCard}>
            {discardTop ? (
              <MinimalCard
                id={discardTop.id}
                type={discardTop.type as CardType}
                disabled
              />
            ) : (
              <span className={styles.pileCount}>-</span>
            )}
          </div>
        </div>
      </div>

      {currentTurn && (
        <div className={styles.turnInfo}>
          {players.find(p => p.id === currentTurn.currentPlayerId)?.name ?? '...'}'s turn
          {currentTurn.turnsRemaining > 1 && ` (${currentTurn.turnsRemaining} turns remaining)`}
        </div>
      )}

      <NopeCountdownBar />
      <PendingPromptBanner />
      <AnnouncementFeed />
    </div>
  )
}
