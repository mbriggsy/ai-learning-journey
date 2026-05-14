import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/**
 * Animates every `[data-reveal]` element on the page from a small offset +
 * faded state into its final position when it enters the viewport. Sells the
 * "dossier-leaf turning into place" feeling without trapping scroll.
 *
 * Respects prefers-reduced-motion by setting elements straight to visible.
 *
 * Mount this once at the App root.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger)
      registered = true
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]')

    if (reduced) {
      // Reduced-motion: skip the animation; ensure visible.
      targets.forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = ''
      })
      return
    }

    const triggers: ScrollTrigger[] = []

    targets.forEach((el) => {
      // Initial state — set inline so it survives a pre-paint flash.
      gsap.set(el, { opacity: 0, y: 36, rotateX: 6, transformPerspective: 1200 })

      const tween = gsap.to(el, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      })

      if (tween.scrollTrigger) {
        triggers.push(tween.scrollTrigger)
      }
    })

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [])
}
