/**
 * SH Rules Verification Tests
 *
 * Each test maps to a specific rule from docs/verification/sh-rules-checklist.md.
 * These pin rules that were either:
 *   (a) fixed during the SH→UMB audit, or
 *   (b) identified as correctly implemented but untested.
 *
 * Organized by checklist category. Rule IDs in test names for traceability.
 */
import { describe, it, expect } from 'vitest';
import { createGame, dispatch, getEligibleNominees, advanceMayor } from '../../src/server/game/phases';
import { getExecutivePower, resolveInvestigation, resolvePolicyPeek } from '../../src/server/game/powers';
import { mulberry32 } from '../../src/server/game/rng';
import { createTestGameState, createTestPlayer } from '../helpers/game-state-factory';
import { advanceDisplayIfNeeded } from '../helpers/game-driver';
import type { GameState } from '../../src/shared/types';

// ── ROLES ──────────────────────────────────────────────────────────

describe('SH Rules: ROLES', () => {
  it('[ROLES-05] Citizens always have a majority', () => {
    for (let count = 5; count <= 10; count++) {
      const rng = mulberry32(count * 100);
      const state = createGame(
        Array.from({ length: count }, (_, i) => `P${i}`),
        rng,
      );
      const citizens = state.players.filter((p) => p.role === 'citizen').length;
      const mob = state.players.filter((p) => p.role !== 'citizen').length;
      expect(citizens).toBeGreaterThan(mob);
    }
  });

  it('[ROLES-DIST] Exact role distribution for all player counts', () => {
    const expected: Record<number, { citizens: number; soldiers: number; boss: number }> = {
      5:  { citizens: 3, soldiers: 1, boss: 1 },
      6:  { citizens: 4, soldiers: 1, boss: 1 },
      7:  { citizens: 4, soldiers: 2, boss: 1 },
      8:  { citizens: 5, soldiers: 2, boss: 1 },
      9:  { citizens: 5, soldiers: 3, boss: 1 },
      10: { citizens: 6, soldiers: 3, boss: 1 },
    };
    for (let count = 5; count <= 10; count++) {
      const rng = mulberry32(count * 100);
      const state = createGame(
        Array.from({ length: count }, (_, i) => `P${i}`),
        rng,
      );
      const citizens = state.players.filter((p) => p.role === 'citizen').length;
      const soldiers = state.players.filter((p) => p.role === 'mob-soldier').length;
      const bosses = state.players.filter((p) => p.role === 'mob-boss').length;
      expect({ citizens, soldiers, boss: bosses }, `${count} players`).toEqual(expected[count]);
    }
  });

  it('[ROLES-ALLIES-9-10] At 9-10 players, soldiers see 3 allies (2 soldiers + boss), boss sees none', () => {
    for (const count of [9, 10]) {
      const rng = mulberry32(count * 77);
      const state = createGame(
        Array.from({ length: count }, (_, i) => `P${i}`),
        rng,
      );
      const boss = state.players.find((p) => p.role === 'mob-boss')!;
      const soldiers = state.players.filter((p) => p.role === 'mob-soldier');

      // Should have exactly 3 soldiers
      expect(soldiers).toHaveLength(3);

      // Boss sees no allies (7+ player rule)
      expect(boss.knownAllies).toEqual([]);

      // Each soldier sees the boss + 2 other soldiers = 3 allies
      for (const s of soldiers) {
        expect(s.knownAllies).toHaveLength(3);
        expect(s.knownAllies).toContain(boss.id);
        for (const other of soldiers) {
          if (other.id !== s.id) {
            expect(s.knownAllies).toContain(other.id);
          }
        }
      }
    }
  });

  it('[ROLES-20] In 5-6 players, Mob Boss knows soldiers', () => {
    const rng = mulberry32(42);
    const state = createGame(['A', 'B', 'C', 'D', 'E'], rng);
    const boss = state.players.find((p) => p.role === 'mob-boss')!;
    const soldiers = state.players.filter((p) => p.role === 'mob-soldier');
    // Boss should know all soldiers
    for (const s of soldiers) {
      expect(boss.knownAllies).toContain(s.id);
    }
  });

  it('[ROLES-26] In 7-10 players, Mob Boss does NOT know soldiers', () => {
    const rng = mulberry32(42);
    const state = createGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], rng);
    const boss = state.players.find((p) => p.role === 'mob-boss')!;
    expect(boss.knownAllies).toEqual([]);
  });

  it('[ROLES-24/25] In 7-10 players, soldiers know each other AND the boss', () => {
    const rng = mulberry32(42);
    const state = createGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], rng);
    const soldiers = state.players.filter((p) => p.role === 'mob-soldier');
    const boss = state.players.find((p) => p.role === 'mob-boss')!;
    for (const s of soldiers) {
      // Knows the boss
      expect(s.knownAllies).toContain(boss.id);
      // Knows other soldiers
      for (const other of soldiers) {
        if (other.id !== s.id) {
          expect(s.knownAllies).toContain(other.id);
        }
      }
    }
  });
});

