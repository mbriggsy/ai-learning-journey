/**
 * SH Rules Gap Tests
 *
 * These tests fill coverage gaps identified by mapping every discrete
 * Secret Hitler rule against the existing test suite. Each test is
 * tagged with the rule ID it pins.
 */
import { describe, it, expect } from 'vitest';
import { createGame, dispatch, DISPLAY_SUB_PHASES } from '../../src/server/game/phases';
import { advanceDisplayIfNeeded } from '../helpers/game-driver';
import { mulberry32 } from '../../src/server/game/rng';
import { createTestGameState } from '../helpers/game-state-factory';

// ── R9: Citizens have empty knownAllies ─────────────────────────────

describe('Rule Gap: Citizen Knowledge', () => {
  it.each([5, 6, 7, 8, 9, 10])(
    '[R9] Citizens have empty knownAllies at %i players',
    (count) => {
      const rng = mulberry32(count * 31);
      const state = createGame(
        Array.from({ length: count }, (_, i) => `P${i}`),
        rng,
      );
      const citizens = state.players.filter((p) => p.role === 'citizen');
      expect(citizens.length).toBeGreaterThan(0);
      for (const c of citizens) {
        expect(c.knownAllies, `Citizen ${c.name} should know nobody`).toEqual([]);
      }
    },
  );
});

// ── R27: Dead players cannot vote ───────────────────────────────────

describe('Rule Gap: Dead Player Restrictions', () => {
  it('[R27] Dead player vote is rejected', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-4' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(() =>
      dispatch(state, { type: 'vote', playerId: 'player-4', vote: 'approve' }),
    ).toThrow(/Dead players cannot vote/);
  });

  it('[R69] Dead player cannot be investigated', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-3' }),
    ).toThrow(/not valid target/);
  });

  it('[R80] Dead player cannot be executed', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-3' }),
    ).toThrow(/not valid target/);
  });

  it('[R84] Dead player cannot be special-nominated', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: 'player-3' }),
    ).toThrow(/not valid target/);
  });

  it('[R84] Dead player cannot be nominated as chief', () => {
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
});

// ── R39: Tracker resets on any policy enactment ─────────────────────

describe('Rule Gap: Election Tracker Reset', () => {
  it('[R39] Tracker resets to 0 after successful policy enactment', () => {
    // Start with tracker at 1 (one failed election already happened)
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
      electionTracker: 1,
      policyDeck: ['good', 'bad', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad'],
    });
    // Pass the election
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);
    expect(state.electionTracker).toBe(0);
    expect(state.phase).toBe('policy-session');

    // Enact a policy
    state = dispatch(state, { type: 'mayor-discard', cardIndex: 0 });
    state = dispatch(state, { type: 'chief-discard', cardIndex: 0 });
    state = advanceDisplayIfNeeded(state);

    // Tracker still 0 after enactment
    expect(state.electionTracker).toBe(0);
  });
});

// ── R43: Discards go to policyDiscard ───────────────────────────────

describe('Rule Gap: Discard Handling', () => {
  it('[R43] Mayor discard goes to policyDiscard pile', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
      policyDiscard: [],
    });
    const next = dispatch(state, { type: 'mayor-discard', cardIndex: 0 });
    expect(next.policyDiscard).toContain('good');
    expect(next.policyDiscard).toHaveLength(1);
  });

  it('[R43] Chief discard goes to policyDiscard pile', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      policyDiscard: ['bad'], // mayor already discarded one
    });
    const next = dispatch(state, { type: 'chief-discard', cardIndex: 0 });
    // Chief discarded 'bad' (index 0), enacted 'good'
    expect(next.policyDiscard).toHaveLength(2);
    expect(next.policyDiscard[1]).toBe('bad');
  });

  it('[R43] Both discards accumulate across rounds', () => {
    // Round 1: mayor discards 1, chief discards 1 = 2 in discard
    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-mayor-discard',
      mayorCards: ['good', 'bad', 'bad'],
      policyDiscard: [],
      policyDeck: ['good', 'bad', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'bad'],
      reshuffleThreshold: 3,
    });
    state = dispatch(state, { type: 'mayor-discard', cardIndex: 0 }); // discard good
    state = dispatch(state, { type: 'chief-discard', cardIndex: 0 }); // discard bad, enact bad
    expect(state.policyDiscard).toHaveLength(2);
  });
});

// ── R51: Veto can only be proposed once per session ─────────────────

describe('Rule Gap: Veto Once Per Session', () => {
  it('[R51] Second veto proposal in same session is rejected', () => {
    // Veto was proposed and rejected → vetoProposed is true
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      vetoProposed: true, // already proposed and rejected
    });
    expect(() => dispatch(state, { type: 'propose-veto' })).toThrow(
      /already proposed/,
    );
  });

  it('[R51] After veto rejection, vetoProposed stays true', () => {
    let state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-veto-response',
      badPoliciesEnacted: 5,
      chiefCards: ['bad', 'bad'],
      vetoProposed: true,
    });
    state = dispatch(state, { type: 'veto-response', approved: false });
    expect(state.vetoProposed).toBe(true);
    // Chief is back to discard phase but cannot propose again
    expect(state.subPhase).toBe('policy-chief-discard');
    expect(() => dispatch(state, { type: 'propose-veto' })).toThrow(
      /already proposed/,
    );
  });
});

// ── R6: 5-6 player soldiers know each other AND boss ────────────────

describe('Rule Gap: Small Game Ally Knowledge', () => {
  it.each([5, 6])(
    '[R6] At %i players, soldiers know each other + boss',
    (count) => {
      const rng = mulberry32(count * 41);
      const state = createGame(
        Array.from({ length: count }, (_, i) => `P${i}`),
        rng,
      );
      const boss = state.players.find((p) => p.role === 'mob-boss')!;
      const soldiers = state.players.filter((p) => p.role === 'mob-soldier');

      for (const s of soldiers) {
        // Soldier knows the boss
        expect(s.knownAllies, `Soldier ${s.name} should know boss`).toContain(boss.id);
        // Soldier knows other soldiers
        for (const other of soldiers) {
          if (other.id !== s.id) {
            expect(s.knownAllies).toContain(other.id);
          }
        }
      }

      // Boss knows all soldiers at 5-6 players
      for (const s of soldiers) {
        expect(boss.knownAllies, `Boss should know soldier ${s.name}`).toContain(s.id);
      }
    },
  );
});
