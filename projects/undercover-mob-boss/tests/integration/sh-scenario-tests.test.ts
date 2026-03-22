/**
 * SH Scenario Tests — Forced Game Paths
 *
 * Each test drives the game engine through a specific path that must
 * work correctly per the Secret Hitler rules. Stacked decks and
 * directed play ensure deterministic coverage of every game path.
 */
import { describe, it, expect } from 'vitest';
import { createGame, dispatch, getEligibleNominees } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import { createTestGameState, createTestPlayer } from '../helpers/game-state-factory';
import {
  acknowledgeAllRoles,
  passElection,
  failElection,
  enactPolicy,
  playFullRound,
  checkCardInvariant,
  pickNextAction,
  advanceDisplayIfNeeded,
} from '../helpers/game-driver';
import type { GameState, PolicyType } from '../../src/shared/types';

// ── WIN CONDITION: Citizens Win via 5 Good Policies ─────────────────

describe('Win: Citizens via 5 Good Policies', () => {
  it('5-player game: 5 rounds of good policy → citizens win', () => {
    // Deck stacked: [good,bad,bad] repeated — mayor discards bad, chief discards bad
    const deck: PolicyType[] = [
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad',
    ];
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      policyDeck: deck,
      reshuffleThreshold: 1, // prevent reshuffle
    });

    for (let round = 0; round < 5; round++) {
      state = playFullRound(state, 'good');
      if (state.phase === 'game-over') break;
    }

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('citizens');
    expect(state.winReason).toContain('good policies');
    expect(state.goodPoliciesEnacted).toBe(5);
  });

  it('7-player game: citizens win via policy', () => {
    const deck: PolicyType[] = [
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad', 'bad',
      'good', 'bad',
    ];
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      playerCount: 7,
      players: createTestGameState({ playerCount: 7 }).players,
      policyDeck: deck,
      reshuffleThreshold: 1,
    });

    for (let round = 0; round < 5; round++) {
      state = playFullRound(state, 'good');
      if (state.phase === 'game-over') break;
    }

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('citizens');
    expect(state.goodPoliciesEnacted).toBe(5);
  });
});

// ── WIN CONDITION: Citizens Win via Execution ───────────────────────

describe('Win: Citizens via Execution', () => {
  it('execute mob boss → immediate citizens win', () => {
    // 5-player: 4th bad policy triggers execution
    // player-0 is mob-boss (default factory), but mayor can't execute self
    // Rearrange so mob-boss is player-3, mayor (player-0) is citizen
    const players = createTestGameState().players.map((p) => {
      if (p.id === 'player-0') return { ...p, role: 'citizen' as const, isMayor: true };
      if (p.id === 'player-3') return { ...p, role: 'mob-boss' as const };
      return p;
    });

    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      badPoliciesEnacted: 4,
      players,
    });

    const result = dispatch(state, { type: 'execute', targetId: 'player-3' });
    expect(result.phase).toBe('game-over');
    expect(result.winner).toBe('citizens');
    expect(result.winReason).toContain('Mob Boss executed');
    expect(result.players.find((p) => p.id === 'player-3')!.isAlive).toBe(false);
  });

  it('execute non-boss → game continues', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      badPoliciesEnacted: 4,
    });

    // player-3 is citizen in the factory
    const result = dispatch(state, { type: 'execute', targetId: 'player-3' });
    expect(result.phase).toBe('nomination');
    expect(result.winner).toBeNull();
    expect(result.players.find((p) => p.id === 'player-3')!.isAlive).toBe(false);
  });
});

// ── WIN CONDITION: Mob Wins via 6 Bad Policies ──────────────────────

