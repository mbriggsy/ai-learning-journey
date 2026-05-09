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
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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
    // The H4-nested scenario (SCN-TEST-H4-NESTED-01) lives under an
    // `### Test Card` H3 card section — proves the parser accepts both
    // depths AND skips the card-section H3 (no SCN- prefix).
    expect(scenarios.length).toBe(6)
    expect(scenarios.map((s) => s.id)).toEqual([
      'SCN-TEST-STRICT-01',
      'SCN-TEST-CONTAINS-01',
      'SCN-TEST-NEGATIVE-01',
      'SCN-TEST-TIER2-01',
      'SCN-TEST-TIER3-01',
      'SCN-TEST-H4-NESTED-01',
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
    // Floor at 80 — production catalog has ~90 scenarios across H3 + H4
    // depths. A regression that silently drops one depth (the bug fixed
    // 2026-05-05) would collapse this back into the 30s and trip here.
    expect(scenarios.length).toBeGreaterThanOrEqual(80)
    // Every parsed scenario has an id of the SCN-* form.
    for (const s of scenarios) {
      expect(s.id).toMatch(/^SCN-/)
      expect(['strict', 'contains', 'negative']).toContain(s.shape)
    }
  })
})

// --- parseCatalog — info-gap extraction (Unit 10 prereq) ------------------

