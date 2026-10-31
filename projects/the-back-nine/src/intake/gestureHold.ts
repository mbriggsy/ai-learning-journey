/*
 * src/intake/gestureHold.ts — hold what a face showed at a press until that press's click has landed
 * (the h2 cure: insight 035, on the layout side; the register's CLOSED Tier 0 "On a screen taller than
 * his laptop's, a tap on "Each month" right after typing the working-year figure can miss…").
 *
 * THE RACE. A field that commits on blur is blurred BY the press on the next control: mouse —
 * pointerdown → mousedown (the blur, and its commit) → pointerup → mouseup → click; touch — the
 * compatibility mousedown, and so the blur, comes AFTER the finger lifts (after pointerup). React
 * renders a discrete event's update before the next event of the gesture is dispatched, so when the
 * commit changes content ABOVE the control (the W face's stale note unmounts; the panel's money picture
 * mounts or re-sizes), the control moves before the release is hit-tested. The release lands on another
 * element, the click goes to the common ancestor, and the tap is lost. Chromium's scroll anchoring moves
 * the scroller back on most screens (every one of his), but not where the anchor node it picks sits
 * above the change while the target sits below it (a tall screen). And a control INSIDE the change —
 * the stale note's own Keep door — is simply gone, on every screen.
 *
 * THE CURE. From a press that can blur something inside `ref` — a press inside it, or anywhere while
 * focus is inside it — until the gesture's click, the face renders the value it showed at the press;
 * then the commit's layout lands. The commit itself lands in the store at the blur, as always.
 *  · The click releases on `window` in the BUBBLE phase, after React's root listener has dispatched the
 *    click to its target: a capture-phase release re-renders first (a browser-dispatched event runs a
 *    microtask checkpoint between listeners), and a held control the live state no longer has (the
 *    Keep door) would be detached from React before its own onClick ran. (A label's click releases
 *    before the label forwards its own click to its control; that forwarded click finds the control
 *    directly, never by position, so a radio below the held content is unaffected.)
 *  · `pointerup` NEVER releases. On touch the blur has not happened yet at pointerup, and an early
 *    release detaches a held control before the click its release was hit-tested on reaches it. It only
 *    arms a fallback, for a press that never clicks (a drag, a long press). `pointercancel` (the browser
 *    took the touch for a scroll), `contextmenu` and the window losing focus release at once.
 *  · Only a primary press holds (`button` 0: the left mouse button, a finger, a pen tip): a right or
 *    middle press opens no click.
 *
 * WHAT IT IS NOT: never a commit path. A face that holds a CONTROL must make it act on what it shows
 * (the Keep door keeps the figure it names), and should hold only what the press's own blur can change
 * under it — a held control must never escape a gate that another field's commit just closed. Never
 * `overflow-anchor: none` above these faces: the scroll anchoring it would switch off is what keeps
 * every tap on his devices today.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** How long after a release with no click the hold lets go anyway. Only a press that never clicks
 *  reaches it (a mouse click follows its mouseup in the same task; a touch tap's click follows the lift
 *  within a few milliseconds, measured in Chromium and WebKit — the page has `width=device-width`, so no
 *  double-tap zoom to wait out). */
export const GESTURE_HOLD_FALLBACK_MS = 500

/**
 * `live` — except from a primary press inside `ref`, or anywhere while focus is inside `ref` (the press
 * that will blur it), until that gesture's click (or a cancel, a context menu, the window losing focus,
 * or the fallback after a release with no click): then the value the face DREW when the press began. A
 * second press during a hold keeps the first press's value: that is still what is on screen.
 */
export function useGestureHold<T>(ref: RefObject<HTMLElement | null>, live: T): T {
  const [hold, setHold] = useState<{ readonly value: T } | null>(null)
  const drawn = hold === null ? live : hold.value
  // What the face DREW at the last commit — written in the layout phase, so a press (which the browser
  // can only dispatch after a commit) reads what the screen is showing, even in the gap between a
  // release and the render that lands it.
  const committed = useRef(drawn)
  useLayoutEffect(() => {
    committed.current = drawn
  })
  useEffect(() => {
    let holding = false
    let fallback: ReturnType<typeof setTimeout> | undefined
    const stopFallback = () => {
      if (fallback !== undefined) clearTimeout(fallback)
      fallback = undefined
    }
    const unlisten = () => {
      window.removeEventListener('pointerup', armFallback, true)
      window.removeEventListener('pointercancel', release, true)
      window.removeEventListener('contextmenu', release, true)
      window.removeEventListener('click', release)
      window.removeEventListener('blur', release)
    }
    function release() {
      if (!holding) return
      holding = false
      stopFallback()
      unlisten()
      setHold(null)
    }
    function armFallback() {
      stopFallback()
      fallback = setTimeout(release, GESTURE_HOLD_FALLBACK_MS)
    }
    const press = (e: PointerEvent) => {
      if (e.button !== 0) return
      const el = ref.current
      if (el === null) return
      const target = e.target instanceof Node ? e.target : null
      if (!(target !== null && el.contains(target)) && !el.contains(document.activeElement)) return
      stopFallback()
      if (holding) return
      holding = true
      setHold({ value: committed.current })
      window.addEventListener('pointerup', armFallback, true)
      window.addEventListener('pointercancel', release, true)
      window.addEventListener('contextmenu', release, true)
      // The bubble phase — never `true` (see the header): after the app's own click handlers.
      window.addEventListener('click', release)
      window.addEventListener('blur', release)
    }
    document.addEventListener('pointerdown', press, true)
    return () => {
      document.removeEventListener('pointerdown', press, true)
      // A re-run or an unmount mid-hold lets go: a face never stays frozen on a hold nobody can release.
      if (holding) setHold(null)
      holding = false
      stopFallback()
      unlisten()
    }
  }, [ref])
  return drawn
}
