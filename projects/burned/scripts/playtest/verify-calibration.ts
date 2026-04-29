#!/usr/bin/env tsx
/**
 * `pnpm playtest:verify-calibration <runDir>` — Phase 6 Unit 2.
 *
 * Walks a completed run directory and prints a pass/fail table over the
 * 6 artifact-shape checks from the phase-6 plan §Unit 2. Reusable across
 * calibration + real series runs (run-agnostic; consumes filesystem only).
 *
 * Pre-gate (I5 — partial-run detection):
 *   If `session.md` exists but LACKS a closing `## Session End` block, the
 *   run is treated as a partial run (crash recovery state). Exit non-zero
 *   with the purge instruction — do NOT attempt to salvage because partial
 *   scrub-salt state is untrusted.
 *
 * Checks (6, each fail-closed, pure filesystem):
 *   1. session.md end-block — outcome is `success` (not error / aborted-*).
 *   2. isolation-audit.md — all green (phase-4 Unit 4 `**Status:** PASS`).
 *   3. events.jsonl — every line parses as JSON.
 *   4. events.jsonl — scrubbed (myHand.type === '<redacted>' wherever
 *      projections are present). Skipped if the session end-block marks
 *      the run `UNSCRUBBED-RETAIN-INTERNAL-ONLY` (phase-6 Unit 1 I3).
 *   5. per-seat logs — any observed entryType is one of the four known
 *      values (phase-4 D5 / phase-5 D14); legacy `info-gap-divergence`
 *      from C4 rename is rejected with an actionable message.
 *   6. coverage.md renders — has `# Coverage report` header + `**Fired: N
 *      / target: T**` banner (phase-3 Unit 10 shape). Empty-fires case
 *      (mini-catalog, 0 scenarios) is verified as valid, not crashing.
 *   7. issues/INDEX.md exists (empty is fine for calibration).
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed, OR partial-run pre-gate fired
 *   2 — usage error (no argument / unknown flag)
 *
 * QUARANTINE (insight 022): no imports from `src/server` or `src/shared`.
 * Uses Node stdlib + local `./lib/log-parser` + `./lib/log-schema` only.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { parseSeatLogString } from './lib/log-parser'

// ---------------------------------------------------------------------------
// CheckResult — mirrors pre-flight.ts shape so the two tables render identically
// ---------------------------------------------------------------------------

export type CheckStatus = 'pass' | 'fail' | 'skip'

export interface CheckResult {
  readonly name: string
  readonly status: CheckStatus
  readonly detail?: string
}

const pass = (name: string, detail?: string): CheckResult => ({
  name,
  status: 'pass',
  ...(detail ? { detail } : {}),
})
const fail = (name: string, detail: string): CheckResult => ({
  name,
  status: 'fail',
  detail,
})
const skip = (name: string, detail: string): CheckResult => ({
  name,
  status: 'skip',
  detail,
})

// ---------------------------------------------------------------------------
// Partial-run detection (I5)
// ---------------------------------------------------------------------------

const SESSION_END_HEADING = '## Session End'

export interface PartialRunDetect {
  readonly partial: boolean
  readonly reason?: string
  /** The session.md body when present, for downstream checks to reuse. */
  readonly sessionMdContent?: string
}

/**
 * Detects whether the run dir reflects a partial (crashed) run. Returns
 * `{ partial: true, reason }` if session.md is missing OR lacks the
 * `## Session End` heading. Does not throw.
 */
export async function detectPartialRun(
  runDir: string,
): Promise<PartialRunDetect> {
  const sessionMdPath = path.join(runDir, 'session.md')
  let content: string
  try {
    content = await fs.readFile(sessionMdPath, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return { partial: true, reason: 'session.md missing' }
    }
    throw err
  }
  if (!content.includes(SESSION_END_HEADING)) {
    return {
      partial: true,
      reason: 'session.md missing end-block',
      sessionMdContent: content,
    }
  }
  return { partial: false, sessionMdContent: content }
}

/**
 * Render the I5 partial-run purge instruction. Session id is derived from
 * the run directory basename.
 */
export function partialRunMessage(runDir: string): string {
  const sessionId = path.basename(runDir)
  return `Partial run detected — session.md missing end-block. Invoke 'pnpm playtest:purge --full-dir ${sessionId}' before re-running.`
}

