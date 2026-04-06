import { useState, useEffect, Fragment } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState, useProtocolMismatch } from '@client/shared/gameStore'
import { Lobby } from './Lobby'
import { GameTable } from './GameTable'
import { GameOver } from '@client/shared/GameOver'
import { PARTYKIT_HOST } from '@client/shared/config'
import '@client/shared/fonts.css'
import '@client/shared/fonts-mono.css'
import '@client/shared/theme.css'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]!).join('')
}

export function Board() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [roomCode] = useState(() => generateRoomCode())
  const state = useGameState()
  const protocolMismatch = useProtocolMismatch()

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
      <Lobby
        connectionStatus={connectionStatus}
        onStartGame={handleStartGame}
      />
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
      </Fragment>
    )
  }

  return (
    <Fragment key="playing">
      <GameTable />
    </Fragment>
  )
}
