import { describe, it, expect } from 'vitest'
import { gameStore } from './gameStore'
import type { ServerMessage, LobbyView } from '@shared/protocol'

describe('GameStore', () => {
  it('starts with null snapshot', () => {
    expect(gameStore.getSnapshot()).toBeNull()
  })

  it('updates snapshot on state-update', () => {
    const lobby: LobbyView = {
      phase: 'lobby',
      roomCode: 'ABCD',
      players: [{ id: '1', name: 'Alice', color: '#e74c3c', isConnected: true }],
    }
    const msg: ServerMessage = { type: 'state-update', payload: lobby }
    gameStore.handleMessage(msg)
    expect(gameStore.getSnapshot()).toBe(lobby)
  })

  it('notifies listeners on state change', () => {
    let called = 0
    const unsub = gameStore.subscribe(() => { called++ })

    const lobby: LobbyView = {
      phase: 'lobby',
      roomCode: 'EFGH',
      players: [],
    }
    gameStore.handleMessage({ type: 'state-update', payload: lobby })
    expect(called).toBe(1)

    unsub()
    gameStore.handleMessage({ type: 'state-update', payload: lobby })
    expect(called).toBe(1) // no longer subscribed
  })

  it('sets playerId on joined message', () => {
    gameStore.handleMessage({
      type: 'joined',
      payload: { playerId: 'p1', sessionToken: 'tok', color: '#3498db' },
    })
    expect(gameStore.getPlayerId()).toBe('p1')
  })

  it('updates private data on player-update', () => {
    const futureCards = [{ id: 'c1', type: 'skip' as const }]
    gameStore.handleMessage({
      type: 'player-update',
      payload: {
        state: {
          phase: 'playing',
          subPhase: 'turn-active',
          players: [],
          drawPileCount: 10,
          discardPile: [],
          currentTurn: { currentPlayerId: 'p1', turnsRemaining: 1 },
          nopeWindow: null,
          pendingPrompt: null,
          events: [],
          stateVersion: 5,
          myPlayerId: 'p1',
          myHand: [],
          isMyTurn: true,
        },
        private: { futureCards },
      },
    })
    expect(gameStore.getPrivateData().futureCards).toEqual(futureCards)
  })
})
