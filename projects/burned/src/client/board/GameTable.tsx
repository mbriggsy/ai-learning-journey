import { useRef } from 'react'
import {
  usePlayerList, useCurrentTurn,
} from '@client/shared/hooks/useSharedSelectors'
import { PlayerStrip } from './PlayerStrip'
import { Arena } from './Arena'
import { BlotterContent } from './BlotterContent'
import { NopeCountdownBar } from './NopeCountdownBar'
import styles from './GameTable.module.css'

export function GameTable() {
  const players = usePlayerList()
  const currentTurn = useCurrentTurn()
  const flashRef = useRef<HTMLDivElement>(null)

  return (
    <div className={styles.table}>
      {/* Venetian-blind shadow rake — Archer "Mother's office" vocabulary.
          Lives behind everything, low-opacity, masked toward the center. */}
      <div className={styles.blindRakeLeft} aria-hidden="true" />
      <div className={styles.blindRakeRight} aria-hidden="true" />

      {/* The Pendleton Agency — war-room felt decoration */}
      <div className={styles.feltBranding} aria-hidden="true" />

      {/* Cream-paper briefing blotter — the play surface. Draw + discard,
          COMMS, and the turn status strip all live on this plate. */}
      <div className={styles.blotter} aria-hidden="true" />
      <div className={styles.blotterTab} aria-hidden="true">
        Case #47-B
      </div>
      <BlotterContent />

      {/* Mahogany wood edge inlay — briefing-table border. Four sub-divs so
          each edge gets grain in the correct direction (horizontal on top/
          bottom, vertical on left/right). The overlaid bevel shadow sells
          the raised-frame illusion. */}
      <div className={styles.woodFrame} aria-hidden="true">
        <div className={styles.woodTop} />
        <div className={styles.woodBottom} />
        <div className={styles.woodLeft} />
        <div className={styles.woodRight} />
      </div>

      {/* Left ambient case banner — Pendleton Agency mission chrome */}
      <aside className={styles.caseBanner} aria-hidden="true">
        <span className={styles.caseBannerLabel}>Operation</span>
        <span className={styles.caseBannerOperation}>BURNED</span>
        <span className={styles.caseBannerSub}>Case File 47-B · Mayfair</span>
        <div className={styles.caseBannerDivider} />
        <span className={styles.caseBannerFooter}>
          Briefed by <strong>M.</strong>
        </span>
        <div className={styles.caseBannerStamp} />
      </aside>

      {/* Player strip — UMB-style nameplate row along the bottom */}
      <PlayerStrip
        players={players}
        currentPlayerId={currentTurn?.currentPlayerId ?? null}
        turnsRemaining={currentTurn?.turnsRemaining ?? 0}
      />

      {/* Arena — cards land here during play (full-screen drama overlay
          still lives above). */}
      <Arena />

      {/* Full-screen event flash — GSAP target */}
      <div ref={flashRef} className={styles.eventFlash} />

      {/* Overlays */}
      <NopeCountdownBar />
    </div>
  )
}
