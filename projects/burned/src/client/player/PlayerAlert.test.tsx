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
  const node = container.querySelector('[data-tone]')
  return node?.textContent ?? null
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

describe('PlayerAlert — card-played toast lifecycle (triage #003 reproduction)', () => {
  it('clears the favor card-played toast within the 2.8s timer even if subsequent non-alert events fire', () => {
    const { container, root } = mount()
    try {
      // Seed: pre-existing event log so the first render anchors lastSeenIdRef
      // to the tail. Without a seed, the component skips its first batch
      // (the "events accumulated before mount" guard) and we'd never see
      // the alert fire.
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)
      expect(alertText(container)).toBeNull()

      // T=0: Seat2 plays Call in a Favor targeting Seat1. Observer (Seat3)
      // should see the card-played toast.
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')

      // T=10s: nope-window-expired fires (server timer). No new card-played
      // event. Should NOT keep the toast alive.
      act(() => { vi.advanceTimersByTime(10_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-opened', targetAction: 'card-played', deadlineMs: 10_000 }, receivedAt: 10_000, id: 'evt-2' },
      ])
      rerender(root)
      // 10s >> 2.8s — toast must be cleared.
      expect(alertText(container)).toBeNull()

      // T=10.3s: nope-window-resolved + favor-requested. No new card-played.
      // Toast stays cleared.
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-opened', targetAction: 'card-played', deadlineMs: 10_000 }, receivedAt: 10_000, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 10_300, id: 'evt-3' },
        { event: { type: 'favor-requested', requesterId: SEAT2_ID, targetId: 'seat-1-uuid' }, receivedAt: 10_300, id: 'evt-4' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()

      // T=60s: favor-given. Observer DOES NOT receive cardType (server strips
      // for non-party players). PlayerAlert deliberately stays silent on
      // favor-given (FavorReport owns this beat). Toast stays cleared.
      act(() => { vi.advanceTimersByTime(50_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-opened', targetAction: 'card-played', deadlineMs: 10_000 }, receivedAt: 10_000, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 10_300, id: 'evt-3' },
        { event: { type: 'favor-requested', requesterId: SEAT2_ID, targetId: 'seat-1-uuid' }, receivedAt: 10_300, id: 'evt-4' },
        { event: { type: 'favor-given', giverId: 'seat-1-uuid', receiverId: SEAT2_ID }, receivedAt: 60_000, id: 'evt-5' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('clears the toast at the 2.8s boundary (auto-dismiss timer fires)', () => {
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
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')

      // Just before the 2.8s threshold.
      act(() => { vi.advanceTimersByTime(2_700) })
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')

      // Past the threshold — `setAlert(null)` runs, AnimatePresence begins
      // exit. The DOM node may still exist briefly during exit; querying for
      // the active alert via [data-tone] still resolves the element until
      // the exit animation completes. Run the remaining timers + animation
      // ticks to settle.
      act(() => { vi.advanceTimersByTime(1_000) })
      act(() => { vi.runAllTimers() })
      // After all timers drain, the alert React state is null. AnimatePresence
      // either fully unmounted or is mid-exit. Either way the visible text
      // path goes through `alert?.text`, so once `alert` is null React no
      // longer commits new content into the node — but the existing DOM may
      // still hold the prior text. The truthful assertion: `alert` state
      // cleared, which is what the bug claim contradicts.
      // We can't easily probe React state from outside, but we CAN observe
      // that after running ALL timers + advancing far past any plausible
      // exit duration, querySelector returns null because AnimatePresence
      // removed the node.
      act(() => { vi.advanceTimersByTime(2_000) })
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })
})
