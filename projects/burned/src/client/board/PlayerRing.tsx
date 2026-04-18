import { useRef, useLayoutEffect, useState, memo } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { BoardPlayer } from '@shared/protocol'
import { MOTION } from '@client/shared/tokens/motion'
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

/** Deterministic small rotation (−3.5°..+3.5°) so dossiers read as
 *  human-placed photos, not grid-aligned cards. Top-slot dossiers get
 *  half rotation — a dossier skewed hard against the case folder tab
 *  reads as sloppy instead of styled. */
function rotationFor(id: string, slotIndex: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const base = ((hash & 0xff) / 255) * 7 - 3.5   // −3.5..+3.5
  return slotIndex === 0 ? base * 0.45 : base
}

/** Every player dossier shows a generic redacted-operative silhouette
 *  (censor bar over the eyes, Archer-informant style). The image is tinted
 *  per-player-color via CSS background-blend-mode, so each dossier reads
 *  as the SAME classified asset rendered through each player's color/shape
 *  identity. Named-character portraits (Dash/Vera/Otto) are reserved for
 *  in-world card art and narrative cutaways — never player faces. */
const OPERATIVE_SILHOUETTE = '/assets/arena/operative-silhouette.png'

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
  const measureBlotterRef = useRef<HTMLDivElement>(null)
  const measureGapRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })
  const [panelSize, setPanelSize] = useState({ w: 0, h: 0 })
  const [blotterSize, setBlotterSize] = useState({ w: 0, h: 0 })
  const [ringGap, setRingGap] = useState(32)

  useLayoutEffect(() => {
    const el = containerRef.current
    const measureEl = measureRef.current
    const measureBlotterEl = measureBlotterRef.current
    const measureGapEl = measureGapRef.current
    if (!el || !measureEl || !measureBlotterEl || !measureGapEl) return

    // Synchronous first read — before any observer callback, before paint.
    const initialPanelRect = measureEl.getBoundingClientRect()
    if (initialPanelRect.width > 0) {
      setPanelSize({ w: initialPanelRect.width, h: initialPanelRect.height })
    }
    const initialBlotterRect = measureBlotterEl.getBoundingClientRect()
    if (initialBlotterRect.width > 0) {
      setBlotterSize({ w: initialBlotterRect.width, h: initialBlotterRect.height })
    }
    const initialGapRect = measureGapEl.getBoundingClientRect()
    if (initialGapRect.width > 0) setRingGap(initialGapRect.width)

    const initialContainerRect = el.getBoundingClientRect()
    if (initialContainerRect.width > 0) {
      setDimensions({ w: initialContainerRect.width, h: initialContainerRect.height })
    }

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions(prev => {
        if (Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev
        return { w: width, h: height }
      })
      // Re-read the CSS-computed measurement divs on every resize. They
      // re-resolve because their widths are clamp() against 100vw.
      const panelRect = measureEl.getBoundingClientRect()
      setPanelSize(prev => {
        if (Math.abs(prev.w - panelRect.width) < 2 && Math.abs(prev.h - panelRect.height) < 2) return prev
        return { w: panelRect.width, h: panelRect.height }
      })
      const blotterRect = measureBlotterEl.getBoundingClientRect()
      setBlotterSize(prev => {
        if (Math.abs(prev.w - blotterRect.width) < 2 && Math.abs(prev.h - blotterRect.height) < 2) return prev
        return { w: blotterRect.width, h: blotterRect.height }
      })
      const gapRect = measureGapEl.getBoundingClientRect()
      setRingGap(prev => Math.abs(prev - gapRect.width) < 1 ? prev : gapRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Turn-transition emphasis is delivered via CSS [data-active] styling
  // (box-shadow, brightness filter, ACTIVE rubber stamp). Previously a GSAP
  // fromTo() drove a scale pulse on the active dossier, but GSAP writes to
  // the same inline `transform` property that Framer Motion uses for x/y
  // positioning — on player-count ≤ 4 (3-player case, Dash at seat 0)
  // GSAP's transform reset wiped FM's translate, dropping Dash to (0,0).
  // Motion polish for the active transition lives in Phase E via pure CSS.

  const alivePlayers = players.filter(p => p.isAlive)
  const { rx, ry } = dimensions.w > 0 && panelSize.w > 0 && blotterSize.w > 0
    ? getRingRadii(
        alivePlayers.length,
        dimensions.w, dimensions.h,
        blotterSize.w, blotterSize.h,
        panelSize.w, panelSize.h,
        ringGap,
      )
    : { rx: 0, ry: 0 }
  const positions = calculateRingPositions(alivePlayers.length, rx, ry)

  // Panel dimensions are read from CSS via a hidden measurement div.
  // The measurement div consumes --size-player-panel-width / --size-player-panel-height,
  // so CSS is the single source of truth.
  const panelW = panelSize.w
  const panelH = panelSize.h

  return (
    <div ref={containerRef} className={styles.ring}>
      {/* Hidden measurement elements — consume --size-dossier-*,
          --size-blotter-*, and --space-ring-gap so layout math can read
          the CSS truth. */}
      <div ref={measureRef} className={styles.measurePanel} aria-hidden="true" />
      <div ref={measureBlotterRef} className={styles.measureBlotter} aria-hidden="true" />
      <div ref={measureGapRef} className={styles.measureGap} aria-hidden="true" />

      <AnimatePresence mode="sync">
        {dimensions.w > 0 && panelSize.w > 0 && alivePlayers.map((player, i) => {
          const pos = positions[i]
          if (!pos) return null
          const isActive = player.id === currentPlayerId

          // File number derived from player id — stable within a game, reads
          // as a classified case number.
          const fileNum = fileNumberFor(player.id)
          const slotLabel = `OP-${String(i + 1).padStart(2, '0')}`
          const baseRotation = rotationFor(player.id, i)

          return (
            <m.div
              key={player.id}
              className={styles.panel}
              data-active={isActive || undefined}
              style={{
                '--player-color': player.color,
              } as React.CSSProperties}
              initial={false}
              animate={{
                x: dimensions.w / 2 + pos.x - panelW / 2,
                y: dimensions.h / 2 + pos.y - panelH / 2,
                // Active player squares up by half — reads as "briefing officer
                // picks up the photo and sets it straight to read it."
                rotate: isActive ? baseRotation * 0.3 : baseRotation,
              }}
              exit={{
                scale: 0,
                opacity: 0,
                filter: 'grayscale(1)',
              }}
              transition={MOTION.deliberate}
            >
              {/* Brass pushpin — anchors the dossier to the briefing table.
                  Positioned via CSS at the top-right away from the manila tab. */}
              <div className={styles.pushpin} aria-hidden="true" />

              {/* Manila folder tab */}
              <div className={styles.accentBar} />

              {/* Dossier body: [portrait | info] */}
              <div className={styles.panelBody}>
                <div
                  className={styles.portrait}
                  aria-hidden="true"
                  style={{ backgroundImage: `url('${OPERATIVE_SILHOUETTE}')` }}
                >
                  <span className={styles.paperClipLeft} aria-hidden="true" />
                  <span className={styles.paperClipRight} aria-hidden="true" />
                  <div className={styles.clearanceBadge}>
                    <PlayerIcon color={player.color} size={14} />
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
