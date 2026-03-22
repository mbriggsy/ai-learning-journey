import type { ExecutivePower, Player, GameState } from '../../shared/types';
import { getMembership } from './roles';

type PlayerBracket = 'small' | 'medium' | 'large';

function getPlayerBracket(playerCount: number): PlayerBracket {
  if (playerCount <= 6) return 'small';
  if (playerCount <= 8) return 'medium';
  return 'large';
}

/**
 * Executive power board — keyed by [bracket][badPoliciesEnacted].
 * null = no power at that slot.
 */
const EXECUTIVE_POWER_BOARD: Record<PlayerBracket, Record<number, ExecutivePower | null>> = {
  small: {
    1: null,
    2: null,
    3: 'policy-peek',
    4: 'execution',
    5: 'execution',
  },
  medium: {
    1: null,
    2: 'investigate',
    3: 'special-nomination',
    4: 'execution',
    5: 'execution',
  },
  large: {
    1: 'investigate',
    2: 'investigate',
    3: 'special-nomination',
    4: 'execution',
    5: 'execution',
  },
};

/**
 * Returns the executive power unlocked at this bad policy count
 * for the given player count, or null if no power.
 */
export function getExecutivePower(
  playerCount: number,
  badPoliciesEnacted: number,
): ExecutivePower | null {
  const bracket = getPlayerBracket(playerCount);
  return EXECUTIVE_POWER_BOARD[bracket][badPoliciesEnacted] ?? null;
}

/**
 * Resolve an investigation — returns allegiance, not exact role.
 */
export function resolveInvestigation(targetPlayer: Player): 'citizen' | 'mob' {
  return getMembership(targetPlayer.role);
}

/**
 * Resolve a policy peek — Mayor secretly views top 3 cards of the policy deck.
 * Cards are NOT drawn — they remain on top of the deck in the same order.
 */
export function resolvePolicyPeek(state: GameState): GameState {
  const peekCards = state.policyDeck.slice(0, 3);
  return {
    ...state,
    peekCards,
  };
}

/**
 * Resolve an execution — marks player dead, checks if mob boss was killed.
 * Returns updated state with events.
 */
export function resolveExecution(state: GameState, targetId: string): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.isAlive) {
    throw new Error(`Cannot execute player ${targetId}: not found or already dead`);
  }

  const wasMobBoss = target.role === 'mob-boss';
  const updatedPlayers = state.players.map((p) =>
    p.id === targetId ? { ...p, isAlive: false, isMayor: false, isChief: false } : p,
  );

  const events = [
    ...state.events,
    { type: 'player-executed' as const, playerId: targetId, wasMobBoss },
  ];

  if (wasMobBoss) {
    return {
      ...state,
      players: updatedPlayers,
      phase: 'game-over',
      subPhase: null,
      winner: 'citizens',
      winReason: 'Mob Boss executed',
      events: [
        ...events,
        { type: 'game-over' as const, winner: 'citizens' as const, reason: 'Mob Boss executed' },
      ],
    };
  }

  return { ...state, players: updatedPlayers, events };
}

/**
 * Resolve special nomination — sets the next mayor override.
 */
export function resolveSpecialNomination(state: GameState, targetId: string): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.isAlive) {
    throw new Error(`Cannot special-nominate player ${targetId}: not found or already dead`);
  }

  return {
    ...state,
    specialNominatedMayorId: targetId,
    events: [...state.events, { type: 'special-mayor-chosen', playerId: targetId }],
  };
}
