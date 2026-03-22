import { describe, it, expect } from 'vitest';
import { createGame, dispatch, getEligibleNominees, advanceMayor, InvalidActionError, DISPLAY_SUB_PHASES } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import { createTestGameState } from '../helpers/game-state-factory';
import type { GameState } from '../../src/shared/types';

/** Helper: dispatch advance-display to skip past display states. */
function advanceDisplay(state: GameState): GameState {
  return dispatch(state, { type: 'advance-display' });
}

/** Helper: advance past all chained display states. */
function advanceAllDisplays(state: GameState): GameState {
  let s = state;
  while (s.subPhase && DISPLAY_SUB_PHASES.has(s.subPhase) && s.phase !== 'game-over') {
    s = dispatch(s, { type: 'advance-display' });
  }
  return s;
}

// ── createGame ─────────────────────────────────────────────────────

describe('createGame', () => {
  it('creates a valid 5-player game in role-reveal phase', () => {
    const rng = mulberry32(42);
    const state = createGame(['Alice', 'Bob', 'Carol', 'Dave', 'Eve'], rng);

    expect(state.phase).toBe('role-reveal');
    expect(state.subPhase).toBe('role-reveal-waiting');
    expect(state.round).toBe(1);
    expect(state.players).toHaveLength(5);
    expect(state.policyDeck).toHaveLength(17);
    expect(state.goodPoliciesEnacted).toBe(0);
    expect(state.badPoliciesEnacted).toBe(0);
    expect(state.electionTracker).toBe(0);
  });

  it('has exactly 1 mob boss', () => {
    const rng = mulberry32(42);
    const state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    expect(state.players.filter((p) => p.role === 'mob-boss')).toHaveLength(1);
  });

  it('first mayor is randomly selected', () => {
    const rng = mulberry32(42);
    const state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    // Exactly one player should be mayor
    const mayors = state.players.filter((p) => p.isMayor);
    expect(mayors).toHaveLength(1);
    expect(state.players[state.mayorIndex].isMayor).toBe(true);
  });

  it('snapshot: deterministic initial state', () => {
    const a = createGame(['A', 'B', 'C', 'D', 'E'], mulberry32(42));
    const b = createGame(['A', 'B', 'C', 'D', 'E'], mulberry32(42));
    expect(a).toEqual(b);
  });

  it('throws for invalid player count', () => {
    expect(() => createGame(['A', 'B', 'C'], mulberry32(42))).toThrow('Invalid player count');
  });
});

// ── dispatch — role acknowledge ────────────────────────────────────

describe('dispatch — role acknowledge', () => {
  it('transitions to nomination after all players acknowledge', () => {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);

    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    expect(state.phase).toBe('nomination');
    expect(state.subPhase).toBe('nomination-pending');
  });

  it('stays in role-reveal if not all players acknowledged', () => {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });

    expect(state.phase).toBe('role-reveal');
    expect(state.subPhase).toBe('role-reveal-waiting');
  });

  it('is idempotent for duplicate acknowledgements', () => {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });

    // Still in role-reveal since only 1 unique player acknowledged
    expect(state.phase).toBe('role-reveal');
  });

  it('handles repeated flip cycles (open/close/reopen) gracefully', () => {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);

    // Player flips open, flips closed (sends acknowledge), flips open again,
    // flips closed again (client sends acknowledge again). Server must stay stable.
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });

    expect(state.phase).toBe('role-reveal');
    expect(state.acknowledgedPlayerIds).toEqual(['player-0']);
    expect(state.acknowledgedPlayerIds).toHaveLength(1);
  });

  it('multiple flip cycles do not prevent game from progressing', () => {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);

    // Player 0 flips multiple times
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });
    state = dispatch(state, { type: 'acknowledge-role', playerId: 'player-0' });

    // Other players acknowledge normally
    for (let i = 1; i < state.players.length; i++) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: `player-${i}` });
    }

    // Game still transitions correctly despite player-0's repeated acknowledges
    expect(state.phase).toBe('nomination');
    expect(state.subPhase).toBe('nomination-pending');
  });
});

