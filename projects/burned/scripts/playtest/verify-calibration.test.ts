/**
 * Phase 6 Unit 2 — verify-calibration tests.
 *
 * Every "exits non-zero on bad input" case is paired with a happy-path
 * baseline per insight 027 — otherwise the check could pass vacuously.
 *
 * Fixtures are built in an ephemeral tmp dir per test (no shared state).
 * Each helper composes a complete, valid run dir; tests mutate ONE file
 * to drive a single check's failure branch.
 */
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  checkCoverageMd,
  checkEventsJsonl,
  checkIsolationAudit,
  checkIssuesIndex,
  checkPerSeatLogs,
  checkSessionEndBlock,
  detectPartialRun,
  parseVerifyArgs,
  partialRunMessage,
  sessionMdMarksUnscrubbed,
  verifyCalibration,
} from './verify-calibration'

// ---------------------------------------------------------------------------
// Fixture builder — produces an all-green run directory on disk. Tests
// mutate the returned paths to drive targeted failure scenarios.
// ---------------------------------------------------------------------------

interface FixturePaths {
  readonly runDir: string
  readonly sessionMd: string
  readonly coverageMd: string
  readonly isolationAudit: string
  readonly eventsJsonl: string
  readonly seatsDir: string
  readonly suspicionsDir: string
  readonly issuesIndex: string
}

const VALID_SESSION_MD = `# Playtest Session Log

## Session Start

- seed: 1
- nopeWindowMs: 300000
- seats: 3
- seat names: Alice, Bob, Carol
- started-at: 2026-04-25T10:30:00
- harness git SHA: abc123
- catalog SHA: deadbeef1234

## Session End

- finished-at: 2026-04-25T10:45:00
- outcome: success (coverage PASSED)
- coverage: fired 52 / threshold 50 (zero-cells: 0)
- free-play: 120000ms / 900000ms (13.3%)
- viewports exercised: 390x844
- issues produced: 0
`

const VALID_ISOLATION_AUDIT = `# Isolation Audit Report (phase-4 Unit 4)

- **Seats audited:** 3
- **Breaches:** 0
- **Status:** PASS

## Seats

- \`seat-1\` (Alice)
- \`seat-2\` (Bob)
- \`seat-3\` (Carol)

## Breaches

_None._

---
_Path-confinement for \`Write\` is enforced by this audit..._
`

const VALID_COVERAGE_MD = `# Coverage report

**Fired: 52 / target: 50** — PASS
Zero cells: 0 / 14
With-divergence fires: 2

## 7×2 info-gap grid

| Vantage | Column 1 | Column 2 | Scenarios |
|---|---|---|---|
| SERVER | 5 | 5 | SCN-A |
`

const VALID_SEAT_LOG = `# Seat log

\`\`\`yaml
entryType: scenario-fire
scenarioId: SCN-A
seat: seat-1
seatName: Alice
timestamp: 2026-04-25T10:30:00Z
triggeringAction:
  type: end-turn
  playerId: seat-1
preObservation:
  stateVersion: 11
postObservation:
  stateVersion: 12
\`\`\`
`

const LEGACY_SEAT_LOG = `# Seat log

\`\`\`yaml
entryType: info-gap-divergence
seat: seat-1
scenarioId: SCN-A
atStateVersion: 12
atNowMs: 1700000000000
myRoleLabel: ACTOR
vantage: SERVER
column: 1
expected: "projection returns foo"
actual: "projection returned bar"
proseRationale: observed divergence between spec and implementation
\`\`\`
`

