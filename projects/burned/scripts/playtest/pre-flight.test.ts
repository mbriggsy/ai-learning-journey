/**
 * Phase 6 Unit 1 — pre-flight gate tests.
 *
 * Every "exits non-zero on bad input" case is paired with a happy-path
 * baseline (insight 027) — otherwise the gate could pass vacuously.
 *
 * Live wrangler + live WS paths are NOT exercised here; they're exercised
 * by invoking `pnpm playtest:pre-flight` directly (Phase 6 Unit 3 calibration
 * run). Shape-assertion (`assertGodEnvelopeShape`) is unit-testable on its
 * own and runs verbatim against live envelopes too.
 */
import { describe, it, expect } from 'vitest'

import {
  KNOWN_PRODUCT_CALL_CLUSTER,
  parseAgentFrontmatter,
  assertGodEnvelopeShape,
  assertConfigAck,
  checkSelftestStamp,
  checkAgentFile,
  checkCatalog,
  checkCapabilityProbeLive,
  checkNoScrubGate,
  parseArgs,
} from './pre-flight'
import type { Config } from './lib/types'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const WELL_FORMED_AGENT = `---
name: playtest-seat
description: test fixture
model: sonnet
tools: mcp__playwright__browser_snapshot, mcp__playwright__browser_click, Write
color: orange
---

# playtest-seat

Body text.
`

/** Minimal real-shape scenario text. */
function scenarioMd(opts: {
  id: string
  vibe?: boolean
  knownCall?: string
}): string {
  const vibe = opts.vibe === false ? '' : `**Vibe check:**\nSomething cinematic?\n\n`
  const kpc =
    opts.knownCall === undefined
      ? ''
      : `**Known product call:** ${opts.knownCall}\n`
  return `### ${opts.id} — test scenario

**Category:** Test
**Axes:** 1

**Fire signature:**
\`\`\`yaml
events:
  - type: card-played
shape: contains
\`\`\`

${vibe}${kpc}**Related issues:** none

---

`
}

/** Mini-catalog that satisfies check 4 end-to-end. */
function validCatalogMd(): string {
  return (
    scenarioMd({ id: 'SCN-A', vibe: true, knownCall: 'A-01' }) +
    scenarioMd({
      id: 'SCN-B',
      vibe: true,
      knownCall: 'B-03, B-04, B-05, B-06, B-07, B-13',
    }) +
    scenarioMd({ id: 'SCN-C', vibe: true, knownCall: 'C-15' }) +
    scenarioMd({ id: 'SCN-D', vibe: true, knownCall: 'D-03, D-16' })
  )
}

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    seats: 3,
    seed: 1,
    nopeWindowMs: 300_000,
    sessionTimeoutMs: 900_000,
    catalogPath: 'scripts/playtest/fixtures/mini-catalog.md',
    outputRoot: 'docs/testing/playtest/runs',
    viewports: [{ width: 390, height: 844, label: '390x844' }],
    freePlayWallclockFraction: 0.2,
    sessionDirRetention: 10,
    scrubMode: 'on',
    godReassemblyTimeoutMs: 5000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// KNOWN_PRODUCT_CALL_CLUSTER composition — M3 lock-in
// ---------------------------------------------------------------------------

describe('KNOWN_PRODUCT_CALL_CLUSTER', () => {
  it('contains exactly the phase-6 M3 cluster', () => {
    expect([...KNOWN_PRODUCT_CALL_CLUSTER]).toEqual([
      'A-01',
      'B-03',
      'B-04',
      'B-05',
      'B-06',
      'B-07',
      'B-13',
      'C-15',
      'D-03',
      'D-16',
    ])
  })
})

// ---------------------------------------------------------------------------
// Check 1 — selftest stamp
// ---------------------------------------------------------------------------

