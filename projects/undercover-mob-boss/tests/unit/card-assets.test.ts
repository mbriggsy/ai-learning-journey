import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { VIRTUOUS_POOL, CORRUPT_POOL } from '../../src/server/game/card-pool';

const CARDS_DIR = resolve('public/assets/cards');

describe('Card Asset Existence', () => {
  const allCards = [...VIRTUOUS_POOL, ...CORRUPT_POOL];

  it('cards directory exists', () => {
    expect(existsSync(CARDS_DIR)).toBe(true);
  });

  for (const card of allCards) {
    it(`${card.cardId}.webp exists`, () => {
      const path = resolve(CARDS_DIR, `${card.cardId}.webp`);
      expect(existsSync(path), `Missing card art: ${path}`).toBe(true);
    });
  }
});
