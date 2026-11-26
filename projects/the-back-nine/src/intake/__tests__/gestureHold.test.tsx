// @vitest-environment jsdom
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GESTURE_HOLD_FALLBACK_MS, useGestureHold } from '../gestureHold'

/**
 * The h2 cure (`src/intake/gestureHold.ts`; the register's Tier 0 "On a screen taller than his laptop's,
 * a tap on "Each month" right after typing the working-year figure can miss…"). jsdom has no layout, so
 * these pin the half it can see: what the face DRAWS between a press and its click. The press's blur
 * commits (the store moves at once); the content above the tapped control stays as it was until the
 * click has been delivered, then the commit's face lands. That the control then stays under a real
 * coordinate tap is the W drawer's `verify:fit` arms' job (`e2e/rc-screens.spec.ts`, RC13b); the hook's own arms are
 * here, and the W face over it is `expensesGoalsSave.test.tsx`'s (the walk's W step arms left with the walk, Act 6 · RC14).
 *
 * The gesture is spelled out event by event, in a real browser's order: pointerdown → mousedown (which
 * blurs the focused figure — jsdom does not, so the blur is fired by hand) → pointerup → mouseup → click.
 */

vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // A spy a red test never reached its own restore for must not wrap the next test's listeners (it
  // did: under the capture-phase mutant, the phase test's left-over spy moved the listener test's red).
  vi.restoreAllMocks()
})

// ── the hook alone ────────────────────────────────────────────────────────────────────────────