// ---------------------------------------------------------------------------
// Check 1 — session.md end-block outcome
// ---------------------------------------------------------------------------

const CHECK_NAME_SESSION_END = '1. session.md end-block'

/** Outcome literals emitted by `appendSessionEnd` (lib/run-directory.ts). */
const SUCCESS_OUTCOME = 'success'
const OUTCOME_LINE_RE = /^- outcome:\s*([A-Za-z0-9-]+)/m

export function checkSessionEndBlock(sessionMd: string): CheckResult {
  const match = sessionMd.match(OUTCOME_LINE_RE)
  if (match === null) {
    return fail(
      CHECK_NAME_SESSION_END,
      'session.md has `## Session End` heading but no `- outcome:` line',
    )
  }
  const outcome = match[1]!
  if (outcome !== SUCCESS_OUTCOME) {
    return fail(
      CHECK_NAME_SESSION_END,
      `outcome: ${outcome} (expected: ${SUCCESS_OUTCOME})`,
    )
  }
  return pass(CHECK_NAME_SESSION_END, `outcome: ${outcome}`)
}

/**
 * Detect the `UNSCRUBBED-RETAIN-INTERNAL-ONLY` sentinel the plan
 * requires Unit 3 to auto-emit when `--no-scrub` is honored (phase-6
 * Unit 1 I3). Downstream check 4 uses this to skip the scrubbed
 * assertion without false-failing an authorized debug run.
 */
const UNSCRUBBED_MARKER_RE = /UNSCRUBBED[-\s]RETAIN[-\s]INTERNAL[-\s]ONLY/i
export function sessionMdMarksUnscrubbed(sessionMd: string): boolean {
  return UNSCRUBBED_MARKER_RE.test(sessionMd)
}

// ---------------------------------------------------------------------------
// Check 2 — isolation-audit.md all-green
// ---------------------------------------------------------------------------

const CHECK_NAME_ISOLATION = '2. isolation-audit.md'

/** phase-4 Unit 4 renderReport writes this line. */
const ISOLATION_STATUS_PASS_RE = /^- \*\*Status:\*\*\s*PASS\s*$/m
const ISOLATION_STATUS_BREACH_RE = /^- \*\*Status:\*\*\s*ISOLATION_BREACH\s*$/m

export async function checkIsolationAudit(
  runDir: string,
): Promise<CheckResult> {
  const auditPath = path.join(runDir, 'isolation-audit.md')
  let content: string
  try {
    content = await fs.readFile(auditPath, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return fail(
        CHECK_NAME_ISOLATION,
        `isolation-audit.md missing at ${auditPath}`,
      )
    }
    throw err
  }
  if (ISOLATION_STATUS_BREACH_RE.test(content)) {
    return fail(CHECK_NAME_ISOLATION, 'isolation-audit.md reports ISOLATION_BREACH')
  }
  if (!ISOLATION_STATUS_PASS_RE.test(content)) {
    return fail(
      CHECK_NAME_ISOLATION,
      'isolation-audit.md present but missing `- **Status:** PASS` line',
    )
  }
  return pass(CHECK_NAME_ISOLATION, 'status: PASS')
}

// ---------------------------------------------------------------------------
// Checks 3 + 4 — events.jsonl valid JSONL + scrubbed
// ---------------------------------------------------------------------------

const CHECK_NAME_EVENTS_JSONL = '3. events.jsonl valid JSONL'
const CHECK_NAME_EVENTS_SCRUBBED = '4. events.jsonl scrubbed'
const REDACTED_TYPE = '<redacted>'

export interface EventsJsonlResult {
  readonly jsonl: CheckResult
  readonly scrubbed: CheckResult
}

