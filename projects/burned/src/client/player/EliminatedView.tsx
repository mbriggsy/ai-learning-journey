import { useMemo } from 'react'
import { m } from 'motion/react'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import { MOTION } from '@client/shared/animation-config'
import styles from './EliminatedView.module.css'

const FLAVOR_LINES = [
  'BOOM. You\'re cooked.',
  'Your cover\'s blown.',
  'Blown to smithereens.',
  'Rest in pieces.',
  'Catastrophic failure.',
  'You had a blast.',
  'Game over, hotshot.',
  'Ka-boom, baby.',
] as const

function pickFlavor(): string {
  return FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)]!
}

export function EliminatedView() {
  const players = usePlayerList()
  const alivePlayers = players.filter(p => p.isAlive)
  const flavor = useMemo(pickFlavor, [])

  return (
    <div className={styles.container}>
      <m.div
        className={styles.explosionWrap}
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <div className={styles.skull}>💀</div>
      </m.div>

      <m.div
        className={styles.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOTION.SNAPPY, delay: 0.2 }}
      >
        You Exploded!
      </m.div>

      <m.div
        className={styles.flavor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {flavor}
      </m.div>

      <m.div
        className={styles.remaining}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOTION.SNAPPY, delay: 0.7 }}
      >
        <div className={styles.remainingLabel}>Still alive</div>
        <div className={styles.playerList}>
          {alivePlayers.map(p => (
            <div key={p.id} className={styles.playerChip}>
              <PlayerIcon color={p.color} size={18} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </m.div>

      <m.div
        className={styles.watchPrompt}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.0 }}
      >
        Watch the TV for the action
      </m.div>
    </div>
  )
}
