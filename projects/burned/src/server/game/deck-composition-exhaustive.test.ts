/**
 * Exhaustive deck composition tests against `docs/rules/RULES-REFERENCE.md` §3.
 *
 * Locks the Defuse / Burned / hand-size / tier-selection math for every legal
 * player count (2..10). This is the kind of table the rules audit caught three
 * bugs in — keep it dense, keep it literal.
 */
import { describe, it, expect } from 'vitest'
import { buildDeck } from './engine'
import { makeCtx, startGameWith } from './test-helpers'
import { CARD_DEFS } from '@shared/card-defs'
import { DECK_COMPOSITION } from '@shared/constants'

/** Totals from the rules reference §2 + §3 distribution table. */
const TIER_DECK_SIZE_WITHOUT_EK = {
  // §3 says "41 action + 3 defuses" but counts operatives/wild as action-pool.
  // Derived by summing pawCount (excluding burned) from CARD_DEFS.
  paw: CARD_DEFS.filter(d => d.category !== 'burned').reduce((s, d) => s + d.pawCount, 0),
  nonPaw: CARD_DEFS.filter(d => d.category !== 'burned').reduce((s, d) => s + d.nonPawCount, 0),
  both: CARD_DEFS.filter(d => d.category !== 'burned').reduce((s, d) => s + d.pawCount + d.nonPawCount, 0),
} as const

/** §3 Defuse pool table — ground truth. */
const DEFUSE_POOL_BY_PLAYER_COUNT: Record<number, number> = {
  2: 3, 3: 3,                    // paw tier: 3 defuses total
  4: 7, 5: 7, 6: 7, 7: 7,        // non-paw tier: 7 defuses total
  8: 10, 9: 10, 10: 10,          // all tier: 10 defuses total
}

function tierFor(n: number): 'paw' | 'nonPaw' | 'both' {
  if (n <= DECK_COMPOSITION.small.max) return 'paw'
  if (n <= DECK_COMPOSITION.medium.max) return 'nonPaw'
  return 'both'
}

describe('Deck composition — exhaustive per-player-count', () => {
  for (let n = 2; n <= 10; n++) {
    describe(`${n} players`, () => {
      it(`buildDeck size matches ${tierFor(n)} tier total (burned excluded)`, () => {
        const deck = buildDeck(n, makeCtx())
        expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK[tierFor(n)])
      })

      it('buildDeck contains no Burned cards (startGame injects N-1 directly)', () => {
        const deck = buildDeck(n, makeCtx())
        expect(deck.some(c => c.type === 'burned')).toBe(false)
      })

      it(`buildDeck contains exactly ${DEFUSE_POOL_BY_PLAYER_COUNT[n]} Extraction cards`, () => {
        const deck = buildDeck(n, makeCtx())
        const defuses = deck.filter(c => c.type === 'extraction')
        expect(defuses).toHaveLength(DEFUSE_POOL_BY_PLAYER_COUNT[n]!)
      })

      it(`startGame deals exactly ${n} Extraction cards (one per player)`, () => {
        const state = startGameWith(n)
        const dealt = state.players.reduce(
          (sum, p) => sum + p.hand.filter(c => c.type === 'extraction').length,
          0,
        )
        expect(dealt).toBe(n)
      })

      it('startGame gives every player exactly 8 cards (1 Extraction + 7 others)', () => {
        const state = startGameWith(n)
        for (const p of state.players) {
          expect(p.hand).toHaveLength(8)
          const defuseCount = p.hand.filter(c => c.type === 'extraction').length
          expect(defuseCount).toBe(1)
          const nonDefuse = p.hand.filter(c => c.type !== 'extraction').length
          expect(nonDefuse).toBe(7)
        }
      })

      it('startGame has zero Burned cards in any player hand', () => {
        const state = startGameWith(n)
        for (const p of state.players) {
          expect(p.hand.some(c => c.type === 'burned')).toBe(false)
        }
      })

      it(`startGame inserts exactly ${n - 1} Burned cards into draw pile`, () => {
        const state = startGameWith(n)
        const eks = state.drawPile.filter(c => c.type === 'burned')
        expect(eks).toHaveLength(n - 1)
      })

      const expectedExtraDefusesInPile = DEFUSE_POOL_BY_PLAYER_COUNT[n]! - n
      it(`draw pile carries ${expectedExtraDefusesInPile} extra Extraction card(s)`, () => {
        const state = startGameWith(n)
        const extrasInPile = state.drawPile.filter(c => c.type === 'extraction').length
        expect(extrasInPile).toBe(expectedExtraDefusesInPile)
      })

      it('total cards in circulation equals tier deck + N-1 Burned (conservation)', () => {
        const state = startGameWith(n)
        const inHands = state.players.reduce((s, p) => s + p.hand.length, 0)
        const inPile = state.drawPile.length
        const inDiscard = state.discardPile.length
        const expected = TIER_DECK_SIZE_WITHOUT_EK[tierFor(n)] + (n - 1)
        expect(inHands + inPile + inDiscard).toBe(expected)
      })

      it('every card in circulation has a unique ID', () => {
        const state = startGameWith(n)
        const allIds: string[] = []
        for (const p of state.players) allIds.push(...p.hand.map(c => c.id))
        allIds.push(...state.drawPile.map(c => c.id))
        allIds.push(...state.discardPile.map(c => c.id))
        expect(new Set(allIds).size).toBe(allIds.length)
      })
    })
  }
})

