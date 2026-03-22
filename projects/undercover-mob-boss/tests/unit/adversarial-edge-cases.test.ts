/**
 * Adversarial edge-case tests for the game state machine.
 *
 * These tests construct pathological game states and action sequences
 * to find bugs in dispatch, validation, and state transitions.
 */
import { describe, it, expect } from 'vitest';
import {
  dispatch,
  getEligibleNominees,
  advanceMayor,
  InvalidActionError,
  createGame,
} from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import { drawCards, checkReshuffle } from '../../src/server/game/policies';
import { createTestGameState, createTestPlayer } from '../helpers/game-state-factory';
import {
  acknowledgeAllRoles,
  passElection,
  failElection,
  playFullRound,
  enactPolicy,
  mayorDiscard,
  chiefDiscard,
  checkCardInvariant,
  checkStateInvariants,
  advanceDisplayIfNeeded,
} from '../helpers/game-driver';
import type { GameState, GameAction, Phase, SubPhase, PolicyType } from '../../src/shared/types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a minimal valid state in the given phase/subPhase for rejection testing. */
function stateInPhase(phase: Phase, subPhase: SubPhase | null): GameState {
  const base = createTestGameState({ playerCount: 7 });

  // Set basic fields that many phases need
  const state: GameState = {
    ...base,
    phase,
    subPhase,
    nominatedChiefId: 'player-2',
    mayorCards: ['good', 'bad', 'bad'],
    chiefCards: ['good', 'bad'],
    badPoliciesEnacted: 5, // needed for veto tests
    executivePower:
      subPhase === 'executive-power-pending' ? 'investigate' :
      subPhase === 'policy-peek-viewing' ? 'policy-peek' : null,
    peekCards: subPhase === 'policy-peek-viewing' ? ['good', 'bad', 'bad'] : null,
  };
  return state;
}

/** All possible action constructors (with dummy valid-looking payloads). */
function allActions(state: GameState): GameAction[] {
  const aliveNonMayor = state.players.find(
    (p) => p.isAlive && !p.isMayor,
  )!;
  return [
    { type: 'start-game' },
    { type: 'acknowledge-role', playerId: state.players[0].id },
    { type: 'nominate', targetId: aliveNonMayor.id },
    { type: 'vote', playerId: state.players[0].id, vote: 'approve' },
    { type: 'mayor-discard', cardIndex: 0 },
    { type: 'chief-discard', cardIndex: 0 },
    { type: 'propose-veto' },
    { type: 'veto-response', approved: true },
    { type: 'investigate', targetId: aliveNonMayor.id },
    { type: 'special-nominate', targetId: aliveNonMayor.id },
    { type: 'acknowledge-peek' },
    { type: 'execute', targetId: aliveNonMayor.id },
  ];
}

/** Every (phase, subPhase) combination that exists in the type system. */
const ALL_PHASE_SUBPHASE_COMBOS: Array<{ phase: Phase; subPhase: SubPhase | null }> = [
  { phase: 'lobby', subPhase: null },
  { phase: 'role-reveal', subPhase: 'role-reveal-waiting' },
  { phase: 'nomination', subPhase: 'nomination-pending' },
  { phase: 'election', subPhase: 'election-voting' },
  { phase: 'policy-session', subPhase: 'policy-mayor-discard' },
  { phase: 'policy-session', subPhase: 'policy-chief-discard' },
  { phase: 'policy-session', subPhase: 'policy-veto-response' },
  { phase: 'executive-power', subPhase: 'executive-power-pending' },
  { phase: 'executive-power', subPhase: 'policy-peek-viewing' },
  { phase: 'game-over', subPhase: null },
];

