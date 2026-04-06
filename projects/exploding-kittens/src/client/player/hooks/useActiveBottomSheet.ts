import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import type { CardInstance } from '@shared/types'

export type ActiveBottomSheet =
  | { sheet: 'target-select-prompted'; eligiblePlayers: readonly BoardPlayer[] }
  | { sheet: 'defuse-placement'; maxPosition: number }
  | { sheet: 'future-peek'; cards: readonly CardInstance[]; canRearrange: boolean }
  | { sheet: 'favor-response'; requesterName: string; hand: readonly CardInstance[] }
  | { sheet: 'name-card'; targetName: string }

export function deriveActiveBottomSheet(
  pendingPrompt: PendingPromptView | null,
  myPlayerId: string | null,
  players: readonly BoardPlayer[],
  hand: readonly CardInstance[],
  drawPileCount: number,
  futureCards: readonly CardInstance[] | undefined,
): ActiveBottomSheet | null {
  if (!myPlayerId) return null

  // Server-prompted sheets (pendingPrompt targeting me)
  if (pendingPrompt && pendingPrompt.playerId === myPlayerId) {
    switch (pendingPrompt.type) {
      case 'defuse':
        return { sheet: 'defuse-placement', maxPosition: drawPileCount }

      case 'favor-response': {
        const requester = players.find(p => p.id === pendingPrompt.requesterId)
        return {
          sheet: 'favor-response',
          requesterName: requester?.name ?? 'Unknown',
          hand,
        }
      }

      case 'future-rearrange':
        return {
          sheet: 'future-peek',
          cards: futureCards ?? [],
          canRearrange: true,
        }

      case 'steal-target': {
        const eligible = players.filter(p => p.isAlive && p.id !== myPlayerId)
        return { sheet: 'target-select-prompted', eligiblePlayers: eligible }
      }

      case 'name-card': {
        const target = players.find(p => p.id === pendingPrompt.targetId)
        return { sheet: 'name-card', targetName: target?.name ?? 'Unknown' }
      }
    }
  }

  // See the Future (read-only) — no pendingPrompt, but privateData has futureCards
  if (futureCards && futureCards.length > 0) {
    return {
      sheet: 'future-peek',
      cards: futureCards,
      canRearrange: false,
    }
  }

  return null
}
