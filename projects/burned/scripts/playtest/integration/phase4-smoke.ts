/**
 * Phase 4 integration smoke (Unit 5).
 *
 * Exercises the Phase 4 launcher end-to-end WITHOUT actually spawning
 * Claude subagents. Production subagent dispatch happens inside a
 * Claude Code conversation (Phase 6 first-real-session); that surface
 * is not reachable from a pnpm script alone, so this smoke:
 *
 *   1. Uses a small 3-scenario synthetic catalog.
 *   2. Builds launch specs for 2 fake seats under a temp run directory.
 *   3. Writes FAKE seat log entries to simulate agents finishing (one
 *      entry per seat × mode: scripted scenario-fire + free-play
 *      vibe-check + suspicion).
 *   4. Touches `agents-done.marker` to release the driver.
 *   5. Runs the Phase 4 Unit 4 isolation audit.
 *   6. Parses both seat logs to assert every entry validates under the
 *      Phase 4 Unit 3 schema.
 *   7. Asserts zero `info-gap-divergence` strings anywhere (C4 rename
 *      end-to-end — emitted specs + rendered prompts).
 *   8. Asserts every rendered prompt is placeholder-free.
 *   9. Asserts every spec carries `subagentType: 'playtest-seat'` and
 *      never `'general-purpose'` (insight 020 regression).
 *  10. Prints a PASS / FAIL summary.
 *
 * Exit code 0 = PASS, 1 = FAIL. Run via `pnpm playtest:phase4-smoke`.
 *
 * The contract test for the tool-surface boundary (asserting each
 * `playtest-seat-N.md` whitelist excludes `browser_evaluate` and other
 * forbidden tools) ships as a vitest unit test in
 * `scripts/playtest/lib/agent-tool-whitelist.test.ts` — runs on every
 * commit, no manual step required.
 */
import { mkdtempSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  AGENTS_DONE_MARKER,
  buildLaunchSpecs,
  loadDefaultTemplates,
  type SeatLaunchSpec,
} from '../lib/agent-launcher'
import { runIsolationAudit } from '../lib/isolation-audit'
import { parseSeatLog } from '../lib/log-parser'
import type { ParsedScenario } from '../lib/scenario-detector'
import type { SeatHandle } from '../lib/types'

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')

interface AssertionFailure {
  readonly name: string
  readonly detail: string
}

const failures: AssertionFailure[] = []

function assert(condition: boolean, name: string, detail = ''): void {
  if (condition) {
    console.log(`  [pass] ${name}`)
  } else {
    console.log(`  [FAIL] ${name} — ${detail}`)
    failures.push({ name, detail })
  }
}

function synthScenario(
  id: string,
  overrides: Partial<ParsedScenario> = {},
): ParsedScenario {
  return {
    id,
    description: 'Smoke scenario',
    title: 'Smoke scenario',
    tier: 'other',
    events: [{ type: 'ev', where: { playerId: '$ACTOR' } }],
    shape: 'strict',
    triggerConditions: 'ACTOR acts.',
    recognitionCriteria: 'You see the banner.',
    suspicionPrompts: 'ACTOR: was it instant?',
    vibeCheck: 'Did it land like Archer?',
    infoGap: {
      SERVER: { column1Present: true, column2Present: true, column1Prose: 's1', column2Prose: 's2' },
      ACTOR: { column1Present: true, column2Present: true, column1Prose: 'a1', column2Prose: 'a2' },
      TARGET: { column1Present: false, column2Present: false },
      OTHER_ALIVE: { column1Present: true, column2Present: true, column1Prose: 'o1', column2Prose: 'o2' },
      SPECTATOR: { column1Present: false, column2Present: false },
      DISCONNECTED: { column1Present: false, column2Present: false },
      BOARD: { column1Present: true, column2Present: true, column1Prose: 'b1', column2Prose: 'b2' },
    },
    ...overrides,
  }
}

