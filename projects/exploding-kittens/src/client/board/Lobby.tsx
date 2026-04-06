import { QRCodeSVG } from 'qrcode.react'
import { useLobbyState } from '@client/shared/gameStore'
import type { ConnectionStatus } from '@client/connection'
import styles from './Lobby.module.css'

interface Props {
  connectionStatus: ConnectionStatus
  onStartGame: () => void
}

export function Lobby({ connectionStatus, onStartGame }: Props) {
  const lobby = useLobbyState()

  if (connectionStatus !== 'connected' || !lobby) {
    return <div className={styles.container}><p className={styles.status}>Creating room...</p></div>
  }

  const playerUrl = `${window.location.origin}/player.html?room=${lobby.roomCode}`
  const canStart = lobby.players.length >= 2

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Exploding Kittens</h1>

      <div className={styles.qrSection}>
        <QRCodeSVG value={playerUrl} size={200} bgColor="transparent" fgColor="#ffffff" />
        <p className={styles.roomCode}>{lobby.roomCode}</p>
        <p className={styles.hint}>Scan to join</p>
      </div>

      <div className={styles.playerList}>
        {lobby.players.map(player => (
          <div key={player.id} className={styles.player}>
            <span className={styles.dot} style={{ backgroundColor: player.color }} />
            <span className={styles.playerName}>{player.name}</span>
            {!player.isConnected && <span className={styles.disconnected}>disconnected</span>}
          </div>
        ))}
        {lobby.players.length === 0 && (
          <p className={styles.waiting}>Waiting for players...</p>
        )}
      </div>

      <button
        className={styles.startButton}
        onClick={onStartGame}
        disabled={!canStart}
      >
        {canStart ? 'Start Game' : `Need ${2 - lobby.players.length} more`}
      </button>
    </div>
  )
}
