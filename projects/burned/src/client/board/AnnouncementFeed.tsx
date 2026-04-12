import { useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { announce } from '@client/shared/announce'
import { playerName } from './playerName'
import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './AnnouncementFeed.module.css'

// Pick a random variant. Seeded per-event-id for consistency across re-renders.
function pick(variants: readonly string[], seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return variants[Math.abs(hash) % variants.length]!
}

function formatEvent(event: GameEvent, players: readonly BoardPlayer[], eventId: string): string | null {
  const n = (id: string) => playerName(players, id)

  switch (event.type) {
    case 'game-started':
      return pick([
        `${event.playerCount} players. No mercy.`,
        `${event.playerCount} enter. 1 survives.`,
        `Game on — ${event.playerCount} brave souls.`,
        `Let the chaos begin.`,
      ], eventId)

    case 'card-played': {
      const name = n(event.playerId)
      const combo = event.comboSize && event.comboSize > 1 ? ` (${event.comboSize}x combo!)` : ''
      return pick([
        `${name} plays ${event.cardType}${combo}`,
        `${name} drops ${event.cardType}${combo}`,
        `${name} slams down ${event.cardType}${combo}`,
      ], eventId)
    }

    case 'card-drawn':
      return event.safe
        ? pick([
          `${n(event.playerId)} draws... and lives.`,
          `${n(event.playerId)} survives the draw.`,
          `Safe. For now.`,
          `${n(event.playerId)} got lucky.`,
        ], eventId)
        : null

    case 'nope-played':
      return pick([
        `${n(event.playerId)} says INTERCEPTED!`,
        `INTERCEPTED — ${n(event.playerId)}`,
        `${n(event.playerId)} shuts it down.`,
        `Blocked by ${n(event.playerId)}.`,
      ], eventId)

    case 'nope-window-opened':
      return null

    case 'nope-window-resolved':
      return event.cancelled
        ? pick(['Cancelled!', 'Shot down.', 'Counter-intel wins.'], eventId)
        : null // allowed actions don't need commentary

    case 'burned-drawn':
      return pick([
        `${n(event.playerId)} GOT BURNED`,
        `COVER BLOWN. ${n(event.playerId)} is compromised.`,
        `RIP ${n(event.playerId)}'s cover story`,
        `${n(event.playerId)} is in deep trouble`,
      ], eventId)

    case 'extraction-played':
      return pick([
        `${n(event.playerId)} called in an extraction!`,
        `${n(event.playerId)} lives to run another op.`,
        `Crisis averted by ${n(event.playerId)}.`,
        `${n(event.playerId)} activated their contingency.`,
      ], eventId)

    case 'player-eliminated':
      return pick([
        `${n(event.playerId)} is burned. #${event.rank}`,
        `${n(event.playerId)} is toast. Rank #${event.rank}`,
        `Goodbye, ${n(event.playerId)}. #${event.rank}`,
        `${n(event.playerId)} has been disavowed. #${event.rank}`,
      ], eventId)

    case 'favor-requested':
      return pick([
        `${n(event.requesterId)} demands tribute from ${n(event.targetId)}`,
        `${n(event.requesterId)} wants a card from ${n(event.targetId)}`,
        `Pay up, ${n(event.targetId)}.`,
      ], eventId)

    case 'favor-given':
      return pick([
        `${n(event.giverId)} reluctantly hands one over`,
        `${n(event.receiverId)} got what they wanted`,
      ], eventId)

    case 'future-peeked':
      return pick([
        `${n(event.playerId)} peeks at the future...`,
        `${n(event.playerId)} knows what's coming.`,
        `${n(event.playerId)} has inside information.`,
      ], eventId)

    case 'future-rearranged':
      return pick([
        `${n(event.playerId)} rearranged the future.`,
        `${n(event.playerId)} is playing god with the deck.`,
        `The future just changed.`,
      ], eventId)

    case 'deck-shuffled':
      return pick([
        `${n(event.playerId)} shuffled the deck. All bets off.`,
        `Deck shuffled. Nobody knows anything.`,
        `${n(event.playerId)} hits the reset button.`,
      ], eventId)

    case 'combo-steal': {
      const s = n(event.stealerId)
      const t = n(event.targetId)
      return event.found
        ? pick([
          `${s} steals from ${t}!`,
          `${s} pickpockets ${t}.`,
          `${t} just got robbed by ${s}.`,
        ], eventId)
        : pick([
          `${s} tried to steal — nothing there!`,
          `Empty-handed. Nice try, ${s}.`,
          `${t}'s pockets were empty.`,
        ], eventId)
    }

    case 'turn-started':
      return null // PlayerRing glow is the turn indicator

    case 'game-over':
      return pick([
        `${n(event.winnerId)} WINS!`,
        `${n(event.winnerId)} is the last one standing!`,
        `${n(event.winnerId)} survived the agency!`,
        `All hail ${n(event.winnerId)}!`,
      ], eventId)

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
      const text = formatEvent(entry.event, players, entry.id)
      if (!text) continue
      const isUrgent = entry.event.type === 'burned-drawn' ||
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
          const text = formatEvent(entry.event, players, entry.id)
          if (!text) return null
          return (
            <m.div
              key={entry.id}
              className={styles.announcement}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={MOTION.enter}
            >
              {text}
            </m.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