function fakeSeat(id: string, runDir: string): SeatHandle {
  return {
    seatId: id,
    seatName: id === 'seat-0' ? 'Dash' : 'Vera',
    roomCode: 'SMK4',
    page: null,
    viewport: { width: 390, height: 844, label: '390x844' },
    logPath: path.join(runDir, 'seats', `${id}.log.md`),
    suspicionPath: path.join(runDir, 'suspicions', `${id}.suspicions.md`),
    scenariosPath: 'docs/testing/playtest/SCENARIOS.md',
  }
}

function fakeLogEntry(seatId: string): string {
  return `### ${seatId} @ 2026-04-24T18:00:00-04:00 — FIRE

\`\`\`yaml
entryType: scenario-fire
scenarioId: SCN-SMOKE-01
seat: ${seatId}
seatName: Tester
timestamp: 2026-04-24T18:00:00-04:00
triggeringAction: { card: smoke }
preObservation: {}
postObservation: { turnAdvanced: true }
\`\`\`
`
}

function fakeSuspicionEntry(seatId: string): string {
  return `### ${seatId} @ 2026-04-24T18:01:00-04:00 — SUSPICION

\`\`\`yaml
entryType: suspicion
seat: ${seatId}
seatName: Tester
timestamp: 2026-04-24T18:01:00-04:00
severity: low
relatedScenario: null
questionsTried:
  - "Did I know which card was named?"
\`\`\`

### ${seatId} @ 2026-04-24T18:01:05-04:00 — VIBE CHECK

\`\`\`yaml
entryType: vibe-check
seat: ${seatId}
seatName: Tester
timestamp: 2026-04-24T18:01:05-04:00
relatedScenario: null
feltLikeArcher: unsure
vibeCheckPrompt: "Did this feel like Archer?"
proseRationale: "Wandered; nothing felt especially sharp yet."
\`\`\`
`
}

async function main(): Promise<void> {
  const runDir = mkdtempSync(path.join(tmpdir(), 'phase4-smoke-'))
  console.log(`Phase 4 smoke — runDir: ${runDir}`)

  await mkdir(path.join(runDir, 'seats'), { recursive: true })
  await mkdir(path.join(runDir, 'suspicions'), { recursive: true })

  const catalog = [synthScenario('SCN-SMOKE-01'), synthScenario('SCN-SMOKE-02'), synthScenario('SCN-SMOKE-03')]
  const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(REPO_ROOT)

  const seats = [fakeSeat('seat-0', runDir), fakeSeat('seat-1', runDir)]

  // --- Step 1: scripted specs
  const scriptedSpecs = buildLaunchSpecs({
    seats,
    catalog,
    modeSignal: 'scripted',
    sessionTimeoutMs: 180_000,
    startingSeatIndex: 0,
    scriptedTemplate,
    freePlayTemplate,
    screenshotsDir: path.join(runDir, 'screenshots'),
  })

  console.log('\n[scripted specs]')
  assert(scriptedSpecs.length === 2, 'scripted: 2 specs emitted')
  assertSpecsAreValid(scriptedSpecs)

  // --- Step 2: free-play respawn
  const freePlaySpecs = buildLaunchSpecs({
    seats,
    catalog,
    modeSignal: 'free-play',
    sessionTimeoutMs: 180_000,
    scriptedTemplate,
    freePlayTemplate,
    screenshotsDir: path.join(runDir, 'screenshots'),
  })

  console.log('\n[free-play specs]')
  assert(freePlaySpecs.length === 2, 'free-play: 2 specs emitted')
  assertSpecsAreValid(freePlaySpecs)
  for (const s of freePlaySpecs) {
    assert(
      s.prompt.includes('FREE-PLAY mode'),
      `free-play: ${s.seatId} prompt marks FREE-PLAY mode`,
    )
    assert(
      s.prompt.includes('MANDATORY'),
      `free-play: ${s.seatId} prompt marks vibe-check MANDATORY`,
    )
  }

  // --- Step 3: simulate agents finishing
  for (const seat of seats) {
    await writeFile(seat.logPath, fakeLogEntry(seat.seatId))
    await writeFile(seat.suspicionPath, fakeSuspicionEntry(seat.seatId))
  }
  await writeFile(path.join(runDir, AGENTS_DONE_MARKER), 'smoke')

  // --- Step 4: isolation audit
  console.log('\n[isolation audit]')
  const audit = await runIsolationAudit(runDir, seats)
  assert(audit.passed, 'isolation audit: green', JSON.stringify(audit.breaches))

  // --- Step 5: log parse validation
  console.log('\n[log parse]')
  for (const seat of seats) {
    const logResult = await parseSeatLog(seat.logPath)
    assert(
      logResult.errors.length === 0,
      `${seat.seatId}: log file parses cleanly`,
      JSON.stringify(logResult.errors),
    )
    assert(
      logResult.entries.length >= 1,
      `${seat.seatId}: log has ≥1 entry`,
    )
    const suspResult = await parseSeatLog(seat.suspicionPath)
    assert(
      suspResult.errors.length === 0,
      `${seat.seatId}: suspicion file parses cleanly`,
      JSON.stringify(suspResult.errors),
    )
    assert(
      suspResult.entries.length >= 2,
      `${seat.seatId}: suspicion has suspicion + vibe-check`,
    )
  }

  // --- Step 6: C4 rename end-to-end
  console.log('\n[C4 rename end-to-end]')
  for (const spec of [...scriptedSpecs, ...freePlaySpecs]) {
    assert(
      !spec.prompt.includes('info-gap-divergence'),
      `${spec.seatId} (${spec.mode}): zero info-gap-divergence matches`,
    )
    assert(
      spec.prompt.includes('ui-spec-divergence'),
      `${spec.seatId} (${spec.mode}): ui-spec-divergence present`,
    )
  }
  for (const seat of seats) {
    const logText = await readFile(seat.logPath, 'utf8')
    const suspText = await readFile(seat.suspicionPath, 'utf8')
    assert(
      !logText.includes('info-gap-divergence') && !suspText.includes('info-gap-divergence'),
      `${seat.seatId}: no legacy info-gap-divergence in logs`,
    )
  }

  // --- Summary
  console.log('\n========================================')
  if (failures.length === 0) {
    console.log('Phase 4 smoke: PASS')
  } else {
    console.log(`Phase 4 smoke: FAIL (${failures.length} assertion failures)`)
    for (const f of failures) {
      console.log(`  - ${f.name} — ${f.detail}`)
    }
  }
  console.log('========================================')
  console.log('')
  console.log('Tool-surface boundary contract test:')
  console.log('  See `scripts/playtest/lib/agent-tool-whitelist.test.ts`')
  console.log('  (vitest unit, runs on every `pnpm test`).')
  console.log('')

  process.exit(failures.length === 0 ? 0 : 1)
}