// ── dispatch — nomination flow ─────────────────────────────────────

describe('dispatch — nomination flow', () => {
  it('mayor nominates an eligible player', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });

    const next = dispatch(state, { type: 'nominate', targetId: 'player-3' });

    expect(next.phase).toBe('election');
    expect(next.subPhase).toBe('election-voting');
    expect(next.nominatedChiefId).toBe('player-3');
    // Original state is unchanged (immutability)
    expect(state.nominatedChiefId).toBeNull();
  });

  it('rejects nomination of dead player', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });

    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'player-3' }),
    ).toThrow(/not valid/);
  });

  it('rejects self-nomination by mayor', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });

    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'player-0' }), // player-0 is mayor
    ).toThrow(/not valid/);
  });

  it('rejects nomination in wrong phase', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
    });

    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'player-3' }),
    ).toThrow(InvalidActionError);
  });
});

// ── dispatch — election flow ───────────────────────────────────────

describe('dispatch — election flow', () => {
  function setupElection(overrides: Partial<GameState> = {}): GameState {
    return createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
      ...overrides,
    });
  }

  it('collects votes without transitioning until all are in', () => {
    const state = setupElection();
    const next = dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'approve' });
    expect(next.phase).toBe('election'); // Still collecting
    expect(next.votes['player-0']).toBe('approve');
  });

  it('rejects duplicate vote', () => {
    let state = setupElection();
    state = dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'approve' });
    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'block' }),
    ).toThrow(/already voted/);
  });

  it('passes election with strict majority → election-result display then policy session', () => {
    let state = setupElection();
    // 5 alive: 3 approve, 2 block = passes
    state = dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-1', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-2', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-3', vote: 'block' });
    state = dispatch(state, { type: 'vote', playerId: 'player-4', vote: 'block' });

    // First: pauses at election-result display with all votes visible
    expect(state.phase).toBe('election');
    expect(state.subPhase).toBe('election-result');
    expect(Object.keys(state.votes)).toHaveLength(5);

    // Then: advance-display continues to policy session
    state = advanceDisplay(state);
    expect(state.phase).toBe('policy-session');
    expect(state.subPhase).toBe('policy-mayor-discard');
    expect(state.electionTracker).toBe(0);
    expect(state.mayorCards).toHaveLength(3);
  });

  it('ties are blocked', () => {
    // Need even number of alive players. Kill one to get 4 alive.
    let state = setupElection({
      players: createTestGameState().players.map((p) =>
        p.id === 'player-4' ? { ...p, isAlive: false } : p,
      ),
    });

    // 4 alive: 2 approve, 2 block = tie = blocked
    state = dispatch(state, { type: 'vote', playerId: 'player-0', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-1', vote: 'approve' });
    state = dispatch(state, { type: 'vote', playerId: 'player-2', vote: 'block' });
    state = dispatch(state, { type: 'vote', playerId: 'player-3', vote: 'block' });

    // Pauses at election-result first
    expect(state.subPhase).toBe('election-result');
    state = advanceDisplay(state);

    expect(state.phase).toBe('nomination');
    expect(state.electionTracker).toBe(1);
  });

  it('failed election increments tracker', () => {
    let state = setupElection();
    // All block
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'block' });
    }
    // Pauses at election-result display
    expect(state.subPhase).toBe('election-result');
    state = advanceDisplay(state);
    expect(state.electionTracker).toBe(1);
  });

  it('term limits survive failed elections (SH: last ELECTED pair)', () => {
    // Set up: player-2 was last elected mayor, player-4 was last elected chief
    let state = setupElection({
      players: createTestGameState().players.map((p) => {
        if (p.id === 'player-2') return { ...p, wasLastMayor: true };
        if (p.id === 'player-4') return { ...p, wasLastChief: true };
        return p;
      }),
    });

    // Election fails
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'block' });
    }

    // Term limits from the PREVIOUS elected government must still hold
    expect(state.players.find((p) => p.id === 'player-2')!.wasLastMayor).toBe(true);
    expect(state.players.find((p) => p.id === 'player-4')!.wasLastChief).toBe(true);
  });

  it('term limits update to new pair on successful election', () => {
    // player-0 is mayor, nominate player-3 as chief
    let state = setupElection({
      nominatedChiefId: 'player-3',
      // Pre-existing term limits from a previous government
      players: createTestGameState().players.map((p) => {
        if (p.id === 'player-2') return { ...p, wasLastMayor: true };
        if (p.id === 'player-4') return { ...p, wasLastChief: true };
        return p;
      }),
    });

    // Election passes
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplay(state); // advance past election-result

    // NEW term limits: player-0 (mayor) and player-3 (chief)
    expect(state.players.find((p) => p.id === 'player-0')!.wasLastMayor).toBe(true);
    expect(state.players.find((p) => p.id === 'player-3')!.wasLastChief).toBe(true);
    // OLD term limits cleared
    expect(state.players.find((p) => p.id === 'player-2')!.wasLastMayor).toBe(false);
    expect(state.players.find((p) => p.id === 'player-4')!.wasLastChief).toBe(false);
  });

  it('mob boss elected after 3+ bad policies → mob wins', () => {
    // player-0 is mob-boss, nominate them as chief
    let state = setupElection({
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-0',
    });

    // All approve
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    // Election result display shows the vote, then advance reveals mob boss win
    expect(state.subPhase).toBe('election-result');
    state = advanceDisplay(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
    expect(state.winReason).toContain('Mob Boss elected');
  });

  it('mob boss elected before 3 bad policies → game continues', () => {
    let state = setupElection({
      badPoliciesEnacted: 2,
      nominatedChiefId: 'player-0', // mob boss
    });

    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplay(state);

    expect(state.phase).toBe('policy-session'); // Game continues
    expect(state.winner).toBeNull();
  });

  it('non-mob-boss elected at 3+ bad policies emits chief-cleared event', () => {
    // player-3 is a citizen, not the mob boss
    let state = setupElection({
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-3',
    });

    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplay(state);

    expect(state.phase).toBe('policy-session');
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'chief-cleared', chiefId: 'player-3' }),
    );
  });
});