describe('Win: Mob via 6 Bad Policies', () => {
  it('6th bad policy enacted → mob wins', () => {
    // Start with 5 bad already enacted, enact the 6th
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 5,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good'],
    });

    const result = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact bad
    expect(result.phase).toBe('game-over');
    expect(result.winner).toBe('mob');
    expect(result.winReason).toContain('bad policies');
    expect(result.badPoliciesEnacted).toBe(6);
  });

  it('all executive powers fire in sequence (5-player, stacked deck)', () => {
    // Deck interleaved so each draw of 3 has at least 1 bad
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      policyDeck: [
        'bad', 'good', 'bad',  // round 1
        'bad', 'good', 'bad',  // round 2
        'bad', 'good', 'bad',  // round 3
        'bad', 'good', 'bad',  // round 4
        'bad', 'good', 'bad',  // round 5
        'good', 'bad',         // leftover
      ],
      reshuffleThreshold: 1,
    });

    // Helper: pick a non-boss chief nominee
    const safeChief = (s: GameState) => {
      const eligible = getEligibleNominees(s);
      return eligible.find(
        (id) => s.players.find((p) => p.id === id)!.role !== 'mob-boss',
      ) ?? eligible[0];
    };

    // Rounds 1-2: bad enacted, no power (5-6p grid)
    for (let i = 0; i < 2; i++) {
      state = playFullRound(state, 'bad', safeChief(state));
      expect(state.badPoliciesEnacted).toBe(i + 1);
      expect(state.phase).toBe('nomination');
    }

    // Round 3: 3rd bad → policy-peek
    state = playFullRound(state, 'bad', safeChief(state));
    expect(state.phase).toBe('executive-power');
    expect(state.executivePower).toBe('policy-peek');
    expect(state.peekCards).toHaveLength(3);
    state = dispatch(state, { type: 'acknowledge-peek' });
    expect(state.phase).toBe('nomination');

    // Round 4: 4th bad → execution
    state = playFullRound(state, 'bad', safeChief(state));
    expect(state.phase).toBe('executive-power');
    expect(state.executivePower).toBe('execution');
    const mayor4 = state.players[state.mayorIndex];
    const target4 = state.players.find(
      (p) => p.isAlive && p.id !== mayor4.id && p.role !== 'mob-boss',
    )!;
    state = dispatch(state, { type: 'execute', targetId: target4.id });
    expect(state.phase).toBe('nomination');
    expect(state.badPoliciesEnacted).toBe(4);

    // Round 5: 5th bad → execution
    state = playFullRound(state, 'bad', safeChief(state));
    expect(state.phase).toBe('executive-power');
    expect(state.executivePower).toBe('execution');
    const mayor5 = state.players[state.mayorIndex];
    const target5 = state.players.find(
      (p) => p.isAlive && p.id !== mayor5.id && p.role !== 'mob-boss',
    )!;
    state = dispatch(state, { type: 'execute', targetId: target5.id });
    expect(state.phase).toBe('nomination');
    expect(state.badPoliciesEnacted).toBe(5);
  });
});

// ── WIN CONDITION: Mob Wins via Election ─────────────────────────────

describe('Win: Mob via Election', () => {
  it('mob boss elected chief at exactly 3 bad policies → mob wins', () => {
    // player-0 is mob boss. Nominate player-0 as chief with a different mayor.
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 3,
      mayorIndex: 1,
      nominatedChiefId: 'player-0', // mob boss
      players: createTestGameState().players.map((p) => ({
        ...p,
        isMayor: p.id === 'player-1',
      })),
    });

    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
    expect(state.winReason).toContain('Mob Boss elected');
  });

  it('mob boss elected at 4 bad policies → mob wins', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 4,
      mayorIndex: 1,
      nominatedChiefId: 'player-0',
      players: createTestGameState().players.map((p) => ({
        ...p,
        isMayor: p.id === 'player-1',
      })),
    });

    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
  });

  it('mob boss elected at 5 bad policies → mob wins', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 5,
      mayorIndex: 1,
      nominatedChiefId: 'player-0',
      players: createTestGameState().players.map((p) => ({
        ...p,
        isMayor: p.id === 'player-1',
      })),
    });

    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
  });

  it('mob boss elected at 2 bad policies → game continues', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 2,
      mayorIndex: 1,
      nominatedChiefId: 'player-0',
      players: createTestGameState().players.map((p) => ({
        ...p,
        isMayor: p.id === 'player-1',
      })),
    });

    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }

    state = advanceDisplayIfNeeded(state);
    expect(state.phase).toBe('policy-session');
    expect(state.winner).toBeNull();
  });
});

