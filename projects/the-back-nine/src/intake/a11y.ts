/**
 * Shared intake a11y primitives (phase-2 U5 contract, built by D1; U7 reuses
 * `focusHeading` to move focus to the verdict, U8 to the Save screens).
 *
 * FOCUS-TO-HEADING (the established project pattern): on every step advance,
 * focus moves to the new step's HEADING (`tabindex="-1"`), NEVER the input —
 * auto-focusing an input pops the mobile keyboard before the user can read the
 * question, and the heading-as-focus-target IS the announcement (no
 * double-announce) — and on an intake STEP CHANGE the document scroll is reset
 * to 0 with it, so the answer strip (the whole answer-during-entry surface) is
 * in view on arrival rather than scrolled off the top of the window. The
 * heading must be faded with OPACITY ONLY while focused on mount — a
 * `visibility`/`autoAlpha` toggle makes `.focus()` a silent no-op
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
 *  fades with opacity only, so focus() always takes.
 *
 *  `preventScroll` DEFAULTS TO FALSE and must stay that way: every other caller
 *  (the vault ceremonies, the two result heroes, the two intake sheets, the two
 *  list-step editors and their lists) relies on the browser scrolling the freshly-
 *  focused heading into view, and NO test anywhere asserts that scroll — flipping the
 *  default would regress every one of them in silence. That gap is measured, not
 *  assumed: an arm was built for the account editor (the one call site an e2e harness
 *  can drive) and it disqualified itself on its own non-vacuity read — the accounts
 *  list at PHONE (390×844) has a scrollable range of only 281 px, while the editor's
 *  heading lands 383.3 px down the document, so at every scroll a reader can reach it is
 *  ALREADY on screen and the browser has nothing to scroll (e2e/intake-fold.spec.ts's
 *  docblock carries the numbers). Treat this default as load-bearing and unguarded.
 *  The opt-in is used by exactly ONE of the call sites, `useFocusHeadingOnStep` below,
 *  which owns the scroll position itself. */
export function focusHeading(
  el: HTMLElement | null,
  opts?: { readonly preventScroll?: boolean },
): void {
  el?.focus({ preventScroll: opts?.preventScroll ?? false })
}

/** React hook: returns a ref to attach to the current step's heading; focuses
 *  it whenever `stepId` changes (including the first mount of the flow), and
 *  puts the page back at the top so the step is entered from its own first line.
 *
 *  WHY THE RESET. The DOCUMENT is the scroller — `.intake-shell` declares no
 *  `overflow` and neither does `html` or `body` (base.css) — so the scroll offset
 *  survives the step swap. On a phone the reader routinely has to scroll to reach
 *  Continue: measured 2026-09-08 at 390 CSS px on the `?seed=datesolo` re-walk,
 *  Continue's bottom edge sits below the 862 px window at scroll 0 on SIX of that
 *  route's twelve steps, reaching 1430 px on the Social Security step. The answer
 *  strip sits ABOVE the step heading, so a carried offset lands it off the top of
 *  the window: on that walk four steps arrived scrolled, three of them with the
 *  strip 48 px, 210 px and 152 px above the fold (the pay, retirement-state and
 *  health-coverage steps).
 *
 *  WHY `preventScroll` HERE AND NOWHERE ELSE. `focus()` scrolls its target into
 *  view, and on this surface that scroll really fires — but only once the incoming
 *  heading is off screen, and the heading sits ~308–400 px down the page: a carried
 *  400 px was pulled to 0 by the focus scroll alone, while a carried 120 px was left
 *  exactly where it was (both measured in the same session). So the offsets a phone
 *  reader actually produces are the ones the browser leaves alone. Focusing WITHOUT
 *  scroll and resetting afterwards makes the landing frame the same one every time,
 *  instead of one that depends on how far the reader had scrolled.
 *
 *  WHAT THIS OPT-IN IS AND IS NOT GATED BY (measured 2026-09-08). The RESET is gated:
 *  deleting the two lines below reds e2e/intake-fold.spec.ts's arrival arm. The
 *  `{ preventScroll: true }` argument is NOT, and cannot be — the `scrollTop = 0` two
 *  lines down lands in the SAME task, so dropping it changes no frame any oracle can
 *  observe. It is belt-and-braces (it spares `focus()` scroll work this effect is about
 *  to undo), never a load-bearing behaviour: do not write a test that pretends otherwise.
 *  The DEFAULT above is the opposite case — load-bearing and unguarded. */
export function useFocusHeadingOnStep(stepId: string) {
  const ref = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => {
    focusHeading(ref.current, { preventScroll: true })
    // `document.scrollingElement`, not `window.scrollTo`: jsdom logs "Not implemented:
    // window.scrollTo" and that line would print through every intake test in the suite.
    // THE GUARD IS NULLISH, NOT `!== null`: jsdom (29.x) does not implement
    // `scrollingElement` at all — `'scrollingElement' in document` is false there, so the
    // read is `undefined` while the DOM lib types it `Element | null`. A `!== null` guard
    // typechecks, passes lint, and throws in every jsdom test that mounts the flow.
    const scroller = document.scrollingElement ?? undefined
    if (scroller !== undefined) scroller.scrollTop = 0
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
