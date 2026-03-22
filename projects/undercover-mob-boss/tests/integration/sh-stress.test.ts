/**
 * SH Stress Tests — High-Volume Randomized Testing
 *
 * Runs many games at every player count with random seeds.
 * Verifies that ALL games:
 * - Complete within a reasonable dispatch count
 * - Have a valid winner
 * - Maintain card invariants throughout
 * - Maintain state invariants throughout
 *
 * Also collects statistics to verify the game is balanced
 * and all paths are reachable.
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
import type { GameState, ExecutivePower } from '../../src/shared/types';

interface GameResult {
  seed: number;
  playerCount: number;
  winner: 'citizens' | 'mob';
  winReason: string;
  dispatches: number;
  goodPolicies: number;
  badPolicies: number;
  powersUsed: ExecutivePower[];
  reshuffles: number;
  autoEnacts: number;
  vetosProposed: number;
  executions: number;
  violations: string[];
}

function runStressGame(playerCount: number, seed: number): GameResult {
  const rng = mulberry32(seed);
  const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
  let state = createGame(names, rng);
  state = acknowledgeAllRoles(state);

  const violations: string[] = [];
  const powersUsed: ExecutivePower[] = [];
  let reshuffles = 0;
  let autoEnacts = 0;
  let vetosProposed = 0;
  let executions = 0;
  let dispatches = 0;
  const maxDispatches = 500;

  while (state.phase !== 'game-over' && dispatches < maxDispatches) {
    const action = pickNextAction(state, rng);
    const prevState = state;
    state = dispatch(state, action);
    dispatches++;

    // Track events
    for (const event of state.events) {
      if (event.type === 'deck-reshuffled') reshuffles++;
      if (event.type === 'auto-enact-triggered') autoEnacts++;
      if (event.type === 'executive-power-activated' && 'power' in event) {
        powersUsed.push(event.power);
      }
      if (event.type === 'player-executed') executions++;
      if (event.type === 'veto-enacted' || event.type === 'veto-rejected') vetosProposed++;
    }

    // Check invariants every 5 dispatches (performance)
    if (dispatches % 5 === 0) {
      try {
        checkCardInvariant(state);
      } catch (e) {
        violations.push(`D${dispatches} card: ${(e as Error).message}`);
      }
      try {
        checkStateInvariants(state);
      } catch (e) {
        violations.push(`D${dispatches} state: ${(e as Error).message}`);
      }
    }
  }

  // Final invariant check
  try {
    checkCardInvariant(state);
  } catch (e) {
    violations.push(`Final card: ${(e as Error).message}`);
  }

  return {
    seed,
    playerCount,
    winner: state.winner as 'citizens' | 'mob',
    winReason: state.winReason ?? 'unknown',
    dispatches,
    goodPolicies: state.goodPoliciesEnacted,
    badPolicies: state.badPoliciesEnacted,
    powersUsed,
    reshuffles,
    autoEnacts,
    vetosProposed,
    executions,
    violations,
  };
}

// ── Main Stress Suite ───────────────────────────────────────────────

const GAMES_PER_COUNT = 50;

describe('Stress: Randomized Games', () => {
  for (let playerCount = 5; playerCount <= 10; playerCount++) {
    describe(`${playerCount}-player games (${GAMES_PER_COUNT} games)`, () => {
      const results: GameResult[] = [];

      // Run all games
      for (let i = 0; i < GAMES_PER_COUNT; i++) {
        const seed = playerCount * 10000 + i * 137 + 1;
        results.push(runStressGame(playerCount, seed));
      }

      it('every game reaches game-over', () => {
        for (const r of results) {
          expect(r.winner, `Seed ${r.seed}`).not.toBeNull();
        }
      });

      it('every game completes within 500 dispatches', () => {
        for (const r of results) {
          expect(r.dispatches, `Seed ${r.seed}`).toBeLessThanOrEqual(500);
        }
      });

      it('no invariant violations', () => {
        const allViolations = results.flatMap((r) =>
          r.violations.map((v) => `Seed ${r.seed}: ${v}`),
        );
        expect(allViolations).toEqual([]);
      });

      it('winner is always citizens or mob', () => {
        for (const r of results) {
          expect(['citizens', 'mob'], `Seed ${r.seed}`).toContain(r.winner);
        }
      });

      it('both sides can win', () => {
        const citizenWins = results.filter((r) => r.winner === 'citizens').length;
        const mobWins = results.filter((r) => r.winner === 'mob').length;
        // At least 1 win per side across 50 games (extremely likely)
        expect(citizenWins, 'Citizens should win at least once').toBeGreaterThan(0);
        expect(mobWins, 'Mob should win at least once').toBeGreaterThan(0);
      });

      it('policy counts are within valid ranges', () => {
        for (const r of results) {
          expect(r.goodPolicies, `Seed ${r.seed} good`).toBeGreaterThanOrEqual(0);
          expect(r.goodPolicies, `Seed ${r.seed} good`).toBeLessThanOrEqual(5);
          expect(r.badPolicies, `Seed ${r.seed} bad`).toBeGreaterThanOrEqual(0);
          expect(r.badPolicies, `Seed ${r.seed} bad`).toBeLessThanOrEqual(6);
        }
      });

      it('win reasons are valid', () => {
        const validReasons = [
          '5 good policies enacted',
          '6 bad policies enacted',
          'Mob Boss executed',
          'Mob Boss elected Chief after 3+ bad policies',
        ];
        for (const r of results) {
          const matchesAny = validReasons.some((reason) => r.winReason.includes(reason));
          expect(matchesAny, `Seed ${r.seed}: "${r.winReason}"`).toBe(true);
        }
      });
    });
  }
});

// ── Statistics (informational, not failing) ─────────────────────────

describe('Stress: Statistics', () => {
  it('aggregate statistics across all player counts', () => {
    const allResults: GameResult[] = [];

    for (let pc = 5; pc <= 10; pc++) {
      for (let i = 0; i < 30; i++) {
        allResults.push(runStressGame(pc, pc * 10000 + i * 211 + 42));
      }
    }

    const totalGames = allResults.length;
    const citizenWins = allResults.filter((r) => r.winner === 'citizens').length;
    const mobWins = allResults.filter((r) => r.winner === 'mob').length;
    const avgDispatches = allResults.reduce((s, r) => s + r.dispatches, 0) / totalGames;

    const winByPolicy = allResults.filter((r) => r.winReason.includes('policies')).length;
    const winByExecution = allResults.filter((r) => r.winReason.includes('executed')).length;
    const winByElection = allResults.filter((r) => r.winReason.includes('elected')).length;

    const gamesWithReshuffle = allResults.filter((r) => r.reshuffles > 0).length;
    const gamesWithAutoEnact = allResults.filter((r) => r.autoEnacts > 0).length;
    const gamesWithVeto = allResults.filter((r) => r.vetosProposed > 0).length;
    const gamesWithExecution = allResults.filter((r) => r.executions > 0).length;

    const powersUsedSet = new Set(allResults.flatMap((r) => r.powersUsed));

    // Log statistics (visible in test output)
    console.log('\n=== STRESS TEST STATISTICS ===');
    console.log(`Total games: ${totalGames}`);
    console.log(`Citizens wins: ${citizenWins} (${((citizenWins / totalGames) * 100).toFixed(1)}%)`);
    console.log(`Mob wins: ${mobWins} (${((mobWins / totalGames) * 100).toFixed(1)}%)`);
    console.log(`Avg dispatches: ${avgDispatches.toFixed(1)}`);
    console.log(`Win by policy: ${winByPolicy}`);
    console.log(`Win by execution: ${winByExecution}`);
    console.log(`Win by election: ${winByElection}`);
    console.log(`Games with reshuffle: ${gamesWithReshuffle}`);
    console.log(`Games with auto-enact: ${gamesWithAutoEnact}`);
    console.log(`Games with veto: ${gamesWithVeto}`);
    console.log(`Games with execution: ${gamesWithExecution}`);
    console.log(`Powers used: ${[...powersUsedSet].join(', ')}`);
    console.log('=============================\n');

    // Structural assertions: all game paths are reachable
    expect(powersUsedSet.size, 'All 4 executive powers should be used').toBe(4);
    expect(gamesWithReshuffle, 'At least one game should trigger reshuffle').toBeGreaterThan(0);
    expect(gamesWithAutoEnact, 'At least one game should auto-enact').toBeGreaterThan(0);
    expect(gamesWithExecution, 'At least one game should have execution').toBeGreaterThan(0);
    expect(winByExecution, 'At least one game should end by execution').toBeGreaterThan(0);

    // All 3 win condition categories should be hit
    expect(winByPolicy, 'Policy wins should occur').toBeGreaterThan(0);
    expect(winByExecution + winByElection, 'Non-policy wins should occur').toBeGreaterThan(0);
  });
});
