import { m, AnimatePresence } from 'motion/react'
import {
  useDrawPileCount, useDiscardRecent,
  usePlayerList, useCurrentTurn, usePendingPrompt,
} from '@client/shared/hooks/useSharedSelectors'
import { DrawPile } from './DrawPile'
import { DiscardFan } from './DiscardFan'
import { DossierFeed } from './DossierFeed'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import { playerName } from './playerName'
import { MOTION } from '@client/shared/tokens/motion'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import styles from './BlotterContent.module.css'

function getStatusText(
  currentTurn: { currentPlayerId: string; turnsRemaining: number } | null,
  prompt: PendingPromptView | null,
  players: readonly BoardPlayer[],
): string {
  if (prompt) {
    const name = playerName(players, prompt.playerId)
    switch (prompt.type) {
      case 'defuse': return `${name} is reinserting the Burned file\u2026`
      case 'favor-response': return `${name} is handing over a card`
      case 'future-rearrange': return `${name} is rearranging the intel`
      case 'name-card': return `${name} is calling the shot`
    }
  }

  if (currentTurn) {
    const name = playerName(players, currentTurn.currentPlayerId)
    const extra = currentTurn.turnsRemaining > 1
      ? ` \u00b7 ${currentTurn.turnsRemaining} turns`
      : ''
    return `${name} is on deck${extra}`
  }

  return ''
}

/**
 * Desk-surface layout. Three zones inside the wood frame interior:
 *   - Left half: draw + discard piles (stacked on mahogany).
 *   - Right half: COMMS as a manila dossier folder (DossierFeed).
 *   - Bottom strip: current instruction / turn status (Phase 4 retires this
 *     for a brass nameplate).
 *
 * Component filename retained through the phased rebuild; rename to
 * DeskSurface when the status strip retires in Phase 4.
 */
export function BlotterContent() {
  const drawPileCount = useDrawPileCount()
  const recentDiscards = useDiscardRecent(3)
  const players = usePlayerList()
  const currentTurn = useCurrentTurn()
  const prompt = usePendingPrompt()

  const statusText = getStatusText(currentTurn, prompt, players)
  const activeColor = currentTurn
    ? players.find(p => p.id === currentTurn.currentPlayerId)?.color
    : undefined

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
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            // Key on the text itself so every turn handoff, prompt change,
            // and turns-remaining tick triggers a crossfade. "wait" mode
            // ensures exit completes before enter starts — avoids stacked
            // text artifacts during rapid state flips.
            key={statusText || '__standby__'}
            className={styles.statusInner}
            initial={{ opacity: 0, transform: 'translateY(3px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0, transform: 'translateY(-3px)' }}
            transition={MOTION.quickFade}
          >
            {statusText ? (
              <>
                {activeColor && <PlayerIcon color={activeColor} size={14} />}
                <span className={styles.statusText}>{statusText}</span>
              </>
            ) : (
              <span className={styles.statusPlaceholder}>// STANDBY</span>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
