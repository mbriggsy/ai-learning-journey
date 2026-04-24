import { routePartykitRequest, Server } from 'partyserver'
import type { Connection, ConnectionContext } from 'partyserver'
import { parseClientMessage, messageByteLength } from './validation'
import { handleHealthRequest } from './health'
import { mulberry32, randomIntFromRandom } from './rng'
import { createGodRateLimiter, evaluateGodAuth } from './god-connection'
import { createLobbyState, dispatch } from './game/engine'
import { projectForBoard, projectForPlayer, getPrivateData } from './projection'
import type { GameState, PlayingState, GameOverState, DispatchContext, DispatchResult, ErrorCode as EngineErrorCode } from './game/types'
import type { ClientAction, EngineAction } from '@shared/actions'
import { SERVER_ONLY_ACTIONS } from '@shared/actions'
import type { ServerMessage, LobbyView, ErrorCode } from '@shared/protocol'
import { PROTOCOL_VERSION } from '@shared/protocol'
import { TIMING } from '@shared/constants'

// --- Constants ---

// NOT exported — room.ts is the Worker entry. The Workers runtime treats
// every named export as a potential ExportedHandler, so exporting a plain
// constant from this file crashes the runtime at boot with "Incorrect type
// for map entry". Tests that need this value read it via validation.ts
// (MAX_MESSAGE_BYTES is re-exported there for test access).
const MAX_MESSAGE_BYTES = 4096
const MAX_PLAYERS = 10
const MAX_CONNECTIONS = 12 // 10 players + 1 host + 1 reconnection buffer
const MAX_MESSAGES_PER_SECOND = 10
const INACTIVITY_TIMEOUT_MS = 15 * 60_000
const IDLE_ROOM_TIMEOUT_MS = 30 * 60_000
const DISCONNECT_DEBOUNCE_MS = 3_000
const HEARTBEAT_INTERVAL_MS = 30_000
const HEARTBEAT_TIMEOUT_MS = 10_000
const MAX_QUEUE_DEPTH = 100
const NOPE_GRACE_MS = TIMING.NOPE_GRACE_MS


// IBM CVD-safe palette — every pair distinguishable across all common color vision deficiencies
const PLAYER_COLORS = [
  '#648FFF', '#FE6100', '#FFB000', '#DC267F', '#785EF0',
  '#00B4A6', '#FF6B6B', '#8FD14F', '#C4C4C4', '#FFDAC1',
] as const

const NAME_PATTERN = /^[a-zA-Z0-9 .!?_-]{1,12}$/

// --- Room Code Generation ---

// Room code: generated client-side (Board.tsx), validated server-side via room name

// --- Engine → Protocol Error Code Mapping ---

function mapEngineError(code: EngineErrorCode): ErrorCode {
  switch (code) {
    case 'INVALID_PHASE': return 'INVALID_ACTION'
    case 'NOT_YOUR_TURN': return 'INVALID_ACTION'
    case 'CARD_NOT_IN_HAND': return 'INVALID_ACTION'
    case 'INVALID_TARGET': return 'INVALID_ACTION'
    case 'INVALID_COMBO': return 'INVALID_ACTION'
    case 'INVALID_ACTION': return 'INVALID_ACTION'
    case 'INVALID_POSITION': return 'INVALID_ACTION'
    case 'NOPE_NOT_ACTIVE': return 'INVALID_ACTION'
    case 'NOPE_STALE_GENERATION': return 'NOPE_TOO_LATE'
    case 'MAX_CHAIN_DEPTH': return 'INVALID_ACTION'
  }
}

// --- Connection State ---

type ConnState =
  | { role: 'host' }
  | { role: 'player'; playerId: string; sessionToken: string }
  | { role: 'god' }

// --- Workers Env ---
//
// Declared BEFORE the GameRoom class so `Server<Env>` can parameterize
// `this.env` to the PLAYTEST_* shape. The Workers default export at the
// bottom of the file re-uses this same interface.

interface Env {
  GameRoom: DurableObjectNamespace
  // Playtest-mode env surface (all optional, absent in production).
  // Semantics live in `src/server/playtest.ts`. Production builds MUST NOT
  // set PLAYTEST_MODE — the prod-bundle sentinel check (Unit 7) greps the
  // compiled output for leakage.
  PLAYTEST_MODE?: string
  PLAYTEST_TOKEN?: string
  PLAYTEST_GOD_ORIGINS?: string
}

// --- Room ---

export class GameRoom extends Server<Env> {
  static override options = { hibernate: true }

  // --- State ---
  private gameState: GameState | null = null
  private playerSessions = new Map<string, string>()  // sessionToken → playerId
  private playerNames = new Map<string, string>()      // playerId → name
  private playerColors = new Map<string, string>()     // playerId → color
  private lastActionTime = 0

