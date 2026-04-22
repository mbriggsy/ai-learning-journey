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
      <m.div
        className={styles.skullWrap}
        // Emil: never animate from scale(0) — nothing in the real world pops
        // from nothing. 0.4 keeps the punch but preserves a silhouette.
        // Transform string keeps the skull pop GPU-composited.
        initial={{ transform: 'scale(0.4) rotate(-15deg)' }}
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

      <m.div
        className={styles.flavor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 0.5 }}
      >
        {flavor}
      </m.div>

      <m.div
        className={styles.aliveList}
        initial={{ opacity: 0, transform: 'translateY(10px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...MOTION.snappy, delay: 0.7 }}
      >
        <div className={styles.aliveListLabel}>Still alive</div>
        {alivePlayers.map(p => (
          <div key={p.id} className={styles.alivePlayer}>
            <PlayerIcon color={p.color} size={18} />
            <span>{p.name}</span>
          </div>
        ))}
      </m.div>

      <m.div
        className={styles.prompt}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 1.0 }}
      >
        Watch the TV for the action
      </m.div>
    </div>
  )
}