function Probe({ value }: { readonly value: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const shown = useGestureHold(ref, value)
  return (
    <div>
      <div ref={ref} data-testid="face">
        <span data-testid="shown">{shown}</span>
        <button type="button">inside</button>
        <input aria-label="field" />
      </div>
      <button type="button">outside</button>
    </div>
  )
}

const shown = () => screen.getByTestId('shown').textContent
/** The click's release lands ONE TASK later (`gestureHold.ts`: a label's forwarded click must run from the
 *  render the press saw), so a test waits out one zero-delay task to see the hold let go. */
const letGo = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const inside = () => screen.getByRole('button', { name: 'inside' })
const outside = () => screen.getByRole('button', { name: 'outside' })
/** `addEventListener`'s third argument, as the capture flag it sets. */
const capture = (opts: unknown): boolean =>
  opts === true || (typeof opts === 'object' && opts !== null && (opts as AddEventListenerOptions).capture === true)

describe('useGestureHold — what a face showed at a press stands until that press’s click', () => {
  it('without a press it is the live value, every render', () => {
    const { rerender } = render(<Probe value="a" />)
    expect(shown()).toBe('a')
    rerender(<Probe value="b" />)
    expect(shown()).toBe('b')
  })

  it('a press inside holds the value the screen showed; the click releases it to the live one — one task later', async () => {
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    rerender(<Probe value="b" />) // the press's own blur committed
    expect(shown()).toBe('a')
    fireEvent.pointerUp(inside())
    expect(shown(), 'a release alone never lets go — on touch the blur has not even happened yet').toBe('a')
    fireEvent.click(inside())
    expect(shown(), 'still held in the click’s own task (a label’s forwarded click runs here)').toBe('a')
    await letGo()
    expect(shown()).toBe('b')
  })

  it('a press ANYWHERE while focus is inside the face holds it — that press is what blurs the face', async () => {
    const { rerender } = render(<Probe value="a" />)
    act(() => screen.getByRole('textbox', { name: 'field' }).focus())
    fireEvent.pointerDown(outside())
    rerender(<Probe value="b" />) // the blur's commit, under a press on a control below the face
    expect(shown()).toBe('a')
    fireEvent.pointerUp(outside())
    fireEvent.click(outside())
    await letGo()
    expect(shown()).toBe('b')
  })

  it('a right- or middle-button press holds nothing (no click follows it), and a context menu lets go', () => {
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside(), { button: 2 })
    rerender(<Probe value="b" />)
    expect(shown()).toBe('b')
    fireEvent.pointerDown(inside(), { button: 1 })
    rerender(<Probe value="c" />)
    expect(shown()).toBe('c')
    fireEvent.pointerDown(inside())
    rerender(<Probe value="d" />)
    expect(shown()).toBe('c')
    fireEvent.contextMenu(inside()) // a long press's menu: no click will come
    expect(shown()).toBe('d')
  })

  it('the click releases in the BUBBLE phase, on window — never capture, which would detach a held control before React dispatched its click', () => {
    // jsdom's synchronous dispatch runs no microtask between listeners, so the held door's click below
    // runs under either phase here; the phase itself is pinned structurally. The real-browser gate is the
    // two Keep-door arms of `e2e/vertical-fit.spec.ts`.
    const add = vi.spyOn(window, 'addEventListener')
    render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    const clicks = add.mock.calls.filter(([type]) => type === 'click')
    expect(clicks.length, 'the press listens for its click').toBe(1)
    expect(capture(clicks[0]![2]), 'the click listener is a capture listener').toBe(false)
    add.mockRestore()
  })

  it('a held control’s own click runs while the face still draws it', async () => {
    const seen: string[] = []
    function Seer({ value }: { readonly value: string }) {
      const ref = useRef<HTMLDivElement | null>(null)
      const v = useGestureHold(ref, value)
      return (
        <div ref={ref}>
          {v === 'held' && (
            <button type="button" onClick={() => seen.push(v)}>
              door
            </button>
          )}
        </div>
      )
    }
    const { rerender } = render(<Seer value="held" />)
    const door = screen.getByRole('button', { name: 'door' })
    fireEvent.pointerDown(door)
    rerender(<Seer value="live" />) // live no longer draws the door
    expect(screen.getByRole('button', { name: 'door' })).toBe(door)
    fireEvent.pointerUp(door)
    fireEvent.click(door)
    expect(seen, 'the held door’s own click ran').toEqual(['held'])
    await letGo()
    expect(screen.queryByRole('button', { name: 'door' })).toBeNull()
  })

  it('a held LABEL-WRAPPED radio acts from the face the press saw: its forwarded click runs before the hold lets go, one task after the click (build 2; insight 149)', async () => {
    // jsdom cannot show the real-browser race. A scripted dispatch runs no microtask between listeners, and
    // fireEvent's act() holds React's render until the event returns, so here the forwarded click runs from
    // the held render whatever the release does. What this arm can pin is the release's timing: still held
    // once the click's dispatch (the forwarded click included) has returned, let go one task later. Only a
    // coordinate tap in a real browser can gate the race itself; that arm belongs in `e2e/vertical-fit.spec.ts`.
    const stored: string[] = []
    function Radio({ value }: { readonly value: string }) {
      const ref = useRef<HTMLDivElement | null>(null)
      const v = useGestureHold(ref, value)
      return (
        <div ref={ref}>
          <label>
            <input type="radio" name="r" onChange={() => stored.push(v)} onClick={() => stored.push(v)} />
            pick
          </label>
          <span data-testid="shown">{v}</span>
        </div>
      )
    }
    const { rerender } = render(<Radio value="16,985" />)
    const lbl = screen.getByText('pick').closest('label')!
    fireEvent.pointerDown(lbl)
    rerender(<Radio value="19,240" />) // a blur under the press moved the figure
    fireEvent.pointerUp(lbl)
    fireEvent.click(lbl) // the label forwards its click to the radio, in this same task
    expect(stored.length, 'the radio’s handlers ran').toBeGreaterThan(0)
    expect(new Set(stored), 'every write saw the figure on screen at the press').toEqual(new Set(['16,985']))
    expect(shown(), 'still held once the click’s dispatch has returned: the release waits one task').toBe('16,985')
    await letGo()
    expect(shown()).toBe('19,240')
  })

  it('TWO ELEMENTS, ONE HOLD (build 2’s KTD8): a press inside the second element holds, and so does a press anywhere while focus is inside it', async () => {
    function Pair({ value }: { readonly value: string }) {
      const a = useRef<HTMLDivElement | null>(null)
      const b = useRef<HTMLDivElement | null>(null)
      const v = useGestureHold(a, value, b)
      return (
        <div>
          <div ref={a}>
            <span data-testid="shown">{v}</span>
          </div>
          <div ref={b}>
            <button type="button">second</button>
            <input aria-label="second field" />
          </div>
          <button type="button">outside</button>
        </div>
      )
    }
    const { rerender } = render(<Pair value="a" />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'second' }))
    rerender(<Pair value="b" />)
    expect(shown(), 'a press in the second element holds the first').toBe('a')
    fireEvent.click(screen.getByRole('button', { name: 'second' }))
    await letGo()
    expect(shown()).toBe('b')
    act(() => screen.getByRole('textbox', { name: 'second field' }).focus())
    fireEvent.pointerDown(outside())
    rerender(<Pair value="c" />)
    expect(shown(), 'focus in the second element: the press that blurs it holds').toBe('b')
    fireEvent.click(outside())
    await letGo()
    expect(shown()).toBe('c')
  })

  it('a re-render with the SAME two refs never lets go mid-hold (the effect re-runs only when a ref changes)', () => {
    function Pair({ value, tick }: { readonly value: string; readonly tick: number }) {
      const a = useRef<HTMLDivElement | null>(null)
      const b = useRef<HTMLDivElement | null>(null)
      const v = useGestureHold(a, value, b)
      return (
        <div data-tick={tick}>
          <div ref={a}>
            <button type="button">first</button>
          </div>
          <div ref={b} />
          <span data-testid="shown">{v}</span>
        </div>
      )
    }
    const { rerender } = render(<Pair value="a" tick={0} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'first' }))
    rerender(<Pair value="b" tick={1} />)
    rerender(<Pair value="c" tick={2} />)
    expect(shown()).toBe('a')
  })

  it('a release with no click lets go after the fallback, never before', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    rerender(<Probe value="b" />)
    fireEvent.pointerUp(inside())
    act(() => {
      vi.advanceTimersByTime(GESTURE_HOLD_FALLBACK_MS - 1)
    })
    expect(shown()).toBe('a')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(shown()).toBe('b')
  })

  it('a long press is held however long it lasts: the fallback starts at the release', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    rerender(<Probe value="b" />)
    act(() => {
      vi.advanceTimersByTime(GESTURE_HOLD_FALLBACK_MS * 4)
    })
    expect(shown()).toBe('a')
    fireEvent.pointerUp(inside())
    fireEvent.click(inside())
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(shown()).toBe('b')
  })

  it('a cancelled press (the browser took the touch for a scroll) and a window losing focus let go at once', () => {
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    rerender(<Probe value="b" />)
    fireEvent.pointerCancel(inside())
    expect(shown()).toBe('b')
    fireEvent.pointerDown(inside())
    rerender(<Probe value="c" />)
    expect(shown()).toBe('b')
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(shown()).toBe('c')
  })

  it('a press outside the face, with focus outside it too, holds nothing', () => {
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(outside())
    rerender(<Probe value="b" />)
    expect(shown()).toBe('b')
  })

  it('a second press during a hold keeps the first press’s value — still what is on screen', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    rerender(<Probe value="b" />)
    fireEvent.pointerUp(inside()) // a drag: no click
    fireEvent.pointerDown(inside()) // pressed again before the fallback
    rerender(<Probe value="c" />)
    act(() => {
      vi.advanceTimersByTime(GESTURE_HOLD_FALLBACK_MS * 2)
    })
    expect(shown(), 'the second press disarmed the fallback').toBe('a')
    fireEvent.pointerUp(inside())
    fireEvent.click(inside())
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(shown()).toBe('c')
  })

  it('unmounting mid-hold leaves nothing listening — each listener removed with its own capture flag', () => {
    const targets = [window, document] as const
    const spies = targets.map((t) => ({ add: vi.spyOn(t, 'addEventListener'), remove: vi.spyOn(t, 'removeEventListener') }))
    const { unmount } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    const added = spies.flatMap((s) => s.add.mock.calls.map(([type, fn, opts]) => ({ s, type, fn, cap: capture(opts) })))
    expect(added.length, 'the hook listens for the press, then for its end').toBeGreaterThan(1)
    unmount()
    for (const a of added) {
      expect(
        a.s.remove.mock.calls.some(([t, f, o]) => t === a.type && f === a.fn && capture(o) === a.cap),
        `${String(a.type)} (capture ${a.cap}) is still listened`,
      ).toBe(true)
    }
    for (const s of spies) {
      s.add.mockRestore()
      s.remove.mockRestore()
    }
  })

  it('a hold whose effect is torn down (an unmount, a re-run) is let go, never left frozen', () => {
    function Swap({ value, flip }: { readonly value: string; readonly flip: boolean }) {
      const a = useRef<HTMLDivElement | null>(null)
      const b = useRef<HTMLDivElement | null>(null)
      const v = useGestureHold(flip ? b : a, value) // a new ref object re-runs the effect
      return (
        <div>
          <div ref={a}>
            <button type="button">a</button>
          </div>
          <div ref={b} />
          <span data-testid="shown">{v}</span>
        </div>
      )
    }
    const { rerender } = render(<Swap value="x" flip={false} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'a' }))
    rerender(<Swap value="y" flip={false} />)
    expect(shown()).toBe('x')
    rerender(<Swap value="y" flip />)
    expect(shown()).toBe('y')
  })
})