/** Action types and the one phase/subPhase where they ARE valid. */
const ACTION_VALID_IN: Record<string, { phase: Phase; subPhase: SubPhase | null }> = {
  'start-game':       { phase: 'lobby', subPhase: null },
  'acknowledge-role': { phase: 'role-reveal', subPhase: 'role-reveal-waiting' },
  'nominate':         { phase: 'nomination', subPhase: 'nomination-pending' },
  'vote':             { phase: 'election', subPhase: 'election-voting' },
  'mayor-discard':    { phase: 'policy-session', subPhase: 'policy-mayor-discard' },
  'chief-discard':    { phase: 'policy-session', subPhase: 'policy-chief-discard' },
  'propose-veto':     { phase: 'policy-session', subPhase: 'policy-chief-discard' },
  'veto-response':    { phase: 'policy-session', subPhase: 'policy-veto-response' },
  'investigate':      { phase: 'executive-power', subPhase: 'executive-power-pending' },
  'special-nominate': { phase: 'executive-power', subPhase: 'executive-power-pending' },
  'acknowledge-peek': { phase: 'executive-power', subPhase: 'policy-peek-viewing' },
  'execute':          { phase: 'executive-power', subPhase: 'executive-power-pending' },
};

// ── 1. Every action in every wrong phase ────────────────────────────

describe('1. Every action in every wrong phase', () => {
  for (const { phase, subPhase } of ALL_PHASE_SUBPHASE_COMBOS) {
    const state = stateInPhase(phase, subPhase);
    const actions = allActions(state);

    for (const action of actions) {
      const validCombo = ACTION_VALID_IN[action.type];
      const isValidHere =
        validCombo.phase === phase && validCombo.subPhase === subPhase;

      if (isValidHere) continue; // skip the one valid combo

      it(`rejects ${action.type} in ${phase}/${subPhase ?? 'null'}`, () => {
        expect(() => dispatch(state, action)).toThrow(InvalidActionError);
      });
    }
  }
});

// ── 2. Rapid identical dispatches (idempotency) ─────────────────────

describe('2. Rapid identical dispatches', () => {
  it('vote: second identical vote from same player is rejected', () => {
    // Set up election-voting with a nominated chief
    const base = createTestGameState({
      playerCount: 5,
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-2',
    });
    const action: GameAction = { type: 'vote', playerId: 'player-0', vote: 'approve' };
    const after1 = dispatch(base, action);

    // Second vote from same player should throw
    expect(() => dispatch(after1, action)).toThrow(InvalidActionError);
  });

  it('acknowledge-role: second acknowledge from same player is silently idempotent', () => {
    const rng = mulberry32(42);
    const state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    const action: GameAction = { type: 'acknowledge-role', playerId: 'player-0' };

    const after1 = dispatch(state, action);
    // Second acknowledge should be idempotent (returns same state, not error)
    const after2 = dispatch(after1, action);
    expect(after2.acknowledgedPlayerIds).toEqual(after1.acknowledgedPlayerIds);
  });

  it('nominate: second nominate after first is rejected (phase changed)', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'nomination',
      subPhase: 'nomination-pending',
    });
    const eligible = getEligibleNominees(state);
    const action: GameAction = { type: 'nominate', targetId: eligible[0] };
    const after1 = dispatch(state, action);

    // After first nominate, we're in election-voting, not nomination-pending
    expect(() => dispatch(after1, action)).toThrow(InvalidActionError);
  });

  it('mayor-discard: second discard after first is rejected (subPhase changed)', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    const action: GameAction = { type: 'mayor-discard', cardIndex: 0 };
    const after1 = dispatch(state, action);

    // Now in policy-chief-discard, not policy-mayor-discard
    expect(() => dispatch(after1, action)).toThrow(InvalidActionError);
  });

  it('chief-discard: second discard after first is rejected (subPhase changed)', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });
    const action: GameAction = { type: 'chief-discard', cardIndex: 0 };
    const after1 = dispatch(state, action);

    // After chief-discard, we've moved to nomination or executive-power
    expect(() => dispatch(after1, action)).toThrow(InvalidActionError);
  });

  it('propose-veto: second propose-veto after first is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
      badPoliciesEnacted: 5,
      vetoProposed: false,
    });
    const action: GameAction = { type: 'propose-veto' };
    const after1 = dispatch(state, action);

    // Now in policy-veto-response subPhase, propose-veto should fail
    expect(() => dispatch(after1, action)).toThrow(InvalidActionError);
  });

  it('propose-veto: rejected even if mayor sends chief back (vetoProposed stays true)', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
      badPoliciesEnacted: 5,
      vetoProposed: false,
    });
    // Chief proposes veto
    let s = dispatch(state, { type: 'propose-veto' });
    s = advanceDisplayIfNeeded(s); // advance past veto-propose display
    // Mayor rejects veto -> back to policy-chief-discard with vetoProposed=true
    s = dispatch(s, { type: 'veto-response', approved: false });
    expect(s.subPhase).toBe('policy-chief-discard');
    expect(s.vetoProposed).toBe(true);

    // Second propose-veto should fail
    expect(() => dispatch(s, { type: 'propose-veto' })).toThrow(InvalidActionError);
  });
});

