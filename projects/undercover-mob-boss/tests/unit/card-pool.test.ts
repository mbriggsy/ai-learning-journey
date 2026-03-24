import { describe, it, expect } from 'vitest';
import { VIRTUOUS_POOL, CORRUPT_POOL } from '../../src/server/game/card-pool';
import { selectCardPool, createDeck, checkReshuffle } from '../../src/server/game/policies';
import { createGame, dispatch } from '../../src/server/game/phases';
import { createTestGameState, makeTestCard } from '../helpers/game-state-factory';

describe('Card Pool Definitions', () => {
  it('has 15+ Virtuous cards', () => {
    expect(VIRTUOUS_POOL.length).toBeGreaterThanOrEqual(15);
  });

  it('has 15+ Corrupt cards', () => {
    expect(CORRUPT_POOL.length).toBeGreaterThanOrEqual(15);
  });

  it('all Virtuous cards have type "good"', () => {
    for (const card of VIRTUOUS_POOL) {
      expect(card.type).toBe('good');
    }
  });

  it('all Corrupt cards have type "bad"', () => {
    for (const card of CORRUPT_POOL) {
      expect(card.type).toBe('bad');
    }
  });

  it('all cardIds are unique across both pools', () => {
    const allIds = [...VIRTUOUS_POOL, ...CORRUPT_POOL].map((c) => c.cardId);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('all card names are unique across both pools', () => {
    const allNames = [...VIRTUOUS_POOL, ...CORRUPT_POOL].map((c) => c.name);
    expect(new Set(allNames).size).toBe(allNames.length);
  });

  it('cardIds are kebab-case (no spaces, lowercase)', () => {
    for (const card of [...VIRTUOUS_POOL, ...CORRUPT_POOL]) {
      expect(card.cardId).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('selectCardPool', () => {
  it('selects exactly 6 Virtuous + 11 Corrupt = 17 cards', () => {
    const pool = selectCardPool(() => 0.5);
    expect(pool.length).toBe(17);
    expect(pool.filter((c) => c.type === 'good').length).toBe(6);
    expect(pool.filter((c) => c.type === 'bad').length).toBe(11);
  });

  it('no duplicate cardIds within a single game pool', () => {
    const pool = selectCardPool(() => 0.5);
    const ids = pool.map((c) => c.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('different RNG seeds produce different card selections', () => {
    // Use clearly different deterministic RNGs
    const pool1 = selectCardPool(() => 0.1);
    const pool2 = selectCardPool(() => 0.9);

    const ids1 = pool1.map((c) => c.cardId).sort();
    const ids2 = pool2.map((c) => c.cardId).sort();
    // RNG values of 0.1 vs 0.9 select from opposite ends of the shuffled pool
    expect(ids1).not.toEqual(ids2);
  });

  it('every selected card has type, cardId, and name', () => {
    const pool = selectCardPool(Math.random);
    for (const card of pool) {
      expect(card.type).toMatch(/^(good|bad)$/);
      expect(card.cardId).toBeTruthy();
      expect(card.name).toBeTruthy();
    }
  });
});

describe('Card Identity Through Game Flow', () => {
  it('card identity preserved through reshuffle', () => {
    // Create a state with a known small deck that will trigger reshuffle
    const cards = [makeTestCard('good'), makeTestCard('bad')];
    const discard = [
      makeTestCard('good'), makeTestCard('good'),
      makeTestCard('bad'), makeTestCard('bad'), makeTestCard('bad'),
    ];
    const state = createTestGameState({
      policyDeck: cards,
      policyDiscard: discard,
      reshuffleThreshold: 5, // deck.length (2) < threshold (5), will reshuffle
    });

    const reshuffled = checkReshuffle(state, () => 0.5);

    // All cards from deck + discard should be in the new deck
    expect(reshuffled.policyDeck.length).toBe(7);
    expect(reshuffled.policyDiscard.length).toBe(0);

    // Card identity (cardId) should survive the reshuffle
    const originalIds = [...cards, ...discard].map((c) => c.cardId).sort();
    const reshuffledIds = reshuffled.policyDeck.map((c) => c.cardId).sort();
    expect(reshuffledIds).toEqual(originalIds);
  });

  it('policyHistory accumulates across enacted policies', () => {
    const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
    let state = createGame(names, () => 0.42);
    expect(state.policyHistory).toEqual([]);

    // Acknowledge all roles
    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    // Nominate, vote, and enact a policy
    const mayor = state.players[state.mayorIndex];
    const eligible = state.players.filter(
      (p) => p.isAlive && p.id !== mayor.id && !p.wasLastCommissioner,
    );
    state = dispatch(state, { type: 'nominate', targetId: eligible[0].id });

    // All vote approve
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    // Advance past election result
    state = dispatch(state, { type: 'advance-display' });

    // Mayor discards card 0
    state = dispatch(state, { type: 'mayor-discard', cardIndex: 0 });

    // Commissioner discards card 0 (enacts card 1)
    state = dispatch(state, { type: 'commissioner-discard', cardIndex: 0 });

    // Should have 1 entry in policyHistory
    expect(state.policyHistory.length).toBe(1);
    expect(state.policyHistory[0].card.type).toMatch(/^(good|bad)$/);
    expect(state.policyHistory[0].card.cardId).toBeTruthy();
    expect(state.policyHistory[0].card.name).toBeTruthy();
    expect(state.policyHistory[0].autoEnacted).toBe(false);
    expect(state.policyHistory[0].round).toBeGreaterThan(0);
  });

  it('createDeck returns 17 PolicyCard objects', () => {
    const deck = createDeck(() => 0.5);
    expect(deck.length).toBe(17);
    for (const card of deck) {
      expect(card).toHaveProperty('type');
      expect(card).toHaveProperty('cardId');
      expect(card).toHaveProperty('name');
    }
    expect(deck.filter((c) => c.type === 'good').length).toBe(6);
    expect(deck.filter((c) => c.type === 'bad').length).toBe(11);
  });

  it('event carries both policy type and full card object', () => {
    const names = ['A', 'B', 'C', 'D', 'E'];
    let state = createGame(names, () => 0.42);

    // Fast-forward through role reveal
    for (const p of state.players) {
      state = dispatch(state, { type: 'acknowledge-role', playerId: p.id });
    }

    // Nominate and elect
    const mayor = state.players[state.mayorIndex];
    const eligible = state.players.filter(
      (p) => p.isAlive && p.id !== mayor.id && !p.wasLastCommissioner,
    );
    state = dispatch(state, { type: 'nominate', targetId: eligible[0].id });
    for (const p of state.players.filter((p) => p.isAlive)) {
      state = dispatch(state, { type: 'vote', playerId: p.id, vote: 'approve' });
    }
    state = dispatch(state, { type: 'advance-display' });

    // Enact a policy
    state = dispatch(state, { type: 'mayor-discard', cardIndex: 0 });
    state = dispatch(state, { type: 'commissioner-discard', cardIndex: 0 });

    // Find the policy-enacted event
    const enacted = state.events.find((e) => e.type === 'policy-enacted');
    expect(enacted).toBeDefined();
    if (enacted && enacted.type === 'policy-enacted') {
      // Has both legacy policy field AND new card field
      expect(enacted.policy).toMatch(/^(good|bad)$/);
      expect(enacted.card).toBeDefined();
      expect(enacted.card.type).toBe(enacted.policy);
      expect(enacted.card.cardId).toBeTruthy();
      expect(enacted.card.name).toBeTruthy();
    }
  });
});
