import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '@client/connection'
import { useLastError } from '@client/shared/gameStore'
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
  defaultName?: string
  lobbyPlayers?: readonly LobbyPlayer[]
  /** Whether the board/TV (host) is currently connected. `undefined` while the
   *  client is still pre-lobby (no LobbyView received yet). When `false` AND
   *  the player is already joined, JoinScreen surfaces a "host disconnected"
   *  banner so the user understands why the lobby is frozen. B-02. */
  hostConnected?: boolean
}

export function JoinScreen({ connectionStatus, assignedColor, onJoin, roomCode, playerName, defaultName, lobbyPlayers, hostConnected }: Props) {
  const [name, setName] = useState(defaultName ?? '')
  const [error, setError] = useState<string | null>(null)
  const lastError = useLastError()
  const joined = assignedColor !== null

  // Reclaim hint — populated when the server rejects a mid-game join with
  // GAME_ALREADY_STARTED. The dead-end scenario is a returning player who
  // wiped sessionStorage (closed tab, browser cleared) and mistyped their
  // name. Server returns the list of disconnected (reclaimable) names so
  // we can render a "Did you mean?" picker. B-14.
  const reclaimNames =
    lastError?.code === 'GAME_ALREADY_STARTED' && lastError.disconnectedNames
      ? lastError.disconnectedNames
      : null

  // Surface server errors (`GAME_ALREADY_STARTED`, `NAME_TAKEN`,
  // `NAME_INVALID`, `ROOM_FULL`, ...) the same way as client validation
  // failures. Without this the player UI silently swallows every server
  // refusal — a late-joining seat (or human) just sees the join form
  // unchanged after Check In, with no feedback that the server said no
  // (TODO #6 root-cause investigation, 2026-04-29).
  //
  // `lastError` is a fresh object identity per server message, so this
  // effect re-fires for repeat refusals (same code, new attempt). User
  // typing clears `error` (handled in the input onChange) — that
  // suppression is intentional: it gives the user a clean slate for
  // their next attempt.
  useEffect(() => {
    if (lastError !== null) {
      setError(lastError.message)
    }
  }, [lastError])

  // Mirrors server NAME_PATTERN (room.ts) + validation.ts NameRegex.
  // Keep these three in sync if the pattern ever changes.
  const CLIENT_NAME_PATTERN = /^[a-zA-Z0-9 .!?_-]{1,12}$/

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
    // Pre-validate the character class so the user gets immediate feedback
    // instead of a server NAME_INVALID round trip. E2E audit 2026-04-23 D-17.
    if (!CLIENT_NAME_PATTERN.test(trimmed)) {
      setError('Letters, numbers, spaces, and . ! ? _ - only')
      return
    }
    setError(null)
    onJoin(trimmed)
  }

  if (connectionStatus !== 'connected') {
    // 'gave-up' renders nothing here — the ConnectionOverlay dialog owns
    // the terminal "// CHANNEL DOWN" UI and Refresh button. Returning the
    // "Connecting..." spinner under it would lie to the user.
    if (connectionStatus === 'gave-up') return null
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

          <p className={styles.waiting} data-host-offline={hostConnected === false || undefined}>
            <span className={styles.waitingLabel}>
              {hostConnected === false ? '// HOST OFFLINE' : 'Standing by, awaiting deployment'}
            </span>
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
          onChange={e => {
            setName(e.target.value)
            // Clear stale errors (client validation OR server refusal) so
            // the next attempt starts clean. The server-error effect above
            // will resurface a new message if Check In gets refused again.
            if (error !== null) setError(null)
          }}
        />
        {error && <p className={styles.error}>{error}</p>}
        {reclaimNames && reclaimNames.length > 0 && (
          <div className={styles.reclaimPanel}>
            <p className={styles.reclaimLabel}>// Resume as</p>
            <ul className={styles.reclaimList}>
              {reclaimNames.map(reclaimName => (
                <li key={reclaimName}>
                  <button
                    type="button"
                    className={styles.reclaimButton}
                    onClick={() => {
                      setName(reclaimName)
                      setError(null)
                      onJoin(reclaimName)
                    }}
                  >
                    {reclaimName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button className={styles.joinButton} type="submit">Check In</button>
      </form>
    </div>
  )
}
