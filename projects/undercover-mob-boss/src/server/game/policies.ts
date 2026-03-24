import type { PolicyCard, GameState } from '../../shared/types';
import { VIRTUOUS_POOL, CORRUPT_POOL } from './card-pool';

/**
 * Fisher-Yates (Durstenfeld) shuffle — O(n), in-place on a copy.
 * Accepts injectable RNG for deterministic testing.
 * Returns a new array — never mutates the input.
 */
export function shuffle<T>(array: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Random integer in range [min, max] inclusive.
 */
function randomInt(min: number, max: number, rng: () => number = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Pick a random reshuffle threshold between 3 and 7 inclusive.
 */
export function pickReshuffleThreshold(rng: () => number = Math.random): number {
  return randomInt(3, 7, rng);
}

/**
 * Select 6 Virtuous + 11 Corrupt cards from the pool.
 * Different combination each game — C(15,6) * C(15,11) = 6,831,825 possible pools.
 */
export function selectCardPool(rng: () => number = Math.random): PolicyCard[] {
  const virtuous = shuffle([...VIRTUOUS_POOL], rng).slice(0, 6);
  const corrupt = shuffle([...CORRUPT_POOL], rng).slice(0, 11);
  return [...virtuous, ...corrupt].map((def) => ({
    type: def.type,
    cardId: def.cardId,
    name: def.name,
  }));
}

/**
 * Create the initial policy deck: select from pools and shuffle.
 */
export function createDeck(rng: () => number = Math.random): PolicyCard[] {
  const cards = selectCardPool(rng);
  return shuffle(cards, rng);
}

/**
 * Draw N cards from the top of the deck.
 * Returns [drawnCards, remainingDeck] — never mutates input.
 */
export function drawCards(
  deck: readonly PolicyCard[],
  count: number,
): [PolicyCard[], PolicyCard[]] {
  if (deck.length < count) {
    throw new Error(`Cannot draw ${count} cards from deck of ${deck.length}`);
  }
  return [deck.slice(0, count), deck.slice(count)];
}

/**
 * Check if deck needs reshuffling before a draw.
 * If deck.length < reshuffleThreshold, combine discard into deck,
 * shuffle, and pick a new threshold.
 *
 * Returns a new state — never mutates input.
 * Pushes a 'deck-reshuffled' event if reshuffle occurred.
 */
export function checkReshuffle(
  state: GameState,
  rng: () => number = Math.random,
): GameState {
  if (state.policyDeck.length >= state.reshuffleThreshold) {
    return state;
  }

  const combined = [...state.policyDeck, ...state.policyDiscard];
  const newDeck = shuffle(combined, rng);
  const newThreshold = pickReshuffleThreshold(rng);

  if (newDeck.length < 3) {
    throw new Error(
      `Post-reshuffle deck has ${newDeck.length} cards — invariant violated. ` +
        `This should be impossible with standard policy counts.`,
    );
  }

  return {
    ...state,
    policyDeck: newDeck,
    policyDiscard: [],
    reshuffleThreshold: newThreshold,
    events: [...state.events, { type: 'deck-reshuffled' }],
  };
}
