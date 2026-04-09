import { useEffect, type RefObject } from 'react'

const DAMPEN = 0.25
const MAX_PX = 50
const SPRING = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)'

/**
 * Adds rubber-band bounce when a horizontal scroll container hits its edge.
 * iOS has this natively; Android doesn't — this fills the gap.
 */
export function useScrollBounce(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let edgeX: number | null = null

    const onTouchStart = () => {
      // Clear any in-progress spring so new gesture starts clean
      el.style.transition = ''
      el.style.transform = ''
      edgeX = null
    }

    const onTouchMove = (e: TouchEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) return

      const currentX = e.touches[0]!.clientX
      const atStart = el.scrollLeft <= 2
      const atEnd = el.scrollLeft >= maxScroll - 2

      if ((atStart || atEnd) && edgeX === null) {
        edgeX = currentX
      }

      if (!atStart && !atEnd) {
        edgeX = null
        el.style.transform = ''
        return
      }

      if (edgeX !== null) {
        const overscroll = currentX - edgeX
        const valid = (atStart && overscroll > 0) || (atEnd && overscroll < 0)
        if (valid) {
          const clamped = Math.max(-MAX_PX, Math.min(MAX_PX, overscroll * DAMPEN))
          el.style.transform = `translateX(${clamped}px)`
        }
      }
    }

    const onTouchEnd = () => {
      edgeX = null
      if (el.style.transform) {
        el.style.transition = SPRING
        el.style.transform = ''
        const cleanup = () => { el.style.transition = '' }
        el.addEventListener('transitionend', cleanup, { once: true })
        setTimeout(cleanup, 400) // fallback
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref])
}