export async function checkEventsJsonl(
  runDir: string,
  options: { readonly unscrubbed?: boolean } = {},
): Promise<EventsJsonlResult> {
  const eventsPath = path.join(runDir, 'server', 'events.jsonl')
  let content: string
  try {
    content = await fs.readFile(eventsPath, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      const missing = fail(
        CHECK_NAME_EVENTS_JSONL,
        `events.jsonl missing at ${eventsPath}`,
      )
      return {
        jsonl: missing,
        scrubbed: skip(
          CHECK_NAME_EVENTS_SCRUBBED,
          'events.jsonl missing — scrub assertion not applicable',
        ),
      }
    }
    throw err
  }

  // Split trailing newline — JSONL convention is one object per line, file
  // ends in '\n'. Empty-file is permissible (zero god-events is theoretically
  // valid for a zero-action run).
  const lines = content.split('\n').filter((l) => l.length > 0)
  const parsed: unknown[] = []
  for (let i = 0; i < lines.length; i++) {
    try {
      parsed.push(JSON.parse(lines[i]!))
    } catch (err) {
      return {
        jsonl: fail(
          CHECK_NAME_EVENTS_JSONL,
          `line ${i + 1} is not valid JSON: ${(err as Error).message}`,
        ),
        scrubbed: skip(
          CHECK_NAME_EVENTS_SCRUBBED,
          'JSONL parse failed — scrub assertion not applicable',
        ),
      }
    }
  }

  const jsonlResult = pass(
    CHECK_NAME_EVENTS_JSONL,
    `${lines.length} line${lines.length === 1 ? '' : 's'}`,
  )

  if (options.unscrubbed === true) {
    return {
      jsonl: jsonlResult,
      scrubbed: skip(
        CHECK_NAME_EVENTS_SCRUBBED,
        'session.md marks run UNSCRUBBED-RETAIN-INTERNAL-ONLY — scrub assertion skipped',
      ),
    }
  }

  // Scrub assertion: every projected myHand entry must carry
  // `type: '<redacted>'`. If no projections present at all (e.g. only
  // non-god-event lines), pass vacuously but note it — the check exists
  // to catch leaked types, not to enforce presence (insight 027 spirit:
  // pair with presence companion in tests).
  let myHandEntriesSeen = 0
  for (let i = 0; i < parsed.length; i++) {
    const line = parsed[i]
    if (
      line === null ||
      typeof line !== 'object' ||
      !('projections' in line) ||
      line.projections === null ||
      typeof line.projections !== 'object'
    ) {
      continue
    }
    const projections = line.projections as Record<string, unknown>
    for (const viewerId of Object.keys(projections)) {
      const view = projections[viewerId]
      if (view === null || typeof view !== 'object' || !('myHand' in view)) continue
      const myHand = (view as { myHand: unknown }).myHand
      if (!Array.isArray(myHand)) continue
      for (let j = 0; j < myHand.length; j++) {
        const entry = myHand[j]
        if (entry === null || typeof entry !== 'object') continue
        myHandEntriesSeen++
        const type = (entry as { type?: unknown }).type
        if (type !== REDACTED_TYPE) {
          return {
            jsonl: jsonlResult,
            scrubbed: fail(
              CHECK_NAME_EVENTS_SCRUBBED,
              `line ${i + 1}, viewer ${JSON.stringify(viewerId)}, myHand[${j}].type = ${JSON.stringify(type)} (expected ${JSON.stringify(REDACTED_TYPE)}) — scrubber contract violated (phase-3 Unit 4b)`,
            ),
          }
        }
      }
    }
  }

  return {
    jsonl: jsonlResult,
    scrubbed: pass(
      CHECK_NAME_EVENTS_SCRUBBED,
      `${myHandEntriesSeen} myHand entr${myHandEntriesSeen === 1 ? 'y' : 'ies'} all <redacted>`,
    ),
  }
}

// ---------------------------------------------------------------------------
// Check 5 — per-seat logs use the four-value entryType vocabulary
// ---------------------------------------------------------------------------

const CHECK_NAME_SEAT_LOGS = '5. per-seat logs entryType vocabulary'
const LEGACY_ENTRY_TYPE = 'info-gap-divergence'

