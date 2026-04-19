import PartySocket from 'partysocket'
import type { ClientMessage, ServerMessage } from '@shared/protocol'

// --- Types ---

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
type MessageHandler = (msg: ServerMessage) => void
type StatusHandler = (status: ConnectionStatus) => void

// --- Module State ---

let socket: PartySocket | null = null
let status: ConnectionStatus = 'disconnected'
let hasConnectedOnce = false
let currentRoom: string | null = null
let pendingDisconnect: ReturnType<typeof setTimeout> | null = null
const messageHandlers = new Set<MessageHandler>()
const statusHandlers = new Set<StatusHandler>()
const reconnectHandlers = new Set<() => void>()

// --- Public API ---

export function connect(roomCode: string, host: string): void {
  // Cancel any pending disconnect — this is a StrictMode re-mount
  if (pendingDisconnect) {
    clearTimeout(pendingDisconnect)
    pendingDisconnect = null
  }

  // Already connected/connecting to this room — keep the existing socket
  if (socket && currentRoom === roomCode && status !== 'disconnected') return

  if (socket) disconnectImmediate()

  currentRoom = roomCode
  status = 'connecting'
  notifyStatus()

  socket = new PartySocket({
    host,
    room: roomCode,
    party: 'game-room',
  })

  const thisSocket = socket

  socket.addEventListener('open', () => {
    if (socket !== thisSocket) return
    const isReconnect = hasConnectedOnce
    hasConnectedOnce = true
    status = 'connected'
    if (isReconnect) {
      for (const handler of reconnectHandlers) handler()
    }
    notifyStatus()
  })

  socket.addEventListener('close', () => {
    if (socket !== thisSocket) return
    status = 'disconnected'
    notifyStatus()
  })

  socket.addEventListener('message', (event: MessageEvent) => {
    if (typeof event.data !== 'string') return

    let msg: ServerMessage
    try {
      msg = JSON.parse(event.data) as ServerMessage
    } catch {
      return
    }

    // SESSION_REPLACED — halt auto-reconnect
    if (msg.type === 'error' && msg.payload.code === 'SESSION_REPLACED') {
      clearSessionToken(roomCode)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      socket?.close()
      socket = null
      currentRoom = null
      hasConnectedOnce = false
      status = 'disconnected'
      notifyStatus()
      return
    }

    // Respond to server heartbeat immediately
    if (msg.type === 'ping') {
      socket?.send(JSON.stringify({ type: 'pong', payload: {} }))
      return
    }

    for (const handler of messageHandlers) {
      handler(msg)
    }
  })

  // Visibility handler — iOS Safari kills WebSocket on background
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

export function disconnect(): void {
  // Delay disconnect to survive React StrictMode's rapid unmount→remount cycle.
  // If connect() is called within 50ms (StrictMode re-mount), the disconnect is
  // cancelled and the existing socket continues undisturbed.
  if (pendingDisconnect) clearTimeout(pendingDisconnect)
  pendingDisconnect = setTimeout(() => {
    pendingDisconnect = null
    disconnectImmediate()
  }, 50)
}

function disconnectImmediate(): void {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (socket) {
    socket.close()
    socket = null
  }
  currentRoom = null
  hasConnectedOnce = false
  status = 'disconnected'
  notifyStatus()
}

export function send(msg: ClientMessage): void {
  if (!socket || status !== 'connected') return
  socket.send(JSON.stringify(msg))
}

export function getStatus(): ConnectionStatus {
  return status
}

export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler)
  return () => messageHandlers.delete(handler)
}

export function onStatusChange(handler: StatusHandler): () => void {
  statusHandlers.add(handler)
  return () => statusHandlers.delete(handler)
}

export function onReconnect(handler: () => void): () => void {
  reconnectHandlers.add(handler)
  return () => reconnectHandlers.delete(handler)
}

// --- Session Token ---
//
// Session tokens live in sessionStorage, NOT localStorage. Rationale: localStorage
// is shared across all tabs on the same origin, so the dev launcher (which opens
// one tab per player) ends up with every tab overwriting the same key — the last
// tab to join wins, and every other tab that later refreshes and tries to
// reconnect ends up resolving to the wrong player's sessionToken → wrong playerId
// → broken projection (isMyTurn=false, wrong hand, etc.). sessionStorage is
// per-tab by design, survives refreshes, and isolates each dev-launcher tab.
// Tradeoff: a real player who fully closes their tab loses their session and
// cannot reconnect mid-game — an accepted edge case for a realtime party game.

export function getSessionToken(roomCode: string): string | null {
  try {
    return sessionStorage.getItem(`burned-session-${roomCode}`)
  } catch {
    return null
  }
}

export function setSessionToken(roomCode: string, token: string): void {
  try {
    sessionStorage.setItem(`burned-session-${roomCode}`, token)
  } catch {
    // sessionStorage unavailable — tolerate
  }
}

export function clearSessionToken(roomCode: string): void {
  try {
    sessionStorage.removeItem(`burned-session-${roomCode}`)
  } catch {
    // sessionStorage unavailable — tolerate
  }
}

// --- Internal ---

function notifyStatus(): void {
  for (const handler of statusHandlers) {
    handler(status)
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible' && socket) {
    // iOS Safari kills WebSocket on background without firing close event.
    // Reconnect if socket is anything other than OPEN (CLOSED, CLOSING, or stale CONNECTING).
    if (socket.readyState !== WebSocket.OPEN) {
      hasConnectedOnce = true // ensure next open is treated as reconnect
      socket.reconnect()
    }
  }
}
