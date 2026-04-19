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

  // Pawdrey mid-favor: someone targeted her with Call-in-a-Favor, the nope
  // window resolved, and her phone now shows the favor-pending prompt. She's
  // NOT on turn (it's the requester's turn). This is the one prompt where the
  // target interacts with her real hand + staging area rather than a sheet,
  // so the hook must override the standard "not my turn → blocked" rule.
  it('allows favor-response target to interact even when not on turn', () => {
    const prompt = { type: 'favor-response' as const, playerId: 'pawdrey', requesterId: 'someone-else' }
    const result = deriveInteractionPermission(false, 'favor-pending', true, 'playing', prompt, 'pawdrey')
    expect(result).toEqual({ allowed: true })
  })

  it('still blocks when favor-response prompt is for another player', () => {
    const prompt = { type: 'favor-response' as const, playerId: 'pawdrey', requesterId: 'someone-else' }
    const result = deriveInteractionPermission(false, 'favor-pending', true, 'playing', prompt, 'not-pawdrey')
    expect(result).toEqual({ allowed: false, reason: 'sub-phase-active' })
  })
})
