import { memo, type ReactNode } from 'react'
import styles from './BriefingRoom.module.css'

/**
 * BriefingRoom — the shared war-room world.
 *
 * Felt desk surface, fabric-weave micro-grain, table-edge inlay, the mahogany
 * briefing-table frame, and the venetian-blind sun rake (Archer "Mother's
 * office" vocabulary). Both the Lobby and the GameTable render their content
 * inside this wrapper so the two screens are LITERALLY the same room — making
 * good on the long-standing "Lobby and GameTable are one product" promise that
 * the old lobby asserted in a comment but never delivered visually.
 *
 * The world layers here are lifted verbatim from GameTable.module.css. The
 * GameTable still carries its own copy for now; the planned follow-up migrates
 * it onto this component so there's a single source for the room.
 */
export const BriefingRoom = memo(function BriefingRoom({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={className ? `${styles.room} ${className}` : styles.room}>
      {/* Venetian-blind shadow rake — tungsten light through office blinds.
          Behind everything, low-opacity, masked toward the center. */}
      <div className={styles.blindRakeLeft} aria-hidden="true" />
      <div className={styles.blindRakeRight} aria-hidden="true" />

      {/* Mahogany wood edge inlay — four edges so grain flows correctly per
          side (horizontal on top/bottom, vertical on left/right). */}
      <div className={styles.woodFrame} aria-hidden="true">
        <div className={styles.woodTop} />
        <div className={styles.woodBottom} />
        <div className={styles.woodLeft} />
        <div className={styles.woodRight} />
      </div>

      {/* Content layer — sits above the ambient world, inset clear of the
          frame by the consumer's own padding. */}
      <div className={styles.content}>{children}</div>
    </div>
  )
})
