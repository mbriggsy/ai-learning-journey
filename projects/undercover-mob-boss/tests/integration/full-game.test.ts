import { describe, it, expect } from 'vitest';
import { createGame, dispatch, getEligibleNominees } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import type { GameState, GameAction } from '../../src/shared/types';

/**
 * Picks a valid action for the current state (deterministic bot).
 * Drives a game to completion with simple heuristics:
 * - Nominate first eligible player
 * - Vote approve/block based on RNG
 * - Discard first card
 * - Use powers on first valid target
 */
function pickNextAction(state: GameState, rng: () => number): GameAction {
  switch (state.subPhase) {
    case 'nomination-pending': {
      const eligible = getEligibleNominees(state);
      return { type: 'nominate', targetId: eligible[0] };
    }

    case 'election-voting': {
      const unvoted = state.players
        .filter((p) => p.isAlive && !state.votes[p.id]);
      return {
        type: 'vote',
        playerId: unvoted[0].id,
        vote: rng() > 0.4 ? 'approve' : 'block',
      };
    }

    // Display subPhases -- auto-advance
    case 'election-result':
    case 'policy-enact':
    case 'auto-enact':
    case 'policy-veto-propose':
      return { type: 'advance-display' };

    case 'policy-mayor-discard':
      return { type: 'mayor-discard', cardIndex: 0 };

    case 'policy-chief-discard': {
      // If veto is available and not yet proposed, sometimes propose
      if (state.badPoliciesEnacted >= 5 && !state.vetoProposed && rng() > 0.7) {
        return { type: 'propose-veto' };
      }
      return { type: 'chief-discard', cardIndex: 0 };
    }

    case 'policy-veto-response':
      return { type: 'veto-response', approved: rng() > 0.5 };

    case 'policy-peek-viewing':
      return { type: 'acknowledge-peek' };

    case 'executive-power-pending': {
      const alivePlayers = state.players.filter((p) => p.isAlive);
      const mayor = state.players[state.mayorIndex];

      switch (state.executivePower) {
        case 'investigate': {
          const target = alivePlayers.find(
            (p) => p.id !== mayor.id && !state.investigationHistory.some((r) => r.targetId === p.id),
          )!;
          return { type: 'investigate', targetId: target.id };
        }
        case 'special-nomination': {
          const target = alivePlayers.find((p) => p.id !== mayor.id)!;
          return { type: 'special-nominate', targetId: target.id };
        }
        case 'execution': {
          const target = alivePlayers.find((p) => p.id !== mayor.id)!;
          return { type: 'execute', targetId: target.id };
        }
        default:
          throw new Error(`Unknown power: ${state.executivePower}`);
      }
    }

    default:
      throw new Error(`No bot logic for subPhase: ${state.subPhase}`);
  }
}

describe('full game simulation', () => {
  it('5-player game reaches a win condition within 400 dispatches', () => {
    const rng = mulberry32(12345);
    let state = createGame(['Alice', 'Bob', 'Carol', 'Dave', 'Eve'], rng);

    // Acknowledge all roles
    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    let dispatchCount = state.players.length;
    const maxDispatches = 400;

    while (state.phase !== 'game-over' && dispatchCount < maxDispatches) {
      const action = pickNextAction(state, rng);
      state = dispatch(state, action);
      dispatchCount++;
    }

    expect(state.phase).toBe('game-over');
    expect(state.winner).not.toBeNull();
    expect(dispatchCount).toBeLessThanOrEqual(maxDispatches);
  });

  it('10-player game reaches a win condition within 600 dispatches', () => {
    const rng = mulberry32(67890);
    let state = createGame(
      ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'],
      rng,
    );

    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    let dispatchCount = state.players.length;
    const maxDispatches = 600;

    while (state.phase !== 'game-over' && dispatchCount < maxDispatches) {
      const action = pickNextAction(state, rng);
      state = dispatch(state, action);
      dispatchCount++;
    }

    expect(state.phase).toBe('game-over');
    expect(state.winner).not.toBeNull();
    expect(dispatchCount).toBeLessThanOrEqual(maxDispatches);
  });

  it('state is never mutated during full game', () => {
    const rng = mulberry32(42);
    let state = createGame(['A', 'B', 'C', 'D', 'E'], rng);

    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    const snapshots: GameState[] = [structuredClone(state)];
    let count = 0;
    const max = 400;

    while (state.phase !== 'game-over' && count < max) {
      const before = structuredClone(state);
      const action = pickNextAction(state, rng);
      state = dispatch(state, action);
      // Verify previous state wasn't mutated
      expect(before).toEqual(snapshots[snapshots.length - 1]);
      snapshots.push(structuredClone(state));
      count++;
    }
  });

  it.each([111, 222, 333, 444, 555])(
    'seed %i completes without errors',
    (seed) => {
      const rng = mulberry32(seed);
      let state = createGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], rng);

      for (const p of state.players) {
        state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
      }

      let count = 0;
      while (state.phase !== 'game-over' && count < 500) {
        const action = pickNextAction(state, rng);
        state = dispatch(state, action);
        count++;
      }

      expect(state.phase).toBe('game-over');
    },
  );
});
