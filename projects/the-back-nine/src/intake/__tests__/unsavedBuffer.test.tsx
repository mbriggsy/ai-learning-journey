// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import {
  bufferMoved,
  holdUnsavedBuffer,
  subscribeUnsavedBuffers,
  unsavedBuffersHeld,
  useUnsavedBufferHold,
} from '../unsavedBuffer'

/**
 * The open-entry-buffer registry — the unsaved-work guard's second operand. The counter shape is
 * updateGate's (a second holder's window must survive the first holder's release; StrictMode's
 * raise→release→raise must not credit-away a hold), the compare is the disk compare's own
 * canonicalizer, and the hook releases on every exit through effect cleanup.
 */

afterEach(cleanup)

describe('holdUnsavedBuffer — a counter with an idempotent release', () => {
  it('raise → release moves the count and notifies subscribers; a double release is a no-op', () => {
    const seen: number[] = []
    const unsubscribe = subscribeUnsavedBuffers(() => seen.push(unsavedBuffersHeld()))
    const release = holdUnsavedBuffer()
    expect(unsavedBuffersHeld()).toBe(1)
    release()
    release() // idempotent — StrictMode effect churn cannot credit-away another form's hold
    expect(unsavedBuffersHeld()).toBe(0)
    expect(seen).toEqual([1, 0])
    unsubscribe()
  })

  it('overlapping holds: the count clears only when EVERY holder releases', () => {
    const a = holdUnsavedBuffer()
    const b = holdUnsavedBuffer()
    expect(unsavedBuffersHeld()).toBe(2)
    a()
    expect(unsavedBuffersHeld()).toBe(1)
    b()
    expect(unsavedBuffersHeld()).toBe(0)
  })
})

describe('bufferMoved — the disk compare’s own canonicalizer, so only a VALUE change is typing', () => {
  it('key order and absent-vs-undefined read equal; a value or type change reads moved', () => {
    expect(bufferMoved({ a: 1, b: undefined }, { a: 1 })).toBe(false)
    expect(bufferMoved({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false)
    expect(bufferMoved({ a: 1 }, { a: 2 })).toBe(true)
    expect(bufferMoved({ a: 1 }, { a: '1' })).toBe(true)
    expect(bufferMoved([{ x: 1 }], [{ x: 1 }])).toBe(false)
    expect(bufferMoved([], [{ x: 1 }])).toBe(true)
  })
})

describe('useUnsavedBufferHold — holds while active, releases on flip and on unmount', () => {
  function Probe({ active }: { active: boolean }) {
    useUnsavedBufferHold(active)
    return null
  }

  it('tracks `active` and never leaks past unmount', () => {
    const { rerender, unmount } = render(<Probe active />)
    expect(unsavedBuffersHeld()).toBe(1)
    rerender(<Probe active={false} />)
    expect(unsavedBuffersHeld()).toBe(0)
    rerender(<Probe active />)
    expect(unsavedBuffersHeld()).toBe(1)
    unmount()
    expect(unsavedBuffersHeld()).toBe(0)
  })
})
