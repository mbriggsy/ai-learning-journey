import { describe, it, expect } from 'vitest'
import { deriveActiveBottomSheet } from './useActiveBottomSheet'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import type { CardInstance } from '@shared/types'

const players: BoardPlayer[] = [
  { id: 'p1', name: 'Alice', color: '#e74c3c', cardCount: 5, isAlive: true },
  { id: 'p2', name: 'Bob', color: '#3498db', cardCount: 3, isAlive: true },
  { id: 'p3', name: 'Charlie', color: '#2ecc71', cardCount: 0, isAlive: false },
]

const hand: CardInstance[] = [
  { id: 'c1', type: 'skip' },
  { id: 'c2', type: 'nope' },
]

describe('deriveActiveBottomSheet', () => {
  it('returns null when no pending prompt', () => {
    expect(deriveActiveBottomSheet(null, 'p1', players, hand, 10, undefined)).toBeNull()
  })

  it('returns null when prompt is for another player', () => {
    const prompt: PendingPromptView = { type: 'defuse', playerId: 'p2' }
    expect(deriveActiveBottomSheet(prompt, 'p1', players, hand, 10, undefined)).toBeNull()
  })

  it('returns defuse-placement when defuse prompt for me', () => {
    const prompt: PendingPromptView = { type: 'defuse', playerId: 'p1' }
    const result = deriveActiveBottomSheet(prompt, 'p1', players, hand, 20, undefined)
    expect(result).toEqual({ sheet: 'defuse-placement', maxPosition: 20 })
  })

  it('returns favor-response when favor prompt for me', () => {
    const prompt: PendingPromptView = { type: 'favor-response', playerId: 'p1', requesterId: 'p2' }
    const result = deriveActiveBottomSheet(prompt, 'p1', players, hand, 10, undefined)
    expect(result?.sheet).toBe('favor-response')
    if (result?.sheet === 'favor-response') {
      expect(result.requesterName).toBe('Bob')
    }
  })

  it('returns future-peek for rearrange prompt', () => {
    const prompt: PendingPromptView = { type: 'future-rearrange', playerId: 'p1', cardIds: ['x', 'y', 'z'] }
    const futureCards: CardInstance[] = [
      { id: 'x', type: 'skip' }, { id: 'y', type: 'attack' }, { id: 'z', type: 'nope' },
    ]
    const result = deriveActiveBottomSheet(prompt, 'p1', players, hand, 10, futureCards)
    expect(result?.sheet).toBe('future-peek')
    if (result?.sheet === 'future-peek') {
      expect(result.canRearrange).toBe(true)
      expect(result.cards).toEqual(futureCards)
    }
  })

  it('returns target-select for steal prompt', () => {
    const prompt: PendingPromptView = { type: 'steal-target', playerId: 'p1' }
    const result = deriveActiveBottomSheet(prompt, 'p1', players, hand, 10, undefined)
    expect(result?.sheet).toBe('target-select-prompted')
    if (result?.sheet === 'target-select-prompted') {
      // Only alive players excluding self
      expect(result.eligiblePlayers).toHaveLength(1)
      expect(result.eligiblePlayers[0]!.id).toBe('p2')
    }
  })

  it('returns name-card for name prompt', () => {
    const prompt: PendingPromptView = { type: 'name-card', playerId: 'p1', targetId: 'p2' }
    const result = deriveActiveBottomSheet(prompt, 'p1', players, hand, 10, undefined)
    expect(result?.sheet).toBe('name-card')
    if (result?.sheet === 'name-card') {
      expect(result.targetName).toBe('Bob')
    }
  })
})
