import { describe, it, expect, vi } from 'vitest'
import { formatEvent } from './events'
import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'

// Minimal stub player roster so `playerName()` always resolves.
const players: readonly BoardPlayer[] = [
  { id: 'p1', name: 'Dash', color: '#000000', cardCount: 0, isAlive: true, isConnected: true },
  { id: 'p2', name: 'Vera', color: '#111111', cardCount: 0, isAlive: true, isConnected: true },
]

describe('formatEvent', () => {
  it('renders card-drawn to generic copy (no cardType leak — E-01)', () => {
    const event: GameEvent = { type: 'card-drawn', playerId: 'p1', safe: true }
    // cardType deliberately absent (projection stripped it for non-drawer
    // viewers). Board must format without reading cardType.
    const text = formatEvent(event, players, 'test-1')
    expect(text).toBeTruthy()
    // No mention of 'Go Dark' / specific card names in the copy.
    expect(text?.toLowerCase()).not.toContain('go dark')
    expect(text?.toLowerCase()).not.toContain('reassign')
  })

  it('renders known event variants to strings or null', () => {
    const variants: GameEvent[] = [
      { type: 'game-started', playerCount: 4 },
      { type: 'card-played', playerId: 'p1', cardType: 'go-dark' },
      { type: 'burned-drawn', playerId: 'p1' },
      { type: 'extraction-played', playerId: 'p1' },
      { type: 'player-eliminated', playerId: 'p2', rank: 3 },
      { type: 'turn-started', playerId: 'p1', turnsRemaining: 1 },
      { type: 'game-over', winnerId: 'p1' },
    ]
    for (const e of variants) {
      const result = formatEvent(e, players, `id-${e.type}`)
      expect(typeof result === 'string' || result === null).toBe(true)
    }
  })

  // Regression: overnight E2E audit 2026-04-23 C-05. The default arm used
  // `return _exhaustive` (the event object itself), handing React an
  // object as a child → crash. Because state.events is server-cumulative
  // (500-cap, replays on remount), the ErrorBoundary auto-recover loop
  // hit the same crash forever. Unknown events MUST return null.
  it('unknown event types return null, never the event object (C-05 regression)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bogus = { type: 'from-the-future', playerId: 'p1' } as unknown as GameEvent
    const result = formatEvent(bogus, players, 'bogus-1')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('totally malformed events still return null (defensive)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const malformed = {} as unknown as GameEvent
    const result = formatEvent(malformed, players, 'malformed-1')
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })
})
