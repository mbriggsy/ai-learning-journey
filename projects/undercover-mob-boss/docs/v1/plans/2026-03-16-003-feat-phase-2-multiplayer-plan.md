---
title: "Phase 2: Multiplayer — PartyKit Rooms, State Sync, Reconnection"
type: feat
status: active
date: 2026-03-16
phase: 2
deepened: true
---

# Phase 2: Multiplayer

## Overview

Wire the Phase 1 game engine to PartyKit for real-time multiplayer. The PartyKit room is the authoritative server — it receives player actions via WebSocket, calls `dispatch(state, action)` on the engine, projects state per-client (stripping private data), and broadcasts updates. This phase covers room lifecycle, message protocol, player identity/reconnection, action authorization, state projection, timers, and QR code generation.

## Problem Statement / Motivation

The game engine is a pure function with no I/O. Players need to interact with it from their phones in real-time. PartyKit provides ephemeral rooms on Cloudflare's edge with WebSocket support — purpose-built for this use case. This phase bridges the engine to the network.

## Proposed Solution

### Architecture

```
Host browser ──WebSocket──┐
Player 1 phone ──WebSocket──┤
Player 2 phone ──WebSocket──┼── PartyKit Room (Durable Object)
...                         │     └── GameState (in-memory)
Player N phone ──WebSocket──┘     └── dispatch(state, action)
```

PartyKit room = single-threaded Durable Object. All messages processed sequentially — no race conditions.

### Message Protocol (`src/shared/protocol.ts`)

JSON messages with `{ type: string, payload: object }` envelope.

**Concrete protocol types:**

```typescript
// src/shared/protocol.ts

import type { GameAction, GameEvent, Phase, SubPhase, PolicyType, ExecutivePower } from './types';

// ---- Client → Server Messages ----

type ClientMessage =
  | { type: 'join'; payload: { name: string; sessionToken?: string } }
  | { type: 'action'; payload: GameAction }
  | { type: 'ping'; payload: Record<string, never> }
  | { type: 'kick'; payload: { targetPlayerId: string } }
  | { type: 'start-game'; payload: Record<string, never> }
  | { type: 'reset-to-lobby'; payload: Record<string, never> };

// ---- Server → Client Messages ----

type ServerMessage =
  | { type: 'state-update'; payload: HostState | PlayerState }
  | { type: 'private-update'; payload: PrivateData }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string } }
  | { type: 'error'; payload: { code: ErrorCode; message: string } }
  | { type: 'player-timeout'; payload: { playerId: string; autoAction: string } }
  | { type: 'pong'; payload: Record<string, never> }
  | { type: 'room-closed'; payload: Record<string, never> };

type ErrorCode =
  | 'INVALID_ACTION'
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'ROOM_FULL'
  | 'GAME_STARTED'
  | 'NAME_TAKEN'
  | 'INVALID_SESSION';

// ---- Projected State Types ----

/** Public player info — NEVER includes role or knownAllies */
interface PublicPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isMayor: boolean;
  isChief: boolean;
  wasLastMayor: boolean;
  wasLastChief: boolean;
  isConnected: boolean;
}

/** Host/Board View state — the public game board */
interface HostState {
  phase: Phase;
  subPhase: SubPhase | null;
  round: number;
  players: PublicPlayer[];
  nominatedChiefId: string | null;
  goodPoliciesEnacted: number;
  badPoliciesEnacted: number;
  electionTracker: number;
  votes: Record<string, 'approve' | 'block'> | null; // null until reveal
  executivePower: ExecutivePower | null;
  winner: 'citizens' | 'mob' | null;
  winReason: string | null;
  events: GameEvent[];
}

/** Player View state — extends HostState with personal info */
interface PlayerState extends HostState {
  myRole: string | null;           // own role only
  myKnownAllies: string[] | null;  // own allies only
  isMyTurn: boolean;               // whether this player needs to act
  hasVoted: boolean;               // whether this player has already voted
}

/** Private data sent separately — role reveal, cards, investigation */
interface PrivateData {
  role?: string;
  knownAllies?: string[];
  mayorCards?: PolicyType[];
  chiefCards?: PolicyType[];
  investigationResult?: { targetId: string; result: 'citizen' | 'mob' };
}

// ---- Helpers ----

function encodeMessage(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

function decodeClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.type !== 'string') return null;
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

export type {
  ClientMessage, ServerMessage, ErrorCode,
  HostState, PlayerState, PublicPlayer, PrivateData,
};
export { encodeMessage, decodeClientMessage };
```

