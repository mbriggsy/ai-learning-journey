import { useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { m, AnimatePresence } from 'motion/react'
import { useLobbyState } from '@client/shared/gameStore'
import { MOTION } from '@client/shared/animation-config'
import type { ConnectionStatus } from '@client/connection'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './Lobby.module.css'

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

const BOT_NAMES = [
  'Whiskers', 'Mittens', 'Tuna', 'Pickles', 'Nugget',
  'Waffles', 'Beans', 'Mochi', 'Churro', 'Biscuit',
] as const

interface Props {
  connectionStatus: ConnectionStatus
  onStartGame: () => void
}

export function Lobby({ connectionStatus, onStartGame }: Props) {
  const lobby = useLobbyState()
  const botCountRef = useRef(0)

  const roomCode = lobby?.roomCode
  const playerUrl = roomCode ? `${window.location.origin}/player.html?room=${roomCode}` : ''

  const addBot = useCallback(() => {
    if (!playerUrl) return
    const name = BOT_NAMES[botCountRef.current % BOT_NAMES.length]!
    botCountRef.current++
    window.open(
      `${playerUrl}&name=${name}`,
      `bot-${botCountRef.current}-${name}`,
      'width=390,height=844',
    )
  }, [playerUrl])

  if (connectionStatus !== 'connected' || !lobby) {
    return (
      <div className={styles.container}>
        <p className={styles.waiting}>
          Creating room
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Exploding Kittens</h1>
      <div className={styles.titleAccent} />

      <div className={styles.qrSection}>
        <div className={styles.qrFrame}>
          <QRCodeSVG value={playerUrl} size={180} bgColor="transparent" fgColor="#e8e8f0" />
        </div>
        <span className={styles.roomCode}>{lobby.roomCode}</span>
        <span className={styles.hint}>Scan to join</span>
      </div>

      <div className={styles.roster}>
        <div className={styles.rosterHeader}>
          <span className={styles.rosterLabel}>Players</span>
          <span className={styles.rosterCount}>{lobby.players.length}/10</span>
        </div>

        <AnimatePresence mode="popLayout">
          {lobby.players.map((player, i) => (
            <m.div
              key={player.id}
              className={styles.playerCard}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.95 }}
              transition={{ ...MOTION.SNAPPY, delay: i * 0.06 }}
            >
              <PlayerIcon color={player.color} size={18} />
              <span className={styles.playerName}>{player.name}</span>
              {!player.isConnected && (
                <span className={styles.disconnectedBadge}>disconnected</span>
              )}
            </m.div>
          ))}
        </AnimatePresence>

        {lobby.players.length === 0 && (
          <p className={styles.waiting}>
            Waiting for players
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
        {canStart ? 'Start Game' : `Need ${2 - lobby.players.length} more`}
      </button>

      {isDev && (
        <div className={styles.devToolbar}>
          <button className={styles.devBtn} onClick={addBot}>+ Add Player</button>
          <button className={styles.devBtn} onClick={() => { addBot(); addBot() }}>+ Add 2</button>
          <button className={styles.devBtn} onClick={() => { for (let i = 0; i < 4; i++) addBot() }}>+ Add 4</button>
        </div>
      )}
    </div>
  )
}
