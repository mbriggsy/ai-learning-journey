import { useRef, type CSSProperties } from 'react'
import { formatTokens, pickTokenUnit } from '@/lib/format'
import styles from './Hero.module.css'

// srUnit: the screen-reader unit phrase ("tokens processed" | "lines authored" | "projects")
// so the null-degrade branches announce the truth (aria must match the visible unit).
// C2: static render of the formatted final number. C3 removes the JSX text child and lets
// GSAP own textContent exclusively (see plan 3.3a).
export function HeroCounter({ value, srUnit }: { value: number; srUnit: string }) {
  const numberRef = useRef<HTMLSpanElement>(null)
  const unit = pickTokenUnit(value)
  const finalText = formatTokens(value, unit)
  return (
    <span className={styles.counterWrap}>
      <span
        ref={numberRef}
        className={`${styles.counter} tabular`}
        // reserve width so the C3 tick-up can't reflow neighbors (Decision 5)
        style={{ '--counter-ch': `${finalText.length}ch` } as CSSProperties}
        aria-label={`${finalText} ${srUnit}`}
      >
        {finalText}
      </span>
    </span>
  )
}
