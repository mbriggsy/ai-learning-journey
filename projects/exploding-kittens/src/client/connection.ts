import PartySocket from 'partysocket'
import type { ClientMessage, ServerMessage } from '@shared/protocol'

// --- Types ---

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
type MessageHandler = (msg: ServerMessage) => void
type StatusHandler = (status: ConnectionStatus) => void

// --- Module State ---

let socket: PartySocket | null = null
let status: ConnectionStatus = 'disconnected'
const messageHandlers = new Set<MessageHandler>()
const statusHandlers = new Set<StatusHandler>()

// --- Public API ---

export function connect(roomCode: string, host: string): void {
  if (socket) disconnect()

  status = 'connecting'
  notifyStatus()

  socket = new PartySocket({
    host,
    room: roomCode,
    party: 'main',
  })

  socket.addEventListener('open', () => {
    status = 'connected'
    notifyStatus()
  })

  socket.addEventListener('close', () => {
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
      socket?.close()
      socket = null
      status = 'disconnected'
      notifyStatus()
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
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (socket) {
    socket.close()
    socket = null
  }
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

// --- Session Token ---

export function getSessionToken(roomCode: string): string | null {
  try {
    return localStorage.getItem(`ek-session-${roomCode}`)
  } catch {
    return null
  }
}

export function setSessionToken(roomCode: string, token: string): void {
  try {
    localStorage.setItem(`ek-session-${roomCode}`, token)
  } catch {
    // localStorage unavailable — tolerate
  }
}

export function clearSessionToken(roomCode: string): void {
  try {
    localStorage.removeItem(`ek-session-${roomCode}`)
  } catch {
    // localStorage unavailable — tolerate
  }
}

// --- Internal ---

function notifyStatus(): void {
  for (const handler of statusHandlers) {
    handler(status)
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible' && socket && socket.readyState === WebSocket.CLOSED) {
    socket.reconnect()
  }
}
