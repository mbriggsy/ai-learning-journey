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
    const displayName = name || playerName || 'Operative'
    return (
      <div className={styles.joinedContainer}>
        {/* Top classified strip — agency header + room code */}
        <header className={styles.agencyBar}>
          <span className={styles.agencyLabel}>The Pendleton Agency</span>
          <span className={styles.agencyCode}>/ {roomCode}</span>
        </header>

        {/* Main operative dossier card */}
        <section className={styles.dossierCard} aria-label="Your dossier">
          <div className={styles.dossierCorner} data-corner="tl" aria-hidden="true" />
          <div className={styles.dossierCorner} data-corner="tr" aria-hidden="true" />
          <div className={styles.dossierCorner} data-corner="bl" aria-hidden="true" />
          <div className={styles.dossierCorner} data-corner="br" aria-hidden="true" />

          <p className={styles.dossierLabel}>// Operative</p>

          <div className={styles.dossierIdentity}>
            <div className={styles.iconWrap}>
              <PlayerIcon color={assignedColor} size={56} />
            </div>
            <p className={styles.joinedName}>{displayName}</p>
          </div>

          <div className={styles.dossierDivider} />

          <p className={styles.waiting}>
            <span className={styles.waitingLabel}>Standing by, awaiting deployment</span>
            <span className={styles.waitingDots} />
          </p>
        </section>

        {/* Active operatives panel */}
        {lobbyPlayers && lobbyPlayers.length > 1 && (
          <section className={styles.rosterPanel} aria-label="Active operatives">
            <header className={styles.rosterHeader}>
              <span className={styles.rosterLabel}>Active Operatives</span>
              <span className={styles.rosterCount}>{lobbyPlayers.length}</span>
            </header>
            <ul className={styles.lobbyList}>
              {lobbyPlayers.map(p => (
                <li key={p.id} className={styles.lobbyPlayer}>
                  <PlayerIcon color={p.color} size={18} />
                  <span className={styles.lobbyPlayerName}>{p.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>BURNED</h1>
      <div className={styles.roomBadge}>
        <span className={styles.roomLabel}>Agent Code</span>
        <span className={styles.roomCode}>{roomCode}</span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Operative name"
          maxLength={12}
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.joinButton} type="submit">Check In</button>
      </form>
    </div>
  )
}
