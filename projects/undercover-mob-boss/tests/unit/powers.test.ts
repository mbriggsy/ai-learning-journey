import { describe, it, expect } from 'vitest';
import { getExecutivePower, resolveInvestigation, resolveExecution, resolveSpecialNomination } from '../../src/server/game/powers';
import { createTestGameState, createTestPlayer } from '../helpers/game-state-factory';

describe('getExecutivePower', () => {
  it.each([
    // 5-6 players (small bracket)
    { players: 5, bad: 1, expected: null },
    { players: 5, bad: 2, expected: null },
    { players: 5, bad: 3, expected: 'policy-peek' },
    { players: 5, bad: 4, expected: 'execution' },
    { players: 5, bad: 5, expected: 'execution' },
    { players: 6, bad: 1, expected: null },
    { players: 6, bad: 3, expected: 'policy-peek' },
    // 7-8 players (medium bracket)
    { players: 7, bad: 1, expected: null },
    { players: 7, bad: 2, expected: 'investigate' },
    { players: 7, bad: 3, expected: 'special-nomination' },
    { players: 7, bad: 4, expected: 'execution' },
    { players: 7, bad: 5, expected: 'execution' },
    { players: 8, bad: 2, expected: 'investigate' },
    // 9-10 players (large bracket)
    { players: 9, bad: 1, expected: 'investigate' },
    { players: 9, bad: 2, expected: 'investigate' },
    { players: 9, bad: 3, expected: 'special-nomination' },
    { players: 9, bad: 4, expected: 'execution' },
    { players: 9, bad: 5, expected: 'execution' },
    { players: 10, bad: 1, expected: 'investigate' },
  ])(
    '$players players, $bad bad policies → $expected',
    ({ players, bad, expected }) => {
      expect(getExecutivePower(players, bad)).toBe(expected);
    },
  );

  it('returns null for bad policy count not in board', () => {
    expect(getExecutivePower(5, 0)).toBeNull();
    expect(getExecutivePower(5, 6)).toBeNull();
  });
});

describe('resolveInvestigation', () => {
  it('returns citizen for citizen', () => {
    expect(resolveInvestigation(createTestPlayer({ role: 'citizen' }))).toBe('citizen');
  });

  it('returns mob for mob-soldier', () => {
    expect(resolveInvestigation(createTestPlayer({ role: 'mob-soldier' }))).toBe('mob');
  });

  it('returns mob for mob-boss', () => {
    expect(resolveInvestigation(createTestPlayer({ role: 'mob-boss' }))).toBe('mob');
  });
});

describe('resolveExecution', () => {
  it('marks target as dead', () => {
    const state = createTestGameState();
    const result = resolveExecution(state, 'player-3');
    const target = result.players.find((p) => p.id === 'player-3')!;
    expect(target.isAlive).toBe(false);
  });

  it('emits player-executed event', () => {
    const state = createTestGameState();
    const result = resolveExecution(state, 'player-3');
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'player-executed', playerId: 'player-3' }),
    );
  });

  it('triggers citizen win when mob boss is executed', () => {
    const state = createTestGameState(); // player-0 is mob boss
    const result = resolveExecution(state, 'player-0');
    expect(result.phase).toBe('game-over');
    expect(result.winner).toBe('citizens');
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'game-over', winner: 'citizens' }),
    );
  });

  it('throws for already dead player', () => {
    const state = createTestGameState({
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(() => resolveExecution(state, 'player-3')).toThrow();
  });

  it('throws for nonexistent player', () => {
    const state = createTestGameState();
    expect(() => resolveExecution(state, 'nonexistent')).toThrow();
  });
});

describe('resolveSpecialNomination', () => {
  it('sets specialNominatedMayorId', () => {
    const state = createTestGameState();
    const result = resolveSpecialNomination(state, 'player-3');
    expect(result.specialNominatedMayorId).toBe('player-3');
  });

  it('emits special-mayor-chosen event', () => {
    const state = createTestGameState();
    const result = resolveSpecialNomination(state, 'player-3');
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'special-mayor-chosen', playerId: 'player-3' }),
    );
  });

  it('throws for dead player', () => {
    const state = createTestGameState({
      players: createTestGameState().players.map((p) =>
        p.id === 'player-3' ? { ...p, isAlive: false } : p,
      ),
    });
    expect(() => resolveSpecialNomination(state, 'player-3')).toThrow();
  });
});
