import { useState } from 'react'
import type { ConnectionStatus } from '@client/connection'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './JoinScreen.module.css'

interface LobbyPlayer {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly isConnected: boolean
}

interface Props {
  connectionStatus: ConnectionStatus
  assignedColor: string | null
  onJoin: (name: string) => void
  roomCode: string
  playerName?: string
  lobbyPlayers?: readonly LobbyPlayer[]
}

export function JoinScreen({ connectionStatus, assignedColor, onJoin, roomCode, playerName, lobbyPlayers }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const joined = assignedColor !== null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name')
      return
    }
    if (trimmed.length > 12) {
      setError('Max 12 characters')
      return
    }
    setError(null)
    onJoin(trimmed)
  }

  if (connectionStatus !== 'connected') {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.status}>Connecting...</p>
      </div>
    )
  }

  if (joined) {
    return (
      <div className={styles.container}>
        <div className={styles.joinedCard}>
          <div className={styles.iconWrap}>
            <PlayerIcon color={assignedColor} size={48} />
          </div>
          <p className={styles.joinedName}>{name || playerName || 'You'}</p>
          <p className={styles.waiting}>
            <span className={styles.waitingDots}>Waiting for host</span>
          </p>
        </div>

        {lobbyPlayers && lobbyPlayers.length > 1 && (
          <div className={styles.lobbyList}>
            {lobbyPlayers.map(p => (
              <div key={p.id} className={styles.lobbyPlayer}>
                <PlayerIcon color={p.color} size={20} />
                <span className={styles.lobbyPlayerName}>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Exploding Kittens</h1>
      <div className={styles.roomBadge}>
        <span className={styles.roomLabel}>Room</span>
        <span className={styles.roomCode}>{roomCode}</span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Your name"
          maxLength={12}
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.joinButton} type="submit">Join Game</button>
      </form>
    </div>
  )
}
