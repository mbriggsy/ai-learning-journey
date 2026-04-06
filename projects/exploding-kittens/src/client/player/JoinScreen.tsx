import { useState } from 'react'
import type { ConnectionStatus } from '@client/connection'
import styles from './JoinScreen.module.css'

interface Props {
  connectionStatus: ConnectionStatus
  assignedColor: string | null
  onJoin: (name: string) => void
  roomCode: string
}

export function JoinScreen({ connectionStatus, assignedColor, onJoin, roomCode }: Props) {
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
        <p className={styles.status}>Connecting...</p>
      </div>
    )
  }

  if (joined) {
    return (
      <div className={styles.container}>
        <div className={styles.joinedCard}>
          <span className={styles.dot} style={{ backgroundColor: assignedColor }} />
          <p className={styles.joinedName}>{name || 'You'}</p>
          <p className={styles.waiting}>Waiting for host to start...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Join Game</h1>
      <p className={styles.room}>Room: <strong>{roomCode}</strong></p>

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
        <button className={styles.joinButton} type="submit">Join</button>
      </form>
    </div>
  )
}
