import { useRef, useLayoutEffect, useState, useEffect, memo } from 'react'
import { m, AnimatePresence } from 'motion/react'
import gsap from 'gsap'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION, MOTION_DURATIONS } from '@client/shared/tokens/motion'
import { calculateRingPositions, getRingRadii } from './layout/ringLayout'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './PlayerRing.module.css'

/** Deterministic classified-file number from a player id.
 *  Reads as "47-B". Never changes within a room. */
function fileNumberFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const num = (hash % 89) + 11                // 11-99
  const letter = String.fromCharCode(65 + (hash >> 7) % 26)
  return `${num}-${letter}`
}

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

          // File number derived from player id — stable within a game, reads
          // as a classified case number.
          const fileNum = fileNumberFor(player.id)
          const slotLabel = `OP-${String(i + 1).padStart(2, '0')}`

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
              {/* Manila folder tab */}
              <div className={styles.accentBar} />

              {/* Dossier body: [portrait | info] */}
              <div className={styles.panelBody}>
                <div className={styles.portrait} aria-hidden="true">
                  <div className={styles.clearanceIcon}>
                    <PlayerIcon color={player.color} size={42} />
                  </div>
                  <span className={styles.portraitLabel}>{slotLabel}</span>
                </div>

                <div className={styles.info}>
                  <div className={styles.fileRow}>
                    <span className={styles.fileNumber}>FILE · {fileNum}</span>
                  </div>

                  <div className={styles.nameRow}>
                    <span className={styles.name}>{player.name}</span>
                    {isActive && turnsRemaining > 1 && (
                      <span className={styles.turnBadge}>+{turnsRemaining - 1}</span>
                    )}
                  </div>

                  <div className={styles.separator} aria-hidden="true" />

                  <div className={styles.metaRow}>
                    <span className={styles.count}>{player.cardCount} · CARDS</span>
                    <span className={styles.statusLabel}>
                      {isActive ? 'ON DECK' : 'STANDBY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active-player red rubber stamp */}
              {isActive && (
                <div className={styles.stampActive} aria-hidden="true">
                  ACTIVE
                </div>
              )}
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
