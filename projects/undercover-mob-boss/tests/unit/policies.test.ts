import { describe, it, expect } from 'vitest';
import { shuffle, createDeck, drawCards, checkReshuffle, pickReshuffleThreshold } from '../../src/server/game/policies';
import { mulberry32 } from '../../src/server/game/rng';
import { createTestGameState } from '../helpers/game-state-factory';

describe('shuffle', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(5);
  });

  it('does not mutate input', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('is deterministic with seeded RNG', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = shuffle(arr, mulberry32(42));
    const b = shuffle(arr, mulberry32(42));
    expect(a).toEqual(b);
  });
});

describe('createDeck', () => {
  it('has 6 good and 11 bad cards (17 total)', () => {
    const deck = createDeck(mulberry32(42));
    expect(deck).toHaveLength(17);
    expect(deck.filter((c) => c === 'good')).toHaveLength(6);
    expect(deck.filter((c) => c === 'bad')).toHaveLength(11);
  });

  it('is deterministic with seeded RNG', () => {
    const a = createDeck(mulberry32(99));
    const b = createDeck(mulberry32(99));
    expect(a).toEqual(b);
  });
});

describe('drawCards', () => {
  it('draws correct number of cards', () => {
    const deck = ['good', 'bad', 'bad', 'good', 'bad'] as const;
    const [drawn, remaining] = drawCards(deck, 3);
    expect(drawn).toEqual(['good', 'bad', 'bad']);
    expect(remaining).toEqual(['good', 'bad']);
  });

  it('throws when drawing more cards than available', () => {
    const deck = ['good', 'bad'] as const;
    expect(() => drawCards(deck, 3)).toThrow('Cannot draw 3 cards from deck of 2');
  });

  it('does not mutate input', () => {
    const deck = ['good', 'bad', 'bad'] as const;
    const copy = [...deck];
    drawCards(deck, 2);
    expect(deck).toEqual(copy);
  });
});

describe('pickReshuffleThreshold', () => {
  it('returns values between 3 and 7 inclusive', () => {
    const rng = mulberry32(42);
    const values = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = pickReshuffleThreshold(rng);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      values.add(v);
    }
    // With 1000 samples, we should hit all 5 values
    expect(values.size).toBe(5);
  });
});

describe('checkReshuffle', () => {
  it('does not reshuffle when deck is above threshold', () => {
    const state = createTestGameState({ reshuffleThreshold: 5 });
    // Default deck has 17 cards, well above threshold
    const result = checkReshuffle(state, mulberry32(42));
    expect(result).toBe(state); // Same reference, no change
  });

  it('reshuffles when deck is below threshold', () => {
    const state = createTestGameState({
      policyDeck: ['good', 'bad'],
      policyDiscard: ['bad', 'bad', 'good', 'bad', 'bad', 'good', 'bad', 'bad'],
      reshuffleThreshold: 5,
    });

    const result = checkReshuffle(state, mulberry32(42));
    expect(result.policyDeck).toHaveLength(10); // 2 + 8 = 10
    expect(result.policyDiscard).toEqual([]);
    expect(result.events).toContainEqual({ type: 'deck-reshuffled' });
    // New threshold picked
    expect(result.reshuffleThreshold).toBeGreaterThanOrEqual(3);
    expect(result.reshuffleThreshold).toBeLessThanOrEqual(7);
  });

  it('throws if post-reshuffle deck has < 3 cards', () => {
    const state = createTestGameState({
      policyDeck: ['good'],
      policyDiscard: ['bad'],
      reshuffleThreshold: 5,
    });

    expect(() => checkReshuffle(state, mulberry32(42))).toThrow('invariant violated');
  });
});
