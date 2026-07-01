import { describe, it, expect } from 'vitest'
import { readyToApplyUpdate, type WriteGate } from '../updateGate'

describe('readyToApplyUpdate — the deferred-skipWaiting gate (never reload mid-write)', () => {
  it('applies immediately when no write is in flight', async () => {
    const session: WriteGate = { isWriteInFlight: () => false, whenNoWriteInFlight: async () => {} }
    expect(await readyToApplyUpdate(session)).toBe(true)
  })

  it('defers on the write tail, then applies once it clears', async () => {
    let inFlight = true
    const session: WriteGate = {
      isWriteInFlight: () => inFlight,
      whenNoWriteInFlight: async () => {
        inFlight = false // the in-flight write commits → the tail resolves clear
      },
    }
    expect(await readyToApplyUpdate(session)).toBe(true)
  })

  it('REFUSES when a new write raced in during the await — the re-check is what catches it', async () => {
    // isWriteInFlight stays true: the call-time write's tail resolves, but a fresh write was
    // enqueued during the await (uncovered by that tail). Without the re-check this would
    // skipWaiting over a live write; with it, the gate must refuse.
    let awaited = false
    const session: WriteGate = {
      isWriteInFlight: () => true,
      whenNoWriteInFlight: async () => {
        awaited = true
      },
    }
    expect(await readyToApplyUpdate(session)).toBe(false)
    expect(awaited).toBe(true) // it DID defer on the tail, then re-checked and refused
  })
})
