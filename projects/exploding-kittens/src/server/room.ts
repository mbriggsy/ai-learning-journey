import { Server } from 'partyserver'
import type { Connection, ConnectionContext } from 'partyserver'
import { parseClientMessage } from './validation'
import { createLobbyState, dispatch } from './game/engine'
import { projectForBoard, projectForPlayer, getPrivateData } from './projection'
import type { GameState, PlayingState, GameOverState, DispatchContext, DispatchResult, ErrorCode as EngineErrorCode } from './game/types'
import type { ClientAction, EngineAction } from '@shared/actions'
import { SERVER_ONLY_ACTIONS } from '@shared/actions'
import type { SubPhase } from '@shared/types'
import type { ServerMessage, LobbyView, ErrorCode } from '@shared/protocol'

// --- Constants ---

const MAX_MESSAGE_BYTES = 4096
const MAX_PLAYERS = 10
const MAX_MESSAGES_PER_SECOND = 10
const PROMPT_TIMEOUT_MS = 60_000
const INACTIVITY_TIMEOUT_MS = 15 * 60_000
const IDLE_ROOM_TIMEOUT_MS = 30 * 60_000
const MAX_QUEUE_DEPTH = 100
const NOPE_GRACE_MS = 300

const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
] as const

const NAME_PATTERN = /^[a-zA-Z0-9 !?.,'-]+$/

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
    case 'MAX_CHAIN_DEPTH': return 'INVALID_ACTION'
  }
}

// --- Connection State ---

type ConnState =
  | { role: 'host' }
  | { role: 'player'; playerId: string; sessionToken: string }

// --- Room ---

export class GameRoom extends Server {
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
  private nopeWindowGeneration = 0
  private promptTimeout: ReturnType<typeof setTimeout> | null = null

  // --- Rate Limiting ---
  private messageCounts = new Map<string, { count: number; windowStart: number }>()

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

    // Restore Nope timer if window was active
    if (this.gameState?.phase === 'playing') {
      const playing = this.gameState as PlayingState
      if (playing.nopeWindow) {
        const remaining = playing.nopeWindow.deadlineMs - Date.now()
        if (remaining <= 0) {
          this.enqueue(() => this.dispatchServerAction({
            type: 'nope-window-expired',
            windowGeneration: playing.nopeWindow!.generation,
            playerId: '_server',
          }))
        } else {
          this.scheduleNopeExpiry(playing.nopeWindow.generation, remaining)
        }
      }

      // Restore prompt timeouts for pending sub-phases
      if (playing.subPhase !== 'turn-active' && playing.subPhase !== 'eliminated-check') {
        this.schedulePromptTimeout(playing.subPhase)
      }
    }

