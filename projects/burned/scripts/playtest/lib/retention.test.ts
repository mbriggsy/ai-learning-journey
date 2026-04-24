/**
 * Unit 10b tests — retention policy + operator purge.
 *
 * Two layers:
 *   - Pure selection (`selectForRotation`, `selectForPurge`, `parseArgs`,
 *     `assertInsideOutputRoot`) — no FS, run thousands of times cheaply.
 *   - Integration (`applyRetention`, `applyPurge`, `runPurgeCli`) — real
 *     FS against a uuid-suffixed tmpdir; cleaned up in afterEach.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import {
  selectForRotation,
  selectForPurge,
  parseSessionDirName,
  applyRetention,
  applyPurge,
  assertInsideOutputRoot,
  type DirEntry,
} from './retention'
import { parseArgs, runPurgeCli } from '../purge'

// -----------------------------------------------------------------------------
// Fixture helpers.
// -----------------------------------------------------------------------------

function dirEntry(name: string, date: string): DirEntry {
  return { name, sessionDate: new Date(date) }
}

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = path.join(os.tmpdir(), `burned-retention-${randomUUID()}`)
  await fs.mkdir(tmpRoot, { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true })
})

/**
 * Create a minimal session-dir tree under `tmpRoot`. Matches the layout
 * written by Unit 2's `createRunDirectory` — `server/events.jsonl`,
 * `server/connections.jsonl`, `session.md`, `coverage.md`, `issues/`.
 */
async function makeSessionDir(name: string): Promise<string> {
  const dir = path.join(tmpRoot, name)
  await fs.mkdir(path.join(dir, 'server'), { recursive: true })
  await fs.mkdir(path.join(dir, 'issues'), { recursive: true })
  await fs.mkdir(path.join(dir, 'seats'), { recursive: true })
  await fs.mkdir(path.join(dir, 'suspicions'), { recursive: true })
  await fs.writeFile(path.join(dir, 'server', 'events.jsonl'), 'evt\n')
  await fs.writeFile(path.join(dir, 'server', 'connections.jsonl'), 'cnx\n')
  await fs.writeFile(path.join(dir, 'session.md'), '# session\n')
  await fs.writeFile(path.join(dir, 'coverage.md'), '# coverage\n')
  return dir
}

// -----------------------------------------------------------------------------
// Pure: parseSessionDirName.
// -----------------------------------------------------------------------------

