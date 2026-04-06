import { useSyncExternalStore, useRef, useCallback } from 'react'
import type {
  ServerMessage, LobbyView, BoardView, PlayerView, PrivateData, ErrorCode,
  PlayingBoardView, PlayingPlayerView,
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
const EVENT_TTL_MS = 30_000

class GameStore {
  private serverSnapshot: ViewState | null = null
  private optimisticTransform: ((s: ViewState) => ViewState) | null = null
  private privateData: PrivateData = {}
  private playerId: string | null = null
  private lastError: GameError | null = null
  private listeners = new Set<Listener>()
  private accumulatedEvents: AccumulatedEvent[] = []

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  getSnapshot = (): ViewState | null => {
    if (this.optimisticTransform && this.serverSnapshot) {
      return this.optimisticTransform(this.serverSnapshot)
    }
    return this.serverSnapshot
  }

  getServerSnapshot = (): ViewState | null => this.serverSnapshot
  getPrivateData = (): PrivateData => this.privateData
  getPlayerId = (): string | null => this.playerId
  getLastError = (): GameError | null => this.lastError
  getAccumulatedEvents = (): readonly AccumulatedEvent[] => this.accumulatedEvents

  setPlayerId(id: string): void {
    this.playerId = id
  }

  applyOptimistic(transform: (s: ViewState) => ViewState): void {
    this.optimisticTransform = transform
    this.notify()
  }

  clearOptimistic(): void {
    if (this.optimisticTransform === null) return
    this.optimisticTransform = null
    this.notify()
  }

  handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'state-update':
        this.lastError = null
        this.accumulateEvents(msg.payload)
        this.optimisticTransform = null
        this.updateState(msg.payload)
        break
      case 'player-update':
        this.lastError = null
        this.accumulateEvents(msg.payload.state)
        this.optimisticTransform = null
        this.updateState(msg.payload.state)
        this.privateData = msg.payload.private
        break
      case 'joined':
        this.playerId = msg.payload.playerId
        this.notify()
        break
      case 'error':
        this.lastError = msg.payload
        this.optimisticTransform = null
        this.notify()
        break
      case 'action-rejected':
        this.optimisticTransform = null
        this.notify()
        break
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
      ...this.accumulatedEvents.filter(e => now - e.receivedAt < EVENT_TTL_MS),
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

export function useConnectionPlayerId(): string | null {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getPlayerId)
}

export function useLastError(): GameError | null {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getLastError)
}
