/**
 * Unit 4 tests — post-session isolation audit.
 *
 * Happy path (clean run dir) + three breach paths:
 *   - extra file under seats/ or suspicions/ → unexpected-file
 *   - file naming an unknown seat id → unknown-seat-in-filename
 *   - cross-seat contamination (entry declares `seat: X` but lands in
 *     `seat-Y.log.md`)
 *
 * Edge cases:
 *   - Seat crashed early with zero entries → PASS (empty-but-scoped).
 *   - Missing seats/ or suspicions/ dir → PASS (session ended early).
 *   - File with malformed YAML in a fenced block → surfaces as either
 *     contamination (if unparseable) or a parse-error path.
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { runIsolationAudit } from './isolation-audit'
import type { SeatHandle } from './types'

function seat(id: string, name: string = 'test'): SeatHandle {
  return {
    seatId: id,
    seatName: name,
    roomCode: 'TEST',
    page: null,
    viewport: { width: 390, height: 844, label: '390x844' },
    logPath: `/tmp/stub/seats/${id}.log.md`,
    suspicionPath: `/tmp/stub/suspicions/${id}.suspicions.md`,
    scenariosPath: 'docs/testing/playtest/SCENARIOS.md',
  }
}

async function prepareRunDir(): Promise<string> {
  const runDir = mkdtempSync(path.join(tmpdir(), 'phase4-audit-'))
  await mkdir(path.join(runDir, 'seats'), { recursive: true })
  await mkdir(path.join(runDir, 'suspicions'), { recursive: true })
  return runDir
}

const VALID_FIRE = (seatId: string): string => `### ${seatId} @ 2026-04-24T18:00:00-04:00 — FIRE

\`\`\`yaml
entryType: scenario-fire
scenarioId: SCN-X-01
seat: ${seatId}
seatName: Tester
timestamp: 2026-04-24T18:00:00-04:00
triggeringAction: {}
preObservation: {}
postObservation: {}
\`\`\`
`

describe('runIsolationAudit', () => {
  it('passes when each seat wrote only to its own log and suspicion paths', async () => {
    const runDir = await prepareRunDir()
    await writeFile(path.join(runDir, 'seats', 'seat-0.log.md'), VALID_FIRE('seat-0'))
    await writeFile(path.join(runDir, 'seats', 'seat-1.log.md'), VALID_FIRE('seat-1'))

    const result = await runIsolationAudit(runDir, [seat('seat-0'), seat('seat-1')])
    expect(result.passed).toBe(true)
    expect(result.breaches).toEqual([])
    const report = await readFile(result.reportPath, 'utf8')
    expect(report).toMatch(/\*\*Status:\*\*\s*PASS/)
  })

  it('passes when a seat crashed early with zero entries (empty-but-scoped)', async () => {
    const runDir = await prepareRunDir()
    await writeFile(path.join(runDir, 'seats', 'seat-0.log.md'), '')

    const result = await runIsolationAudit(runDir, [seat('seat-0')])
    expect(result.passed).toBe(true)
  })

  it('passes when the seats/ and suspicions/ directories are missing entirely', async () => {
    // Missing directories is the "session ended before any agent wrote"
    // case and must not be treated as a breach.
    const runDir = mkdtempSync(path.join(tmpdir(), 'phase4-audit-empty-'))
    const result = await runIsolationAudit(runDir, [seat('seat-0')])
    expect(result.passed).toBe(true)
  })

  it('flags an unexpected file inside seats/ (wrong extension)', async () => {
    const runDir = await prepareRunDir()
    await writeFile(path.join(runDir, 'seats', 'notes.txt'), 'stray file')

    const result = await runIsolationAudit(runDir, [seat('seat-0')])
    expect(result.passed).toBe(false)
    expect(result.breaches[0]?.kind).toBe('unexpected-file-in-seats-dir')
  })

  it('flags a file naming an unknown seat id', async () => {
    const runDir = await prepareRunDir()
    await writeFile(
      path.join(runDir, 'seats', 'seat-99.log.md'),
      VALID_FIRE('seat-99'),
    )

    const result = await runIsolationAudit(runDir, [seat('seat-0')])
    expect(result.passed).toBe(false)
    expect(result.breaches[0]?.kind).toBe('unknown-seat-in-filename')
  })

  it('flags cross-seat contamination when an entry declares a different seat than its filename', async () => {
    const runDir = await prepareRunDir()
    // seat-0's log file contains an entry claiming seat: seat-1.
    await writeFile(
      path.join(runDir, 'seats', 'seat-0.log.md'),
      VALID_FIRE('seat-1'),
    )

    const result = await runIsolationAudit(runDir, [seat('seat-0'), seat('seat-1')])
    expect(result.passed).toBe(false)
    const breach = result.breaches.find(
      (b) => b.kind === 'cross-seat-contamination',
    )
    expect(breach).toBeDefined()
    expect(breach?.detail).toMatch(/seat-1.*seat-0/)
  })

  it('writes isolation-audit.md with the full breach list', async () => {
    const runDir = await prepareRunDir()
    await writeFile(path.join(runDir, 'seats', 'gibberish.md'), 'x')

    const result = await runIsolationAudit(runDir, [seat('seat-0')])
    const report = await readFile(result.reportPath, 'utf8')
    expect(report).toMatch(/Status:.*ISOLATION_BREACH/)
    expect(report).toContain('unexpected-file-in-seats-dir')
  })

  it('flags an unexpected file in suspicions/ (different code path than seats/)', async () => {
    const runDir = await prepareRunDir()
    await writeFile(path.join(runDir, 'suspicions', 'stray.txt'), 'x')

    const result = await runIsolationAudit(runDir, [seat('seat-0')])
    expect(result.passed).toBe(false)
    const kinds = result.breaches.map((b) => b.kind)
    expect(kinds).toContain('unexpected-file-in-suspicions-dir')
  })
})
