import { useRef, useLayoutEffect, useState, useEffect, memo } from 'react'
import { m, AnimatePresence } from 'motion/react'
import gsap from 'gsap'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION, MOTION_DURATIONS } from '@client/shared/tokens/motion'
import { calculateRingPositions, getRingRadii } from './layout/ringLayout'
import { PlayerIcon } from '@client/shared/PlayerIcon'
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
  const measureRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })
  const [panelSize, setPanelSize] = useState({ w: 0, h: 0 })
  const prevActiveRef = useRef<string | null>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useLayoutEffect(() => {
    const el = containerRef.current
    const measureEl = measureRef.current
    if (!el || !measureEl) return

    // Synchronous first read — before any observer callback, before paint.
    // useLayoutEffect fires after DOM insertion but before paint, so the
    // browser has already computed layout for the measurement div. This
    // eliminates the first-frame {w:0,h:0} jitter.
    const initialRect = measureEl.getBoundingClientRect()
    if (initialRect.width > 0) {
      setPanelSize({ w: initialRect.width, h: initialRect.height })
    }

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions(prev => {
        if (Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev
        return { w: width, h: height }
      })
      // Read CSS-computed panel dimensions from the hidden measurement div.
      const panelRect = measureEl.getBoundingClientRect()
      setPanelSize(prev => {
        if (Math.abs(prev.w - panelRect.width) < 2 && Math.abs(prev.h - panelRect.height) < 2) return prev
        return { w: panelRect.width, h: panelRect.height }
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // GSAP turn transition
  useEffect(() => {
    if (!currentPlayerId || currentPlayerId === prevActiveRef.current) return
    prevActiveRef.current = currentPlayerId

    const activeEl = slotRefs.current.get(currentPlayerId)
    if (!activeEl) return

    const tl = gsap.timeline()
    tl.fromTo(activeEl, {
      scale: 1.12,
      filter: 'brightness(1.6)',
    }, {
      scale: 1,
      filter: 'brightness(1)',
      // GSAP ease strings are parsed by GSAP's own registry and have no
      // cubic-bezier equivalent; left as a literal. Duration consolidated.
      duration: MOTION_DURATIONS.slow,
      ease: 'power2.out',
    })
  }, [currentPlayerId])

  const alivePlayers = players.filter(p => p.isAlive)
  const { rx, ry } = dimensions.w > 0
    ? getRingRadii(alivePlayers.length, dimensions.w, dimensions.h)
    : { rx: 0, ry: 0 }
  const positions = calculateRingPositions(alivePlayers.length, rx, ry)

  // Panel dimensions are read from CSS via a hidden measurement div.
  // The measurement div consumes --size-player-panel-width / --size-player-panel-height,
  // so CSS is the single source of truth.
  const panelW = panelSize.w
  const panelH = panelSize.h

  return (
    <div ref={containerRef} className={styles.ring}>
      {/* Hidden measurement element — consumes --size-player-panel-width /
          --size-player-panel-height so layout math can read the CSS truth. */}
      <div ref={measureRef} className={styles.measurePanel} aria-hidden="true" />

      <AnimatePresence mode="sync">
        {alivePlayers.map((player, i) => {
          const pos = positions[i]
          if (!pos) return null
          const isActive = player.id === currentPlayerId

          return (
            <m.div
              key={player.id}
              ref={(el: HTMLDivElement | null) => {
                if (el) slotRefs.current.set(player.id, el)
                else slotRefs.current.delete(player.id)
              }}
              className={styles.panel}
              data-active={isActive || undefined}
              style={{
                '--player-color': player.color,
              } as React.CSSProperties}
              initial={false}
              animate={{
                x: dimensions.w / 2 + pos.x - panelW / 2,
                y: dimensions.h / 2 + pos.y - panelH / 2,
              }}
              exit={{
                scale: 0,
                opacity: 0,
                filter: 'grayscale(1)',
              }}
              transition={MOTION.deliberate}
            >
              {/* Color accent bar */}
              <div className={styles.accentBar} style={{ backgroundColor: player.color }} />

              {/* Content */}
              <div className={styles.panelBody}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{player.name}</span>
                  {isActive && turnsRemaining > 1 && (
                    <span className={styles.turnBadge}>{turnsRemaining}x</span>
                  )}
                </div>
                <div className={styles.metaRow}>
                  <PlayerIcon color={player.color} size={14} />
                  <span className={styles.count}>{player.cardCount} cards</span>
                </div>
              </div>
            </m.div>
          )
        })}
      </AnimatePresence>

      {/* Eliminated players */}
      {players.some(p => !p.isAlive) && (
        <div className={styles.eliminatedRow}>
          {players.filter(p => !p.isAlive).map(player => (
            <div key={player.id} className={styles.eliminated}>
              <PlayerIcon color={player.color} size={10} />
              <span className={styles.eliminatedName}>{player.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
