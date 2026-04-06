import { useState, useEffect, Fragment } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState } from '@client/shared/gameStore'
import { Lobby } from './Lobby'
import { GameTable } from './GameTable'
import { GameOver } from '@client/shared/GameOver'
import '@client/shared/theme.css'

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999'

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