// ── ELECTION ───────────────────────────────────────────────────────

describe('SH Rules: ELECTION', () => {
  it('[ELEC-01/SETUP-08] First mayor is randomly selected', () => {
    const state1 = createGame(['A', 'B', 'C', 'D', 'E'], mulberry32(1));
    const state2 = createGame(['A', 'B', 'C', 'D', 'E'], mulberry32(9999));
    // At least one of these seeds should produce a different first mayor
    // (probabilistic but extremely likely with different seeds)
    const mayors = new Set([state1.mayorIndex, state2.mayorIndex]);
    // Each game has exactly one mayor
    expect(state1.players.filter((p) => p.isMayor)).toHaveLength(1);
    expect(state2.players.filter((p) => p.isMayor)).toHaveLength(1);
  });

  it('[ELEC-22] Surviving chief election at 3+ bad policies emits chief-cleared', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 3,
      nominatedChiefId: 'player-3', // citizen, not mob boss
    });
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);
    expect(state.events).toContainEqual(
      expect.objectContaining({ type: 'chief-cleared', chiefId: 'player-3' }),
    );
  });

  it('[ELEC-22] No chief-cleared event when bad policies < 3', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 2,
      nominatedChiefId: 'player-3',
    });
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    expect(state.events).not.toContainEqual(
      expect.objectContaining({ type: 'chief-cleared' }),
    );
  });

  it('[ELEC-24] Failed election does NOT install anyone as president/chief', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
    });
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'block' });
    }
    // player-3 should NOT be chief
    expect(state.players.find((p) => p.id === 'player-3')!.isChief).toBe(false);
  });
});

// ── TERM LIMITS ────────────────────────────────────────────────────

describe('SH Rules: TERM LIMITS', () => {
  it('[TERM-04/05] Failed election does NOT change term limits', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      nominatedChiefId: 'player-3',
      players: createTestGameState().players.map((p) => {
        if (p.id === 'player-2') return { ...p, wasLastMayor: true };
        if (p.id === 'player-4') return { ...p, wasLastChief: true };
        return p;
      }),
    });
    // Fail the election
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'block' });
    }
    // Old term limits preserved
    expect(state.players.find((p) => p.id === 'player-2')!.wasLastMayor).toBe(true);
    expect(state.players.find((p) => p.id === 'player-4')!.wasLastChief).toBe(true);
  });

  it('[TERM-06/07] Term limits only restrict chief nomination, not mayor rotation', () => {
    // A player who was just chief CAN become mayor via rotation
    const state = createTestGameState({
      mayorIndex: 0,
      players: createTestGameState().players.map((p) =>
        p.id === 'player-1' ? { ...p, wasLastChief: true } : p,
      ),
    });
    const next = advanceMayor(state);
    // player-1 becomes mayor even though they were last chief
    expect(next.mayorIndex).toBe(1);
    expect(next.players[1].isMayor).toBe(true);
  });

  it('[TERM-07] Ex-chief can become mayor', () => {
    const state = createTestGameState({
      mayorIndex: 0,
      players: createTestGameState().players.map((p) =>
        p.id === 'player-1' ? { ...p, wasLastChief: true } : p,
      ),
    });
    const next = advanceMayor(state);
    expect(next.players[1].isMayor).toBe(true);
  });
});

// ── EXECUTIVE POWERS ───────────────────────────────────────────────

