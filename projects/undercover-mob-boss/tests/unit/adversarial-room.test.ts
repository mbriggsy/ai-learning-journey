/**
 * Adversarial Room Tests
 *
 * Hostile inputs to the game engine's dispatch function.
 * Tests that the validation layer rejects malformed, out-of-bounds,
 * and non-existent entity references without corrupting state.
 */
import { describe, it, expect } from 'vitest';
import { dispatch, InvalidActionError } from '../../src/server/game/phases';
import { createTestGameState, makeTestCard } from '../helpers/game-state-factory';
import type { GameState } from '../../src/shared/types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a 5-player state in election-voting with no votes cast yet. */
function electionState(): GameState {
  return createTestGameState({
    phase: 'election',
    subPhase: 'election-voting',
    nominatedCommissionerId: 'player-2',
    votes: {},
  });
}

/** Build a state in role-reveal-waiting. */
function roleRevealState(): GameState {
  return createTestGameState({
    phase: 'role-reveal',
    subPhase: 'role-reveal-waiting',
    acknowledgedPlayerIds: [],
  });
}

/** Build a state in policy-mayor-discard with 3 cards. */
function mayorDiscardState(): GameState {
  const cards = [makeTestCard('bad'), makeTestCard('good'), makeTestCard('bad')];
  return createTestGameState({
    phase: 'policy-session',
    subPhase: 'policy-mayor-discard',
    mayorCards: cards,
  });
}

/** Build a state in policy-commissioner-discard with 2 cards. */
function commissionerDiscardState(): GameState {
  const cards = [makeTestCard('bad'), makeTestCard('good')];
  return createTestGameState({
    phase: 'policy-session',
    subPhase: 'policy-commissioner-discard',
    commissionerCards: cards,
  });
}

/** Build a state in executive-power-pending with investigate power. */
function investigateState(): GameState {
  return createTestGameState({
    phase: 'executive-power',
    subPhase: 'executive-power-pending',
    executivePower: 'investigate',
    investigationHistory: [],
  });
}

/** Build a state in executive-power-pending with execution power. */
function executeState(): GameState {
  return createTestGameState({
    phase: 'executive-power',
    subPhase: 'executive-power-pending',
    executivePower: 'execution',
  });
}