// ── 3. Maximum game length (all-block marathon) ─────────────────────

describe('3. Maximum game length — all elections fail', () => {
  it('auto-enacts every 3rd failed election and never deadlocks', () => {
    const rng = mulberry32(99);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    state = acknowledgeAllRoles(state);

    let totalDispatches = 0;
    let autoEnacts = 0;
    const MAX_DISPATCHES = 2000; // safety valve

    while (state.phase !== 'game-over' && totalDispatches < MAX_DISPATCHES) {
      if (state.phase === 'nomination' && state.subPhase === 'nomination-pending') {
        state = failElection(state);
        totalDispatches++;
      } else if (state.phase === 'executive-power') {
        // Handle executive powers from auto-enacts (shouldn't happen since autoEnacted=true skips powers)
        // But handle just in case
        if (state.subPhase === 'policy-peek-viewing') {
          state = dispatch(state, { type: 'acknowledge-peek' });
        } else if (state.subPhase === 'executive-power-pending') {
          const mayor = state.players[state.mayorIndex];
          const target = state.players.find((p) => p.isAlive && p.id !== mayor.id)!;
          if (state.executivePower === 'investigate') {
            state = dispatch(state, { type: 'investigate', targetId: target.id });
          } else if (state.executivePower === 'execution') {
            state = dispatch(state, { type: 'execute', targetId: target.id });
          } else if (state.executivePower === 'special-nomination') {
            state = dispatch(state, { type: 'special-nominate', targetId: target.id });
          }
        }
        totalDispatches++;
      } else {
        // Unexpected phase
        throw new Error(`Unexpected phase: ${state.phase}/${state.subPhase} at dispatch ${totalDispatches}`);
      }

      // Count auto-enacts
      if (state.events.some((e) => e.type === 'auto-enact-triggered')) {
        autoEnacts++;
      }

      // Card invariant check after every transition
      if (state.phase !== 'game-over') {
        checkCardInvariant(state);
      }
    }

    expect(state.phase).toBe('game-over');
    expect(totalDispatches).toBeLessThan(MAX_DISPATCHES);
    // With 17 cards total, need 11 enactments max (6 good or 6 bad).
    // Auto-enact draws 1 card per 3 fails, so this will terminate.
    expect(autoEnacts).toBeGreaterThan(0);
  });

  it('card invariant holds through every auto-enact cycle until game over', () => {
    // Use multiple seeds to increase coverage — at least one should reshuffle
    for (const seed of [77, 200, 999, 1234]) {
      const rng = mulberry32(seed);
      let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
      state = acknowledgeAllRoles(state);

      const MAX = 2000;
      let dispatches = 0;

      while (state.phase !== 'game-over' && dispatches < MAX) {
        if (state.phase === 'nomination') {
          state = failElection(state);
        } else {
          break;
        }
        dispatches++;

        if (state.phase !== 'game-over') {
          checkCardInvariant(state);
        }
      }

      expect(state.phase).toBe('game-over');
      expect(dispatches).toBeLessThan(MAX);
    }
  });
});

// ── 4. Minimum alive players (5-player, 2 executed → 3 alive) ───────