// ── EXECUTIVE POWERS: Every power at every bracket ──────────────────

describe('Executive Powers: 7-8 Player Bracket', () => {
  const makeState = (badCount: number) =>
    createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: badCount - 1, // will become badCount after enacting
      playerCount: 7,
      players: createTestGameState({ playerCount: 7 }).players,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad'],
      reshuffleThreshold: 1,
    });

  it('1st bad → no power', () => {
    const state = makeState(1);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact bad
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('nomination');
    expect(next.executivePower).toBeNull();
  });

  it('2nd bad → investigate', () => {
    const state = makeState(2);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('investigate');
  });

  it('3rd bad → special-nomination', () => {
    const state = makeState(3);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('special-nomination');
  });

  it('4th bad → execution', () => {
    const state = makeState(4);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('execution');
  });

  it('5th bad → execution', () => {
    const state = makeState(5);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('execution');
  });
});

describe('Executive Powers: 9-10 Player Bracket', () => {
  const makeState = (badCount: number) =>
    createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: badCount - 1,
      playerCount: 9,
      players: createTestGameState({ playerCount: 9 }).players,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad'],
      reshuffleThreshold: 1,
    });

  it('1st bad → investigate', () => {
    const state = makeState(1);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('investigate');
  });

  it('2nd bad → investigate', () => {
    const state = makeState(2);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('investigate');
  });

  it('3rd bad → special-nomination', () => {
    const state = makeState(3);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('special-nomination');
  });

  it('4th bad → execution', () => {
    const state = makeState(4);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('execution');
  });

  it('5th bad → execution', () => {
    const state = makeState(5);
    const afterEnact = dispatch(state, { type: 'chief-discard', cardIndex: 1 });
    const next = advanceDisplayIfNeeded(afterEnact);
    expect(next.phase).toBe('executive-power');
    expect(next.executivePower).toBe('execution');
  });
});

// ── ELECTION TRACKER: Auto-Enact Path ───────────────────────────────

describe('Auto-Enact: 3 Failed Elections', () => {
  it('3 consecutive blocks → auto-enact top card', () => {
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      electionTracker: 0,
      policyDeck: ['good', 'bad', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'bad', 'good', 'bad', 'bad'],
      rngSeed: 42,
    });

    // Fail 3 elections
    state = failElection(state);
    expect(state.electionTracker).toBe(1);
    state = failElection(state);
    expect(state.electionTracker).toBe(2);
    state = failElection(state);

    // After 3rd fail: auto-enact, tracker reset, term limits cleared.
    // Events are per-dispatch (cleared each time), so we check outcomes, not events.
    expect(state.electionTracker).toBe(0);
    // A policy was enacted (either good or bad count increased)
    const totalPolicies = state.goodPoliciesEnacted + state.badPoliciesEnacted;
    expect(totalPolicies).toBeGreaterThan(0);
    // Term limits were cleared
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'term-limits-cleared' }),
    );
    // No executive power should fire
    expect(state.phase).not.toBe('executive-power');
  });

  it('auto-enact does NOT trigger executive power even if bad policy', () => {
    // 7-player game, 1 bad policy already enacted. Auto-enacting 2nd bad
    // should NOT trigger investigate (which is the 7-8p power for 2nd bad).
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      electionTracker: 0,
      badPoliciesEnacted: 1,
      playerCount: 7,
      players: createTestGameState({ playerCount: 7 }).players,
      policyDeck: ['bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'good', 'good', 'good', 'good', 'good', 'good'],
      rngSeed: 42,
    });

    state = failElection(state);
    state = failElection(state);
    state = failElection(state);

    // Bad was auto-enacted (top card was bad)
    expect(state.badPoliciesEnacted).toBe(2);
    // But NO executive power
    expect(state.phase).not.toBe('executive-power');
  });

  it('auto-enact at 5 good policies → citizens win', () => {
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      electionTracker: 0,
      goodPoliciesEnacted: 4,
      policyDeck: ['good', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'good', 'good', 'good', 'good'],
      rngSeed: 42,
    });

    state = failElection(state);
    state = failElection(state);
    state = failElection(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('citizens');
    expect(state.goodPoliciesEnacted).toBe(5);
  });

  it('auto-enact at 6 bad policies → mob wins', () => {
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      electionTracker: 0,
      badPoliciesEnacted: 5,
      policyDeck: ['bad', 'good', 'good', 'good', 'good', 'good', 'good'],
      rngSeed: 42,
    });

    state = failElection(state);
    state = failElection(state);
    state = failElection(state);

    expect(state.phase).toBe('game-over');
    expect(state.winner).toBe('mob');
    expect(state.badPoliciesEnacted).toBe(6);
  });

  it('auto-enact clears ALL term limits', () => {
    let state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      electionTracker: 0,
      policyDeck: ['bad', 'bad', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'bad', 'good', 'bad', 'bad'],
      rngSeed: 42,
      players: createTestGameState().players.map((p) => {
        if (p.id === 'player-2') return { ...p, wasLastMayor: true };
        if (p.id === 'player-4') return { ...p, wasLastChief: true };
        return p;
      }),
    });

    state = failElection(state);
    state = failElection(state);
    state = failElection(state);

    // All term limits cleared
    for (const p of state.players) {
      expect(p.wasLastMayor, `${p.id} wasLastMayor should be cleared`).toBe(false);
      expect(p.wasLastChief, `${p.id} wasLastChief should be cleared`).toBe(false);
    }
  });
});

