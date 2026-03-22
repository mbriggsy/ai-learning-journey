import type { ClientGameAction, GameEvent, Phase, SubPhase, PolicyType, ExecutivePower } from './types';

/**
 * Events broadcast to clients with sensitive fields stripped.
 * - investigation-result: `result` removed (only the investigator gets it via PrivateData)
 * - player-executed: `wasMobBoss` removed (revealed only at game-over)
 * All other event types pass through unchanged.
 */
export type SanitizedGameEvent =
  | Omit<Extract<GameEvent, { type: 'investigation-result' }>, 'result'>
  | Omit<Extract<GameEvent, { type: 'player-executed' }>, 'wasMobBoss'>
  | Exclude<GameEvent, { type: 'investigation-result' } | { type: 'player-executed' }>;

// ── Client → Server Messages ───────────────────────────────────────

export type ClientMessage =
  | { type: 'join'; payload: { name: string; sessionToken?: string } }
  | { type: 'action'; payload: ClientGameAction }
  | { type: 'ping'; payload: Record<string, never> }
  | { type: 'kick'; payload: { targetPlayerId: string } }
  | { type: 'start-game'; payload: Record<string, never> }
  | { type: 'reset-to-lobby'; payload: Record<string, never> }
  | { type: 'load-scenario'; payload: { scenario: string } }
  | { type: 'spawn-test-players'; payload: { count?: number } };

// ── Server → Client Messages ───────────────────────────────────────

export type ServerMessage =
  | { type: 'state-update'; payload: HostState | PlayerState | LobbyState }
  | { type: 'private-update'; payload: PrivateData }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string } }
  | { type: 'error'; payload: { code: ErrorCode; message: string } }
  | { type: 'pong'; payload: Record<string, never> }
  | { type: 'room-closed'; payload: Record<string, never> };

export type ErrorCode =
  | 'INVALID_ACTION'
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'ROOM_FULL'
  | 'GAME_STARTED'
  | 'NAME_TAKEN'
  | 'INVALID_NAME'
  | 'INVALID_SESSION'
  | 'SESSION_REPLACED'
  | 'KICKED';

// ── Projected State Types ──────────────────────────────────────────

/** Public player info — NEVER includes role or knownAllies */
export interface PublicPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isMayor: boolean;
  isChief: boolean;
  wasLastMayor: boolean;
  wasLastChief: boolean;
  isConnected: boolean;
}

/** Public player with role revealed (game-over only) */
export interface RevealedPlayer extends PublicPlayer {
  role: string;
}

/** Host/Board View state — the public game board */
export interface HostState {
  phase: Phase;
  subPhase: SubPhase | null;
  round: number;
  players: (PublicPlayer | RevealedPlayer)[];
  nominatedChiefId: string | null;
  goodPoliciesEnacted: number;
  badPoliciesEnacted: number;
  electionTracker: number;
  votes: Record<string, 'approve' | 'block'> | null;
  executivePower: ExecutivePower | null;
  winner: 'citizens' | 'mob' | null;
  winReason: string | null;
  events: SanitizedGameEvent[];
  waitingOnPlayerIds: string[];
}

/** Player View state — extends HostState with personal info */
export interface PlayerState extends HostState {
  myRole: string | null;
  myKnownAllies: string[] | null;
  isMyTurn: boolean;
  hasVoted: boolean;
}

/** Private data sent separately — role reveal, cards, investigation */
export interface PrivateData {
  role?: string;
  knownAllies?: string[];
  /** Which ally is the mob boss (mob soldiers need this to distinguish boss from fellow soldiers). */
  mobBossId?: string;
  mayorCards?: PolicyType[];
  chiefCards?: PolicyType[];
  peekCards?: PolicyType[];
  investigationResult?: { targetId: string; result: 'citizen' | 'mob' };
  /** Sent to the investigated player so they know they've been exposed. */
  wasInvestigated?: { byPlayerName: string };
}

/** Lobby state (before game starts) */
export interface LobbyState {
  phase: 'lobby';
  subPhase: null;
  roomCode: string;
  players: { id: string; name: string; isConnected: boolean }[];
  playerCount: number;
}

// ── Type Guards ──────────────────────────────────────────────────

export function isLobbyState(s: HostState | PlayerState | LobbyState): s is LobbyState {
  return s.phase === 'lobby' && 'roomCode' in s;
}

export function isPlayerState(s: HostState | PlayerState | LobbyState): s is PlayerState {
  return 'myRole' in s;
}

// ── Helpers ────────────────────────────────────────────────────────

export function encodeMessage(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

export function decodeClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.type !== 'string') return null;
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}
