import { useRef } from 'react'
import {
  usePlayerList, useCurrentTurn,
} from '@client/shared/hooks/useSharedSelectors'
import { PlayerStrip } from './PlayerStrip'
import { Arena } from './Arena'
import { BlotterContent } from './BlotterContent'
import { BriefingRoom } from './BriefingRoom'
import { NopeCountdownBar } from './NopeCountdownBar'
import { HOWTOPLAY_URL } from '@client/shared/howtoplayUrl'
import styles from './GameTable.module.css'

export function GameTable() {
  const players = usePlayerList()
  const currentTurn = useCurrentTurn()
  const flashRef = useRef<HTMLDivElement>(null)

  return (
    <BriefingRoom>
      <div className={styles.table}>
      {/* Desk surface — piles, COMMS feed, and turn status sit directly on
          the mahogany frame's interior. Phase 1: naked on wood (no paper
          underlay). Phase 2+ rebuilds each zone's physical-object treatment
          (tabletop shadows, manila dossier, brass nameplate). */}
      <BlotterContent />

      {/* Left ambient case banner — Pendleton Agency mission chrome.
          Reads as a typeset briefing-board poster, NOT a stamped paper
          document — that vocabulary lives on the dossier folder cover
          (DossierFeed). Pre-2026-05-07 we duplicated the CLASSIFIED
          stamp here too; the audit (E2E C-11) flagged it as two-of-a-kind
          redundancy with the dossier cover stamp. Stamp removed; the
          dossier cover is now the singular CLASSIFIED-stamp surface,
          which also gets meaningful dramaturgy (cover hinges open on
          first event → stamp leaves with it).

          NopeCountdownBar lives BELOW the briefer footer (Briggsy
          2026-05-10): the static briefing (operation / case / divider /
          briefer) reads as one settled chunk; the live intercept dial
          drops in beneath it as a separate "transmission" stratum.
          Earlier placement between divider and briefer (2026-05-08) put
          the live dial inside the briefing typography stack and the
          briefer line read as a footer to the dial rather than a
          standalone byline.

          The dial sits inside a FIXED-HEIGHT slot (.nopeSlot ~
          --size-nope-slot) so the case-banner's `justify-content: center`
          doesn't reflow the static chunk ~70 px each time the dial
          mounts / unmounts (Briggsy 2026-05-11 — supersedes the
          "~10 px, acceptable" call from 4e4431c9; real shift measured
          70 px). Slot always reserves the dial's space whether or not
          the AnimatePresence has the dial mounted. */}
      <aside className={styles.caseBanner} aria-hidden="true">
        <span className={styles.caseBannerLabel}>Operation</span>
        <span className={styles.caseBannerOperation}>BURNED</span>
        <span className={styles.caseBannerSub}>Case File 47-B · Mayfair</span>
        <div className={styles.caseBannerDivider} />
        <span className={styles.caseBannerFooter}>
          Briefed by <strong>M.</strong>
        </span>
        <div className={styles.nopeSlot}>
          <NopeCountdownBar />
        </div>
        <a
          className={styles.manualLink}
          href={HOWTOPLAY_URL}
          target="_blank"
          rel="noopener"
          aria-hidden="true"
        >
          <span className={styles.manualLinkText}>Operations Manual</span>
          <span className={styles.manualLinkArrow}>→</span>
        </a>
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
      </div>
    </BriefingRoom>
  )
}