// ── VETO POWER: Full Paths ──────────────────────────────────────────

describe('Veto Power: Full Paths', () => {
  it('veto accepted → cards discarded, tracker advances, next round', () => {
    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      electionTracker: 0,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad', 'good'],
    });

    // Chief proposes veto
    state = dispatch(state, { type: 'propose-veto' });
    expect(state.subPhase).toBe('policy-veto-propose');
    state = advanceDisplayIfNeeded(state); // advance past veto-propose display
    expect(state.subPhase).toBe('policy-veto-response');

    // Mayor approves
    state = dispatch(state, { type: 'veto-response', approved: true });
    expect(state.electionTracker).toBe(1);
    expect(state.chiefCards).toBeNull();
    // Both cards went to discard
    expect(state.policyDiscard.length).toBeGreaterThanOrEqual(2);
    expect(state.phase).toBe('nomination'); // new round
  });

  it('veto rejected → chief must enact one card', () => {
    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'good'],
      policyDeck: ['bad', 'good', 'bad', 'good', 'bad'],
    });

    state = dispatch(state, { type: 'propose-veto' });
    state = advanceDisplayIfNeeded(state); // advance past veto-propose display
    state = dispatch(state, { type: 'veto-response', approved: false });

    expect(state.subPhase).toBe('policy-chief-discard');
    // Chief must now discard and enact
    state = dispatch(state, { type: 'chief-discard', cardIndex: 0 }); // enact good
    state = advanceDisplayIfNeeded(state);
    expect(state.goodPoliciesEnacted).toBeGreaterThan(0);
  });

  it('veto accepted at tracker=2 → auto-enact cascade', () => {
    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      electionTracker: 2,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad', 'good'],
      rngSeed: 42,
    });

    state = dispatch(state, { type: 'propose-veto' });
    state = advanceDisplayIfNeeded(state); // advance past veto-propose display
    state = dispatch(state, { type: 'veto-response', approved: true });

    // Veto approved at tracker=2 → tracker becomes 3 → auto-enact pauses at display
    expect(state.subPhase).toBe('auto-enact');

    state = advanceDisplayIfNeeded(state); // advance past auto-enact display

    // Tracker was 2 + 1 from veto = 3 → auto-enact fired, tracker reset
    expect(state.electionTracker).toBe(0);
    // A policy was auto-enacted
    const totalPolicies = state.goodPoliciesEnacted + state.badPoliciesEnacted;
    expect(totalPolicies).toBeGreaterThan(5); // 5 bad + whatever was auto-enacted
  });
});

// ── SPECIAL ELECTION: Full Path ─────────────────────────────────────