function assertSpecsAreValid(specs: readonly SeatLaunchSpec[]): void {
  specs.forEach((s, i) => {
    const expectedSubagent = `playtest-seat-${i + 1}`
    assert(
      s.subagentType === expectedSubagent,
      `${s.seatId} (${s.mode}): subagentType is '${expectedSubagent}' (phase-6 Unit 2.5)`,
    )
    assert(
      s.mcpNamespace === `playwright-seat-${i + 1}`,
      `${s.seatId} (${s.mode}): mcpNamespace is 'playwright-seat-${i + 1}'`,
    )
    assert(
      String(s.subagentType) !== 'general-purpose',
      `${s.seatId} (${s.mode}): subagentType is NOT 'general-purpose' (insight 020)`,
    )
    assert(
      String(s.subagentType) !== 'playtest-seat',
      `${s.seatId} (${s.mode}): subagentType is NOT the legacy 'playtest-seat' (Option B)`,
    )
    assert(
      !/\{\{[A-Z_]+\}\}/.test(s.prompt),
      `${s.seatId} (${s.mode}): prompt is placeholder-free`,
    )
    for (const label of [
      'SERVER',
      'ACTOR',
      'TARGET',
      'OTHER (alive)',
      'SPECTATOR (eliminated, connected)',
      'DISCONNECTED (alive, not connected)',
      'BOARD',
    ]) {
      assert(
        s.prompt.includes(label),
        `${s.seatId} (${s.mode}): prompt emits row label '${label}'`,
      )
    }
  })
}

main().catch((err: unknown) => {
  console.error('phase4-smoke: unexpected failure')
  console.error(err instanceof Error ? err.stack : err)
  process.exit(2)
})
