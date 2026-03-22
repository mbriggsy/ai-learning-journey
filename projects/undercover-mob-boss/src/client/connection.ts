import PartySocket from 'partysocket';
import type { ClientMessage, ServerMessage } from '../shared/protocol';
import type { ClientGameAction } from '../shared/types';

const PARTYKIT_HOST = (import.meta as any).env?.VITE_PARTYKIT_HOST ?? 'localhost:1999';
const HEARTBEAT_MS = 15_000;

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

let socket: PartySocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let onMessage: MessageHandler = () => {};
let onStatusChange: StatusHandler = () => {};
let visibilityHandler: (() => void) | null = null;

export function connect(
  roomCode: string,
  handlers: { onMessage: MessageHandler; onStatusChange: StatusHandler },
): void {
  // Clean up any existing connection first
  disconnect();

  onMessage = handlers.onMessage;
  onStatusChange = handlers.onStatusChange;
  onStatusChange('connecting');

  socket = new PartySocket({
    host: PARTYKIT_HOST,
    room: roomCode,
  });

  socket.addEventListener('open', () => {
    onStatusChange('connected');
    startHeartbeat();
  });

  socket.addEventListener('message', (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data) as ServerMessage;
      onMessage(msg);
    } catch {
      // Unparseable message — ignore
    }
  });

  socket.addEventListener('close', () => {
    onStatusChange('reconnecting');
    stopHeartbeat();
  });

  // iOS Safari: reconnect only if socket is actually closed
  // Store reference so we can remove it on disconnect
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && socket && socket.readyState === WebSocket.CLOSED) {
      socket.reconnect();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

export function send(msg: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export function sendAction(action: ClientGameAction): void {
  send({ type: 'action', payload: action });
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    send({ type: 'ping', payload: {} });
  }, HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function disconnect(): void {
  stopHeartbeat();
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}
