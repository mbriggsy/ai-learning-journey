import { useState, useEffect, Fragment, type ReactNode } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState, useProtocolMismatch, useLastError } from '@client/shared/gameStore'
import type { GameError } from '@client/shared/gameStore'
import { Lobby } from './Lobby'
import { GameTable } from './GameTable'
import { EndGameControl } from './EndGameControl'
import { GameOver } from '@client/shared/GameOver'
import { DramaOverlay } from '@client/shared/DramaOverlay'
import { PARTYKIT_HOST } from '@client/shared/config'
import '@client/shared/fonts-mono.css'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 31 chars, no ambiguous 0/O/1/I/L
  const limit = 256 - (256 % chars.length) // 248 — rejection sampling eliminates modulo bias
  const buf = new Uint8Array(1)
  let code = ''
  for (let i = 0; i < 6; i++) {
    let val: number
    do { crypto.getRandomValues(buf); val = buf[0]! } while (val >= limit)
    code += chars[val % chars.length]!
  }
  return code
}

function getOrCreateRoomCode(): string {
  // Persist room code in URL hash so board refresh can rejoin
  const hash = window.location.hash.replace('#', '')
  if (hash) return hash
  const code = generateRoomCode()
  window.location.hash = code
  return code
}

// Host session token — held in sessionStorage so a WiFi-blip reconnect
// from the same tab presents the same token and reclaims the host seat.
// A second tab opening during the blip mints a DIFFERENT token; the
// server rejects its claim while hostSession is still set on the prior
// holder. Per-tab via sessionStorage so closing the tab fully releases
// the seat (after the server-side grace expires). B-01.
const HOST_SESSION_KEY = 'burned-host-session'

function getOrCreateHostSessionToken(): string {
  try {
    const existing = window.sessionStorage.getItem(HOST_SESSION_KEY)
    if (existing) return existing
    const token = crypto.randomUUID()
    window.sessionStorage.setItem(HOST_SESSION_KEY, token)
    return token
  } catch {
    // sessionStorage unavailable (private mode, sandbox restrictions) —
    // fall back to a freshly-minted token. Reclaim won't work in that
    // mode, but a host claim still succeeds first-time.
    return crypto.randomUUID()
  }
}

// Per product spec §3.4, board view is landscape-only. An iPad in portrait
// (or a phone accidentally navigating to /board.html) renders a broken
// layout — DrawPile overlaps discard, PlayerStrip cuts off, COMMS stretches.
// Detect portrait AND narrow (so landscape monitors stay fine) and show a
// rotate-device splash. E2E audit 2026-04-23 C-03.
function useIsPortraitBoard(): boolean {
  // Spec §3.4: board view is landscape-only. ANY portrait render is
  // explicitly unsupported — iPad-portrait (1024×1366) shipped a broken
  // layout in the audit (DrawPile overlapping discard, PlayerStrip cut
  // off left, COMMS stretched). No width threshold: if it's portrait,
  // it's wrong. TVs are always landscape so this never fires for them.
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(orientation: portrait)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(orientation: portrait)')
    const check = () => setIsPortrait(mq.matches)
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])
  return isPortrait
}

function RotateDeviceSplash() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', gap: '1.5rem',
      background: 'var(--color-bg-surface, #0c0a12)',
      color: 'var(--color-fg-primary, #f5e6d3)',
      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
      textAlign: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        fontFamily: 'var(--font-display, system-ui)',
        fontWeight: 900,
        fontSize: 'clamp(2rem, 8vw, 3.5rem)',
        letterSpacing: '-0.015em',
        textTransform: 'uppercase',
        color: 'var(--color-accent-burned, #d0332b)',
        textShadow: '0 0 40px color-mix(in oklab, var(--color-accent-burned, #d0332b) 40%, transparent)',
      }}>
        Rotate Device
      </div>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        opacity: 0.72,
        maxWidth: '28ch',
        lineHeight: 1.5,
      }}>
        The Pendleton Agency briefing room requires landscape orientation.
      </div>
      <div style={{
        fontSize: 'clamp(3rem, 10vw, 5rem)',
        opacity: 0.5,
        transform: 'rotate(90deg)',
      }}>
        ↻
      </div>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.75rem',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        opacity: 0.45,
        marginTop: '1rem',
      }}>
        // Classified // Awaiting signal
      </div>
    </div>
  )
}

