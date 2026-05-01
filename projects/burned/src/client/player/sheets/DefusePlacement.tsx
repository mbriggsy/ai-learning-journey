import { useState } from 'react'
import { MinimalCard } from '@client/shared/MinimalCard'
import styles from './sheets.module.css'

interface DefusePlacementProps {
  readonly maxPosition: number
  readonly onPlace: (position: number) => void
}

// Hero card heads the sheet: visual continuity from the BURNED drama beat to
// the placement decision. Title says WHAT you're doing, the card shows WHAT
// you're hiding, the subtitle says HOW. aria-hidden because the title already
// names "Burned Card" — letting MinimalCard re-announce would double-up SR users.
function DefuseHeader() {
  return (
    <>
      <div className={styles.sheetTitle}>Hide the Burned Card</div>
      <div className={styles.heroCardSlot} aria-hidden="true">
        <MinimalCard type="burned" disabled />
      </div>
      <div className={styles.sheetSubtitle}>Tap to place (no take-backs)</div>
    </>
  )
}

// Single UI for every deck size. Top / Bottom / Random cover the common case;
// the ± stepper handles fine placement. Previously this branched at
// maxPosition >= 10 into a stacked-button list for small decks, but the swap
// broke muscle memory mid-game (the deck shrinks past the threshold and the
// sheet's controls change shape during a stressful "I just dodged death"
// moment). Stepper handles every drawPileCount the engine produces.
export function DefusePlacement({ maxPosition, onPlace }: DefusePlacementProps) {
  const [position, setPosition] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const handlePlace = (pos: number) => {
    if (submitted) return
    setSubmitted(true)
    onPlace(pos)
  }

  return (
    <div>
      <DefuseHeader />

      <div className={styles.quickActions}>
        <button className={styles.quickBtn} onClick={() => handlePlace(0)} style={{ touchAction: 'manipulation' }}>
          Top
        </button>
        <button className={styles.quickBtn} onClick={() => handlePlace(maxPosition)} style={{ touchAction: 'manipulation' }}>
          Bottom
        </button>
        <button className={styles.quickBtn} onClick={() => handlePlace(-1)} style={{ touchAction: 'manipulation' }}>
          Random
        </button>
      </div>

      <div className={styles.positionInput}>
        <button onClick={() => setPosition(p => Math.max(0, p - 1))}>-</button>
        <span className={styles.positionValue}>
          <span className={styles.positionNumber}>#{position + 1}</span>
          <span className={styles.positionCaption}>
            {position === 0
              ? 'Top · burns on next draw'
              : position === maxPosition
              ? 'Bottom · last card in deck'
              : `${position} safe draw${position === 1 ? '' : 's'}`}
          </span>
        </span>
        <button onClick={() => setPosition(p => Math.min(maxPosition, p + 1))}>+</button>
      </div>
      {/* Confirm copy mirrors the stepper state so the button reads as the
          stepper's submit. Generic "Place Here" left ambiguous — a player
          who tapped + to fine-tune wasn't sure how to commit. */}
      <button
        className={styles.confirmBtn}
        onClick={() => handlePlace(position)}
        disabled={submitted}
        style={{ touchAction: 'manipulation' }}
      >
        {position === 0
          ? 'Place at top'
          : position === maxPosition
          ? 'Place at bottom'
          : `Place at #${position + 1}`}
      </button>
    </div>
  )
}