**Client → Server:**

| Type | Payload | Who Can Send | When |
|---|---|---|---|
| `join` | `{ name: string, sessionToken?: string }` | Anyone | Lobby (new join or reconnect) |
| `action` | `GameAction` (from Phase 1) | Assigned player | During game, per phase rules |
| `ping` | `{}` | Any connected client | Anytime (heartbeat) |
| `kick` | `{ targetPlayerId: string }` | Host only | Lobby only |
| `start-game` | `{}` | Host only | Lobby, 5+ players |
| `reset-to-lobby` | `{}` | Host only | Game-over phase |

**Server → Client:**

| Type | Payload | Sent To | When |
|---|---|---|---|
| `state-update` | `ProjectedState` | All clients (per-client projection) | After every state change |
| `private-update` | `{ role, knownAllies, cards?, investigationResult? }` | Specific player | Role reveal, policy session, investigation |
| `joined` | `{ playerId: string, sessionToken: string }` | Joining client | On successful join |
| `error` | `{ code: string, message: string }` | Offending client | On invalid action or protocol error |
| `player-timeout` | `{ playerId: string, autoAction: string }` | All clients | When timeout triggers auto-action |
| `pong` | `{}` | Pinging client | Response to ping |
| `room-closed` | `{}` | All clients | Room self-destruct |

Error codes: `INVALID_ACTION`, `WRONG_PHASE`, `NOT_YOUR_TURN`, `ROOM_FULL`, `GAME_STARTED`, `NAME_TAKEN`, `INVALID_SESSION`.

### State Projection (`src/server/projection.ts`)

Three projection functions — security critical. Full projected state sent on every update (state < 5KB, < 10 clients).

**`projectStateForHost(state: GameState): HostState`**
Includes: phase, subPhase, round, players (name, isAlive, isMayor, isChief, connected status — NO roles), goodPoliciesEnacted, badPoliciesEnacted, electionTracker, votes (after reveal only), winner, winReason, events, nominatedChiefId.

**`projectStateForPlayer(state: GameState, playerId: string): PlayerState`**
Includes: everything in HostState PLUS own role, own knownAllies, own cards (mayorCards if Mayor during policy session, chiefCards if Chief), own investigation results received, vetoProposed status (if Chief/Mayor during veto), whether it's your turn to act.

**`projectStateForBoardView(state: GameState): BoardViewState`**
Same as HostState. Board View is a client-side toggle — not a separate connection.

**NEVER sent to any client:** `policyDeck`, `policyDiscard`, `reshuffleThreshold`, other players' roles/knownAllies, cards belonging to other players.

**Concrete projection functions:**

