// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AccumulatedEvent } from '@client/shared/gameStore'
import type { BoardPlayer } from '@shared/protocol'

// Stub motion/react so AnimatePresence is a synchronous passthrough and `m.div`
// is a plain div. Framer's exit animation uses rAF, which `vi.useFakeTimers()`
// doesn't mock by default — without stubbing, an exiting node can remain in the
// DOM with stale text after `setAlert(null)`, producing test results that
// reflect animation pipeline state, not React state. We want to test React
// state directly: alert truthy → div present, alert null → div absent.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  m: new Proxy({}, {
    get: (_, tag: string) => (props: Record<string, unknown>) => {
      const { children, initial: _i, animate: _a, exit: _e, transition: _t, ...rest } =
        props as { children?: ReactNode; initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }
      // Dynamic intrinsic — bypass JSX-element typing for the test stub.
      const Tag = tag as 'div'
      return <Tag {...(rest as Record<string, unknown>)}>{children}</Tag>
    },
  }),
  LazyMotion: ({ children }: { children: ReactNode }) => children,
}))

// Controlled mocks for the three hooks PlayerAlert reads. We mutate these
// refs between renders to drive the component through favor-pending without
// standing up the full gameStore + WebSocket pipeline.
const eventsRef: { current: readonly AccumulatedEvent[] } = { current: [] }
const myIdRef: { current: string | null } = { current: null }
const playersRef: { current: readonly BoardPlayer[] } = { current: [] }

vi.mock('@client/shared/hooks/useEventFeed', () => ({
  useEventFeed: () => eventsRef.current,
}))
vi.mock('@client/shared/hooks/useSharedSelectors', () => ({
  usePlayerList: () => playersRef.current,
}))
vi.mock('./hooks/usePlayerSelectors', () => ({
  useMyPlayerId: () => myIdRef.current,
}))

// Side-effect modules PlayerAlert calls; silence them for tests.
vi.mock('@client/shared/haptics', () => ({ haptic: vi.fn() }))
vi.mock('@client/shared/announce', () => ({ announce: vi.fn() }))

import { PlayerAlert } from './PlayerAlert'

const SEAT2_ID = 'seat-2-uuid'
const SEAT3_ID = 'seat-3-uuid'

const PLAYERS: readonly BoardPlayer[] = [
  { id: 'seat-1-uuid', name: 'Seat1', color: '#e74c3c', cardCount: 8, isAlive: true, isConnected: true },
  { id: SEAT2_ID, name: 'Seat2', color: '#3498db', cardCount: 8, isAlive: true, isConnected: true },
  { id: SEAT3_ID, name: 'Seat3', color: '#2ecc71', cardCount: 8, isAlive: true, isConnected: true },
]

function mount(): { container: HTMLElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  return { container, root }
}

function teardown(container: HTMLElement, root: Root): void {
  act(() => { root.unmount() })
  container.remove()
}

function render(root: Root): void {
  act(() => {
    root.render(<PlayerAlert />)
  })
}

function setEvents(list: readonly AccumulatedEvent[]): void {
  eventsRef.current = list
}

function rerender(root: Root): void {
  // Force the component to re-read the mocked hooks after we mutate refs.
  act(() => {
    root.render(<PlayerAlert />)
  })
}

function alertText(container: HTMLElement): string | null {
  // Read the text span specifically (firstElementChild), not the alert div's
  // textContent — persistent alerts also render a dismiss button whose "×"
  // glyph would otherwise contaminate the assertion.
  const node = container.querySelector('[data-tone]')
  return node?.firstElementChild?.textContent ?? null
}

