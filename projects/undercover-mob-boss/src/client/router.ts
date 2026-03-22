import type { PlayerState, PrivateData } from '../shared/protocol';

export type ScreenId =
  | 'lobby'
  | 'role-reveal'
  | 'waiting'
  | 'vote'
  | 'mayor-nomination'
  | 'mayor-hand'
  | 'chief-hand'
  | 'veto-response'
  | 'power-investigate'
  | 'power-nominate'
  | 'power-peek'
  | 'power-execute'
  | 'investigation-result'
  | 'spectator'
  | 'game-over';

/**
 * Tracks investigation targets whose results have already been shown
 * and "burned" by the investigation-result view. Prevents the server
 * re-broadcasting investigationResult from flashing the screen again.
 *
 * Cleared on game-over / lobby so a fresh game starts clean.
 */
const burnedInvestigationTargets = new Set<string>();

/** Called by the investigation-result view after the auto-burn / manual dismiss. */
export function markInvestigationBurned(targetId: string): void {
  burnedInvestigationTargets.add(targetId);
}

/**
 * Deterministic function that maps server state to exactly one screen.
 * Uses the player's own data from the projected state.
 */
export function getActiveScreen(
  state: PlayerState,
  playerId: string,
  privateData?: PrivateData | null,
): ScreenId {
  if (state.phase === 'game-over') {
    burnedInvestigationTargets.clear();
    return 'game-over';
  }

  // Find self in player list
  const me = state.players.find((p) => p.id === playerId);
  const isAlive = me?.isAlive ?? false;
  const isMayor = me?.isMayor ?? false;
  const isChief = me?.isChief ?? false;

  if (!isAlive && state.phase !== 'lobby') return 'spectator';
  if (state.phase === 'lobby') {
    burnedInvestigationTargets.clear();
    return 'lobby';
  }
  if (state.phase === 'role-reveal') return 'role-reveal';

  // Show investigation result if we just received one AND haven't already burned it
  if (
    privateData?.investigationResult &&
    !burnedInvestigationTargets.has(privateData.investigationResult.targetId)
  ) {
    return 'investigation-result';
  }

  // Active player screens
  if (isMayor && state.subPhase === 'nomination-pending') return 'mayor-nomination';
  if (isMayor && state.subPhase === 'policy-mayor-discard') return 'mayor-hand';
  if (isMayor && state.subPhase === 'policy-veto-response') return 'veto-response';
  if (isChief && state.subPhase === 'policy-chief-discard') return 'chief-hand';
  // Executive powers are used by the Mayor (President), not the Chief (Chancellor)
  if (isMayor && state.subPhase === 'policy-peek-viewing') return 'power-peek';
  if (isMayor && state.subPhase === 'executive-power-pending') {
    switch (state.executivePower) {
      case 'investigate': return 'power-investigate';
      case 'special-nomination': return 'power-nominate';
      case 'execution': return 'power-execute';
    }
  }
  if (state.subPhase === 'election-voting' && !state.hasVoted) return 'vote';

  return 'waiting';
}