describe('checkSelftestStamp', () => {
  it('passes when stamp is fresh ISO bare string', async () => {
    const now = () => Date.parse('2026-04-24T10:00:00Z')
    const readFile = async () => '2026-04-24T09:30:00Z'
    const r = await checkSelftestStamp({ readFile, now })
    expect(r.status).toBe('pass')
  })

  it('passes when stamp is fresh JSON payload with `at` field', async () => {
    const now = () => Date.parse('2026-04-24T10:00:00Z')
    const readFile = async () =>
      JSON.stringify({ at: '2026-04-24T09:00:00Z', liveSkipped: false })
    const r = await checkSelftestStamp({ readFile, now })
    expect(r.status).toBe('pass')
  })

  it('passes on the real two-line selftest format (ISO on line 1, JSON with `ts` on line 2)', async () => {
    const now = () => Date.parse('2026-04-24T19:00:00Z')
    const readFile = async () =>
      `2026-04-24T18:08:23.955Z\n{"ts":"2026-04-24T18:08:23.955Z"}\n`
    const r = await checkSelftestStamp({ readFile, now })
    expect(r.status).toBe('pass')
  })

  it('fails when stamp file missing', async () => {
    const readFile = async () => {
      throw new Error('ENOENT')
    }
    const r = await checkSelftestStamp({ readFile, now: Date.now })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('.last-selftest')
    expect(r.detail).toContain('playtest:selftest')
  })

  it('fails when stamp is older than 24h', async () => {
    const now = () => Date.parse('2026-04-24T10:00:00Z')
    const readFile = async () => '2026-04-22T09:00:00Z' // ~49h ago
    const r = await checkSelftestStamp({ readFile, now })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('expired')
  })

  it('fails when stamp contents are unparseable', async () => {
    const readFile = async () => 'garbage not a date'
    const r = await checkSelftestStamp({ readFile, now: Date.now })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('unreadable')
  })
})

// ---------------------------------------------------------------------------
// parseAgentFrontmatter — shared helper
// ---------------------------------------------------------------------------

