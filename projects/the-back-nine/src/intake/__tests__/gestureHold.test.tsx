// @vitest-environment jsdom
import { useMemo, useRef, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { intakeSteps } from '../questions'
import { IntakeFlow } from '../flow'
import { AssumptionPanel } from '../AssumptionPanel'
import { GESTURE_HOLD_FALLBACK_MS, useGestureHold } from '../gestureHold'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { copy, slots } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { planClockAnchor } from '@ui/bandAnnotations'

/**
 * The h2 cure (`src/intake/gestureHold.ts`; the register's Tier 0 "On a screen taller than his laptop's,
 * a tap on "Each month" right after typing the working-year figure can miss…"). jsdom has no layout, so
 * these pin the half it can see: what the face DRAWS between a press and its click. The press's blur
 * commits (the store moves at once); the content above the tapped control stays as it was until the
 * click has been delivered, then the commit's face lands. That the control then stays under a real
 * coordinate tap is the four `verify:fit` arms' job (`e2e/vertical-fit.spec.ts`).
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

// ── the W face, walk and panel ───────────────────────────────────────────────────────────────

const nullClient: EngineClient = {
  runningInWorker: true,
  reset: () => {},
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSpendSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestSpendEpoch: async () => {},
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function modelWith(draft: ScenarioDraft): MemoryModel {
  const m = createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
  m.update(() => draft)
  return m
}

const TAIL = new Set(['other-income', 'working-cost', 'working-ledger'])
function Walk({ model }: { readonly model: MemoryModel }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(() => {
    const all = intakeSteps(snap.draft).filter((s) => TAIL.has(s.id))
    return all.slice(all.findIndex((s) => s.id === 'working-cost'))
  }, [snap.draft])
  return <IntakeFlow steps={steps} model={model} />
}

function WiredPanel({ model }: { readonly model: MemoryModel }) {
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot)
  return (
    <AssumptionPanel
      open
      snapshot={snapshot}
      missing={[]}
      savedAnchor={planClockAnchor(2026, 2026)}
      onCommitEdit={(mutate) => model.update(mutate)}
      onOpenBudget={() => {}}
      onOpenSequencing={() => {}}
      onOpenRoth={() => {}}
      onOpenHealth={() => {}}
      onReview={() => {}}
      onClose={() => {}}
    />
  )
}

const w = (m: MemoryModel) => m.getSnapshot().draft.workingYearCost
const label = (root: HTMLElement, key: 'periodMonth' | 'periodYear') =>
  within(root).getByRole('radio', { name: copy[key] }).closest('label')!

/** `date`'s household, W entered at $84,000 a YEAR under FL (no income tax), the state answer since moved
 *  to PA — stale on the reading alone (a typed W never stales on the quote). The lens's repro draft. */
const { workingYearCost: _none, ...dateNoW } = DEV_SEEDS.date
const staleEnteredYearly: ScenarioDraft = {
  ...dateNoW,
  retirementState: 'PA',
  workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'none' },
}
const STALE_NOTE = slots.workingCostStaleStateEntered('84,000')
const KEEP = slots.workingCostKeepYearly('84,000')

/** Type `digits` into the figure, then the FIRST half of a tap on `target`: the press, and the focus move
 *  its mousedown makes — onto a focusable target (the Keep door), else off the figure — whose blur is the
 *  figure's commit. Real focus moves, so `document.activeElement` reads as a browser's would. */
function typeThenPress(scope: HTMLElement, digits: string, target: HTMLElement) {
  const input = within(scope).getByLabelText(copy.workingCostAmountLabel)
  act(() => input.focus())
  fireEvent.change(input, { target: { value: digits } })
  fireEvent.pointerDown(target)
  fireEvent.mouseDown(target)
  act(() => (target instanceof HTMLButtonElement ? target.focus() : input.blur()))
  return input
}

/** The SECOND half: the release, the click it delivers, and the one task after it in which the hold lets go. */
async function release(target: Element) {
  fireEvent.pointerUp(target)
  fireEvent.mouseUp(target)
  fireEvent.click(target)
  await letGo()
}

