import { describe, it, expect, vi } from 'vitest'
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
    const msg: ServerMessage = { type: 'state-update', payload: lobby, protocolVersion: 1 }
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
    gameStore.handleMessage({ type: 'state-update', payload: lobby, protocolVersion: 1 })
    expect(called).toBe(1)

    unsub()
    gameStore.handleMessage({ type: 'state-update', payload: lobby, protocolVersion: 1 })
    expect(called).toBe(1) // no longer subscribed
  })

  it('sets playerId on joined message', () => {
    gameStore.handleMessage({
      type: 'joined',
      payload: { playerId: 'p1', sessionToken: 'tok', color: '#3498db', protocolVersion: 1 },
    })
    expect(gameStore.getPlayerId()).toBe('p1')
  })

  it('suppresses errors during reconnection, clears after state-update', () => {
    gameStore.setReconnecting(true)
    expect(gameStore.getIsReconnecting()).toBe(true)

    // Errors suppressed during reconnection
    gameStore.handleMessage({ type: 'error', payload: { code: 'STALE_STATE', message: 'stale' } })
    expect(gameStore.getLastError()).toBeNull()

    // state-update clears reconnecting
    const lobby: LobbyView = { phase: 'lobby', roomCode: 'TEST', players: [] }
    gameStore.handleMessage({ type: 'state-update', payload: lobby, protocolVersion: 1 })
    expect(gameStore.getIsReconnecting()).toBe(false)
  })

  it('isReconnecting auto-clears after 5s safety timeout', () => {
    vi.useFakeTimers()
    gameStore.setReconnecting(true)
    expect(gameStore.getIsReconnecting()).toBe(true)

    vi.advanceTimersByTime(5_000)
    expect(gameStore.getIsReconnecting()).toBe(false)
    vi.useRealTimers()
  })

  it('detects protocol mismatch and clears on match', () => {
    gameStore.handleMessage({
      type: 'joined',
      payload: { playerId: 'p1', sessionToken: 'tok', color: '#fff', protocolVersion: 999 },
    })
    expect(gameStore.getProtocolMismatch()).toBe(true)

    gameStore.handleMessage({
      type: 'joined',
      payload: { playerId: 'p1', sessionToken: 'tok', color: '#fff', protocolVersion: 2 },
    })
    expect(gameStore.getProtocolMismatch()).toBe(false)
  })

  // --- Optimistic snapshot stability (regression: infinite re-render loop) ---
  // useSyncExternalStore requires getSnapshot() to return the SAME reference
  // on consecutive calls when the store hasn't changed. The old code stored a
  // transform function and called it on every getSnapshot(), creating a new
  // object each time. React detected "tearing" and forced infinite re-renders.

  it('getSnapshot returns stable reference with optimistic state active', () => {
    const lobby: LobbyView = { phase: 'lobby', roomCode: 'STAB', players: [] }
    gameStore.handleMessage({ type: 'state-update', payload: lobby, protocolVersion: 1 })

    gameStore.applyOptimistic(s => ({ ...s, roomCode: 'OPTI' } as LobbyView))

    const snap1 = gameStore.getSnapshot()
    const snap2 = gameStore.getSnapshot()
    const snap3 = gameStore.getSnapshot()

    // Object.is — the exact check useSyncExternalStore uses
    expect(snap1).toBe(snap2)
    expect(snap2).toBe(snap3)
    expect((snap1 as LobbyView).roomCode).toBe('OPTI')
  })

  it('getSnapshot returns server state after optimistic is cleared', () => {
    const lobby: LobbyView = { phase: 'lobby', roomCode: 'SERV', players: [] }
    gameStore.handleMessage({ type: 'state-update', payload: lobby, protocolVersion: 1 })

    gameStore.applyOptimistic(s => ({ ...s, roomCode: 'OPT' } as LobbyView))
    expect((gameStore.getSnapshot() as LobbyView).roomCode).toBe('OPT')

    gameStore.clearOptimistic()
    expect((gameStore.getSnapshot() as LobbyView).roomCode).toBe('SERV')
    expect(gameStore.getSnapshot()).toBe(lobby) // same reference as original
  })

  it('handleMessage clears optimistic on state-update', () => {
    const lobby1: LobbyView = { phase: 'lobby', roomCode: 'OLD', players: [] }
    gameStore.handleMessage({ type: 'state-update', payload: lobby1, protocolVersion: 1 })

    gameStore.applyOptimistic(s => ({ ...s, roomCode: 'OPT' } as LobbyView))
    expect(gameStore.getIsOptimisticPending()).toBe(true)

    const lobby2: LobbyView = { phase: 'lobby', roomCode: 'NEW', players: [] }
    gameStore.handleMessage({ type: 'state-update', payload: lobby2, protocolVersion: 1 })

    expect(gameStore.getIsOptimisticPending()).toBe(false)
    expect(gameStore.getSnapshot()).toBe(lobby2)
  })

  it('updates private data on player-update', () => {
    const futureCards = [{ id: 'c1', type: 'go-dark' as const }]
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
      protocolVersion: 1,
    })
    expect(gameStore.getPrivateData().futureCards).toEqual(futureCards)
  })
})
