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
  // Non-persistent canary: Reassign has no human-think gap (action commits
  // inside the nope window), so its observer toast follows the standard
  // 2.8s auto-fade path.
  it('clears a non-persistent card-played toast at the 2.8s auto-fade boundary', () => {
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
      expect(alertText(container)).toBe('Seat2 played Reassign.')

      act(() => { vi.advanceTimersByTime(2_700) })
      expect(alertText(container)).toBe('Seat2 played Reassign.')

      act(() => { vi.advanceTimersByTime(1_000) })
      act(() => { vi.runAllTimers() })
      act(() => { vi.advanceTimersByTime(2_000) })
      expect(alertText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('non-persistent toast clears even when intermediate non-alert events fire (no stale-toast regression)', () => {
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
      expect(alertText(container)).toBe('Seat2 played Reassign.')

      act(() => { vi.advanceTimersByTime(10_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-opened', targetAction: 'card-played', deadlineMs: 10_000 }, receivedAt: 10_000, id: 'evt-2' },
      ])
      rerender(root)
      expect(alertText(container)).toBeNull()
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
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')

      // Bystander grabs a beer. 45 seconds pass. Intermediate non-alert
      // events fire (nope-window-opened, nope-window-resolved,
      // favor-requested) — none should clear the toast. Toast must still
      // be there for the returning bystander.
      act(() => { vi.advanceTimersByTime(45_000) })
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'call-in-a-favor' }, receivedAt: 1, id: 'evt-1' },
        { event: { type: 'nope-window-opened', targetAction: 'card-played', deadlineMs: 10_000 }, receivedAt: 10_000, id: 'evt-2' },
        { event: { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 }, receivedAt: 10_300, id: 'evt-3' },
        { event: { type: 'favor-requested', requesterId: SEAT2_ID, targetId: 'seat-1-uuid' }, receivedAt: 10_300, id: 'evt-4' },
      ])
      rerender(root)
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')
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
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')

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

  it('renders an X dismiss button for persistent alerts only', () => {
    const { container, root } = mount()
    try {
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
      ])
      render(root)

      // Non-persistent alert: no X button.
      setEvents([
        { event: { type: 'turn-started', playerId: SEAT2_ID, turnsRemaining: 1 }, receivedAt: 0, id: 'evt-0' },
        { event: { type: 'card-played', playerId: SEAT2_ID, cardType: 'reassign' }, receivedAt: 1, id: 'evt-1' },
      ])
      rerender(root)
      expect(container.querySelector('button[aria-label="Dismiss alert"]')).toBeNull()

      // Persistent alert: X button rendered.
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
      expect(alertText(container)).toBe('Seat2 played Call in a Favor.')

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