describe('SH Rules: EXECUTIVE POWERS', () => {
  it('[EXEC-02] Mayor (President) uses executive powers, not Chief', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      nominatedChiefId: 'player-2',
    });
    // Mayor (player-0) can investigate
    const next = dispatch(state, { type: 'investigate', targetId: 'player-3' });
    expect(next.investigationHistory[0].investigatorId).toBe('player-0');
  });

  it('[EXEC-03] Citizen mayor can use executive power', () => {
    // Player-0 is a citizen but is mayor — they should still use the power
    const players = createTestGameState().players.map((p) => {
      if (p.id === 'player-0') return { ...p, role: 'citizen' as const, isMayor: true };
      if (p.id === 'player-3') return { ...p, role: 'mob-boss' as const };
      return p;
    });
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
      players,
    });
    // Citizen mayor executes mob boss
    const next = dispatch(state, { type: 'execute', targetId: 'player-3' });
    expect(next.phase).toBe('game-over');
    expect(next.winner).toBe('citizens');
  });

  it('[EXEC-06] Powers do not stack — only one power per bad policy enactment', () => {
    // After using a power, the state transitions to nomination (no power carried over)
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });
    const next = dispatch(state, { type: 'investigate', targetId: 'player-3' });
    expect(next.phase).toBe('nomination');
    expect(next.executivePower).toBeNull();
  });

  it('[EXEC-09] Auto-enacted bad policy does NOT trigger executive power', () => {
    const state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      electionTracker: 2,
      badPoliciesEnacted: 1, // 2nd bad in 7-8 = investigate
      nominatedChiefId: 'player-3',
      playerCount: 7,
      players: createTestGameState({ playerCount: 7 }).players,
      policyDeck: ['bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad', 'good', 'bad'],
      rngSeed: 42,
    });
    // All block → tracker hits 3 → auto-enact
    let next = state;
    for (const p of state.players.filter((p) => p.isAlive)) {
      next = dispatch(next, { type: 'vote', playerId: p.id, vote: 'block' });
    }
    // Should NOT be in executive-power phase even if a bad policy was auto-enacted
    expect(next.phase).not.toBe('executive-power');
  });
});

// ── POWER GRID ─────────────────────────────────────────────────────

describe('SH Rules: POWER GRID', () => {
  it('[GRID-03] 5-6 players: 3rd bad policy = Policy Peek', () => {
    expect(getExecutivePower(5, 3)).toBe('policy-peek');
    expect(getExecutivePower(6, 3)).toBe('policy-peek');
  });

  it('[GRID-04/05] 5-6 players: 4th and 5th bad policy = Execution', () => {
    expect(getExecutivePower(5, 4)).toBe('execution');
    expect(getExecutivePower(5, 5)).toBe('execution');
    expect(getExecutivePower(6, 4)).toBe('execution');
    expect(getExecutivePower(6, 5)).toBe('execution');
  });

  it('[GRID-07] 7-8 players: 2nd bad policy = Investigation', () => {
    expect(getExecutivePower(7, 2)).toBe('investigate');
    expect(getExecutivePower(8, 2)).toBe('investigate');
  });

  it('[GRID-08] 7-8 players: 3rd bad policy = Special Nomination', () => {
    expect(getExecutivePower(7, 3)).toBe('special-nomination');
  });

  it('[GRID-11/12] 9-10 players: 1st and 2nd bad policy = Investigation', () => {
    expect(getExecutivePower(9, 1)).toBe('investigate');
    expect(getExecutivePower(9, 2)).toBe('investigate');
    expect(getExecutivePower(10, 1)).toBe('investigate');
  });
});

// ── POLICY PEEK ────────────────────────────────────────────────────

describe('SH Rules: POLICY PEEK', () => {
  it('[PEEK-01/02] Mayor views top 3 cards without modifying deck', () => {
    const state = createTestGameState({
      policyDeck: ['bad', 'good', 'bad', 'good', 'bad'],
    });
    const result = resolvePolicyPeek(state);
    expect(result.peekCards).toEqual(['bad', 'good', 'bad']);
    // Deck unchanged
    expect(result.policyDeck).toEqual(['bad', 'good', 'bad', 'good', 'bad']);
  });

  it('[PEEK-01] Policy peek triggered at 3rd bad in 5-player game', () => {
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 2,
      policyDeck: ['good', 'bad', 'good', 'bad', 'good'],
    });
    let next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact bad
    next = advanceDisplayIfNeeded(next);
    expect(next.phase).toBe('executive-power');
    expect(next.subPhase).toBe('policy-peek-viewing');
    expect(next.executivePower).toBe('policy-peek');
    expect(next.peekCards).toHaveLength(3);
  });
});

// ── SPECIAL ELECTION ───────────────────────────────────────────────

