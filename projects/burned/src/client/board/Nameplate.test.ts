import { describe, it, expect } from 'vitest'
import { resolveSubject } from './Nameplate'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'

function mkPlayer(id: string, name: string, isConnected: boolean): BoardPlayer {
  return {
    id, name,
    color: '#888',
    cardCount: 3,
    isAlive: true,
    isConnected,
  }
}

describe('resolveSubject — Nameplate subject derivation', () => {
  const vera = mkPlayer('p1', 'VERA ASHBOURNE', true)
  const veraOffline = mkPlayer('p1', 'VERA ASHBOURNE', false)
  const dash = mkPlayer('p2', 'DASH BARLOWE', true)

  it('returns standby when no turn and no prompt', () => {
    const s = resolveSubject(null, null, [vera, dash])
    expect(s.standby).toBe(true)
    expect(s.offline).toBe(false)
    expect(s.subtext).toBe('Standby')
  })

  it('returns on-deck for the active player when connected', () => {
    const s = resolveSubject(
      { currentPlayerId: 'p1', turnsRemaining: 1 },
      null,
      [vera, dash],
    )
    expect(s.standby).toBe(false)
    expect(s.offline).toBe(false)
    expect(s.name).toBe('VERA ASHBOURNE')
    expect(s.subtext).toBe('On Deck')
    expect(s.key).toBe('turn:p1')
  })

  it('appends turn count when stacked under attack', () => {
    const s = resolveSubject(
      { currentPlayerId: 'p1', turnsRemaining: 3 },
      null,
      [vera, dash],
    )
    expect(s.subtext).toBe('On Deck · 3 Turns')
  })

  it('flips to Comms Down when active player is offline', () => {
    const s = resolveSubject(
      { currentPlayerId: 'p1', turnsRemaining: 1 },
      null,
      [veraOffline, dash],
    )
    expect(s.offline).toBe(true)
    expect(s.subtext).toBe('Comms Down')
    expect(s.name).toBe('VERA ASHBOURNE')
    expect(s.key).toBe('turn:p1:offline')
  })

  it('flips to Comms Down when prompted player is offline', () => {
    const prompt: PendingPromptView = { type: 'defuse', playerId: 'p1' }
    const s = resolveSubject(
      { currentPlayerId: 'p1', turnsRemaining: 1 },
      prompt,
      [veraOffline, dash],
    )
    expect(s.offline).toBe(true)
    expect(s.subtext).toBe('Comms Down')
    expect(s.key).toBe('prompt:p1:defuse:offline')
  })

  it('prompted-connected still shows the prompt subtext (defuse)', () => {
    const prompt: PendingPromptView = { type: 'defuse', playerId: 'p1' }
    const s = resolveSubject(null, prompt, [vera, dash])
    expect(s.offline).toBe(false)
    expect(s.subtext).toBe('Defusing')
    expect(s.key).toBe('prompt:p1:defuse')
  })

  it('key changes when connection flips mid-prompt — plate re-flips', () => {
    const prompt: PendingPromptView = { type: 'favor-response', playerId: 'p1', requesterId: 'p2' }
    const online = resolveSubject(null, prompt, [vera, dash])
    const offline = resolveSubject(null, prompt, [veraOffline, dash])
    expect(online.key).not.toBe(offline.key)
    expect(online.subtext).toBe('Handing Over')
    expect(offline.subtext).toBe('Comms Down')
  })

  it('unknown prompted player falls back to standby', () => {
    const prompt: PendingPromptView = { type: 'defuse', playerId: 'ghost' }
    const s = resolveSubject(null, prompt, [vera, dash])
    expect(s.standby).toBe(true)
  })
})
