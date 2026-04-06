import { useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { announce } from '@client/shared/announce'
import { playerName } from './playerName'
import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'
import styles from './AnnouncementFeed.module.css'

function formatEvent(event: GameEvent, players: readonly BoardPlayer[]): string | null {
  switch (event.type) {
    case 'game-started': return `Game on! ${event.playerCount} players`
    case 'card-played': {
      const name = playerName(players, event.playerId)
      const combo = event.comboSize && event.comboSize > 1 ? ` (${event.comboSize}x combo)` : ''
      return `${name} played ${event.cardType}${combo}`
    }
    case 'card-drawn': return event.safe ? `${playerName(players, event.playerId)} drew a card` : null
    case 'nope-played': return `${playerName(players, event.playerId)} said NOPE!`
    case 'nope-window-opened': return null
    case 'nope-window-resolved': return event.cancelled ? 'Resolved: Cancelled' : 'Resolved: Allowed'
    case 'exploding-kitten-drawn': return `${playerName(players, event.playerId)} drew an Exploding Kitten!`
    case 'defuse-played': return `${playerName(players, event.playerId)} defused!`
    case 'player-eliminated': return `${playerName(players, event.playerId)} eliminated! Rank #${event.rank}`
    case 'favor-requested': return `${playerName(players, event.requesterId)} demands a favor from ${playerName(players, event.targetId)}`
    case 'favor-given': return `${playerName(players, event.giverId)} gave ${playerName(players, event.receiverId)} a card`
    case 'future-peeked': return `${playerName(players, event.playerId)} peeked at the deck`
    case 'future-rearranged': return `${playerName(players, event.playerId)} rearranged the future`
    case 'deck-shuffled': return `${playerName(players, event.playerId)} shuffled the deck`
    case 'combo-steal': {
      const s = playerName(players, event.stealerId)
      const t = playerName(players, event.targetId)
      return event.found ? `${s} stole from ${t}` : `${s} tried to steal — nothing found`
    }
    case 'turn-started': return `${playerName(players, event.playerId)}'s turn (${event.turnsRemaining} remaining)`
    case 'game-over': return `${playerName(players, event.winnerId)} wins!`
    default: {
      const _exhaustive: never = event
      return _exhaustive
    }
  }
}

export function AnnouncementFeed() {
  const events = useEventFeed()
  const players = usePlayerList()

  // Screen reader announcements for new events — tracked by ID to survive array pruning
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
      const text = formatEvent(entry.event, players)
      if (!text) continue
      const isUrgent = entry.event.type === 'exploding-kitten-drawn' ||
        entry.event.type === 'player-eliminated' || entry.event.type === 'game-over'
      announce(text, isUrgent ? 'assertive' : 'polite')
    }
  }, [events, players])

  // Show latest 3 announcements
  const recent = events.slice(-3)

  return (
    <div className={styles.feed}>
      <AnimatePresence mode="popLayout">
        {recent.map(entry => {
          const text = formatEvent(entry.event, players)
          if (!text) return null
          return (
            <m.div
              key={entry.id}
              className={styles.announcement}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {text}
            </m.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
