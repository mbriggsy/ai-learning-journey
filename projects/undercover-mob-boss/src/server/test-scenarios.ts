// ── Test Scenarios ──────────────────────────────────────────────────
// Pre-built GameState snapshots for testing specific phases.
// DEV ONLY — triggered by host via 'load-scenario' message.

import type { GameState, Player, PolicyType, Role } from '../shared/types';
import { populateKnownAllies } from './game/roles';

// ── Helpers ──────────────────────────────────────────────────────────

function makePlayers(
  names: string[],
  realIds: string[],
  mayorIndex: number,
): Player[] {
  // 5 players: 3 citizens, 1 mob-soldier, 1 mob-boss
  const allRoles: Role[] =
    names.length <= 6
      ? (['citizen', 'citizen', 'citizen', 'mob-soldier', 'mob-boss', 'citizen'] as Role[])
      : (['citizen', 'citizen', 'citizen', 'citizen', 'mob-soldier', 'mob-soldier', 'mob-boss', 'citizen', 'citizen', 'citizen'] as Role[]);
  const roles = allRoles.slice(0, names.length);

  const basePlayers: Player[] = names.map((name, i) => ({
    id: realIds[i],
    name,
    role: roles[i],
    isAlive: true,
    isMayor: i === mayorIndex,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
  }));

  return populateKnownAllies(basePlayers);
}

function makeDeck(): PolicyType[] {
  const deck: PolicyType[] = [];
  for (let i = 0; i < 6; i++) deck.push('good');
  for (let i = 0; i < 11; i++) deck.push('bad');
  // Shuffle deterministically
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor((i * 7 + 3) % (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function baseState(names: string[], realIds: string[]): GameState {
  return {
    phase: 'nomination',
    subPhase: 'nomination-pending',
    round: 1,
    players: makePlayers(names, realIds, 0),
    mayorIndex: 0,
    nominatedChiefId: null,
    electionTracker: 0,
    goodPoliciesEnacted: 0,
    badPoliciesEnacted: 0,
    policyDeck: makeDeck(),
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
    acknowledgedPlayerIds: realIds,
    investigationHistory: [],
    peekCards: null,
    specialNominatedMayorId: null,
    resumeMayorIndex: null,
    rngSeed: 42,
    lastEnactedPolicy: null,
  };
}

// ── Scenario Builders ────────────────────────────────────────────────

export type ScenarioId =
  | 'execution'
  | 'investigation'
  | 'special-nomination'
  | 'policy-peek'
  | 'policy-session'
  | 'election'
  | 'veto'
  | 'game-over-citizens'
  | 'game-over-mob';

export const SCENARIO_IDS: ScenarioId[] = [
  'execution',
  'investigation',
  'special-nomination',
  'policy-peek',
  'policy-session',
  'election',
  'veto',
  'game-over-citizens',
  'game-over-mob',
];

export function buildScenario(
  scenario: ScenarioId,
  names: string[],
  realIds: string[],
): GameState {
  const state = baseState(names, realIds);

  switch (scenario) {
    case 'execution':
      return {
        ...state,
        phase: 'executive-power',
        subPhase: 'executive-power-pending',
        round: 5,
        badPoliciesEnacted: 4,
        goodPoliciesEnacted: 1,
        executivePower: 'execution',
        events: [{ type: 'executive-power-activated', power: 'execution' }],
      };

    case 'investigation':
      return {
        ...state,
        phase: 'executive-power',
        subPhase: 'executive-power-pending',
        round: 3,
        badPoliciesEnacted: 2,
        goodPoliciesEnacted: 1,
        executivePower: 'investigate',
        // Make it a 7-player bracket so investigate triggers at 2 bad
        events: [{ type: 'executive-power-activated', power: 'investigate' }],
      };

    case 'special-nomination':
      return {
        ...state,
        phase: 'executive-power',
        subPhase: 'executive-power-pending',
        round: 4,
        badPoliciesEnacted: 3,
        goodPoliciesEnacted: 1,
        executivePower: 'special-nomination',
        events: [{ type: 'executive-power-activated', power: 'special-nomination' }],
      };

    case 'policy-peek':
      return {
        ...state,
        phase: 'executive-power',
        subPhase: 'policy-peek-viewing',
        round: 4,
        badPoliciesEnacted: 3,
        goodPoliciesEnacted: 1,
        executivePower: 'policy-peek',
        peekCards: ['bad', 'good', 'bad'],
        events: [{ type: 'executive-power-activated', power: 'policy-peek' }],
      };

    case 'policy-session':
      return {
        ...state,
        phase: 'policy-session',
        subPhase: 'policy-mayor-discard',
        round: 3,
        badPoliciesEnacted: 2,
        goodPoliciesEnacted: 1,
        players: state.players.map((p, i) => ({
          ...p,
          isChief: i === 1,
          wasLastChief: i === 1,
          wasLastMayor: i === 0,
        })),
        nominatedChiefId: realIds[1],
        mayorCards: ['bad', 'good', 'bad'],
      };

    case 'election': {
      const electionPlayers = state.players.map((p, i) => ({
        ...p,
        isChief: false,
      }));
      return {
        ...state,
        phase: 'election',
        subPhase: 'election-voting',
        round: 3,
        badPoliciesEnacted: 2,
        goodPoliciesEnacted: 1,
        players: electionPlayers,
        nominatedChiefId: realIds[1],
        votes: {},
      };
    }

    case 'veto':
      return {
        ...state,
        phase: 'policy-session',
        subPhase: 'policy-chief-discard',
        round: 6,
        badPoliciesEnacted: 5,
        goodPoliciesEnacted: 2,
        players: state.players.map((p, i) => ({
          ...p,
          isChief: i === 1,
        })),
        nominatedChiefId: realIds[1],
        chiefCards: ['bad', 'good'],
        vetoProposed: false,
      };

    case 'game-over-citizens':
      return {
        ...state,
        phase: 'game-over',
        subPhase: null,
        round: 8,
        goodPoliciesEnacted: 5,
        badPoliciesEnacted: 3,
        winner: 'citizens',
        winReason: '5 good policies enacted',
        events: [{ type: 'game-over', winner: 'citizens', reason: '5 good policies enacted' }],
      };

    case 'game-over-mob':
      return {
        ...state,
        phase: 'game-over',
        subPhase: null,
        round: 10,
        goodPoliciesEnacted: 3,
        badPoliciesEnacted: 6,
        winner: 'mob',
        winReason: '6 bad policies enacted',
        events: [{ type: 'game-over', winner: 'mob', reason: '6 bad policies enacted' }],
      };

    default:
      return state;
  }
}
