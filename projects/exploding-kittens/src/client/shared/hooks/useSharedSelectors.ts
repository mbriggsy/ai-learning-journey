import { useGameSelector } from '../gameStore'
import type { BoardPlayer, NopeWindowView, PendingPromptView } from '@shared/protocol'
import type { GamePhase, GameEvent } from '@shared/types'

// Module-level constants prevent new reference creation on every call
const EMPTY_PLAYERS: readonly BoardPlayer[] = []
const EMPTY_EVENTS: readonly GameEvent[] = []

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

export function useDiscardTop(): { id: string; type: string } | null {
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

export function useEvents(): readonly GameEvent[] {
  return useGameSelector(s => {
    if (!s || s.phase === 'lobby') return EMPTY_EVENTS
    if (s.phase === 'playing') return s.events
    return s.events
  })
}

export function useIsGameOver(): boolean {
  return useGameSelector(s => s?.phase === 'game_over')
}

export function useWinnerId(): string | null {
  return useGameSelector(s => {
    if (s?.phase === 'game_over') return s.winnerId
    return null
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

export function useEliminationOrder(): readonly string[] | null {
  return useGameSelector(s => {
    if (s?.phase === 'game_over') return s.eliminationOrder
    return null
  })
}
