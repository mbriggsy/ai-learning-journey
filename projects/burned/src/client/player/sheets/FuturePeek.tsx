import { useCallback, useRef, lazy, Suspense } from 'react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import styles from './sheets.module.css'

// `FalsifyIntelRearrange` lives in its own chunk so `Reorder` (drag + layout
// machinery from motion/react) doesn't ship in the always-loaded player
// entry. Verified: sync import jumped player entry by ~30KB gzipped, lazy
// keeps it out. Prefetched at idle (see player/main.tsx) so the chunk is
// already warm by the time the user plays Falsify Intel.
const FalsifyIntelRearrange = lazy(() => import('./FalsifyIntelRearrange'))

interface FuturePeekProps {
  readonly cards: readonly CardInstance[]
  readonly canRearrange: boolean
  readonly onDismiss: () => void
  readonly onRearrange?: (order: string[]) => void
}

export function FuturePeek({ cards, canRearrange, onDismiss, onRearrange }: FuturePeekProps) {
  if (canRearrange) {
    // Suspense fallback is intentionally minimal — the chunk is prefetched at
    // idle so it's already cached by the time a player plays Falsify Intel.
    // Even on a cold load the chunk is ~30KB gzipped (one fast roundtrip on
    // any modern phone connection); a flash of the title + skeleton beats
    // shipping the drag machinery to every player on every page load.
    return (
      <Suspense fallback={<RearrangeSkeleton />}>
        <FalsifyIntelRearrange cards={cards} onRearrange={onRearrange} />
      </Suspense>
    )
  }
  return <FuturePeekReadOnly cards={cards} onDismiss={onDismiss} />
}

// Read-only Intel Briefing path — horizontal scroll-snap dossier-spread.
// `See the Future` (no rearrange); player just reads the upcoming draws.
function FuturePeekReadOnly({
  cards,
  onDismiss,
}: { readonly cards: readonly CardInstance[]; readonly onDismiss: () => void }) {
  const dismissedRef = useRef(false)
  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    onDismiss()
  }, [onDismiss])

  return (
    <div>
      <div className={styles.sheetTitle}>Intel Briefing</div>
      <div className={styles.peekScroll}>
        {cards.map((card, i) => (
          <div key={card.id} className={styles.peekSlot}>
            <div className={styles.peekCard}>
              <MinimalCard type={card.type} disabled />
            </div>
            <span className={styles.peekBadge}>
              {`Draw ${i + 1}${i === 0 ? ' · next' : ''}`}
            </span>
          </div>
        ))}
      </div>
      <button className={styles.confirmBtn} onClick={handleDismiss}>
        Got it
      </button>
    </div>
  )
}

// Skeleton shown while the FalsifyIntelRearrange chunk loads. Keeps the
// title + dossier header in place so the perceived load is "the file is
// opening" rather than "the UI broke."
function RearrangeSkeleton() {
  return (
    <div className={styles.falsifyLayout}>
      <div className={styles.dossierHeader} aria-hidden="true">
        <span className={styles.dossierStripe} />
        <span className={styles.dossierTag}>DOSSIER · 047-B</span>
        <span className={styles.dossierStripe} />
      </div>
      <div className={styles.sheetTitle}>Falsify Intel</div>
      <div className={styles.sheetSubtitle}>Loading file…</div>
    </div>
  )
}
