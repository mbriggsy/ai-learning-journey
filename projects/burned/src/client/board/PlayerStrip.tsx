import { memo } from 'react'
import { m } from 'motion/react'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './PlayerStrip.module.css'

// Name is truncated only as a LAST resort (CSS `text-overflow: ellipsis`
// in the stylesheet handles the normal case). 12 is the server-enforced
// max length for a name (room.ts NAME_PATTERN), so 12 + 1 cushion means
// no legal name is ever JS-truncated — CSS owns any truncation when the
// tile physically can't fit the string.
//
// Previous value of 7 was too aggressive: at 1920vw a 10-tile strip
// has ~150px per tile, which fits 12 chars easily — yet "DASH B…",
// "VERA K…" were showing. E2E audit 2026-04-23 C-08.
const NAME_MAX = 13

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
      {players.map((p, idx) => {
        const isActive = p.id === currentPlayerId && p.isAlive
        return (
          <m.div
            key={p.id}
            className={styles.tile}
            role="listitem"
            data-active={isActive || undefined}
            data-dead={!p.isAlive || undefined}
            data-offline={!p.isConnected || undefined}
            // Stagger entry on mount — cascade tiles into place so the
            // "briefing begins" moment has weight. Framer only touches
            // opacity; the active-turn lift is pure CSS transform (see
            // .tile[data-active] in the stylesheet) so the two never fight
            // over the transform property.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...MOTION.enter, delay: idx * 0.035 }}
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