// ── dispatch — election tracker → auto-enact ───────────────────────

describe('dispatch — election tracker → auto-enact', () => {
  it('auto-enacts top card when tracker reaches 3', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 2,
      nominatedChiefId: 'player-3',
      policyDeck: ['bad', 'good', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });

    // All block → tracker goes to 3 → auto-enact
    let next = state;
    for (const p of state.players.filter((p) => p.isAlive)) {
      next = dispatch(next, { type: 'vote', playerId: p.id, vote: 'block' });
    }

    // First: election-result display
    expect(next.subPhase).toBe('election-result');
    next = advanceDisplay(next);

    // After election-result: auto-enact pauses at auto-enact display
    expect(next.subPhase).toBe('auto-enact');
    expect(next.electionTracker).toBe(0); // Reset after auto-enact
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'auto-enact-triggered' }),
    );

    // Advance past auto-enact display
    next = advanceDisplay(next);

    // Term limits cleared
    expect(next.players.every((p) => !p.wasLastMayor && !p.wasLastChief)).toBe(true);
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'term-limits-cleared' }),
    );
  });
});

// ── dispatch — policy session ──────────────────────────────────────

describe('dispatch — policy session', () => {
  it('mayor discards one card → chief gets 2', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });

    const next = dispatch(state, { type: 'mayor-discard', cardIndex: 0 });
    expect(next.subPhase).toBe('policy-chief-discard');
    expect(next.chiefCards).toEqual(['bad', 'bad']);
    expect(next.mayorCards).toBeNull();
    expect(next.policyDiscard).toContain('good');
  });

  it('chief discards one card → policy enacted', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });

    const next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // discard bad
    expect(next.goodPoliciesEnacted).toBe(1);
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'policy-enacted', policy: 'good' }),
    );
  });

  it('5 good policies → citizens win', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
      goodPoliciesEnacted: 4,
    });

    const next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact good
    expect(next.phase).toBe('game-over');
    expect(next.winner).toBe('citizens');
  });

  it('6 bad policies → mob wins', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 5,
    });

    const next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact bad
    expect(next.phase).toBe('game-over');
    expect(next.winner).toBe('mob');
  });

  it('bad policy triggers executive power (5-player, 3rd bad policy → policy-peek)', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 2,
    });

    let next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact bad (3rd)

    // First: pauses at policy-enact display
    expect(next.subPhase).toBe('policy-enact');
    expect(next.badPoliciesEnacted).toBe(3);

    // Then: advance to executive power
    next = advanceDisplay(next);
    expect(next.phase).toBe('executive-power');
    expect(next.subPhase).toBe('policy-peek-viewing');
    expect(next.executivePower).toBe('policy-peek');
    expect(next.peekCards).toHaveLength(3);
  });
});

