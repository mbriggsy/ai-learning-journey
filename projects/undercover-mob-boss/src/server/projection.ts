/**
 * SECURITY-CRITICAL: Allowlist-based state projection.
 *
 * Every field is EXPLICITLY included. If a new field is added to GameState,
 * it is excluded by default until explicitly added here.
 *
 * NEVER sent to any client: policyDeck, policyDiscard, reshuffleThreshold,
 * other players' roles/knownAllies, cards belonging to other players,
 * rngSeed, acknowledgedPlayerIds.
 */

import type { GameState, GameEvent, Player } from '../shared/types';
import type { HostState, PlayerState, PublicPlayer, RevealedPlayer, PrivateData, SanitizedGameEvent } from '../shared/protocol';

function projectPlayer(player: Player, connected: boolean): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    isAlive: player.isAlive,
    isMayor: player.isMayor,
    isChief: player.isChief,
    wasLastMayor: player.wasLastMayor,
    wasLastChief: player.wasLastChief,
    isConnected: connected,
    // OMITTED: role, knownAllies
  };
}

/** Roles revealed ONLY at game-over */
function projectPlayerGameOver(player: Player, connected: boolean): RevealedPlayer {
  return {
    ...projectPlayer(player, connected),
    role: player.role,
  };
}

/**
 * Strip sensitive fields from events before broadcast.
 * - investigation-result: remove `result` (only the investigator should know)
 * - player-executed: remove `wasMobBoss` (revealed via game-over, not here)
 */
function sanitizeEvents(events: GameEvent[]): SanitizedGameEvent[] {
  return events.map((e): SanitizedGameEvent => {
    if (e.type === 'investigation-result') {
      return { type: e.type, targetId: e.targetId };
    }
    if (e.type === 'player-executed') {
      return { type: e.type, playerId: e.playerId };
    }
    return e;
  });
}

export function projectStateForHost(
  state: GameState,
  connectionStatus: Map<string, boolean>,
): HostState {
  const isGameOver = state.phase === 'game-over';

  return {
    phase: state.phase,
    subPhase: state.subPhase,
    round: state.round,
    players: state.players.map((p) =>
      isGameOver
        ? projectPlayerGameOver(p, connectionStatus.get(p.id) ?? false)
        : projectPlayer(p, connectionStatus.get(p.id) ?? false),
    ),
    nominatedChiefId: state.nominatedChiefId,
    goodPoliciesEnacted: state.goodPoliciesEnacted,
    badPoliciesEnacted: state.badPoliciesEnacted,
    electionTracker: state.electionTracker,
    // Votes only visible after all votes are in (election resolved)
    votes: state.subPhase === 'election-result' || state.phase === 'game-over'
      ? state.votes
      : null,
    executivePower: state.executivePower,
    winner: state.winner,
    winReason: state.winReason,
    events: sanitizeEvents(state.events),
    waitingOnPlayerIds: state.players
      .filter((p) => isPlayersTurn(state, p.id))
      .map((p) => p.id),
    // OMITTED: policyDeck, policyDiscard, reshuffleThreshold,
    //          mayorCards, chiefCards, vetoProposed, investigationHistory,
    //          specialNominatedMayorId, rngSeed, acknowledgedPlayerIds
  };
}

export function projectStateForPlayer(
  state: GameState,
  playerId: string,
  connectionStatus: Map<string, boolean>,
): PlayerState {
  const hostState = projectStateForHost(state, connectionStatus);
  const player = state.players.find((p) => p.id === playerId);

  return {
    ...hostState,
    myRole: player?.role ?? null,
    myKnownAllies: player?.knownAllies ?? null,
    isMyTurn: isPlayersTurn(state, playerId),
    hasVoted: state.votes[playerId] != null,
  };
}

/** Determine if this player needs to take action right now. */
export function isPlayersTurn(state: GameState, playerId: string): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player?.isAlive) return false;

  const mayor = state.players[state.mayorIndex];
  const chief = state.players.find((p) => p.id === state.nominatedChiefId);

  switch (state.subPhase) {
    case 'nomination-pending':
      return mayor?.id === playerId;
    case 'election-voting':
      return state.votes[playerId] == null && player.isAlive;
    case 'policy-mayor-discard':
    case 'policy-veto-response':
      return mayor?.id === playerId;
    case 'policy-chief-discard':
      return chief?.id === playerId;
    case 'policy-peek-viewing':
    case 'executive-power-pending':
      return mayor?.id === playerId;
    case 'role-reveal-waiting':
      return !state.acknowledgedPlayerIds.includes(playerId);
    default:
      return false;
  }
}

/** Build private data for a specific player (sent as separate message). */
export function getPrivateData(
  state: GameState,
  playerId: string,
): PrivateData | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;

  const data: PrivateData = {};
  const mayor = state.players[state.mayorIndex];
  const chief = state.players.find((p) => p.id === state.nominatedChiefId);

  // Role and allies (always available after role-reveal)
  if (state.phase !== 'lobby') {
    data.role = player.role;
    data.knownAllies = player.knownAllies;

    // Mob soldiers need to know which ally is the boss
    if (player.role === 'mob-soldier') {
      const boss = state.players.find((p) => p.role === 'mob-boss');
      if (boss) data.mobBossId = boss.id;
    }
  }

  // Mayor's cards (only during their discard phase)
  if (state.subPhase === 'policy-mayor-discard' && mayor?.id === playerId) {
    data.mayorCards = state.mayorCards ?? undefined;
  }

  // Chief's cards (only during their discard phase or veto)
  if (
    (state.subPhase === 'policy-chief-discard' || state.subPhase === 'policy-veto-response') &&
    chief?.id === playerId
  ) {
    data.chiefCards = state.chiefCards ?? undefined;
  }

  // Peek cards (only for the Mayor during policy-peek-viewing)
  if (state.subPhase === 'policy-peek-viewing' && mayor?.id === playerId && state.peekCards) {
    data.peekCards = state.peekCards;
  }

  // Latest investigation result (only for the investigating mayor)
  const latestInvestigation = state.investigationHistory.at(-1);
  if (latestInvestigation && latestInvestigation.investigatorId === playerId) {
    data.investigationResult = {
      targetId: latestInvestigation.targetId,
      result: latestInvestigation.result,
    };
  }

  // Notify the investigated player they've been exposed
  if (latestInvestigation && latestInvestigation.targetId === playerId) {
    const investigator = state.players.find((p) => p.id === latestInvestigation.investigatorId);
    data.wasInvestigated = { byPlayerName: investigator?.name ?? 'The Mayor' };
  }

  return Object.keys(data).length > 0 ? data : null;
}
