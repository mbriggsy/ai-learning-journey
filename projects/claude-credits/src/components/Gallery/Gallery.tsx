import { useState } from 'react'
import styles from './Gallery.module.css'

/**
 * Movement 6 — the proof gallery (Phase 5). Responsive image grid; a broken/stale image hides
 * its own tile (never a broken-image glyph). Mounted by the page only when `images.length > 0`.
 *
 * C2 renders the static grid. C3 wires the lightbox (click → overlay, Esc/click-out close,
 * focus trap + restore) — these become buttons there; here they are plain images.
 */
export function Gallery({ images }: { images: string[] }) {
  const [broken, setBroken] = useState<Set<number>>(new Set())
  const visible = images.map((src, i) => ({ src, i })).filter(({ i }) => !broken.has(i))
  if (visible.length === 0) return null

  return (
    <section className={styles.gallery} aria-label="Gallery">
      <ul className={styles.grid}>
        {visible.map(({ src, i }) => (
          <li key={i} className={styles.cell} data-gallery-cell>
            <img
              className={styles.image}
              src={src}
              alt=""
              loading="lazy"
              onError={() => setBroken((prev) => new Set(prev).add(i))}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