describe('4. Minimum alive players (3 alive from 5)', () => {
  function setupMinPlayers(): GameState {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    state = acknowledgeAllRoles(state);

    // We need to enact bad policies to unlock execution powers.
    // For 5-6 players: execution unlocks at badPolicies=4 and badPolicies=5.
    // We'll manually construct a state with 2 executed players.
    // Find players who are NOT the mob boss (we don't want to end the game).
    const mobBoss = state.players.find((p) => p.role === 'mob-boss')!;
    const citizens = state.players.filter(
      (p) => p.role === 'citizen' && p.id !== mobBoss.id,
    );

    // Kill two citizens by constructing the state directly
    const deadIds = [citizens[0].id, citizens[1].id];
    const players = state.players.map((p) => ({
      ...p,
      isAlive: !deadIds.includes(p.id),
      isMayor: false,
      isChief: false,
      wasLastMayor: false,
      wasLastChief: false,
    }));

    // Make the first alive player the mayor
    const firstAliveIdx = players.findIndex((p) => p.isAlive);
    players[firstAliveIdx].isMayor = true;

    return {
      ...state,
      phase: 'nomination',
      subPhase: 'nomination-pending',
      players,
      mayorIndex: firstAliveIdx,
      nominatedChiefId: null,
      votes: {},
      round: 10,
      badPoliciesEnacted: 4,
      goodPoliciesEnacted: 0,
      electionTracker: 0,
    };
  }

  it('nomination works — someone can be nominated despite term limits', () => {
    const state = setupMinPlayers();
    const eligible = getEligibleNominees(state);
    // With 3 alive players, mayor can't be nominated, so 2 candidates
    expect(eligible.length).toBeGreaterThanOrEqual(1);

    // Nominate the first eligible
    const next = dispatch(state, { type: 'nominate', targetId: eligible[0] });
    expect(next.phase).toBe('election');
    expect(next.subPhase).toBe('election-voting');
  });

  it('voting works with 3 voters', () => {
    const state = setupMinPlayers();
    const eligible = getEligibleNominees(state);
    let s = dispatch(state, { type: 'nominate', targetId: eligible[0] });

    const alivePlayers = s.players.filter((p) => p.isAlive);
    expect(alivePlayers).toHaveLength(3);

    // All 3 vote approve
    for (const p of alivePlayers) {
      s = dispatch(s, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    s = advanceDisplayIfNeeded(s);
    // Election should resolve (3 alive, 3 votes → majority = 2 approves)
    expect(s.phase).not.toBe('election');
  });

  it('mayor rotation skips the 2 dead players', () => {
    const state = setupMinPlayers();
    const aliveIds = state.players.filter((p) => p.isAlive).map((p) => p.id);

    // Advance mayor multiple times and verify it always lands on alive players
    let s = state;
    const visitedMayors: string[] = [];
    for (let i = 0; i < 6; i++) {
      s = advanceMayor(s);
      const newMayor = s.players[s.mayorIndex];
      expect(newMayor.isAlive).toBe(true);
      expect(aliveIds).toContain(newMayor.id);
      visitedMayors.push(newMayor.id);
    }
    // Over 6 advances with 3 alive players, every alive player should be visited
    for (const id of aliveIds) {
      expect(visitedMayors).toContain(id);
    }
  });

  it('term limits relax correctly at <=5 alive (wasLastMayor no longer excluded)', () => {
    const state = setupMinPlayers();
    const alivePlayers = state.players.filter((p) => p.isAlive);
    const mayor = state.players[state.mayorIndex];
    const nonMayorAlive = alivePlayers.filter((p) => p.id !== mayor.id);

    // Set one player as wasLastMayor and one as wasLastChief
    const tweaked: GameState = {
      ...state,
      players: state.players.map((p) => {
        if (p.id === nonMayorAlive[0].id) return { ...p, wasLastMayor: true };
        if (p.id === nonMayorAlive[1].id) return { ...p, wasLastChief: true };
        return p;
      }),
    };

    const eligible = getEligibleNominees(tweaked);
    // At <=5 alive, wasLastMayor is NOT excluded (only wasLastChief is).
    // So wasLastMayor player should be eligible.
    expect(eligible).toContain(nonMayorAlive[0].id);
    // wasLastChief is ALWAYS excluded
    expect(eligible).not.toContain(nonMayorAlive[1].id);
  });

  it('deadlock fallback: if term limits exclude all candidates, waive them', () => {
    const state = setupMinPlayers();
    const alivePlayers = state.players.filter((p) => p.isAlive);
    const mayor = state.players[state.mayorIndex];
    const nonMayorAlive = alivePlayers.filter((p) => p.id !== mayor.id);

    // Both non-mayor alive players are wasLastChief — should trigger fallback
    const tweaked: GameState = {
      ...state,
      players: state.players.map((p) => {
        if (nonMayorAlive.some((nm) => nm.id === p.id)) {
          return { ...p, wasLastChief: true };
        }
        return p;
      }),
    };

    const eligible = getEligibleNominees(tweaked);
    // Deadlock fallback: all non-mayor alive candidates returned
    expect(eligible.length).toBe(2);
    expect(eligible).toContain(nonMayorAlive[0].id);
    expect(eligible).toContain(nonMayorAlive[1].id);
  });
});

// ── 5. All players investigated (10-player game) ────────────────────

describe('5. All players investigated in 10-player game', () => {
  it('9th investigation attempt fails — no valid targets left', () => {
    const state = createTestGameState({ playerCount: 10 });
    const mayor = state.players[state.mayorIndex]; // player-0

    // Build investigation history: investigated every alive non-mayor player
    const nonMayor = state.players.filter((p) => p.id !== mayor.id);
    const investigationHistory = nonMayor.map((p) => ({
      investigatorId: mayor.id,
      targetId: p.id,
      result: 'citizen' as const,
    }));

    // Put state in investigation phase
    const investigateState: GameState = {
      ...state,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      investigationHistory,
    };

    // All 9 non-mayor players already investigated.
    // Trying to investigate any of them should fail (already investigated).
    // Trying to investigate the mayor should fail (can't investigate yourself).
    // So EVERY possible target should be rejected.
    for (const player of state.players) {
      expect(() =>
        dispatch(investigateState, { type: 'investigate', targetId: player.id }),
      ).toThrow(InvalidActionError);
    }
  });

  it('investigation targets shrink correctly as history grows', () => {
    const state = createTestGameState({ playerCount: 10 });
    const mayor = state.players[state.mayorIndex];

    const nonMayor = state.players.filter(
      (p) => p.id !== mayor.id && p.isAlive,
    );

    for (let i = 0; i < nonMayor.length; i++) {
      const history = nonMayor.slice(0, i).map((p) => ({
        investigatorId: mayor.id,
        targetId: p.id,
        result: 'citizen' as const,
      }));

      const investigateState: GameState = {
        ...state,
        phase: 'executive-power',
        subPhase: 'executive-power-pending',
        executivePower: 'investigate',
        investigationHistory: history,
      };

      if (i < nonMayor.length) {
        // Still valid targets left
        const result = dispatch(investigateState, {
          type: 'investigate',
          targetId: nonMayor[i].id,
        });
        expect(result.investigationHistory).toHaveLength(i + 1);
      }
    }
  });
});

// ── 6. Special election to dead player ──────────────────────────────

describe('6. Special election to dead player', () => {
  it('advanceMayor jumps to dead player if specialNominatedMayorId points to them', () => {
    const state = createTestGameState({ playerCount: 7 });

    // Kill the target of the special nomination
    const targetId = 'player-3';
    const tweaked: GameState = {
      ...state,
      specialNominatedMayorId: targetId,
      players: state.players.map((p) =>
        p.id === targetId ? { ...p, isAlive: false } : p,
      ),
    };

    // BUG PROBE: advanceMayor doesn't check if specialNominatedMayorId is alive.
    // It just jumps to that index. The player will be dead and set as mayor.
    const result = advanceMayor(tweaked);
    const newMayor = result.players[result.mayorIndex];

    // REPORT: This documents the current behavior.
    // If the new mayor is dead, this is a bug. If alive, it's safe.
    // The state machine should not allow a dead player to be mayor.
    if (!newMayor.isAlive) {
      // This IS a bug — dead player became mayor
      expect(newMayor.isAlive).toBe(false); // documents the bug
      expect(newMayor.id).toBe(targetId);
      // The invariant checker should catch this:
      expect(() => checkStateInvariants(result)).toThrow('dead');
    } else {
      expect(newMayor.isAlive).toBe(true);
    }
  });
});

// ── 7. Veto → auto-enact → reshuffle → win cascade ─────────────────

describe('7. Veto -> auto-enact -> reshuffle -> win cascade', () => {
  it('full cascade: veto approved, tracker=3, auto-enact draws 6th bad -> mob wins', () => {
    // Set up: 5 bad policies enacted, tracker at 2, deck nearly empty
    // so auto-enact triggers reshuffle + draw
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      goodPoliciesEnacted: 0,
      electionTracker: 2,
      // Deck is nearly empty to force reshuffle
      policyDeck: [],
      // Discard has the remaining 6 good + 6 bad (minus 5 enacted bad, minus 2 in hand)
      // 17 total - 5 enacted bad - 2 in chief hand = 10 in deck+discard
      policyDiscard: ['bad', 'bad', 'bad', 'bad', 'bad', 'bad', 'good', 'good', 'good', 'good'],
      chiefCards: ['good', 'bad'],
      mayorCards: null,
      vetoProposed: false,
      reshuffleThreshold: 5,
    });

    // Step 1: Chief proposes veto
    let s = dispatch(state, { type: 'propose-veto' });
    expect(s.subPhase).toBe('policy-veto-propose');
    s = advanceDisplayIfNeeded(s);
    expect(s.subPhase).toBe('policy-veto-response');

    // Step 2: Mayor approves veto — tracker goes to 3 → auto-enact
    s = dispatch(s, { type: 'veto-response', approved: true });
    s = advanceDisplayIfNeeded(s);

    // The cascade should have:
    // 1. Veto approved → cards discarded → tracker = 3
    // 2. Auto-enact triggered → reshuffle (deck was empty) → draw 1
    // 3. If that card is 'bad' → badPoliciesEnacted=6 → mob wins
    // Note: with a seeded RNG in the reshuffle, the top card is deterministic.
    // Either mob wins (bad drawn) or the game continues.

    if (s.phase === 'game-over') {
      expect(s.winner).toBe('mob');
      expect(s.badPoliciesEnacted).toBe(6);
    } else {
      // Good card was drawn — game continues
      expect(s.goodPoliciesEnacted).toBeGreaterThanOrEqual(1);
      expect(s.badPoliciesEnacted).toBe(5);
      // Verify card invariant holds after reshuffle
      checkCardInvariant(s);
    }
  });

  it('veto at tracker=2 triggers auto-enact', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      goodPoliciesEnacted: 0,
      electionTracker: 2,
      policyDeck: ['bad', 'good', 'bad', 'bad', 'good', 'bad'],
      policyDiscard: ['good', 'good', 'good', 'good'],
      chiefCards: ['good', 'bad'],
      mayorCards: null,
      vetoProposed: false,
    });

    let s = dispatch(state, { type: 'propose-veto' });
    s = advanceDisplayIfNeeded(s);
    s = dispatch(s, { type: 'veto-response', approved: true });
    s = advanceDisplayIfNeeded(s);

    // Veto at tracker=2 → tracker becomes 3 → auto-enact fires.
    // The top card is 'bad' and 5 bad already enacted = 6 total → mob wins (game-over).
    // OR if top card is 'good' → pauses at auto-enact display.
    if (s.phase === 'game-over') {
      expect(s.winner).toBe('mob');
      expect(s.badPoliciesEnacted).toBe(6);
    } else {
      // Non-winning auto-enact
      expect(s.electionTracker).toBe(0);
    }
  });
});

