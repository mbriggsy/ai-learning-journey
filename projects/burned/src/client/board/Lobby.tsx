import { QRCodeSVG } from 'qrcode.react'
import { m, AnimatePresence } from 'motion/react'
import { useLobbyState } from '@client/shared/gameStore'
import { MOTION } from '@client/shared/tokens/motion'
import type { ConnectionStatus } from '@client/connection'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './Lobby.module.css'

interface Props {
  connectionStatus: ConnectionStatus
  onStartGame: () => void
}

export function Lobby({ connectionStatus, onStartGame }: Props) {
  const lobby = useLobbyState()

  const roomCode = lobby?.roomCode
  const playerUrl = roomCode ? `${window.location.origin}/player.html?room=${roomCode}` : ''

  if (connectionStatus !== 'connected' || !lobby) {
    return (
      <div className={styles.container}>
        <p className={styles.waiting}>
          Opening secure channel
          <span className={styles.waitingDots}>
            <span className={styles.waitingDot} />
            <span className={styles.waitingDot} />
            <span className={styles.waitingDot} />
          </span>
        </p>
      </div>
    )
  }

  const canStart = lobby.players.length >= 2
  const shortBy = 2 - lobby.players.length

  return (
    <div className={styles.container}>
      <p className={styles.classified}>The Pendleton Agency // Eyes Only</p>
      <h1 className={styles.title}>BURNED</h1>
      <div className={styles.titleAccent} />

      <div className={styles.qrSection}>
        <span className={styles.deployLabel}>// Deploy Operative</span>
        <div className={styles.qrFrame}>
          <QRCodeSVG value={playerUrl} size={140} bgColor="transparent" fgColor="#1a2e30" />
        </div>
        <span className={styles.roomCode}>{lobby.roomCode}</span>
        <span className={styles.hint}>Scan &amp; check in</span>
      </div>

      <div className={styles.roster}>
        <div className={styles.rosterHeader}>
          <span className={styles.rosterLabel}>Active Operatives</span>
          <span className={styles.rosterCount}>{lobby.players.length} / 10</span>
        </div>

        <AnimatePresence mode="popLayout">
          {lobby.players.map((player, i) => (
            <m.div
              key={player.id}
              className={styles.playerCard}
              // Transform string keeps the staggered slide-in GPU-composited.
              // mode="popLayout" + staggered spring can pile up on the main
              // thread when multiple players check in rapidly.
              initial={{ opacity: 0, transform: 'translateX(40px) scale(0.95)' }}
              animate={{ opacity: 1, transform: 'translateX(0px) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateX(-40px) scale(0.95)' }}
              transition={{ ...MOTION.snappy, delay: i * 0.06 }}
            >
              <PlayerIcon color={player.color} size={18} />
              <span className={styles.playerName}>{player.name}</span>
              {!player.isConnected && (
                <span className={styles.disconnectedBadge}>off-grid</span>
              )}
            </m.div>
          ))}
        </AnimatePresence>

        {lobby.players.length === 0 && (
          <p className={styles.waiting}>
            Awaiting check-in
            <span className={styles.waitingDots}>
              <span className={styles.waitingDot} />
              <span className={styles.waitingDot} />
              <span className={styles.waitingDot} />
            </span>
          </p>
        )}
      </div>

      <button
        className={styles.startButton}
        onClick={onStartGame}
        disabled={!canStart}
      >
        {canStart ? 'Cleared Hot' : shortBy === 1 ? 'One short' : `${shortBy} operatives short`}
      </button>
    </div>
  )
}
