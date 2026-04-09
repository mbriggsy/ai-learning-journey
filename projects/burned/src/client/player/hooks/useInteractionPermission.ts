import type { GamePhase, SubPhase } from '@shared/types'
import type { PendingPromptView } from '@shared/protocol'

export type InteractionBlockReason =
  | 'not-my-turn'
  | 'sub-phase-active'
  | 'game-over'
  | 'eliminated'

export type InteractionPermission =
  | { allowed: true }
  | { allowed: false; reason: InteractionBlockReason }

export function deriveInteractionPermission(
  isMyTurn: boolean,
  subPhase: SubPhase | null,
  isAlive: boolean,
  gamePhase: GamePhase | null,
  pendingPrompt: PendingPromptView | null,
  myPlayerId: string | null,
): InteractionPermission {
  if (gamePhase === 'game_over') return { allowed: false, reason: 'game-over' }
  if (!isAlive) return { allowed: false, reason: 'eliminated' }

  // Pending prompt for another player blocks hand interaction
  if (pendingPrompt && pendingPrompt.playerId !== myPlayerId) {
    return { allowed: false, reason: 'sub-phase-active' }
  }

  // Pending prompt for ME — block normal card play (sheets handle the interaction)
  if (subPhase && subPhase !== 'turn-active' && pendingPrompt?.playerId === myPlayerId) {
    return { allowed: false, reason: 'sub-phase-active' }
  }

  if (!isMyTurn) return { allowed: false, reason: 'not-my-turn' }

  return { allowed: true }
}
