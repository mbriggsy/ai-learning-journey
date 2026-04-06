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