describe('the walk: a tap on "Each month" right after typing — the note above it stands until the click', () => {
  it('the blur commits at once, the note the press saw stays drawn word for word, and the click moves the unit', async () => {
    const m = modelWith(staleEnteredYearly)
    render(<Walk model={m} />)
    const month = label(document.body, 'periodMonth')
    typeThenPress(document.body, '7000', month)
    // The commit landed in the store: the figure is fresh, $7,000 a year …
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 7_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    // … but nothing above the control moved: the note is still there, saying what it said at the press.
    expect(screen.getByRole('note')).toHaveTextContent(STALE_NOTE)
    expect(screen.getByRole('button', { name: KEEP })).toBeInTheDocument()
    // Only the note is held: the field below it already shows the committed figure.
    expect(screen.getByLabelText(copy.workingCostAmountLabel)).toHaveValue('7,000')
    await release(month)
    expect(screen.queryByRole('note')).toBeNull()
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
    expect(screen.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
  })

  it('a keyboard leave holds nothing: the note goes the moment the figure commits', () => {
    const m = modelWith(staleEnteredYearly)
    render(<Walk model={m} />)
    const input = screen.getByLabelText(copy.workingCostAmountLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '7000' } })
    fireEvent.blur(input)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('a tap on "Keep $84,000 a year" right after typing keeps $84,000 — the figure the door names — and focus lands on the answer', async () => {
    const m = modelWith(staleEnteredYearly)
    render(<Walk model={m} />)
    const keep = screen.getByRole('button', { name: KEEP })
    const input = typeThenPress(document.body, '7000', keep)
    expect(w(m)).toMatchObject({ amountReal: 7_000, entryPeriod: 'year' }) // the blur's commit
    expect(screen.getByRole('button', { name: KEEP }), 'the door the press landed on is still there').toBe(keep)
    await release(keep)
    // Kept as it stood, re-stamped under the CURRENT reading (PA): fresh, so the note goes.
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    expect(screen.queryByRole('note')).toBeNull()
    expect(input).toHaveValue('84,000')
    expect(document.activeElement, 'focus never falls to the page').toBe(
      document.querySelector('input[type="radio"]:checked'),
    )
  })

  it('clearing the figure and then tapping Keep keeps $84,000 a year and never asks its unit back', async () => {
    const m = modelWith(staleEnteredYearly)
    render(<Walk model={m} />)
    const keep = screen.getByRole('button', { name: KEEP })
    typeThenPress(document.body, '', keep)
    expect(w(m), 'the walk clears W on a cleared figure').toBeUndefined()
    await release(keep)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    expect(screen.getByRole('radio', { name: copy.periodYear })).toBeChecked()
    expect(screen.queryByText(copy.periodConfirmPrompt), 'the door named its unit: no period question').toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(copy.qWorkingLedgerHeading)
  })
})

describe('the panel: the row’s value line and money picture above the question stand until the click', () => {
  const row = () => document.querySelector<HTMLElement>('[data-assumption-seat="working-year-cost"]')!
  const valueLine = () => row().querySelector('.ap-row__value')!.textContent

  it('stale → fresh: the picture does not mount under the press; the click lands it, and the unit moved', async () => {
    const m = modelWith(staleEnteredYearly)
    render(<WiredPanel model={m} />)
    const staleLine = valueLine()
    expect(staleLine).toBe(slots.assumptionWorkingCostStale('84,000'))
    expect(row().querySelector('.wy-ledger')).toBeNull()
    const month = label(row(), 'periodMonth')
    typeThenPress(row(), '7000', month)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 7_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    expect(row().querySelector('.wy-ledger'), 'no picture mounts above the control mid-tap').toBeNull()
    expect(valueLine()).toBe(staleLine)
    expect(within(row()).getByRole('note')).toHaveTextContent(STALE_NOTE)
    expect(within(row()).getByLabelText(copy.workingCostAmountLabel), 'the question reads the live draft').toHaveValue('7,000')
    await release(month)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
    expect(row().querySelector('.wy-ledger')).not.toBeNull()
    expect(valueLine()).toBe(slots.assumptionWorkingCostEntered('84,000'))
    expect(within(row()).queryByRole('note')).toBeNull()
  })

  it('fresh: a retyped figure does not re-size the picture under the press; the click lands the new one', async () => {
    const dateshortW = DEV_SEEDS.dateshort.workingYearCost
    if (dateshortW === undefined) throw new Error('dateshort carries a W')
    const fresh: ScenarioDraft = {
      ...DEV_SEEDS.dateshort,
      workingYearCost: { kind: 'entered', amountReal: 70_000, entryPeriod: 'year', stateTaxReading: dateshortW.stateTaxReading },
    }
    const m = modelWith(fresh)
    render(<WiredPanel model={m} />)
    const picture0 = row().querySelector('.wy-ledger')!.innerHTML
    const month = label(row(), 'periodMonth')
    typeThenPress(row(), '5000', month) // meant: $5,000 a month
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 5_000, entryPeriod: 'year' })
    expect(row().querySelector('.wy-ledger')!.innerHTML, 'the picture above the control is the press’s').toBe(picture0)
    expect(within(row()).getByLabelText(copy.workingCostAmountLabel)).toHaveValue('5,000')
    await release(month)
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 60_000, entryPeriod: 'month' })
    expect(row().querySelector('.wy-ledger')!.innerHTML).not.toBe(picture0)
  })

  it('a tap on the Keep door right after typing keeps $84,000 here too', async () => {
    const m = modelWith(staleEnteredYearly)
    render(<WiredPanel model={m} />)
    const keep = within(row()).getByRole('button', { name: KEEP })
    typeThenPress(row(), '7000', keep)
    expect(w(m)).toMatchObject({ amountReal: 7_000 })
    await release(keep)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    expect(valueLine()).toBe(slots.assumptionWorkingCostEntered('84,000'))
    expect(document.activeElement).toBe(row().querySelector('input[type="radio"]:checked'))
  })

  /** `datecoststale` as seeded: a YES to $84,000, spending since lowered to $78,000 — stale on the quote,
   *  its door shown ($84,000 is not below today's quote). */
  const seed = DEV_SEEDS.datecoststale
  const seedW = seed.workingYearCost
  if (seedW?.kind !== 'confirmed') throw new Error('datecoststale holds a confirmed W')

  it('a held YES: "a different figure", a figure typed, then the door — keeps the $84,000 it was quoted, yearly', async () => {
    const m = modelWith(seed)
    render(<WiredPanel model={m} />)
    fireEvent.click(within(row()).getByRole('radio', { name: copy.workingCostDifferent })) // the panel keeps W
    const keep = within(row()).getByRole('button', { name: KEEP })
    typeThenPress(row(), '5000', keep) // under the untapped month: $60,000 a year commits at the blur
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 60_000, entryPeriod: 'month' })
    await release(keep)
    // Kept, so stamped with the $78,000 quote the note showed (build 2's KTD10), and the row says so.
    expect(w(m)).toEqual({
      kind: 'entered',
      amountReal: 84_000,
      entryPeriod: 'year',
      stateTaxReading: seedW.stateTaxReading,
      keptOverQuoteReal: 78_000,
    })
    expect(valueLine()).toBe(slots.assumptionWorkingCostKept('84,000'))
  })

  it('a commit from ANOTHER row under the same press re-gates the door at once: spending raised past $84,000, the keep is withheld', async () => {
    const m = modelWith(seed)
    render(<WiredPanel model={m} />)
    const keep = within(row()).getByRole('button', { name: KEEP })
    const spend = screen.getByLabelText(copy.spendLabel)
    act(() => spend.focus())
    fireEvent.change(spend, { target: { value: seed.spendEntryPeriod === 'month' ? '7917' : '95000' } })
    // The tap on the door blurs the spending field: $95,000 lands, and today's quote now sits ABOVE the
    // held yes — ruling 34 withholds the door, and a held door must not slip past it.
    fireEvent.pointerDown(keep)
    fireEvent.mouseDown(keep)
    act(() => keep.focus())
    expect(m.getSnapshot().draft.annualSpendingReal).toBeGreaterThan(84_000)
    expect(within(row()).queryByRole('button', { name: KEEP }), 'the door is withheld the moment the quote moves').toBeNull()
    await release(keep)
    expect(w(m), 'the yes stands, stale, as it was').toEqual(seedW)
    expect(within(row()).getByRole('note')).toHaveTextContent(slots.workingCostStaleLeansBetter('84,000'))
  })
})