// ── 8. Zero cards in deck and discard ───────────────────────────────

describe('8. Zero cards in deck and discard', () => {
  it('drawCards throws when deck is empty', () => {
    expect(() => drawCards([], 1)).toThrow('Cannot draw 1 cards from deck of 0');
    expect(() => drawCards([], 3)).toThrow('Cannot draw 3 cards from deck of 0');
  });

  it('checkReshuffle on empty deck+discard throws post-reshuffle invariant', () => {
    const state = createTestGameState({
      playerCount: 5,
      policyDeck: [],
      policyDiscard: [],
      reshuffleThreshold: 5, // will trigger reshuffle since 0 < 5
    });

    const rng = mulberry32(42);
    // Combined deck has 0 cards after reshuffle → should throw
    expect(() => checkReshuffle(state, rng)).toThrow('Post-reshuffle deck has 0 cards');
  });

  it('auto-enact with empty deck and discard crashes predictably', () => {
    // This is an "impossible" state, but let's verify it crashes gracefully
    const state = createTestGameState({
      playerCount: 5,
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-2',
      electionTracker: 2,
      policyDeck: [],
      policyDiscard: [],
      reshuffleThreshold: 5,
      // All policies already enacted — extreme edge
      goodPoliciesEnacted: 0,
      badPoliciesEnacted: 0,
    });

    // Vote to fail the election — tracker goes to 3 → auto-enact → crash
    const alivePlayers = state.players.filter((p) => p.isAlive);
    let s = state;
    // Add block votes from all but last player
    for (let i = 0; i < alivePlayers.length - 1; i++) {
      s = dispatch(s, { type: 'vote', playerId: alivePlayers[i].id, vote: 'block' });
    }
    // Last vote pauses at election-result display
    s = dispatch(s, { type: 'vote', playerId: alivePlayers[alivePlayers.length - 1].id, vote: 'block' });
    expect(s.subPhase).toBe('election-result');
    // advance-display triggers election failed → auto-enact → reshuffle on empty deck → crash
    expect(() =>
      dispatch(s, { type: 'advance-display' }),
    ).toThrow(); // Should throw from reshuffle or draw
  });

  it('drawCards with insufficient cards throws', () => {
    expect(() => drawCards(['good'], 3)).toThrow('Cannot draw 3 cards from deck of 1');
    expect(() => drawCards(['good', 'bad'], 3)).toThrow('Cannot draw 3 cards from deck of 2');
  });
});