  // --- Serial Queue ---
  private actionQueue: Promise<void> = Promise.resolve()
  private queueDepth = 0

  // --- Timers ---
  private nopeTimeout: ReturnType<typeof setTimeout> | null = null
  private nopeGraceTimeout: ReturnType<typeof setTimeout> | null = null
  private lastScheduledNopeGeneration = -1
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>() // playerId → debounce timer
  private heartbeatIntervals = new Map<string, ReturnType<typeof setInterval>>() // connectionId → interval
  private lastPongTimes = new Map<string, number>() // connectionId → last activity

  // --- Persistence Tracking ---
  private consecutivePersistFailures = 0

  // --- Rate Limiting ---
  private messageCounts = new Map<string, { count: number; windowStart: number }>()

  // --- Playtest Mode (populated only under PLAYTEST_MODE=1) ---
  // First-write-wins per-room config from the god connection's
  // `playtest-config` message (Unit 5). Reset on hibernation; orchestrator
  // re-sends after reconnect. `makeDispatchContext` reads these to swap in
  // seeded RNG + stretched Nope window. Never populated in production
  // deploys — Unit 7 sentinel check enforces.
  private playtestSeed: number | undefined = undefined
  private playtestNopeWindowMs: number | undefined = undefined
  private playtestConfigLocked = false

  // Per-room rate-limit store for god-role auth attempts. Keyed by
  // source (remote IP via CF headers, or origin as fallback). Resets on
  // successful auth. See `src/server/god-connection.ts`.
  private godAuthFailures = new Map<string, { count: number; windowStart: number }>()


  // --- Lifecycle ---

  override async onStart(): Promise<void> {
    try {
      this.gameState = await this.ctx.storage.get('gameState') ?? null
      this.playerSessions = new Map(await this.ctx.storage.get<[string, string][]>('playerSessions') ?? [])
      this.playerNames = new Map(await this.ctx.storage.get<[string, string][]>('playerNames') ?? [])
      this.playerColors = new Map(await this.ctx.storage.get<[string, string][]>('playerColors') ?? [])
      this.lastActionTime = await this.ctx.storage.get<number>('lastActionTime') ?? Date.now()
    } catch (err: unknown) {
      console.error('Failed to restore room state, resetting:', err)
      this.gameState = null
      this.playerSessions = new Map()
      this.playerNames = new Map()
      this.playerColors = new Map()
      this.lastActionTime = Date.now()
    }

    // Clear any stale timers before restoring from persisted state
    this.clearNopeTimer()

    // Restore Nope timer if window was active
    if (this.gameState?.phase === 'playing') {
      const playing = this.gameState as PlayingState
      if (playing.nopeWindow) {
        if (playing.nopeWindow.expired) {
          // Window was in grace state when hibernated — resolve immediately
          this.enqueue(() => this.dispatchServerAction({
            type: 'nope-grace-expired',
            windowGeneration: playing.nopeWindow!.generation,
            playerId: '_server',
          } as EngineAction))
        } else {
          const remaining = playing.nopeWindow.deadlineMs - Date.now()
          if (remaining <= 0) {
            this.enqueue(() => this.dispatchServerAction({
              type: 'nope-window-expired',
              windowGeneration: playing.nopeWindow!.generation,
              playerId: '_server',
            } as EngineAction))
          } else {
            this.lastScheduledNopeGeneration = playing.nopeWindow.generation
            this.scheduleNopeExpiry(playing.nopeWindow.generation, remaining)
          }
        }
      }

    }

    // Schedule inactivity alarm
    await this.ctx.storage.setAlarm(Date.now() + INACTIVITY_TIMEOUT_MS)
  }

  override onConnect(connection: Connection, ctx: ConnectionContext): void {
    const url = new URL(ctx.request.url)
    const origin = ctx.request.headers.get('Origin')

    // God-role branch — orchestrator-only omniscient observer. Gated by
    // PLAYTEST_MODE + token + stricter origin allowlist. See
    // `src/server/god-connection.ts` for the decision logic.
    if (url.searchParams.get('role') === 'god') {
      const token = url.searchParams.get('token')
      const sourceKey = ctx.request.headers.get('CF-Connecting-IP') ?? origin ?? 'unknown'
      const rateLimiter = createGodRateLimiter(this.godAuthFailures, sourceKey)
      const decision = evaluateGodAuth({ origin, token, env: this.env, rateLimiter })
      if (!decision.ok) {
        connection.close(decision.closeCode, decision.closeReason)
        return
      }
      connection.setState({ role: 'god' } satisfies ConnState)
      this.startHeartbeat(connection)
      return
    }

    // Player / host origin validation — WebSocket bypasses CORS, so check
    // on connect.
    const allowedOrigins = [
      'https://burned.pages.dev',
      'http://localhost:5173', 'http://localhost:4173',
    ]
    // In dev, allow any local network origin (192.168.x.x, 10.x.x.x, etc.)
    const isLocalOrigin = origin && /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)
    if (!origin || (!allowedOrigins.includes(origin) && !isLocalOrigin)) {
      connection.close(4003, 'Forbidden origin')
      return
    }