```typescript
// src/server/projection.ts

import type { GameState, Player } from '../shared/types';
import type { HostState, PlayerState, PublicPlayer, PrivateData } from '../shared/protocol';

/**
 * SECURITY-CRITICAL: Allowlist-based projection.
 * Every field is EXPLICITLY included. If a new field is added to GameState,
 * it is excluded by default until explicitly added here.
 */

function projectPlayer(player: Player, connected: boolean): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    isAlive: player.isAlive,
    isMayor: player.isMayor,
    isChief: player.isChief,
    wasLastMayor: player.wasLastMayor,
    wasLastChief: player.wasLastChief,
    isConnected: connected,
    // OMITTED: role, knownAllies
  };
}

/** Roles revealed ONLY at game-over */
function projectPlayerGameOver(player: Player, connected: boolean): PublicPlayer & { role: string } {
  return {
    ...projectPlayer(player, connected),
    role: player.role,
  };
}

export function projectStateForHost(
  state: GameState,
  connectionStatus: Map<string, boolean>,
): HostState {
  const isGameOver = state.phase === 'game-over';

  return {
    phase: state.phase,
    subPhase: state.subPhase,
    round: state.round,
    players: state.players.map((p) =>
      isGameOver
        ? projectPlayerGameOver(p, connectionStatus.get(p.id) ?? false)
        : projectPlayer(p, connectionStatus.get(p.id) ?? false)
    ),
    nominatedChiefId: state.nominatedChiefId,
    goodPoliciesEnacted: state.goodPoliciesEnacted,
    badPoliciesEnacted: state.badPoliciesEnacted,
    electionTracker: state.electionTracker,
    // Votes only visible after reveal (election-result subPhase)
    votes: state.subPhase === 'election-result' ? state.votes : null,
    executivePower: state.executivePower,
    winner: state.winner,
    winReason: state.winReason,
    events: state.events,
    // OMITTED: policyDeck, policyDiscard, reshuffleThreshold,
    //          mayorCards, chiefCards, vetoProposed, investigationHistory,
    //          specialNominatedMayorId, rngSeed
  };
}

export function projectStateForPlayer(
  state: GameState,
  playerId: string,
  connectionStatus: Map<string, boolean>,
): PlayerState {
  const hostState = projectStateForHost(state, connectionStatus);
  const player = state.players.find((p) => p.id === playerId);

  return {
    ...hostState,
    myRole: player?.role ?? null,
    myKnownAllies: player?.knownAllies ?? null,
    isMyTurn: isPlayersTurn(state, playerId),
    hasVoted: state.votes[playerId] != null,
  };
}

/** Determine if this player needs to take action right now. */
function isPlayersTurn(state: GameState, playerId: string): boolean {
  const mayor = state.players[state.mayorIndex];
  const chief = state.players.find((p) => p.id === state.nominatedChiefId);

  switch (state.subPhase) {
    case 'nomination-pending':
      return mayor?.id === playerId;
    case 'election-voting':
      return state.votes[playerId] == null;
    case 'policy-mayor-discard':
      return mayor?.id === playerId;
    case 'policy-chief-discard':
      return chief?.id === playerId;
    case 'policy-veto-response':
      return mayor?.id === playerId;
    case 'executive-power-pending':
      return chief?.id === playerId;
    default:
      return false;
  }
}

/** Build private data for a specific player (sent as separate message). */
export function getPrivateData(
  state: GameState,
  playerId: string,
): PrivateData | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;

  const data: PrivateData = {};
  const mayor = state.players[state.mayorIndex];
  const chief = state.players.find((p) => p.id === state.nominatedChiefId);

  // Role and allies (always available after role-reveal)
  if (state.phase !== 'lobby') {
    data.role = player.role;
    data.knownAllies = player.knownAllies;
  }

  // Mayor's cards (only during their discard phase)
  if (state.subPhase === 'policy-mayor-discard' && mayor?.id === playerId) {
    data.mayorCards = state.mayorCards ?? undefined;
  }

  // Chief's cards (only during their discard phase or veto)
  if (
    (state.subPhase === 'policy-chief-discard' || state.subPhase === 'policy-veto-response') &&
    chief?.id === playerId
  ) {
    data.chiefCards = state.chiefCards ?? undefined;
  }

  // Latest investigation result (only for the investigating chief)
  const latestInvestigation = state.investigationHistory.at(-1);
  if (latestInvestigation && latestInvestigation.investigatorId === playerId) {
    data.investigationResult = {
      targetId: latestInvestigation.targetId,
      result: latestInvestigation.result,
    };
  }

  return Object.keys(data).length > 0 ? data : null;
}
```

### Player Identity & Reconnection

- On first join: server generates a UUID session token, sends it back in `joined` message
- Client stores token in `sessionStorage`
- On reconnect: client sends `{ type: 'join', name, sessionToken }` — server matches token to existing player
- Server maintains `Map<WebSocket, { playerId, sessionToken, clientType }>` for all connections
- **Latest connection wins** — if a player opens a second tab, the previous connection is closed
- Session tokens are ephemeral (in-memory only) — if the room resets, tokens are invalidated

### Action Authorization

Server-side enforcement in `room.ts`:

1. Look up `playerId` from `connectionMap.get(ws)`
2. Inject `playerId` into the action — ignore any client-provided `playerId`
3. Validate the action is legal for this player in the current phase:
   - Only the current Mayor can send `nominate`
   - Only the current Mayor can send `mayor-discard`
   - Only the current Chief can send `chief-discard`, `propose-veto`, `investigate`, `special-nominate`, `execute`
   - Only alive players can send `vote`
   - Only alive players can send any action
   - Only the host connection can send `start-game`, `kick`, `reset-to-lobby`
4. If validation fails, send `error` message to the client — do not dispatch

### Timer System

