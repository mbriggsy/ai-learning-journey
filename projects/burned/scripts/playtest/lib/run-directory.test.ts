/**
 * Unit 2 tests — run-directory layout + session.md lifecycle.
 *
 * Test-first per Phase 3 plan: the layout is a contract consumed by Phase 4,
 * Phase 5, and post-hoc tooling. These tests pin the contract.
 *
 * Isolation: each test uses a uuid-suffixed tmpdir and cleans up in afterEach.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import {
  createRunDirectory,
  writeSessionStart,
  appendSessionEnd,
} from './run-directory'
import type { Config, SessionReport } from './types'

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = path.join(os.tmpdir(), `burned-run-dir-${randomUUID()}`)
  await fs.mkdir(tmpRoot, { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true })
})

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    seats: 3,
    seatNames: ['Dash', 'Vera', 'Sable'],
    seed: 42,
    nopeWindowMs: 5000,
    sessionTimeoutMs: 180_000,
    catalogPath: path.resolve('docs/testing/playtest/SCENARIOS.md'),
    outputRoot: tmpRoot,
    viewports: [{ width: 390, height: 844, label: '390x844' }],
    freePlayWallclockFraction: 0.2,
    sessionDirRetention: 10,
    scrubMode: 'on',
    godReassemblyTimeoutMs: 5000,
    ...overrides,
  }
}

function makeResult(overrides: Partial<SessionReport> = {}): SessionReport {
  return {
    sessionId: '2026-04-24-1030-3p',
    runDir: path.join(tmpRoot, '2026-04-24-1030-3p'),
    startedAt: '2026-04-24T10:30:00',
    endedAt: '2026-04-24T10:45:00',
    outcome: 'success',
    coverage: {
      firedCount: 55,
      threshold: 50,
      gridCells: {
        SERVER: { column1: 5, column2: 5, scenarioIds: [] },
        ACTOR: { column1: 5, column2: 5, scenarioIds: [] },
        TARGET: { column1: 5, column2: 5, scenarioIds: [] },
        OTHER_ALIVE: { column1: 5, column2: 5, scenarioIds: [] },
        SPECTATOR: { column1: 3, column2: 3, scenarioIds: [] },
        DISCONNECTED: { column1: 2, column2: 2, scenarioIds: [] },
        BOARD: { column1: 5, column2: 5, scenarioIds: [] },
      },
      zeroCellCount: 0,
      passed: true,
      firedByViewport: {},
      freePlayAccounting: {
        totalMs: 900_000,
        freePlayMs: 180_000,
        scriptedMs: 720_000,
        fraction: 0.2,
      },
      divergences: [],
      knownProductCalls: [],
    },
    freePlay: {
      totalMs: 900_000,
      freePlayMs: 180_000,
      scriptedMs: 720_000,
      fraction: 0.2,
    },
    viewportsExercised: ['390x844'],
    ...overrides,
  }
}

describe('createRunDirectory', () => {
  it('creates the full tree (seats/, suspicions/, server/, issues/, session.md, coverage.md)', async () => {
    const paths = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')

    // Root + all subdirs exist as directories
    const rootStat = await fs.stat(paths.root)
    expect(rootStat.isDirectory()).toBe(true)
    expect(path.basename(paths.root)).toBe('2026-04-24-1030-3p')

    const seatsStat = await fs.stat(paths.seatsDir)
    expect(seatsStat.isDirectory()).toBe(true)

    const suspicionsStat = await fs.stat(path.join(paths.root, 'suspicions'))
    expect(suspicionsStat.isDirectory()).toBe(true)

    const serverStat = await fs.stat(paths.serverDir)
    expect(serverStat.isDirectory()).toBe(true)

    const issuesStat = await fs.stat(path.join(paths.root, 'issues'))
    expect(issuesStat.isDirectory()).toBe(true)

    // session.md and coverage.md exist as (possibly empty) files
    const sessionStat = await fs.stat(paths.sessionMd)
    expect(sessionStat.isFile()).toBe(true)
    const coverageStat = await fs.stat(paths.coverageMd)
    expect(coverageStat.isFile()).toBe(true)

    // events.jsonl + connections.jsonl paths point inside server/
    expect(path.dirname(paths.eventsJsonl)).toBe(paths.serverDir)
    expect(path.dirname(paths.connectionsJsonl)).toBe(paths.serverDir)
    expect(path.basename(paths.eventsJsonl)).toBe('events.jsonl')
    expect(path.basename(paths.connectionsJsonl)).toBe('connections.jsonl')
  })

  it('throws with an actionable message if root does not exist', async () => {
    const missingRoot = path.join(tmpRoot, 'does', 'not', 'exist')
    await expect(
      createRunDirectory(missingRoot, '2026-04-24-1030-3p'),
    ).rejects.toThrow(/output.*root.*(does not exist|not found)/i)
  })

  it('resolves session id collisions by appending -2, -3, ...', async () => {
    const first = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    expect(path.basename(first.root)).toBe('2026-04-24-1030-3p')

    const second = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    expect(path.basename(second.root)).toBe('2026-04-24-1030-3p-2')

    const third = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    expect(path.basename(third.root)).toBe('2026-04-24-1030-3p-3')

    // All three must be distinct, existing directories
    const stats = await Promise.all([
      fs.stat(first.root),
      fs.stat(second.root),
      fs.stat(third.root),
    ])
    expect(stats.every((s) => s.isDirectory())).toBe(true)
  })
})

describe('writeSessionStart', () => {
  it('writes start fields (seed, nopeWindowMs, seat count, seat names, started-at, harness SHA, catalog SHA)', async () => {
    const paths = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    const config = makeConfig()

    await writeSessionStart(paths, config)

    const content = await fs.readFile(paths.sessionMd, 'utf8')

    // Required start-block fields (plan D8)
    expect(content).toMatch(/seed/i)
    expect(content).toContain('42')
    expect(content).toMatch(/nopeWindowMs|nope.window/i)
    expect(content).toContain('5000')
    expect(content).toMatch(/seats?.*3|seat count.*3/i)
    expect(content).toContain('Dash')
    expect(content).toContain('Vera')
    expect(content).toContain('Sable')
    expect(content).toMatch(/started.at|startedAt/i)
    expect(content).toMatch(/harness.*(sha|git)/i)
    expect(content).toMatch(/catalog.*sha/i)

    // Harness SHA should look like a git SHA (hex, >= 7 chars) or be 'unknown'
    // (the latter is the documented fallback when `git` is unavailable).
    expect(content).toMatch(/harness.*(sha|git)[^\n]*(\b[0-9a-f]{7,40}\b|unknown)/i)

    // Catalog SHA is first-12 hex of sha256(SCENARIOS.md)
    expect(content).toMatch(/catalog.*sha[^\n]*\b[0-9a-f]{12}\b/i)

    // Start marker is present (used by appendSessionEnd round-trip)
    expect(content).toContain('## Session Start')
  })

  it('records "random" when seed is unset', async () => {
    const paths = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    const config = makeConfig({ seed: undefined })

    await writeSessionStart(paths, config)

    const content = await fs.readFile(paths.sessionMd, 'utf8')
    expect(content).toMatch(/seed[^\n]*random/i)
  })

  it('throws an actionable error when the catalog file is missing', async () => {
    const paths = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    const config = makeConfig({
      catalogPath: path.join(tmpRoot, 'nonexistent-SCENARIOS.md'),
    })

    await expect(writeSessionStart(paths, config)).rejects.toThrow(
      /catalog.*not.*(found|exist)/i,
    )
  })
})

describe('appendSessionEnd', () => {
  it('preserves start block content (round-trip)', async () => {
    const paths = await createRunDirectory(tmpRoot, '2026-04-24-1030-3p')
    const config = makeConfig()

    await writeSessionStart(paths, config)
    const afterStart = await fs.readFile(paths.sessionMd, 'utf8')

    const result = makeResult()
    await appendSessionEnd(paths, result)

    const afterEnd = await fs.readFile(paths.sessionMd, 'utf8')

    // Start block content still present verbatim (strict prefix check)
    expect(afterEnd.startsWith(afterStart)).toBe(true)

    // End block added
    expect(afterEnd).toContain('## Session End')
    expect(afterEnd).toMatch(/finished.at|endedAt|ended/i)
    expect(afterEnd).toContain('2026-04-24T10:45:00')

    // Coverage summary present (firedCount)
    expect(afterEnd).toMatch(/coverage/i)
    expect(afterEnd).toContain('55')

    // Issues produced count present
    expect(afterEnd).toMatch(/issues/i)
  })
})