// ── dispatch — veto flow ───────────────────────────────────────────

describe('dispatch — veto flow', () => {
  it('chief proposes veto → veto-propose display then mayor must respond', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
    });

    let next = dispatch(state, { type: 'propose-veto' });
    // First: pauses at veto-propose display
    expect(next.subPhase).toBe('policy-veto-propose');
    expect(next.vetoProposed).toBe(true);

    // Then: advance to veto-response
    next = advanceDisplay(next);
    expect(next.subPhase).toBe('policy-veto-response');
    expect(next.vetoProposed).toBe(true);
  });

  it('veto rejected → chief must enact', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-veto-response',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      vetoProposed: true,
    });

    const next = dispatch(state, { type: 'veto-response', approved: false });
    expect(next.subPhase).toBe('policy-chief-discard');
    expect(next.events).toContainEqual({ type: 'veto-rejected' });
  });

  it('veto accepted → cards discarded, tracker advances', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-veto-response',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      electionTracker: 0,
      vetoProposed: true,
    });

    const next = dispatch(state, { type: 'veto-response', approved: true });
    expect(next.events).toContainEqual({ type: 'veto-enacted' });
    expect(next.electionTracker).toBe(1);
    expect(next.chiefCards).toBeNull();
  });

  it('veto not available before 5 bad policies', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 4,
      chiefCards: ['bad', 'bad'],
    });

    expect(() => dispatch(state, { type: 'propose-veto' })).toThrow(/only available/);
  });

  it('veto-accepted + tracker at 2 → auto-enact', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-veto-response',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      electionTracker: 2,
      vetoProposed: true,
      policyDeck: ['good', 'bad', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });

    const next = dispatch(state, { type: 'veto-response', approved: true });
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'auto-enact-triggered' }),
    );
    expect(next.electionTracker).toBe(0);
  });
});

// ── dispatch — executive powers ────────────────────────────────────