    // Schedule inactivity alarm
    await this.ctx.storage.setAlarm(Date.now() + INACTIVITY_TIMEOUT_MS)
  }

  override onConnect(_connection: Connection, _ctx: ConnectionContext): void {
    // Connection is fresh — state will be set on first message (host-connect or join)
  }

  override onMessage(connection: Connection, message: string | ArrayBuffer): void {
    if (typeof message !== 'string') {
      connection.close(1003, 'Binary messages not supported')
      return
    }

    if (message.length > MAX_MESSAGE_BYTES) {
      connection.close(1009, 'Message too large')
      return
    }

    // Rate limiting
    if (this.isRateLimited(connection.id)) {
      this.sendError(connection, 'RATE_LIMITED', 'Too many messages')
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
        this.enqueue(() => this.handleHostConnect(connection))
        break
      case 'join':
        this.enqueue(() => this.handleJoin(connection, msg.payload.name, msg.payload.sessionToken))
        break
      case 'start-game':
        this.enqueue(() => this.handleStartGame(connection))
        break
      case 'action':
        this.enqueue(() => this.handleAction(connection, msg.payload))
        break
      case 'ping':
        this.send(connection, { type: 'pong', payload: {} })
        break
    }
  }

  override onClose(connection: Connection): void {
    const state = this.getConnState(connection)
    if (state?.role === 'player') {
      // Broadcast appropriate state based on current phase
      if (this.gameState?.phase === 'lobby') {
        this.broadcastLobbyState()
      } else if (this.gameState) {
        this.broadcastGameState()
      }
      void this.persistState()
    }

    // Schedule idle room cleanup if no connections remain
    if (!this.hasConnections()) {
      void this.ctx.storage.setAlarm(Date.now() + IDLE_ROOM_TIMEOUT_MS)
    }

    this.messageCounts.delete(connection.id)
  }

  override async onAlarm(): Promise<void> {
    if (!this.hasConnections()) {
      await this.ctx.storage.deleteAll()
      return
    }

    const elapsed = Date.now() - this.lastActionTime
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      this.broadcast(JSON.stringify({
        type: 'error',
        payload: { code: 'KICKED', message: 'Game ended due to inactivity' },
      } satisfies ServerMessage))
      for (const conn of this.getConnections()) {
        conn.close(1000, 'Inactivity timeout')
      }
      await this.ctx.storage.deleteAll()
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
    // Reconnection with session token (name can be empty for reconnects)
    if (sessionToken) {
      const existingPlayerId = this.playerSessions.get(sessionToken)
      if (existingPlayerId) {
        this.handleReconnect(connection, existingPlayerId, sessionToken)
        return
      }
      // Invalid token — fall through to new join (if still in lobby)
      if (this.gameState?.phase !== 'lobby') {
        this.sendError(connection, 'INVALID_ACTION', 'Invalid session token')
        return
      }
    }

    // New join requires lobby phase
    if (this.gameState?.phase !== 'lobby') {
      this.sendError(connection, 'GAME_ALREADY_STARTED', 'Game has already started')
      return
    }

    // Name validation (required for new joins)
    const name = rawName.trim().slice(0, 12)
    if (!name || !NAME_PATTERN.test(name)) {
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

    this.send(connection, { type: 'joined', payload: { playerId, sessionToken: token, color } })

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
    this.send(connection, { type: 'joined', payload: { playerId, sessionToken, color } })

    if (this.gameState) {
      if (this.gameState.phase === 'lobby') {
        this.broadcastLobbyState()
      } else {
        const now = Date.now()
        const state = this.gameState as PlayingState | GameOverState
        const board = projectForBoard(state, now)
        this.send(connection, {
          type: 'player-update',
          payload: {
            state: projectForPlayer(state, playerId, board),
            private: state.phase === 'playing' ? getPrivateData(state, playerId) : {},
          },
        })
      }
    }

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
    this.updatePromptTimer()
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
        console.error('Server action failed:', action.type, result.error, result.code)
      }
      return
    }

    this.gameState = result.state
    this.lastActionTime = Date.now()
    this.updateNopeTimer(result)
    this.updatePromptTimer()
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
    if (playing.nopeWindow && playing.nopeWindow.generation > this.nopeWindowGeneration) {
      this.clearNopeTimer()
      this.nopeWindowGeneration = playing.nopeWindow.generation
      this.scheduleNopeExpiry(playing.nopeWindow.generation, playing.nopeWindow.deadlineMs - Date.now())
    } else if (!playing.nopeWindow) {
      this.clearNopeTimer()
    }
  }

  private scheduleNopeExpiry(generation: number, remainingMs: number): void {
    this.nopeTimeout = setTimeout(() => {
      this.enqueue(() => this.dispatchServerAction({
        type: 'nope-window-expired',
        windowGeneration: generation,
        playerId: '_server',
      } as EngineAction))
    }, Math.max(0, remainingMs + NOPE_GRACE_MS))
  }

  private clearNopeTimer(): void {
    if (this.nopeTimeout) {
      clearTimeout(this.nopeTimeout)
      this.nopeTimeout = null
    }
  }

  // --- Prompt Timer ---

  private updatePromptTimer(): void {
    this.clearPromptTimer()

    if (!this.gameState || this.gameState.phase !== 'playing') return
    const playing = this.gameState as PlayingState

    if (playing.subPhase !== 'turn-active' && playing.subPhase !== 'eliminated-check') {
      this.schedulePromptTimeout(playing.subPhase)
    }
  }

  private schedulePromptTimeout(subPhase: SubPhase): void {
    this.promptTimeout = setTimeout(() => {
      this.enqueue(() => this.dispatchServerAction({
        type: 'prompt-timeout',
        subPhase,
        playerId: '_server',
      } as EngineAction))
    }, PROMPT_TIMEOUT_MS)
  }

  private clearPromptTimer(): void {
    if (this.promptTimeout) {
      clearTimeout(this.promptTimeout)
      this.promptTimeout = null
    }
  }

  // --- Serial Queue ---

  private enqueue(task: () => void): void {
    if (this.queueDepth >= MAX_QUEUE_DEPTH) return
    this.queueDepth++
    this.actionQueue = this.actionQueue
      .then(task)
      .catch((err: unknown) => {
        console.error('Queue task error:', err)
      })
      .finally(() => { this.queueDepth-- })
  }

  // --- Broadcasting ---

  private broadcastLobbyState(): void {
    const view = this.buildLobbyView()
    const msg: ServerMessage = { type: 'state-update', payload: view }
    const raw = JSON.stringify(msg)
    for (const conn of this.getConnections()) {
      try { conn.send(raw) } catch { /* connection closing */ }
    }
  }

  private broadcastGameState(): void {
    if (!this.gameState || this.gameState.phase === 'lobby') return

    const now = Date.now()
    const state = this.gameState as PlayingState | GameOverState

    // Compute board view once (P2 optimization — not N+1 times)
    const boardView = projectForBoard(state, now)
    const boardMsg: ServerMessage = { type: 'state-update', payload: boardView }
    const boardRaw = JSON.stringify(boardMsg)

    for (const conn of this.getConnections()) {
      const connState = this.getConnState(conn)
      try {
        if (connState?.role === 'host') {
          conn.send(boardRaw)
        } else if (connState?.role === 'player') {
          const playerMsg: ServerMessage = {
            type: 'player-update',
            payload: {
              state: projectForPlayer(state, connState.playerId, boardView),
              private: state.phase === 'playing' ? getPrivateData(state, connState.playerId) : {},
            },
          }
          conn.send(JSON.stringify(playerMsg))
        }
      } catch { /* connection closing */ }
    }
  }

  private buildLobbyView(): LobbyView {
    const connectedPlayerIds = new Set<string>()
    for (const conn of this.getConnections()) {
      const state = this.getConnState(conn)
      if (state?.role === 'player') {
        connectedPlayerIds.add(state.playerId)
      }
    }

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

  private async persistState(): Promise<void> {
    try {
      await this.ctx.storage.put({
        gameState: this.gameState,
        playerSessions: [...this.playerSessions],
        playerNames: [...this.playerNames],
        playerColors: [...this.playerColors],
        lastActionTime: this.lastActionTime,
      })
    } catch (err: unknown) {
      console.error('Failed to persist game state:', err)
    }
  }
}