describe('Deck composition — §3 balance-note callouts', () => {
  it('3 players: zero extra Defuses in draw pile (only the dealt ones exist)', () => {
    const state = startGameWith(3)
    const extras = state.drawPile.filter(c => c.type === 'extraction').length
    expect(extras).toBe(0)
  })

  it('7 players: zero extra Defuses in draw pile', () => {
    const state = startGameWith(7)
    const extras = state.drawPile.filter(c => c.type === 'extraction').length
    expect(extras).toBe(0)
  })

  it('10 players: zero extra Defuses in draw pile', () => {
    const state = startGameWith(10)
    const extras = state.drawPile.filter(c => c.type === 'extraction').length
    expect(extras).toBe(0)
  })
})

describe('Deck composition — tier boundary selection', () => {
  it('2 players uses paw tier', () => {
    const deck = buildDeck(2, makeCtx())
    expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK.paw)
  })

  it('3 players uses paw tier (upper bound)', () => {
    const deck = buildDeck(3, makeCtx())
    expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK.paw)
  })

  it('4 players crosses into non-paw tier (lower bound)', () => {
    const deck = buildDeck(4, makeCtx())
    expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK.nonPaw)
  })

  it('7 players still uses non-paw tier (upper bound)', () => {
    const deck = buildDeck(7, makeCtx())
    expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK.nonPaw)
  })

  it('8 players crosses into full-deck tier (lower bound)', () => {
    const deck = buildDeck(8, makeCtx())
    expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK.both)
  })

  it('10 players uses full-deck tier (upper bound)', () => {
    const deck = buildDeck(10, makeCtx())
    expect(deck.length).toBe(TIER_DECK_SIZE_WITHOUT_EK.both)
  })
})

describe('Deck composition — sanity anchors (literal rules table)', () => {
  // Hard-coded literals from §3 Defuse-and-EK-distribution table so a future
  // refactor that silently breaks tier math trips these immediately.
  const TABLE: Array<{ n: number; pool: number; dealt: number; extra: number; eks: number }> = [
    { n: 2, pool: 3, dealt: 2, extra: 1, eks: 1 },
    { n: 3, pool: 3, dealt: 3, extra: 0, eks: 2 },
    { n: 4, pool: 7, dealt: 4, extra: 3, eks: 3 },
    { n: 5, pool: 7, dealt: 5, extra: 2, eks: 4 },
    { n: 6, pool: 7, dealt: 6, extra: 1, eks: 5 },
    { n: 7, pool: 7, dealt: 7, extra: 0, eks: 6 },
    { n: 8, pool: 10, dealt: 8, extra: 2, eks: 7 },
    { n: 9, pool: 10, dealt: 9, extra: 1, eks: 8 },
    { n: 10, pool: 10, dealt: 10, extra: 0, eks: 9 },
  ]

  for (const row of TABLE) {
    it(`${row.n}p → pool ${row.pool}, dealt ${row.dealt}, extra ${row.extra}, EKs ${row.eks}`, () => {
      const deck = buildDeck(row.n, makeCtx())
      expect(deck.filter(c => c.type === 'extraction')).toHaveLength(row.pool)

      const state = startGameWith(row.n)
      const dealt = state.players.reduce(
        (s, p) => s + p.hand.filter(c => c.type === 'extraction').length, 0)
      expect(dealt).toBe(row.dealt)
      expect(state.drawPile.filter(c => c.type === 'extraction').length).toBe(row.extra)
      expect(state.drawPile.filter(c => c.type === 'burned').length).toBe(row.eks)
    })
  }
})
