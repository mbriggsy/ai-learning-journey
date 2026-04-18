import { describe, it, expect } from 'vitest'
import { sortHand } from './useSortedHand'
import type { CardInstance } from '@shared/types'

function card(type: string, id: string): CardInstance {
  return { type: type as CardInstance['type'], id }
}

describe('sortHand', () => {
  it('returns empty array for empty hand', () => {
    expect(sortHand([])).toEqual([])
  })

  it('returns single card unchanged', () => {
    const hand = [card('go-dark', 'a')]
    expect(sortHand(hand)).toEqual(hand)
  })

  it('pins extraction rightmost, operatives leftmost', () => {
    const hand = [card('go-dark', 'a'), card('extraction', 'b'), card('dash-barlowe', 'c')]
    const sorted = sortHand(hand)
    expect(sorted[0]!.type).toBe('dash-barlowe')
    // Extraction is the panic-reach rightmost pin; Go Dark slots between.
    expect(sorted[sorted.length - 1]!.type).toBe('extraction')
  })

  it('groups operatives by type', () => {
    const hand = [
      card('vera-khan', 'v1'),
      card('dash-barlowe', 'd1'),
      card('vera-khan', 'v2'),
      card('dash-barlowe', 'd2'),
    ]
    const sorted = sortHand(hand)
    // All Dash before all Vera
    expect(sorted.map(c => c.type)).toEqual([
      'dash-barlowe', 'dash-barlowe', 'vera-khan', 'vera-khan',
    ])
  })

  it('puts Agent X after operatives but before actions', () => {
    const hand = [
      card('go-dark', 'a'),
      card('agent-x', 'x'),
      card('dash-barlowe', 'd'),
    ]
    const sorted = sortHand(hand)
    expect(sorted.map(c => c.type)).toEqual(['dash-barlowe', 'agent-x', 'go-dark'])
  })

  it('sorts action cards alphabetically by name', () => {
    const hand = [
      card('reassign', 'r'),
      card('go-dark', 'g'),
      card('back-channel', 'b'),
    ]
    const sorted = sortHand(hand)
    // Back Channel < Go Dark < Reassign
    expect(sorted.map(c => c.type)).toEqual(['back-channel', 'go-dark', 'reassign'])
  })

  it('maintains stable order for same-type cards', () => {
    const hand = [card('go-dark', 'z'), card('go-dark', 'a'), card('go-dark', 'm')]
    const sorted = sortHand(hand)
    expect(sorted.map(c => c.id)).toEqual(['a', 'm', 'z'])
  })

  it('full hand sorts: operatives → wild → actions → intercepted → extraction', () => {
    const hand = [
      card('intercepted', 'i1'),
      card('dash-barlowe', 'd1'),
      card('extraction', 'e1'),
      card('agent-x', 'x1'),
      card('vera-khan', 'v1'),
      card('go-dark', 'g1'),
      card('dash-barlowe', 'd2'),
    ]
    const sorted = sortHand(hand)
    // Extraction pins rightmost (panic lifeline), Intercepted pins second-
    // rightmost (reactive counter), both ahead of generic action cards for
    // thumb reach.
    expect(sorted.map(c => c.type)).toEqual([
      'dash-barlowe', 'dash-barlowe',
      'vera-khan',
      'agent-x',
      'go-dark',
      'intercepted',
      'extraction',
    ])
  })
})