describe('the panel’s left-over seat, under one hold with the W row (build 2’s KTD8): a press while W’s figure has focus leaves the seat as drawn until the click, and "All of it" stores the figure the seat showed', () => {
  const costRow = () => document.querySelector<HTMLElement>('[data-assumption-seat="working-year-cost"]')!
  const seat = () => document.querySelector<HTMLElement>('[data-assumption-seat="working-year-left-over"]')!
  const answer = (m: MemoryModel) => m.getSnapshot().draft.workingYearLeftOver
  /** The seat's year-0 figure line for a formatted amount (a described-by line above its radios). */
  const figureLine = (amount: string) => within(seat()).queryByText(slots.workingLedgerLeftOverFigure(amount))

  /** `date` with its $84,000 W ENTERED a year, so W's figure input shows at once, stamped with `date`'s own
   *  reading: fresh, so the seat asks (R5). Year 0's Left over, hand-derived (the build-2 record's
   *  `year0check.mts`, quoted in `workingYearCredit.test.ts`): pay 150,000 − payroll tax 11,475 − the tax on
   *  the outside income 17,540 − deposits 20,000 − W 84,000 = $16,985. W reaches year 0 only as its own line:
   *  `simulate.ts`'s check terms carry it apart from the income the tax reads (the pay and the ongoing
   *  income, never W), and `taxOverlay.ts`'s `workingYearCashLines` subtracts it once. So W $85,000 prints
   *  exactly $1,000 less: $15,985. */
  const dateW = DEV_SEEDS.date.workingYearCost
  if (dateW === undefined) throw new Error('date carries a W')
  const enteredYearly: ScenarioDraft = {
    ...DEV_SEEDS.date,
    workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: dateW.stateTaxReading },
  }

  it('a W retyped from $84,000 to $85,000, then "All of it" pressed (the press blurs W): stores the $16,985 the seat showed, never the $15,985 under the new W, and the hold lets go one task after the click', async () => {
    // This arm cannot show the real-browser race insight 149 measured: there, the label's own click reaches
    // the window listener and its microtask re-renders BEFORE the label forwards a second click to the radio.
    // jsdom keeps that listener order, but its scripted dispatch runs no microtask in between and fireEvent's
    // act() holds React's render until the event returns, so here the forwarded click stores from the held
    // render whatever the release does. It pins that the seat draws, and the write stores, the face the press
    // saw, and the release's timing. Only a coordinate tap in a real browser can gate the race itself; that
    // arm belongs in `e2e/vertical-fit.spec.ts`.
    const m = modelWith(enteredYearly)
    render(<WiredPanel model={m} />)
    expect(answer(m), 'unanswered before the press (R1)').toBeUndefined()
    expect(figureLine('16,985'), 'the seat shows $16,985 under W $84,000').toBeInTheDocument()
    const allOfIt = within(seat()).getByRole('radio', { name: copy.workingLedgerLeftOverSaved }).closest('label')!
    typeThenPress(costRow(), '85000', allOfIt)
    // The press's blur committed the new W at once …
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 85_000, entryPeriod: 'year', stateTaxReading: dateW.stateTaxReading })
    // … but both rows still draw the draft the press found (one hold over the two, KTD8).
    expect(figureLine('16,985'), 'the seat is held at the press’s figure').toBeInTheDocument()
    expect(figureLine('15,985'), 'the new W’s figure has not landed in the seat').toBeNull()
    expect(within(costRow()).getByText(slots.assumptionWorkingCostEntered('84,000')), 'the W row is held too').toBeInTheDocument()
    fireEvent.pointerUp(allOfIt)
    fireEvent.mouseUp(allOfIt)
    fireEvent.click(allOfIt) // the label forwards its click to the radio, in this same task
    expect(answer(m), 'the figure the seat showed at the press, never the $15,985 under the new W').toEqual({
      kind: 'saved',
      quotedReal: 16_985,
    })
    // The release is a zero-delay timer: in the click's own task the face is still the held one.
    expect(figureLine('16,985'), 'still held in the click’s own task').toBeInTheDocument()
    expect(figureLine('15,985')).toBeNull()
    await letGo()
    // One task later the live draft lands: the seat shows the figure under W $85,000, and the stored answer
    // reads "saved, moved" against it at once (KTD8; R6's moved line names both figures).
    expect(figureLine('16,985'), 'the held figure is gone').toBeNull()
    expect(figureLine('15,985'), 'the live figure under W $85,000').toBeInTheDocument()
    expect(within(seat()).getByText(slots.workingLedgerLeftOverFellLine('16,985', '15,985'))).toBeInTheDocument()
    expect(within(seat()).getByRole('radio', { name: copy.workingLedgerLeftOverSaved })).toBeChecked()
    expect(within(costRow()).getByText(slots.assumptionWorkingCostEntered('85,000'))).toBeInTheDocument()
    expect(answer(m), 'the release stores nothing more').toEqual({ kind: 'saved', quotedReal: 16_985 })
  })

  it('with focus still in W’s figure, a press ELSEWHERE in the panel (the spending field) holds the seat as drawn until the click lands, then shows the figure under the new W, and stores no reply (plan U7)', async () => {
    // The press lands outside both rows: only W's focus arms the hold (`gestureHold.ts`'s "anywhere while
    // focus is inside"), so this arm pins the hold's focus arm on the W row's ref. The arm above, pressed
    // inside the seat with focus in W, is held by either the seat's ref or that focus arm alone.
    const m = modelWith(enteredYearly)
    render(<WiredPanel model={m} />)
    const spend = screen.getByLabelText(copy.spendLabel)
    const figure = within(costRow()).getByLabelText(copy.workingCostAmountLabel)
    act(() => figure.focus())
    fireEvent.change(figure, { target: { value: '85000' } })
    expect(w(m), 'typing alone commits nothing: the figure commits on its blur').toMatchObject({ amountReal: 84_000 })
    fireEvent.pointerDown(spend)
    fireEvent.mouseDown(spend)
    act(() => spend.focus()) // the press moves focus to the field it landed on, and W's figure blurs
    expect(w(m), 'the blur committed the new W').toEqual({
      kind: 'entered',
      amountReal: 85_000,
      entryPeriod: 'year',
      stateTaxReading: dateW.stateTaxReading,
    })
    expect(figureLine('16,985'), 'the seat is held at the figure it showed at the press').toBeInTheDocument()
    expect(figureLine('15,985')).toBeNull()
    expect(within(seat()).getByText(slots.workingLedgerLeftOverAbsentLine('16,985')), 'the line below the group too').toBeInTheDocument()
    expect(within(costRow()).getByText(slots.assumptionWorkingCostEntered('84,000')), 'and the W row above it').toBeInTheDocument()
    fireEvent.pointerUp(spend)
    fireEvent.mouseUp(spend)
    fireEvent.click(spend)
    expect(figureLine('16,985'), 'still held in the click’s own task').toBeInTheDocument()
    await letGo()
    expect(figureLine('15,985'), 'the live figure under W $85,000').toBeInTheDocument()
    expect(figureLine('16,985')).toBeNull()
    expect(within(seat()).getByText(slots.workingLedgerLeftOverAbsentLine('15,985'))).toBeInTheDocument()
    expect(within(costRow()).getByText(slots.assumptionWorkingCostEntered('85,000'))).toBeInTheDocument()
    // A press outside the seat is no reply (R1); its positive twin is the arm above, where a press on "All of
    // it" stores one.
    expect(answer(m), 'nothing stored').toBeUndefined()
    const radios = within(seat()).getAllByRole('radio')
    expect(radios, 'the seat still asks, with its three replies').toHaveLength(3)
    for (const r of radios) expect(r, 'no reply checked').not.toBeChecked()
  })

  it('a W retyped to $101,000, then "All of it" pressed: the held seat still offers the replies, but the press’s blur closed R5’s gate (year 0 now prints below $1, "not asked"), so the click stores NOTHING and the seat goes', async () => {
    // Hand-derived as above: W comes off year 0 dollar for dollar, so W $101,000 prints $16,985 − $17,000 =
    // −$15, a short year, below R5's $1. The write re-checks the gate on the store's CURRENT draft
    // (`writeWorkingYearLeftOver`); the held face cannot carry the press past it. The gate's other half (a press
    // that stales W) is `assumptionPanel.test.tsx`'s spend-staling arm; the positive twin is the first arm here.
    const m = modelWith(enteredYearly)
    render(<WiredPanel model={m} />)
    const allOfIt = within(seat()).getByRole('radio', { name: copy.workingLedgerLeftOverSaved }).closest('label')!
    typeThenPress(costRow(), '101000', allOfIt)
    expect(w(m), 'the press’s blur committed the new W').toMatchObject({ amountReal: 101_000 })
    expect(within(seat()).getAllByRole('radio'), 'the held seat still draws its three replies').toHaveLength(3)
    expect(figureLine('16,985'), 'at the figure it showed at the press').toBeInTheDocument()
    fireEvent.pointerUp(allOfIt)
    fireEvent.mouseUp(allOfIt)
    fireEvent.click(allOfIt)
    expect(answer(m), 'the gate closed under the press: nothing stored').toBeUndefined()
    await letGo()
    expect(answer(m)).toBeUndefined()
    expect(document.querySelector('[data-assumption-seat="working-year-left-over"]'), 'not asked: the seat is gone').toBeNull()
  })
})