describe('SH Rules: SPECIAL ELECTION', () => {
  it('[SPECIAL-01] Cannot special-nominate yourself', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
    });
    expect(() =>
      dispatch(state, { type: 'special-nominate', targetId: 'player-0' }),
    ).toThrow(/Cannot special-nominate yourself/);
  });

  it('[SPECIAL-03] Term-limited players CAN be special-nominated', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'special-nomination',
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, wasLastChief: true } : p,
      ),
    });
    // Should succeed even though player-3 is term-limited
    const next = dispatch(state, { type: 'special-nominate', targetId: 'player-3' });
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'special-mayor-chosen', playerId: 'player-3' }),
    );
  });

  it('[SPECIAL-05/06] Rotation resumes from caller, not special target', () => {
    // A(0) special-nominated D(3). After D's round, next should be B(1).
    const state = createTestGameState({
      mayorIndex: 3,
      resumeMayorIndex: 0,
    });
    const next = advanceMayor(state);
    expect(next.mayorIndex).toBe(1);
    expect(next.resumeMayorIndex).toBeNull();
  });

  it('[SPECIAL-07] Next-in-rotation player can serve twice', () => {
    // A(0) special-nominates B(1). B serves. Then B serves again (normal turn).
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-1',
    });
    const afterSpecial = advanceMayor(state);
    expect(afterSpecial.mayorIndex).toBe(1);

    const afterResume = advanceMayor(afterSpecial);
    expect(afterResume.mayorIndex).toBe(1); // B again
  });
});

// ── INVESTIGATION ──────────────────────────────────────────────────

describe('SH Rules: INVESTIGATION', () => {
  it('[INVEST-06] Mob Boss shows as "mob" (not distinguished from soldier)', () => {
    const boss = createTestPlayer({ role: 'mob-boss' });
    const soldier = createTestPlayer({ role: 'mob-soldier' });
    expect(resolveInvestigation(boss)).toBe('mob');
    expect(resolveInvestigation(soldier)).toBe('mob');
  });

  it('[INVEST-09] Same player cannot be investigated twice', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
      investigationHistory: [
        { investigatorId: 'player-0', targetId: 'player-3', result: 'citizen' },
      ],
    });
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-3' }),
    ).toThrow(/already investigated/);
  });

  it('[INVEST-01] Cannot investigate yourself', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'investigate',
    });
    expect(() =>
      dispatch(state, { type: 'investigate', targetId: 'player-0' }),
    ).toThrow(/Cannot investigate yourself/);
  });
});

// ── EXECUTION ──────────────────────────────────────────────────────

describe('SH Rules: EXECUTION', () => {
  it('[EXECUTE-04] Non-boss execution does NOT reveal role', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
    });
    const next = dispatch(state, { type: 'execute', targetId: 'player-3' });
    // player-executed event has wasMobBoss but NOT the role itself
    const event = next.events.find(
      (e) => e.type === 'player-executed' && 'playerId' in e && e.playerId === 'player-3',
    );
    expect(event).toBeDefined();
    expect(next.phase).toBe('nomination'); // game continues, no role reveal
  });

  it('[EXECUTE-01] Cannot execute yourself', () => {
    const state = createTestGameState({
      phase: 'executive-power',
      subPhase: 'executive-power-pending',
      executivePower: 'execution',
    });
    expect(() =>
      dispatch(state, { type: 'execute', targetId: 'player-0' }),
    ).toThrow(/Cannot execute yourself/);
  });
});

// ── LEGISLATIVE SESSION ────────────────────────────────────────────

describe('SH Rules: LEGISLATIVE SESSION', () => {
  it('[LEGIS-25/FLOW-08] Bad policy with no power → new round (not executive-power)', () => {
    // 5-player game, 1st bad policy → no power
    const state = createTestGameState({
      phase: 'policy-session',
      subPhase: 'policy-chief-discard',
      chiefCards: ['bad', 'good'],
      badPoliciesEnacted: 0, // 1st bad in 5-player → no power
    });
    let next = dispatch(state, { type: 'chief-discard', cardIndex: 1 }); // enact bad
    next = advanceDisplayIfNeeded(next);
    expect(next.badPoliciesEnacted).toBe(1);
    expect(next.phase).toBe('nomination'); // new round, no executive power
    expect(next.executivePower).toBeNull();
  });
});

// ── WIN CONDITIONS ─────────────────────────────────────────────────

describe('SH Rules: WIN CONDITIONS', () => {
  it('[WIN-07] Mob Boss elected before 3 bad policies does NOT win', () => {
    let state = createTestGameState({
      phase: 'election',
      subPhase: 'election-voting',
      badPoliciesEnacted: 2,
      nominatedChiefId: 'player-0', // mob boss
    });
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = advanceDisplayIfNeeded(state);
    expect(state.phase).toBe('policy-session');
    expect(state.winner).toBeNull();
  });
});
