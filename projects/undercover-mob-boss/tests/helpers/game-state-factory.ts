import type { GameState, Player, PolicyCard, PolicyType, Phase, SubPhase } from '../../src/shared/types';

const DEFAULT_SEED = 42;

/** Create a test PolicyCard from a type. Generates unique IDs. */
let _cardCounter = 0;
export function makeTestCard(type: PolicyType, cardId?: string): PolicyCard {
  const n = _cardCounter++;
  return {
    type,
    cardId: cardId ?? `test-${type}-${n}`,
    name: `Test ${type === 'good' ? 'Virtuous' : 'Corrupt'} ${n}`,
  };
}

/** Create a standard 6-good + 11-bad test deck as PolicyCard[]. */
export function makeTestDeck(): PolicyCard[] {
  return [
    ...Array.from({ length: 6 }, () => makeTestCard('good')),
    ...Array.from({ length: 11 }, () => makeTestCard('bad')),
  ];
}

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
    isCommissioner: false,
    wasLastMayor: false,
    wasLastCommissioner: false,
    knownAllies: [],
  }));

  const baseState: GameState = {
    phase: 'nomination' as Phase,
    subPhase: 'nomination-pending' as SubPhase,
    round: 1,
    players,
    mayorIndex: 0,
    nominatedCommissionerId: null,
    electionTracker: 0,
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    policyDeck: makeTestDeck(),
    policyDiscard: [],
    votes: {},
    mayorCards: null,
    commissionerCards: null,
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
    policyHistory: [],
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
    isCommissioner: false,
    wasLastMayor: false,
    wasLastCommissioner: false,
    knownAllies: [],
    ...overrides,
  };
}