Timers prevent deadlocks from disconnected or AFK players. Implemented server-side using PartyKit's `onAlarm()`.

| Phase | Duration | Auto-Action on Timeout |
|---|---|---|
| Nomination | 90s | Mayoralty passes to next player, election tracker advances |
| Vote | 30s | Missing votes counted as `block` |
| Mayor discard | 30s | Random card discarded |
| Chief discard | 30s | Random card discarded (or enacted) |
| Veto response | 15s | Veto rejected (Mayor's silence = refusal) |
| Executive power | 60s | Random valid target selected |

On timeout: server dispatches the auto-action, broadcasts `player-timeout` event, then normal state update. Timer resets when the expected player takes action or reconnects.

### Room Lifecycle

**Creation:** Host hits "Create Game" → PartyKit creates room → generates 4-letter room code.

**Room code format:** 4 uppercase letters (A-Z excluding O and I = 24 chars). Case-insensitive matching. 24^4 = 331,776 possible codes. No collision check needed at launch scale.

**Lobby:** Players join via code or QR. Host sees player list, can kick players. Start button enabled at 5+ players.

**Active game:** All actions flow through `dispatch()`. State broadcast after each action. Timers running.

**Game over:** Roles revealed to all. Host can trigger `reset-to-lobby` (same room, same connections, new game) or players just leave.

**Self-destruct:** If no clients connected for 30 minutes, room destroys itself via `onAlarm()`.

**Play again flow:** `reset-to-lobby` clears game state, keeps player list and connections, generates new session tokens, returns to lobby. Existing players do NOT need to rescan QR.

### QR Code Generation

- Client-side generation using `qrcode` npm package (lightweight, no server dependency)
- Encodes join URL: `https://<domain>/join/<ROOM_CODE>`
- Displayed on host lobby screen
- Medium error correction level (L/M)
- SVG output for crisp rendering at any size

### Concrete PartyKit Room Class

```typescript
// src/server/room.ts

import type * as Party from 'partykit/server';
import { dispatch, createGame } from './game/phases';
import { projectStateForHost, projectStateForPlayer, getPrivateData } from './projection';
import type { GameState } from '../shared/types';
import type { ClientMessage, ServerMessage, ErrorCode } from '../shared/protocol';
import { decodeClientMessage } from '../shared/protocol';

// ---- Room code alphabet (no O, I to avoid confusion) ----
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 chars

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// ---- Connection metadata ----
interface ConnectionMeta {
  playerId: string;
  sessionToken: string;
  isHost: boolean;
}

// ---- Timer constants (configurable) ----
const TIMER_DURATIONS: Record<string, number> = {
  'nomination-pending':       90_000,
  'election-voting':          30_000,
  'policy-mayor-discard':     30_000,
  'policy-chief-discard':     30_000,
  'policy-veto-response':     15_000,
  'executive-power-pending':  60_000,
  'role-reveal-waiting':      60_000,
};

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL_MS = 15_000;

export default class UMBRoom implements Party.Server {
  private gameState: GameState | null = null;
  private roomCode: string;
  private connections = new Map<Party.Connection, ConnectionMeta>();
  private playerSessions = new Map<string, string>(); // sessionToken → playerId
  private playerNames: string[] = [];
  private hostConnection: Party.Connection | null = null;
  private activeTimerSubPhase: string | null = null;

  constructor(readonly room: Party.Room) {
    this.roomCode = generateRoomCode();
  }

  // ---- Lifecycle: Connection ----

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): void {
    // Connection established but not yet joined — wait for 'join' message
  }

  onClose(conn: Party.Connection): void {
    const meta = this.connections.get(conn);
    this.connections.delete(conn);

    if (meta) {
      // Update connection status and broadcast
      this.broadcastState();

      // If no connections remain, schedule self-destruct
      if (this.connections.size === 0) {
        this.room.storage.setAlarm(Date.now() + IDLE_TIMEOUT_MS);
      }
    }
  }

  // ---- Lifecycle: Messages ----

  onMessage(rawMessage: string, sender: Party.Connection): void {
    const msg = decodeClientMessage(rawMessage);
    if (!msg) {
      this.sendError(sender, 'INVALID_ACTION', 'Malformed message');
      return;
    }

    switch (msg.type) {
      case 'join':
        this.handleJoin(sender, msg.payload);
        break;
      case 'ping':
        this.send(sender, { type: 'pong', payload: {} });
        break;
      case 'start-game':
        this.handleStartGame(sender);
        break;
      case 'kick':
        this.handleKick(sender, msg.payload.targetPlayerId);
        break;
      case 'reset-to-lobby':
        this.handleResetToLobby(sender);
        break;
      case 'action':
        this.handleGameAction(sender, msg.payload);
        break;
    }
  }

  // ---- Lifecycle: Alarm (timers + self-destruct) ----

  onAlarm(): void {
    // Self-destruct if no connections
    if (this.connections.size === 0) {
      this.broadcast({ type: 'room-closed', payload: {} });
      return; // Room will be garbage collected
    }

    // Phase timer expired — auto-act
    if (this.gameState && this.activeTimerSubPhase) {
      this.handleTimerExpiry();
    }
  }

  // ---- Join Handler ----

  private handleJoin(
    conn: Party.Connection,
    payload: { name: string; sessionToken?: string },
  ): void {
    const { name, sessionToken } = payload;

    // Reconnect attempt?
    if (sessionToken && this.playerSessions.has(sessionToken)) {
      const playerId = this.playerSessions.get(sessionToken)!;

      // Close any existing connection for this player (latest wins)
      for (const [existingConn, meta] of this.connections) {
        if (meta.playerId === playerId && existingConn !== conn) {
          existingConn.close();
          this.connections.delete(existingConn);
        }
      }

      this.connections.set(conn, {
        playerId,
        sessionToken,
        isHost: conn === this.hostConnection,
      });

      this.send(conn, { type: 'joined', payload: { playerId, sessionToken } });
      this.broadcastState();

      // Reset timer if this player was the one being waited on
      this.resetTimerIfNeeded();
      return;
    }

    // New join — validate
    if (this.gameState && this.gameState.phase !== 'lobby') {
      this.sendError(conn, 'GAME_STARTED', 'Game already in progress');
      return;
    }

    if (this.playerNames.length >= 10) {
      this.sendError(conn, 'ROOM_FULL', 'Room is full (max 10 players)');
      return;
    }

    const nameExists = this.playerNames.some(
      (n) => n.toLowerCase() === name.toLowerCase(),
    );
    if (nameExists) {
      this.sendError(conn, 'NAME_TAKEN', `Name "${name}" is already taken`);
      return;
    }

    // Create player
    const playerId = crypto.randomUUID();
    const newToken = crypto.randomUUID();
    const isHost = this.connections.size === 0; // First connection is host

    this.playerNames.push(name);
    this.playerSessions.set(newToken, playerId);
    this.connections.set(conn, { playerId, sessionToken: newToken, isHost });

    if (isHost) this.hostConnection = conn;

    this.send(conn, { type: 'joined', payload: { playerId, sessionToken: newToken } });
    this.broadcastState();
  }

  // ---- Game Action Handler ----

  private handleGameAction(sender: Party.Connection, action: any): void {
    if (!this.gameState) {
      this.sendError(sender, 'INVALID_ACTION', 'No active game');
      return;
    }

    const meta = this.connections.get(sender);
    if (!meta) {
      this.sendError(sender, 'INVALID_ACTION', 'Not joined');
      return;
    }

    // SECURITY: Inject playerId from connection map — never trust client
    const authorizedAction = { ...action, playerId: meta.playerId };

    // Authorization check
    const authError = this.checkAuthorization(meta, authorizedAction);
    if (authError) {
      this.sendError(sender, authError.code, authError.message);
      return;
    }

    try {
      this.gameState = dispatch(this.gameState, authorizedAction);
      this.broadcastState();
      this.broadcastPrivateData();
      this.schedulePhaseTimer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.sendError(sender, 'INVALID_ACTION', msg);
    }
  }

  // ---- Authorization ----

  private checkAuthorization(
    meta: ConnectionMeta,
    action: any,
  ): { code: ErrorCode; message: string } | null {
    if (!this.gameState) return { code: 'INVALID_ACTION', message: 'No game' };

    const player = this.gameState.players.find((p) => p.id === meta.playerId);
    if (!player?.isAlive && action.type !== 'acknowledge-role') {
      return { code: 'INVALID_ACTION', message: 'Dead players cannot act' };
    }

    const mayor = this.gameState.players[this.gameState.mayorIndex];
    const chief = this.gameState.players.find(
      (p) => p.id === this.gameState!.nominatedChiefId,
    );

    const mayorOnly = ['nominate', 'mayor-discard', 'veto-response'];
    const chiefOnly = ['chief-discard', 'propose-veto', 'investigate', 'special-nominate', 'execute'];

    if (mayorOnly.includes(action.type) && mayor?.id !== meta.playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Only the Mayor can do this' };
    }

    if (chiefOnly.includes(action.type) && chief?.id !== meta.playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Only the Police Chief can do this' };
    }

    return null; // Authorized — dispatch() does further phase validation
  }

  // ---- Timer Management ----

  private schedulePhaseTimer(): void {
    if (!this.gameState?.subPhase) return;

    const duration = TIMER_DURATIONS[this.gameState.subPhase];
    if (!duration) {
      this.activeTimerSubPhase = null;
      return;
    }

    this.activeTimerSubPhase = this.gameState.subPhase;
    this.room.storage.setAlarm(Date.now() + duration);
  }

  private handleTimerExpiry(): void {
    if (!this.gameState) return;

    // Build auto-action based on current subPhase
    const autoAction = this.buildAutoAction();
    if (!autoAction) return;

    // Broadcast timeout event
    this.broadcast({
      type: 'player-timeout',
      payload: { playerId: autoAction.playerId ?? 'system', autoAction: autoAction.type },
    });

    try {
      this.gameState = dispatch(this.gameState, autoAction);
      this.broadcastState();
      this.broadcastPrivateData();
      this.schedulePhaseTimer();
    } catch {
      // Timer auto-action failed — schedule retry
    }
  }

  private buildAutoAction(): any | null {
    if (!this.gameState) return null;
    const state = this.gameState;
    const mayor = state.players[state.mayorIndex];

    switch (state.subPhase) {
      case 'nomination-pending':
        // Skip this mayor — advance to next
        return null; // Handled specially: advance mayor, increment tracker
      case 'election-voting':
        // Fill missing votes as 'block'
        for (const p of state.players) {
          if (p.isAlive && state.votes[p.id] == null) {
            return { type: 'vote', playerId: p.id, vote: 'block' };
          }
        }
        return null;
      case 'policy-mayor-discard':
        return { type: 'mayor-discard', playerId: mayor.id, cardIndex: 0 };
      case 'policy-chief-discard': {
        const chief = state.players.find((p) => p.id === state.nominatedChiefId);
        return { type: 'chief-discard', playerId: chief?.id, cardIndex: 0 };
      }
      case 'policy-veto-response':
        return { type: 'veto-response', playerId: mayor.id, approved: false };
      case 'executive-power-pending': {
        const chief = state.players.find((p) => p.isChief);
        const target = state.players.find(
          (p) => p.isAlive && p.id !== chief?.id,
        );
        if (!chief || !target) return null;
        const power = state.executivePower;
        if (power === 'investigate') return { type: 'investigate', playerId: chief.id, targetId: target.id };
        if (power === 'special-nomination') return { type: 'special-nominate', playerId: chief.id, targetId: target.id };
        if (power === 'execution') return { type: 'execute', playerId: chief.id, targetId: target.id };
        return null;
      }
      default:
        return null;
    }
  }

  private resetTimerIfNeeded(): void {
    if (this.activeTimerSubPhase && this.gameState?.subPhase === this.activeTimerSubPhase) {
      this.schedulePhaseTimer(); // Reschedule with full duration
    }
  }

  // ---- Start Game ----

  private handleStartGame(sender: Party.Connection): void {
    const meta = this.connections.get(sender);
    if (!meta?.isHost) {
      this.sendError(sender, 'INVALID_ACTION', 'Only host can start');
      return;
    }

    if (this.playerNames.length < 5) {
      this.sendError(sender, 'INVALID_ACTION', 'Need at least 5 players');
      return;
    }

    // Build player name list from sessions
    const names = [...this.connections.values()]
      .filter((m) => !m.isHost || this.playerNames.length <= 10)
      .map((m) => {
        // Find name by playerId
        return this.playerNames[
          [...this.playerSessions.values()].indexOf(m.playerId)
        ];
      })
      .filter(Boolean);

    this.gameState = createGame(names);
    this.broadcastState();
    this.broadcastPrivateData();
    this.schedulePhaseTimer();
  }

  // ---- Kick ----

  private handleKick(sender: Party.Connection, targetPlayerId: string): void {
    const meta = this.connections.get(sender);
    if (!meta?.isHost) return;
    if (this.gameState && this.gameState.phase !== 'lobby') return;

    for (const [conn, m] of this.connections) {
      if (m.playerId === targetPlayerId) {
        this.sendError(conn, 'INVALID_ACTION', 'You have been kicked');
        conn.close();
        this.connections.delete(conn);
        this.playerSessions.delete(m.sessionToken);
        break;
      }
    }
    this.broadcastState();
  }

  // ---- Reset to Lobby ----

  private handleResetToLobby(sender: Party.Connection): void {
    const meta = this.connections.get(sender);
    if (!meta?.isHost) return;
    if (this.gameState?.phase !== 'game-over') return;

    this.gameState = null;
    // Keep connections and player names, regenerate session tokens
    const newSessions = new Map<string, string>();
    for (const [conn, m] of this.connections) {
      const newToken = crypto.randomUUID();
      newSessions.set(newToken, m.playerId);
      m.sessionToken = newToken;
      this.send(conn, { type: 'joined', payload: { playerId: m.playerId, sessionToken: newToken } });
    }
    this.playerSessions = newSessions;
    this.broadcastState();
  }

  // ---- Broadcasting ----

  private broadcastState(): void {
    const connectionStatus = this.getConnectionStatus();

    for (const [conn, meta] of this.connections) {
      if (meta.isHost) {
        const hostState = this.gameState
          ? projectStateForHost(this.gameState, connectionStatus)
          : this.getLobbyState(connectionStatus);
        this.send(conn, { type: 'state-update', payload: hostState });
      } else {
        const playerState = this.gameState
          ? projectStateForPlayer(this.gameState, meta.playerId, connectionStatus)
          : this.getLobbyState(connectionStatus);
        this.send(conn, { type: 'state-update', payload: playerState });
      }
    }
  }

  private broadcastPrivateData(): void {
    if (!this.gameState) return;
    for (const [conn, meta] of this.connections) {
      const priv = getPrivateData(this.gameState, meta.playerId);
      if (priv) {
        this.send(conn, { type: 'private-update', payload: priv });
      }
    }
  }

  private getConnectionStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    const connectedIds = new Set(
      [...this.connections.values()].map((m) => m.playerId),
    );
    if (this.gameState) {
      for (const p of this.gameState.players) {
        status.set(p.id, connectedIds.has(p.id));
      }
    }
    return status;
  }

  private getLobbyState(connectionStatus: Map<string, boolean>): any {
    return {
      phase: 'lobby',
      subPhase: null,
      roomCode: this.roomCode,
      players: [...this.connections.values()].map((m) => ({
        id: m.playerId,
        name: this.playerNames[
          [...this.playerSessions.values()].indexOf(m.playerId)
        ] ?? 'Unknown',
        isConnected: true,
      })),
      playerCount: this.connections.size,
    };
  }

  // ---- Helpers ----

  private send(conn: Party.Connection, msg: ServerMessage): void {
    conn.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMessage): void {
    const raw = JSON.stringify(msg);
    for (const conn of this.connections.keys()) {
      conn.send(raw);
    }
  }

  private sendError(conn: Party.Connection, code: ErrorCode, message: string): void {
    this.send(conn, { type: 'error', payload: { code, message } });
  }
}
```

### File Structure

| File | Purpose |
|---|---|
| `src/server/room.ts` | PartyKit room class — onConnect, onMessage, onClose, onAlarm |
| `src/server/projection.ts` | State projection functions (security-critical) |
| `src/shared/protocol.ts` | Message type definitions (client↔server contract) |

### Dependencies

- `partykit` — PartyKit SDK and dev server (`partykit.json` config in Phase 6 plan)
- `partysocket` — PartyKit client SDK (auto-reconnect, used by Phases 3/4)
- `qrcode` — QR code generation (client-side, used by Phase 4)
- `crypto.randomUUID()` — session token generation (native Web Crypto API, no dependency needed)

## Technical Considerations

- **PartyKit Durable Objects are single-threaded** — no race conditions from concurrent messages. Messages are processed one at a time in order received.
- **State projection is security-critical** — a single leaked field (like `policyDeck` or another player's `role`) breaks the game. Projection functions must be allowlist-based (explicitly include fields), NOT blocklist-based (strip fields).
- **Full state on every update** — simple, idempotent, reconnection-friendly. State is small enough that bandwidth is irrelevant.
- **Events are embedded in the state update** — `events` array cleared each dispatch, sent with the state. Reconnecting clients don't need event replay — they get current state.
- **iOS Safari aggressively kills background WebSocket connections** — the heartbeat ping/pong system (every 15s) keeps connections alive. On reconnect, full state is re-sent.

## Acceptance Criteria

### Room Lifecycle
- [ ] PartyKit room creates on demand with unique room code
- [ ] Room code is 4 uppercase letters (no O, I), case-insensitive
- [ ] Room self-destructs after 30 minutes with no connections
- [ ] `reset-to-lobby` returns to lobby state with same players connected
- [ ] Host can kick players from lobby

### Player Join
- [ ] Players join via room code (manual entry)
- [ ] QR code generated on host lobby screen, encodes join URL
- [ ] Server rejects: room full (>10), game started, duplicate name
- [ ] Session token returned on join, stored in sessionStorage

### Reconnection
- [ ] Player reconnects with session token → matched to existing player
- [ ] Host reconnect preserves game state
- [ ] Full projected state sent on reconnect
- [ ] Latest connection wins (duplicate tab closes previous)

### State Sync
- [ ] All state changes propagate to all clients within 200ms (same-room, same-network)
- [ ] Each client receives only their projected state (no private data leaks)
- [ ] Host never sees any player's role
- [ ] Player never sees other players' roles, cards, or deck contents
- [ ] Events broadcast with state update for narrator/animation triggers

### Authorization
- [ ] Server derives playerId from connection map — ignores client-provided values
- [ ] Only Mayor can nominate, only Chief can discard/use powers
- [ ] Only alive players can vote or take actions
- [ ] Only host can start game, kick, reset
- [ ] Invalid actions return descriptive error messages

### Timers
- [ ] Each phase has a timeout that triggers auto-action
- [ ] Timeout broadcasts `player-timeout` event before auto-action
- [ ] Timer resets when expected player acts or reconnects
- [ ] All timer durations configurable (server-side constants)

### Testing
- [ ] Unit tests for state projection (verify no private data leaks)
- [ ] Unit tests for authorization (verify only correct player can act)
- [ ] Integration test: full game flow with simulated WebSocket clients
- [ ] Test: player disconnect during each phase → timer fires → game continues
- [ ] Test: host disconnect → reconnect → state preserved

## Success Metrics

- Two simulated clients can complete a full game via WebSocket messages
- State projection tests prove zero private data leakage
- Reconnection works within 5 seconds of disconnect
- No deadlocks from any combination of disconnects/timeouts

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PartyKit API unfamiliar (greenfield) | High | Medium | Read docs thoroughly; spike a minimal room first |
| iOS Safari kills WebSocket in background | High | Medium | Heartbeat ping/pong; reconnect on visibility change |
| State projection leaks private data | Low | Critical | Allowlist-based projection; dedicated test suite |
| Timer edge cases (timeout during reconnect) | Medium | Medium | Timer resets on reconnect; defensive checks |
| PartyKit free tier limits | Low | Low | Free tier is generous for dev; paid tier if needed |

## Sources & References

- SPEC.md architecture: `docs/spec/SPEC.md:44-51`
- SPEC.md ADR-04 (host authoritative): `docs/spec/SPEC.md:96-98`
- SPEC.md ADR-03 (no accounts): `docs/spec/SPEC.md:92-94`
- Phase 1 engine API: `docs/plans/2026-03-16-002-feat-phase-1-game-engine-plan.md`
- Phase 6 PartyKit config: `docs/plans/2026-03-16-007-feat-phase-6-deployment-plan.md`
- [PartyKit Server API](https://docs.partykit.io/reference/partyserver-api/) — onConnect, onMessage, onClose, onAlarm
- [PartyKit Room API](https://docs.partykit.io/reference/partyroom-api/) — storage, getConnections, broadcast
- [PartySocket Client API](https://docs.partykit.io/reference/partysocket-api/) — auto-reconnect client
- [PartyKit Configuration](https://docs.partykit.io/reference/partykit-configuration/) — partykit.json
- [Web Crypto API: randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
