/**
 * Scenario-detector tests — catalog parser + three-tier matcher.
 *
 * Test scenarios mirror phase-3 Unit 9's Test-scenarios list (plan
 * doc `docs/plans/playtest-harness/phase-3-harness-infra.md` Unit 9).
 *
 * Insight 027: each "no-fire" / "does-not-trigger" assertion is paired with
 * a positive companion check (matcher ran over non-empty input, fixture
 * sanity assertion) so a broken fixture can't pass vacuously.
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  type FireRecord,
  type GodEventForMatch,
  detectFires,
  flattenEvents,
  matchFires,
  parseCatalog,
} from './scenario-detector'
import type { ConnectionEvent, GodEvent } from './types'

// --- Helpers ---------------------------------------------------------------

function godEvent(params: {
  readonly stateVersion: number
  readonly action: { readonly type: string; readonly playerId: string }
  readonly events: readonly { readonly type: string; readonly [k: string]: unknown }[]
  readonly nowMs?: number
  readonly projections?: Record<string, Record<string, unknown>>
}): GodEvent {
  return {
    type: 'god-event',
    action: { ...params.action },
    events: params.events,
    stateVersion: params.stateVersion,
    nowMs: params.nowMs ?? params.stateVersion * 1000,
    projections: (params.projections ?? {}) as GodEvent['projections'],
    boardView: { phase: 'playing', stateVersion: params.stateVersion },
  } as GodEvent
}

const SMALL_CATALOG_PATH = path.join(__dirname, 'fixtures', 'catalog-basic.md')

// --- parseCatalog ---------------------------------------------------------

describe('parseCatalog', () => {
  it('parses multi-scenario markdown with strict, contains, negative, tier-2, tier-3', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')

    const scenarios = parseCatalog(markdown)

    // Presence: matcher actually saw content (insight 027 companion).
    expect(scenarios.length).toBe(5)
    expect(scenarios.map((s) => s.id)).toEqual([
      'SCN-TEST-STRICT-01',
      'SCN-TEST-CONTAINS-01',
      'SCN-TEST-NEGATIVE-01',
      'SCN-TEST-TIER2-01',
      'SCN-TEST-TIER3-01',
    ])
  })

  it('derives tier from which optional blocks appear (axis-11 via projection-assertions, axis-13 via connection-events)', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')

    const scenarios = parseCatalog(markdown)
    const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]))

    expect(byId['SCN-TEST-STRICT-01']!.tier).toBe('other')
    expect(byId['SCN-TEST-CONTAINS-01']!.tier).toBe('other')
    expect(byId['SCN-TEST-NEGATIVE-01']!.tier).toBe('other')
    expect(byId['SCN-TEST-TIER2-01']!.tier).toBe('axis-11')
    expect(byId['SCN-TEST-TIER3-01']!.tier).toBe('axis-13')
  })

  it('captures shape + role-bound event patterns', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const strict = scenarios.find((s) => s.id === 'SCN-TEST-STRICT-01')!

    expect(strict.shape).toBe('strict')
    expect(strict.events).toEqual([
      { type: 'card-played', where: { playerId: '$ACTOR', cardType: 'go-dark' } },
      { type: 'turn-skipped', where: { playerId: '$ACTOR' } },
    ])
  })

  it('negative-shape scenario has empty events', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const neg = scenarios.find((s) => s.id === 'SCN-TEST-NEGATIVE-01')!
    expect(neg.shape).toBe('negative')
    expect(neg.events).toEqual([])
  })

  it('tolerates the full production catalog without throwing', async () => {
    const { readFile } = await import('node:fs/promises')
    const productionCatalog = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'docs',
      'testing',
      'playtest',
      'SCENARIOS.md',
    )
    const markdown = await readFile(productionCatalog, 'utf8')
    const scenarios = parseCatalog(markdown)
    // Presence companion: catalog actually held scenarios (insight 027).
    expect(scenarios.length).toBeGreaterThanOrEqual(30)
    // Every parsed scenario has an id of the SCN-* form.
    for (const s of scenarios) {
      expect(s.id).toMatch(/^SCN-/)
      expect(['strict', 'contains', 'negative']).toContain(s.shape)
    }
  })
})

// --- matchFires (Tier 1) ---------------------------------------------------

describe('matchFires — Tier 1 (events)', () => {
  it('strict: consecutive-match with role binding → matched=clean', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [{ type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' }],
      }),
      godEvent({
        stateVersion: 2,
        action: { type: 'resolve', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' },
          { type: 'turn-skipped', playerId: 'p-alice' },
        ],
      }),
    ]

    const fires = matchFires(scenarios, events, [])

    const strictFire = fires.find((f) => f.scenarioId === 'SCN-TEST-STRICT-01')!
    expect(strictFire).toBeDefined()
    expect(strictFire.tier1).toBe('pass')
    expect(strictFire.matched).toBe('clean')
    expect(strictFire.seatId).toBe('p-alice')
  })

  it('strict: extras between required events → no fire', () => {
    const markdown = `
### SCN-T-01 — test

**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'go-dark' }
  - type: turn-skipped
    where: { playerId: $ACTOR }
shape: strict
\`\`\`

---
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [{ type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' }],
      }),
      godEvent({
        stateVersion: 2,
        action: { type: 'interruption', playerId: 'p-bob' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' },
          { type: 'noise', playerId: 'p-bob' },
          { type: 'turn-skipped', playerId: 'p-alice' },
        ],
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    // Insight 027 companion: matcher ran over 3 flattened events.
    expect(flattenEvents(events).length).toBe(3)
    const f = fires.find((x) => x.scenarioId === 'SCN-T-01')!
    expect(f.matched).toBe('no-fire')
  })

  it('contains: subsequence with extras allowed → matched=clean', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
        ],
      }),
      godEvent({
        stateVersion: 2,
        action: { type: 'request', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
        ],
      }),
      godEvent({
        stateVersion: 3,
        action: { type: 'nonsense', playerId: 'p-carol' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
          { type: 'noise', playerId: 'p-carol' },
        ],
      }),
      godEvent({
        stateVersion: 4,
        action: { type: 'give', playerId: 'p-bob' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
          { type: 'noise', playerId: 'p-carol' },
          { type: 'favor-given', giverId: 'p-bob', requesterId: 'p-alice' },
        ],
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const containsFire = fires.find((f) => f.scenarioId === 'SCN-TEST-CONTAINS-01')!
    expect(containsFire.tier1).toBe('pass')
    expect(containsFire.matched).toBe('clean')
  })

  it('negative: defaults to no-fire without dispatch-rejection logging (v1 limitation)', async () => {
    // Plan semantics: negative-shape fires when a specific dispatch error
    // code was observed. Phase 3 does not yet log action-rejected signals
    // (dispatch errors produce no state mutation → no god-event). Without
    // the rejection stream we can't tell "bad dispatch rejected" from
    // "bad dispatch never attempted." Conservative default: no-fire.
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const fires = matchFires(scenarios, [], [])
    const negFire = fires.find((f) => f.scenarioId === 'SCN-TEST-NEGATIVE-01')!
    expect(negFire.tier1).toBe('fail')
    expect(negFire.matched).toBe('no-fire')
  })

  it('tier-1 miss: events stream lacks required shape → matched=no-fire', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'draw-card', playerId: 'p-alice' },
        events: [{ type: 'card-drawn', playerId: 'p-alice', safe: true }],
      }),
    ]
    // Insight 027 companion: matcher ran over 1 flattened event.
    expect(flattenEvents(events).length).toBe(1)
    const fires = matchFires(scenarios, events, [])
    const strictFire = fires.find((f) => f.scenarioId === 'SCN-TEST-STRICT-01')!
    expect(strictFire.matched).toBe('no-fire')
  })
})

// --- matchFires (Tier 2) ---------------------------------------------------

describe('matchFires — Tier 2 (projection-assertions)', () => {
  it('axis-11 happy path: projection field present → matched=clean', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)

    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          {
            type: 'card-played',
            playerId: 'p-alice',
            cardType: 'named-steal',
            targetId: 'p-bob',
          },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            nopeWindow: { namedSteal: { namedCardType: 'dash-barlowe' } },
          },
        },
      }),
    ]

    const fires = matchFires(scenarios, events, [])
    const f = fires.find((x) => x.scenarioId === 'SCN-TEST-TIER2-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('pass')
    expect(f.matched).toBe('clean')
  })

  it('axis-11 divergence: tier-1 fires but field absent → matched=with-divergence', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)

    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          {
            type: 'card-played',
            playerId: 'p-alice',
            cardType: 'named-steal',
            targetId: 'p-bob',
          },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            nopeWindow: null, // named-steal metadata missing → projection-layer bug
          },
        },
      }),
    ]

    const fires = matchFires(scenarios, events, [])
    const f = fires.find((x) => x.scenarioId === 'SCN-TEST-TIER2-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('fail')
    expect(f.matched).toBe('with-divergence')
    expect(f.divergenceNotes?.join(' ')).toContain('nopeWindow.namedSteal.namedCardType')
  })
})

// --- matchFires (Tier 3) ---------------------------------------------------

describe('matchFires — Tier 3 (connection-events)', () => {
  function buildFavorEvents(): readonly GodEvent[] {
    return [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [{ type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' }],
      }),
      godEvent({
        stateVersion: 2,
        action: { type: 'request', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
        ],
      }),
    ]
  }

  it('axis-13 happy path: natural disconnect + reconnect present → matched=clean', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const connections: ConnectionEvent[] = [
      { seatId: 'p-bob', transition: 'disconnect', atStateVersion: 2, atNowMs: 2500, reason: 'natural' },
      { seatId: 'p-bob', transition: 'reconnect', atStateVersion: 2, atNowMs: 5000, reason: 'natural' },
    ]
    const fires = matchFires(scenarios, buildFavorEvents(), connections)
    const f = fires.find((x) => x.scenarioId === 'SCN-TEST-TIER3-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier3).toBe('pass')
    expect(f.matched).toBe('clean')
  })

  it('axis-13 divergence: tier-1 fires but reconnect missing → matched=with-divergence', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const connections: ConnectionEvent[] = [
      { seatId: 'p-bob', transition: 'disconnect', atStateVersion: 2, atNowMs: 2500, reason: 'natural' },
      // reconnect missing
    ]
    const fires = matchFires(scenarios, buildFavorEvents(), connections)
    const f = fires.find((x) => x.scenarioId === 'SCN-TEST-TIER3-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier3).toBe('fail')
    expect(f.matched).toBe('with-divergence')
    expect(f.divergenceNotes?.join(' ')).toMatch(/reconnect/i)
  })

  it('C8: orchestrator-driven connection events are filtered out before matching', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    const connections: ConnectionEvent[] = [
      { seatId: 'p-bob', transition: 'disconnect', atStateVersion: 2, atNowMs: 2500, reason: 'orchestrator-driven' },
      { seatId: 'p-bob', transition: 'reconnect', atStateVersion: 2, atNowMs: 5000, reason: 'orchestrator-driven' },
    ]
    const fires = matchFires(scenarios, buildFavorEvents(), connections)
    const f = fires.find((x) => x.scenarioId === 'SCN-TEST-TIER3-01')!
    // tier-1 still passes on events; tier-3 fails because the orchestrator-driven
    // transitions were filtered out and no natural ones remain.
    expect(f.tier1).toBe('pass')
    expect(f.tier3).toBe('fail')
    expect(f.matched).toBe('with-divergence')
  })
})

// --- matchFires error paths ---------------------------------------------

describe('matchFires — robustness', () => {
  it('handles empty inputs without throwing', () => {
    expect(() => matchFires([], [], [])).not.toThrow()
  })

  it('two scenarios with identical tier-1 differing only in tier-2 are both evaluated', () => {
    const markdown = `
### SCN-A-01 — tier2 a
**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'named-steal', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: $PRESENT
\`\`\`

---

### SCN-B-01 — tier2 b (same tier-1, different tier-2)
**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'named-steal', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: TARGET
    field: nopeWindow.namedSteal.nonexistent
    expect: $PRESENT
\`\`\`

---
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'named-steal', targetId: 'p-bob' },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            nopeWindow: { namedSteal: { namedCardType: 'dash-barlowe' } },
          },
        },
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const a = fires.find((f) => f.scenarioId === 'SCN-A-01')!
    const b = fires.find((f) => f.scenarioId === 'SCN-B-01')!
    expect(a.matched).toBe('clean')
    expect(b.matched).toBe('with-divergence')
  })
})

// --- detectFires (integration, disk I/O) -------------------------------

describe('detectFires — integration', () => {
  it('reads catalog + events.jsonl + connections.jsonl and emits FireRecords', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'scenario-detector-'))
    const eventsPath = path.join(tmp, 'events.jsonl')
    const connsPath = path.join(tmp, 'connections.jsonl')

    const ev1 = godEvent({
      stateVersion: 1,
      action: { type: 'play-card', playerId: 'p-alice' },
      events: [{ type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' }],
    })
    const ev2 = godEvent({
      stateVersion: 2,
      action: { type: 'resolve', playerId: 'p-alice' },
      events: [
        { type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' },
        { type: 'turn-skipped', playerId: 'p-alice' },
      ],
    })
    writeFileSync(eventsPath, JSON.stringify(ev1) + '\n' + JSON.stringify(ev2) + '\n', 'utf8')
    writeFileSync(connsPath, '', 'utf8') // empty but present

    const fires = await detectFires(SMALL_CATALOG_PATH, eventsPath, connsPath, [])
    const strictFire = fires.find((f) => f.scenarioId === 'SCN-TEST-STRICT-01')!
    expect(strictFire.matched).toBe('clean')
  })

  it('tolerates missing connections.jsonl without throwing', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'scenario-detector-'))
    const eventsPath = path.join(tmp, 'events.jsonl')
    const missingConnsPath = path.join(tmp, 'does-not-exist.jsonl')

    writeFileSync(eventsPath, '', 'utf8')

    const fires = await detectFires(SMALL_CATALOG_PATH, eventsPath, missingConnsPath, [])
    expect(Array.isArray(fires)).toBe(true)
  })

  it('skips malformed jsonl lines with a warning rather than crashing', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'scenario-detector-'))
    const eventsPath = path.join(tmp, 'events.jsonl')
    const connsPath = path.join(tmp, 'connections.jsonl')

    const good = godEvent({
      stateVersion: 1,
      action: { type: 'play-card', playerId: 'p-alice' },
      events: [{ type: 'card-played', playerId: 'p-alice', cardType: 'go-dark' }],
    })

    // Line 1: garbage; Line 2: good.
    writeFileSync(
      eventsPath,
      '{not-json,,,\n' + JSON.stringify(good) + '\n',
      'utf8',
    )
    writeFileSync(connsPath, '{broken-conn-line\n', 'utf8')

    const fires = await detectFires(SMALL_CATALOG_PATH, eventsPath, connsPath, [])
    // Insight 027 companion: detector still ran and returned real FireRecords.
    expect(fires.length).toBeGreaterThan(0)
  })
})

// --- flattenEvents (exported helper — sanity checks) ------------------

describe('flattenEvents', () => {
  it('delta-flattens cumulative god-events into a single sequence', () => {
    const ev1 = godEvent({
      stateVersion: 1,
      action: { type: 'a', playerId: 'p' },
      events: [{ type: 'e1' }],
    })
    const ev2 = godEvent({
      stateVersion: 2,
      action: { type: 'b', playerId: 'p' },
      events: [{ type: 'e1' }, { type: 'e2' }],
    })
    const flat = flattenEvents([ev1, ev2])
    expect(flat.map((e) => e.event.type)).toEqual(['e1', 'e2'])
    expect(flat[0]!.godEventIdx).toBe(0)
    expect(flat[1]!.godEventIdx).toBe(1)
  })
})

// Dummy reference to silence "unused type import" lint when not branched on.
export const __typeGuard: FireRecord | null = null
export const __typeGuard2: GodEventForMatch | null = null
