import type { CSSProperties, ReactNode } from 'react'
import styles from './Stamp.module.css'

interface StampProps {
  /** Stamp text — gets uppercased automatically. */
  children: ReactNode
  /** Color of the ink. */
  ink?: 'red' | 'black' | 'blue' | 'amber'
  /** Visual rotation in degrees. Default randomized via prop, ~-4 to 4. */
  tilt?: number
  /** Size scale — 'sm' for inline, 'md' for section markers, 'lg' for hero. */
  size?: 'sm' | 'md' | 'lg'
  /** Animation behavior — `slam` triggers a CSS slam animation on mount. */
  animate?: 'slam' | 'static'
  /** Optional secondary line above or below the main text (e.g. "01-A"). */
  caption?: string
  className?: string
}

const INK_VAR: Record<NonNullable<StampProps['ink']>, string> = {
  red: 'var(--stamp-red)',
  black: 'var(--stamp-black)',
  blue: 'var(--stamp-blue)',
  amber: 'var(--stamp-amber)',
}

/**
 * Rubber-ink-stamp visual. Two outer rules + caps text, optional caption,
 * slightly imperfect alignment + ink-bleed via SVG noise mask.
 */
export function Stamp({
  children,
  ink = 'red',
  tilt = -4,
  size = 'md',
  animate = 'static',
  caption,
  className,
}: StampProps) {
  const style: CSSProperties = {
    '--stamp-ink': INK_VAR[ink],
    '--stamp-tilt': `${tilt}deg`,
  } as CSSProperties

  const classes = [
    styles.stamp,
    styles[`size-${size}`],
    animate === 'slam' ? styles.slam : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} style={style} role="img" aria-label={typeof children === 'string' ? children : undefined}>
      <span className={styles.frame} aria-hidden="true" />
      <span className={styles.body}>
        {caption ? <span className={styles.caption}>{caption}</span> : null}
        <span className={styles.text}>{children}</span>
      </span>
    </span>
  )
}