describe('dispatch — executive powers', () => {
  it('investigate reveals membership and records history', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      nominatedChiefId: 'player-2',
    });

    const next = dispatch(state, { type: 'investigate', targetId: 'player-3' });
    expect(next.investigationHistory).toContainEqual(
      expect.objectContaining({ targetId: 'player-3' }),
    );
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'investigation-result', targetId: 'player-3' }),
    );
    expect(next.phase).toBe('nomination');
  });

  it('cannot investigate same player twice', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      investigationHistory: [{ investigatorId: 'player-2', targetId: 'player-3', result: 'citizen' }],
    });

    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-3' }),
    ).toThrow(/already investigated/);
  });

  it('special-nominate sets next mayor', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
    });

    const next = dispatch(state, { type: 'special-nominate', targetId: 'player-3' });
    expect(next.phase).toBe('nomination');
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'special-mayor-chosen', playerId: 'player-3' }),
    );
  });

  it('execute kills player and continues', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
    });

    const next = dispatch(state, { type: 'execute', targetId: 'player-3' }); // citizen
    expect(next.players.find((p) => p.id === 'player-3')!.isAlive).toBe(false);
    expect(next.phase).toBe('nomination');
  });

  it('execute mob boss → citizens win', () => {
    // Put the mob boss on player-3 (not the mayor) so mayor can target them
    const players = createTestGameState().players.map((p) => {
      if (p.id === 'player-0') return { ...p, role: 'citizen' as const };
      if (p.id === 'player-3') return { ...p, role: 'mob-boss' as const };
      return p;
    });
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      players,
    });

    const next = dispatch(state, { type: 'execute', targetId: 'player-3' }); // mob boss
    expect(next.phase).toBe('game-over');
    expect(next.winner).toBe('citizens');
  });

  it('rejects wrong power type', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });

    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-3' }),
    ).toThrow(/not execution/);
  });

  it('rejects self-investigation', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-0' }),
    ).toThrow(/Cannot investigate yourself/);
  });

  it('rejects self-special-nomination', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
    });
    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: 'player-0' }),
    ).toThrow(/Cannot special-nominate yourself/);
  });

  it('rejects self-execution', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
    });
    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-0' }),
    ).toThrow(/Cannot execute yourself/);
  });

  it('policy peek shows top 3 cards and transitions on acknowledge', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'policy-peek-viewing',
      executivePower: 'policy-peek',
      peekCards: ['bad', 'good', 'bad'],
    });

    const next = dispatch(state, { type: 'acknowledge-peek' });
    expect(next.peekCards).toBeNull();
    expect(next.phase).toBe('nomination');
    expect(next.events).toContainEqual({ type: 'policy-peek-completed' });
  });
});

// ── getEligibleNominees ────────────────────────────────────────────

describe('getEligibleNominees', () => {
  it('excludes current mayor', () => {
    const state = createTestGameState();
    const eligible = getEligibleNominees(state);
    expect(eligible).not.toContain('player-0'); // mayor
  });

  it('excludes previous chief (always term-limited)', () => {
    const state = createTestGameState({
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, wasLastChief: true } : p,
      ),
    });
    const eligible = getEligibleNominees(state);
    expect(eligible).not.toContain('player-3');
  });

  it('excludes previous mayor at 6+ alive players', () => {
    const state = createTestGameState({
      playerCount: 6,
      players: createTestGameState({ playerCount: 6 }).players.map((p) =>
        p.id === 'player-1' ? { ...p, wasLastMayor: true } : p,
      ),
    });
    const eligible = getEligibleNominees(state);
    expect(eligible).not.toContain('player-1');
  });

  it('allows previous mayor at 5 alive players', () => {
    const state = createTestGameState({
      players: createTestGameState().players.map((p) =>
        p.id === 'player-1' ? { ...p, wasLastMayor: true } : p,
      ),
    });
    const eligible = getEligibleNominees(state);
    expect(eligible).toContain('player-1');
  });

  it('waives term limits on deadlock', () => {
    // 5 players, kill 2, leaving 3 alive. Mayor = player-0.
    // Set the other 2 alive as both term-limited.
    const players = createTestGameState().players.map((p) => {
      if (p.id === 'player-3' || p.id === 'player-4') return { ...p, isAlive: false };
      if (p.id === 'player-1') return { ...p, wasLastChief: true };
      if (p.id === 'player-2') return { ...p, wasLastChief: true };
      return p;
    });
    const state = createTestGameState({ players });

    const eligible = getEligibleNominees(state);
    // Both player-1 and player-2 should be eligible (deadlock fallback)
    expect(eligible.length).toBeGreaterThan(0);
  });

  it('excludes dead players', () => {
    const state = createTestGameState({
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    const eligible = getEligibleNominees(state);
    expect(eligible).not.toContain('player-3');
  });
});

