import { useState, useEffect, Fragment } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState, useProtocolMismatch, useLastError } from '@client/shared/gameStore'
import type { GameError } from '@client/shared/gameStore'
import { Lobby } from './Lobby'
import { GameTable } from './GameTable'
import { GameOver } from '@client/shared/GameOver'
import { PARTYKIT_HOST } from '@client/shared/config'
import '@client/shared/fonts.css'
import '@client/shared/fonts-mono.css'
import '@client/shared/theme.css'

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

export function Board() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [roomCode] = useState(getOrCreateRoomCode)
  const state = useGameState()
  const protocolMismatch = useProtocolMismatch()
  const lastError = useLastError()

  useEffect(() => {
    const unsubMsg = onMessage(msg => gameStore.handleMessage(msg))
    const unsubStatus = onStatusChange(setConnectionStatus)

    const unsubHostConnect = onStatusChange(s => {
      if (s === 'connected') {
        send({ type: 'host-connect', payload: {} })
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

  if (protocolMismatch) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--bg-primary, #0c0a12)',
        color: '#e67e22', fontSize: 24, fontWeight: 700, textAlign: 'center',
      }}>
        Game updated — please refresh
      </div>
    )
  }

  // Route by phase
  if (!state || state.phase === 'lobby') {
    return (
      <>
        <Lobby
          connectionStatus={connectionStatus}
          onStartGame={handleStartGame}
        />
        <BoardErrorBanner error={lastError} />
      </>
    )
  }

  if (state.phase === 'game_over') {
    return (
      <Fragment key="game_over">
        <GameOver
          players={state.players}
          winnerId={state.winnerId}
          eliminationOrder={state.eliminationOrder}
        />
        <BoardErrorBanner error={lastError} />
      </Fragment>
    )
  }

  return (
    <Fragment key="playing">
      <GameTable />
      <BoardErrorBanner error={lastError} />
    </Fragment>
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
      background: 'rgba(231, 76, 60, 0.9)', color: '#fff', zIndex: 100,
    }}>
      {error.message}
    </div>
  )
}
