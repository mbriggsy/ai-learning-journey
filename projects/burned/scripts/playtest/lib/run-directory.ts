/**
 * Run-directory layout + session.md lifecycle (Phase 3 Unit 2).
 *
 * Creates `<outputRoot>/YYYY-MM-DD-HHMM-<N>p/` with the full subtree
 * (seats/, suspicions/, server/, issues/, session.md, coverage.md) and
 * owns the `session.md` start + end blocks consumed by Phase 4 (seat
 * agents), Phase 5 (issue triage), and post-hoc tooling.
 *
 * Contract-critical (see Phase 3 plan D7 / D8 / Output Structure):
 *   - Session id format: `YYYY-MM-DD-HHMM-<seats>p` (local time, NO seconds).
 *   - Collision (rerun within same minute + seat count): append `-2`, `-3`, …
 *   - Start block includes: seed (or "random"), nopeWindowMs, seat count,
 *     seat names, started-at (local ISO), harness git SHA, catalog SHA
 *     (first 12 hex of sha256 over `docs/testing/playtest/SCENARIOS.md`).
 *   - End block appended at session end: finished-at, outcome, coverage
 *     summary placeholder (fired / threshold / passed), issues produced.
 *
 * Insight-022 boundary: stays inside Node stdlib. MUST NOT import anything
 * that transitively pulls in `partyserver`.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Config, SessionReport } from './types'

const execFileAsync = promisify(execFile)

export interface RunDirPaths {
  readonly root: string
  readonly serverDir: string
  readonly seatsDir: string
  readonly suspicionsDir: string
  readonly eventsJsonl: string
  readonly connectionsJsonl: string
  readonly sessionMd: string
  readonly coverageMd: string
}

/**
 * Markers used by `appendSessionEnd` (and Phase 5 post-hoc tooling) to
 * locate block boundaries inside `session.md`. Exported as string literals,
 * not regexes, so consumers can use whichever form is convenient.
 */
const SESSION_START_HEADING = '## Session Start'
const SESSION_END_HEADING = '## Session End'

/**
 * Create the run-directory tree. Resolves collisions by suffixing `-N`.
 *
 * @param root        Output root (must already exist).
 * @param sessionId   e.g. `2026-04-24-1030-3p`. On collision the function
 *                    transparently rewrites to `<id>-2`, `<id>-3`, … and the
 *                    `RunDirPaths.root` basename reflects the final name.
 */
export async function createRunDirectory(
  root: string,
  sessionId: string,
): Promise<RunDirPaths> {
  // Preflight: the output root must exist. Creating it implicitly would
  // mask operator config errors (e.g. typo'd outputRoot landing runs in a
  // surprise directory tree).
  try {
    const st = await fs.stat(root)
    if (!st.isDirectory()) {
      throw new Error(
        `output root ${JSON.stringify(root)} exists but is not a directory`,
      )
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      throw new Error(
        `output root does not exist: ${JSON.stringify(root)} — create it or fix config.outputRoot`,
      )
    }
    throw err
  }

  // Collision resolution. mkdir { recursive: false } would fail loudly, but
  // we want to try sequential suffixes. Use `mkdir` without recursive on the
  // root so we can detect EEXIST and rename; create children with recursive.
  let finalId = sessionId
  let rootPath = path.join(root, finalId)
  for (let attempt = 2; ; attempt++) {
    try {
      await fs.mkdir(rootPath, { recursive: false })
      break
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      finalId = `${sessionId}-${attempt}`
      rootPath = path.join(root, finalId)
      // Safety: bail after an absurd number of attempts rather than spin.
      if (attempt > 1000) {
        throw new Error(
          `run-directory: >1000 collisions for ${sessionId} — refusing to continue`,
        )
      }
    }
  }

  const serverDir = path.join(rootPath, 'server')
  const seatsDir = path.join(rootPath, 'seats')
  const suspicionsDir = path.join(rootPath, 'suspicions')
  const issuesDir = path.join(rootPath, 'issues')

  await Promise.all([
    fs.mkdir(serverDir, { recursive: true }),
    fs.mkdir(seatsDir, { recursive: true }),
    fs.mkdir(suspicionsDir, { recursive: true }),
    fs.mkdir(issuesDir, { recursive: true }),
  ])

  const sessionMd = path.join(rootPath, 'session.md')
  const coverageMd = path.join(rootPath, 'coverage.md')

  // Create the two top-level files empty. `writeSessionStart` will populate
  // session.md; Unit 10 will overwrite coverage.md.
  await Promise.all([
    fs.writeFile(sessionMd, '', 'utf8'),
    fs.writeFile(coverageMd, '', 'utf8'),
  ])

  return {
    root: rootPath,
    serverDir,
    seatsDir,
    suspicionsDir,
    eventsJsonl: path.join(serverDir, 'events.jsonl'),
    connectionsJsonl: path.join(serverDir, 'connections.jsonl'),
    sessionMd,
    coverageMd,
  }
}

