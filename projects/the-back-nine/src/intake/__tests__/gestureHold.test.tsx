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

  it('a press inside holds the value the screen showed; the click releases it to the live one', () => {
    const { rerender } = render(<Probe value="a" />)
    fireEvent.pointerDown(inside())
    rerender(<Probe value="b" />) // the press's own blur committed
    expect(shown()).toBe('a')
    fireEvent.pointerUp(inside())
    expect(shown(), 'a release alone never lets go — on touch the blur has not even happened yet').toBe('a')
    fireEvent.click(inside())
    expect(shown()).toBe('b')
  })

  it('a press ANYWHERE while focus is inside the face holds it — that press is what blurs the face', () => {
    const { rerender } = render(<Probe value="a" />)
    act(() => screen.getByRole('textbox', { name: 'field' }).focus())
    fireEvent.pointerDown(outside())
    rerender(<Probe value="b" />) // the blur's commit, under a press on a control below the face
    expect(shown()).toBe('a')
    fireEvent.pointerUp(outside())
    fireEvent.click(outside())
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

  it('a held control’s own click runs while the face still draws it', () => {
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
    expect(screen.queryByRole('button', { name: 'door' })).toBeNull()
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
 *  to PA — stale on the reading alone (an entered W never stales on the quote). The lens's repro draft. */
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

/** The SECOND half: the release and the click it delivers. */
function release(target: Element) {
  fireEvent.pointerUp(target)
  fireEvent.mouseUp(target)
  fireEvent.click(target)
}

describe('the walk: a tap on "Each month" right after typing — the note above it stands until the click', () => {
  it('the blur commits at once, the note the press saw stays drawn word for word, and the click moves the unit', () => {
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
    release(month)
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

  it('a tap on "Keep $84,000 a year" right after typing keeps $84,000 — the figure the door names — and focus lands on the answer', () => {
    const m = modelWith(staleEnteredYearly)
    render(<Walk model={m} />)
    const keep = screen.getByRole('button', { name: KEEP })
    const input = typeThenPress(document.body, '7000', keep)
    expect(w(m)).toMatchObject({ amountReal: 7_000, entryPeriod: 'year' }) // the blur's commit
    expect(screen.getByRole('button', { name: KEEP }), 'the door the press landed on is still there').toBe(keep)
    release(keep)
    // Kept as it stood, re-stamped under the CURRENT reading (PA): fresh, so the note goes.
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    expect(screen.queryByRole('note')).toBeNull()
    expect(input).toHaveValue('84,000')
    expect(document.activeElement, 'focus never falls to the page').toBe(
      document.querySelector('input[type="radio"]:checked'),
    )
  })

  it('clearing the figure and then tapping Keep keeps $84,000 a year and never asks its unit back', () => {
    const m = modelWith(staleEnteredYearly)
    render(<Walk model={m} />)
    const keep = screen.getByRole('button', { name: KEEP })
    typeThenPress(document.body, '', keep)
    expect(w(m), 'the walk clears W on a cleared figure').toBeUndefined()
    release(keep)
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

  it('stale → fresh: the picture does not mount under the press; the click lands it, and the unit moved', () => {
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
    release(month)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'month', stateTaxReading: 'class-based' })
    expect(row().querySelector('.wy-ledger')).not.toBeNull()
    expect(valueLine()).toBe(slots.assumptionWorkingCostEntered('84,000'))
    expect(within(row()).queryByRole('note')).toBeNull()
  })

  it('fresh: a retyped figure does not re-size the picture under the press; the click lands the new one', () => {
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
    release(month)
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 60_000, entryPeriod: 'month' })
    expect(row().querySelector('.wy-ledger')!.innerHTML).not.toBe(picture0)
  })

  it('a tap on the Keep door right after typing keeps $84,000 here too', () => {
    const m = modelWith(staleEnteredYearly)
    render(<WiredPanel model={m} />)
    const keep = within(row()).getByRole('button', { name: KEEP })
    typeThenPress(row(), '7000', keep)
    expect(w(m)).toMatchObject({ amountReal: 7_000 })
    release(keep)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'class-based' })
    expect(valueLine()).toBe(slots.assumptionWorkingCostEntered('84,000'))
    expect(document.activeElement).toBe(row().querySelector('input[type="radio"]:checked'))
  })

  /** `datecoststale` as seeded: a YES to $84,000, spending since lowered to $78,000 — stale on the quote,
   *  its door shown ($84,000 is not below today's quote). */
  const seed = DEV_SEEDS.datecoststale
  const seedW = seed.workingYearCost
  if (seedW?.kind !== 'confirmed') throw new Error('datecoststale holds a confirmed W')

  it('a held YES: "a different figure", a figure typed, then the door — keeps the $84,000 it was quoted, yearly', () => {
    const m = modelWith(seed)
    render(<WiredPanel model={m} />)
    fireEvent.click(within(row()).getByRole('radio', { name: copy.workingCostDifferent })) // the panel keeps W
    const keep = within(row()).getByRole('button', { name: KEEP })
    typeThenPress(row(), '5000', keep) // under the untapped month: $60,000 a year commits at the blur
    expect(w(m)).toMatchObject({ kind: 'entered', amountReal: 60_000, entryPeriod: 'month' })
    release(keep)
    expect(w(m)).toEqual({ kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: seedW.stateTaxReading })
    expect(valueLine()).toBe(slots.assumptionWorkingCostEntered('84,000'))
  })

  it('a commit from ANOTHER row under the same press re-gates the door at once: spending raised past $84,000, the keep is withheld', () => {
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
    release(keep)
    expect(w(m), 'the yes stands, stale, as it was').toEqual(seedW)
    expect(within(row()).getByRole('note')).toHaveTextContent(slots.workingCostStaleLeansBetter('84,000'))
  })
})
