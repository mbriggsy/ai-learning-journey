import type { GameState, Player, PolicyType, Phase, SubPhase } from '../../src/shared/types';

const DEFAULT_SEED = 42;

/**
 * Creates a fully valid GameState for testing.
 * Override any fields via the `overrides` parameter.
 * Default: 5-player game in nomination-pending phase.
 */
export function createTestGameState(
  overrides: Partial<GameState> & { playerCount?: number } = {},
): GameState {
  const { playerCount = 5, ...stateOverrides } = overrides;

  const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    role: i === 0 ? 'mob-boss' as const : i < Math.floor(playerCount / 2) ? 'mob-soldier' as const : 'citizen' as const,
    isAlive: true,
    isMayor: i === 0,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
  }));

  const baseDeck: PolicyType[] = [
    ...Array<PolicyType>(6).fill('good'),
    ...Array<PolicyType>(11).fill('bad'),
  ];

  const baseState: GameState = {
    phase: 'nomination' as Phase,
    subPhase: 'nomination-pending' as SubPhase,
    round: 1,
    players,
    mayorIndex: 0,
    nominatedChiefId: null,
    electionTracker: 0,
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    policyDeck: baseDeck,
    policyDiscard: [],
    votes: {},
    mayorCards: null,
    chiefCards: null,
    executivePower: null,
    winner: null,
    winReason: null,
    reshuffleThreshold: 5,
    vetoProposed: false,
    events: [],
    acknowledgedPlayerIds: [],
    investigationHistory: [],
    peekCards: null,
    specialNominatedMayorId: null,
    resumeMayorIndex: null,
    rngSeed: DEFAULT_SEED,
    lastEnactedPolicy: null,
  };

  return { ...baseState, ...stateOverrides };
}

/**
 * Create a specific player for targeted test scenarios.
 */
export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    name: 'Test Player',
    role: 'citizen',
    isAlive: true,
    isMayor: false,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
    ...overrides,
  };
}
