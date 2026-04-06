import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'
import styles from './AnnouncementFeed.module.css'

function nameOf(players: readonly BoardPlayer[], id: string): string {
  return players.find(p => p.id === id)?.name ?? 'Unknown'
}

function formatEvent(event: GameEvent, players: readonly BoardPlayer[]): string | null {
  switch (event.type) {
    case 'game-started': return `Game on! ${event.playerCount} players`
    case 'card-played': {
      const name = nameOf(players, event.playerId)
      const combo = event.comboSize && event.comboSize > 1 ? ` (${event.comboSize}x combo)` : ''
      return `${name} played ${event.cardType}${combo}`
    }
    case 'card-drawn': return event.safe ? `${nameOf(players, event.playerId)} drew a card` : null
    case 'nope-played': return `${nameOf(players, event.playerId)} said NOPE!`
    case 'nope-window-opened': return null // handled by countdown bar
    case 'nope-window-resolved': return event.cancelled ? 'Resolved: Cancelled' : 'Resolved: Allowed'
    case 'exploding-kitten-drawn': return `${nameOf(players, event.playerId)} drew an Exploding Kitten!`
    case 'defuse-played': return `${nameOf(players, event.playerId)} defused!`
    case 'player-eliminated': return `${nameOf(players, event.playerId)} eliminated! Rank #${event.rank}`
    case 'favor-requested': return `${nameOf(players, event.requesterId)} demands a favor from ${nameOf(players, event.targetId)}`
    case 'favor-given': return `${nameOf(players, event.giverId)} gave ${nameOf(players, event.receiverId)} a card`
    case 'future-peeked': return `${nameOf(players, event.playerId)} peeked at the deck`
    case 'future-rearranged': return `${nameOf(players, event.playerId)} rearranged the future`
    case 'deck-shuffled': return `${nameOf(players, event.playerId)} shuffled the deck`
    case 'combo-steal': {
      const s = nameOf(players, event.stealerId)
      const t = nameOf(players, event.targetId)
      return event.found ? `${s} stole from ${t}` : `${s} tried to steal — nothing found`
    }
    case 'turn-started': return `${nameOf(players, event.playerId)}'s turn (${event.turnsRemaining} remaining)`
    case 'game-over': return `${nameOf(players, event.winnerId)} wins!`
  }
}

export function AnnouncementFeed() {
  const events = useEventFeed()
  const players = usePlayerList()

  // Show latest 3 announcements
  const recent = events.slice(-3)

  return (
    <div className={styles.feed}>
      {recent.map(entry => {
        const text = formatEvent(entry.event, players)
        if (!text) return null
        return (
          <div key={entry.id} className={styles.announcement}>
            {text}
          </div>
        )
      })}
    </div>
  )
}
