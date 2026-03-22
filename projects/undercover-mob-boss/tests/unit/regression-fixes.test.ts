/**
 * Regression tests for bugs fixed in the 2026-03-19 session.
 *
 * Bug 1: Dead player could become mayor via special election
 * Bug 2: NaN/non-integer card index bypassed validation
 *
 * Each test targets the exact fix and verifies it holds under stress.
 */
import { describe, it, expect } from 'vitest';
import { advanceMayor, dispatch, InvalidActionError } from '../../src/server/game/phases';
import { createTestGameState } from '../helpers/game-state-factory';
import type { GameState, Player } from '../../src/shared/types';

// ── Helper: build players array with specific dead patterns ────────

function makePlayers(count: number, deadIndices: number[]): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    role: i === 0 ? 'mob-boss' as const : i < Math.floor(count / 2) ? 'mob-soldier' as const : 'citizen' as const,
    isAlive: !deadIndices.includes(i),
    isMayor: false,
    isChief: false,
    wasLastMayor: false,
    wasLastChief: false,
    knownAllies: [],
  }));
}

// ══════════════════════════════════════════════════════════════════════
// BUG 1: Dead player mayor via special election
// Fix: advanceMayor now checks isAlive for specialNominatedMayorId
// ══════════════════════════════════════════════════════════════════════

