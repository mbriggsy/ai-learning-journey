import { describe, it, expect } from 'vitest'
import { deriveInteractionPermission } from './useInteractionPermission'

describe('deriveInteractionPermission', () => {
  it('allows when it is my turn and turn-active', () => {
    const result = deriveInteractionPermission(true, 'turn-active', true, 'playing', null, 'p1')
    expect(result).toEqual({ allowed: true })
  })

  it('blocks when not my turn', () => {
    const result = deriveInteractionPermission(false, 'turn-active', true, 'playing', null, 'p1')
    expect(result).toEqual({ allowed: false, reason: 'not-my-turn' })
  })

  it('blocks when game over', () => {
    const result = deriveInteractionPermission(true, null, true, 'game_over', null, 'p1')
    expect(result).toEqual({ allowed: false, reason: 'game-over' })
  })

  it('blocks when eliminated', () => {
    const result = deriveInteractionPermission(true, 'turn-active', false, 'playing', null, 'p1')
    expect(result).toEqual({ allowed: false, reason: 'eliminated' })
  })

  it('blocks when pending prompt for another player', () => {
    const prompt = { type: 'favor-response' as const, playerId: 'p2', requesterId: 'p1' }
    const result = deriveInteractionPermission(true, 'favor-pending', true, 'playing', prompt, 'p1')
    expect(result).toEqual({ allowed: false, reason: 'sub-phase-active' })
  })

  it('blocks when pending prompt for me (sheet handles it)', () => {
    const prompt = { type: 'defuse' as const, playerId: 'p1' }
    const result = deriveInteractionPermission(true, 'defuse-pending', true, 'playing', prompt, 'p1')
    expect(result).toEqual({ allowed: false, reason: 'sub-phase-active' })
  })
})
