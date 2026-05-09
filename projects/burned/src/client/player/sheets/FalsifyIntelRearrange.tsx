// Lazy-loaded sibling of FuturePeek's read-only path. Splitting this into
// its own chunk keeps `Reorder` (drag/layout machinery) out of the always-
// loaded player entry — the rearrange UI only ships to the client when a
// player actually plays Falsify Intel. Verified: pulling Reorder out of the
// sync import path saved ~30KB gzipped on the player entry chunk.
//
// Vertical Reorder.Group of three "dossier slots" — each slot has a card
// photo with a redact-stamp priority marker overlaid (01 / TOP, 02 / MID,
// 03 / BOTTOM), the card name, and a drag handle. The Reorder.Item itself
// owns the drag transform; per insight 015, no CSS `:active` transform on
// the slot — Framer's inline transform would win the cascade race.

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Reorder, m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './sheets.module.css'

interface FalsifyIntelRearrangeProps {
  readonly cards: readonly CardInstance[]
  readonly onRearrange?: (order: string[]) => void
}

export default function FalsifyIntelRearrange({
  cards,
  onRearrange,
}: FalsifyIntelRearrangeProps) {
  const [orderIds, setOrderIds] = useState<string[]>(() => cards.map(c => c.id))
  const [submitted, setSubmitted] = useState(false)
  const [enlargedId, setEnlargedId] = useState<string | null>(null)
  const submittedRef = useRef(false)
  // Track pointerdown position to discriminate taps (movement < 8px) from
  // drags (any larger movement). Framer's onTap fires on small movements
  // that Briggsy reads as drags — manual threshold gives stricter control.
  const pointerStartRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const TAP_THRESHOLD_PX = 8

  // Defensive sync: if the prop set changes identity (the sheet shouldn't
  // remount mid-rearrange but cardIds shouldn't drift), reset order. Mid-
  // rearrange re-keying is not part of any flow today — paranoia, not load-
  // bearing.
  useEffect(() => {
    const incomingIds = cards.map(c => c.id)
    const sameSet =
      incomingIds.length === orderIds.length &&
      incomingIds.every(id => orderIds.includes(id))
    if (!sameSet) setOrderIds(incomingIds)
  }, [cards, orderIds])

  const cardById = useMemo(
    () => new Map(cards.map(c => [c.id, c])),
    [cards],
  )

  const handleCommit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    onRearrange?.(orderIds)
  }, [orderIds, onRearrange])

  const enlargedCard = enlargedId
    ? cards.find(c => c.id === enlargedId) ?? null
    : null

  return (
    <div className={styles.falsifyLayout}>
      <div className={styles.sheetTitle}>Falsify Intel</div>

      <Reorder.Group
        axis="y"
        values={orderIds}
        onReorder={setOrderIds}
        className={styles.dossierStack}
        as="ul"
      >
        {orderIds.map((id, idx) => {
          const card = cardById.get(id)
          if (!card) return null
          const slotLabel =
            idx === 0 ? 'TOP' : idx === orderIds.length - 1 ? 'BOTTOM' : 'MID'
          return (
            <Reorder.Item
              key={id}
              value={id}
              className={styles.dossierSlot}
              whileDrag={{
                scale: 1.04,
                boxShadow:
                  '0 16px 40px -8px color-mix(in oklab, var(--color-shadow-base) 70%, transparent)',
                rotate: -0.6,
                cursor: 'grabbing',
              }}
              dragListener={!submitted}
              // Manual tap discrimination — record pointerdown position,
              // only fire enlarge if pointerup is within 8px (TAP_THRESHOLD_PX).
              // Framer's built-in onTap fires on small movements that read
              // as drags to Briggsy's thumb; this stricter threshold prevents
              // accidental enlarges during a drag-reorder gesture. Reorder's
              // own drag detection runs in parallel and isn't affected.
              onPointerDown={(e: React.PointerEvent) => {
                pointerStartRef.current = { id, x: e.clientX, y: e.clientY }
              }}
              onPointerUp={(e: React.PointerEvent) => {
                if (submitted) return
                const start = pointerStartRef.current
                pointerStartRef.current = null
                if (!start || start.id !== id) return
                const dx = e.clientX - start.x
                const dy = e.clientY - start.y
                if (Math.sqrt(dx * dx + dy * dy) > TAP_THRESHOLD_PX) return
                setEnlargedId(id)
              }}
              onPointerCancel={() => {
                pointerStartRef.current = null
              }}
            >
              {/* MinimalCard is the canonical card face used in hand,
                  staging, and Intel Briefing. Container queries inside
                  MinimalCard size the chrome (icon + name) against the
                  wrapper's inline-size — sized at clamp(110-160px) so on
                  iPhone Pro+ the wrapper exceeds the 115px threshold and
                  the card name appears, matching hand experience. The
                  redact stamp overlays the bottom-right corner.

                  No meta column: the card itself carries identity (icon +
                  name + illustration) and the stamp carries position
                  (01 TOP / 02 MID / 03 BOTTOM). Duplicating either in a
                  side panel just clutters the row. */}
              <span className={styles.dossierPhoto} aria-hidden="true">
                <MinimalCard type={card.type} disabled compact />
                <span className={styles.dossierStamp} data-position={idx + 1}>
                  <span className={styles.dossierStampNum}>
                    {`0${idx + 1}`.slice(-2)}
                  </span>
                  <span className={styles.dossierStampLabel}>{slotLabel}</span>
                </span>
              </span>
              <span className={styles.dragHandle} aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      <button
        className={styles.confirmBtn}
        disabled={submitted}
        onClick={handleCommit}
      >
        {submitted ? 'Filing…' : 'Commit File'}
      </button>

      {/* Enlarged card overlay — rendered INLINE inside .falsifyLayout
          (which is `position: relative`), absolute-positioned to cover
          the entire layout area. Can't portal to document.body here:
          BottomSheet's `<dialog>` uses showModal() which puts the dialog
          in the browser top layer, rendering above all body-portal'd
          elements regardless of z-index — Hand can portal because no
          dialog is open while it's visible. Single tap on the backdrop
          dismisses; the enlarged card uses default (non-compact) padding
          so MinimalCard's `@container (min-width: 177px)` rules engage
          and the description text becomes visible — that's the whole
          point of enlarging: read the card rules. Blur-mask during scale
          smooths MinimalCard's container-query layout swap mid-flight,
          same 4px pattern as Hand's enlarge. */}
      <AnimatePresence>
        {enlargedCard && (
          <m.div
            key="falsify-enlarge-backdrop"
            className={styles.enlargeBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.enter}
            onPointerUp={() => setEnlargedId(null)}
          >
            <m.div
              key={enlargedCard.id}
              className={styles.enlargeCard}
              initial={{ transform: 'translateY(120px) scale(0.35)', filter: 'blur(4px)' }}
              animate={{ transform: 'translateY(0px) scale(1)', filter: 'blur(0px)' }}
              exit={{ transform: 'translateY(120px) scale(0.35)', filter: 'blur(4px)' }}
              transition={MOTION.snappy}
            >
              <MinimalCard type={enlargedCard.type} disabled />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
