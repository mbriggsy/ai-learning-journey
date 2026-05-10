#!/usr/bin/env tsx
/**
 * `pnpm playtest:purge` entrypoint (Phase 3 Unit 10b).
 *
 * Operator-invoked manual purge for session dirs under
 * `docs/testing/playtest/runs/`. Rolling retention
 * (`sessionDirRetention = 10`) runs automatically on every session finalize
 * (Unit 6 step 15); this command exists for explicit, targeted deletion —
 * e.g. after a `--no-scrub` investigation leaves sensitive raw hands on
 * disk, or when the operator wants to roll back a batch of runs before the
 * rolling retention would catch them.
 *
 * Exit codes:
 *   0 — purge completed (or --help).
 *   1 — runtime error (delete refused, session dir missing, etc).
 *   2 — invalid/missing selection flags.
 */
import { applyPurge } from './lib/retention'

const DEFAULT_OUTPUT_ROOT = 'docs/testing/playtest/runs'

const USAGE = `
Usage: pnpm playtest:purge [options]

Manually purges session dirs under ${DEFAULT_OUTPUT_ROOT}/. Rolling
retention (sessionDirRetention = 10) runs automatically on every session
finalize — this command is for explicit, operator-initiated deletion
(e.g. after a --no-scrub investigation).

Options:
  --before <YYYY-MM-DD>   Delete all sessions dated before this date.
  --session-id <id>       Delete a specific session by id
                          (e.g. 2026-04-23-1430-3p).
  --full-dir              Delete the entire session directory. Without this
                          flag, only events.jsonl + connections.jsonl are
                          removed — session.md, coverage.md, issues/ stay.
  --root <path>           Override outputRoot (default: ${DEFAULT_OUTPUT_ROOT}).
  --help, -h              Print this message.

See scripts/playtest/README.md for when to purge vs wait for rolling
retention.
`.trim()

export interface ParsedArgs {
  readonly help: boolean
  readonly before?: string
  readonly sessionId?: string
  readonly fullDir: boolean
  readonly root?: string
}

/**
 * Hand-rolled argv parser. Exported for unit tests. Mirrors the style of
 * `scripts/launch-dev-chrome.ts` — no minimist / commander.
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  let help = false
  let before: string | undefined
  let sessionId: string | undefined
  let fullDir = false
  let root: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      help = true
      continue
    }
    if (a === '--full-dir') {
      fullDir = true
      continue
    }
    if (a === '--before') {
      before = argv[++i]
      continue
    }
    if (a === '--session-id') {
      sessionId = argv[++i]
      continue
    }
    if (a === '--root') {
      root = argv[++i]
      continue
    }
    if (a?.startsWith('--before=')) {
      before = a.slice('--before='.length)
      continue
    }
    if (a?.startsWith('--session-id=')) {
      sessionId = a.slice('--session-id='.length)
      continue
    }
    if (a?.startsWith('--root=')) {
      root = a.slice('--root='.length)
      continue
    }
    throw new Error(`purge: unknown argument ${JSON.stringify(a)}`)
  }

  return { help, before, sessionId, fullDir, root }
}

/**
 * Parse `YYYY-MM-DD` into a local-midnight `Date`. Throws on malformed
 * input — no quiet fallbacks (operator mistypes a date, we should stop).
 */
function parseBeforeDate(s: string): Date {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!matched) {
    throw new Error(
      `purge: --before must be YYYY-MM-DD (got ${JSON.stringify(s)})`,
    )
  }
  const [, y, mo, d] = matched
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0)
  if (isNaN(date.getTime())) {
    throw new Error(`purge: --before parsed to invalid date (${JSON.stringify(s)})`)
  }
  return date
}

export interface CliResult {
  readonly exitCode: number
  readonly stdout: string[]
  readonly stderr: string[]
}

/**
 * Pure-ish CLI runner. Exported so tests can call it directly instead of
 * spawning a subprocess. Does all FS work through `applyPurge`.
 */
export async function runPurgeCli(argv: readonly string[]): Promise<CliResult> {
  const stdout: string[] = []
  const stderr: string[] = []

  let parsed: ParsedArgs
  try {
    parsed = parseArgs(argv)
  } catch (err) {
    stderr.push((err as Error).message)
    stderr.push(USAGE)
    return { exitCode: 2, stdout, stderr }
  }

  if (parsed.help) {
    stdout.push(USAGE)
    return { exitCode: 0, stdout, stderr }
  }

  if (parsed.before === undefined && parsed.sessionId === undefined) {
    stderr.push(
      'purge: no selection criteria — pass --before <YYYY-MM-DD> or --session-id <id>',
    )
    stderr.push(USAGE)
    return { exitCode: 2, stdout, stderr }
  }

  if (parsed.before !== undefined && parsed.sessionId !== undefined) {
    stderr.push('purge: --before and --session-id are mutually exclusive')
    return { exitCode: 2, stdout, stderr }
  }

  const outputRoot = parsed.root ?? DEFAULT_OUTPUT_ROOT

  let before: Date | undefined
  if (parsed.before !== undefined) {
    try {
      before = parseBeforeDate(parsed.before)
    } catch (err) {
      stderr.push((err as Error).message)
      return { exitCode: 2, stdout, stderr }
    }
  }

  try {
    const result = await applyPurge({
      outputRoot,
      before,
      sessionId: parsed.sessionId,
      fullDir: parsed.fullDir,
    })
    stdout.push(`purge mode: ${result.mode}`)
    stdout.push(`purged: ${result.purged.length}`)
    for (const name of result.purged) stdout.push(`  - ${name}`)
    if (parsed.sessionId === undefined) {
      stdout.push(`kept: ${result.kept.length}`)
    }
    return { exitCode: 0, stdout, stderr }
  } catch (err) {
    stderr.push(`purge failed: ${(err as Error).message}`)
    return { exitCode: 1, stdout, stderr }
  }
}

// -----------------------------------------------------------------------------
// Top-level invocation guard — only runs when launched as a script (via
// `pnpm playtest:purge` / `tsx`), NOT when imported by a test.
// -----------------------------------------------------------------------------

const entry = process.argv[1] ?? ''
const isMain = entry.endsWith('purge.ts') || entry.endsWith('purge.js')

if (isMain) {
  runPurgeCli(process.argv.slice(2)).then(result => {
    for (const line of result.stdout) console.log(line)
    for (const line of result.stderr) console.error(line)
    process.exit(result.exitCode)
  }).catch(err => {
    console.error(`purge: fatal — ${(err as Error).message}`)
    process.exit(1)
  })
}
