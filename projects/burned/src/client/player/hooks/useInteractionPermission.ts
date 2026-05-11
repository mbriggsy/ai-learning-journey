import type { GamePhase, SubPhase } from '@shared/types'
import type { PendingPromptView } from '@shared/protocol'

export type InteractionBlockReason =
  | 'not-my-turn'
  | 'sub-phase-active'
  | 'game-over'
  | 'eliminated'
  | 'play-in-flight'

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
  nopeWindowActive: boolean,
): InteractionPermission {
  if (gamePhase === 'game_over') return { allowed: false, reason: 'game-over' }
  if (!isAlive) return { allowed: false, reason: 'eliminated' }

  // Pending prompt for another player blocks hand interaction
  if (pendingPrompt && pendingPrompt.playerId !== myPlayerId) {
    return { allowed: false, reason: 'sub-phase-active' }
  }

  // Favor-response is the one prompt where the target interacts with their
  // real hand + staging area (not a sheet), so we keep interaction OPEN even
  // though it's not their turn and subPhase is favor-pending. SmartActionBox
  // enforces the favor-specific constraints (1 card, no Burned).
  if (pendingPrompt?.type === 'favor-response' && pendingPrompt.playerId === myPlayerId) {
    return { allowed: true }
  }

  // Pending prompt for ME — block normal card play (sheets handle the interaction)
  if (subPhase && subPhase !== 'turn-active' && pendingPrompt?.playerId === myPlayerId) {
    return { allowed: false, reason: 'sub-phase-active' }
  }

  // Actor mid-nope-window: the card they just played is in flight awaiting
  // intercept resolution. Staging another card now is nonsense — there is
  // no "queue a follow-up play" mechanic. Chain-intercept (the actor's only
  // legal action during their own nope window, at chainDepth >= 1) routes
  // through SmartActionBox's Counter button, not staging. Briggsy
  // 2026-05-11 couch finding: Dash played Go Dark and could still stage
  // cards while waiting for intercepts. Non-actors are already blocked by
  // the !isMyTurn branch below, so this gate is functionally
  // (isMyTurn && nopeWindowActive).
  if (isMyTurn && nopeWindowActive) {
    return { allowed: false, reason: 'play-in-flight' }
  }

  if (!isMyTurn) return { allowed: false, reason: 'not-my-turn' }

  return { allowed: true }
}
