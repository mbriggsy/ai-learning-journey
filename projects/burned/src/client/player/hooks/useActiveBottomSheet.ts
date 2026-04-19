import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import type { CardInstance } from '@shared/types'

export type ActiveBottomSheet =
  | { sheet: 'defuse-placement'; maxPosition: number }
  | { sheet: 'future-peek'; cards: readonly CardInstance[]; canRearrange: boolean }
  | { sheet: 'name-card'; targetName: string }

export function deriveActiveBottomSheet(
  pendingPrompt: PendingPromptView | null,
  myPlayerId: string | null,
  players: readonly BoardPlayer[],
  _hand: readonly CardInstance[],
  drawPileCount: number,
  futureCards: readonly CardInstance[] | undefined,
): ActiveBottomSheet | null {
  if (!myPlayerId) return null

  // Server-prompted sheets (pendingPrompt targeting me).
  // favor-response intentionally omitted — handled inline via hand + staging
  // (unified play flow) instead of a dedicated sheet.
  if (pendingPrompt && pendingPrompt.playerId === myPlayerId) {
    switch (pendingPrompt.type) {
      case 'defuse':
        return { sheet: 'defuse-placement', maxPosition: drawPileCount }

      case 'favor-response':
        return null

      case 'future-rearrange':
        return {
          sheet: 'future-peek',
          cards: futureCards ?? [],
          canRearrange: true,
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
