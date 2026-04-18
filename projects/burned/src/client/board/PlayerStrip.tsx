import { memo } from 'react'
import { m } from 'motion/react'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './PlayerStrip.module.css'

const NAME_MAX = 7

function truncate(name: string): string {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name
}

interface PlayerStripProps {
  readonly players: readonly BoardPlayer[]
  readonly currentPlayerId: string | null
  readonly turnsRemaining: number
}

export const PlayerStrip = memo(function PlayerStrip({
  players, currentPlayerId, turnsRemaining,
}: PlayerStripProps) {
  if (players.length === 0) return null

  return (
    <div className={styles.strip} role="list" aria-label="Players">
      {players.map(p => {
        const isActive = p.id === currentPlayerId && p.isAlive
        return (
          <m.div
            key={p.id}
            className={styles.tile}
            role="listitem"
            data-active={isActive || undefined}
            data-dead={!p.isAlive || undefined}
            data-offline={!p.isConnected || undefined}
            initial={false}
            animate={{ y: isActive ? -6 : 0 }}
            transition={MOTION.deliberate}
          >
            <span
              className={styles.presence}
              aria-label={p.isConnected ? 'Connected' : 'Off-grid'}
              title={p.isConnected ? 'Connected' : 'Off-grid'}
            />
            <span className={styles.name} title={p.name}>{truncate(p.name)}</span>
            <span
              className={styles.cards}
              aria-label={`${p.cardCount} ${p.cardCount === 1 ? 'card' : 'cards'}`}
            >
              {p.cardCount}
            </span>
            {isActive && turnsRemaining > 1 && (
              <span className={styles.turns} aria-label={`${turnsRemaining} turns remaining`}>
                +{turnsRemaining - 1}
              </span>
            )}
            {isActive && <span className={styles.activeTag}>ACTIVE</span>}
          </m.div>
        )
      })}
    </div>
  )
})