describe('parseCatalog — info-gap extraction', () => {
  it('extracts per-vantage presence for non-N/A cells; flags N/A as absent', () => {
    const markdown = `### SCN-IG-BASIC-01 — Info-gap smoke

**Category:** Test

**Fire signature:**
\`\`\`yaml
events:
  - type: burned-drawn
    where: { playerId: $ACTOR }
shape: strict
\`\`\`

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state. | Same. |
| ACTOR | Own hand + pendingPrompt. | Cinematic reveal. |
| TARGET | N/A (no target in a draw). | N/A. |
| OTHER (alive) | Public event stream. | Narrative legibility. |
| SPECTATOR | Same as OTHER. | Archer narration preserved. |
| DISCONNECTED | Nothing in real time. | "While you were away" banner. |
| BOARD | Public events + pendingPrompt. | Board narrates the beat. |

**Known product call:** none
`

    const scenarios = parseCatalog(markdown)
    expect(scenarios).toHaveLength(1)
    const ig = scenarios[0]!.infoGap
    // Presence companion (insight 027): info-gap was actually parsed.
    expect(ig).toBeDefined()
    expect(ig!.SERVER).toEqual({
      column1Present: true,
      column2Present: true,
      column1Prose: 'Full state.',
      column2Prose: 'Same.',
    })
    expect(ig!.ACTOR).toEqual({
      column1Present: true,
      column2Present: true,
      column1Prose: 'Own hand + pendingPrompt.',
      column2Prose: 'Cinematic reveal.',
    })
    // N/A on both columns → both absent AND no prose stored.
    expect(ig!.TARGET).toEqual({ column1Present: false, column2Present: false })
    expect(ig!.OTHER_ALIVE).toEqual({
      column1Present: true,
      column2Present: true,
      column1Prose: 'Public event stream.',
      column2Prose: 'Narrative legibility.',
    })
    expect(ig!.SPECTATOR).toEqual({
      column1Present: true,
      column2Present: true,
      column1Prose: 'Same as OTHER.',
      column2Prose: 'Archer narration preserved.',
    })
    expect(ig!.DISCONNECTED).toEqual({
      column1Present: true,
      column2Present: true,
      column1Prose: 'Nothing in real time.',
      column2Prose: '"While you were away" banner.',
    })
    expect(ig!.BOARD).toEqual({
      column1Present: true,
      column2Present: true,
      column1Prose: 'Public events + pendingPrompt.',
      column2Prose: 'Board narrates the beat.',
    })
  })

  it('handles parenthetical qualifiers on vantage labels (ACTOR (STEALER), TARGET1/TARGET2)', () => {
    const markdown = `### SCN-IG-QUAL-01 — Qualified vantages

**Fire signature:**
\`\`\`yaml
events: []
shape: negative
\`\`\`

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | x | x |
| ACTOR (STEALER) | own hand | same |
| TARGET1 | hand minus stolen | same |
| TARGET2 | N/A (only one target in this variant). | N/A. |
| OTHER (alive, non-principal) | seat view | legibility |
| SPECTATOR | stripped | archer |
| DISCONNECTED | nothing | banner |
| BOARD | public | drama |

**Known product call:** none
`
    const scenarios = parseCatalog(markdown)
    const ig = scenarios[0]!.infoGap!
    // ACTOR row with (STEALER) qualifier maps to ACTOR.
    expect(ig.ACTOR.column1Present).toBe(true)
    // TARGET1 populated + TARGET2 N/A → TARGET OR-combines to present.
    expect(ig.TARGET.column1Present).toBe(true)
    expect(ig.OTHER_ALIVE.column1Present).toBe(true)
  })

  it('handles combined `OTHER / SPECTATOR` row — credits both vantages', () => {
    const markdown = `### SCN-IG-COMBO-01 — Combined row

**Fire signature:**
\`\`\`yaml
events: []
shape: negative
\`\`\`

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | x | x |
| ACTOR | x | x |
| TARGET | x | x |
| OTHER / SPECTATOR | shared seat view | shared narrative |
| DISCONNECTED | n/a | n/a |
| BOARD | public | drama |

**Known product call:** none
`
    const scenarios = parseCatalog(markdown)
    const ig = scenarios[0]!.infoGap!
    expect(ig.OTHER_ALIVE.column1Present).toBe(true)
    expect(ig.SPECTATOR.column1Present).toBe(true)
    // Lowercase `n/a` also recognized as absent.
    expect(ig.DISCONNECTED.column1Present).toBe(false)
    expect(ig.DISCONNECTED.column2Present).toBe(false)
  })

  it('recognizes N/A with trailing prose as absent (e.g. "N/A (no target).")', () => {
    const markdown = `### SCN-IG-NA-01 — N/A variants

**Fire signature:**
\`\`\`yaml
events: []
shape: negative
\`\`\`

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | x | x |
| ACTOR | x | x |
| TARGET | N/A (no target on a draw). | N/A. |
| OTHER (alive) | N/A (nobody eliminated yet). | N/A. |
| SPECTATOR | x | x |
| DISCONNECTED | x | x |
| BOARD | x | x |

**Known product call:** none
`
    const scenarios = parseCatalog(markdown)
    const ig = scenarios[0]!.infoGap!
    expect(ig.TARGET.column1Present).toBe(false)
    expect(ig.TARGET.column2Present).toBe(false)
    expect(ig.OTHER_ALIVE.column1Present).toBe(false)
    expect(ig.SPECTATOR.column1Present).toBe(true)
  })

  it('returns infoGap undefined for fixture scenarios without an info-gap table', async () => {
    const { readFile } = await import('node:fs/promises')
    const markdown = await readFile(SMALL_CATALOG_PATH, 'utf8')
    const scenarios = parseCatalog(markdown)
    // Presence companion: fixture parsed scenarios.
    expect(scenarios.length).toBeGreaterThan(0)
    for (const s of scenarios) {
      expect(s.infoGap).toBeUndefined()
    }
  })

  it('production catalog populates infoGap on the overwhelming majority of scenarios', async () => {
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
    const withInfoGap = scenarios.filter((s) => s.infoGap !== undefined)
    // Presence companion (insight 027): catalog actually has info-gap tables.
    expect(withInfoGap.length).toBeGreaterThanOrEqual(30)
    // At least 80% of real scenarios carry an info-gap table.
    expect(withInfoGap.length / scenarios.length).toBeGreaterThanOrEqual(0.8)
    // SERVER row is populated on every info-gap-bearing scenario (D5: server is god-mode).
    for (const s of withInfoGap) {
      expect(s.infoGap!.SERVER.column1Present).toBe(true)
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

  // --- Triage issue #019 regressions ---

  it('placeholder substitution: $TARGET in expect resolves to bound seat ID before matching', () => {
    const markdown = `# Test
### SCN-PLACEHOLDER-EXPECT-01 — Placeholder in expect value

**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt.playerId
    expect: $TARGET
\`\`\`
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          {
            type: 'card-played',
            playerId: 'p-alice',
            cardType: 'call-in-a-favor',
            targetId: 'p-bob',
          },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            // pendingPrompt.playerId IS the actual seat ID, not a literal '$TARGET'
            pendingPrompt: { type: 'favor-response', playerId: 'p-bob' },
          },
        },
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const f = fires.find(x => x.scenarioId === 'SCN-PLACEHOLDER-EXPECT-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('pass') // would fail without substitution: '$TARGET' !== 'p-bob'
    expect(f.matched).toBe('clean')
  })

  it('placeholder substitution inside an expect object: { playerId: $TARGET } resolves nested', () => {
    const markdown = `# Test
### SCN-PLACEHOLDER-NESTED-01 — Placeholder nested in expect object

**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt
    expect: { type: 'favor-response', playerId: $TARGET }
\`\`\`
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          {
            type: 'card-played',
            playerId: 'p-alice',
            cardType: 'call-in-a-favor',
            targetId: 'p-bob',
          },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            pendingPrompt: { type: 'favor-response', playerId: 'p-bob' },
          },
        },
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const f = fires.find(x => x.scenarioId === 'SCN-PLACEHOLDER-NESTED-01')!
    expect(f.tier2).toBe('pass')
    expect(f.matched).toBe('clean')
  })

  it('prose expect: free-form English assertion is logged as info, does NOT fail tier-2', () => {
    const markdown = `# Test
### SCN-PROSE-EXPECT-01 — Prose-style expect

**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: myHand
    expect: gains exactly one card after favor-given
\`\`\`
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          {
            type: 'card-played',
            playerId: 'p-alice',
            cardType: 'call-in-a-favor',
            targetId: 'p-bob',
          },
        ],
        projections: {
          'p-alice': {
            myPlayerId: 'p-alice',
            myHand: [{ id: 'c1', type: 'dash-barlowe' }],
          },
        },
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const f = fires.find(x => x.scenarioId === 'SCN-PROSE-EXPECT-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('pass') // prose is skipped, not failed
    expect(f.matched).toBe('clean')
  })

  it('prose expect does not mask a real tier-2 failure when both kinds of assertions appear', () => {
    const markdown = `# Test
### SCN-MIXED-EXPECT-01 — Prose + machine-checkable

**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: $ACTOR
    field: myHand
    expect: gains exactly one card after favor-given
  - viewer: $TARGET
    field: pendingPrompt.playerId
    expect: $TARGET
\`\`\`
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          {
            type: 'card-played',
            playerId: 'p-alice',
            cardType: 'call-in-a-favor',
            targetId: 'p-bob',
          },
        ],
        projections: {
          'p-alice': { myPlayerId: 'p-alice', myHand: [] },
          'p-bob': {
            myPlayerId: 'p-bob',
            pendingPrompt: { type: 'favor-response', playerId: 'p-NOT-BOB' }, // wrong
          },
        },
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const f = fires.find(x => x.scenarioId === 'SCN-MIXED-EXPECT-01')!
    expect(f.tier2).toBe('fail') // the structured one fails, prose-skip doesn't shield it
    expect(f.matched).toBe('with-divergence')
  })
})

// --- matchFires — after-event snapshot anchor (close 05-08-2022-5p #015 + #002) ---

describe('matchFires — projection-assertion after-event anchor', () => {
  // Without after-event the oracle samples projections at the terminal
  // (last-matched) flat event. For scenarios where the assertion checks
  // transient state set at an INTERMEDIATE event in the fire sequence,
  // terminal sampling sees null and reports a tier-2 false-positive.
  // The after-event field anchors the snapshot to the first flat-event
  // of the named type within [firstIdx..lastIdx].

  function makeFavorEvents(): readonly GodEvent[] {
    // Mirrors the SCN-CALL-IN-FAVOR-NORMAL-01 wire shape that tripped
    // the false-positive. pendingPrompt is set at the favor-requested
    // moment, then cleared by the time favor-given lands.
    return [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            pendingPrompt: { type: 'favor-response', playerId: 'p-bob', requesterId: 'p-alice' },
          },
        },
      }),
      godEvent({
        stateVersion: 2,
        action: { type: 'favor-give', playerId: 'p-bob' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'nope-window-resolved', cancelled: false, chainDepth: 0 },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
          { type: 'favor-given', giverId: 'p-bob', receiverId: 'p-alice' },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            pendingPrompt: null, // cleared post-favor-give — the gap that tripped the false-positive
          },
        },
      }),
    ]
  }

  it('samples at terminal by default — transient field returns null and tier-2 fails', () => {
    const markdown = `
### SCN-FAVOR-DEFAULT-SAMPLE-01 — no after-event, samples at terminal
**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt.type
    expect: favor-response
\`\`\`

---
`
    const scenarios = parseCatalog(markdown)
    const fires = matchFires(scenarios, makeFavorEvents(), [])
    const f = fires.find(x => x.scenarioId === 'SCN-FAVOR-DEFAULT-SAMPLE-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('fail') // terminal projection has pendingPrompt:null
    expect(f.matched).toBe('with-divergence')
  })

  it("samples at after-event — transient field is captured and tier-2 passes", () => {
    const markdown = `
### SCN-FAVOR-AFTER-EVENT-01 — anchored to favor-requested
**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: nope-window-resolved
    where: { cancelled: false }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
  - type: favor-given
    where: { giverId: $TARGET, receiverId: $ACTOR }
shape: strict
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt.type
    expect: favor-response
    after-event: favor-requested
\`\`\`

---
`
    const scenarios = parseCatalog(markdown)
    const fires = matchFires(scenarios, makeFavorEvents(), [])
    const f = fires.find(x => x.scenarioId === 'SCN-FAVOR-AFTER-EVENT-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('pass')
    expect(f.matched).toBe('clean')
  })

  it('reports a divergence when after-event references a type not in the fire sequence', () => {
    const markdown = `
### SCN-FAVOR-BAD-AFTER-01 — anchor refers to a non-existent event
**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: $TARGET
    field: pendingPrompt.type
    expect: favor-response
    after-event: never-fires-here
\`\`\`

---
`
    const scenarios = parseCatalog(markdown)
    const events: GodEvent[] = [
      godEvent({
        stateVersion: 1,
        action: { type: 'play-card', playerId: 'p-alice' },
        events: [
          { type: 'card-played', playerId: 'p-alice', cardType: 'call-in-a-favor' },
          { type: 'favor-requested', requesterId: 'p-alice', targetId: 'p-bob' },
        ],
        projections: {
          'p-bob': {
            myPlayerId: 'p-bob',
            pendingPrompt: { type: 'favor-response', playerId: 'p-bob', requesterId: 'p-alice' },
          },
        },
      }),
    ]
    const fires = matchFires(scenarios, events, [])
    const f = fires.find(x => x.scenarioId === 'SCN-FAVOR-BAD-AFTER-01')!
    expect(f.tier1).toBe('pass')
    expect(f.tier2).toBe('fail')
    // Divergence message names the missing anchor — catalog authors get a
    // surgical pointer, not a generic field-mismatch.
    const notes = f.divergenceNotes ?? []
    expect(notes.some(d => d.includes('after-event "never-fires-here"'))).toBe(true)
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

// -----------------------------------------------------------------------------
// Phase-4 Unit 2a — prose-field extraction
// -----------------------------------------------------------------------------

describe('parseCatalog — phase-4 Unit 2a prose fields', () => {
  const FULL_SCENARIO = `### SCN-U2A-01 — Full prose scenario

**Category:** Test

**Trigger conditions:**
- ACTOR dispatches Direct Order.
- TARGET has at least one card.

**Fire signature:**
\`\`\`yaml
events:
  - type: direct-order-played
    where: { playerId: $ACTOR }
shape: strict
\`\`\`

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | Full state after reassignment. | Same. |
| ACTOR | Own hand updated. | Confirmation banner. |
| TARGET1 | Reassigned next turn. | "You're up" banner. |
| TARGET2 | N/A (single target). | N/A. |
| OTHER (alive) | Public event. | Public narration. |
| SPECTATOR | Same as OTHER. | Archer narration. |
| DISCONNECTED | Nothing. | Banner on reconnect. |
| BOARD | Public events. | Two-beat drama. |

**Vibe check:**
Did the reassignment feel like an executive order hit — immediate and
unignorable?

**Why this matters:**
Direct Order is the canonical command-and-control beat. Losing its
punch breaks the Archer §8.7 acceptance test.

**Agent recognition criteria:**
You know you hit this scenario when:
- ACTOR played Direct Order.
- TARGET's next-up indicator lit without an intermediate turn.

**Suspicion prompts:**
- ACTOR: "Did the confirmation banner land instantly?"
- TARGET: "Did you see a 'you're up' beat?"
- SPECTATOR: "Did the reassignment read from your seat?"

**Known product call:** none
`

  it('extracts title, triggerConditions, recognitionCriteria, suspicionPrompts, vibeCheck, whyThisMatters', () => {
    const scenarios = parseCatalog(FULL_SCENARIO)
    expect(scenarios).toHaveLength(1)
    const s = scenarios[0]!
    expect(s.title).toBe('Full prose scenario')
    expect(s.description).toBe('Full prose scenario')

    expect(s.triggerConditions).toBeDefined()
    expect(s.triggerConditions).toContain('ACTOR dispatches Direct Order.')
    expect(s.triggerConditions).toContain('TARGET has at least one card.')

    expect(s.recognitionCriteria).toBeDefined()
    expect(s.recognitionCriteria).toContain('ACTOR played Direct Order.')

    expect(s.suspicionPrompts).toBeDefined()
    expect(s.suspicionPrompts).toContain('ACTOR:')
    expect(s.suspicionPrompts).toContain('TARGET:')
    expect(s.suspicionPrompts).toContain('SPECTATOR:')

    expect(s.vibeCheck).toBeDefined()
    expect(s.vibeCheck).toMatch(/executive order hit/)

    expect(s.whyThisMatters).toBeDefined()
    expect(s.whyThisMatters).toMatch(/canonical command-and-control/)
  })

  it('populates column1Prose / column2Prose alongside presence booleans', () => {
    const scenarios = parseCatalog(FULL_SCENARIO)
    const ig = scenarios[0]!.infoGap!
    expect(ig.SERVER.column1Prose).toBe('Full state after reassignment.')
    expect(ig.SERVER.column2Prose).toBe('Same.')
    expect(ig.BOARD.column1Prose).toBe('Public events.')
    expect(ig.BOARD.column2Prose).toBe('Two-beat drama.')
  })

  it('stores no prose for N/A rows', () => {
    const scenarios = parseCatalog(FULL_SCENARIO)
    const ig = scenarios[0]!.infoGap!
    // TARGET1 present + TARGET2 N/A → TARGET role OR-combines to present,
    // prose comes from the TARGET1 row (the only non-N/A contributor).
    expect(ig.TARGET.column1Present).toBe(true)
    expect(ig.TARGET.column1Prose).toBe('Reassigned next turn.')
    expect(ig.TARGET.column2Prose).toBe('"You\'re up" banner.')
  })

  it('concatenates prose with \\n\\n when multiple rows credit the same role', () => {
    const markdown = `### SCN-U2A-MULTI-01 — Double-credit row

**Fire signature:**
\`\`\`yaml
events: []
shape: negative
\`\`\`

**Info gap at decision point:**

| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |
|---|---|---|
| SERVER | x | x |
| ACTOR | same | same |
| TARGET1 | first target prose | first target prescriptive |
| TARGET2 | second target prose | second target prescriptive |
| OTHER (alive) | same | same |
| SPECTATOR | same | same |
| DISCONNECTED | same | same |
| BOARD | same | same |

**Known product call:** none
`
    const scenarios = parseCatalog(markdown)
    const target = scenarios[0]!.infoGap!.TARGET
    expect(target.column1Present).toBe(true)
    expect(target.column1Prose).toBe(
      'first target prose\n\nsecond target prose',
    )
    expect(target.column2Prose).toBe(
      'first target prescriptive\n\nsecond target prescriptive',
    )
  })

  it('omits prose fields when the section is absent', () => {
    const markdown = `### SCN-U2A-MINIMAL-01 — No prose sections

**Fire signature:**
\`\`\`yaml
events: []
shape: negative
\`\`\`

**Known product call:** none
`
    const scenarios = parseCatalog(markdown)
    const s = scenarios[0]!
    expect(s.triggerConditions).toBeUndefined()
    expect(s.vibeCheck).toBeUndefined()
    expect(s.recognitionCriteria).toBeUndefined()
    expect(s.suspicionPrompts).toBeUndefined()
    expect(s.whyThisMatters).toBeUndefined()
    // Title still populated from the header line.
    expect(s.title).toBe('No prose sections')
  })

  it('treats `Known product call: none` as no tag (knownProductCall undefined)', () => {
    // Regression for TODO #5/#6 (2026-05-01). Mini-catalog calibration
    // scenarios ship with `none` because the calibration fixture is not
    // the canonical home of any E2E cluster issue. The clusterer must
    // therefore see knownProductCall: undefined and emit no
    // candidateDuplicate for those seeds.
    const markdown = `### SCN-NONE-01 — Catalog says none

**Fire signature:**
\`\`\`yaml
events: []
shape: negative
\`\`\`

**Known product call:** none
`
    const scenarios = parseCatalog(markdown)
    expect(scenarios).toHaveLength(1)
    expect(scenarios[0]!.knownProductCall).toBeUndefined()
  })

  it('round-trips the production catalog without throwing and preserves infoGap booleans', () => {
    // The real catalog has ~90 scenarios across H3 + H4 depths. This
    // guard catches regressions where an extension breaks a scenario
    // that was previously parsing.
    const rawCatalog = readFileSync(
      path.resolve(__dirname, '../../../docs/testing/playtest/SCENARIOS.md'),
      'utf8',
    )
    const scenarios = parseCatalog(rawCatalog)
    // Floor at 80. Pre-2026-05-05 the parser silently dropped 55 H4
    // scenarios; that regression collapsed the count from 90 to 35,
    // which a 30-floor would not have caught. Floor sits below current
    // (90) by enough margin to allow legitimate scenario churn while
    // still tripping on a depth-level regression.
    expect(scenarios.length).toBeGreaterThanOrEqual(80)
    // Every scenario has a title.
    for (const s of scenarios) {
      expect(s.title).toBeTruthy()
    }
    // Per phase-1 D1: every catalog scenario except intentional fixtures
    // carries a vibe-check. At least two-thirds of the real catalog
    // should round-trip it (conservative floor — phase-1 Unit 5 Part G
    // free-play class and some fixture scenarios may omit).
    const withVibeCheck = scenarios.filter((s) => s.vibeCheck).length
    expect(withVibeCheck).toBeGreaterThan(scenarios.length * 0.6)
  })
})

// Dummy reference to silence "unused type import" lint when not branched on.
export const __typeGuard: FireRecord | null = null
export const __typeGuard2: GodEventForMatch | null = null
