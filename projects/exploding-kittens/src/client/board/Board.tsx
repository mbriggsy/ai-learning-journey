import { useState, useEffect } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore } from '@client/shared/gameStore'
import { Lobby } from './Lobby'

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]!).join('')
}

export function Board() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [roomCode] = useState(() => generateRoomCode())

  useEffect(() => {
    const unsubMsg = onMessage(msg => gameStore.handleMessage(msg))
    const unsubStatus = onStatusChange(setConnectionStatus)

    // Send host-connect on every connect (including reconnects after WiFi blip)
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

  return (
    <Lobby
      connectionStatus={connectionStatus}
      onStartGame={handleStartGame}
    />
  )
}
