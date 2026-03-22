/**
 * Game Driver -- helpers for driving game state through specific paths.
 *
 * Used by scenario tests, invariant tests, and stress tests.
 * Provides both directed helpers (force specific outcomes) and
 * a random bot for stress testing.
 */
import { dispatch, getEligibleNominees, createGame, DISPLAY_SUB_PHASES } from '../../src/server/game/phases';
import { mulberry32 } from '../../src/server/game/rng';
import type { GameState, GameAction, PolicyType } from '../../src/shared/types';

// ── Display State Helper ────────────────────────────────────────────

/**
 * If the state is in a display subPhase, dispatch advance-display
 * to move past it. This simulates the server timer auto-advancing.
 * Handles chained display states (e.g., election-result -> auto-enact).
 */
export function advanceDisplayIfNeeded(state: GameState): GameState {
  let s = state;
  while (s.subPhase && DISPLAY_SUB_PHASES.has(s.subPhase) && s.phase !== 'game-over') {
    s = dispatch(s, { type: 'advance-display' });
  }
  return s;
}

// ── Directed Helpers ────────────────────────────────────────────────

/** All players acknowledge their roles -> transitions to nomination. */
export function acknowledgeAllRoles(state: GameState): GameState {
  let s = state;
  for (const p of s.players) {
    s = dispatch(s, { type: 'acknowledge-role', playerId: p.id });
  }
  return s;
}

/** Nominate a chief and have all alive players approve -> policy-session. */
export function passElection(state: GameState, chiefId?: string): GameState {
  const eligible = getEligibleNominees(state);
  const target = chiefId && eligible.includes(chiefId) ? chiefId : eligible[0];
  let s = dispatch(state, { type: 'nominate', targetId: target });
  for (const p of s.players.filter((p) => p.isAlive)) {
    s = dispatch(s, { type: 'vote', playerId: p.id, vote: 'approve' });
  }
  // Advance past election-result display
  s = advanceDisplayIfNeeded(s);
  return s;
}

/** Nominate and have all alive players block -> tracker advances. */
export function failElection(state: GameState, nomineeId?: string): GameState {
  const eligible = getEligibleNominees(state);
  const target = nomineeId && eligible.includes(nomineeId) ? nomineeId : eligible[0];
  let s = dispatch(state, { type: 'nominate', targetId: target });
  for (const p of s.players.filter((p) => p.isAlive)) {
    s = dispatch(s, { type: 'vote', playerId: p.id, vote: 'block' });
  }
  // Advance past election-result display (and possibly auto-enact display)
  s = advanceDisplayIfNeeded(s);
  return s;
}

/**
 * During policy-mayor-discard, discard to steer toward the preferred policy type.
 * If mayor has both types, discard the unwanted one. Otherwise discards index 0.
 */
export function mayorDiscard(state: GameState, preferred: PolicyType): GameState {
  const cards = state.mayorCards!;
  // Find a card that is NOT the preferred type and discard it
  const discardIndex = cards.findIndex((c) => c !== preferred);
  return dispatch(state, { type: 'mayor-discard', cardIndex: discardIndex >= 0 ? discardIndex : 0 });
}

/**
 * During policy-chief-discard, discard to enact the preferred policy type.
 * Chief has 2 cards. If both match preferred, either works. If split, discard the other.
 */
export function chiefDiscard(state: GameState, preferred: PolicyType): GameState {
  const cards = state.chiefCards!;
  // Discard the card that is NOT preferred
  const discardIndex = cards.findIndex((c) => c !== preferred);
  let s = dispatch(state, { type: 'chief-discard', cardIndex: discardIndex >= 0 ? discardIndex : 0 });
  // Advance past policy-enact display
  s = advanceDisplayIfNeeded(s);
  return s;
}

/**
 * Play a full policy session (mayor-discard + chief-discard) steering toward preferred type.
 * State must be in policy-mayor-discard or policy-chief-discard.
 */
