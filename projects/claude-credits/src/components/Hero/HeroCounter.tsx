import { useRef, type CSSProperties } from 'react'
import { gsap, useGSAP } from '@/motion/gsap-context'
import { duration } from '@/motion/tokens'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import { formatTokens, pickTokenUnit, padCounter } from '@/lib/format'
import styles from './Hero.module.css'

// srUnit: the screen-reader unit phrase ("tokens processed" | "lines authored" | "projects")
// so each null-degrade branch announces the truth (aria must match the visible unit).
export function HeroCounter({ value, srUnit }: { value: number; srUnit: string }) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const unit = pickTokenUnit(value)
  const finalText = formatTokens(value, unit)
  const render = (n: number) => padCounter(formatTokens(n, unit), finalText.length)

  // useGSAP runs at useLayoutEffect timing (before browser paint), so writing textContent
  // here — NOT as a JSX child — avoids an empty-frame flash AND the React-vs-GSAP ownership
  // fight: the number span has NO JSX text child, so React never reconciles a text node
  // against GSAP's per-frame writes (a JSX {finalText} child would be re-asserted on any
  // parent re-render — e.g. the Phase 4 grid mounting below in <Landing> — and clobber the
  // animated value mid-tween). GSAP owns el.textContent exclusively.
  useGSAP(
    (_ctx, contextSafe) => {
      const el = numberRef.current
      if (!el || !contextSafe) return

      // Reduced motion: final number instantly, no tween, no sheen (the NUMBER is the
      // comprehension; the sheen is decoration, drop it).
      if (prefersReducedMotion()) {
        el.textContent = finalText
        return
      }

      // Counter: tween a proxy, snap to integer, render in the LOCKED unit + constant width.
      const proxy = { val: 0 }
      el.textContent = render(0)
      gsap.to(proxy, {
        val: value,
        duration: duration.counter, // 2.4s
        ease: 'weighted-settle', // registered in Phase 1 easings.ts (boot-imported)
        snap: { val: 1 },
        onUpdate: () => {
          el.textContent = render(proxy.val)
        },
      })

      // Specular sheen: drift the radial-gradient center toward the cursor, smoothed.
      // --sheen-x/y are UNITLESS 0–100 numbers (the CSS converts via calc(* 1%)). quickTo
      // pipes RAW NUMBERS and skips unit-appending — a "50%" string would write an invalid
      // bare-number position and silently kill the gradient. Seed via gsap.set so quickTo's
      // first move eases from the resting 50/40, not from 0.
      gsap.set(el, { '--sheen-x': 50, '--sheen-y': 40 })
      const setX = gsap.quickTo(el, '--sheen-x', { duration: 0.5, ease: 'power3' })
      const setY = gsap.quickTo(el, '--sheen-y', { duration: 0.5, ease: 'power3' })
      const onMove = contextSafe((e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        setX(((e.clientX - r.left) / r.width) * 100) // unitless number, not "%"
        setY(((e.clientY - r.top) / r.height) * 100)
      })
      // Only on hover-capable, fine pointers (touch has no cursor — sheen stays solid via CSS).
      const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      if (canHover) window.addEventListener('pointermove', onMove)
      return () => {
        if (canHover) window.removeEventListener('pointermove', onMove)
      }
    },
    { scope: rootRef, dependencies: [value] },
  )

  return (
    <span ref={rootRef} className={styles.counterWrap}>
      {/* NO JSX text child — GSAP owns textContent (see comment above). aria-label is a
          React-owned attribute (no conflict) and uses srUnit so null-degrade stays honest. */}
      <span
        ref={numberRef}
        className={`${styles.counter} tabular`}
        style={{ '--counter-ch': `${finalText.length}ch` } as CSSProperties}
        aria-label={`${finalText} ${srUnit}`}
      />
    </span>
  )
}