// ── advanceMayor ───────────────────────────────────────────────────

describe('advanceMayor', () => {
  it('advances to next alive player', () => {
    const state = createTestGameState({ mayorIndex: 0 });
    const next = advanceMayor(state);
    expect(next.mayorIndex).toBe(1);
    expect(next.players[1].isMayor).toBe(true);
    expect(next.players[0].isMayor).toBe(false);
  });

  it('skips dead players', () => {
    const state = createTestGameState({
      mayorIndex: 0,
      players: createTestGameState().players.map((p) =>
        p.id === 'player-1' ? { ...p, isAlive: false } : p,
      ),
    });
    const next = advanceMayor(state);
    expect(next.mayorIndex).toBe(2);
  });

  it('wraps around to beginning', () => {
    const state = createTestGameState({ mayorIndex: 4 });
    const next = advanceMayor(state);
    expect(next.mayorIndex).toBe(0);
  });

  it('uses special nomination when set', () => {
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-3',
    });
    const next = advanceMayor(state);
    expect(next.mayorIndex).toBe(3);
    expect(next.specialNominatedMayorId).toBeNull();
    expect(next.players[3].isMayor).toBe(true);
    // Should remember the caller's position for resume
    expect(next.resumeMayorIndex).toBe(0);
  });

  it('resumes rotation from original caller after special election', () => {
    // A(0) was mayor, special-nominated D(3). D's round is done.
    // Next round should resume from A(0)+1 = B(1), NOT D(3)+1 = E(4).
    const state = createTestGameState({
      mayorIndex: 3, // D is current mayor (the special target)
      resumeMayorIndex: 0, // A was the caller
    });
    const next = advanceMayor(state);
    expect(next.mayorIndex).toBe(1); // B, not E
    expect(next.resumeMayorIndex).toBeNull(); // cleared after use
  });

  it('special nomination to next-in-rotation gives that player two turns', () => {
    // A(0) is mayor, special-nominates B(1). B serves.
    // Then B(1) should serve again (normal rotation from 0+1=1).
    const state1 = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-1',
    });
    const afterSpecial = advanceMayor(state1);
    expect(afterSpecial.mayorIndex).toBe(1);
    expect(afterSpecial.resumeMayorIndex).toBe(0);

    const afterResume = advanceMayor(afterSpecial);
    expect(afterResume.mayorIndex).toBe(1); // B again!
    expect(afterResume.resumeMayorIndex).toBeNull();
  });

  it('does NOT change wasLastMayor/wasLastChief (term limits only change on election)', () => {
    const state = createTestGameState({
      mayorIndex: 0,
      players: createTestGameState().players.map((p) => {
        if (p.id === 'player-0') return { ...p, wasLastMayor: true };
        if (p.id === 'player-2') return { ...p, wasLastChief: true };
        return p;
      }),
    });
    const next = advanceMayor(state);
    // Term limits from the previous elected government must be preserved
    expect(next.players[0].wasLastMayor).toBe(true);
    expect(next.players[2].wasLastChief).toBe(true);
    // New mayor should NOT gain wasLastMayor
    expect(next.players[1].wasLastMayor).toBe(false);
  });
});

// ── dispatch — display state transitions ─────────────────────────

