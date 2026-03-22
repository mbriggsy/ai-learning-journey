import type * as Party from 'partykit/server';
import { dispatch, createGame, DISPLAY_SUB_PHASES } from './game/phases';
import { projectStateForHost, projectStateForPlayer, getPrivateData } from './projection';
import type { ClientGameAction, GameAction, GameState } from '../shared/types';
import type { ClientMessage, ServerMessage, ErrorCode, LobbyState } from '../shared/protocol';
import { decodeClientMessage } from '../shared/protocol';
import { buildScenario, SCENARIO_IDS, type ScenarioId } from './test-scenarios';

// Room code is derived from the PartyKit room ID (set by the client).
// No separate generated code — this ensures the displayed code always
// matches the room players actually connect to.

// ── Connection state ───────────────────────────────────────────────
interface ConnectionState {
  playerId: string;
  sessionToken: string;
  isHost: boolean;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60_000; // 15 minutes
const IDLE_TIMEOUT_MS = 30 * 60_000; // 30 minutes — room GC when empty

// Display state durations (ms) — how long the host overlay shows before auto-advancing
const DISPLAY_DELAY_MS: Record<string, number> = {
  'election-result': 5000,   // Vote reveal animation + tally
  'policy-enact': 4000,      // Policy flip animation
  'auto-enact': 4000,        // Auto-enact policy flip
  'policy-veto-propose': 3000, // "Veto proposed" announcement
};

// ── Room ───────────────────────────────────────────────────────────
export default class UMBRoom implements Party.Server {
  private gameState: GameState | null = null;
  private roomCode: string;
  private playerSessions = new Map<string, string>(); // sessionToken → playerId
  private playerNames = new Map<string, string>(); // playerId → name
  private hostPlayerId: string | null = null;
  private lastActionTime = 0;
  private displayTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectTimes = new Map<string, number>(); // playerId → Date.now() at disconnect
  private readonly isProduction: boolean;

  constructor(readonly room: Party.Room) {
    this.roomCode = room.id.toUpperCase();
    // In production (Cloudflare), set UMB_PRODUCTION=true to disable dev features.
    // Locally (partykit dev), env var is unset so dev features work.
    this.isProduction = room.env?.UMB_PRODUCTION === 'true';
  }

  onConnect(_conn: Party.Connection<ConnectionState>, _ctx: Party.ConnectionContext): void {
    // Connection established but not yet joined — wait for 'join' message
  }

  onClose(conn: Party.Connection<ConnectionState>): void {
    const meta = conn.state;
    if (meta) {
      // Track disconnect time for grace period (H5)
      if (meta.playerId) {
        this.disconnectTimes.set(meta.playerId, Date.now());
      }
      this.broadcastState();

      // If no connections remain, schedule self-destruct
      if (![...this.room.getConnections()].length) {
        this.room.storage.setAlarm(Date.now() + IDLE_TIMEOUT_MS);
      }
    }
  }

  onMessage(rawMessage: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection<ConnectionState>): void {
    const raw = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage as ArrayBuffer);

    // Reject oversized payloads (all legitimate messages are well under 1KB)
    if (raw.length > 4096) {
      this.sendError(sender, 'INVALID_ACTION', 'Message too large');
      return;
    }

