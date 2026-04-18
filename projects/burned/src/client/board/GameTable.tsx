import { useRef } from 'react'
import {
  usePlayerList, useDrawPileCount, useDiscardTop,
  useCurrentTurn,
} from '@client/shared/hooks/useSharedSelectors'
import { PlayerRing } from './PlayerRing'
import { Arena } from './Arena'
import { DrawPile } from './DrawPile'
import { DiscardFan } from './DiscardFan'
import { NopeCountdownBar } from './NopeCountdownBar'
import { AnnouncementFeed } from './AnnouncementFeed'
import { BlotterTicker } from './BlotterTicker'
import { StatusBar } from './StatusBar'
import styles from './GameTable.module.css'

export function GameTable() {
  const players = usePlayerList()
  const drawPileCount = useDrawPileCount()
  const discardTop = useDiscardTop()
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

      {/* Cream-paper briefing blotter — the play surface. Draw + discard sit
          on this plate, not on teal felt. */}
      <div className={styles.blotter} aria-hidden="true" />
      <div className={styles.blotterTab} aria-hidden="true">
        Case #47-B
      </div>

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

      {/* Player ring */}
      <PlayerRing
        players={players}
        currentPlayerId={currentTurn?.currentPlayerId ?? null}
        turnsRemaining={currentTurn?.turnsRemaining ?? 0}
      />

      {/* Center stage — draw pile + discard, tight together */}
      <div className={styles.center}>
        <div className={styles.pileSection}>
          <DrawPile count={drawPileCount} />
          <div className={styles.pileLabelGroup}>
            <span className={styles.pileLabel}>Draw</span>
            <span className={styles.pileCaption}>Remaining · In Field</span>
          </div>
        </div>

        <div className={styles.pileSection}>
          <DiscardFan topCard={discardTop} />
          <div className={styles.pileLabelGroup}>
            <span className={styles.pileLabel}>Discard</span>
            <span className={styles.pileCaption}>Last Played</span>
          </div>
        </div>
      </div>

      {/* Arena overlaid on center — cards land here during play */}
      <Arena />

      {/* Full-screen event flash — GSAP target */}
      <div ref={flashRef} className={styles.eventFlash} />

      {/* Overlays */}
      <NopeCountdownBar />
      <AnnouncementFeed />
      <BlotterTicker />

      {/* Comms bar — bottom strip */}
      <StatusBar />
    </div>
  )
}
