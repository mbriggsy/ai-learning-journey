import { useState, useEffect } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus, getSessionToken, setSessionToken } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore } from '@client/shared/gameStore'
import { JoinScreen } from './JoinScreen'

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999'

function getRoomCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('room') ?? ''
}

export function Player() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [assignedColor, setAssignedColor] = useState<string | null>(null)
  const [roomCode] = useState(getRoomCodeFromUrl)

  useEffect(() => {
    if (!roomCode) return

    const unsubMsg = onMessage(msg => {
      gameStore.handleMessage(msg)

      if (msg.type === 'joined') {
        setSessionToken(roomCode, msg.payload.sessionToken)
        setAssignedColor(msg.payload.color)
      }
    })
    const unsubStatus = onStatusChange(setConnectionStatus)

    // Auto-rejoin on every connect (including reconnects after WiFi blip)
    const unsubAutoJoin = onStatusChange(s => {
      if (s === 'connected') {
        const token = getSessionToken(roomCode)
        if (token) {
          send({ type: 'join', payload: { name: '', sessionToken: token } })
        }
      }
    })

    connect(roomCode, PARTYKIT_HOST)

    return () => {
      unsubMsg()
      unsubStatus()
      unsubAutoJoin()
      disconnect()
    }
  }, [roomCode])

  if (!roomCode) {
    return <div className="no-room">
      <p>No room code. Scan the QR code on the TV screen.</p>
    </div>
  }

  const handleJoin = (name: string) => {
    const token = getSessionToken(roomCode)
    send({ type: 'join', payload: { name, sessionToken: token ?? undefined } })
  }

  return (
    <JoinScreen
      connectionStatus={connectionStatus}
      assignedColor={assignedColor}
      onJoin={handleJoin}
      roomCode={roomCode}
    />
  )
}