export function enactPolicy(state: GameState, preferred: PolicyType): GameState {
  let s = state;
  if (s.subPhase === 'policy-mayor-discard') {
    s = mayorDiscard(s, preferred);
  }
  if (s.subPhase === 'policy-chief-discard') {
    s = chiefDiscard(s, preferred);
  }
  return s;
}

/**
 * Play one complete round: nominate -> approve -> policy session.
 * Returns state after policy enactment (may be in nomination, executive-power, or game-over).
 */
export function playFullRound(
  state: GameState,
  preferred: PolicyType,
  chiefId?: string,
): GameState {
  let s = passElection(state, chiefId);
  // Check if game ended on election (mob boss elected at 3+ bad)
  if (s.phase === 'game-over') return s;
  return enactPolicy(s, preferred);
}

// ── Random Bot (for stress testing) ─────────────────────────────────

/**
 * Pick a valid action for the current state (deterministic bot).
 * Drives a game to completion with simple heuristics.
 * Extracted from full-game.test.ts and enhanced.
 *
 * Display subPhases are handled with advance-display.
 */
export function pickNextAction(state: GameState, rng: () => number): GameAction {
  switch (state.subPhase) {
    case 'role-reveal-waiting': {
      const unacked = state.players.find(
        (p) => !state.acknowledgedPlayerIds.includes(p.id),
      )!;
      return { type: 'acknowledge-role', playerId: unacked.id };
    }

    case 'nomination-pending': {
      const eligible = getEligibleNominees(state);
      const idx = Math.floor(rng() * eligible.length);
      return { type: 'nominate', targetId: eligible[idx] };
    }

    case 'election-voting': {
      const unvoted = state.players.filter(
        (p) => p.isAlive && !state.votes[p.id],
      );
      return {
        type: 'vote',
        playerId: unvoted[0].id,
        vote: rng() > 0.35 ? 'approve' : 'block',
      };
    }

    // Display subPhases -- auto-advance
    case 'election-result':
    case 'policy-enact':
    case 'auto-enact':
    case 'policy-veto-propose':
      return { type: 'advance-display' };

    case 'policy-mayor-discard':
      return { type: 'mayor-discard', cardIndex: Math.floor(rng() * 3) };

    case 'policy-chief-discard': {
      if (state.badPoliciesEnacted >= 5 && !state.vetoProposed && rng() > 0.7) {
        return { type: 'propose-veto' };
      }
      return { type: 'chief-discard', cardIndex: Math.floor(rng() * 2) };
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
          const targets = alivePlayers.filter(
            (p) =>
              p.id !== mayor.id &&
              !state.investigationHistory.some((r) => r.targetId === p.id),
          );
          const idx = Math.floor(rng() * targets.length);
          return { type: 'investigate', targetId: targets[idx].id };
        }
        case 'special-nomination': {
          const targets = alivePlayers.filter((p) => p.id !== mayor.id);
          const idx = Math.floor(rng() * targets.length);
          return { type: 'special-nominate', targetId: targets[idx].id };
        }
        case 'execution': {
          const targets = alivePlayers.filter((p) => p.id !== mayor.id);
          const idx = Math.floor(rng() * targets.length);
          return { type: 'execute', targetId: targets[idx].id };
        }
        default:
          throw new Error(`Unknown power: ${state.executivePower}`);
      }
    }

    default:
      throw new Error(`No bot logic for subPhase: ${state.subPhase}`);
  }
}

/**
 * Play a game from start to game-over using the random bot.
 * Returns the final state.
 */
export function playRandomGame(
  playerCount: number,
  seed: number,
  options?: {
    maxDispatches?: number;
    onDispatch?: (state: GameState, action: GameAction, dispatchNum: number) => void;
  },
): GameState {
  const rng = mulberry32(seed);
  const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
  let state = createGame(names, rng);
  const max = options?.maxDispatches ?? 500;
  let count = 0;

  while (state.phase !== 'game-over' && count < max) {
    const action = pickNextAction(state, rng);
    options?.onDispatch?.(state, action, count);
    state = dispatch(state, action);
    count++;
  }

  return state;
}