    const msg = decodeClientMessage(raw);
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
      case 'load-scenario':
        this.handleLoadScenario(sender, msg.payload.scenario);
        break;
      case 'spawn-test-players':
        this.handleSpawnTestPlayers(sender, msg.payload.count);
        break;
    }
  }

  onAlarm(): void {
    // Self-destruct if no connections
    const connections = [...this.room.getConnections()];
    if (connections.length === 0) {
      return;
    }

    // Inactivity timeout — end game if no actions for 15 minutes
    if (this.gameState && this.gameState.phase !== 'lobby' && this.gameState.phase !== 'game-over') {
      const elapsed = Date.now() - this.lastActionTime;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        if (this.displayTimer !== null) {
          clearTimeout(this.displayTimer);
          this.displayTimer = null;
        }
        this.gameState = {
          ...this.gameState,
          phase: 'game-over',
          subPhase: null,
          winner: null,
          winReason: 'Game abandoned due to inactivity',
        };
        this.broadcastState();
        return;
      }
    }
  }

  // ── Join Handler ─────────────────────────────────────────────────

  private handleJoin(
    conn: Party.Connection<ConnectionState>,
    payload: { name: string; sessionToken?: string },
  ): void {
    const { name, sessionToken } = payload;

    // Reconnect attempt?
    if (sessionToken && this.playerSessions.has(sessionToken)) {
      const playerId = this.playerSessions.get(sessionToken)!;

      // Close any existing connection for this player (latest wins)
      // M16: Send SESSION_REPLACED so old tab stops reconnecting
      for (const existing of this.room.getConnections<ConnectionState>()) {
        if (existing.state?.playerId === playerId && existing.id !== conn.id) {
          this.send(existing, { type: 'error', payload: { code: 'SESSION_REPLACED', message: 'Connected from another device' } });
          existing.close();
        }
      }

      const isHost = playerId === this.hostPlayerId;
      conn.setState({ playerId, sessionToken, isHost });
      this.disconnectTimes.delete(playerId); // Clear disconnect timestamp on reconnect

      this.send(conn, { type: 'joined', payload: { playerId, sessionToken } });
      this.broadcastState();
      this.broadcastPrivateData();
      return;
    }

    // New join — validate
    const trimmed = name.trim().slice(0, 7);
    if (!trimmed) {
      this.sendError(conn, 'INVALID_NAME', 'Name cannot be empty');
      return;
    }

    // Check for name collision FIRST — takeover of a bot/disconnected slot must work
    // even mid-game (bots have no WebSocket, so a real player takes their seat)
    const existingEntry = [...this.playerNames.entries()].find(
      ([, n]) => n.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existingEntry) {
      const [existingId] = existingEntry;
      const isConnected = [...this.room.getConnections<ConnectionState>()].some(
        (c) => c.state?.playerId === existingId && c.id !== conn.id,
      );
      if (isConnected) {
        this.sendError(conn, 'NAME_TAKEN', `Name "${trimmed}" is already taken`);
        return;
      }
      // Disconnected player with same name — take over their slot
      // H5: Grace period — block takeover if player disconnected recently
      const disconnectTime = this.disconnectTimes.get(existingId);
      const gracePeriod = this.isProduction ? 30_000 : 0; // 30s prod, 0 dev/test
      if (disconnectTime && Date.now() - disconnectTime < gracePeriod) {
        this.sendError(conn, 'NAME_TAKEN', 'Player recently disconnected — try again in a moment');
        return;
      }
      const isHost = existingId === this.hostPlayerId;
      const newToken = crypto.randomUUID();
      // Remove old session token
      for (const [token, id] of this.playerSessions) {
        if (id === existingId) { this.playerSessions.delete(token); break; }
      }
      this.playerSessions.set(newToken, existingId);
      conn.setState({ playerId: existingId, sessionToken: newToken, isHost });
      this.send(conn, { type: 'joined', payload: { playerId: existingId, sessionToken: newToken } });
      this.broadcastState();
      this.broadcastPrivateData();
      return;
    }

    // New player from here — block if game already started or room full
    if (this.gameState && this.gameState.phase !== 'lobby') {
      this.sendError(conn, 'GAME_STARTED', 'Game already in progress');
      return;
    }

    const playerCount = this.hostPlayerId ? this.playerNames.size - 1 : this.playerNames.size;
    if (playerCount >= 10) {
      this.sendError(conn, 'ROOM_FULL', 'Room is full (max 10 players)');
      return;
    }

    // Create player
    const playerId = crypto.randomUUID();
    const newToken = crypto.randomUUID();
    const isHost = this.hostPlayerId === null;

    this.playerNames.set(playerId, trimmed);
    this.playerSessions.set(newToken, playerId);
    conn.setState({ playerId, sessionToken: newToken, isHost });

    if (isHost) this.hostPlayerId = playerId;

    this.send(conn, { type: 'joined', payload: { playerId, sessionToken: newToken } });
    this.broadcastState();
  }

  // ── Game Action Handler ──────────────────────────────────────────

  private handleGameAction(sender: Party.Connection<ConnectionState>, action: ClientGameAction): void {
    if (!this.gameState) {
      this.sendError(sender, 'INVALID_ACTION', 'No active game');
      return;
    }

    const meta = sender.state;
    if (!meta) {
      this.sendError(sender, 'INVALID_ACTION', 'Not joined');
      return;
    }

    // SECURITY: Inject playerId from connection state — never trust client
    const authorizedAction = { ...action, playerId: meta.playerId } as GameAction & { playerId: string };

    // Authorization check
    const authError = this.checkAuthorization(meta, authorizedAction);
    if (authError) {
      this.sendError(sender, authError.code, authError.message);
      return;
    }

    try {
      this.gameState = dispatch(this.gameState, authorizedAction);
      this.lastActionTime = Date.now();
      this.scheduleInactivityCheck();
      this.broadcastState();
      this.broadcastPrivateData();
      this.scheduleDisplayAdvance();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.sendError(sender, 'INVALID_ACTION', msg);
    }
  }

  // ── Authorization ────────────────────────────────────────────────

  private checkAuthorization(
    meta: ConnectionState,
    action: GameAction & { playerId: string },
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

    // Server-only actions — reject if sent by a client
    if (action.type === 'advance-display') {
      return { code: 'INVALID_ACTION', message: 'Server-only action' };
    }

    const mayorOnly = ['nominate', 'mayor-discard', 'veto-response', 'investigate', 'acknowledge-peek', 'special-nominate', 'execute'];
    const chiefOnly = ['chief-discard', 'propose-veto'];

    if (mayorOnly.includes(action.type) && mayor?.id !== meta.playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Only the Mayor can do this' };
    }

    if (chiefOnly.includes(action.type) && chief?.id !== meta.playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Only the Police Chief can do this' };
    }

    return null;
  }

  // ── Display Timer Management ────────────────────────────────────

  /**
   * If the current game state is in a display subPhase, schedule
   * an auto-advance after the appropriate delay. Cancels any
   * previously pending display timer.
   */
  private scheduleDisplayAdvance(): void {
    // Always clear any pending timer first
    if (this.displayTimer !== null) {
      clearTimeout(this.displayTimer);
      this.displayTimer = null;
    }

    if (!this.gameState) return;
    const subPhase = this.gameState.subPhase;
    if (!subPhase || !DISPLAY_SUB_PHASES.has(subPhase)) return;

    const delay = DISPLAY_DELAY_MS[subPhase] ?? 3000;

    this.displayTimer = setTimeout(() => {
      this.displayTimer = null;
      if (!this.gameState) return;
      // Verify we're still in the same display subPhase (guard against race conditions)
      if (this.gameState.subPhase !== subPhase) return;

      try {
        this.gameState = dispatch(this.gameState, { type: 'advance-display' });
        this.broadcastState();
        this.broadcastPrivateData();
        // Recursively schedule if the new state is also a display subPhase
        // (e.g., auto-enact after election-result when tracker hits 3)
        this.scheduleDisplayAdvance();
      } catch {
        // Should not happen — but don't crash the room
      }
    }, delay);
  }

  // ── Inactivity Management ────────────────────────────────────────

  private scheduleInactivityCheck(): void {
    this.room.storage.setAlarm(Date.now() + INACTIVITY_TIMEOUT_MS);
  }

  // ── Start Game ───────────────────────────────────────────────────

  private handleStartGame(sender: Party.Connection<ConnectionState>): void {
    if (this.gameState) return; // Guard against double-click

    const meta = sender.state;
    if (!meta?.isHost) {
      this.sendError(sender, 'INVALID_ACTION', 'Only host can start');
      return;
    }

    // Exclude the host from the player list — host is an observer
    const playerEntries = [...this.playerNames.entries()]
      .filter(([id]) => id !== this.hostPlayerId);

    if (playerEntries.length < 5) {
      this.sendError(sender, 'INVALID_ACTION', 'Need at least 5 players');
      return;
    }

    const names = playerEntries.map(([, name]) => name);
    this.gameState = createGame(names);

    // Map the game state player IDs to the real player IDs
    // createGame generates player-0, player-1, etc. — remap to actual UUIDs
    const realIds = playerEntries.map(([id]) => id);
    const idMap = new Map<string, string>();
    this.gameState.players.forEach((p, i) => idMap.set(p.id, realIds[i]));

    this.gameState = {
      ...this.gameState,
      players: this.gameState.players.map((p, i) => ({
        ...p,
        id: realIds[i],
        knownAllies: p.knownAllies.map((allyId) => idMap.get(allyId) ?? allyId),
      })),
    };

    this.lastActionTime = Date.now();
    this.scheduleInactivityCheck();
    this.broadcastState();
    this.broadcastPrivateData();
  }

  // ── Kick ─────────────────────────────────────────────────────────

  private handleKick(sender: Party.Connection<ConnectionState>, targetPlayerId: string): void {
    const meta = sender.state;
    if (!meta?.isHost) return;
    if (this.gameState && this.gameState.phase !== 'lobby') return;

    // M2: Remove session token FIRST so auto-reconnect can't undo the kick
    for (const [token, id] of this.playerSessions) {
      if (id === targetPlayerId) {
        this.playerSessions.delete(token);
        break;
      }
    }
    this.playerNames.delete(targetPlayerId);

    // Send KICKED error before closing so client shows "You were kicked" instead of "Reconnecting..."
    for (const conn of this.room.getConnections<ConnectionState>()) {
      if (conn.state?.playerId === targetPlayerId) {
        this.send(conn, { type: 'error', payload: { code: 'KICKED', message: 'You were removed from the game' } });
        conn.close();
        break;
      }
    }

    this.broadcastState();
  }

  // ── Reset to Lobby ───────────────────────────────────────────────

  private handleResetToLobby(sender: Party.Connection<ConnectionState>): void {
    const meta = sender.state;
    if (!meta?.isHost) return;
    // Allow reset from any phase (dev scenarios need mid-game reset)
    if (!this.gameState) return;

    this.gameState = null;

    // Clear any pending display timer
    if (this.displayTimer !== null) {
      clearTimeout(this.displayTimer);
      this.displayTimer = null;
    }

    // Clear stale disconnect timestamps — all remaining players are fresh in the lobby
    this.disconnectTimes.clear();

    // M1: Clean up disconnected players (including bots) — remove ghosts from lobby
    const connectedPlayerIds = new Set<string>();
    for (const conn of this.room.getConnections<ConnectionState>()) {
      if (conn.state?.playerId) connectedPlayerIds.add(conn.state.playerId);
    }
    for (const [playerId] of this.playerNames) {
      if (playerId !== this.hostPlayerId && !connectedPlayerIds.has(playerId)) {
        this.playerNames.delete(playerId);
      }
    }

    // Keep connections and player names, regenerate session tokens
    const newSessions = new Map<string, string>();
    for (const conn of this.room.getConnections<ConnectionState>()) {
      const m = conn.state;
      if (!m) continue;
      const newToken = crypto.randomUUID();
      newSessions.set(newToken, m.playerId);
      conn.setState({ ...m, sessionToken: newToken });
      this.send(conn, { type: 'joined', payload: { playerId: m.playerId, sessionToken: newToken } });
    }
    this.playerSessions = newSessions;
    this.broadcastState();
  }

  // ── Spawn Test Players (DEV ONLY) ────────────────────────────────

  private handleSpawnTestPlayers(sender: Party.Connection<ConnectionState>, count?: number): void {
    if (this.isProduction) {
      this.sendError(sender, 'INVALID_ACTION', 'Dev features not available');
      return;
    }

    const meta = sender.state;
    if (!meta?.isHost) {
      this.sendError(sender, 'INVALID_ACTION', 'Only host can spawn test players');
      return;
    }

    if (this.gameState && this.gameState.phase !== 'lobby') {
      this.sendError(sender, 'INVALID_ACTION', 'Can only spawn test players in lobby');
      return;
    }

    const testNames = ['Vincenz', 'Carmine', 'Pauliee', 'Frankoo', 'Salliee', 'Donniee', 'Markiee', 'Tommiee', 'Benniee', 'Maxinee'];
    const existingNames = new Set([...this.playerNames.values()].map((n) => n.toLowerCase()));
    // Host is in playerNames but isn't a real player (just the game board)
    const realPlayers = this.hostPlayerId ? this.playerNames.size - 1 : this.playerNames.size;
    const maxBots = 10 - realPlayers;
    const target = Math.min(Math.max(count ?? 5, 1), maxBots);
    let added = 0;

    for (const name of testNames) {
      if (added >= target) break;
      if (existingNames.has(name.toLowerCase())) continue;

      const playerId = crypto.randomUUID();
      const token = crypto.randomUUID();
      this.playerNames.set(playerId, name);
      this.playerSessions.set(token, playerId);
      added++;
    }

    this.broadcastState();
  }

  // ── Load Test Scenario (DEV ONLY) ────────────────────────────────

  private handleLoadScenario(sender: Party.Connection<ConnectionState>, scenarioName: string): void {
    if (this.isProduction) {
      this.sendError(sender, 'INVALID_ACTION', 'Dev features not available');
      return;
    }

    const meta = sender.state;
    if (!meta?.isHost) {
      this.sendError(sender, 'INVALID_ACTION', 'Only host can load scenarios');
      return;
    }

    if (!SCENARIO_IDS.includes(scenarioName as ScenarioId)) {
      this.sendError(sender, 'INVALID_ACTION', `Unknown scenario: ${scenarioName}. Valid: ${SCENARIO_IDS.join(', ')}`);
      return;
    }

    // Need at least 5 players (excluding host)
    const playerEntries = [...this.playerNames.entries()]
      .filter(([id]) => id !== this.hostPlayerId);

    if (playerEntries.length < 5) {
      this.sendError(sender, 'INVALID_ACTION', `Need at least 5 players (have ${playerEntries.length})`);
      return;
    }

    const names = playerEntries.map(([, name]) => name);
    const realIds = playerEntries.map(([id]) => id);

    this.gameState = buildScenario(scenarioName as ScenarioId, names, realIds);
    this.lastActionTime = Date.now();
    this.scheduleInactivityCheck();
    this.broadcastState();
    this.broadcastPrivateData();
  }

  // ── Broadcasting ─────────────────────────────────────────────────

  private broadcastState(): void {
    try {
      const connectionStatus = this.getConnectionStatus();

      for (const conn of this.room.getConnections<ConnectionState>()) {
        const meta = conn.state;
        if (!meta) continue;

        if (meta.isHost) {
          const hostState = this.gameState
            ? projectStateForHost(this.gameState, connectionStatus)
            : this.getLobbyState();
          this.send(conn, { type: 'state-update', payload: hostState });
        } else {
          const playerState = this.gameState
            ? projectStateForPlayer(this.gameState, meta.playerId, connectionStatus)
            : this.getLobbyState();
          this.send(conn, { type: 'state-update', payload: playerState });
        }
      }
    } catch (err) {
      console.error('[room] broadcastState failed:', err);
      // Don't crash the room — state is already committed
    }
  }

  private broadcastPrivateData(): void {
    try {
      if (!this.gameState) return;
      for (const conn of this.room.getConnections<ConnectionState>()) {
        const meta = conn.state;
        if (!meta) continue;
        const priv = getPrivateData(this.gameState, meta.playerId);
        if (priv) {
          this.send(conn, { type: 'private-update', payload: priv });
        }
      }
    } catch (err) {
      console.error('[room] broadcastPrivateData failed:', err);
    }
  }

  private getConnectionStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    const connectedIds = new Set<string>();

    for (const conn of this.room.getConnections<ConnectionState>()) {
      if (conn.state?.playerId) {
        connectedIds.add(conn.state.playerId);
      }
    }

    if (this.gameState) {
      for (const p of this.gameState.players) {
        status.set(p.id, connectedIds.has(p.id));
      }
    }
    return status;
  }

  private getLobbyState(): LobbyState {
    const players: { id: string; name: string; isConnected: boolean }[] = [];
    const connectedIds = new Set<string>();

    for (const conn of this.room.getConnections<ConnectionState>()) {
      if (conn.state?.playerId) connectedIds.add(conn.state.playerId);
    }

    for (const [playerId, name] of this.playerNames) {
      if (playerId === this.hostPlayerId) continue; // Host is observer, not player
      players.push({ id: playerId, name, isConnected: connectedIds.has(playerId) });
    }

    return {
      phase: 'lobby',
      subPhase: null,
      roomCode: this.roomCode,
      players,
      playerCount: players.length,
    };
  }

  // ── HTTP (CORS for monitoring) ─────────────────────────────────

  async onRequest(req: Party.Request): Promise<Response> {
    const allowedOrigins = [
      'https://undercover-mob-boss.vercel.app',
      'http://localhost:5173',
    ];

    const origin = req.headers.get('Origin') ?? '';
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (req.method === 'GET') {
      const playerCount = [...this.room.getConnections()].length;
      return new Response(JSON.stringify({ roomCode: this.roomCode, players: playerCount }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private send(conn: Party.Connection, msg: ServerMessage): void {
    if (conn.readyState !== undefined && conn.readyState > 1) return;
    conn.send(JSON.stringify(msg));
  }

  private sendError(conn: Party.Connection, code: ErrorCode, message: string): void {
    this.send(conn, { type: 'error', payload: { code, message } });
  }
}
