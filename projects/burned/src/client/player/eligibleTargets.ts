import type { BoardPlayer } from '@shared/protocol'

/** Reason a TargetSelect sheet is open for a pre-send action. */
export type LocalTargetReason =
  | 'direct-order'
  | 'call-in-a-favor'
  | 'combo-pair'
  | 'combo-triple'

const REASONS_REQUIRING_GIVEABLE_CARD: ReadonlySet<LocalTargetReason> = new Set([
  'call-in-a-favor',
  'combo-pair',
  'combo-triple',
])

/**
 * Filter the list of eligible TargetSelect targets for a pre-send action.
 *
 * Base filter: alive + not the actor (engine permits Direct Order self-
 * target per RULES §13.8, but the UI hides self for first-time-player
 * clarity — spec §2.3).
 *
 * For reasons that extract a card from the target's hand (Favor, pair
 * steal, triple named-steal), additionally exclude players with zero
 * cards. The engine silently auto-resolves these on a 0-card target
 * (no transfer, no principal acknowledgment beat — `engine.ts:625-635`
 * for Favor, same class for combos), so removing them from the picker
 * makes the empty-hand path unreachable in normal UI play. Mirrors the
 * unreachable-via-UI pattern used for the four catalog atomicity gaps
 * dismissed at SCENARIOS.md lock 2026-05-11 (Extraction proactive,
 * Direct Order eliminated target, Back-Channel empty deck, Favor self-
 * target). The engine branch remains in place as defense-in-depth so
 * the harness can still seed the empty-hand path via scripted input.
 *
 * Direct Order and Reassign do not extract from hand — their targets
 * are not filtered on `cardCount`.
 *
 * When `reason` is `null` (no TargetSelect open) the filter falls
 * through to the base shape — caller can use this for any list of
 * "playable targets" regardless of the staged card.
 */
export function getEligibleTargets(
  players: readonly BoardPlayer[],
  myPlayerId: string | null,
  reason: LocalTargetReason | null,
): readonly BoardPlayer[] {
  const requiresGiveableCard = reason !== null && REASONS_REQUIRING_GIVEABLE_CARD.has(reason)
  return players.filter(p => {
    if (!p.isAlive || p.id === myPlayerId) return false
    if (requiresGiveableCard && p.cardCount === 0) return false
    return true
  })
}
