import type { HostState, LobbyState } from '../../shared/protocol';

export type HostScreenId =
  | 'lobby'
  | 'game-board';

export type HostOverlayId =
  | 'nomination'
  | 'election-results'
  | 'policy-enacted'
  | 'auto-enact'
  | 'executive-power'
  | 'game-over'
  | 'veto-proposed'
  | 'veto-result'
  | 'deck-reshuffled'
  | 'policy-session-active'
  | 'role-reveal-waiting';

export interface HostViewState {
  screen: HostScreenId;
  overlays: HostOverlayId[];
}

/**
 * Pure function: derives which screen and overlays to show from HostState.
 * The game board is ALWAYS the base screen during play — transient info shows as overlays.
 */
export function getHostView(state: HostState | LobbyState): HostViewState {
  const overlays: HostOverlayId[] = [];

  if (state.phase === 'lobby') return { screen: 'lobby', overlays };

  // Game over — board visible underneath
  if (state.phase === 'game-over') {
    overlays.push('game-over');
    return { screen: 'game-board', overlays };
  }

  // Transient overlays on top of board
  if (state.subPhase === 'role-reveal-waiting')
    overlays.push('role-reveal-waiting');
  else if (state.subPhase === 'election-result')
    overlays.push('election-results');
  else if (state.subPhase === 'policy-enact')
    overlays.push('policy-enacted');
  else if (state.subPhase === 'auto-enact')
    overlays.push('auto-enact');
  else if (state.subPhase === 'executive-power-pending' || state.subPhase === 'policy-peek-viewing')
    overlays.push('executive-power');
  else if (state.subPhase === 'nomination-pending' || state.subPhase === 'election-voting')
    overlays.push('nomination');

  // Concurrent overlays
  if (state.subPhase === 'policy-veto-propose' || state.subPhase === 'policy-veto-response')
    overlays.push('veto-proposed');
  if (state.subPhase === 'policy-mayor-discard' || state.subPhase === 'policy-chief-discard')
    overlays.push('policy-session-active');

  return { screen: 'game-board', overlays };
}

export function getTransitionType(
  prev: HostViewState,
  next: HostViewState,
  isReconnect: boolean,
): 'none' | 'crossfade' | 'instant' {
  if (isReconnect) return 'instant';
  if (prev.screen === next.screen) return 'none';
  return 'crossfade';
}
