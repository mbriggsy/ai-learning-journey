import {
  useDrawPileCount, useDiscardRecent,
  usePlayerList, useCurrentTurn, usePendingPrompt,
} from '@client/shared/hooks/useSharedSelectors'
import { DrawPile } from './DrawPile'
import { DiscardFan } from './DiscardFan'
import { DossierFeed } from './DossierFeed'
import { Nameplate } from './Nameplate'
import styles from './BlotterContent.module.css'

/**
 * Desk-surface layout. Three zones inside the wood frame interior:
 *   - Left half: draw + discard piles (stacked on mahogany).
 *   - Right half: COMMS as a manila dossier folder (DossierFeed).
 *   - Bottom strip: brass nameplate showing the active player's codename,
 *     flipping on turn handoff.
 *
 * Component filename retained through the phased rebuild; rename to
 * DeskSurface once Phase 5 lands and the desk vocabulary is fully locked.
 */
export function BlotterContent() {
  const drawPileCount = useDrawPileCount()
  const recentDiscards = useDiscardRecent(3)
  const players = usePlayerList()
  const currentTurn = useCurrentTurn()
  const prompt = usePendingPrompt()

  return (
    <div className={styles.content}>
      <div className={styles.piles}>
        <div className={`${styles.pileSection} ${styles.pilesDraw}`}>
          <DrawPile count={drawPileCount} />
          <div className={styles.pileLabelGroup}>
            <span className={styles.pileCaption}>Remaining</span>
            <span className={styles.pileCaption}>In Field</span>
            <span className={styles.pileLabel}>Draw</span>
          </div>
        </div>

        <div className={styles.pileSection}>
          <DiscardFan recentCards={recentDiscards} />
          <div className={styles.pileLabelGroup}>
            <span className={styles.pileLabel}>Discard</span>
            <span className={styles.pileCaption}>Last Plays</span>
          </div>
        </div>
      </div>

      <div className={styles.comms}>
        <DossierFeed players={players} />
      </div>

      <div className={styles.statusStrip}>
        <Nameplate
          players={players}
          currentTurn={currentTurn}
          prompt={prompt}
        />
      </div>
    </div>
  )
}
