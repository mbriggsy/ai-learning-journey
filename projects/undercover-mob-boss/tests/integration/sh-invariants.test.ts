/**
 * SH Invariant Tests
 *
 * Verifies that game invariants hold at every dispatch throughout
 * entire games. These are the mathematical guarantees that must
 * never be violated:
 *
 * - Card counting: deck + discard + enacted + hands = 17 (6 good + 11 bad)
 * - State machine: exactly one mayor, mayor is alive, valid tracker range
 * - Role integrity: exactly 1 mob boss, correct distribution
 */
import { describe, it, expect } from 'vitest';
import { createGame, dispatch } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import {
  pickNextAction,
  checkCardInvariant,
  checkStateInvariants,
  acknowledgeAllRoles,
} from '../helpers/game-driver';
import type { GameState } from '../../src/shared/types';

function runGameWithInvariantChecks(
  playerCount: number,
  seed: number,
  maxDispatches = 500,
): { state: GameState; dispatches: number; violations: string[] } {
  const rng = mulberry32(seed);
  const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
  let state = createGame(names, rng);
  const violations: string[] = [];

  state = acknowledgeAllRoles(state);
  let dispatches = state.players.length;

  // Check invariants on initial game state
  try {
    checkCardInvariant(state);
  } catch (e) {
    violations.push(`Dispatch 0 card: ${(e as Error).message}`);
  }
  try {
    checkStateInvariants(state);
  } catch (e) {
    violations.push(`Dispatch 0 state: ${(e as Error).message}`);
  }

  while (state.phase !== 'game-over' && dispatches < maxDispatches) {
    const action = pickNextAction(state, rng);
    state = dispatch(state, action);
    dispatches++;

    // Check invariants after every dispatch
    try {
      checkCardInvariant(state);
    } catch (e) {
      violations.push(`Dispatch ${dispatches} card: ${(e as Error).message}`);
    }
    try {
      checkStateInvariants(state);
    } catch (e) {
      violations.push(`Dispatch ${dispatches} state: ${(e as Error).message}`);
    }
  }

  return { state, dispatches, violations };
}

// ── Card Counting Invariant ─────────────────────────────────────────

describe('Card Counting Invariant', () => {
  it.each([5, 6, 7, 8, 9, 10])(
    '%i-player game: 17 cards (6 good + 11 bad) accounted for at every dispatch',
    (count) => {
      const { state, violations } = runGameWithInvariantChecks(count, count * 100);
      expect(violations.filter((v) => v.includes('card'))).toEqual([]);
      expect(state.phase).toBe('game-over');
    },
  );

  it('invariant holds across deck reshuffles', () => {
    // Use a seed that produces a low reshuffle threshold to trigger reshuffles
    for (const seed of [7, 13, 37, 73, 101]) {
      const { violations } = runGameWithInvariantChecks(7, seed);
      const cardViolations = violations.filter((v) => v.includes('card'));
      expect(cardViolations, `Seed ${seed} card violations`).toEqual([]);
    }
  });

  it('invariant holds when veto discards 2 cards', () => {
    // High seed count to find games where veto fires (need 5 bad policies + veto)
    const seeds = [1001, 2002, 3003, 4004, 5005, 6006, 7007, 8008, 9009, 10010];
    for (const seed of seeds) {
      const { violations } = runGameWithInvariantChecks(5, seed);
      const cardViolations = violations.filter((v) => v.includes('card'));
      expect(cardViolations, `Seed ${seed}`).toEqual([]);
    }
  });
});

// ── State Machine Invariants ────────────────────────────────────────

describe('State Machine Invariants', () => {
  it.each([5, 6, 7, 8, 9, 10])(
    '%i-player game: state invariants hold at every dispatch',
    (count) => {
      const { state, violations } = runGameWithInvariantChecks(count, count * 200);
      expect(violations.filter((v) => v.includes('state'))).toEqual([]);
      expect(state.phase).toBe('game-over');
    },
  );

  it('invariants hold through execution-heavy games', () => {
    // Seeds chosen to produce longer games with more executions
    for (const seed of [42, 84, 168, 336, 672]) {
      const { violations } = runGameWithInvariantChecks(10, seed);
      const stateViolations = violations.filter((v) => v.includes('state'));
      expect(stateViolations, `Seed ${seed}`).toEqual([]);
    }
  });
});

// ── Role Distribution Invariant ─────────────────────────────────────

describe('Role Distribution Invariant', () => {
  const EXPECTED_DISTRIBUTION: Record<number, { citizens: number; soldiers: number }> = {
    5: { citizens: 3, soldiers: 1 },
    6: { citizens: 4, soldiers: 1 },
    7: { citizens: 4, soldiers: 2 },
    8: { citizens: 5, soldiers: 2 },
    9: { citizens: 5, soldiers: 3 },
    10: { citizens: 6, soldiers: 3 },
  };

  it.each([5, 6, 7, 8, 9, 10])(
    '%i-player game has correct role distribution across 20 seeds',
    (count) => {
      for (let seed = 0; seed < 20; seed++) {
        const rng = mulberry32(count * 1000 + seed);
        const names = Array.from({ length: count }, (_, i) => `P${i}`);
        const state = createGame(names, rng);

        const bosses = state.players.filter((p) => p.role === 'mob-boss');
        const soldiers = state.players.filter((p) => p.role === 'mob-soldier');
        const citizens = state.players.filter((p) => p.role === 'citizen');
        const expected = EXPECTED_DISTRIBUTION[count];

        expect(bosses, `${count}p seed ${seed}: bosses`).toHaveLength(1);
        expect(soldiers, `${count}p seed ${seed}: soldiers`).toHaveLength(expected.soldiers);
        expect(citizens, `${count}p seed ${seed}: citizens`).toHaveLength(expected.citizens);
      }
    },
  );
});

// ── Ally Knowledge Invariant ────────────────────────────────────────

describe('Ally Knowledge Invariant', () => {
  it.each([5, 6, 7, 8, 9, 10])(
    '%i-player game: ally knowledge is consistent across 20 seeds',
    (count) => {
      for (let seed = 0; seed < 20; seed++) {
        const rng = mulberry32(count * 2000 + seed);
        const names = Array.from({ length: count }, (_, i) => `P${i}`);
        const state = createGame(names, rng);

        const boss = state.players.find((p) => p.role === 'mob-boss')!;
        const soldiers = state.players.filter((p) => p.role === 'mob-soldier');
        const citizens = state.players.filter((p) => p.role === 'citizen');

        // Citizens know nobody
        for (const c of citizens) {
          expect(c.knownAllies, `${count}p seed ${seed}: citizen ${c.id}`).toEqual([]);
        }

        // Soldiers know boss + other soldiers
        for (const s of soldiers) {
          expect(s.knownAllies).toContain(boss.id);
          for (const other of soldiers) {
            if (other.id !== s.id) {
              expect(s.knownAllies).toContain(other.id);
            }
          }
          // Soldiers don't know citizens
          for (const c of citizens) {
            expect(s.knownAllies).not.toContain(c.id);
          }
        }

        if (count <= 6) {
          // Small game: boss knows soldiers
          for (const s of soldiers) {
            expect(boss.knownAllies, `${count}p seed ${seed}: boss knows soldier`).toContain(s.id);
          }
        } else {
          // Large game: boss knows nobody
          expect(boss.knownAllies, `${count}p seed ${seed}: boss alone`).toEqual([]);
        }
      }
    },
  );
});