describe('Special Election: Full Path', () => {
  it('special nomination → target becomes mayor → next round resumes rotation', () => {
    // 7-player game: 3rd bad → special-nomination power
    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
      mayorIndex: 0,
      playerCount: 7,
      players: createTestGameState({ playerCount: 7 }).players,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad'],
      reshuffleThreshold: 1,
    });

    // Mayor (player-0) special-nominates player-4
    state = dispatch(state, { type: 'special-nominate', targetId: 'player-4' });

    // State should transition to nomination with player-4 as next mayor
    expect(state.phase).toBe('nomination');
    expect(state.players[state.mayorIndex].id).toBe('player-4');
    expect(state.resumeMayorIndex).toBe(0); // remembers caller

    // Play that round
    state = playFullRound(state, 'good');
    if (state.phase === 'game-over') return;

    // Next round should resume from player-0's position + 1 = player-1
    expect(state.players[state.mayorIndex].id).toBe('player-1');
    expect(state.resumeMayorIndex).toBeNull(); // cleared
  });

  it('special-nominate next-in-rotation → serves twice in a row', () => {
    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
      mayorIndex: 0,
      policyDeck: ['good', 'bad', 'bad', 'good', 'bad', 'bad', 'good', 'bad', 'bad', 'good', 'bad', 'bad', 'good', 'bad', 'bad', 'good', 'bad'],
      reshuffleThreshold: 1,
    });

    // Mayor (player-0) special-nominates player-1 (next in rotation)
    state = dispatch(state, { type: 'special-nominate', targetId: 'player-1' });
    expect(state.players[state.mayorIndex].id).toBe('player-1');

    // Play round with player-1 as mayor
    state = playFullRound(state, 'good');
    if (state.phase === 'game-over') return;

    // Player-1 should serve AGAIN (resume from 0+1 = 1)
    expect(state.players[state.mayorIndex].id).toBe('player-1');
  });
});

// ── INVESTIGATION: Full Exercise ────────────────────────────────────

describe('Investigation: Full Exercise', () => {
  it('investigate citizen → result is "citizen"', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });

    // player-3 is citizen in factory
    const result = dispatch(state, { type: 'investigate', targetId: 'player-3' });
    expect(result.investigationHistory).toHaveLength(1);
    expect(result.investigationHistory[0].result).toBe('citizen');
    expect(result.investigationHistory[0].targetId).toBe('player-3');
  });

  it('investigate mob soldier → result is "mob"', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });

    // player-1 is mob-soldier in factory
    const result = dispatch(state, { type: 'investigate', targetId: 'player-1' });
    expect(result.investigationHistory[0].result).toBe('mob');
  });

  it('investigate mob boss → result is "mob" (not distinguished)', () => {
    // Need boss to not be the mayor
    const players = createTestGameState().players.map((p) => {
      if (p.id === 'player-0') return { ...p, role: 'citizen' as const, isMayor: true };
      if (p.id === 'player-3') return { ...p, role: 'mob-boss' as const };
      return p;
    });

    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      players,
    });

    const result = dispatch(state, { type: 'investigate', targetId: 'player-3' });
    expect(result.investigationHistory[0].result).toBe('mob');
  });

  it('two investigations on different targets both recorded', () => {
    let state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      investigationHistory: [
        { investigatorId: 'player-0', targetId: 'player-1', result: 'mob' },
      ],
    });

    // Second investigation on a different player
    state = dispatch(state, { type: 'investigate', targetId: 'player-3' });
    expect(state.investigationHistory).toHaveLength(2);
    expect(state.investigationHistory[1].targetId).toBe('player-3');
  });
});

// ── DECK RESHUFFLE ──────────────────────────────────────────────────

