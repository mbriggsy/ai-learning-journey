import { useSyncExternalStore, useRef, useCallback } from 'react'
import {
  PROTOCOL_VERSION,
  type ServerMessage, type LobbyView, type BoardView, type PlayerView, type PrivateData, type ErrorCode,
  type PlayingBoardView, type PlayingPlayerView,
} from '@shared/protocol'
import type { GameEvent } from '@shared/types'

// --- Types ---

export type ViewState = LobbyView | BoardView | PlayerView
export interface GameError { code: ErrorCode; message: string }
type Listener = () => void

// --- Accumulated Event ---

export interface AccumulatedEvent {
  readonly event: GameEvent
  readonly receivedAt: number
  readonly id: string
}

// --- Shallow Equal ---

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)
  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
  }
  return true
}

// --- Store ---

let eventIdCounter = 0
const MAX_ACCUMULATED_EVENTS = 20

class GameStore {
  private serverSnapshot: ViewState | null = null
  private optimisticSnapshot: ViewState | null = null
  private privateData: PrivateData = {}
  private playerId: string | null = null
  private lastError: GameError | null = null
  private listeners = new Set<Listener>()
  private accumulatedEvents: AccumulatedEvent[] = []
  private _isReconnecting = false
  private _reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private _protocolMismatch = false

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  getSnapshot = (): ViewState | null => {
    return this.optimisticSnapshot ?? this.serverSnapshot
  }

  getServerSnapshot = (): ViewState | null => this.serverSnapshot
  getPrivateData = (): PrivateData => this.privateData
  getPlayerId = (): string | null => this.playerId
  getLastError = (): GameError | null => this.lastError
  getAccumulatedEvents = (): readonly AccumulatedEvent[] => this.accumulatedEvents
  getIsReconnecting = (): boolean => this._isReconnecting
  getProtocolMismatch = (): boolean => this._protocolMismatch
  getIsOptimisticPending = (): boolean => this.optimisticSnapshot !== null

  setPlayerId(id: string): void {
    this.playerId = id
  }

  setReconnecting(value: boolean): void {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout)
      this._reconnectTimeout = null
    }
    this._isReconnecting = value
    if (value) {
      // Safety timeout — clear after 5s even if no state-update arrives
      this._reconnectTimeout = setTimeout(() => {
        this._reconnectTimeout = null
        this._isReconnecting = false
        this.notify()
      }, 5_000)
    }
    this.notify()
  }

  applyOptimistic(transform: (s: ViewState) => ViewState): void {
    this.optimisticSnapshot = this.serverSnapshot ? transform(this.serverSnapshot) : null
    this.notify()
  }

  clearOptimistic(): void {
    if (this.optimisticSnapshot === null) return
    this.optimisticSnapshot = null
    this.notify()
  }

  handleMessage(msg: ServerMessage): void {
    // Suppress stale rejections during reconnection — but pass through fatal errors
    if (this._isReconnecting && (msg.type === 'error' || msg.type === 'action-rejected')) {
      const isFatal = msg.type === 'error' && ['SESSION_REPLACED', 'KICKED', 'ROOM_FULL'].includes(msg.payload.code)
      if (!isFatal) return
    }

    switch (msg.type) {
      case 'state-update':
        this.lastError = null
        this._isReconnecting = false
        this._protocolMismatch = msg.protocolVersion !== PROTOCOL_VERSION
        this.accumulateEvents(msg.payload)
        this.optimisticSnapshot = null
        this.updateState(msg.payload)
        break
      case 'player-update':
        this.lastError = null
        this._isReconnecting = false
        this._protocolMismatch = msg.protocolVersion !== PROTOCOL_VERSION
        this.accumulateEvents(msg.payload.state)
        this.optimisticSnapshot = null
        this.updateState(msg.payload.state)
        this.privateData = msg.payload.private
        break
      case 'joined':
        this.playerId = msg.payload.playerId
        // Protocol version check — set or clear on every join
        this._protocolMismatch = msg.payload.protocolVersion !== PROTOCOL_VERSION
        this.notify()
        break
      case 'error':
        this.lastError = msg.payload
        this.optimisticSnapshot = null
        this.notify()
        break
      case 'action-rejected':
        this.optimisticSnapshot = null
        this.notify()
        break
      case 'ping':
      case 'pong':
        break
    }
  }

  private accumulateEvents(state: ViewState): void {
    if (state.phase === 'lobby') return

    const events: readonly GameEvent[] =
      state.phase === 'playing'
        ? (state as PlayingBoardView | PlayingPlayerView).events
        : state.events

    if (events.length === 0) return

    const now = Date.now()
    const newEntries = events.map(event => ({
      event,
      receivedAt: now,
      id: `evt-${eventIdCounter++}`,
    }))

    this.accumulatedEvents = [
      ...this.accumulatedEvents,
      ...newEntries,
    ].slice(-MAX_ACCUMULATED_EVENTS)
  }

  private updateState(next: ViewState): void {
    this.serverSnapshot = next
    this.notify()
  }

  private notify(): void {
    for (const cb of this.listeners) cb()
  }
}

// --- Singleton ---

export const gameStore = new GameStore()

// Expose store snapshot for E2E tests (zero production cost — only in test/development mode)
if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'test')) {
  const w = window as unknown as Record<string, unknown>
  w.__gameStoreSnapshot = () => JSON.parse(JSON.stringify(gameStore.getSnapshot()))
  // Full store for dev-time injection (visual overlay tests, event replay).
  // Guarded by DEV/test mode — tree-shaken from prod bundle.
  w.__gameStore = gameStore
}

// --- Hooks ---

export function useGameState(): ViewState | null {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot)
}

export function useGameSelector<T>(selector: (state: ViewState | null) => T): T {
  const prevRef = useRef<{ value: T; initialized: boolean }>({ value: undefined as T, initialized: false })
  const selectorRef = useRef(selector)
  selectorRef.current = selector

  const getSnapshot = useCallback((): T => {
    const next = selectorRef.current(gameStore.getSnapshot())
    if (prevRef.current.initialized && shallowEqual(prevRef.current.value, next)) {
      return prevRef.current.value
    }
    prevRef.current = { value: next, initialized: true }
    return next
  }, [])

  return useSyncExternalStore(gameStore.subscribe, getSnapshot)
}

export function useLobbyState(): LobbyView | null {
  return useGameSelector(state => {
    if (state?.phase === 'lobby') return state
    return null
  })
}

export function useLastError(): GameError | null {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getLastError)
}

export function useProtocolMismatch(): boolean {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getProtocolMismatch)
}

export function useIsReconnecting(): boolean {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getIsReconnecting)
}

export function useIsOptimisticPending(): boolean {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getIsOptimisticPending)
}