    // Enforce max connections — god connections don't count toward the cap.
    let connCount = 0
    for (const conn of this.getConnections()) {
      const cs = this.getConnState(conn)
      if (cs?.role === 'god') continue
      connCount++
      if (connCount > MAX_CONNECTIONS) break
    }
    if (connCount > MAX_CONNECTIONS) {
      this.sendError(connection, 'ROOM_FULL', 'Room is full')
      connection.close(4001, 'Room full')
      return
    }

    // Start heartbeat for this connection
    this.startHeartbeat(connection)
  }

  override onMessage(connection: Connection, message: string | ArrayBuffer): void {
    if (typeof message !== 'string') {
      connection.close(1003, 'Binary messages not supported')
      return
    }

    if (messageByteLength(message) > MAX_MESSAGE_BYTES) {
      connection.close(1009, 'Message too large')
      return
    }

    // Any message counts as heartbeat activity
    this.lastPongTimes.set(connection.id, Date.now())

    // Rate limiting
    if (this.isRateLimited(connection.id)) {
      this.sendError(connection, 'RATE_LIMITED', 'Too many messages')
      return
    }

    // God-connection message routing. Until Unit 5 lands the
    // `playtest-config` admin message, god connections have no valid
    // incoming messages. Silently drop anything they send — do not bounce
    // back an error (prevents probing the token surface).
    if (this.getConnState(connection)?.role === 'god') {
      return
    }

    const parsed = parseClientMessage(message)
    if (!parsed.ok) {
      this.sendError(connection, 'INVALID_MESSAGE', parsed.error)
      return
    }

    const msg = parsed.message
    switch (msg.type) {
      case 'host-connect':
        this.enqueue(() => this.handleHostConnect(connection), connection)
        break
      case 'join':
        this.enqueue(() => this.handleJoin(connection, msg.payload.name, msg.payload.sessionToken), connection)
        break
      case 'start-game':
        this.enqueue(() => this.handleStartGame(connection), connection)
        break
      case 'return-to-lobby':
        this.enqueue(() => this.handleReturnToLobby(connection), connection)
        break
      case 'action':
        this.enqueue(() => this.handleAction(connection, msg.payload), connection)
        break
      case 'ping':
        this.send(connection, { type: 'pong', payload: {} })
        break
      case 'pong':
        // Client responding to server heartbeat — activity already tracked above
        break
      default: {
        // Exhaustive default — if a new ClientMessage type is added to the
        // protocol without a case here, TypeScript forces this to be a
        // `never`. At runtime we reject loudly so protocol drift never
        // silently consumes a message. E2E audit 2026-04-23 B-09.
        const _exhaustive: never = msg
        void _exhaustive
        this.sendError(connection, 'INVALID_MESSAGE', 'Unknown message type')
      }
    }
  }

  override onClose(connection: Connection, _code: number, _reason: string, _wasClean: boolean): void {
    // Clean up connection-specific timers
    this.stopHeartbeat(connection.id)
    this.lastPongTimes.delete(connection.id)
    this.messageCounts.delete(connection.id)

    const state = this.getConnState(connection)
    if (state?.role === 'player') {
      // Debounce disconnect broadcast — WiFi blips shouldn't flash on TV
      const playerId = state.playerId
      this.disconnectTimers.set(playerId, setTimeout(() => {
        this.disconnectTimers.delete(playerId)
        // Re-check if player reconnected during debounce window
        for (const conn of this.getConnections()) {
          const cs = this.getConnState(conn)
          if (cs?.role === 'player' && cs.playerId === playerId) return
        }
        // Still disconnected — broadcast
        if (this.gameState?.phase === 'lobby') {
          this.broadcastLobbyState()
        } else if (this.gameState) {
          this.broadcastGameState()
        }
        void this.persistState()
      }, DISCONNECT_DEBOUNCE_MS))
    }

    // Schedule idle room cleanup if no connections remain
    if (!this.hasConnections()) {
      void this.ctx.storage.setAlarm(Date.now() + IDLE_ROOM_TIMEOUT_MS)
    }
  }

  override async onAlarm(): Promise<void> {
    if (!this.hasConnections()) {
      this.clearAllTimers()
      try { await this.ctx.storage.deleteAll() } catch (err: unknown) {
        console.error('Failed to delete room storage, rescheduling:', err)
        await this.ctx.storage.setAlarm(Date.now() + IDLE_ROOM_TIMEOUT_MS).catch(() => {})
      }
      return
    }

    const elapsed = Date.now() - this.lastActionTime
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      this.clearAllTimers()
      this.broadcast(JSON.stringify({
        type: 'error',
        payload: { code: 'KICKED', message: 'Game ended due to inactivity' },
      } satisfies ServerMessage))
      for (const conn of this.getConnections()) {
        conn.close(1000, 'Inactivity timeout')
      }
      try { await this.ctx.storage.deleteAll() } catch (err: unknown) {
        console.error('Failed to delete room storage after kick:', err)
      }
      return
    }

    await this.ctx.storage.setAlarm(Date.now() + (INACTIVITY_TIMEOUT_MS - elapsed))
  }

  // --- Host Connect ---

  private handleHostConnect(connection: Connection): void {
    // Check if there's already a host (allow same connection to re-identify on reconnect)
    for (const conn of this.getConnections()) {
      if (this.getConnState(conn)?.role === 'host' && conn.id !== connection.id) {
        this.sendError(connection, 'INVALID_ACTION', 'Room already has a host')
        return
      }
    }

    connection.setState({ role: 'host' } satisfies ConnState)

    if (!this.gameState) {
      this.gameState = createLobbyState()
      void this.persistState()
    }

    // Send current state to the reconnecting host
    if (this.gameState.phase === 'lobby') {
      this.broadcastLobbyState()
    } else {
      this.broadcastGameState()
    }
  }

  // --- Join ---

  private handleJoin(connection: Connection, rawName: string, sessionToken?: string): void {
    // Initialize lobby on first arrival (host or player — whoever wins the race).
    // Previously only handleHostConnect did this, which forced a strict host-first
    // ordering that the dev launcher's sync popup opens can't guarantee.
    if (!this.gameState) {
      this.gameState = createLobbyState()
    }

    // Reconnection with session token (name can be empty for reconnects)
    if (sessionToken) {
      const existingPlayerId = this.playerSessions.get(sessionToken)
      if (existingPlayerId) {
        this.handleReconnect(connection, existingPlayerId, sessionToken)
        return
      }
      // Invalid token — fall through to name-reclaim / new-join logic below.
    }

    // Name-reclaim path — a player who lost their session (tab closed, phone
    // died, browser cleared storage) can rejoin mid-game by resubmitting their
    // original name. Only allowed if no OTHER device is currently connected as
    // that player — otherwise anyone could steal an identity by guessing a name.
    if (rawName && rawName.trim().length > 0) {
      const reclaimTrimmed = rawName.trim().slice(0, 12)
      // Uniform validation: reclaim must match NAME_PATTERN, same as the new-join
      // path below. Previously reclaim tolerated inputs the registration path
      // rejected (control chars, HTML fragments post-trim), which is a subtle
      // cross-path inconsistency. E2E audit 2026-04-23 E-05.
      if (!NAME_PATTERN.test(reclaimTrimmed)) {
        this.sendError(connection, 'NAME_INVALID', 'Invalid name')
        return
      }
      const reclaimName = reclaimTrimmed.toLowerCase()
      let reclaimPlayerId: string | undefined
      for (const [pid, name] of this.playerNames.entries()) {
        if (name.toLowerCase() === reclaimName) { reclaimPlayerId = pid; break }
      }
      if (reclaimPlayerId) {
        let activelyConnected = false
        for (const conn of this.getConnections()) {
          if (conn.id === connection.id) continue
          const s = this.getConnState(conn)
          if (s?.role === 'player' && s.playerId === reclaimPlayerId) {
            activelyConnected = true
            break
          }
        }
        if (activelyConnected) {
          this.sendError(connection, 'NAME_TAKEN', 'That operative is already connected on another device')
          return
        }
        // Find or mint a session token for this player and route through the
        // shared reconnect path so state projection + disconnect-timer cleanup
        // + SESSION_REPLACED eviction all stay in one place.
        let token: string | undefined
        for (const [t, pid] of this.playerSessions.entries()) {
          if (pid === reclaimPlayerId) { token = t; break }
        }
        if (!token) {
          token = crypto.randomUUID()
          this.playerSessions.set(token, reclaimPlayerId)
        }
        this.handleReconnect(connection, reclaimPlayerId, token)
        return
      }
    }

    // New join requires lobby phase
    if (this.gameState.phase !== 'lobby') {
      this.sendError(connection, 'GAME_ALREADY_STARTED', 'Game has already started')
      return
    }

    // Name validation — strict pattern, no HTML-special chars
    const name = rawName.trim().slice(0, 12)
    if (!NAME_PATTERN.test(name)) {
      this.sendError(connection, 'NAME_INVALID', 'Invalid name')
      return
    }

    // Case-insensitive uniqueness
    const nameLower = name.toLowerCase()
    for (const existing of this.playerNames.values()) {
      if (existing.toLowerCase() === nameLower) {
        this.sendError(connection, 'NAME_TAKEN', 'Name already taken')
        return
      }
    }

    if (this.playerNames.size >= MAX_PLAYERS) {
      this.sendError(connection, 'ROOM_FULL', 'Room is full')
      return
    }

    const playerId = crypto.randomUUID()
    const token = crypto.randomUUID()
    const colorIndex = this.playerNames.size % PLAYER_COLORS.length
    const color = PLAYER_COLORS[colorIndex]!

    this.playerSessions.set(token, playerId)
    this.playerNames.set(playerId, name)
    this.playerColors.set(playerId, color)

    connection.setState({ role: 'player', playerId, sessionToken: token } satisfies ConnState)

    this.send(connection, { type: 'joined', payload: { playerId, sessionToken: token, color, protocolVersion: PROTOCOL_VERSION } })

    this.broadcastLobbyState()
    void this.persistState()
  }

  // --- Reconnection ---

  private handleReconnect(connection: Connection, playerId: string, sessionToken: string): void {
    for (const existing of this.getConnections()) {
      const state = this.getConnState(existing)
      if (state?.role === 'player' && state.playerId === playerId && existing.id !== connection.id) {
        this.send(existing, { type: 'error', payload: { code: 'SESSION_REPLACED', message: 'Connected from another device' } })
        existing.close(4000, 'Session replaced')
      }
    }

    connection.setState({ role: 'player', playerId, sessionToken } satisfies ConnState)

    const color = this.playerColors.get(playerId) ?? PLAYER_COLORS[0]!
    this.send(connection, { type: 'joined', payload: { playerId, sessionToken, color, protocolVersion: PROTOCOL_VERSION } })

    // Clear any pending disconnect debounce for this player
    const pendingDisconnect = this.disconnectTimers.get(playerId)
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect)
      this.disconnectTimers.delete(playerId)
    }

    // Enqueue state-send in serial queue (P0: reading gameState outside queue risks mid-dispatch staleness)
    this.enqueue(() => {
      if (this.gameState) {
        if (this.gameState.phase === 'lobby') {
          this.broadcastLobbyState()
        } else {
          const now = Date.now()
          const state = this.gameState as PlayingState | GameOverState
          const board = projectForBoard(state, now, this.getConnectedPlayerIds())
          this.send(connection, {
            type: 'player-update',
            payload: {
              state: projectForPlayer(state, playerId, board),
              private: state.phase === 'playing' ? getPrivateData(state, playerId) : {},
            },
            protocolVersion: PROTOCOL_VERSION,
          })
        }
      }
    })

    void this.persistState()
  }

  // --- Start Game ---

  private handleStartGame(connection: Connection): void {
    const connState = this.getConnState(connection)
    if (connState?.role !== 'host') {
      this.sendError(connection, 'NOT_HOST', 'Only the host can start the game')
      return
    }

    if (this.gameState?.phase !== 'lobby') {
      this.sendError(connection, 'GAME_ALREADY_STARTED', 'Game has already started')
      return
    }

    if (this.playerNames.size < 2) {
      this.sendError(connection, 'NOT_ENOUGH_PLAYERS', 'Need at least 2 players')
      return
    }

    // Build lobby explicitly (allowlist — no spread from gameState)
    const lobbyForEngine = {
      phase: 'lobby' as const,
      players: [...this.playerNames.entries()].map(([id, name]) => ({
        id,
        name,
        color: this.playerColors.get(id) ?? '#888',
      })),
      stateVersion: this.gameState.stateVersion,
      events: [] as const,
    }

    const ctx = this.makeDispatchContext()
    const result = dispatch(lobbyForEngine, { type: 'start-game', playerId: '_host' } as EngineAction, ctx)

    if (!result.ok) {
      this.sendError(connection, mapEngineError(result.code), result.error)
      return
    }

    this.gameState = result.state
    this.lastActionTime = Date.now()
    this.broadcastGameState()
    void this.persistState()
  }

  // --- Return to Lobby ---

  private handleReturnToLobby(connection: Connection): void {
    const connState = this.getConnState(connection)
    if (connState?.role !== 'host') {
      this.sendError(connection, 'NOT_HOST', 'Only the host can return to lobby')
      return
    }

    if (!this.gameState || this.gameState.phase === 'lobby') {
      this.sendError(connection, 'INVALID_ACTION', 'Already in lobby')
      return
    }

    // Clear all game timers including pending disconnect debounces
    this.clearAllTimers()

    // Reset persist-failure counter on explicit lobby return. Long-running
    // rooms that accumulated write failures across games otherwise never
    // zeroed this counter on a clean reset. E2E audit 2026-04-23 B-08.
    this.consecutivePersistFailures = 0

    // Reset to lobby state, preserving all registered players
    this.gameState = createLobbyState()
    this.lastActionTime = Date.now()
    this.broadcastLobbyState()
    void this.persistState()
  }

  // --- Game Action ---

  private handleAction(connection: Connection, action: ClientAction): void {
    const connState = this.getConnState(connection)

    if (connState?.role === 'host') {
      this.sendError(connection, 'INVALID_ACTION', 'Host cannot send game actions')
      return
    }

    if (connState?.role !== 'player') {
      this.sendError(connection, 'INVALID_ACTION', 'Not connected as player')
      return
    }

    if (!this.gameState || this.gameState.phase !== 'playing') {
      this.sendError(connection, 'INVALID_ACTION', 'Game is not in progress')
      return
    }

    // Reject server-only actions from clients
    if ((SERVER_ONLY_ACTIONS as Set<string>).has(action.type)) {
      this.sendError(connection, 'INVALID_ACTION', 'Action not allowed')
      return
    }

    const playing = this.gameState as PlayingState

    // Dead player guard
    const player = playing.players.find(p => p.id === connState.playerId)
    if (player && !player.isAlive) {
      this.sendError(connection, 'DEAD_PLAYER', 'Eliminated players cannot act')
      return
    }

    // stateVersion validation — Nope exempt
    if (action.type !== 'nope') {
      if (action.stateVersion !== this.gameState.stateVersion) {
        this.sendError(connection, 'STALE_STATE', 'Action rejected: stale state')
        return
      }
    }

    // Build engine action — inject playerId, strip stateVersion
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stateVersion, ...actionFields } = action
    const engineAction: EngineAction = {
      ...actionFields,
      playerId: connState.playerId,
    } as EngineAction

    const ctx = this.makeDispatchContext()
    const result = dispatch(this.gameState, engineAction, ctx)

    if (!result.ok) {
      this.sendError(connection, mapEngineError(result.code), result.error)
      return
    }

    this.gameState = result.state
    this.lastActionTime = Date.now()
    this.updateNopeTimer(result)
    this.broadcastGameState()
    void this.persistState()
  }

  // --- Server Actions ---

  private dispatchServerAction(action: EngineAction): void {
    if (!this.gameState || this.gameState.phase !== 'playing') return

    const ctx = this.makeDispatchContext()
    const result = dispatch(this.gameState, action, ctx)

    if (!result.ok) {
      if (result.code !== 'NOPE_NOT_ACTIVE') {
        console.error(JSON.stringify({
          event: 'dispatch_error',
          room: this.name,
          action: action.type,
          error: result.error,
          code: result.code,
          timestamp: Date.now(),
        }))
      }
      // Force-clear nope window on unexpected timer dispatch failure to prevent permanent freeze
      if ((action.type === 'nope-window-expired' || action.type === 'nope-grace-expired') && result.code !== 'NOPE_NOT_ACTIVE') {
        const playing = this.gameState as PlayingState
        if (playing.nopeWindow) {
          this.gameState = { ...playing, nopeWindow: null }
          this.clearNopeTimer()
          this.broadcastGameState()
          void this.persistState()
        }
      }
      return
    }

    this.gameState = result.state
    this.lastActionTime = Date.now()
    this.updateNopeTimer(result)
    this.broadcastGameState()
    void this.persistState()
  }

  // --- Nope Timer ---

  private updateNopeTimer(result: DispatchResult): void {
    if (!result.ok || result.state.phase !== 'playing') {
      this.clearNopeTimer()
      return
    }

    const playing = result.state as PlayingState
    if (playing.nopeWindow && playing.nopeWindow.generation !== this.lastScheduledNopeGeneration) {
      this.clearNopeTimer()
      this.lastScheduledNopeGeneration = playing.nopeWindow.generation
      this.scheduleNopeExpiry(playing.nopeWindow.generation, playing.nopeWindow.deadlineMs - Date.now())
    } else if (!playing.nopeWindow) {
      this.clearNopeTimer()
    }
  }

  private scheduleNopeExpiry(generation: number, remainingMs: number): void {
    this.nopeTimeout = setTimeout(() => {
      this.enqueue(() => {
        this.dispatchServerAction({
          type: 'nope-window-expired',
          windowGeneration: generation,
          playerId: '_server',
        } as EngineAction)

        // Schedule grace expiry — tracked so clearNopeTimer can cancel it
        this.nopeGraceTimeout = setTimeout(() => {
          this.nopeGraceTimeout = null
          this.enqueue(() => this.dispatchServerAction({
            type: 'nope-grace-expired',
            windowGeneration: generation,
            playerId: '_server',
          } as EngineAction))
        }, NOPE_GRACE_MS)
      })
    }, Math.max(0, remainingMs))
  }

  private clearNopeTimer(): void {
    if (this.nopeTimeout) {
      clearTimeout(this.nopeTimeout)
      this.nopeTimeout = null
    }
    if (this.nopeGraceTimeout) {
      clearTimeout(this.nopeGraceTimeout)
      this.nopeGraceTimeout = null
    }
  }

  // --- Serial Queue ---

  private enqueue(task: () => void, connection?: Connection): void {
    if (this.queueDepth >= MAX_QUEUE_DEPTH) {
      console.error(JSON.stringify({ event: 'queue_overflow', room: this.name, queueDepth: this.queueDepth, timestamp: Date.now() }))
      if (connection) this.sendError(connection, 'RATE_LIMITED', 'Server busy, try again')
      return
    }
    this.queueDepth++
    this.actionQueue = this.actionQueue
      .then(task)
      .catch((err: unknown) => {
        console.error(JSON.stringify({ event: 'queue_task_error', room: this.name, error: String(err), timestamp: Date.now() }))
        // Broadcast current state to resync all clients after unexpected error
        try {
          if (this.gameState?.phase === 'lobby') {
            this.broadcastLobbyState()
          } else if (this.gameState) {
            this.broadcastGameState()
          }
        } catch { /* last resort — broadcasting itself failed */ }
      })
      .finally(() => { this.queueDepth-- })
  }

  // --- Broadcasting ---

  private broadcastLobbyState(): void {
    const view = this.buildLobbyView()
    const msg: ServerMessage = { type: 'state-update', payload: view, protocolVersion: PROTOCOL_VERSION }
    const raw = JSON.stringify(msg)
    for (const conn of this.getConnections()) {
      // God connections never receive the player/host state-update stream;
      // only god-events (Unit 6). Skip them here.
      if (this.getConnState(conn)?.role === 'god') continue
      try { conn.send(raw) } catch { /* connection closing */ }
    }
  }

  private broadcastGameState(): void {
    if (!this.gameState || this.gameState.phase === 'lobby') return

    const now = Date.now()
    const state = this.gameState as PlayingState | GameOverState

    // Compute board view once (P2 optimization — not N+1 times)
    const boardView = projectForBoard(state, now, this.getConnectedPlayerIds())
    const boardMsg: ServerMessage = { type: 'state-update', payload: boardView, protocolVersion: PROTOCOL_VERSION }
    const boardRaw = JSON.stringify(boardMsg)

    let hostCount = 0
    let playerCount = 0
    let godCount = 0
    let untypedCount = 0
    let sendFailures = 0

    for (const conn of this.getConnections()) {
      const connState = this.getConnState(conn)
      try {
        if (connState?.role === 'host') {
          hostCount++
          conn.send(boardRaw)
        } else if (connState?.role === 'player') {
          playerCount++
          const playerMsg: ServerMessage = {
            type: 'player-update',
            payload: {
              state: projectForPlayer(state, connState.playerId, boardView),
              private: state.phase === 'playing' ? getPrivateData(state, connState.playerId) : {},
            },
            protocolVersion: PROTOCOL_VERSION,
          }
          conn.send(JSON.stringify(playerMsg))
        } else if (connState?.role === 'god') {
          // God connections receive only god-events, filled in by Unit 6.
          // Counted here so the broadcast log shows distribution.
          godCount++
        } else {
          untypedCount++
        }
      } catch { sendFailures++ }
    }

    console.log(`[broadcastGameState] phase=${state.phase} host=${hostCount} players=${playerCount} god=${godCount} untyped=${untypedCount} failures=${sendFailures}`)
  }

  private buildLobbyView(): LobbyView {
    const connectedPlayerIds = this.getConnectedPlayerIds()

    return {
      phase: 'lobby',
      roomCode: this.name,
      players: [...this.playerNames.entries()].map(([id, name]) => ({
        id,
        name,
        color: this.playerColors.get(id) ?? '#888',
        isConnected: connectedPlayerIds.has(id),
      })),
    }
  }

  private getConnectedPlayerIds(): Set<string> {
    const ids = new Set<string>()
    for (const conn of this.getConnections()) {
      const state = this.getConnState(conn)
      if (state?.role === 'player') ids.add(state.playerId)
    }
    return ids
  }

  // --- Helpers ---

  private getConnState(connection: Connection): ConnState | null {
    return connection.state as ConnState | null
  }

  private hasConnections(): boolean {
    for (const _ of this.getConnections()) return true
    return false
  }

  private send(connection: Connection, msg: ServerMessage): void {
    try { connection.send(JSON.stringify(msg)) } catch { /* closing */ }
  }

  private sendError(connection: Connection, code: ErrorCode, message: string): void {
    this.send(connection, { type: 'error', payload: { code, message } })
  }

  private makeDispatchContext(): DispatchContext {
    // Playtest-mode branch. When `playtestSeed` is populated via a god
    // connection's `playtest-config` message (Unit 5), the ctx carries a
    // seeded mulberry32 generator — deck evolution becomes deterministic
    // given the same seed + action sequence. Production callers never
    // populate `playtestSeed`; the CSPRNG branch below is unchanged.
    //
    // Per-dispatch reseeding (a fresh mulberry32(seed) per ctx). Replay
    // semantics hold: same seed + same action sequence applied to the
    // same initial state reproduces the same final state, because each
    // dispatch consumes the same N random values from an identical
    // stream. The tradeoff is intra-session correlation between shuffle-
    // heavy dispatches — acceptable for harness replayability; revisit
    // if a scenario needs truly independent shuffles.
    if (this.playtestSeed !== undefined) {
      const rand = mulberry32(this.playtestSeed)
      return {
        now: Date.now(),
        nopeWindowMs: this.playtestNopeWindowMs,
        random: rand,
        randomInt: (max: number) => randomIntFromRandom(rand, max),
      }
    }
    const array = new Uint32Array(1)
    return {
      now: Date.now(),
      random: () => {
        crypto.getRandomValues(array)
        return array[0]! / 0x100000000 // [0, 1) — never returns 1.0
      },
      randomInt: (max: number) => {
        // Rejection sampling — eliminates modulo bias
        const limit = 0x100000000 - (0x100000000 % max)
        let val: number
        do {
          crypto.getRandomValues(array)
          val = array[0]!
        } while (val >= limit)
        return val % max
      },
    }
  }

  private isRateLimited(connectionId: string): boolean {
    const now = Date.now()
    const entry = this.messageCounts.get(connectionId)

    if (!entry || now - entry.windowStart > 1000) {
      this.messageCounts.set(connectionId, { count: 1, windowStart: now })
      return false
    }

    entry.count++
    return entry.count > MAX_MESSAGES_PER_SECOND
  }

  // --- Heartbeat ---

  private startHeartbeat(connection: Connection): void {
    this.lastPongTimes.set(connection.id, Date.now())
    const interval = setInterval(() => {
      // Send ping
      try { connection.send(JSON.stringify({ type: 'ping', payload: {} })) } catch { /* closing */ }
      // Check if last activity was within timeout
      const lastActivity = this.lastPongTimes.get(connection.id) ?? 0
      if (Date.now() - lastActivity > HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS) {
        connection.close(1001, 'Heartbeat timeout')
      }
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatIntervals.set(connection.id, interval)
  }

  private stopHeartbeat(connectionId: string): void {
    const interval = this.heartbeatIntervals.get(connectionId)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(connectionId)
    }
  }

  // --- Bulk Timer Cleanup ---

  private clearAllTimers(): void {
    this.clearNopeTimer()
    for (const timer of this.disconnectTimers.values()) clearTimeout(timer)
    this.disconnectTimers.clear()
    for (const interval of this.heartbeatIntervals.values()) clearInterval(interval)
    this.heartbeatIntervals.clear()
    this.lastPongTimes.clear()
  }

  private async persistState(): Promise<void> {
    try {
      await this.ctx.storage.put({
        gameState: this.gameState,
        playerSessions: [...this.playerSessions],
        playerNames: [...this.playerNames],
        playerColors: [...this.playerColors],
        lastActionTime: this.lastActionTime,
      })
      this.consecutivePersistFailures = 0
    } catch (err: unknown) {
      this.consecutivePersistFailures++
      console.error(JSON.stringify({
        event: 'persist_failure',
        room: this.name,
        consecutiveFailures: this.consecutivePersistFailures,
        error: String(err),
        timestamp: Date.now(),
      }))
    }
  }
}

// --- Worker Entry Point (wrangler dev / wrangler deploy) ---
//
// The `Env` interface is declared above the `GameRoom` class so
// `Server<Env>` can parameterize `this.env`. The default export uses the
// same interface.

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // /health runs BEFORE partyserver routing — no Durable Object wake,
    // no room instantiation. Available in every build; see health.ts for
    // response contract. Phase-3 orchestrator polls this as the readiness
    // probe for `wrangler dev` boot.
    const health = handleHealthRequest(request, env)
    if (health) return health
    return (
      (await routePartykitRequest(request, env)) ||
      new Response('Not Found', { status: 404 })
    )
  },
} satisfies ExportedHandler<Env>