beforeEach(() => {
  vi.useFakeTimers()
  eventsRef.current = []
  myIdRef.current = SEAT3_ID
  playersRef.current = PLAYERS
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PlayerAlert — card-played toast lifecycle', () => {
  // Briggsy 2026-05-08 §2.2 fix: observer card-played toasts now persist
  // through the full nope window so observers have the entire 10s window
  // to read what was played and decide whether to Intercept. The toast
  // clears at `nope-window-resolved` (window close, intercepted or not),
  // at which point the action is committed and the toast has done its job.
  // 2026-05-10: observer card-played text is now a per-card flavor pool
  // (spec §3.5 PlayerAlert observer sweep). Lifecycle assertions below check
  // toast presence + actor-name inclusion structurally; the Phrasing! pin
  // tests further down lock specific pool variants for known seeds.
  it('persists past the 2.8s auto-fade boundary while the nope window is open', () => {
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      const initial = alertText(container)
      expect(initial).not.toBeNull()
      expect(initial).toContain('Seat2')

      // Fast-forward past the old 2.8s auto-fade boundary.
      act(() => { vi.advanceTimersByTime(5_000) })
      // Pre-fix: toast would be null here. Post-fix: still visible because
      // persistUntil includes 'nope-window-resolved', and nope-window-resolved
      // hasn't fired yet. Same flavor variant — pool selection is stable on
      // eventId, not wall-clock.
      expect(alertText(container)).toBe(initial)
    } finally {
      teardown(container, root)
    }
  })

  it('clears at nope-window-resolved (window closed, action committed)', () => {
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)

      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).not.toBeNull()
      expect(alertText(container)).toContain('Seat2')

      act(() => { vi.advanceTimersByTime(10_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 10_300, id: 'evt-2' },
      ])
      rerender(root)
      // Window resolved → toast clears. The action is committed and the
      // observer's decision moment has passed.
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — Back Channel resolution narration (close 05-08-2022-5p #012 + #008 + #013 + #014)', () => {
  // The Back Channel is "THE Archer spy move" per the catalog vibe note.
  // ACTOR sees Archer-tone "// BACK CHANNEL — <Card> extracted." instead of
  // generic "You drew <Card>"; observers see a quiet resolution beat
  // "<Name> went off-channel." after their persistent card-played toast
  // clears.

  it('ACTOR: Back Channel draw produces "// BACK CHANNEL — <Card> extracted."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID // viewer is the ACTOR
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'back-channel' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 2, id: 'evt-2' },
        { event: { type: 'card-drawn', playerId: SEAT2_ID, safe: true, cardType: 'go-dark' }, receivedAt: 3, id: 'evt-3' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('// BACK CHANNEL — Go Dark extracted.')
    } finally {
      teardown(container, root)
    }
  })

  it('ACTOR: a regular end-of-turn draw still uses the generic "You drew <Card>." text', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      // No preceding card-played → walkBack hits turn-started boundary → false.
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-drawn', playerId: SEAT2_ID, safe: true, cardType: 'go-dark' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('You drew Go Dark.')
    } finally {
      teardown(container, root)
    }
  })

  it('OBSERVER: Back Channel draw produces "<Name> went off-channel."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID // viewer is an OBSERVER
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'back-channel' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 2, id: 'evt-2' },
        // Observer's card-drawn is stripped of cardType (private to drawer)
        { event: { type: 'card-drawn', playerId: SEAT2_ID, safe: true }, receivedAt: 3, id: 'evt-3' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 went off-channel.')
    } finally {
      teardown(container, root)
    }
  })

  it('OBSERVER: a regular end-of-turn draw fires no toast (default silent)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      // Observer's card-drawn for a non-Back-Channel draw is silent.
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-drawn', playerId: SEAT2_ID, safe: true }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — ACTOR intercepted toast (close 05-08-2022-5p #025 Gap 1 + #028)', () => {
  // Pre-fix: when the ACTOR's card was intercepted, the staging area silently
  // snapped back with no text. Observers got a persistent "Seat X played
  // [Card]" toast through the nope window — the actor got nothing. This
  // closes the asymmetry: a `nope-window-resolved {cancelled: true}` for a
  // card the local player just played fires an urgent ACTOR-side toast
  // naming the interceptor.
  it('renders "<Interceptor> intercepted your <Card>." when my card is cancelled', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID // viewer is the ACTOR whose card was blocked
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'back-channel' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-played', playerId: SEAT3_ID, chainDepth: 1 }, receivedAt: 2, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: true, chainDepth: 0 }, receivedAt: 3, id: 'evt-3' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat3 intercepted your Back Channel.')
    } finally {
      teardown(container, root)
    }
  })

  it("falls back to 'Your <Card> was intercepted.' when no nope-played is in the feed", () => {
    // Defensive — server should always emit nope-played alongside a
    // cancelled resolve, but the feed-walk degrades gracefully if it's
    // absent (e.g. event ordering edge case, projection strip future).
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-resolved', cancelled: true, chainDepth: 0 }, receivedAt: 2, id: 'evt-2' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Your Reassign was intercepted.')
    } finally {
      teardown(container, root)
    }
  })

  it('does NOT fire on cancelled:true when the viewer is an UNINVOLVED observer (neither actor nor noper)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = 'seat-1-uuid' // uninvolved bystander — Seat1
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'back-channel' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-played', playerId: SEAT3_ID, chainDepth: 1 }, receivedAt: 2, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: true, chainDepth: 0 }, receivedAt: 3, id: 'evt-3' },
      ])
      rerender(root)
      // Seat1's persistent card-played toast clears at nope-window-resolved.
      // No new urgent toast — uninvolved bystanders need no actor- or
      // noper-side narration.
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('does NOT fire on cancelled:false (the card resolved cleanly, no narration needed)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'back-channel' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 2, id: 'evt-2' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — Burn the Files ACTOR resolution beat (close 05-08-2022-5p #033 + #036)', () => {
  // Pre-fix the phone had no response to deck-shuffled — the board got the
  // shuffle animation, the actor's phone got silence. The new urgent toast
  // gives the ACTOR a destroy-the-evidence moment that mirrors the board.
  // Observers stay silent (their card-played toast already narrated the play).
  it('renders "// FILES BURNED — deck scrambled." for the ACTOR', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID // viewer is the ACTOR
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'deck-shuffled', playerId: SEAT2_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('// FILES BURNED — deck scrambled.')
    } finally {
      teardown(container, root)
    }
  })

  it('stays silent on deck-shuffled when the viewer is an OBSERVER', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID // viewer is OTHER, the actor is Seat2
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'deck-shuffled', playerId: SEAT2_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — observer favor-given closing beat (close 05-08-2022-5p #016)', () => {
  // Pre-fix the favor-given case was silent for ALL viewers — principals
  // got the FavorReport overlay, observers got NOTHING after the persistent
  // card-played toast cleared at favor-given. The closing beat now fires
  // for OTHER viewers as a quiet info-tone toast.
  //
  // 2026-05-09: text upgraded from a single static line to a 4-variant
  // flavor pool with Phrasing! seeded among 3 straight variants per spec
  // §3.5 cadence. The structural pin below survives future pool iteration;
  // the Phrasing!-shipping test below pins the deterministic seed/variant.
  it('renders an observer toast naming both principals (any flavor variant)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = 'seat-1-uuid' // viewer is OTHER (alive), not principal
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'favor-given', giverId: SEAT3_ID, receiverId: SEAT2_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      const text = alertText(container)
      expect(text).not.toBeNull()
      expect(text).toContain('Seat3')
      expect(text).toContain('Seat2')
      expect(text!.length).toBeGreaterThan(10)
    } finally {
      teardown(container, root)
    }
  })

  it('lands the Phrasing! variant ("X put out for Y. ...Phrasing.") for the matching seed', () => {
    // Pins the spec §3.5 contract: a Phrasing! beat is shipped on this
    // surface and the deterministic flavor-pool picker reaches it. Seed
    // chosen to hash into the Phrasing! variant of the 4-pool. If the
    // pool changes (variant order, count, copy), this test will need
    // updating alongside the spec's "Shipped beats" entry.
    const { container, root } = mount()
    try {
      myIdRef.current = 'seat-1-uuid'
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'favor-given', giverId: SEAT3_ID, receiverId: SEAT2_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat3 put out for Seat2. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })

  it('stays silent on favor-given when the viewer is a principal (FavorReport owns it)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID // viewer is the receiver
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'favor-given', giverId: SEAT3_ID, receiverId: SEAT2_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — combo + intercept observability (close 05-08-2022-5p Cluster D)', () => {
  // Pre-fix the card-played path suppressed combos entirely
  // (`if (event.comboSize !== undefined) break`), so observers got NO
  // information about pair- or triple-combo plays during the nope window.
  // Plus the noper themselves got no post-cancel confirmation of what
  // they'd intercepted — fast-clickers were left guessing what they
  // spent an Intercepted card on.

  it('OBSERVER: pair combo card-played emits "<Name> played a <Operative> pair."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'neal-proctor', comboSize: 2 }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 played a Neal Proctor pair.')
    } finally {
      teardown(container, root)
    }
  })

  it('OBSERVER: triple combo card-played emits "<Name> played a <Operative> triple."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'vera-khan', comboSize: 3 }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 played a Vera Khan triple.')
    } finally {
      teardown(container, root)
    }
  })

  it('NOPER: cancelled:true with my nope as the most-recent emits "You intercepted <Name>\'s <Card>."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID // viewer played the successful intercept
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-played', playerId: SEAT3_ID, chainDepth: 1 }, receivedAt: 2, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: true, chainDepth: 0 }, receivedAt: 3, id: 'evt-3' },
      ])
      rerender(root)
      expect(alertText(container)).toBe("You intercepted Seat2's Reassign.")
    } finally {
      teardown(container, root)
    }
  })

  it("NOPER: cancelling a pair combo emits the mechanic in the suffix (\"<Operative> pair\")", () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'neal-proctor', comboSize: 2 }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-played', playerId: SEAT3_ID, chainDepth: 1 }, receivedAt: 2, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: true, chainDepth: 0 }, receivedAt: 3, id: 'evt-3' },
      ])
      rerender(root)
      expect(alertText(container)).toBe("You intercepted Seat2's Neal Proctor pair.")
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — Direct Order target name in toast (close 05-08-2022-5p #032)', () => {
  // The Direct Order narrative beat is "ACTOR picked TARGET on purpose."
  // The card-played event now carries an optional targetId for direct-order
  // so observer toasts can surface who was targeted DURING the nope window.
  // Two-phase render is required because PlayerAlert's lastProcessedRef
  // baselines all events present at mount; only events arriving AFTER the
  // first render trip the toast pipeline.
  //
  // 2026-05-10: text is now a 4-variant flavor pool (spec §3.5 PlayerAlert
  // observer sweep). Every Direct Order pool variant weaves the target name
  // in — these tests pin that contract structurally; the Phrasing! pool
  // variant is pinned by seed in the dedicated describe block below.
  it('renders the target name in any flavor variant when the viewer is not the target', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID // viewer is Seat3, not the target
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'direct-order', targetId: 'seat-1-uuid' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      const text = alertText(container)
      expect(text).not.toBeNull()
      expect(text).toContain('Seat2') // actor named
      expect(text).toContain('Seat1') // target named
    } finally {
      teardown(container, root)
    }
  })

  it('uses "you" as the target name when the viewer is the target', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID // viewer IS the target
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'direct-order', targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      const text = alertText(container)
      expect(text).not.toBeNull()
      expect(text).toContain('Seat2')
      // Target resolves to "you" — every pool variant references the target,
      // so "you" must appear regardless of which variant is picked.
      expect(text).toMatch(/\byou\b/)
      expect(text).not.toContain('Seat3') // no leak of the target's literal name
    } finally {
      teardown(container, root)
    }
  })

  it('does not surface a target string when card-played carries no targetId (e.g. reassign)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      const text = alertText(container)
      expect(text).not.toBeNull()
      expect(text).toContain('Seat2') // actor named
      expect(text).not.toContain('targeting') // no target callout in any reassign variant
      expect(text).not.toContain('Seat1')
      expect(text).not.toContain('Seat3')
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — Call in a Favor persists until favor-given (re-attendance use case)', () => {
  it('persists past the 2.8s auto-fade boundary while target is deciding', () => {
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)

      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      const initial = alertText(container)
      expect(initial).not.toBeNull()
      expect(initial).toContain('Seat2')

      // Bystander grabs a beer. 45 seconds pass. Intermediate non-alert
      // events fire (nope-window-opened, nope-window-resolved,
      // favor-requested) — none should clear the toast. Toast must still
      // be there for the returning bystander, with the same flavor variant
      // (pool selection is stable on eventId).
      act(() => { vi.advanceTimersByTime(45_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-opened', targetAction: 'card-played', deadlineMs: 10_000 }, receivedAt: 10_000, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 10_300, id: 'evt-3' },
        { event: { type: 'favor-requested', requesterId: SEAT2_ID, targetId: 'seat-1-uuid' }, receivedAt: 10_300, id: 'evt-4' },
      ])
      rerender(root)
      expect(alertText(container)).toBe(initial)
    } finally {
      teardown(container, root)
    }
  })

  it('clears when favor-given fires (target submitted a card)', () => {
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)

      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).not.toBeNull()
      expect(alertText(container)).toContain('Seat2')

      act(() => { vi.advanceTimersByTime(60_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'favor-given', giverId: 'seat-1-uuid', receiverId: SEAT2_ID }, receivedAt: 60_000, id: 'evt-2' },
      ])
      rerender(root)
      // Toast cleared. The visible favor-given moment is owned by FavorReport.
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('renders an X dismiss button on every persistent observer toast', () => {
    // Per the §2.2 fix (2026-05-08), ALL non-favor observer card-played
    // toasts are persistent (until nope-window-resolved) — Reassign is
    // representative. The X dismiss control therefore renders on every
    // observer toast, not just the favor case. Card-drawn (self-only,
    // non-persistent info toast) is the only remaining non-persistent
    // path; covered separately by `auto-fades a card-drawn self-toast`.
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)

      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      // Reassign observer toast is persistent → X dismiss control rendered.
      expect(container.querySelector('button[aria-label="Dismiss alert"]')).not.toBeNull()

      // Favor toast is also persistent (until favor-given, not just
      // nope-window-resolved) — same X control.
      act(() => { vi.advanceTimersByTime(5_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 5_000, id: 'evt-2' },
      ])
      rerender(root)
      expect(container.querySelector('button[aria-label="Dismiss alert"]')).not.toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('X button click clears the toast immediately', () => {
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)

      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).not.toBeNull()
      expect(alertText(container)).toContain('Seat2')

      const dismissBtn = container.querySelector('button[aria-label="Dismiss alert"]') as HTMLButtonElement | null
      expect(dismissBtn).not.toBeNull()
      act(() => { dismissBtn!.click() })
      act(() => { vi.runAllTimers() })
      act(() => { vi.advanceTimersByTime(2_000) })
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — observer card-played Phrasing! pool variants (spec §3.5)', () => {
  // Pins each per-card pool's Phrasing! variant for the deterministic seed
  // `evt-1`. The pick() hash function (src/client/shared/pick.ts:13) maps
  // seed `evt-1` to index 3 of a 4-pool — every pool below places its
  // Phrasing! variant there. If a pool is reordered, expanded, or shrunk,
  // the corresponding test below will fail and remind us to (a) re-pick the
  // seed or (b) update the spec §3.5 "Shipped beats" entry.
  //
  // Cadence per spec §3.5: abundance, ~25% saturation per pool. One Phrasing!
  // beat seeded among three straight variants, deterministic on eventId so
  // every observer's phone lands on the same beat for the same fire.

  it('Direct Order Phrasing! variant lands when the viewer is not the target', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'direct-order', targetId: 'seat-1-uuid' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 got Seat1 to do it for them. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })

  it('Direct Order Phrasing! variant resolves "you" when the viewer is the target', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'direct-order', targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 got you to do it for them. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })

  it('Reassign Phrasing! variant lands for the matching seed', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 made someone else take it. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })

  it('Call in a Favor Phrasing! variant lands for the matching seed', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 needs someone to come through. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })

  it('Back Channel Phrasing! variant lands for the matching seed', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'back-channel' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 slipped in through the back. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })

  it('Intel Briefing Phrasing! variant lands for the matching seed', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'intel-briefing' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe("Seat2 is checking what's coming. ...Phrasing.")
    } finally {
      teardown(container, root)
    }
  })

  it('Go Dark Phrasing! variant lands for the matching seed', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'go-dark' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 turned off the lights. ...Phrasing.')
    } finally {
      teardown(container, root)
    }
  })
})

