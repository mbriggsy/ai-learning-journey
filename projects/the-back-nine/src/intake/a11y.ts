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
import { useCallback, useEffect, useMemo, useRef } from 'react'

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

/** The single-live-region controller returned by {@link useLiveAnnouncer}: an
 *  {@link Announcer} (so it drops straight into any child that takes an `announcer`
 *  prop) that also hands back the ref to bind its DOM node. */
export interface LiveAnnouncer extends Announcer {
  /** Attach to the ONE visually-hidden polite live-region node. */
  readonly ref: (node: HTMLElement | null) => void
}

/**
 * React hook wrapping {@link createAnnouncer} — the one live-region idiom, in one place.
 *
 * The node is bound by a CALLBACK REF, never a mount effect. A `useEffect(…, [])` that
 * reads a `liveRef` binds only what exists at the component's FIRST render; when the
 * region lives inside an open-gated portal that mounts AFTER the component (BudgetBuilder,
 * mounted-closed-then-opened), that effect binds null and never retries — a dead announcer
 * that stays green in every always-open test (insight 060). The callback ref binds/unbinds
 * the announcer exactly when its node mounts/unmounts, so both shapes — an unconditionally-
 * mounted region and a late portal — are correct by construction.
 *
 * `announce` and `ref` are stable across renders and the returned object identity is stable,
 * so a child holding it as an `announcer` prop never re-fires an announcer-keyed effect. An
 * `announce` before the node attaches is a safe no-op (never throws); after, it speaks.
 */
export function useLiveAnnouncer(clearAfterMs = CLEAR_AFTER_MS): LiveAnnouncer {
  const announcerRef = useRef<Announcer | null>(null)
  const ref = useCallback(
    (node: HTMLElement | null) => {
      announcerRef.current = node === null ? null : createAnnouncer(node, clearAfterMs)
    },
    [clearAfterMs],
  )
  const announce = useCallback((text: string) => {
    announcerRef.current?.announce(text)
  }, [])
  return useMemo<LiveAnnouncer>(() => ({ ref, announce }), [ref, announce])
}
