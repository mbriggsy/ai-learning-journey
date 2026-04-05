import { describe, it, expect } from 'vitest'
import { CARD_DEFS, CARD_DEF_BY_TYPE } from './card-defs'
import type { CardType } from './card-defs'

describe('CARD_DEFS', () => {
  it('has exactly 17 card type entries', () => {
    expect(CARD_DEFS).toHaveLength(17)
  })

  it('sums to 120 total cards (pawCount + nonPawCount)', () => {
    const total = CARD_DEFS.reduce((sum, d) => sum + d.pawCount + d.nonPawCount, 0)
    expect(total).toBe(120)
  })

  it('has 9 Exploding Kittens', () => {
    const ek = CARD_DEFS.find(d => d.type === 'exploding-kitten')
    expect(ek).toBeDefined()
    expect(ek!.pawCount + ek!.nonPawCount).toBe(9)
  })

  it('has 10 Defuse cards (3 paw + 7 non-paw)', () => {
    const defuse = CARD_DEFS.find(d => d.type === 'defuse')
    expect(defuse).toBeDefined()
    expect(defuse!.pawCount).toBe(3)
    expect(defuse!.nonPawCount).toBe(7)
  })

  it('has all 5 cat variants', () => {
    const catTypes = ['taco-cat', 'beard-cat', 'rainbow-ralphing-cat', 'hairy-potato-cat', 'cattermelon']
    for (const catType of catTypes) {
      const found = CARD_DEFS.find(d => d.type === catType)
      expect(found, `missing cat type: ${catType}`).toBeDefined()
    }
  })

  it('has unique type strings (no duplicates)', () => {
    const types = CARD_DEFS.map(d => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('matches paw/non-paw counts per card type against rules reference', () => {
    const expected: Record<string, { paw: number; nonPaw: number }> = {
      'exploding-kitten': { paw: 0, nonPaw: 9 },
      'defuse': { paw: 3, nonPaw: 7 },
      'attack': { paw: 2, nonPaw: 3 },
      'targeted-attack': { paw: 2, nonPaw: 3 },
      'skip': { paw: 4, nonPaw: 6 },
      'see-the-future': { paw: 3, nonPaw: 3 },
      'alter-the-future': { paw: 2, nonPaw: 4 },
      'shuffle': { paw: 2, nonPaw: 4 },
      'draw-from-bottom': { paw: 3, nonPaw: 4 },
      'favor': { paw: 2, nonPaw: 4 },
      'nope': { paw: 4, nonPaw: 5 },
      'feral-cat': { paw: 2, nonPaw: 4 },
      'taco-cat': { paw: 3, nonPaw: 4 },
      'beard-cat': { paw: 3, nonPaw: 4 },
      'rainbow-ralphing-cat': { paw: 3, nonPaw: 4 },
      'hairy-potato-cat': { paw: 3, nonPaw: 4 },
      'cattermelon': { paw: 3, nonPaw: 4 },
    }

    for (const def of CARD_DEFS) {
      const exp = expected[def.type]
      expect(exp, `no expected counts for ${def.type}`).toBeDefined()
      expect(def.pawCount, `${def.type} pawCount`).toBe(exp!.paw)
      expect(def.nonPawCount, `${def.type} nonPawCount`).toBe(exp!.nonPaw)
    }
  })
})

describe('CARD_DEF_BY_TYPE', () => {
  it('maps every CardType to a valid definition', () => {
    const allTypes: CardType[] = CARD_DEFS.map(d => d.type)
    for (const type of allTypes) {
      const def = CARD_DEF_BY_TYPE[type]
      expect(def, `missing lookup for ${type}`).toBeDefined()
      expect(def.type).toBe(type)
    }
  })
})