export async function checkPerSeatLogs(
  runDir: string,
): Promise<CheckResult> {
  const seatsDir = path.join(runDir, 'seats')
  const suspicionsDir = path.join(runDir, 'suspicions')

  const candidates: string[] = []
  for (const dir of [seatsDir, suspicionsDir]) {
    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'ENOENT') continue
      throw err
    }
    for (const name of entries) {
      if (name.endsWith('.log.md') || name.endsWith('.suspicions.md')) {
        candidates.push(path.join(dir, name))
      }
    }
  }

  let totalEntries = 0
  const parseErrors: string[] = []
  for (const file of candidates) {
    const markdown = await fs.readFile(file, 'utf8')
    const result = parseSeatLogString(markdown)

    // Legacy-rename detection: the parser emits a parse WARNING for
    // `info-gap-divergence` and coerces to `ui-spec-divergence`. Phase 6
    // Unit 2 promotes that to a hard fail with the phase-4 C4 rename
    // message so calibration data never lands with legacy entryTypes.
    const legacyWarning = result.warnings.find((w) =>
      w.message.includes(`\`${LEGACY_ENTRY_TYPE}\``),
    )
    if (legacyWarning !== undefined) {
      return fail(
        CHECK_NAME_SEAT_LOGS,
        `${path.relative(runDir, file)}: legacy entryType — rename to ui-spec-divergence per phase-4 C4.`,
      )
    }

    if (result.errors.length > 0) {
      // Report ALL errors per file, not just the first. Calibration retry
      // run `2026-04-26-1303-3p` had two distinct violations in one
      // suspicion file (`scenarioId: null` + `questionsTried: <string>`);
      // the pre-fix surface only showed the first, masking the second
      // until triage scrolled the raw markdown. Block-index keeps each
      // error addressable in the source file. (TODO #13.)
      for (const err of result.errors) {
        parseErrors.push(
          `${path.relative(runDir, file)} block ${err.blockIndex}: ${err.message}`,
        )
      }
    }
    totalEntries += result.entries.length
  }

  if (parseErrors.length > 0) {
    return fail(
      CHECK_NAME_SEAT_LOGS,
      `seat-log parse errors (${parseErrors.length}): ${parseErrors.join('; ')}`,
    )
  }

  // Zero entries is expected for a minimal mini-catalog run (plan §Unit 2).
  // The calibration FLOOR is ≥1 observed entryType — we don't enforce that
  // here because a 6-scenario mini-catalog with 0 fires is a valid outcome.
  return pass(
    CHECK_NAME_SEAT_LOGS,
    `${candidates.length} seat file${candidates.length === 1 ? '' : 's'}, ${totalEntries} entr${totalEntries === 1 ? 'y' : 'ies'}`,
  )
}

// ---------------------------------------------------------------------------
// Check 6 — coverage.md renders
// ---------------------------------------------------------------------------

const CHECK_NAME_COVERAGE = '6. coverage.md renders'
const COVERAGE_HEADER_RE = /^# Coverage report\s*$/m
const COVERAGE_BANNER_RE = /^\*\*Fired:\s*\d+\s*\/\s*target:\s*\d+\*\*/m
const COVERAGE_GRID_HEADING_RE = /^##\s*7[×x]2 info-gap grid\s*$/m

export async function checkCoverageMd(runDir: string): Promise<CheckResult> {
  const coveragePath = path.join(runDir, 'coverage.md')
  let content: string
  try {
    content = await fs.readFile(coveragePath, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return fail(CHECK_NAME_COVERAGE, `coverage.md missing at ${coveragePath}`)
    }
    throw err
  }

  // Empty coverage.md is created by `createRunDirectory` and overwritten by
  // Unit 10's renderer when the orchestrator closes out. An empty file at
  // verify-time means the renderer never ran — fail closed.
  if (content.trim().length === 0) {
    return fail(
      CHECK_NAME_COVERAGE,
      'coverage.md is empty — Unit 10 renderer did not run',
    )
  }

  const missing: string[] = []
  if (!COVERAGE_HEADER_RE.test(content)) missing.push('`# Coverage report` header')
  if (!COVERAGE_BANNER_RE.test(content)) missing.push('`**Fired: N / target: T**` banner')
  if (!COVERAGE_GRID_HEADING_RE.test(content)) missing.push('`## 7×2 info-gap grid` heading')

  if (missing.length > 0) {
    return fail(
      CHECK_NAME_COVERAGE,
      `coverage.md missing: ${missing.join(', ')}`,
    )
  }
  return pass(CHECK_NAME_COVERAGE, 'header + banner + grid present')
}

// ---------------------------------------------------------------------------
// Check 7 — issues/INDEX.md exists
// ---------------------------------------------------------------------------

const CHECK_NAME_INDEX = '7. issues/INDEX.md'

export async function checkIssuesIndex(runDir: string): Promise<CheckResult> {
  const indexPath = path.join(runDir, 'issues', 'INDEX.md')
  try {
    await fs.stat(indexPath)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return fail(CHECK_NAME_INDEX, `issues/INDEX.md missing at ${indexPath}`)
    }
    throw err
  }
  return pass(CHECK_NAME_INDEX, 'present')
}

