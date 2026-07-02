import { describe, it, expect } from 'vitest'
import { holdUpdateApply, readyToApplyUpdate, type WriteGate } from '../updateGate'

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

describe('holdUpdateApply — the Fork B save-ceremony hold (commit→export is a no-reload window)', () => {
  const idle: WriteGate = { isWriteInFlight: () => false, whenNoWriteInFlight: async () => {} }

  it('REFUSES while a hold is open even with NO write in flight (the window the write gate cannot see), then applies on release', async () => {
    const release = holdUpdateApply()
    expect(await readyToApplyUpdate(idle)).toBe(false)
    release()
    expect(await readyToApplyUpdate(idle)).toBe(true)
  })

  it('overlapping holds: the gate stays closed until EVERY holder releases', async () => {
    const a = holdUpdateApply()
    const b = holdUpdateApply()
    a()
    expect(await readyToApplyUpdate(idle)).toBe(false)
    b()
    expect(await readyToApplyUpdate(idle)).toBe(true)
  })

  it('release is IDEMPOTENT — a double release (StrictMode effect churn) cannot credit-away a later holder', async () => {
    const a = holdUpdateApply()
    a()
    a() // second release must be a no-op, never an underflow
    const b = holdUpdateApply()
    expect(await readyToApplyUpdate(idle)).toBe(false) // b's hold survives a's double release
    b()
    expect(await readyToApplyUpdate(idle)).toBe(true)
  })

  it('a hold RAISED DURING the write-tail await is caught by the same decision-instant re-check', async () => {
    // The securing step raises the hold while the toast is already awaiting the write tail —
    // the gate's final read must see it (insight 036: decide on current truth, not entry truth).
    let release: (() => void) | null = null
    const session: WriteGate = {
      isWriteInFlight: () => release === null, // in flight until the tail resolves
      whenNoWriteInFlight: async () => {
        release = holdUpdateApply() // the ceremony began while we waited
      },
    }
    expect(await readyToApplyUpdate(session)).toBe(false)
    release!()
    expect(await readyToApplyUpdate(idle)).toBe(true)
  })
})
