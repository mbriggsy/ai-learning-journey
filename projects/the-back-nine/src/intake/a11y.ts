/**
 * Shared intake a11y primitives (phase-2 U5 contract, built by D1; U7 reuses
 * `focusHeading` to move focus to the verdict, U8 to the Save screens).
 *
 * FOCUS-TO-HEADING (the established project pattern): on every step advance,
 * focus moves to the new step's HEADING (`tabindex="-1"`), NEVER the input —
 * auto-focusing an input pops the mobile keyboard before the user can read the
 * question, and the heading-as-focus-target IS the announcement (no
 * double-announce). The heading must be faded with OPACITY ONLY while focused
 * on mount — a `visibility`/`autoAlpha` toggle makes `.focus()` a silent no-op
 * (ai-journey-stats/006, generalized from a modal to a wizard step).
 *
 * THE ONE LIVE REGION: a single visually-hidden polite region carries only
 * transient status, with burned/045 clear-after-announce discipline so stale
 * text never lingers in the a11y tree (keeps Playwright/N=1 snapshot
 * verification honest — exactly one current question in the tree).
 */
import { useEffect, useRef } from 'react'

/** Move focus to a step/verdict heading. The heading carries `tabIndex={-1}`
 *  (focusable, not tabbable). Safe to call mid-enter-animation — the step
 *  fades with opacity only, so focus() always takes. */
export function focusHeading(el: HTMLElement | null): void {
  el?.focus({ preventScroll: false })
}

/** React hook: returns a ref to attach to the current step's heading; focuses
 *  it whenever `stepId` changes (including the first mount of the flow). */
export function useFocusHeadingOnStep(stepId: string) {
  const ref = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => {
    focusHeading(ref.current)
  }, [stepId])
  return ref
}

/** Clear-after-announce delay: long enough for every screen reader to pick up
 *  the change, short enough that the tree is clean before the next interaction
 *  (burned/045). */
const CLEAR_AFTER_MS = 1000

export interface Announcer {
  /** Announce a transient status (e.g. the SR progress position). The region
   *  self-clears so stale text never lingers. */
  announce(text: string): void
}

/** Create the single polite live-region controller bound to a DOM node.
 *  (Component wrapper in flow.tsx owns the node; this stays DOM-pure for
 *  testability.) */
export function createAnnouncer(node: HTMLElement, clearAfterMs = CLEAR_AFTER_MS): Announcer {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    announce(text: string) {
      if (timer !== null) clearTimeout(timer)
      node.textContent = text
      timer = setTimeout(() => {
        node.textContent = ''
        timer = null
      }, clearAfterMs)
    },
  }
}
