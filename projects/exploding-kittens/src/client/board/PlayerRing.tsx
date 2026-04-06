import { useRef, useLayoutEffect, useState, memo } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION } from '@client/shared/animation-config'
import { calculateRingPositions, getAvatarSize, getRingRadii } from './layout/ringLayout'
import styles from './PlayerRing.module.css'

interface PlayerRingProps {
  readonly players: readonly BoardPlayer[]
  readonly currentPlayerId: string | null
  readonly turnsRemaining: number
}

export const PlayerRing = memo(function PlayerRing({
  players, currentPlayerId, turnsRemaining,
}: PlayerRingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const alivePlayers = players.filter(p => p.isAlive)
  const avatarSize = getAvatarSize(alivePlayers.length)
  const { rx, ry } = dimensions.w > 0
    ? getRingRadii(alivePlayers.length, dimensions.w, dimensions.h)
    : { rx: 0, ry: 0 }
  const positions = calculateRingPositions(alivePlayers.length, rx, ry)

  return (
    <div ref={containerRef} className={styles.ring}>
      <AnimatePresence mode="sync">
        {alivePlayers.map((player, i) => {
          const pos = positions[i]
          if (!pos) return null
          const isActive = player.id === currentPlayerId

          return (
            <m.div
              key={player.id}
              className={styles.slot}
              data-active={isActive || undefined}
              style={{
                width: avatarSize,
                '--player-color': player.color,
              } as React.CSSProperties}
              initial={false}
              animate={{
                x: dimensions.w / 2 + pos.x - avatarSize / 2,
                y: dimensions.h / 2 + pos.y - avatarSize / 2,
                opacity: isActive ? 1 : 0.6,
                scale: isActive ? 1 : 0.92,
              }}
              exit={{
                scale: 0,
                opacity: 0,
                filter: 'grayscale(1)',
              }}
              transition={MOTION.DELIBERATE}
            >
              <div
                className={styles.avatar}
                style={{ backgroundColor: player.color, width: avatarSize, height: avatarSize }}
              />
              <span className={styles.name}>{player.name}</span>
              <span className={styles.count}>{player.cardCount}</span>
              {isActive && turnsRemaining > 1 && (
                <span className={styles.turnBadge}>{turnsRemaining}x</span>
              )}
            </m.div>
          )
        })}
      </AnimatePresence>

      {/* Eliminated players rendered inline as static ghosts */}
      {players.filter(p => !p.isAlive).map(player => (
        <div
          key={player.id}
          className={styles.eliminated}
          style={{ '--player-color': player.color } as React.CSSProperties}
        >
          <span className={styles.name}>{player.name}</span>
        </div>
      ))}
    </div>
  )
})
