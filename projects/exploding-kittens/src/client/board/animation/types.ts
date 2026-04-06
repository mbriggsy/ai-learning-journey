import type { CardType, GameEvent } from '@shared/types'

export type AnimationTrigger =
  | { kind: 'ek-reveal'; playerId: string }
  | { kind: 'nope-impact'; playerId: string; chainDepth: number }
  | { kind: 'card-play'; playerId: string; cardType: CardType }
  | { kind: 'card-draw'; playerId: string }
  | { kind: 'turn-change'; playerId: string }
  | { kind: 'elimination'; playerId: string }
  | { kind: 'victory'; winnerId: string }
  | { kind: 'shuffle' }
  | { kind: 'favor-transfer'; fromId: string; toId: string }
  | { kind: 'defuse-relief'; playerId: string }

export type RevealPhase =
  | 'idle'
  | 'revealing'      // steps 1-5 playing (2.5s)
  | 'tension-hold'   // waiting for server resolution
  | 'relief'         // Defuse played — exhale animation
  | 'elimination'    // No defuse — player eliminated
  | 'fast-forward'   // game advanced past reveal (reconnection)

/**
 * Derive an AnimationTrigger from a GameEvent.
 * Returns null for events that are text-only (no TV animation).
 */
export function deriveAnimationTrigger(event: GameEvent): AnimationTrigger | null {
  switch (event.type) {
    case 'exploding-kitten-drawn':
      return { kind: 'ek-reveal', playerId: event.playerId }
    case 'nope-played':
      return { kind: 'nope-impact', playerId: event.playerId, chainDepth: event.chainDepth }
    case 'card-played':
      return { kind: 'card-play', playerId: event.playerId, cardType: event.cardType }
    case 'card-drawn':
      return { kind: 'card-draw', playerId: event.playerId }
    case 'turn-started':
      return { kind: 'turn-change', playerId: event.playerId }
    case 'player-eliminated':
      return { kind: 'elimination', playerId: event.playerId }
    case 'game-over':
      return { kind: 'victory', winnerId: event.winnerId }
    case 'deck-shuffled':
      return { kind: 'shuffle' }
    case 'favor-given':
      return { kind: 'favor-transfer', fromId: event.giverId, toId: event.receiverId }
    case 'defuse-played':
      return { kind: 'defuse-relief', playerId: event.playerId }

    // Text announcement only — no dedicated TV animation
    case 'game-started':
    case 'nope-window-opened':
    case 'nope-window-resolved':
    case 'favor-requested':
    case 'future-peeked':
    case 'future-rearranged':
    case 'combo-steal':
      return null

    default: {
      const _exhaustive: never = event
      return _exhaustive
    }
  }
}
