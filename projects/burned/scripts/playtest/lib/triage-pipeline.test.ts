/**
 * Phase 5 Unit 6 — `triage-pipeline` tests.
 *
 * Exercises the post-session driver against real on-disk fixtures.
 * Three cases mirror the plan's "test scenarios (mocked)" set:
 *   - Happy path: realistic run dir → seed count > 0, INDEX.md written.
 *   - Isolation breach → skipped='isolation-breach', no specs.
 *   - Zero seats → skipped='no-seeds', no specs.
 */
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runTriagePipeline } from './triage-pipeline'

const T0 = Date.parse('2026-04-24T18:00:00.000Z')
const ts = (offsetMs: number): string =>
  new Date(T0 + offsetMs).toISOString()

let tempRoot: string
let runDir: string

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'phase5-pipeline-'))
  runDir = path.join(tempRoot, 'sample-run')
  await mkdir(path.join(runDir, 'seats'), { recursive: true })
  await mkdir(path.join(runDir, 'suspicions'), { recursive: true })
  await mkdir(path.join(runDir, 'issues'), { recursive: true })
  await mkdir(path.join(runDir, 'server'), { recursive: true })
})

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true })
})

const MIN_CATALOG = `
## Catalog

### SCN-A — Test scenario A

**Trigger conditions:** trivial.

\`\`\`yaml
events:
  - type: card-played
    where:
      playerId: $ACTOR
shape: contains
\`\`\`
`

async function writeFixtureRun(): Promise<{
  catalogPath: string
  eventsJsonl: string
  connectionsJsonl: string
}> {
  const catalogPath = path.join(tempRoot, 'SCENARIOS.md')
  await writeFile(catalogPath, MIN_CATALOG, 'utf8')

  const seat1Log = `# seat-1.log.md

\`\`\`yaml
entryType: scenario-fire
scenarioId: SCN-A
seat: seat-1
seatName: Dash
timestamp: ${ts(1_000)}
triggeringAction: { type: play-card }
preObservation: {}
postObservation: {}
\`\`\`
`
  const seat1Susp = `# seat-1.suspicions.md

\`\`\`yaml
entryType: vibe-check
seat: seat-1
seatName: Dash
timestamp: ${ts(1_500)}
relatedScenario: SCN-A
feltLikeArcher: 'no'
vibeCheckPrompt: Did this feel like Archer?
proseRationale: banner arrived too late after the card flip
\`\`\`
`
  await writeFile(path.join(runDir, 'seats/seat-1.log.md'), seat1Log, 'utf8')
  await writeFile(
    path.join(runDir, 'suspicions/seat-1.suspicions.md'),
    seat1Susp,
    'utf8',
  )

  const eventsJsonl = path.join(runDir, 'server/events.jsonl')
  const connectionsJsonl = path.join(runDir, 'server/connections.jsonl')
  await writeFile(eventsJsonl, '', 'utf8')
  await writeFile(connectionsJsonl, '', 'utf8')

  return { catalogPath, eventsJsonl, connectionsJsonl }
}

describe('runTriagePipeline — happy path', () => {
  it('produces seeds, emits specs, writes INDEX.md', async () => {
    const { catalogPath, eventsJsonl, connectionsJsonl } = await writeFixtureRun()
    const result = await runTriagePipeline({
      runDir,
      catalogPath,
      eventsJsonlPath: eventsJsonl,
      connectionsJsonlPath: connectionsJsonl,
      isolationStatus: 'OK',
    })
    expect(result.skipped).toBeUndefined()
    expect(result.seedCount).toBeGreaterThan(0)
    expect(result.specCount).toBe(result.seedCount)
    expect(result.indexPath).toBeDefined()
    // INDEX.md exists and is well-formed.
    const md = await readFile(result.indexPath!, 'utf8')
    expect(md).toContain('# Triage issue index')
    expect(md).toContain('## Summary')
  })

  it('honours emitSpecs=false (no spec files written)', async () => {
    const { catalogPath, eventsJsonl, connectionsJsonl } = await writeFixtureRun()
    const result = await runTriagePipeline({
      runDir,
      catalogPath,
      eventsJsonlPath: eventsJsonl,
      connectionsJsonlPath: connectionsJsonl,
      isolationStatus: 'OK',
      emitSpecs: false,
    })
    expect(result.specCount).toBe(0)
    expect(result.seedCount).toBeGreaterThan(0)
  })
})

describe('runTriagePipeline — skip paths', () => {
  it('isolation breach → skipped, no specs, no seeds', async () => {
    const { catalogPath, eventsJsonl, connectionsJsonl } = await writeFixtureRun()
    const result = await runTriagePipeline({
      runDir,
      catalogPath,
      eventsJsonlPath: eventsJsonl,
      connectionsJsonlPath: connectionsJsonl,
      isolationStatus: 'ISOLATION_BREACH',
    })
    expect(result.skipped).toBe('isolation-breach')
    expect(result.seedCount).toBe(0)
    expect(result.specCount).toBe(0)
    expect(result.indexPath).toBeUndefined()
  })

  it('zero seats → skipped="no-seeds"', async () => {
    // Run dir has issues/ + server/ but no seats / suspicions content.
    await mkdir(path.join(runDir, 'server'), { recursive: true })
    const eventsJsonl = path.join(runDir, 'server/events.jsonl')
    const connectionsJsonl = path.join(runDir, 'server/connections.jsonl')
    await writeFile(eventsJsonl, '', 'utf8')
    await writeFile(connectionsJsonl, '', 'utf8')
    const catalogPath = path.join(tempRoot, 'SCENARIOS.md')
    await writeFile(catalogPath, MIN_CATALOG, 'utf8')
    const result = await runTriagePipeline({
      runDir,
      catalogPath,
      eventsJsonlPath: eventsJsonl,
      connectionsJsonlPath: connectionsJsonl,
      isolationStatus: 'OK',
    })
    expect(result.skipped).toBe('no-seeds')
    expect(result.seedCount).toBe(0)
  })
})
