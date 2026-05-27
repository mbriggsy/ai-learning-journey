import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '@/motion/gsap-context'
import { duration, stagger } from '@/motion/tokens'
import { ease } from '@/motion/easings'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import styles from './Close.module.css'

/**
 * The close — the editorial spine's final beat (Phase 7, ideation §4/§11). The landing page
 * ends on the project's THESIS at display weight, not a re-print of the hero's numbers:
 *
 *   "Claude wrote all of it. Briggsy directed — and answered a question or two."
 *
 * Declarative, type-on-background, nothing clickable. This is the §11 sign-off promoted from a
 * quiet About footnote to the site's final, most-prominent word (Briggsy 2026-05-27) — it
 * SUPERSEDES the locked three-figure magnitude stack: the hero already owns the magnitude, so
 * repeating it here read as padding (cold-read finding). The line is warm/self-deprecating, not
 * a who-wrote-what scoreboard, so it stays inside §11's spirit. Static text → no data dependency,
 * no null-degrade (the old deriveCloseModel + close-model.ts were removed with the stats).
 *
 * The lead clause leads; the second clause follows in a softer weight/colour and a beat later —
 * the same number-then-context rhythm as the hero reveal.
 */
export function Close() {
  const closeRef = useRef<HTMLElement>(null) // GSAP scope root for the reveal

  // Reveal-on-scroll in the site's `weighted` dialect — the close is below the fold, so it
  // reveals as the visitor scrolls to it. Everything lives in ONE useGSAP({scope}) so the dev
  // StrictMode double-invoke reverts the gsap.set + trigger cleanly. The hidden state is set
  // in JS (never a CSS opacity:0 default) so a dead/absent motion layer degrades to a
  // fully-visible close — never a blank final beat (P0 guard).
  useGSAP(
    () => {
      const root = closeRef.current
      if (!root) return
      // SCOPED selection (insight 004): useGSAP's {scope} governs context REVERT, not selector
      // resolution — a bare gsap.set('[data-reveal]') resolves document-wide and would hijack
      // any other [data-reveal] host. toArray(sel, root) scopes to this section.
      const targets = () => gsap.utils.toArray<HTMLElement>('[data-reveal]', root)

      // Reduced motion → leave the close at its final visible state (CSS default). Return
      // BEFORE any gsap.set hidden state (mirrors the hero/grid branch) so nothing is left hidden.
      if (prefersReducedMotion()) return

      // Hidden state in JS (P0 guard) — FIRST statement of the motion branch. A dead layer
      // (ScrollTrigger absent, JS throw, trigger never fires) can't leave the close stuck hidden,
      // because the CSS default is visible and JS only removes-then-restores it.
      gsap.set(targets(), { autoAlpha: 0, y: 24 })

      // One-shot reveal. The `revealed` flag — NOT `overwrite` alone — is what guarantees the two
      // reveal paths (post-settle rect-check + onEnter) can't double-fire or restart a mid-flight
      // tween (overwrite would restart from interpolated values → a visible stutter, not a no-op).
      let revealed = false
      const reveal = () => {
        if (revealed) return
        revealed = true
        gsap.to(targets(), {
          autoAlpha: 1,
          y: 0,
          duration: duration.reveal,
          ease: ease.arrive,
          stagger: stagger.supportingLines,
          overwrite: true,
        })
      }

      // The y:24 hidden offset displaces each target's measured top, so the global
      // ScrollTrigger.refresh() Phase 4 fires (to position this below-fold trigger) would compute
      // start:'top 85%' 24px low. refreshInit zeroes y for correct MEASUREMENT; 'refresh' (after
      // measurement) RESTORES y:24 on targets that haven't revealed yet — without the restore the
      // refresh (which fires on load, before any scroll, since the close sits far below the hero)
      // leaves them at y:0 and the reveal degrades to a pure fade with no rise. Both listeners are
      // on GSAP's GLOBAL bus — useGSAP's context revert does NOT remove them, so they MUST be
      // removed in cleanup or the StrictMode double-invoke leaks handlers over torn-down refs
      // (mirrors Phase 4 Decision 9; the plan's 7.2a omitted the restore — see commit note).
      const resetY = () => {
        if (closeRef.current) gsap.set(targets(), { y: 0 })
      }
      const restoreY = () => {
        if (!closeRef.current) return
        const hidden = targets().filter((el) => Number(gsap.getProperty(el, 'autoAlpha')) < 1)
        if (hidden.length) gsap.set(hidden, { y: 24 })
      }
      ScrollTrigger.addEventListener('refreshInit', resetY)
      ScrollTrigger.addEventListener('refresh', restoreY)

      // Below-fold reveal: ONE ScrollTrigger (NOT batch — that's the tile-list pattern). Trigger
      // positioning relies on Phase 4's global refresh (PRIMARY); the close fires NO global
      // refresh of its own (a second one recomputes ALL triggers and can reflow revealed tiles).
      ScrollTrigger.create({ trigger: root, start: 'top 85%', once: true, onEnter: reveal })

      // Already-in-view (tall viewport / short page): a plain once:true trigger may never fire
      // onEnter if its start is already passed at load → invisible final beat. Cover it with a
      // POST-SETTLE rect-check: useGSAP is useLayoutEffect (pre-paint, pre-settle), so a sync
      // getBoundingClientRect() reads stale layout. Run it after fonts/images settle. LOCAL only
      // (no global refresh); the `revealed` flag keeps it safe against a later onEnter. ALL timers
      // captured + a cancelled flag so the StrictMode double-invoke's stale timer/rAF can't fire
      // reveal() after this context is reverted.
      let cancelled = false
      let rafId = 0
      let timerId = 0
      const settled = new Promise<void>((resolve) => {
        timerId = window.setTimeout(resolve, 1500)
        void document.fonts.ready.then(() => resolve())
      })
      void settled.then(() => {
        if (cancelled) return
        rafId = requestAnimationFrame(() => {
          if (
            !revealed &&
            closeRef.current &&
            closeRef.current.getBoundingClientRect().top < window.innerHeight * 0.85
          ) {
            reveal()
          }
        })
      })

      return () => {
        cancelled = true
        clearTimeout(timerId)
        cancelAnimationFrame(rafId)
        ScrollTrigger.removeEventListener('refreshInit', resetY)
        ScrollTrigger.removeEventListener('refresh', restoreY)
      }
    },
    { scope: closeRef, dependencies: [] },
  )

  return (
    <section ref={closeRef} className={styles.close} aria-label="In closing">
      <p className={styles.signoff}>
        <span className={styles.lead} data-reveal>
          Claude wrote all of it.
        </span>
        <span className={styles.aside} data-reveal>
          Briggsy directed — and answered a question or two.
        </span>
      </p>
    </section>
  )
}