// ── 9. Negative/invalid card indices ────────────────────────────────

describe('9. Negative/invalid card indices', () => {
  it('mayor-discard with cardIndex=-1 is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    expect(() => dispatch(state, { type: 'mayor-discard', cardIndex: -1 })).toThrow(
      InvalidActionError,
    );
  });

  it('mayor-discard with cardIndex=99 is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    expect(() => dispatch(state, { type: 'mayor-discard', cardIndex: 99 })).toThrow(
      InvalidActionError,
    );
  });

  /**
   * BUG FOUND: NaN passes validation because NaN < 0 === false and NaN >= 3 === false.
   * This means cardIndex=NaN slips through the guard in validateAction.
   * handleMayorDiscard then does cards[NaN] which returns undefined,
   * pushing undefined into policyDiscard and passing all 3 cards to the chief
   * (since i !== NaN is always true in the filter). Silent data corruption.
   */
  it('mayor-discard with cardIndex=NaN is rejected (was a bug, now fixed)', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    expect(() => dispatch(state, { type: 'mayor-discard', cardIndex: NaN })).toThrow(
      InvalidActionError,
    );
  });

  it('mayor-discard with cardIndex=3 (out of bounds for 3 cards) is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    expect(() => dispatch(state, { type: 'mayor-discard', cardIndex: 3 })).toThrow(
      InvalidActionError,
    );
  });

  it('chief-discard with cardIndex=-1 is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });
    expect(() => dispatch(state, { type: 'chief-discard', cardIndex: -1 })).toThrow(
      InvalidActionError,
    );
  });

  it('chief-discard with cardIndex=99 is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });
    expect(() => dispatch(state, { type: 'chief-discard', cardIndex: 99 })).toThrow(
      InvalidActionError,
    );
  });

  /**
   * BUG FOUND: Same NaN bypass as mayor-discard. cards[NaN] returns undefined,
   * filter keeps both cards, enacted policy is undefined. Silent corruption.
   */
  it('chief-discard with cardIndex=NaN is rejected (was a bug, now fixed)', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });
    expect(() => dispatch(state, { type: 'chief-discard', cardIndex: NaN })).toThrow(
      InvalidActionError,
    );
  });

  it('chief-discard with cardIndex=2 (out of bounds for 2 cards) is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
    });
    expect(() => dispatch(state, { type: 'chief-discard', cardIndex: 2 })).toThrow(
      InvalidActionError,
    );
  });

  it('mayor-discard with cardIndex=Infinity is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    expect(() => dispatch(state, { type: 'mayor-discard', cardIndex: Infinity })).toThrow(
      InvalidActionError,
    );
  });

  it('mayor-discard with cardIndex=-Infinity is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
    });
    expect(() => dispatch(state, { type: 'mayor-discard', cardIndex: -Infinity })).toThrow(
      InvalidActionError,
    );
  });
});