/** Build a complete all-green run directory. Caller mutates as needed. */
async function buildFixture(): Promise<FixturePaths> {
  const runDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'verify-calibration-fixture-'),
  )

  const serverDir = path.join(runDir, 'server')
  const seatsDir = path.join(runDir, 'seats')
  const suspicionsDir = path.join(runDir, 'suspicions')
  const issuesDir = path.join(runDir, 'issues')
  await Promise.all([
    fs.mkdir(serverDir, { recursive: true }),
    fs.mkdir(seatsDir, { recursive: true }),
    fs.mkdir(suspicionsDir, { recursive: true }),
    fs.mkdir(issuesDir, { recursive: true }),
  ])

  const sessionMd = path.join(runDir, 'session.md')
  const coverageMd = path.join(runDir, 'coverage.md')
  const isolationAudit = path.join(runDir, 'isolation-audit.md')
  const eventsJsonl = path.join(serverDir, 'events.jsonl')
  const issuesIndex = path.join(issuesDir, 'INDEX.md')

  const godEvent = {
    type: 'god-event',
    action: { type: 'end-turn', playerId: 'seat-1' },
    events: [],
    stateVersion: 12,
    nowMs: 1700000000000,
    projections: {
      'seat-1': {
        myHand: [
          { id: 'abc123def456', type: '<redacted>' },
          { id: 'fedcba987654', type: '<redacted>' },
        ],
      },
      'seat-2': {
        myHand: [{ id: '1234567890ab', type: '<redacted>' }],
      },
    },
    boardView: {},
  }

  await Promise.all([
    fs.writeFile(sessionMd, VALID_SESSION_MD, 'utf8'),
    fs.writeFile(coverageMd, VALID_COVERAGE_MD, 'utf8'),
    fs.writeFile(isolationAudit, VALID_ISOLATION_AUDIT, 'utf8'),
    fs.writeFile(eventsJsonl, `${JSON.stringify(godEvent)}\n`, 'utf8'),
    fs.writeFile(path.join(seatsDir, 'seat-1.log.md'), VALID_SEAT_LOG, 'utf8'),
    fs.writeFile(issuesIndex, '# Triage issue index\n', 'utf8'),
  ])

  return {
    runDir,
    sessionMd,
    coverageMd,
    isolationAudit,
    eventsJsonl,
    seatsDir,
    suspicionsDir,
    issuesIndex,
  }
}

async function cleanupFixture(runDir: string): Promise<void> {
  await fs.rm(runDir, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

describe('parseVerifyArgs', () => {
  it('requires no args to show help flag only', () => {
    expect(parseVerifyArgs([])).toEqual({ help: false, runDir: null })
  })

  it('accepts --help', () => {
    expect(parseVerifyArgs(['--help'])).toEqual({ help: true, runDir: null })
    expect(parseVerifyArgs(['-h'])).toEqual({ help: true, runDir: null })
  })

  it('accepts a single positional runDir', () => {
    expect(parseVerifyArgs(['runs/x'])).toEqual({
      help: false,
      runDir: 'runs/x',
    })
  })

  it('rejects unknown flags', () => {
    expect(() => parseVerifyArgs(['--bogus'])).toThrow(/unknown flag: --bogus/)
  })

  it('rejects multiple positional arguments', () => {
    expect(() => parseVerifyArgs(['a', 'b'])).toThrow(/unexpected positional/)
  })
})

// ---------------------------------------------------------------------------
// Partial-run detection (I5)
// ---------------------------------------------------------------------------

describe('detectPartialRun (I5)', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — complete session.md returns partial: false', async () => {
    const result = await detectPartialRun(fixture.runDir)
    expect(result.partial).toBe(false)
    expect(result.sessionMdContent).toContain('## Session End')
  })

  it('flags partial run when session.md exists but lacks ## Session End', async () => {
    // Truncate session.md to only the start block (simulates mid-session crash)
    const truncated = VALID_SESSION_MD.split('## Session End')[0]!
    await fs.writeFile(fixture.sessionMd, truncated, 'utf8')

    const result = await detectPartialRun(fixture.runDir)
    expect(result.partial).toBe(true)
    expect(result.reason).toBe('session.md missing end-block')
  })

  it('flags partial run when session.md is missing entirely', async () => {
    await fs.rm(fixture.sessionMd)
    const result = await detectPartialRun(fixture.runDir)
    expect(result.partial).toBe(true)
    expect(result.reason).toBe('session.md missing')
  })

  it('partialRunMessage embeds session id + --full-dir purge command', () => {
    const msg = partialRunMessage('/runs/2026-04-25-1030-3p')
    expect(msg).toContain(
      "Invoke 'pnpm playtest:purge --full-dir 2026-04-25-1030-3p'",
    )
    expect(msg).toContain('Partial run detected')
    expect(msg).toContain('session.md missing end-block')
  })
})

// ---------------------------------------------------------------------------
// Check 1 — session.md end-block outcome
// ---------------------------------------------------------------------------