describe('parseSessionDirName', () => {
  it('parses a well-formed name', () => {
    const got = parseSessionDirName('2026-04-24-1430-3p')
    expect(got).not.toBeNull()
    expect(got!.name).toBe('2026-04-24-1430-3p')
    expect(got!.sessionDate.getFullYear()).toBe(2026)
    expect(got!.sessionDate.getMonth()).toBe(3)
    expect(got!.sessionDate.getDate()).toBe(24)
    expect(got!.sessionDate.getHours()).toBe(14)
    expect(got!.sessionDate.getMinutes()).toBe(30)
  })

  it('parses a collision-suffixed name', () => {
    const got = parseSessionDirName('2026-04-24-1430-3p-2')
    expect(got).not.toBeNull()
    expect(got!.name).toBe('2026-04-24-1430-3p-2')
  })

  it('returns null for unparseable names', () => {
    expect(parseSessionDirName('foo-bar')).toBeNull()
    expect(parseSessionDirName('_retention.log')).toBeNull()
    expect(parseSessionDirName('2026-04-24')).toBeNull()
    expect(parseSessionDirName('2026-04-24-1430')).toBeNull()
    expect(parseSessionDirName('2026-04-24-1430-3')).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// Pure: selectForRotation.
// -----------------------------------------------------------------------------

describe('selectForRotation', () => {
  it('keeps the top N newest when count exceeds retention', () => {
    // 15 dirs, one per hour on 2026-04-24.
    const dirs: DirEntry[] = []
    for (let h = 0; h < 15; h++) {
      const hh = String(h).padStart(2, '0')
      dirs.push(dirEntry(`2026-04-24-${hh}00-3p`, `2026-04-24T${hh}:00:00`))
    }
    const { keep, rotate } = selectForRotation(dirs, 10)
    expect(keep).toHaveLength(10)
    expect(rotate).toHaveLength(5)
    // Keep is the 10 latest-hour dirs (14..5), rotate is (4..0).
    const keepNames = keep.map(k => k.name)
    const rotateNames = rotate.map(r => r.name)
    expect(keepNames[0]).toBe('2026-04-24-1400-3p')
    expect(keepNames[9]).toBe('2026-04-24-0500-3p')
    expect(rotateNames[0]).toBe('2026-04-24-0400-3p')
    expect(rotateNames[4]).toBe('2026-04-24-0000-3p')
  })

  it('keeps all when count < retention', () => {
    const dirs: DirEntry[] = []
    for (let h = 0; h < 5; h++) {
      const hh = String(h).padStart(2, '0')
      dirs.push(dirEntry(`2026-04-24-${hh}00-3p`, `2026-04-24T${hh}:00:00`))
    }
    const { keep, rotate } = selectForRotation(dirs, 10)
    expect(keep).toHaveLength(5)
    expect(rotate).toHaveLength(0)
  })

  it('boundary: count === retention keeps all, 0 rotated', () => {
    const dirs: DirEntry[] = []
    for (let h = 0; h < 10; h++) {
      const hh = String(h).padStart(2, '0')
      dirs.push(dirEntry(`2026-04-24-${hh}00-3p`, `2026-04-24T${hh}:00:00`))
    }
    const { keep, rotate } = selectForRotation(dirs, 10)
    expect(keep).toHaveLength(10)
    expect(rotate).toHaveLength(0)
  })

  it('boundary: N-th newest kept, (N+1)-th rotated', () => {
    const dirs: DirEntry[] = []
    for (let h = 0; h < 11; h++) {
      const hh = String(h).padStart(2, '0')
      dirs.push(dirEntry(`2026-04-24-${hh}00-3p`, `2026-04-24T${hh}:00:00`))
    }
    const { keep, rotate } = selectForRotation(dirs, 10)
    // 11 dirs → 10 kept (hours 10..1), 1 rotated (hour 00).
    expect(keep.map(k => k.name)).toContain('2026-04-24-0100-3p')
    expect(rotate.map(r => r.name)).toEqual(['2026-04-24-0000-3p'])
  })

  it('tie-break: collision-suffixed name sorts after bare name on same Date', () => {
    const sameMinute = '2026-04-24T14:30:00'
    const dirs: DirEntry[] = [
      dirEntry('2026-04-24-1430-3p', sameMinute),
      dirEntry('2026-04-24-1430-3p-2', sameMinute),
      dirEntry('2026-04-24-1430-3p-3', sameMinute),
    ]
    const { keep } = selectForRotation(dirs, 10)
    // Sorted name DESC on tie: -3, -2, bare.
    expect(keep.map(k => k.name)).toEqual([
      '2026-04-24-1430-3p-3',
      '2026-04-24-1430-3p-2',
      '2026-04-24-1430-3p',
    ])
  })

  it('does not mutate the input', () => {
    const dirs: DirEntry[] = [
      dirEntry('2026-04-24-0100-3p', '2026-04-24T01:00:00'),
      dirEntry('2026-04-24-0300-3p', '2026-04-24T03:00:00'),
      dirEntry('2026-04-24-0200-3p', '2026-04-24T02:00:00'),
    ]
    const snapshot = dirs.map(d => d.name)
    selectForRotation(dirs, 2)
    expect(dirs.map(d => d.name)).toEqual(snapshot)
  })
})

// -----------------------------------------------------------------------------
// Pure: selectForPurge.
// -----------------------------------------------------------------------------

describe('selectForPurge', () => {
  it('purges dirs strictly before the cutoff', () => {
    const dirs: DirEntry[] = [
      dirEntry('2026-03-15-1200-3p', '2026-03-15T12:00:00'),
      dirEntry('2026-03-31-1200-3p', '2026-03-31T12:00:00'),
      dirEntry('2026-04-01-1200-3p', '2026-04-01T12:00:00'),
      dirEntry('2026-04-15-1200-3p', '2026-04-15T12:00:00'),
    ]
    // `--before 2026-04-01` means midnight local → 2026-04-01T00:00.
    const before = new Date(2026, 3, 1, 0, 0, 0, 0)
    const { purge, keep } = selectForPurge(dirs, before)
    expect(purge.map(d => d.name)).toEqual([
      '2026-03-15-1200-3p',
      '2026-03-31-1200-3p',
    ])
    expect(keep.map(d => d.name)).toEqual([
      '2026-04-01-1200-3p',
      '2026-04-15-1200-3p',
    ])
  })

  it('returns empty purge set when before is undefined (no implicit deletion)', () => {
    const dirs: DirEntry[] = [
      dirEntry('2026-04-01-1200-3p', '2026-04-01T12:00:00'),
      dirEntry('2026-04-15-1200-3p', '2026-04-15T12:00:00'),
    ]
    const { purge, keep } = selectForPurge(dirs)
    expect(purge).toHaveLength(0)
    expect(keep).toHaveLength(2)
  })
})

// -----------------------------------------------------------------------------
// Pure: assertInsideOutputRoot — the delete-safety guard.
// -----------------------------------------------------------------------------

describe('assertInsideOutputRoot', () => {
  it('refuses to delete outputRoot itself', () => {
    expect(() => assertInsideOutputRoot(tmpRoot, tmpRoot)).toThrow(
      /refusing to delete outputRoot itself/,
    )
  })

  it('accepts a child inside outputRoot', () => {
    const child = path.join(tmpRoot, '2026-04-24-1430-3p')
    expect(() => assertInsideOutputRoot(tmpRoot, child)).not.toThrow()
  })

  it('refuses a path outside outputRoot', () => {
    expect(() => assertInsideOutputRoot(tmpRoot, os.tmpdir())).toThrow(
      /not inside outputRoot|refusing to delete outputRoot|refusing to operate/,
    )
  })

  it('refuses to operate at filesystem root', () => {
    const fsRoot = path.parse(process.cwd()).root // `/` or `C:\`
    expect(() =>
      assertInsideOutputRoot(fsRoot, path.join(fsRoot, 'anything')),
    ).toThrow(/refusing to operate at filesystem root/)
  })

  it('refuses a parent-escape via ..', () => {
    const outside = path.join(tmpRoot, '..', 'escapee')
    expect(() => assertInsideOutputRoot(tmpRoot, outside)).toThrow(
      /not inside outputRoot/,
    )
  })
})

// -----------------------------------------------------------------------------
// Integration: applyRetention.
// -----------------------------------------------------------------------------

describe('applyRetention (integration)', () => {
  it('deletes the 2 oldest when 12 dirs exist + retention=10', async () => {
    // Create 12 dirs at distinct hours.
    const names: string[] = []
    for (let h = 0; h < 12; h++) {
      const hh = String(h).padStart(2, '0')
      const name = `2026-04-24-${hh}00-3p`
      names.push(name)
      await makeSessionDir(name)
    }

    const result = await applyRetention({
      outputRoot: tmpRoot,
      sessionDirRetention: 10,
    })

    expect(result.kept).toHaveLength(10)
    expect(result.rotated).toHaveLength(2)
    expect(result.rotated.sort()).toEqual([
      '2026-04-24-0000-3p',
      '2026-04-24-0100-3p',
    ])

    // Verify FS state.
    const remaining = await fs.readdir(tmpRoot)
    const sessionDirs = remaining.filter(n => !n.startsWith('_'))
    expect(sessionDirs.sort()).toEqual(names.slice(2).sort())
  })

  it('writes _retention.log with one JSON line per action', async () => {
    for (let h = 0; h < 12; h++) {
      const hh = String(h).padStart(2, '0')
      await makeSessionDir(`2026-04-24-${hh}00-3p`)
    }
    await applyRetention({ outputRoot: tmpRoot, sessionDirRetention: 10 })

    const log = await fs.readFile(path.join(tmpRoot, '_retention.log'), 'utf8')
    const lines = log.trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(12) // 10 keep + 2 rotate

    const actions = lines.map(l => JSON.parse(l).action)
    const keeps = actions.filter(a => a === 'keep').length
    const rotates = actions.filter(a => a === 'rotate').length
    expect(keeps).toBe(10)
    expect(rotates).toBe(2)

    // Each line parses as JSON with required fields.
    for (const l of lines) {
      const rec = JSON.parse(l)
      expect(rec.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(rec.action).toMatch(/^(keep|rotate|skip-unparseable|purge)$/)
      expect(typeof rec.dir).toBe('string')
    }
  })

  it('skips unparseable dirs — logs skip-unparseable, does NOT delete them', async () => {
    // 2 parseable + 1 foreign.
    await makeSessionDir('2026-04-24-0100-3p')
    await makeSessionDir('2026-04-24-0200-3p')
    await fs.mkdir(path.join(tmpRoot, 'foo-bar'), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, 'foo-bar', 'keepme.txt'), 'important')

    const result = await applyRetention({
      outputRoot: tmpRoot,
      sessionDirRetention: 10,
    })

    expect(result.skipped.map(s => s.name)).toContain('foo-bar')
    expect(result.rotated).toHaveLength(0) // 2 parseable, retention=10.

    // Foreign dir still intact.
    const still = await fs.readFile(
      path.join(tmpRoot, 'foo-bar', 'keepme.txt'),
      'utf8',
    )
    expect(still).toBe('important')

    // Log records the skip.
    const log = await fs.readFile(path.join(tmpRoot, '_retention.log'), 'utf8')
    const recs = log.trim().split('\n').map(l => JSON.parse(l))
    const skipRec = recs.find(r => r.dir === 'foo-bar')
    expect(skipRec?.action).toBe('skip-unparseable')
  })

  it('returns empty result when outputRoot does not exist', async () => {
    const missing = path.join(tmpRoot, 'nope')
    const result = await applyRetention({
      outputRoot: missing,
      sessionDirRetention: 10,
    })
    expect(result.kept).toHaveLength(0)
    expect(result.rotated).toHaveLength(0)
  })
})

// -----------------------------------------------------------------------------
// Integration: applyPurge.
// -----------------------------------------------------------------------------

describe('applyPurge (integration)', () => {
  it('events-only mode deletes events.jsonl + connections.jsonl, preserves the rest', async () => {
    await makeSessionDir('2026-03-15-1200-3p')
    await makeSessionDir('2026-04-15-1200-3p')

    const before = new Date(2026, 3, 1, 0, 0, 0, 0)
    const result = await applyPurge({
      outputRoot: tmpRoot,
      before,
      fullDir: false,
    })

    expect(result.mode).toBe('events-only')
    expect(result.purged).toEqual(['2026-03-15-1200-3p'])
    expect(result.kept).toEqual(['2026-04-15-1200-3p'])

    // The purged dir's artifacts are gone...
    await expect(
      fs.stat(path.join(tmpRoot, '2026-03-15-1200-3p', 'server', 'events.jsonl')),
    ).rejects.toThrow()
    await expect(
      fs.stat(
        path.join(tmpRoot, '2026-03-15-1200-3p', 'server', 'connections.jsonl'),
      ),
    ).rejects.toThrow()
    // ...but session.md + coverage.md + issues/ remain.
    const sessionMd = await fs.readFile(
      path.join(tmpRoot, '2026-03-15-1200-3p', 'session.md'),
      'utf8',
    )
    expect(sessionMd).toBe('# session\n')
    const coverageMd = await fs.readFile(
      path.join(tmpRoot, '2026-03-15-1200-3p', 'coverage.md'),
      'utf8',
    )
    expect(coverageMd).toBe('# coverage\n')
  })

  it('full-dir mode deletes the entire matching session dir', async () => {
    await makeSessionDir('2026-03-15-1200-3p')
    await makeSessionDir('2026-04-15-1200-3p')

    const before = new Date(2026, 3, 1, 0, 0, 0, 0)
    const result = await applyPurge({
      outputRoot: tmpRoot,
      before,
      fullDir: true,
    })

    expect(result.mode).toBe('full-dir')
    expect(result.purged).toEqual(['2026-03-15-1200-3p'])
    await expect(
      fs.stat(path.join(tmpRoot, '2026-03-15-1200-3p')),
    ).rejects.toThrow()
    // Kept dir intact.
    const st = await fs.stat(path.join(tmpRoot, '2026-04-15-1200-3p'))
    expect(st.isDirectory()).toBe(true)
  })

  it('--session-id targets exactly one dir', async () => {
    await makeSessionDir('2026-04-23-1430-3p')
    await makeSessionDir('2026-04-24-1430-3p')

    const result = await applyPurge({
      outputRoot: tmpRoot,
      sessionId: '2026-04-23-1430-3p',
      fullDir: true,
    })
    expect(result.purged).toEqual(['2026-04-23-1430-3p'])
    await expect(
      fs.stat(path.join(tmpRoot, '2026-04-23-1430-3p')),
    ).rejects.toThrow()
    // Other dir untouched.
    const other = await fs.stat(path.join(tmpRoot, '2026-04-24-1430-3p'))
    expect(other.isDirectory()).toBe(true)
  })

  it('--session-id with nonexistent id throws actionable error', async () => {
    await expect(
      applyPurge({
        outputRoot: tmpRoot,
        sessionId: '2026-04-23-1430-3p',
      }),
    ).rejects.toThrow(/session dir not found/)
  })
})

// -----------------------------------------------------------------------------
// CLI parser + runner.
// -----------------------------------------------------------------------------

describe('parseArgs', () => {
  it('parses --help / -h', () => {
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-h']).help).toBe(true)
  })

  it('parses --before and --session-id, both spellings', () => {
    expect(parseArgs(['--before', '2026-04-01']).before).toBe('2026-04-01')
    expect(parseArgs(['--before=2026-04-01']).before).toBe('2026-04-01')
    expect(parseArgs(['--session-id', 'abc']).sessionId).toBe('abc')
    expect(parseArgs(['--session-id=abc']).sessionId).toBe('abc')
  })

  it('parses --full-dir as boolean', () => {
    expect(parseArgs(['--full-dir']).fullDir).toBe(true)
    expect(parseArgs([]).fullDir).toBe(false)
  })

  it('parses --root override', () => {
    expect(parseArgs(['--root', '/tmp/x']).root).toBe('/tmp/x')
    expect(parseArgs(['--root=/tmp/x']).root).toBe('/tmp/x')
  })

  it('throws on unknown argument', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/unknown argument/)
  })
})

describe('runPurgeCli', () => {
  it('--help returns exitCode 0 with usage on stdout', async () => {
    const result = await runPurgeCli(['--help'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout.join('\n')).toMatch(/Usage: pnpm playtest:purge/)
  })

  it('no selection flags → exitCode 2', async () => {
    const result = await runPurgeCli(['--root', tmpRoot])
    expect(result.exitCode).toBe(2)
    expect(result.stderr.join('\n')).toMatch(/no selection criteria/)
  })

  it('--before + --session-id together → exitCode 2', async () => {
    const result = await runPurgeCli([
      '--before', '2026-04-01',
      '--session-id', '2026-04-23-1430-3p',
      '--root', tmpRoot,
    ])
    expect(result.exitCode).toBe(2)
    expect(result.stderr.join('\n')).toMatch(/mutually exclusive/)
  })

  it('malformed --before → exitCode 2', async () => {
    const result = await runPurgeCli([
      '--before', 'not-a-date',
      '--root', tmpRoot,
    ])
    expect(result.exitCode).toBe(2)
    expect(result.stderr.join('\n')).toMatch(/YYYY-MM-DD/)
  })

  it('end-to-end: --before deletes only events in matching dir', async () => {
    await makeSessionDir('2026-03-15-1200-3p')
    await makeSessionDir('2026-04-15-1200-3p')

    const result = await runPurgeCli([
      '--before', '2026-04-01',
      '--root', tmpRoot,
    ])
    expect(result.exitCode).toBe(0)
    // Events gone, session.md intact.
    await expect(
      fs.stat(path.join(tmpRoot, '2026-03-15-1200-3p', 'server', 'events.jsonl')),
    ).rejects.toThrow()
    const md = await fs.readFile(
      path.join(tmpRoot, '2026-03-15-1200-3p', 'session.md'),
      'utf8',
    )
    expect(md).toBe('# session\n')
  })
})
