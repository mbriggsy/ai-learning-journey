/**
 * Unit 4b tests — events.jsonl privacy scrubber.
 *
 * Scenarios (from phase-3-harness-infra.md Unit 4b):
 *   1. Happy path: myHand ids get 12 hex chars; type becomes '<redacted>'.
 *   2. boardView is byte-identical after scrub.
 *   3. events[] are byte-identical after scrub (server already stripped).
 *   4. Determinism under same salt.
 *   5. Mode 'off' returns structurally equal output.
 *   6. Fail-closed on malformed input; error message never contains salt.
 *   7. Salt rotation produces different hashes for same id.
 *   8. Extra myHand fields preserved verbatim.
 *   9. Multiple viewers scrubbed independently.
 *  10. Purity lint: scrubber.ts imports node:crypto only (no fs/process/
 *      Date.now/Math.random/new Date).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scrub } from './scrubber'
import type { GodEvent } from './types'

const HEX_12 = /^[0-9a-f]{12}$/

// ---------------------------------------------------------------------------
// Purity lint — runs FIRST; if scrubber.ts ever gains an I/O dep, fail here
// before any other test bothers running.
// ---------------------------------------------------------------------------
describe('scrubber — purity lint (source string-scan)', () => {
  const scrubberSource = readFileSync(
    join(process.cwd(), 'scripts/playtest/lib/scrubber.ts'),
    'utf-8',
  )

  it("imports 'node:crypto' exactly once", () => {
    expect(scrubberSource).toMatch(/from ['"]node:crypto['"]/)
  })

  it('does not import fs, process, or any I/O module', () => {
    const forbidden = [
      "from 'fs'",
      'from "fs"',
      "from 'node:fs'",
      'from "node:fs"',
      "from 'process'",
      'from "process"',
      "from 'node:process'",
      'from "node:process"',
    ]
    for (const needle of forbidden) {
      expect(scrubberSource).not.toContain(needle)
    }
  })

  it('does not use Date / Math.random / timestamps', () => {
    expect(scrubberSource).not.toContain('Date.now')
    expect(scrubberSource).not.toContain('Math.random')
    expect(scrubberSource).not.toContain('new Date(')
  })
})

// ---------------------------------------------------------------------------
// Fixture helpers — produce fresh GodEvents so determinism tests don't share
// mutable state with scrub-mutation tests.
// ---------------------------------------------------------------------------
function makeEvent(): GodEvent {
  return {
    type: 'god-event',
    action: { type: 'play-card', playerId: 'p1' },
    events: [
      { type: 'card-played', cardType: 'attack', playerId: 'p1' },
      { type: 'combo-steal', cardType: null, stealerId: 'p1', targetId: 'p2' },
    ],
    stateVersion: 42,
    nowMs: 1_700_000_000_000,
    projections: {
      p1: {
        myPlayerId: 'p1',
        myHand: [
          { id: 'card-a', type: 'attack' },
          { id: 'card-b', type: 'burned' },
        ],
        turnIndex: 0,
      },
      p2: {
        myPlayerId: 'p2',
        myHand: [{ id: 'card-c', type: 'skip' }],
        turnIndex: 1,
      },
    },
    boardView: {
      phase: 'playing',
      stateVersion: 42,
      players: [
        { playerId: 'p1', cardCount: 2 },
        { playerId: 'p2', cardCount: 1 },
      ],
    },
    expectedViewerIds: ['p1', 'p2'],
  }
}

const TEST_SALT = 'deadbeef'.repeat(8) // 64 hex chars

// ---------------------------------------------------------------------------
// Happy path + structural guarantees.
// ---------------------------------------------------------------------------
describe('scrub — mode on: happy path', () => {
  it('replaces myHand[*].id with 12 hex chars', () => {
    const event = makeEvent()
    const out = scrub(event, 'on', TEST_SALT)
    const hand = out.projections.p1!.myHand
    expect(hand[0]!.id).toMatch(HEX_12)
    expect(hand[1]!.id).toMatch(HEX_12)
  })

  it("replaces myHand[*].type with literal '<redacted>'", () => {
    const out = scrub(makeEvent(), 'on', TEST_SALT)
    expect(out.projections.p1!.myHand[0]!.type).toBe('<redacted>')
    expect(out.projections.p1!.myHand[1]!.type).toBe('<redacted>')
  })

  it('preserves hand length and order', () => {
    const event = makeEvent()
    const originalIds = event.projections.p1!.myHand.map((h) => h.id)
    const out = scrub(event, 'on', TEST_SALT)
    expect(out.projections.p1!.myHand).toHaveLength(2)
    // Order preserved: hashing 'card-a' first and 'card-b' second should
    // differ (with overwhelming probability).
    expect(out.projections.p1!.myHand[0]!.id).not.toBe(out.projections.p1!.myHand[1]!.id)
    // And the INPUT object's ids must be untouched (no mutation).
    expect(event.projections.p1!.myHand.map((h) => h.id)).toEqual(originalIds)
  })

  it('leaves boardView byte-identical after scrub', () => {
    const event = makeEvent()
    const before = JSON.stringify(event.boardView)
    const out = scrub(event, 'on', TEST_SALT)
    expect(JSON.stringify(out.boardView)).toBe(before)
    // Also assert same-reference (shallow copy on outer, boardView untouched).
    expect(out.boardView).toBe(event.boardView)
  })

  it('leaves events[] byte-identical (server already stripped private fields)', () => {
    const event = makeEvent()
    const before = JSON.stringify(event.events)
    const out = scrub(event, 'on', TEST_SALT)
    expect(JSON.stringify(out.events)).toBe(before)
    expect(out.events).toBe(event.events)
  })

  it('does not mutate the input object', () => {
    const event = makeEvent()
    const snapshot = JSON.parse(JSON.stringify(event))
    scrub(event, 'on', TEST_SALT)
    expect(JSON.parse(JSON.stringify(event))).toEqual(snapshot)
  })
})

describe('scrub — determinism', () => {
  it('scrub(e, on, salt) twice yields byte-identical output', () => {
    const a = scrub(makeEvent(), 'on', TEST_SALT)
    const b = scrub(makeEvent(), 'on', TEST_SALT)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('scrub — mode off', () => {
  it('returns structurally equal input when mode is off', () => {
    const event = makeEvent()
    const out = scrub(event, 'off', TEST_SALT)
    expect(out).toEqual(event)
  })
})

// ---------------------------------------------------------------------------
// Fail-closed: malformed inputs throw; salt never echoes in any message.
// ---------------------------------------------------------------------------
describe('scrub — fail-closed on malformed input', () => {
  const SECRET_SALT = 'super-secret-salt-value-1234567890'

  it('throws when projections is null', () => {
    const bad = { ...makeEvent(), projections: null } as unknown as GodEvent
    let caught: Error | null = null
    try {
      scrub(bad, 'on', SECRET_SALT)
    } catch (e) {
      caught = e as Error
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught!.message).not.toContain(SECRET_SALT)
  })

  it('throws when myHand is not an array', () => {
    const bad = {
      ...makeEvent(),
      projections: {
        p1: { myPlayerId: 'p1', myHand: 'not-an-array' as unknown as never },
      },
    } as unknown as GodEvent
    let caught: Error | null = null
    try {
      scrub(bad, 'on', SECRET_SALT)
    } catch (e) {
      caught = e as Error
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught!.message).not.toContain(SECRET_SALT)
  })

  it('throws when a myHand entry id is a number', () => {
    const bad = {
      ...makeEvent(),
      projections: {
        p1: {
          myPlayerId: 'p1',
          myHand: [{ id: 123 as unknown as string, type: 'attack' }],
        },
      },
    } as unknown as GodEvent
    let caught: Error | null = null
    try {
      scrub(bad, 'on', SECRET_SALT)
    } catch (e) {
      caught = e as Error
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught!.message).not.toContain(SECRET_SALT)
  })
})

// ---------------------------------------------------------------------------
// Salt rotation — different salts must produce different hashes.
// ---------------------------------------------------------------------------
describe('scrub — salt rotation', () => {
  it('same id under different salts produces different hashes', () => {
    const a = scrub(makeEvent(), 'on', 'salt-a')
    const b = scrub(makeEvent(), 'on', 'salt-b')
    expect(a.projections.p1!.myHand[0]!.id).not.toBe(b.projections.p1!.myHand[0]!.id)
    expect(a.projections.p1!.myHand[0]!.id).toMatch(HEX_12)
    expect(b.projections.p1!.myHand[0]!.id).toMatch(HEX_12)
  })
})

// ---------------------------------------------------------------------------
// Extra field preservation — harness must not strip unknown myHand fields.
// ---------------------------------------------------------------------------
describe('scrub — extra myHand fields preserved', () => {
  it('preserves custom fields like position + meta', () => {
    const event: GodEvent = {
      ...makeEvent(),
      projections: {
        p1: {
          myPlayerId: 'p1',
          myHand: [
            {
              id: 'a',
              type: 'attack',
              position: 0,
              meta: { foo: 'bar' },
            } as unknown as { id: string; type: string },
          ],
        },
      },
    }
    const out = scrub(event, 'on', TEST_SALT)
    const entry = out.projections.p1!.myHand[0] as unknown as Record<string, unknown>
    expect(entry.position).toBe(0)
    expect(entry.meta).toEqual({ foo: 'bar' })
    expect(entry.id).toMatch(HEX_12)
    expect(entry.type).toBe('<redacted>')
  })
})

// ---------------------------------------------------------------------------
// Multiple viewers — both get scrubbed, ordering stable.
// ---------------------------------------------------------------------------
describe('scrub — multiple viewers', () => {
  it('scrubs every viewer independently, preserves key ordering', () => {
    const event = makeEvent()
    const out = scrub(event, 'on', TEST_SALT)
    expect(Object.keys(out.projections)).toEqual(['p1', 'p2'])
    expect(out.projections.p1!.myHand[0]!.id).toMatch(HEX_12)
    expect(out.projections.p2!.myHand[0]!.id).toMatch(HEX_12)
    expect(out.projections.p1!.myHand[0]!.type).toBe('<redacted>')
    expect(out.projections.p2!.myHand[0]!.type).toBe('<redacted>')
    // Cross-viewer hashes for different input ids must differ.
    expect(out.projections.p1!.myHand[0]!.id).not.toBe(out.projections.p2!.myHand[0]!.id)
  })
})