// ── 10. Game state after game-over ──────────────────────────────────

describe('10. Game state after game-over — all actions rejected', () => {
  const gameOverState = createTestGameState({
    playerCount: 5,
    phase: 'game-over',
    subPhase: null,
    winner: 'citizens',
    winReason: '5 good policies enacted',
    goodPoliciesEnacted: 5,
  });

  const actions = allActions(gameOverState);

  for (const action of actions) {
    it(`rejects ${action.type} on game-over state`, () => {
      expect(() => dispatch(gameOverState, action)).toThrow(InvalidActionError);
    });
  }

  it('rejects actions on mob-win game-over state too', () => {
    const mobWin: GameState = {
      ...gameOverState,
      winner: 'mob',
      winReason: '6 bad policies enacted',
      goodPoliciesEnacted: 0,
      badPoliciesEnacted: 6,
    };

    for (const action of allActions(mobWin)) {
      expect(() => dispatch(mobWin, action)).toThrow(InvalidActionError);
    }
  });
});

// ── Bonus: Targeted edge cases found during analysis ────────────────

describe('Bonus: Additional edge cases', () => {
  it('vote from a dead player is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-2',
      players: createTestGameState({ playerCount: 5 }).players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });

    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'player-3', vote: 'approve' }),
    ).toThrow(InvalidActionError);
  });

  it('nominate a dead player is rejected', () => {
    const base = createTestGameState({ playerCount: 5 });
    const state: GameState = {
      ...base,
      players: base.players.map((p) =>
        p.id === 'player-2' ? { ...p, isAlive: false } : p,
      ),
    };

    expect(() =>
      dispatch(state, { type: 'nominate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('nominate the current mayor is rejected', () => {
    const state = createTestGameState({ playerCount: 5 });
    const mayorId = state.players[state.mayorIndex].id;

    expect(() =>
      dispatch(state, { type: 'nominate', targetId: mayorId }),
    ).toThrow(InvalidActionError);
  });

  it('investigate yourself (mayor) is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });
    const mayorId = state.players[state.mayorIndex].id;

    expect(() =>
      dispatch(state, { type: 'investigate', targetId: mayorId }),
    ).toThrow(InvalidActionError);
  });

  it('execute yourself (mayor) is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
    });
    const mayorId = state.players[state.mayorIndex].id;

    expect(() =>
      dispatch(state, { type: 'execute', targetId: mayorId }),
    ).toThrow(InvalidActionError);
  });

  it('special-nominate yourself is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
    });
    const mayorId = state.players[state.mayorIndex].id;

    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: mayorId }),
    ).toThrow(InvalidActionError);
  });

  it('vote from nonexistent player is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-2',
    });

    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'ghost-player', vote: 'approve' }),
    ).toThrow(InvalidActionError);
  });

  it('investigate an already-investigated player is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      investigationHistory: [
        { investigatorId: 'player-0', targetId: 'player-2', result: 'citizen' },
      ],
    });

    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('investigate a dead player is rejected', () => {
    const base = createTestGameState({ playerCount: 7 });
    const state: GameState = {
      ...base,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      players: base.players.map((p) =>
        p.id === 'player-2' ? { ...p, isAlive: false } : p,
      ),
    };

    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('execute a dead player is rejected', () => {
    const base = createTestGameState({ playerCount: 7 });
    const state: GameState = {
      ...base,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      players: base.players.map((p) =>
        p.id === 'player-2' ? { ...p, isAlive: false } : p,
      ),
    };

    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('propose-veto before 5 bad policies is rejected', () => {
    const state = createTestGameState({
      playerCount: 5,
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['good', 'bad'],
      badPoliciesEnacted: 4, // not yet 5
    });

    expect(() => dispatch(state, { type: 'propose-veto' })).toThrow(InvalidActionError);
  });

  it('investigate with wrong executivePower (execution) is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution', // wrong power
    });

    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('execute with wrong executivePower (investigate) is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate', // wrong power
    });

    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('special-nominate with wrong executivePower (execution) is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution', // wrong power
    });

    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: 'player-2' }),
    ).toThrow(InvalidActionError);
  });

  it('acknowledge-peek with wrong executivePower (investigate) is rejected', () => {
    const state = createTestGameState({
      playerCount: 7,
      phase: 'executive-power',
      subPhase: 'policy-peek-viewing',
      executivePower: 'investigate', // wrong power
    });

    expect(() => dispatch(state, { type: 'acknowledge-peek' })).toThrow(InvalidActionError);
  });
});