describe('dispatch — display state transitions', () => {
  it('election-result is a display state after all votes', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
    });
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    expect(state.subPhase).toBe('election-result');
    expect(DISPLAY_SUB_PHASES.has('election-result')).toBe(true);
    // Votes are available in state for display
    expect(Object.keys(state.votes)).toHaveLength(5);
  });

  it('policy-enact is a display state after chief discards', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });
    const next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact good
    expect(next.subPhase).toBe('policy-enact');
    expect(next.goodPoliciesEnacted).toBe(1);
    expect(next.lastEnactedPolicy).toBe('good');
  });

  it('auto-enact is a display state during auto-enact', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-result',
      electionTracker: 2,
      nominatedChiefId: 'player-3',
      votes: { 'player-0': 'block', 'player-1': 'block', 'player-2': 'block', 'player-3': 'block', 'player-4': 'block' },
      policyDeck: ['good', 'bad', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });
    // advance-display from election-result triggers failed election → auto-enact
    const next = advanceDisplay(state);
    expect(next.subPhase).toBe('auto-enact');
    expect(next.electionTracker).toBe(0);
  });

  it('policy-veto-propose is a display state after propose-veto', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
    });
    const next = dispatch(state, { type: 'propose-veto' });
    expect(next.subPhase).toBe('policy-veto-propose');
    expect(next.vetoProposed).toBe(true);
  });

  it('advance-display from election-result (passed) leads to policy-session', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-result',
      nominatedChiefId: 'player-3',
      votes: { 'player-0': 'approve', 'player-1': 'approve', 'player-2': 'approve', 'player-3': 'block', 'player-4': 'block' },
    });
    const next = advanceDisplay(state);
    expect(next.phase).toBe('policy-session');
    expect(next.subPhase).toBe('policy-mayor-discard');
  });

  it('advance-display from election-result (failed) leads to nomination', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-result',
      nominatedChiefId: 'player-3',
      votes: { 'player-0': 'block', 'player-1': 'block', 'player-2': 'block', 'player-3': 'approve', 'player-4': 'approve' },
    });
    const next = advanceDisplay(state);
    expect(next.phase).toBe('nomination');
    expect(next.electionTracker).toBe(1);
  });

  it('advance-display from policy-enact (bad, with power) leads to executive-power', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-enact',
      badPoliciesEnacted: 3,
      lastEnactedPolicy: 'bad',
      policyDeck: ['good', 'bad', 'good', 'bad', 'good'],
    });
    const next = advanceDisplay(state);
    expect(next.phase).toBe('executive-power');
    expect(next.subPhase).toBe('policy-peek-viewing');
    expect(next.executivePower).toBe('policy-peek');
  });

  it('advance-display from policy-enact (good) leads to nomination', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-enact',
      goodPoliciesEnacted: 1,
      lastEnactedPolicy: 'good',
    });
    const next = advanceDisplay(state);
    expect(next.phase).toBe('nomination');
  });

  it('advance-display from auto-enact clears term limits and goes to nomination', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'auto-enact',
      lastEnactedPolicy: 'bad',
      players: createTestGameState().players.map((p) => ({
        ...p,
        wasLastMayor: p.id === 'player-2',
        wasLastChief: p.id === 'player-4',
      })),
    });
    const next = advanceDisplay(state);
    expect(next.phase).toBe('nomination');
    // Term limits should be cleared
    for (const p of next.players) {
      expect(p.wasLastMayor).toBe(false);
      expect(p.wasLastChief).toBe(false);
    }
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'term-limits-cleared' }),
    );
  });

  it('advance-display from policy-veto-propose leads to veto-response', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-veto-propose',
      vetoProposed: true,
      chiefCards: ['bad', 'bad'],
      badPoliciesEnacted: 5,
    });
    const next = advanceDisplay(state);
    expect(next.subPhase).toBe('policy-veto-response');
  });

  it('advance-display rejects in non-display subPhases', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    expect(() => dispatch(state, { type: 'advance-display' })).toThrow(InvalidActionError);
  });

  it('game-over from policy-enact skips display state', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
      goodPoliciesEnacted: 4,
    });
    const next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact good (5th)
    // Goes directly to game-over, not policy-enact display
    expect(next.phase).toBe('game-over');
    expect(next.winner).toBe('citizens');
    expect(next.subPhase).toBeNull();
  });
});