describe('Bug 1: Dead player cannot become mayor via special election', () => {
  it('falls through to next alive player when special-nominated player is dead', () => {
    // player-3 was special-nominated but died before transition
    const players = makePlayers(7, [3]);
    players[0].isMayor = true;
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-3',
      players,
    });

    const next = advanceMayor(state);

    // Must NOT be player-3 (dead)
    expect(next.players[next.mayorIndex].isAlive).toBe(true);
    expect(next.mayorIndex).not.toBe(3);
    // Should fall through to next alive after index 3, which is player-4
    expect(next.mayorIndex).toBe(4);
    expect(next.players[4].isMayor).toBe(true);
  });

  it('sets resumeMayorIndex correctly even when special-nominated player is dead', () => {
    const players = makePlayers(7, [3]);
    players[0].isMayor = true;
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-3',
      players,
    });

    const next = advanceMayor(state);

    // resumeMayorIndex should still be set to the caller's position (0)
    // so the round after this one resumes from 0+1=1
    expect(next.resumeMayorIndex).toBe(0);
  });

  it('skips multiple consecutive dead players after dead special-nominated player', () => {
    // player-3 was special-nominated but dead; player-4 and player-5 also dead
    const players = makePlayers(7, [3, 4, 5]);
    players[0].isMayor = true;
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-3',
      players,
    });

    const next = advanceMayor(state);

    expect(next.players[next.mayorIndex].isAlive).toBe(true);
    // Next alive after 3 is player-6
    expect(next.mayorIndex).toBe(6);
    expect(next.players[6].isMayor).toBe(true);
  });

  it('wraps around when dead special-nominated player is near end of list', () => {
    // player-6 was special-nominated but dead; no alive players after 6 except wrapping
    // players 5 and 6 dead, so we wrap to player-1 (player-0 is alive but
    // the fallback starts from index 6+1=0, and 0 is alive)
    const players = makePlayers(7, [5, 6]);
    players[2].isMayor = true; // mayor is player-2
    const state = createTestGameState({
      mayorIndex: 2,
      specialNominatedMayorId: 'player-6',
      players,
    });

    const next = advanceMayor(state);

    expect(next.players[next.mayorIndex].isAlive).toBe(true);
    // After index 6, wraps to 0 which is alive
    expect(next.mayorIndex).toBe(0);
  });

  it('handles special-nominated player that does not exist (id mismatch) gracefully', () => {
    const players = makePlayers(5, []);
    players[0].isMayor = true;
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-999', // does not exist
      players,
    });

    const next = advanceMayor(state);

    // Should not crash; falls through to normal rotation from mayorIndex
    expect(next.players[next.mayorIndex].isAlive).toBe(true);
    // fallback = mayorIndex (0), then 0+1=1
    expect(next.mayorIndex).toBe(1);
  });

  it('alive special-nominated player still works correctly (no regression on happy path)', () => {
    const players = makePlayers(7, []);
    players[0].isMayor = true;
    const state = createTestGameState({
      mayorIndex: 0,
      specialNominatedMayorId: 'player-3',
      players,
    });

    const next = advanceMayor(state);

    expect(next.mayorIndex).toBe(3);
    expect(next.players[3].isMayor).toBe(true);
    expect(next.resumeMayorIndex).toBe(0);
    expect(next.specialNominatedMayorId).toBeNull();
  });

  it('resume after dead-special-election still works (chained rounds)', () => {
    // Round 1: special-nominated dead player fell through to player-4
    // Round 2 (resume): should resume from caller (0) + 1 = player-1
    const players = makePlayers(7, [3]);
    players[4].isMayor = true;
    const stateAfterSpecial = createTestGameState({
      mayorIndex: 4,
      resumeMayorIndex: 0,
      specialNominatedMayorId: null, // cleared after the special round
      players,
    });

    const next = advanceMayor(stateAfterSpecial);

    expect(next.mayorIndex).toBe(1);
    expect(next.players[1].isMayor).toBe(true);
    expect(next.resumeMayorIndex).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════
// BUG 2: NaN card index bypassed validation
// Fix: validateAction now uses Number.isInteger() for cardIndex checks
// ══════════════════════════════════════════════════════════════════════

describe('Bug 2: NaN and non-integer card indices are rejected', () => {
  // ── mayor-discard ──────────────────────────────────────────────

  describe('mayor-discard validation', () => {
    function mayorDiscardState(): GameState {
      return createTestGameState({
        phase: 'policy-session',
        subPhase: 'policy-mayor-discard',
        mayorCards: ['good', 'bad', 'bad'],
      });
    }

    it('rejects NaN', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: NaN }),
      ).toThrow(InvalidActionError);
    });

    it('rejects Infinity', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: Infinity }),
      ).toThrow(InvalidActionError);
    });

    it('rejects -Infinity', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: -Infinity }),
      ).toThrow(InvalidActionError);
    });

    it('rejects 1.5 (non-integer float)', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: 1.5 }),
      ).toThrow(InvalidActionError);
    });

    it('rejects -0.5 (negative float)', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: -0.5 }),
      ).toThrow(InvalidActionError);
    });

    it('rejects undefined coerced to number', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: undefined as any }),
      ).toThrow(InvalidActionError);
    });

    it('rejects null coerced to number', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: null as any }),
      ).toThrow(InvalidActionError);
    });

    it('rejects negative integer', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: -1 }),
      ).toThrow(InvalidActionError);
    });

    it('rejects out-of-bounds index (3 for 3-card hand)', () => {
      expect(() =>
        dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: 3 }),
      ).toThrow(InvalidActionError);
    });

    it('accepts valid index 0', () => {
      const next = dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: 0 });
      expect(next.subPhase).toBe('policy-chief-discard');
      expect(next.chiefCards).toHaveLength(2);
    });

    it('accepts valid index 1', () => {
      const next = dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: 1 });
      expect(next.subPhase).toBe('policy-chief-discard');
      expect(next.chiefCards).toHaveLength(2);
    });

    it('accepts valid index 2', () => {
      const next = dispatch(mayorDiscardState(), { type: 'mayor-discard', cardIndex: 2 });
      expect(next.subPhase).toBe('policy-chief-discard');
      expect(next.chiefCards).toHaveLength(2);
    });
  });

  // ── chief-discard ──────────────────────────────────────────────

  describe('chief-discard validation', () => {
    function chiefDiscardState(): GameState {
      return createTestGameState({
        phase: 'policy-session',
        subPhase: 'policy-chief-discard',
        chiefCards: ['good', 'bad'],
      });
    }

    it('rejects NaN', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: NaN }),
      ).toThrow(InvalidActionError);
    });

    it('rejects Infinity', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: Infinity }),
      ).toThrow(InvalidActionError);
    });

    it('rejects -Infinity', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: -Infinity }),
      ).toThrow(InvalidActionError);
    });

    it('rejects 1.5 (non-integer float)', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: 1.5 }),
      ).toThrow(InvalidActionError);
    });

    it('rejects -0.5 (negative float)', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: -0.5 }),
      ).toThrow(InvalidActionError);
    });

    it('rejects undefined coerced to number', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: undefined as any }),
      ).toThrow(InvalidActionError);
    });

    it('rejects null coerced to number', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: null as any }),
      ).toThrow(InvalidActionError);
    });

    it('rejects negative integer', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: -1 }),
      ).toThrow(InvalidActionError);
    });

    it('rejects out-of-bounds index (2 for 2-card hand)', () => {
      expect(() =>
        dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: 2 }),
      ).toThrow(InvalidActionError);
    });

    it('accepts valid index 0', () => {
      const next = dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: 0 });
      // Discarded 'good', enacted 'bad'
      expect(next.badPoliciesEnacted).toBe(1);
    });

    it('accepts valid index 1', () => {
      const next = dispatch(chiefDiscardState(), { type: 'chief-discard', cardIndex: 1 });
      // Discarded 'bad', enacted 'good'
      expect(next.goodPoliciesEnacted).toBe(1);
    });
  });
});