export function Board() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [roomCode] = useState(getOrCreateRoomCode)
  const state = useGameState()
  const protocolMismatch = useProtocolMismatch()
  const lastError = useLastError()
  const isPortraitBoard = useIsPortraitBoard()

  useEffect(() => {
    const unsubMsg = onMessage(msg => gameStore.handleMessage(msg))
    const unsubStatus = onStatusChange(setConnectionStatus)

    const unsubHostConnect = onStatusChange(s => {
      if (s === 'connected') {
        send({ type: 'host-connect', payload: { sessionToken: getOrCreateHostSessionToken() } })
      }
    })

    connect(roomCode, PARTYKIT_HOST)

    return () => {
      unsubMsg()
      unsubStatus()
      unsubHostConnect()
      disconnect()
    }
  }, [roomCode])

  const handleStartGame = () => {
    send({ type: 'start-game', payload: {} })
  }

  const handlePlayAgain = () => {
    send({ type: 'return-to-lobby', payload: {} })
  }

  // End Game nukes an in-progress game back to lobby — same wire as
  // play-again, different user intent. Used when the party wants to bail
  // on a stalled or abandoned room (ghost player, bad deal, whatever).
  const handleEndGame = () => {
    send({ type: 'return-to-lobby', payload: {} })
  }

  // Portrait check wins over everything — do NOT render broken layout.
  // Protocol mismatch still needs to show because it's a different class
  // of "you can't play right now" (client needs refresh).
  if (isPortraitBoard) {
    return <RotateDeviceSplash />
  }

  if (protocolMismatch) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--bg-primary, #0c0a12)',
        color: 'var(--amber, #e8922a)', fontSize: 24, fontWeight: 700, textAlign: 'center',
      }}>
        Game updated — please refresh
      </div>
    )
  }

  // Route by phase. DramaOverlay lives OUTSIDE the phase-keyed Fragments
  // so it survives the playing → game_over transition. If it lived inside
  // the playing Fragment, the burned-drawn + player-eliminated + game-over
  // events that fire on the final elimination would unmount the overlay
  // before the queue could process. The fresh instance in game_over would
  // seed lastProcessedRef to the tail and skip those very events. Result:
  // no BURNED card-flip, no ELIMINATION beat, no WINS ceremony — the
  // game's biggest moments rendered as silent. Surfaced 2026-05-02 by
  // Briggsy on the GAME OVER WINS spot-check ("no burned treatment").
  let phaseContent: ReactNode
  if (!state || state.phase === 'lobby') {
    phaseContent = (
      <Lobby
        connectionStatus={connectionStatus}
        onStartGame={handleStartGame}
      />
    )
  } else if (state.phase === 'game_over') {
    phaseContent = (
      <Fragment key="game_over">
        <GameOver
          players={state.players}
          winnerId={state.winnerId}
          eliminationOrder={state.eliminationOrder}
          onPlayAgain={handlePlayAgain}
        />
      </Fragment>
    )
  } else {
    // EndGameControl lives as a SIBLING of GameTable, not inside it —
    // `.table` uses `contain: layout` which creates a containing block for
    // position: fixed descendants. A modal rendered inside the table gets
    // scoped to table bounds AND sits below the game chrome's z-index 100
    // layers (BlotterContent, Arena). Hoisting to this Fragment escapes
    // the contain scope so the backdrop covers the full viewport and the
    // modal paints above everything except DramaOverlay.
    phaseContent = (
      <Fragment key="playing">
        <GameTable />
        <EndGameControl onEndGame={handleEndGame} />
      </Fragment>
    )
  }

  return (
    <>
      {phaseContent}
      {/* DramaOverlay only mounts once we have game state (post-lobby).
          During lobby the event feed is empty so mounting is harmless,
          but we skip it for tidiness and to avoid the first-mount
          seeding work on every lobby render. */}
      {state && state.phase !== 'lobby' && <DramaOverlay />}
      <BoardErrorBanner error={lastError} />
    </>
  )
}

function BoardErrorBanner({ error }: { error: GameError | null }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!error) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [error])
  if (!visible || !error) return null
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 24px', borderRadius: 8, fontSize: 16, fontWeight: 600,
      background: 'color-mix(in srgb, var(--red, #e03535) 90%, transparent)', color: 'var(--text-primary, #e8e8f0)', zIndex: 100,
    }}>
      {error.message}
    </div>
  )
}