// ---------------------------------------------------------------------------
// Orchestrator — pure, returns results. Caller decides exit code.
// ---------------------------------------------------------------------------

export interface VerifyResult {
  readonly partialRun: boolean
  readonly partialRunMessage?: string
  readonly results: readonly CheckResult[]
}

export async function verifyCalibration(runDir: string): Promise<VerifyResult> {
  const partial = await detectPartialRun(runDir)
  if (partial.partial) {
    return {
      partialRun: true,
      partialRunMessage: partialRunMessage(runDir),
      results: [],
    }
  }
  const sessionMd = partial.sessionMdContent!
  const unscrubbed = sessionMdMarksUnscrubbed(sessionMd)

  const results: CheckResult[] = []
  results.push(checkSessionEndBlock(sessionMd))
  results.push(await checkIsolationAudit(runDir))
  const events = await checkEventsJsonl(runDir, { unscrubbed })
  results.push(events.jsonl)
  results.push(events.scrubbed)
  results.push(await checkPerSeatLogs(runDir))
  results.push(await checkCoverageMd(runDir))
  results.push(await checkIssuesIndex(runDir))

  return { partialRun: false, results }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `
Usage: pnpm playtest:verify-calibration <runDir>

Walks a completed playtest run directory and verifies the 6 artifact-shape
checks from the phase-6 plan §Unit 2 are green. Run-agnostic — works for
calibration runs AND real series runs.

Arguments:
  <runDir>    Path to a run directory (e.g.
              docs/testing/playtest/runs/2026-04-25-1030-3p).

Options:
  --help, -h  Print this message and exit.

Exit codes:
  0 — all checks passed
  1 — one or more checks failed, or partial-run pre-gate fired (I5)
  2 — usage error
`.trim()

export interface ParsedArgs {
  readonly help: boolean
  readonly runDir: string | null
}

export function parseVerifyArgs(argv: readonly string[]): ParsedArgs {
  let help = false
  let runDir: string | null = null

  for (const a of argv) {
    if (a === '--help' || a === '-h') {
      help = true
      continue
    }
    if (a.startsWith('--')) {
      throw new Error(`unknown flag: ${a}`)
    }
    if (runDir !== null) {
      throw new Error(`unexpected positional argument: ${a}`)
    }
    runDir = a
  }

  return { help, runDir }
}

function renderTable(results: readonly CheckResult[]): string {
  const rows = results.map((r) => {
    const icon =
      r.status === 'pass' ? '[OK]' : r.status === 'skip' ? '[SKIP]' : '[FAIL]'
    const detail = r.detail ? ` — ${r.detail}` : ''
    return `  ${icon} ${r.name}${detail}`
  })
  return rows.join('\n')
}

export async function main(argv: readonly string[]): Promise<number> {
  let parsed: ParsedArgs
  try {
    parsed = parseVerifyArgs(argv)
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${USAGE}\n`)
    return 2
  }

  if (parsed.help) {
    process.stdout.write(`${USAGE}\n`)
    return 0
  }

  if (parsed.runDir === null) {
    process.stderr.write(`missing <runDir>\n\n${USAGE}\n`)
    return 2
  }

  const runDir = path.resolve(parsed.runDir)
  try {
    const st = await fs.stat(runDir)
    if (!st.isDirectory()) {
      process.stderr.write(`not a directory: ${runDir}\n`)
      return 2
    }
  } catch {
    process.stderr.write(`run directory not found: ${runDir}\n`)
    return 2
  }

  const result = await verifyCalibration(runDir)

  if (result.partialRun) {
    process.stderr.write(`${result.partialRunMessage}\n`)
    return 1
  }

  process.stdout.write(`${renderTable(result.results)}\n`)

  const allPass = result.results.every((r) => r.status !== 'fail')
  const failed = result.results.filter((r) => r.status === 'fail').length
  const total = result.results.length
  process.stdout.write(
    `\n[verify-calibration] ${allPass ? 'ALL PASS' : `${failed} FAIL`} — ${total - failed}/${total} checks\n`,
  )
  return allPass ? 0 : 1
}

// ESM-safe main-module check. Mirrors selftest.ts + pre-flight.ts.
const isMain =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`
if (isMain || process.argv[1]?.endsWith('verify-calibration.ts')) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`[verify-calibration] unexpected failure: ${String(err)}\n`)
      process.exit(1)
    })
}
