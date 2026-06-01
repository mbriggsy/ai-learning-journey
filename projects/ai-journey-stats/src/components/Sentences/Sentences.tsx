import { splitSentences } from '@/lib/format'
import styles from './Sentences.module.css'

/**
 * Renders a short editorial string as one visual line per sentence — each a block-level span,
 * so the surrounding element's type styles (size, color, tracking) still cascade unchanged.
 * Screen readers read the spans as continuous text, so the line breaks are purely visual; the
 * one-liner stays one logical sentence-group. Single-sentence input renders as a single line
 * (no-op vs. plain text). Used by DetailHero + ProjectTile so the rule lives in one place.
 */
export function Sentences({ text }: { text: string }) {
  return splitSentences(text).map((line, i) => (
    <span key={i} className={styles.line}>
      {line}
    </span>
  ))
}