/** Build a state in executive-power-pending with special-nomination power. */
function specialNominateState(): GameState {
  return createTestGameState({
    phase: 'executive-power',
    subPhase: 'executive-power-pending',
    executivePower: 'special-nomination',
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Adversarial: Non-existent player IDs', () => {
  it('vote with non-existent playerId throws InvalidActionError', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'nonexistent', vote: 'approve' }),
    ).toThrow(InvalidActionError);
  });

  it('nominate non-existent targetId throws InvalidActionError', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'fake-player' }),
    ).toThrow(InvalidActionError);
  });

  it('investigate non-existent targetId throws InvalidActionError', () => {
    const state = investigateState();
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'ghost-player' }),
    ).toThrow(InvalidActionError);
  });

  it('execute non-existent targetId throws InvalidActionError', () => {
    const state = executeState();
    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'phantom' }),
    ).toThrow(InvalidActionError);
  });

  it('special-nominate non-existent targetId throws InvalidActionError', () => {
    const state = specialNominateState();
    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: 'nobody' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Empty string IDs', () => {
  it('vote with empty string playerId throws InvalidActionError', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, { type: 'vote', playerId: '', vote: 'approve' }),
    ).toThrow(InvalidActionError);
  });

  it('acknowledge-role with empty string playerId throws InvalidActionError', () => {
    const state = roleRevealState();
    // Empty string is not a real player ID — should be rejected
    expect(() =>
      dispatch(state, { type: 'acknowledge-role', playerId: '' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Non-existent player in acknowledge-role', () => {
  it('acknowledge-role for ghost player throws InvalidActionError', () => {
    const state = roleRevealState();
    expect(() =>
      dispatch(state, { type: 'acknowledge-role', playerId: 'ghost' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Floating-point card indices', () => {
  it('mayor-discard with float cardIndex (1.5) throws InvalidActionError', () => {
    const state = mayorDiscardState();
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: 1.5 }),
    ).toThrow(InvalidActionError);
  });

  it('commissioner-discard with negative float cardIndex (-0.5) throws InvalidActionError', () => {
    const state = commissionerDiscardState();
    expect(() =>
      dispatch(state, { type: 'commissioner-discard', cardIndex: -0.5 }),
    ).toThrow(InvalidActionError);
  });

  it('mayor-discard with Infinity throws InvalidActionError', () => {
    const state = mayorDiscardState();
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: Infinity }),
    ).toThrow(InvalidActionError);
  });

  it('mayor-discard with NaN throws InvalidActionError', () => {
    const state = mayorDiscardState();
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: NaN }),
    ).toThrow(InvalidActionError);
  });

  it('commissioner-discard with Infinity throws InvalidActionError', () => {
    const state = commissionerDiscardState();
    expect(() =>
      dispatch(state, { type: 'commissioner-discard', cardIndex: Infinity }),
    ).toThrow(InvalidActionError);
  });

  it('commissioner-discard with NaN throws InvalidActionError', () => {
    const state = commissionerDiscardState();
    expect(() =>
      dispatch(state, { type: 'commissioner-discard', cardIndex: NaN }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Out-of-range card indices', () => {
  it('mayor-discard with negative integer throws InvalidActionError', () => {
    const state = mayorDiscardState();
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: -1 }),
    ).toThrow(InvalidActionError);
  });

  it('mayor-discard with index beyond array length throws InvalidActionError', () => {
    const state = mayorDiscardState();
    // mayorCards has 3 cards, index 3 is OOB
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: 3 }),
    ).toThrow(InvalidActionError);
  });

  it('commissioner-discard with index beyond array length throws InvalidActionError', () => {
    const state = commissionerDiscardState();
    // commissionerCards has 2 cards, index 2 is OOB
    expect(() =>
      dispatch(state, { type: 'commissioner-discard', cardIndex: 2 }),
    ).toThrow(InvalidActionError);
  });

  it('mayor-discard with very large index throws InvalidActionError', () => {
    const state = mayorDiscardState();
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: 999999 }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Wrong phase actions', () => {
  it('vote during nomination phase throws InvalidActionError', () => {
    const state = createTestGameState();
    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'player-1', vote: 'approve' }),
    ).toThrow(InvalidActionError);
  });

  it('nominate during election phase throws InvalidActionError', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('mayor-discard during election throws InvalidActionError', () => {
    const state = electionState();
    expect(() =>
      dispatch(state, { type: 'mayor-discard', cardIndex: 0 }),
    ).toThrow(InvalidActionError);
  });

  it('start-game during active game throws InvalidActionError', () => {
    const state = createTestGameState(); // nomination phase
    expect(() =>
      dispatch(state, { type: 'start-game' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Dead player actions', () => {
  it('vote from dead player throws InvalidActionError', () => {
    const state = electionState();
    // Kill player-1
    state.players[1] = { ...state.players[1], isAlive: false };
    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'player-1', vote: 'approve' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Duplicate actions', () => {
  it('double-vote from same player throws InvalidActionError', () => {
    const state = electionState();
    // First vote succeeds
    const afterFirst = dispatch(state, { type: 'vote', playerId: 'player-1', vote: 'approve' });
    // Second vote from same player should be rejected
    expect(() =>
      dispatch(afterFirst, { type: 'vote', playerId: 'player-1', vote: 'block' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Self-targeting executive powers', () => {
  it('mayor cannot investigate themselves', () => {
    const state = investigateState();
    // mayorIndex=0 → player-0 is mayor
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-0' }),
    ).toThrow(InvalidActionError);
  });

  it('mayor cannot execute themselves', () => {
    const state = executeState();
    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-0' }),
    ).toThrow(InvalidActionError);
  });

  it('mayor cannot special-nominate themselves', () => {
    const state = specialNominateState();
    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: 'player-0' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: Already-investigated target', () => {
  it('cannot investigate a player who was already investigated', () => {
    const state = investigateState();
    state.investigationHistory = [
      { investigatorId: 'player-0', targetId: 'player-2', result: 'citizen' },
    ];
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });
});

describe('Adversarial: State immutability', () => {
  it('dispatch does not mutate the original state', () => {
    const state = electionState();
    const original = JSON.parse(JSON.stringify(state));
    dispatch(state, { type: 'vote', playerId: 'player-1', vote: 'approve' });
    // Deep compare — original state should be untouched
    expect(state).toEqual(original);
  });

  it('failed dispatch does not mutate the original state', () => {
    const state = createTestGameState();
    const original = JSON.parse(JSON.stringify(state));
    try {
      dispatch(state, { type: 'vote', playerId: 'nonexistent', vote: 'approve' });
    } catch {
      // expected
    }
    expect(state).toEqual(original);
  });
});

describe('Adversarial: Veto edge cases', () => {
  it('propose-veto with fewer than 5 bad policies throws InvalidActionError', () => {
    const state = commissionerDiscardState();
    state.badPoliciesEnacted = 4; // not enough
    expect(() =>
      dispatch(state, { type: 'propose-veto' }),
    ).toThrow(InvalidActionError);
  });

  it('propose-veto when already proposed throws InvalidActionError', () => {
    const state = commissionerDiscardState();
    state.badPoliciesEnacted = 5;
    state.vetoProposed = true;
    expect(() =>
      dispatch(state, { type: 'propose-veto' }),
    ).toThrow(InvalidActionError);
  });
});