describe('Deck Reshuffle', () => {
  it('reshuffle fires when deck runs low before draw', () => {
    // Set up state where deck has fewer cards than threshold
    // Total must be 17 cards: deck(2) + discard(15) = 17, with 6 good + 11 bad
    // Deck: 1 good + 1 bad = 2 cards (1 good)
    // Discard: 5 good + 10 bad = 15 cards
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
      policyDeck: ['good', 'bad'], // 1 good + 1 bad
      policyDiscard: ['bad', 'bad', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'bad', 'bad'],
      reshuffleThreshold: 5, // deck.length (2) < threshold (5)
      rngSeed: 42,
    });

    // Pass election → draw 3 cards → reshuffle must happen first
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);

    // Should have reshuffled and drawn 3 cards
    expect(state.phase).toBe('policy-session');
    expect(state.mayorCards).toHaveLength(3);
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'deck-reshuffled' }),
    );
    // Card invariant should hold
    checkCardInvariant(state);
  });
});

// ── TERM LIMITS: Comprehensive ──────────────────────────────────────

describe('Term Limits: Comprehensive', () => {
  it('at 5 alive: only chief is term-limited, not mayor', () => {
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      mayorIndex: 2,
      players: createTestGameState().players.map((p) => ({
        ...p,
        isMayor: p.id === 'player-2',
        wasLastMayor: p.id === 'player-0',
        wasLastChief: p.id === 'player-1',
      })),
    });

    const eligible = getEligibleNominees(state);
    // player-0 (wasLastMayor) CAN be nominated at 5 alive
    expect(eligible).toContain('player-0');
    // player-1 (wasLastChief) CANNOT be nominated
    expect(eligible).not.toContain('player-1');
    // player-2 is current mayor — excluded
    expect(eligible).not.toContain('player-2');
  });

  it('at 6 alive: both mayor and chief are term-limited', () => {
    const base = createTestGameState({ playerCount: 6 });
    const state = {
      ...base,
      phase: 'nomination' as const,
      subPhase: 'nomination-pending' as const,
      mayorIndex: 2,
      players: base.players.map((p) => ({
        ...p,
        isMayor: p.id === 'player-2',
        wasLastMayor: p.id === 'player-0',
        wasLastChief: p.id === 'player-1',
      })),
    };

    const eligible = getEligibleNominees(state);
    // player-0 (wasLastMayor) CANNOT be nominated at 6 alive
    expect(eligible).not.toContain('player-0');
    // player-1 (wasLastChief) CANNOT be nominated
    expect(eligible).not.toContain('player-1');
  });

  it('deadlock fallback waives all term limits', () => {
    // 5 players, 2 dead. 3 alive: player-0 (mayor), player-1, player-2
    // Both non-mayor alive players are term-limited
    const state = createTestGameState({
      phase: 'nomination',
      subPhase: 'nomination-pending',
      mayorIndex: 0,
      players: createTestGameState().players.map((p) => {
        if (p.id === 'player-3' || p.id === 'player-4') return { ...p, isAlive: false };
        if (p.id === 'player-1') return { ...p, wasLastChief: true };
        if (p.id === 'player-2') return { ...p, wasLastChief: true };
        return p;
      }),
    });

    const eligible = getEligibleNominees(state);
    // Both should be eligible despite term limits (deadlock)
    expect(eligible).toContain('player-1');
    expect(eligible).toContain('player-2');
  });
});

// ── FULL GAME FROM START: createGame → game-over ────────────────────

describe('Full Game: Start to Finish', () => {
  it.each([5, 6, 7, 8, 9, 10])(
    '%i-player game from createGame through all phases to game-over',
    (count) => {
      const rng = mulberry32(count * 1000 + 7);
      const names = Array.from({ length: count }, (_, i) => `P${i}`);
      let state = createGame(names, rng);

      expect(state.phase).toBe('role-reveal');

      // Acknowledge
      state = acknowledgeAllRoles(state);
      expect(state.phase).toBe('nomination');

      // Play to completion
      let dispatches = 0;
      while (state.phase !== 'game-over' && dispatches < 500) {
        const action = pickAction(state, rng);
        state = dispatch(state, action);
        dispatches++;
      }

      expect(state.phase).toBe('game-over');
      expect(state.winner).not.toBeNull();
      expect(['citizens', 'mob']).toContain(state.winner);
    },
  );
});

// Simple action picker — uses the static import at top of file
function pickAction(state: GameState, rng: () => number) {
  return pickNextAction(state, rng);
}
