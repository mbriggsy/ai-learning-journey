import { useGameSelector } from '../gameStore'
import type { BoardPlayer, NopeWindowView, PendingPromptView } from '@shared/protocol'
import type { CardInstance, GamePhase } from '@shared/types'

const EMPTY_PLAYERS: readonly BoardPlayer[] = []

export function useGamePhase(): GamePhase | null {
  return useGameSelector(s => s?.phase ?? null)
}

export function usePlayerList(): readonly BoardPlayer[] {
  return useGameSelector(s => {
    if (!s || s.phase === 'lobby') return EMPTY_PLAYERS
    return s.players
  })
}

export function useDrawPileCount(): number {
  return useGameSelector(s => {
    if (!s || s.phase === 'lobby') return 0
    return s.drawPileCount
  })
}

export function useDiscardTop(): CardInstance | null {
  return useGameSelector(s => {
    if (!s || s.phase === 'lobby') return null
    const pile = s.discardPile
    return pile.length > 0 ? pile[pile.length - 1]! : null
  })
}

// Top N discarded cards, newest first. Used by the board's DiscardFan to show
// a shallow history stack — the discard is the hero on the blotter, the draw
// pile is decorative. Cap defensively at the pile length so callers don't have
// to guard against undersized piles.
export function useDiscardRecent(count: number): readonly CardInstance[] {
  return useGameSelector(s => {
    if (!s || s.phase === 'lobby') return EMPTY_CARDS
    const pile = s.discardPile
    if (pile.length === 0) return EMPTY_CARDS
    const take = Math.min(count, pile.length)
    const result: CardInstance[] = []
    for (let i = 0; i < take; i++) {
      result.push(pile[pile.length - 1 - i]!)
    }
    return result
  })
}

const EMPTY_CARDS: readonly CardInstance[] = []

export function useNopeWindow(): NopeWindowView | null {
  return useGameSelector(s => {
    if (!s || s.phase !== 'playing') return null
    return s.nopeWindow
  })
}

export function useStateVersion(): number {
  return useGameSelector(s => {
    if (!s || s.phase === 'lobby') return 0
    return s.stateVersion
  })
}

export function usePendingPrompt(): PendingPromptView | null {
  return useGameSelector(s => {
    if (!s || s.phase !== 'playing') return null
    return s.pendingPrompt
  })
}

export function useCurrentTurn(): { currentPlayerId: string; turnsRemaining: number } | null {
  return useGameSelector(s => {
    if (!s || s.phase !== 'playing') return null
    return s.currentTurn
  })
}
