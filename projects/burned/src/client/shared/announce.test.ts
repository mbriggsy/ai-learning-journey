// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { announce } from './announce'

const POLITE_ID = 'sr-polite'
const ASSERTIVE_ID = 'sr-assertive'

function makeRegion(id: string): HTMLDivElement {
  const el = document.createElement('div')
  el.id = id
  el.setAttribute('aria-live', id === ASSERTIVE_ID ? 'assertive' : 'polite')
  el.setAttribute('aria-atomic', 'true')
  document.body.appendChild(el)
  return el
}

function clearBody(): void {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild)
}

beforeEach(() => {
  vi.useFakeTimers()
  clearBody()
  makeRegion(POLITE_ID)
  makeRegion(ASSERTIVE_ID)
})

afterEach(() => {
  vi.useRealTimers()
  clearBody()
})

describe('announce — live-region staleness (triage #003 root cause)', () => {
  it('writes the message to the polite live region', () => {
    announce('Seat2 played Call in a Favor.')
    // rAF schedules the actual text write — flush.
    vi.advanceTimersByTime(20)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe(
      'Seat2 played Call in a Favor.',
    )
  })

  it('clears the live region after 5s so stale text does not remain in the a11y tree', () => {
    announce('Seat2 played Call in a Favor.')
    vi.advanceTimersByTime(20)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe(
      'Seat2 played Call in a Favor.',
    )

    // 4.9s in — still present (well under the cleanup deadline).
    vi.advanceTimersByTime(4_900)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe(
      'Seat2 played Call in a Favor.',
    )

    // Past the cleanup deadline (5s + the 20ms rAF buffer earlier).
    vi.advanceTimersByTime(200)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe('')
  })

  it('a follow-up announce() cancels the prior cleanup so the new message is not wiped early', () => {
    announce('First message.')
    vi.advanceTimersByTime(20)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe('First message.')

    // Wait nearly to the first cleanup boundary.
    vi.advanceTimersByTime(4_500)
    announce('Second message.')
    vi.advanceTimersByTime(20)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe('Second message.')

    // The first message's cleanup would have fired at T≈5_000ms total (relative
    // to its own announce). If we did NOT cancel it, the second message would
    // be wiped at T≈5_020ms. Verify the second message survives that point.
    vi.advanceTimersByTime(600)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe('Second message.')

    // The second message's own cleanup fires 5s after IT was announced.
    vi.advanceTimersByTime(5_000)
    expect(document.getElementById(POLITE_ID)!.textContent).toBe('')
  })

  it('polite and assertive cleanup timers are independent', () => {
    announce('Polite text.', 'polite')
    vi.advanceTimersByTime(20)            // T≈20:   polite text set
    announce('Assertive text.', 'assertive')
    vi.advanceTimersByTime(20)            // T≈40:   assertive text set

    expect(document.getElementById(POLITE_ID)!.textContent).toBe('Polite text.')
    expect(document.getElementById(ASSERTIVE_ID)!.textContent).toBe('Assertive text.')

    // Land between the two cleanup deadlines. Polite cleared at T≈5020;
    // assertive will clear at T≈5040.
    vi.advanceTimersByTime(4_990)         // T≈5030
    expect(document.getElementById(POLITE_ID)!.textContent).toBe('')
    expect(document.getElementById(ASSERTIVE_ID)!.textContent).toBe('Assertive text.')

    // Then assertive — past T=5040.
    vi.advanceTimersByTime(100)           // T≈5130
    expect(document.getElementById(ASSERTIVE_ID)!.textContent).toBe('')
  })

  it('is a no-op when the live-region element is missing (e.g. before mount)', () => {
    clearBody()
    expect(() => announce('No region.')).not.toThrow()
  })
})
