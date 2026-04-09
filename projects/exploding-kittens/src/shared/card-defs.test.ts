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

  it('has 9 Burned cards', () => {
    const burned = CARD_DEFS.find(d => d.type === 'burned')
    expect(burned).toBeDefined()
    expect(burned!.pawCount + burned!.nonPawCount).toBe(9)
  })

  it('has 10 Extraction cards (3 paw + 7 non-paw)', () => {
    const extraction = CARD_DEFS.find(d => d.type === 'extraction')
    expect(extraction).toBeDefined()
    expect(extraction!.pawCount).toBe(3)
    expect(extraction!.nonPawCount).toBe(7)
  })

  it('has all 5 operative variants', () => {
    const operativeTypes = ['dash-barlowe', 'vera-khan', 'otto-prang', 'janet-broadside', 'neal-proctor']
    for (const opType of operativeTypes) {
      const found = CARD_DEFS.find(d => d.type === opType)
      expect(found, `missing operative type: ${opType}`).toBeDefined()
    }
  })

  it('has unique type strings (no duplicates)', () => {
    const types = CARD_DEFS.map(d => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('assigns correct categories', () => {
    const burned = CARD_DEFS.find(d => d.type === 'burned')
    expect(burned!.category).toBe('burned')

    const extraction = CARD_DEFS.find(d => d.type === 'extraction')
    expect(extraction!.category).toBe('extraction')

    const agentX = CARD_DEFS.find(d => d.type === 'agent-x')
    expect(agentX!.category).toBe('wild')

    const operativeTypes = ['dash-barlowe', 'vera-khan', 'otto-prang', 'janet-broadside', 'neal-proctor']
    for (const opType of operativeTypes) {
      const def = CARD_DEFS.find(d => d.type === opType)
      expect(def!.category, `${opType} should be 'operative'`).toBe('operative')
    }

    const actionTypes = ['reassign', 'direct-order', 'go-dark', 'intel-briefing', 'falsify-intel', 'burn-the-files', 'back-channel', 'call-in-a-favor', 'intercepted']
    for (const actionType of actionTypes) {
      const def = CARD_DEFS.find(d => d.type === actionType)
      expect(def!.category, `${actionType} should be 'action'`).toBe('action')
    }
  })

  it('has exactly 1 burned category card', () => {
    const burnedCards = CARD_DEFS.filter(d => d.category === 'burned')
    expect(burnedCards).toHaveLength(1)
    expect(burnedCards[0]!.type).toBe('burned')
  })

  it('matches paw/non-paw counts per card type against rules reference', () => {
    const expected: Record<string, { paw: number; nonPaw: number }> = {
      'burned': { paw: 0, nonPaw: 9 },
      'extraction': { paw: 3, nonPaw: 7 },
      'reassign': { paw: 2, nonPaw: 3 },
      'direct-order': { paw: 2, nonPaw: 3 },
      'go-dark': { paw: 4, nonPaw: 6 },
      'intel-briefing': { paw: 3, nonPaw: 3 },
      'falsify-intel': { paw: 2, nonPaw: 4 },
      'burn-the-files': { paw: 2, nonPaw: 4 },
      'back-channel': { paw: 3, nonPaw: 4 },
      'call-in-a-favor': { paw: 2, nonPaw: 4 },
      'intercepted': { paw: 4, nonPaw: 5 },
      'agent-x': { paw: 2, nonPaw: 4 },
      'dash-barlowe': { paw: 3, nonPaw: 4 },
      'vera-khan': { paw: 3, nonPaw: 4 },
      'otto-prang': { paw: 3, nonPaw: 4 },
      'janet-broadside': { paw: 3, nonPaw: 4 },
      'neal-proctor': { paw: 3, nonPaw: 4 },
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