describe('parseAgentFrontmatter', () => {
  it('extracts flat key/value pairs from a frontmatter fence', () => {
    const fm = parseAgentFrontmatter(WELL_FORMED_AGENT)
    expect(fm).not.toBeNull()
    expect(fm?.name).toBe('playtest-seat')
    expect(fm?.model).toBe('sonnet')
    expect(fm?.tools).toBe(
      'mcp__playwright__browser_snapshot, mcp__playwright__browser_click, Write',
    )
  })

  it('returns null when no frontmatter fence', () => {
    expect(parseAgentFrontmatter('no fence here')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Checks 2 + 3 — agent file shape
// ---------------------------------------------------------------------------

describe('checkAgentFile', () => {
  it('passes on a well-formed agent file (happy baseline — insight 027)', async () => {
    const readFile = async () => WELL_FORMED_AGENT
    const r = await checkAgentFile('.claude/agents/playtest-seat.md', '2. seat', {
      readFile,
    })
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('3 tools whitelisted')
  })

  it('fails when file is missing', async () => {
    const readFile = async () => {
      throw new Error('ENOENT')
    }
    const r = await checkAgentFile('nonexistent', '2. seat', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('subagent file missing')
    expect(r.detail).toContain('insight 020')
  })

  it('fails when frontmatter fence is absent', async () => {
    const readFile = async () => '# just a markdown body no frontmatter'
    const r = await checkAgentFile('somepath', '2. seat', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('frontmatter')
  })

  it('fails when tools: field is missing from frontmatter', async () => {
    const readFile = async () =>
      `---\nname: foo\nmodel: sonnet\n---\nbody\n`
    const r = await checkAgentFile('somepath', '2. seat', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('tools')
  })

  it('fails when tools: value is empty string', async () => {
    const readFile = async () => `---\nname: foo\ntools: \n---\nbody\n`
    const r = await checkAgentFile('somepath', '2. seat', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('empty')
  })

  it('fails when tools: is the empty-array literal []', async () => {
    const readFile = async () => `---\nname: foo\ntools: []\n---\nbody\n`
    const r = await checkAgentFile('somepath', '2. seat', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('empty array')
  })
})

// ---------------------------------------------------------------------------
// Check 4 — catalog parses + cluster tags
// ---------------------------------------------------------------------------

describe('checkCatalog', () => {
  it('passes on a catalog with full cluster coverage (happy baseline)', async () => {
    const readFile = async () => validCatalogMd()
    const r = await checkCatalog('fake.md', { readFile })
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('4 scenarios parsed')
  })

  it('fails when catalog file is unreadable', async () => {
    const readFile = async () => {
      throw new Error('ENOENT')
    }
    const r = await checkCatalog('missing.md', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('not readable')
  })

  it('fails when parseCatalog returns zero scenarios', async () => {
    const readFile = async () => '# no SCN headers here'
    const r = await checkCatalog('empty.md', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('0 scenarios')
  })

  it('fails when any scenario is missing **Vibe check:**', async () => {
    const bad =
      scenarioMd({ id: 'SCN-A', vibe: true, knownCall: 'A-01' }) +
      scenarioMd({
        id: 'SCN-B',
        vibe: false,
        knownCall: 'B-03, B-04, B-05, B-06, B-07, B-13',
      }) +
      scenarioMd({ id: 'SCN-C', vibe: true, knownCall: 'C-15' }) +
      scenarioMd({ id: 'SCN-D', vibe: true, knownCall: 'D-03, D-16' })
    const readFile = async () => bad
    const r = await checkCatalog('bad.md', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('SCN-B')
    expect(r.detail).toContain('Vibe check')
  })

  it('fails when a cluster ID has zero tagged scenarios', async () => {
    const bad =
      scenarioMd({ id: 'SCN-A', vibe: true, knownCall: 'A-01' }) +
      scenarioMd({
        id: 'SCN-B',
        vibe: true,
        knownCall: 'B-03, B-04, B-05, B-06, B-13', // B-07 missing
      }) +
      scenarioMd({ id: 'SCN-C', vibe: true, knownCall: 'C-15' }) +
      scenarioMd({ id: 'SCN-D', vibe: true, knownCall: 'D-03, D-16' })
    const readFile = async () => bad
    const r = await checkCatalog('bad.md', { readFile })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('B-07')
  })

  it('accepts a custom cluster override', async () => {
    const readFile = async () =>
      scenarioMd({ id: 'SCN-X', vibe: true, knownCall: 'X-99' })
    const r = await checkCatalog('x.md', {
      readFile,
      cluster: ['X-99'],
    })
    expect(r.status).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// Check 5 — capability probe (shape + live-wrapper injection path)
// ---------------------------------------------------------------------------

describe('assertGodEnvelopeShape', () => {
  it('passes on well-formed god-event envelope with string-array expectedViewerIds (happy baseline)', () => {
    const envelope = {
      type: 'god-event',
      action: { type: 'dispatch', playerId: 'p1' },
      events: [],
      stateVersion: 1,
      nowMs: 1,
      projections: {},
      boardView: {},
      expectedViewerIds: ['p1', 'p2'],
    }
    const r = assertGodEnvelopeShape(envelope)
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('string[2]')
  })

  it('passes with empty expectedViewerIds array', () => {
    const envelope = {
      type: 'god-event',
      expectedViewerIds: [],
    }
    const r = assertGodEnvelopeShape(envelope)
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('string[0]')
  })

  it('fails when payload is not an object', () => {
    expect(assertGodEnvelopeShape(null).status).toBe('fail')
    expect(assertGodEnvelopeShape('string').status).toBe('fail')
    expect(assertGodEnvelopeShape(42).status).toBe('fail')
  })

  it('fails when envelope.type is not god-event', () => {
    const r = assertGodEnvelopeShape({
      type: 'state-update',
      expectedViewerIds: [],
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain("'god-event'")
  })

  it('fails when expectedViewerIds is ABSENT (the canonical Phase 2 D4 violation)', () => {
    const r = assertGodEnvelopeShape({
      type: 'god-event',
      action: {},
      events: [],
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('server missing expectedViewerIds')
    expect(r.detail).toContain('Bounce back to Phase 2 Unit 6')
  })

  it('fails when expectedViewerIds is not an array', () => {
    const r = assertGodEnvelopeShape({
      type: 'god-event',
      expectedViewerIds: 'p1,p2',
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('not an array')
  })

  it('fails when expectedViewerIds contains non-string entries', () => {
    const r = assertGodEnvelopeShape({
      type: 'god-event',
      expectedViewerIds: ['p1', 42],
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('non-string')
  })
})

describe('assertConfigAck', () => {
  it('passes on a well-formed ack with ok:true (happy baseline)', () => {
    const r = assertConfigAck({
      type: 'playtest-config-ack',
      ok: true,
      seed: 1,
      nopeWindowMs: 300_000,
    })
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('handshake green')
    expect(r.detail).toContain('Unit 3')
  })

  it('fails when payload is not an object', () => {
    expect(assertConfigAck(null).status).toBe('fail')
    expect(assertConfigAck('ack').status).toBe('fail')
  })

  it('fails when type is not playtest-config-ack', () => {
    const r = assertConfigAck({ type: 'state-update', ok: true })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain("'playtest-config-ack'")
  })

  it('fails when ok is false (server rejected config)', () => {
    const r = assertConfigAck({
      type: 'playtest-config-ack',
      ok: false,
      code: 'PLAYTEST_CONFIG_LOCKED',
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('PLAYTEST_CONFIG_LOCKED')
    expect(r.detail).toContain('Bounce back to Phase 2 Unit 6')
  })

  it('fails when ok is missing', () => {
    const r = assertConfigAck({ type: 'playtest-config-ack' })
    expect(r.status).toBe('fail')
  })
})

describe('checkCapabilityProbeLive (fakeAck path — tests plumbing, not live WS)', () => {
  it('passes on injected well-formed ack', async () => {
    const r = await checkCapabilityProbeLive({
      config: makeConfig(),
      fakeAck: { type: 'playtest-config-ack', ok: true },
    })
    expect(r.status).toBe('pass')
  })

  it('fails on injected ack with ok:false', async () => {
    const r = await checkCapabilityProbeLive({
      config: makeConfig(),
      fakeAck: {
        type: 'playtest-config-ack',
        ok: false,
        code: 'PLAYTEST_CONFIG_LOCKED',
      },
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('Bounce back to Phase 2 Unit 6')
  })
})

// ---------------------------------------------------------------------------
// Check 6 — --no-scrub refusal gate
// ---------------------------------------------------------------------------

describe('checkNoScrubGate', () => {
  it('passes silently when --no-scrub is absent (happy baseline)', () => {
    const r = checkNoScrubGate({ argv: ['node', 'pre-flight.ts'], env: {} })
    expect(r.status).toBe('pass')
    expect(r.warning).toBeUndefined()
  })

  it('fails when --no-scrub present without CALIBRATION_DEBUG=1', () => {
    const r = checkNoScrubGate({
      argv: ['node', 'pre-flight.ts', '--no-scrub'],
      env: {},
    })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('--no-scrub requires CALIBRATION_DEBUG=1')
    expect(r.detail).toContain('retained-internal-only')
  })

  it('fails when --no-scrub present with CALIBRATION_DEBUG set to something other than 1', () => {
    const r = checkNoScrubGate({
      argv: ['--no-scrub'],
      env: { CALIBRATION_DEBUG: 'true' },
    })
    expect(r.status).toBe('fail')
  })

  it('passes WITH WARNING when --no-scrub + CALIBRATION_DEBUG=1', () => {
    const r = checkNoScrubGate({
      argv: ['--no-scrub'],
      env: { CALIBRATION_DEBUG: '1' },
    })
    expect(r.status).toBe('pass')
    expect(r.warning).toContain('UNSCRUBBED-RETAIN-INTERNAL-ONLY')
  })
})

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  it('defaults config path to calibration.json', () => {
    const a = parseArgs([])
    expect(a.configPath).toBe('scripts/playtest/config/calibration.json')
    expect(a.help).toBe(false)
    expect(a.skipProbe).toBe(false)
    expect(a.noScrub).toBe(false)
  })

  it('honors --config <path>', () => {
    const a = parseArgs(['--config', 'custom.json'])
    expect(a.configPath).toBe('custom.json')
  })

  it('detects --help / -h', () => {
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-h']).help).toBe(true)
  })

  it('detects --skip-probe', () => {
    expect(parseArgs(['--skip-probe']).skipProbe).toBe(true)
  })

  it('detects --no-scrub', () => {
    expect(parseArgs(['--no-scrub']).noScrub).toBe(true)
  })
})