/**
 * Write the session-start block to `session.md`. Overwrites any existing
 * content (the file is created empty by `createRunDirectory`).
 */
export async function writeSessionStart(
  paths: RunDirPaths,
  config: Config,
): Promise<void> {
  const [harnessSha, catalogSha] = await Promise.all([
    readHarnessGitSha(),
    readCatalogSha(config.catalogPath),
  ])

  const seatNames = config.seatNames ?? []
  const seedLine = config.seed === undefined ? 'random' : String(config.seed)
  const startedAt = localIsoTimestamp(new Date())

  const body = [
    '# Playtest Session Log',
    '',
    SESSION_START_HEADING,
    '',
    `- seed: ${seedLine}`,
    `- nopeWindowMs: ${config.nopeWindowMs}`,
    `- seats: ${config.seats}`,
    `- seat names: ${seatNames.length > 0 ? seatNames.join(', ') : '(unnamed)'}`,
    `- started-at: ${startedAt}`,
    `- harness git SHA: ${harnessSha}`,
    `- catalog SHA: ${catalogSha}`,
    '',
  ].join('\n')

  await fs.writeFile(paths.sessionMd, body, 'utf8')
}

/**
 * Append the session-end block. Preserves the existing start block verbatim
 * (strict prefix preservation is asserted by the round-trip test).
 */
export async function appendSessionEnd(
  paths: RunDirPaths,
  result: SessionReport,
): Promise<void> {
  const cov = result.coverage
  const issuesProduced = await countIssuesProduced(paths.root)

  const outcomeLine =
    result.outcome !== undefined
      ? `- outcome: ${result.outcome}${cov.passed ? ' (coverage PASSED)' : ' (coverage FAILED)'}`
      : `- outcome: ${cov.passed ? 'PASSED' : 'FAILED'}`

  const lines: string[] = [
    '',
    SESSION_END_HEADING,
    '',
    `- finished-at: ${result.endedAt}`,
    outcomeLine,
    `- coverage: fired ${cov.firedCount} / threshold ${cov.threshold} (zero-cells: ${cov.zeroCellCount})`,
    `- free-play: ${cov.freePlayAccounting.freePlayMs}ms / ${cov.freePlayAccounting.totalMs}ms (${(cov.freePlayAccounting.fraction * 100).toFixed(1)}%)`,
    `- viewports exercised: ${result.viewportsExercised.join(', ') || '(none)'}`,
    `- issues produced: ${issuesProduced}`,
  ]
  if (result.errorMessage !== undefined && result.errorMessage.length > 0) {
    lines.push(`- error: ${result.errorMessage}`)
  }
  lines.push('')

  await fs.appendFile(paths.sessionMd, lines.join('\n'), 'utf8')
}

// -----------------------------------------------------------------------------
// Helpers — private, exported only implicitly via the three functions above.
// -----------------------------------------------------------------------------

/**
 * First 12 hex of sha256 over the catalog file bytes. Throws an actionable
 * error if the file is absent (plan landmine — don't bubble raw ENOENT).
 */
async function readCatalogSha(catalogPath: string): Promise<string> {
  let bytes: Buffer
  try {
    bytes = await fs.readFile(catalogPath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `catalog file not found at ${JSON.stringify(catalogPath)} — check config.catalogPath`,
      )
    }
    throw err
  }
  return createHash('sha256').update(bytes).digest('hex').slice(0, 12)
}

/**
 * `git rev-parse HEAD`. Returns `'unknown'` on any failure — the session log
 * is diagnostic, not load-bearing, so a missing git binary shouldn't abort a
 * playtest run. The SHA field in `session.md` accepts either a hex SHA or
 * the literal string `unknown` (tested).
 */
async function readHarnessGitSha(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      windowsHide: true,
    })
    const sha = stdout.trim()
    if (!/^[0-9a-f]{7,40}$/.test(sha)) return 'unknown'
    return sha
  } catch {
    return 'unknown'
  }
}

/**
 * Local ISO-ish timestamp WITHOUT timezone suffix. Matches plan D8
 * ("local ISO timestamp") — the run directory is local-time-named, so the
 * in-log timestamp is local-time-valued for human consistency.
 */
function localIsoTimestamp(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/**
 * Count of files inside `<root>/issues/`. Used in the end-block `issues
 * produced` line. Missing dir is treated as zero (shouldn't happen since
 * `createRunDirectory` creates it, but defensive).
 */
async function countIssuesProduced(runRoot: string): Promise<number> {
  try {
    const entries = await fs.readdir(path.join(runRoot, 'issues'))
    return entries.length
  } catch {
    return 0
  }
}