// ── Invariant Checkers ──────────────────────────────────────────────

/**
 * Verify the 17-card invariant: deck + discard + enacted + hands = 17.
 * Also verifies good/bad split: 6 good + 11 bad.
 * Throws descriptive error if violated.
 */
export function checkCardInvariant(state: GameState): void {
  const deckGood = state.policyDeck.filter((c) => c === 'good').length;
  const deckBad = state.policyDeck.filter((c) => c === 'bad').length;
  const discardGood = state.policyDiscard.filter((c) => c === 'good').length;
  const discardBad = state.policyDiscard.filter((c) => c === 'bad').length;
  const handGood =
    (state.mayorCards?.filter((c) => c === 'good').length ?? 0) +
    (state.chiefCards?.filter((c) => c === 'good').length ?? 0);
  const handBad =
    (state.mayorCards?.filter((c) => c === 'bad').length ?? 0) +
    (state.chiefCards?.filter((c) => c === 'bad').length ?? 0);

  const totalGood = deckGood + discardGood + state.goodPoliciesEnacted + handGood;
  const totalBad = deckBad + discardBad + state.badPoliciesEnacted + handBad;
  const total = totalGood + totalBad;

  if (totalGood !== 6) {
    throw new Error(
      `Good card invariant violated: ${totalGood} (expected 6). ` +
        `deck=${deckGood} discard=${discardGood} enacted=${state.goodPoliciesEnacted} hand=${handGood}`,
    );
  }
  if (totalBad !== 11) {
    throw new Error(
      `Bad card invariant violated: ${totalBad} (expected 11). ` +
        `deck=${deckBad} discard=${discardBad} enacted=${state.badPoliciesEnacted} hand=${handBad}`,
    );
  }
  if (total !== 17) {
    throw new Error(`Total card invariant violated: ${total} (expected 17)`);
  }
}

/**
 * Verify state invariants that must hold at every point in the game.
 * Throws descriptive error if violated.
 */
export function checkStateInvariants(state: GameState): void {
  if (state.phase === 'lobby') return;

  // Exactly one mayor
  const mayors = state.players.filter((p) => p.isMayor);
  if (mayors.length !== 1) {
    throw new Error(`Expected exactly 1 mayor, found ${mayors.length}`);
  }

  // Mayor must be alive
  const mayor = mayors[0];
  if (!mayor.isAlive) {
    throw new Error(`Mayor ${mayor.id} is dead`);
  }

  // mayorIndex matches
  if (state.players[state.mayorIndex]?.id !== mayor.id) {
    throw new Error(
      `mayorIndex ${state.mayorIndex} doesn't match mayor ${mayor.id}`,
    );
  }

  // Winner is null unless game-over
  if (state.phase !== 'game-over' && state.winner !== null) {
    throw new Error(`Winner set to ${state.winner} but phase is ${state.phase}`);
  }
  if (state.phase === 'game-over' && state.winner === null) {
    // Allowed for abandoned games
    if (!state.winReason?.includes('abandoned')) {
      throw new Error(`Game over but winner is null (reason: ${state.winReason})`);
    }
  }

  // Election tracker in range
  if (state.electionTracker < 0 || state.electionTracker > 3) {
    throw new Error(`Election tracker out of range: ${state.electionTracker}`);
  }

  // Policy counts in range
  if (state.goodPoliciesEnacted < 0 || state.goodPoliciesEnacted > 5) {
    throw new Error(`Good policies out of range: ${state.goodPoliciesEnacted}`);
  }
  if (state.badPoliciesEnacted < 0 || state.badPoliciesEnacted > 6) {
    throw new Error(`Bad policies out of range: ${state.badPoliciesEnacted}`);
  }

  // Exactly 1 mob boss exists
  const bosses = state.players.filter((p) => p.role === 'mob-boss');
  if (bosses.length !== 1) {
    throw new Error(`Expected 1 mob boss, found ${bosses.length}`);
  }
}
