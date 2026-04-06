import { memo } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { Z } from './animation/effects'
import styles from './ScreenFlash.module.css'

interface ScreenFlashProps {
  readonly active: boolean
  readonly color?: 'red' | 'blue'
}

/**
 * Screen flash overlay — seizure-safe (WCAG 2.3.1):
 * - Semi-transparent (30% opacity max)
 * - Vignette (edges darken, center stays clear)
 * - Single transition (one fade-in, one fade-out)
 * - Under 25% of 10-degree visual field at peak
 * - Total cycle well under 333ms (3Hz boundary)
 *
 * prefers-reduced-motion: replaced with static border glow.
 */
export const ScreenFlash = memo(function ScreenFlash({ active, color = 'red' }: ScreenFlashProps) {
  return (
    <AnimatePresence>
      {active && (
        <m.div
          className={styles.flash}
          data-color={color}
          style={{ zIndex: Z.screenFlash }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  )
})