describe('checkSessionEndBlock', () => {
  it('happy path — outcome: success passes', () => {
    const r = checkSessionEndBlock(VALID_SESSION_MD)
    expect(r.status).toBe('pass')
    expect(r.detail).toBe('outcome: success')
  })

  it('fails on outcome: error', () => {
    const md = VALID_SESSION_MD.replace(
      '- outcome: success (coverage PASSED)',
      '- outcome: error',
    )
    const r = checkSessionEndBlock(md)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('error')
  })

  it('fails on aborted-* outcomes', () => {
    const md = VALID_SESSION_MD.replace(
      '- outcome: success (coverage PASSED)',
      '- outcome: aborted-fatal-close',
    )
    const r = checkSessionEndBlock(md)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('aborted-fatal-close')
  })

  it('fails when ## Session End heading is present but no outcome line', () => {
    const md = `${VALID_SESSION_MD.split('## Session End')[0]}## Session End\n\n- finished-at: 2026-04-25\n`
    const r = checkSessionEndBlock(md)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('no `- outcome:` line')
  })
})

describe('sessionMdMarksUnscrubbed', () => {
  it('happy path — standard scrubbed run returns false', () => {
    expect(sessionMdMarksUnscrubbed(VALID_SESSION_MD)).toBe(false)
  })

  it('detects UNSCRUBBED-RETAIN-INTERNAL-ONLY sentinel', () => {
    const md = `${VALID_SESSION_MD}- scrub: UNSCRUBBED-RETAIN-INTERNAL-ONLY\n`
    expect(sessionMdMarksUnscrubbed(md)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Check 2 — isolation-audit.md
// ---------------------------------------------------------------------------

describe('checkIsolationAudit', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — Status: PASS passes', async () => {
    const r = await checkIsolationAudit(fixture.runDir)
    expect(r.status).toBe('pass')
  })

  it('fails when isolation-audit.md is missing', async () => {
    await fs.rm(fixture.isolationAudit)
    const r = await checkIsolationAudit(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('isolation-audit.md missing')
  })

  it('fails when Status: ISOLATION_BREACH is present', async () => {
    const breached = VALID_ISOLATION_AUDIT.replace(
      '- **Status:** PASS',
      '- **Status:** ISOLATION_BREACH',
    )
    await fs.writeFile(fixture.isolationAudit, breached, 'utf8')
    const r = await checkIsolationAudit(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('ISOLATION_BREACH')
  })

  it('fails when isolation-audit.md has no Status line at all', async () => {
    await fs.writeFile(fixture.isolationAudit, '# no status here\n', 'utf8')
    const r = await checkIsolationAudit(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('missing `- **Status:** PASS`')
  })
})

// ---------------------------------------------------------------------------
// Checks 3 + 4 — events.jsonl valid JSONL + scrubbed
// ---------------------------------------------------------------------------

describe('checkEventsJsonl', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — scrubbed myHand entries pass both checks', async () => {
    const r = await checkEventsJsonl(fixture.runDir)
    expect(r.jsonl.status).toBe('pass')
    expect(r.scrubbed.status).toBe('pass')
    expect(r.scrubbed.detail).toContain('3 myHand entries')
  })

  it('happy path — empty events.jsonl passes JSONL but scrub shows 0 entries', async () => {
    await fs.writeFile(fixture.eventsJsonl, '', 'utf8')
    const r = await checkEventsJsonl(fixture.runDir)
    expect(r.jsonl.status).toBe('pass')
    expect(r.scrubbed.status).toBe('pass')
    expect(r.scrubbed.detail).toContain('0 myHand entries')
  })

  it('fails JSONL on malformed line', async () => {
    await fs.writeFile(
      fixture.eventsJsonl,
      '{"type":"god-event","projections":{}}\nnot-json-here\n',
      'utf8',
    )
    const r = await checkEventsJsonl(fixture.runDir)
    expect(r.jsonl.status).toBe('fail')
    expect(r.jsonl.detail).toContain('line 2 is not valid JSON')
    // When JSONL parse fails, scrub is skipped — not silently "passed".
    expect(r.scrubbed.status).toBe('skip')
  })

  it('fails scrubbed when a myHand.type is NOT <redacted>', async () => {
    const leakedEvent = {
      type: 'god-event',
      projections: {
        'seat-1': {
          myHand: [{ id: 'abc', type: 'attack' }],
        },
      },
    }
    await fs.writeFile(
      fixture.eventsJsonl,
      `${JSON.stringify(leakedEvent)}\n`,
      'utf8',
    )
    const r = await checkEventsJsonl(fixture.runDir)
    expect(r.jsonl.status).toBe('pass')
    expect(r.scrubbed.status).toBe('fail')
    expect(r.scrubbed.detail).toContain('attack')
    expect(r.scrubbed.detail).toContain('scrubber contract violated')
  })

  it('fails JSONL (and skips scrubbed) when events.jsonl is missing', async () => {
    await fs.rm(fixture.eventsJsonl)
    const r = await checkEventsJsonl(fixture.runDir)
    expect(r.jsonl.status).toBe('fail')
    expect(r.jsonl.detail).toContain('events.jsonl missing')
    expect(r.scrubbed.status).toBe('skip')
  })

  it('skips scrubbed check when options.unscrubbed is true', async () => {
    // Leave the leaked event in place — with unscrubbed: true the
    // scrub assertion should skip, NOT pass, NOT fail. The skip path
    // is how authorized --no-scrub runs avoid a false positive.
    const leakedEvent = {
      type: 'god-event',
      projections: {
        'seat-1': {
          myHand: [{ id: 'abc', type: 'attack' }],
        },
      },
    }
    await fs.writeFile(
      fixture.eventsJsonl,
      `${JSON.stringify(leakedEvent)}\n`,
      'utf8',
    )
    const r = await checkEventsJsonl(fixture.runDir, { unscrubbed: true })
    expect(r.jsonl.status).toBe('pass')
    expect(r.scrubbed.status).toBe('skip')
    expect(r.scrubbed.detail).toContain('UNSCRUBBED')
  })
})

// ---------------------------------------------------------------------------
// Check 5 — per-seat logs entryType vocabulary
// ---------------------------------------------------------------------------

describe('checkPerSeatLogs', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — valid scenario-fire entry passes', async () => {
    const r = await checkPerSeatLogs(fixture.runDir)
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('1 seat file')
    expect(r.detail).toContain('1 entry')
  })

  it('happy path — zero entries (empty seat logs) still passes', async () => {
    // Calibration floor is ≥1, but a minimal mini-catalog with 0 fires is valid
    await fs.writeFile(
      path.join(fixture.seatsDir, 'seat-1.log.md'),
      '# Empty log\n\n_No entries._\n',
      'utf8',
    )
    const r = await checkPerSeatLogs(fixture.runDir)
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('0 entries')
  })

  it('happy path — missing seats/ and suspicions/ dirs still pass (seat agent crashed early)', async () => {
    await fs.rm(fixture.seatsDir, { recursive: true })
    await fs.rm(fixture.suspicionsDir, { recursive: true })
    const r = await checkPerSeatLogs(fixture.runDir)
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('0 seat files')
  })

  it('fails on legacy entryType info-gap-divergence with phase-4 C4 rename message', async () => {
    await fs.writeFile(
      path.join(fixture.seatsDir, 'seat-1.log.md'),
      LEGACY_SEAT_LOG,
      'utf8',
    )
    const r = await checkPerSeatLogs(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain(
      'legacy entryType — rename to ui-spec-divergence per phase-4 C4.',
    )
    expect(r.detail).toContain('seat-1.log.md')
  })

  it('fails on unknown entryType with parse-error surface', async () => {
    await fs.writeFile(
      path.join(fixture.seatsDir, 'seat-1.log.md'),
      '# seat\n\n```yaml\nentryType: nonsense-kind\nseat: seat-1\n```\n',
      'utf8',
    )
    const r = await checkPerSeatLogs(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('parse errors')
  })

  it('also scans suspicions/ for legacy entryType', async () => {
    await fs.writeFile(
      path.join(fixture.suspicionsDir, 'seat-1.suspicions.md'),
      LEGACY_SEAT_LOG,
      'utf8',
    )
    const r = await checkPerSeatLogs(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('suspicions')
  })
})

// ---------------------------------------------------------------------------
// Check 6 — coverage.md renders
// ---------------------------------------------------------------------------

describe('checkCoverageMd', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — full-render coverage.md passes', async () => {
    const r = await checkCoverageMd(fixture.runDir)
    expect(r.status).toBe('pass')
    expect(r.detail).toContain('header + banner + grid')
  })

  it('happy path — 0-fire mini-catalog still passes (edge case: empty fires)', async () => {
    const zeroFireCoverage = `# Coverage report

**Fired: 0 / target: 50** — FAIL
Zero cells: 14 / 14
With-divergence fires: 0

## 7×2 info-gap grid

| Vantage | Column 1 | Column 2 | Scenarios |
|---|---|---|---|
| SERVER | 0 | 0 | — |
`
    await fs.writeFile(fixture.coverageMd, zeroFireCoverage, 'utf8')
    const r = await checkCoverageMd(fixture.runDir)
    expect(r.status).toBe('pass')
  })

  it('fails when coverage.md is literally empty (Unit 10 renderer did not run)', async () => {
    await fs.writeFile(fixture.coverageMd, '', 'utf8')
    const r = await checkCoverageMd(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('Unit 10 renderer did not run')
  })

  it('fails when coverage.md is missing entirely', async () => {
    await fs.rm(fixture.coverageMd)
    const r = await checkCoverageMd(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('coverage.md missing')
  })

  it('fails when header is missing', async () => {
    await fs.writeFile(
      fixture.coverageMd,
      '**Fired: 5 / target: 50** — FAIL\n## 7×2 info-gap grid\n',
      'utf8',
    )
    const r = await checkCoverageMd(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('# Coverage report')
  })

  it('fails when banner is missing', async () => {
    await fs.writeFile(
      fixture.coverageMd,
      '# Coverage report\n\n## 7×2 info-gap grid\n',
      'utf8',
    )
    const r = await checkCoverageMd(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('Fired: N / target: T')
  })
})

// ---------------------------------------------------------------------------
// Check 7 — issues/INDEX.md exists
// ---------------------------------------------------------------------------

describe('checkIssuesIndex', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — INDEX.md present passes', async () => {
    const r = await checkIssuesIndex(fixture.runDir)
    expect(r.status).toBe('pass')
  })

  it('fails when INDEX.md is missing', async () => {
    await fs.rm(fixture.issuesIndex)
    const r = await checkIssuesIndex(fixture.runDir)
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('issues/INDEX.md missing')
  })

  it('passes on empty-content INDEX.md (calibration allowance)', async () => {
    await fs.writeFile(fixture.issuesIndex, '', 'utf8')
    const r = await checkIssuesIndex(fixture.runDir)
    expect(r.status).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// Orchestrator — verifyCalibration
// ---------------------------------------------------------------------------

describe('verifyCalibration', () => {
  let fixture: FixturePaths
  beforeEach(async () => {
    fixture = await buildFixture()
  })
  afterEach(async () => {
    await cleanupFixture(fixture.runDir)
  })

  it('happy path — all 7 checks green', async () => {
    const r = await verifyCalibration(fixture.runDir)
    expect(r.partialRun).toBe(false)
    expect(r.results).toHaveLength(7)
    const failed = r.results.filter((c) => c.status === 'fail')
    expect(failed).toEqual([])
  })

  it('short-circuits to partial-run branch when end-block missing', async () => {
    const truncated = VALID_SESSION_MD.split('## Session End')[0]!
    await fs.writeFile(fixture.sessionMd, truncated, 'utf8')

    const r = await verifyCalibration(fixture.runDir)
    expect(r.partialRun).toBe(true)
    expect(r.partialRunMessage).toContain(
      "Invoke 'pnpm playtest:purge --full-dir",
    )
    // No checks run when partial-run is tripped — prevents cascading
    // failures from half-written artifacts.
    expect(r.results).toEqual([])
  })

  it('aggregates failures — missing isolation audit shows up in results', async () => {
    await fs.rm(fixture.isolationAudit)
    const r = await verifyCalibration(fixture.runDir)
    expect(r.partialRun).toBe(false)
    const isolationResult = r.results.find((c) =>
      c.name.includes('isolation-audit.md'),
    )
    expect(isolationResult?.status).toBe('fail')
  })

  it('respects UNSCRUBBED sentinel — does not fail on unscrubbed myHand', async () => {
    const md = `${VALID_SESSION_MD}- scrub: UNSCRUBBED-RETAIN-INTERNAL-ONLY\n`
    await fs.writeFile(fixture.sessionMd, md, 'utf8')
    // Write a leaked event on purpose — scrubbed check should SKIP, not FAIL
    const leakedEvent = {
      type: 'god-event',
      projections: {
        'seat-1': { myHand: [{ id: 'abc', type: 'attack' }] },
      },
    }
    await fs.writeFile(
      fixture.eventsJsonl,
      `${JSON.stringify(leakedEvent)}\n`,
      'utf8',
    )

    const r = await verifyCalibration(fixture.runDir)
    const scrubResult = r.results.find((c) => c.name.includes('scrubbed'))
    expect(scrubResult?.status).toBe('skip')
    // No FAIL overall because skip ≠ fail.
    const failed = r.results.filter((c) => c.status === 'fail')
    expect(failed).toEqual([])
  })
})
