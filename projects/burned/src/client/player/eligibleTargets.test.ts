import { describe, it, expect } from 'vitest'
import type { BoardPlayer } from '@shared/protocol'
import { getEligibleTargets, type LocalTargetReason } from './eligibleTargets'

function player(id: string, opts: Partial<BoardPlayer> = {}): BoardPlayer {
  return {
    id,
    name: id.toUpperCase(),
    color: '#000',
    cardCount: 4,
    isAlive: true,
    isConnected: true,
    ...opts,
  }
}

describe('getEligibleTargets', () => {
  const me = 'dash'
  const vera = player('vera', { cardCount: 3 })
  const otto = player('otto', { cardCount: 0 })
  const janet = player('janet', { cardCount: 2 })
  const dead = player('dead-neal', { cardCount: 5, isAlive: false })
  const self = player(me, { cardCount: 4 })
  const everyone = [self, vera, otto, janet, dead]

  it('with no reason: returns alive non-self players regardless of cardCount', () => {
    const out = getEligibleTargets(everyone, me, null)
    expect(out.map(p => p.id)).toEqual(['vera', 'otto', 'janet'])
  })

  it('direct-order: includes 0-card targets (no hand extraction)', () => {
    const out = getEligibleTargets(everyone, me, 'direct-order')
    expect(out.map(p => p.id)).toContain('otto')
    expect(out.map(p => p.id)).toEqual(['vera', 'otto', 'janet'])
  })

  it('call-in-a-favor: excludes 0-card targets', () => {
    const out = getEligibleTargets(everyone, me, 'call-in-a-favor')
    expect(out.map(p => p.id)).not.toContain('otto')
    expect(out.map(p => p.id)).toEqual(['vera', 'janet'])
  })

  it('combo-pair: excludes 0-card targets', () => {
    const out = getEligibleTargets(everyone, me, 'combo-pair')
    expect(out.map(p => p.id)).not.toContain('otto')
    expect(out.map(p => p.id)).toEqual(['vera', 'janet'])
  })

  it('combo-triple: excludes 0-card targets', () => {
    const out = getEligibleTargets(everyone, me, 'combo-triple')
    expect(out.map(p => p.id)).not.toContain('otto')
    expect(out.map(p => p.id)).toEqual(['vera', 'janet'])
  })

  it('all-others-empty: Favor returns empty list (TargetSelect renders cancel-only)', () => {
    const allEmpty = [self, player('a', { cardCount: 0 }), player('b', { cardCount: 0 })]
    const out = getEligibleTargets(allEmpty, me, 'call-in-a-favor')
    expect(out).toEqual([])
  })

  it('all-others-empty: Direct Order still returns the empty-handed players', () => {
    const allEmpty = [self, player('a', { cardCount: 0 }), player('b', { cardCount: 0 })]
    const out = getEligibleTargets(allEmpty, me, 'direct-order')
    expect(out.map(p => p.id)).toEqual(['a', 'b'])
  })

  it('excludes dead players for every reason', () => {
    const reasons: readonly (LocalTargetReason | null)[] = [
      null,
      'direct-order',
      'call-in-a-favor',
      'combo-pair',
      'combo-triple',
    ]
    for (const reason of reasons) {
      const out = getEligibleTargets(everyone, me, reason)
      expect(out.map(p => p.id)).not.toContain('dead-neal')
    }
  })

  it('excludes self for every reason', () => {
    const reasons: readonly (LocalTargetReason | null)[] = [
      null,
      'direct-order',
      'call-in-a-favor',
      'combo-pair',
      'combo-triple',
    ]
    for (const reason of reasons) {
      const out = getEligibleTargets(everyone, me, reason)
      expect(out.map(p => p.id)).not.toContain(me)
    }
  })
})