describe('PlayerAlert — combo target/observer perspective (pair/triple-steal target info gap, 2026-05-10)', () => {
  // Engine now emits `targetId` on combo card-played events (engine.ts:621
  // for pairs, engine.ts:911 for triples). PlayerAlert branches the toast
  // by viewer perspective:
  //   - TARGET: urgent toast naming the steal threat
  //   - OBSERVER: info toast naming who's being targeted
  //   - ACTOR: filtered out (own-play branch at top of card-played case)
  // Pre-fix the toast was just "Dash played a Vera Khan pair" with no
  // target info — Briggsy caught it on real-device 2026-05-10.

  it('TARGET: pair combo card-played emits urgent "going for a random card from you"', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID // viewer IS the target
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'vera-khan', comboSize: 2, targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 is going for a random card from you.')
      expect(container.querySelector('[data-tone="urgent"]')).not.toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('OBSERVER: pair combo card-played emits info "<Name> played a <Operative> pair — targeting <Target>."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = 'seat-1-uuid' // viewer is uninvolved bystander
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'vera-khan', comboSize: 2, targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 played a Vera Khan pair — targeting Seat3.')
      expect(container.querySelector('[data-tone="info"]')).not.toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('TARGET: triple combo card-played emits urgent "named a card to steal from you"', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT3_ID
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'neal-proctor', comboSize: 3, targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 named a card to steal from you.')
      expect(container.querySelector('[data-tone="urgent"]')).not.toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('OBSERVER: triple combo card-played emits info "<Name> played a <Operative> triple — targeting <Target>."', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = 'seat-1-uuid'
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'neal-proctor', comboSize: 3, targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 played a Neal Proctor triple — targeting Seat3.')
      expect(container.querySelector('[data-tone="info"]')).not.toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('ACTOR: own combo play stays silent (own-play filter at top of card-played case)', () => {
    const { container, root } = mount()
    try {
      myIdRef.current = SEAT2_ID // viewer is the actor
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'vera-khan', comboSize: 2, targetId: SEAT3_ID }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      // Actor sees their own staging area + animation; the toast would
      // duplicate that surface. Same filter as single-card plays.
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})
