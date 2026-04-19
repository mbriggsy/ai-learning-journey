import { useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'motion/react'
import {
  useDrawPileCount, useDiscardRecent,
  usePlayerList, useCurrentTurn, usePendingPrompt,
} from '@client/shared/hooks/useSharedSelectors'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { DrawPile } from './DrawPile'
import { DiscardFan } from './DiscardFan'
import { formatEvent } from './events'
import { announce } from '@client/shared/announce'
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
 * The cream-paper briefing dossier layout. Three zones:
 *   - Left half: draw + discard piles (stacked).
 *   - Right half: COMMS event feed (newest on top, paper skin).
 *   - Bottom strip: current instruction / turn status (typewriter baseline).
 *
 * Sits over the decorative `.blotter` div in GameTable. Positioning mirrors
 * the blotter token dims so the content stays inside the paper edges at all
 * viewports.
 */
export function BlotterContent() {
  const drawPileCount = useDrawPileCount()
  const recentDiscards = useDiscardRecent(3)
  const players = usePlayerList()
  const currentTurn = useCurrentTurn()
  const prompt = usePendingPrompt()
  const events = useEventFeed()

  // Auto-scroll the comms stream to the newest entry (bottom) as events land.
  const streamRef = useRef<HTMLDivElement>(null)

  // Screen reader announcements — mirror of the old AnnouncementFeed logic.
  const lastAnnouncedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (events.length === 0) return
    const lastIdx = lastAnnouncedIdRef.current
      ? events.findIndex(e => e.id === lastAnnouncedIdRef.current)
      : -1
    const newEvents = events.slice(lastIdx + 1)
    if (newEvents.length === 0) return
    lastAnnouncedIdRef.current = newEvents[newEvents.length - 1]!.id
    for (const entry of newEvents) {
      const text = formatEvent(entry.event, players, entry.id)
      if (!text) continue
      const isUrgent = entry.event.type === 'burned-drawn' ||
        entry.event.type === 'player-eliminated' || entry.event.type === 'game-over'
      announce(text, isUrgent ? 'assertive' : 'polite')
    }
  }, [events, players])

  const rendered = events
    .map(entry => ({ entry, text: formatEvent(entry.event, players, entry.id) }))
    .filter((r): r is { entry: typeof events[number]; text: string } => r.text != null)

  // Pin the stream to its bottom when a new entry arrives. Using scrollTop
  // directly (not smooth) so it keeps pace even if events land quickly.
  useEffect(() => {
    const el = streamRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [rendered.length])

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
            <span className={styles.pileLabel}>Draw</span>
            <span className={styles.pileCaption}>Remaining · In Field</span>
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

      <div className={styles.comms} aria-hidden="true">
        <div className={styles.commsHeader}>Comms · Intercepted</div>
        <div className={styles.commsStream} ref={streamRef}>
          <AnimatePresence mode="popLayout">
            {rendered.map(({ entry, text }) => (
              <m.div
                key={entry.id}
                className={styles.announcement}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={MOTION.enter}
              >
                {text}
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.statusStrip}>
        {statusText ? (
          <>
            {activeColor && <PlayerIcon color={activeColor} size={14} />}
            <span className={styles.statusText}>{statusText}</span>
          </>
        ) : (
          <span className={styles.statusPlaceholder}>// STANDBY</span>
        )}
      </div>
    </div>
  )
}
