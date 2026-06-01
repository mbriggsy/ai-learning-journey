import { QRCodeSVG } from 'qrcode.react'
import { m, AnimatePresence } from 'motion/react'
import { useLobbyState } from '@client/shared/gameStore'
import { MOTION } from '@client/shared/tokens/motion'
import type { ConnectionStatus } from '@client/connection'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import { HOWTOPLAY_URL } from '@client/shared/howtoplayUrl'
import { BriefingRoom } from './BriefingRoom'
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
      <BriefingRoom>
        <div className={styles.connecting}>
          <p className={styles.waiting}>
            Opening secure channel
            <span className={styles.waitingDots}>
              <span className={styles.waitingDot} />
              <span className={styles.waitingDot} />
              <span className={styles.waitingDot} />
            </span>
          </p>
        </div>
      </BriefingRoom>
    )
  }

  const canStart = lobby.players.length >= 2
  const shortBy = 2 - lobby.players.length

  return (
    <BriefingRoom>
      <div className={styles.lobby}>
        {/* ─── Masthead — agency wordmark title card ─── */}
        <header className={styles.masthead}>
          <p className={styles.classified}>The Pendleton Agency // Eyes Only</p>
          <h1 className={styles.title}>BURNED</h1>
          <div className={styles.titleAccent} />
        </header>

        {/* ─── Stage — deploy terminal (left) + case folder (right) ─── */}
        <div className={styles.stage}>
          {/* Deploy terminal — the dark check-in device on the desk. Carries
              the QR check-in AND the CLEARED HOT deploy action, stacked: the
              left column has the room to hold both, and keeping the button
              out of a bottom row means the roster folder can never collide
              with it. */}
          <section className={styles.deployStation} aria-label="Deploy operative">
            <span className={styles.deployLabel}>// Deploy Operative</span>
            <div className={styles.qrFrame}>
              <QRCodeSVG value={playerUrl} size={148} bgColor="transparent" fgColor="#1a2e30" />
            </div>
            <span className={styles.roomCode}>{lobby.roomCode}</span>
            <span className={styles.hint}>Scan &amp; check in</span>

            <div className={styles.deployDivider} />

            <button
              className={styles.startButton}
              onClick={onStartGame}
              disabled={!canStart}
            >
              {canStart ? 'Cleared Hot' : shortBy === 1 ? 'One short' : `${shortBy} operatives short`}
            </button>

            <a
              className={styles.manualLink}
              href={HOWTOPLAY_URL}
              target="_blank"
              rel="noopener"
            >
              <span className={styles.manualLinkText}>Operations Manual</span>
              <span className={styles.manualLinkArrow} aria-hidden="true">→</span>
            </a>
          </section>

          {/* Active operatives — a manila case folder tossed on the desk. */}
          <section
            className={styles.rosterFolder}
            data-player-count={lobby.players.length}
            aria-label="Active operatives"
          >
            <span className={styles.rosterTab}>Roster</span>
            <div className={styles.rosterHead}>
              <span className={styles.rosterLabel}>Active Operatives</span>
              <span className={styles.rosterCount}>{lobby.players.length} / 10</span>
            </div>

            <div className={styles.rosterBody}>
              <AnimatePresence mode="popLayout">
                {lobby.players.map((player, i) => (
                  <m.div
                    key={player.id}
                    className={styles.operative}
                    // Transform string keeps the staggered slide-in GPU-composited.
                    initial={{ opacity: 0, transform: 'translateX(28px) scale(0.96)' }}
                    animate={{ opacity: 1, transform: 'translateX(0px) scale(1)' }}
                    exit={{ opacity: 0, transform: 'translateX(-28px) scale(0.96)' }}
                    transition={{ ...MOTION.snappy, delay: i * 0.05 }}
                  >
                    <span className={styles.operativeIndex}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <PlayerIcon color={player.color} size={20} />
                    <span className={styles.operativeName}>{player.name}</span>
                    <span
                      className={styles.operativeStatus}
                      data-off={!player.isConnected || undefined}
                    >
                      {player.isConnected ? 'Checked In' : 'Off-Grid'}
                    </span>
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
          </section>
        </div>
      </div>
    </BriefingRoom>
  )
}
