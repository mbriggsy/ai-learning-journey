import { useMemo } from 'react'
import { m } from 'motion/react'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './EliminatedView.module.css'

const FLAVOR_LINES = [
  "Your cover's blown.",
  "Game over, hotshot.",
  "Catastrophic failure.",
  "And just like that, you're cooked.",
  "HR has been notified.",
  "Somebody get the cleanup crew.",
  "Well, that's one way to resign.",
  "The Pendleton Agency thanks you for your service.",
  "Penetrated by enemy assets. ...Phrasing.",
] as const

function pickFlavor(): string {
  return FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)]!
}

export function EliminatedView() {
  const players = usePlayerList()
  const alivePlayers = players.filter(p => p.isAlive)
  const flavor = useMemo(pickFlavor, [])

  return (
    <div className={styles.view}>
      {/* Burn-notice header strip — same vocabulary layer as the GameOver
          After-Action Report header and the JoinScreen briefing panel,
          so the phone reads as a continuous agency-document stack across
          briefing → playing → burned. E2E audit C-18. */}
      <m.header
        className={styles.burnNoticeBar}
        initial={{ opacity: 0, transform: 'translateY(-12px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...MOTION.enter, delay: 0.05 }}
      >
        <span className={styles.burnNoticeLabel}>// Burn Notice</span>
        <span className={styles.burnNoticeTag}>[ Compromised ]</span>
      </m.header>

      <m.div
        className={styles.skullWrap}
        // Emil: never animate from scale(0) — nothing in the real world pops
        // from nothing. 0.6 preserves stamp-impact punch while landing
        // closer to Emil's 0.95 minimum range (peak-ceremony moment, so a
        // rule-softening is allowed; earlier 0.4 was overshooting the
        // break). Transform string keeps the skull pop GPU-composited.
        initial={{ transform: 'scale(0.6) rotate(-15deg)' }}
        animate={{ transform: 'scale(1) rotate(0deg)' }}
        transition={MOTION.punchy}
      >
        <div className={styles.skull}>💀</div>
      </m.div>

      <m.div
        className={styles.title}
        initial={{ opacity: 0, transform: 'translateY(20px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...MOTION.snappy, delay: 0.2 }}
      >
        You&apos;re Burned.
      </m.div>

      {/* Mono-caps status caption — agency-style memo line that connects
          the title to the burn-notice header. Same role as the
          "// Operative Status: Survived" caption on the GameOver winner.
          E2E audit C-18. */}
      <m.div
        className={styles.statusCaption}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 0.35 }}
      >
        // Status: Cover compromised. HR notified.
      </m.div>

      <m.div
        className={styles.flavor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 0.55 }}
      >
        {flavor}
      </m.div>

      <m.div
        className={styles.aliveList}
        initial={{ opacity: 0, transform: 'translateY(10px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...MOTION.snappy, delay: 0.75 }}
      >
        <div className={styles.aliveListLabel}>// Active Operatives</div>
        {alivePlayers.map(p => (
          <div key={p.id} className={styles.alivePlayer}>
            <PlayerIcon color={p.color} size={18} />
            <span className={styles.alivePlayerName}>{p.name}</span>
            <span className={styles.aliveStatus}>Alive</span>
          </div>
        ))}
      </m.div>

      <m.div
        className={styles.prompt}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 1.05 }}
      >
        // Stand by for next briefing
      </m.div>
    </div>
  )
}
