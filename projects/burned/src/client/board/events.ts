import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'
import { playerName } from './playerName'

function pick(variants: readonly string[], seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return variants[Math.abs(hash) % variants.length]!
}

export function formatEvent(event: GameEvent, players: readonly BoardPlayer[], eventId: string): string | null {
  const n = (id: string) => playerName(players, id)

  switch (event.type) {
    case 'game-started':
      return pick([
        `${event.playerCount} operatives. Cleared hot.`,
        `${event.playerCount} deploy. 1 makes it home.`,
        `Briefing over. ${event.playerCount} in the field.`,
        `The Pendleton Agency is live.`,
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
          `${n(event.playerId)} draws a card, and is safe. For now.`,
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
        : null

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
        `${n(event.playerId)} shuffles — nobody knows anything.`,
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

    case 'name-card-cancelled': {
      const s = n(event.stealerId)
      return pick([
        `${s} called off the raid.`,
        `${s} stood down.`,
        `${s} had second thoughts.`,
      ], eventId)
    }

    case 'turn-started':
      return null

    case 'game-over':
      return pick([
        `${n(event.winnerId)} WINS!`,
        `${n(event.winnerId)} is the last one standing!`,
        `${n(event.winnerId)} survived the agency!`,
        `All hail ${n(event.winnerId)}!`,
      ], eventId)

    default: {
      // TypeScript-exhaustive check: if a new GameEvent variant is added
      // without a case here, this fails compilation. At runtime, return
      // null instead of the object itself so an unknown event (protocol
      // drift, stale client, future card, server bug) doesn't get handed
      // to React as a child — which throws and, because events are
      // server-cumulative (500-cap replays on remount), wedges the board
      // permanently in ErrorBoundary Recovering state.
      // E2E audit 2026-04-23 C-05 — verified crash-loop reproducible.
      const _exhaustive: never = event
      void _exhaustive
      if (typeof console !== 'undefined') {
        const type = (event as { type?: string }).type ?? 'unknown'
        console.warn(`[events] unknown event type rendered as null: ${type}`)
      }
      return null
    }
  }
}
