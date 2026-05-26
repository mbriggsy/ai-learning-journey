import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP } from '@/motion/gsap-context'
import { ease } from '@/motion/easings'
import { duration } from '@/motion/tokens'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import styles from './Gallery.module.css'

/**
 * Movement 6 — the proof gallery (Phase 5). Responsive image grid; a broken/stale image hides
 * its own tile. Mounted by the page only when `images.length > 0`.
 *
 * C3 lightbox (v1 scope = open/close only, NO prev/next): click a tile → a portal overlay (to
 * body, escaping the page's overflow/containing-block context); Esc / click-out / close button
 * dismiss; focus is trapped while open and restored to the triggering tile on close. Reduced
 * motion → it still opens (interaction, not decoration), just without the scale-in.
 */
export function Gallery({ images }: { images: string[] }) {
  const [broken, setBroken] = useState<Set<number>>(new Set())
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const visible = images.map((src, i) => ({ src, i })).filter(({ i }) => !broken.has(i))
  if (visible.length === 0) return null

  const openSrc = openIndex !== null ? images[openIndex] : null

  return (
    <section className={styles.gallery} aria-label="Gallery">
      <ul className={styles.grid}>
        {visible.map(({ src, i }) => (
          <li key={i} className={styles.cell} data-gallery-cell>
            <button type="button" className={styles.cellButton} onClick={() => setOpenIndex(i)} aria-label="View image">
              <img
                className={styles.image}
                src={src}
                alt=""
                loading="lazy"
                onError={() => setBroken((prev) => new Set(prev).add(i))}
              />
            </button>
          </li>
        ))}
      </ul>
      {openSrc && <Lightbox src={openSrc} onClose={() => setOpenIndex(null)} />}
    </section>
  )
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Scale-in (transform + opacity only; never scale(0)). Reduced-motion / dead-layer → the
  // overlay renders at its CSS-visible default (the lightbox still works — it's interaction).
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      // opacity, NOT autoAlpha: autoAlpha:0 sets visibility:hidden, which would make the close
      // button (inside the overlay) non-focusable when the focus effect runs → broken focus trap.
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: duration.hover, ease: ease.arrive })
      gsap.fromTo(
        imgRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: duration.hover, ease: ease.press },
      )
    },
    { scope: overlayRef },
  )

  // Focus trap + restore, Esc, body-scroll lock. Capture the trigger BEFORE moving focus.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Only the close button is focusable → trap by keeping focus on it.
      if (e.key === 'Tab') {
        e.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close image viewer">
        ×
      </button>
      {/* stopPropagation so a click on the image itself doesn't dismiss (only the backdrop does). */}
      <img ref={imgRef} className={styles.lightboxImage} src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body,
  )
}
