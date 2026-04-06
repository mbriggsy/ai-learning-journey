import { useState } from 'react'
import styles from './sheets.module.css'

interface DefusePlacementProps {
  readonly maxPosition: number
  readonly onPlace: (position: number) => void
}

export function DefusePlacement({ maxPosition, onPlace }: DefusePlacementProps) {
  const [position, setPosition] = useState(0)
  const showStepper = maxPosition >= 10

  if (!showStepper) {
    // Small deck — show individual buttons
    return (
      <div>
        <div className={styles.sheetTitle}>Hide the Kitten</div>
        <div className={styles.sheetSubtitle}>Tap to place (no take-backs)</div>
        <div className={styles.optionList}>
          {Array.from({ length: maxPosition + 1 }, (_, i) => (
            <button
              key={i}
              className={styles.optionBtn}
              onClick={() => onPlace(i)}
              style={{ touchAction: 'manipulation' }}
            >
              Position {i + 1} {i === 0 ? '(Top)' : i === maxPosition ? '(Bottom)' : ''}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Large deck — quick actions + numeric stepper
  return (
    <div>
      <div className={styles.sheetTitle}>Hide the Kitten</div>
      <div className={styles.sheetSubtitle}>Tap to place (no take-backs)</div>

      <div className={styles.quickActions}>
        <button className={styles.quickBtn} onClick={() => onPlace(0)} style={{ touchAction: 'manipulation' }}>
          Top
        </button>
        <button className={styles.quickBtn} onClick={() => onPlace(maxPosition)} style={{ touchAction: 'manipulation' }}>
          Bottom
        </button>
        <button className={styles.quickBtn} onClick={() => onPlace(-1)} style={{ touchAction: 'manipulation' }}>
          Random
        </button>
      </div>

      <div className={styles.positionInput}>
        <button onClick={() => setPosition(p => Math.max(0, p - 1))}>-</button>
        <span>#{position + 1}</span>
        <button onClick={() => setPosition(p => Math.min(maxPosition, p + 1))}>+</button>
      </div>
      <button
        className={styles.confirmBtn}
        onClick={() => onPlace(position)}
        style={{ touchAction: 'manipulation' }}
      >
        Place Here
      </button>
    </div>
  )
}
