/**
 * Post-session isolation audit (phase-4 Unit 4).
 *
 * After all seats exit, walk the run directory and verify that the seat
 * agents respected their write-scope. Claude Code does NOT currently
 * support per-path-scoped `Write`, so this audit is the PRIMARY
 * path-confinement enforcement for `Write` (phase-4 I1 / D8). Any
 * violation flips the session to `status: ISOLATION_BREACH` in
 * `session.md`; coverage is still written so the run is not lost.
 *
 * Checks:
 *
 *   1. Every file under `<runDir>/seats/` and `<runDir>/suspicions/`
 *      matches the expected naming scheme (`seat-<id>.log.md` /
 *      `seat-<id>.suspicions.md`) AND maps to a seat that was part of
 *      the session.
 *   2. For every log / suspicion file, every parsed entry's `seat`
 *      field matches the filename's seat id (cross-seat contamination
 *      check — even if the agent guessed another seat's path, their
 *      declared `seat` field would expose it).
 *
 * Explicit non-goals:
 *
 *   - Completeness: missing files are NOT a breach. An agent that
 *     crashed early legitimately wrote zero entries. This audit is
 *     about SCOPE, not productivity.
 *   - Tool-call history: Claude Code's `Agent` tool does not expose
 *     per-call history to the parent process today. If that changes,
 *     wire it in here; for now, the frontmatter whitelist (phase-4
 *     Unit 1b / D2) is the enforcement for tool calls, and this
 *     audit catches the residue (file writes).
 *
 * QUARANTINE (insight 022): no imports from `src/server` or `src/shared`.
 */
import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parseSeatLog } from './log-parser'
import type { SeatHandle } from './types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BreachKind =
  | 'unexpected-file-in-seats-dir'
  | 'unexpected-file-in-suspicions-dir'
  | 'unknown-seat-in-filename'
  | 'cross-seat-contamination'

export interface IsolationBreach {
  readonly kind: BreachKind
  readonly path: string
  readonly detail: string
}

export interface IsolationAuditResult {
  readonly passed: boolean
  readonly breaches: readonly IsolationBreach[]
  readonly reportPath: string
  readonly checkedSeats: readonly string[]
}

// -----------------------------------------------------------------------------
// Filename patterns — captures the seat id for correlation against
// file contents in the cross-seat contamination check.
// -----------------------------------------------------------------------------

const LOG_FILENAME_RE = /^(seat-[A-Za-z0-9-]+)\.log\.md$/
const SUSP_FILENAME_RE = /^(seat-[A-Za-z0-9-]+)\.suspicions\.md$/

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function runIsolationAudit(
  runDir: string,
  seats: readonly SeatHandle[],
): Promise<IsolationAuditResult> {
  const seatIds = new Set(seats.map((s) => s.seatId))
  const breaches: IsolationBreach[] = []

  const seatsDir = path.join(runDir, 'seats')
  const suspDir = path.join(runDir, 'suspicions')

  await auditDir({
    dirPath: seatsDir,
    filenameRe: LOG_FILENAME_RE,
    unexpectedKind: 'unexpected-file-in-seats-dir',
    unknownSeatKind: 'unknown-seat-in-filename',
    seatIds,
    breaches,
  })

  await auditDir({
    dirPath: suspDir,
    filenameRe: SUSP_FILENAME_RE,
    unexpectedKind: 'unexpected-file-in-suspicions-dir',
    unknownSeatKind: 'unknown-seat-in-filename',
    seatIds,
    breaches,
  })

  await Promise.all([
    auditContents({
      dirPath: seatsDir,
      filenameRe: LOG_FILENAME_RE,
      seatIds,
      breaches,
    }),
    auditContents({
      dirPath: suspDir,
      filenameRe: SUSP_FILENAME_RE,
      seatIds,
      breaches,
    }),
  ])

  const reportPath = path.join(runDir, 'isolation-audit.md')
  await writeFile(reportPath, renderReport(seats, breaches), 'utf8')

  return {
    passed: breaches.length === 0,
    breaches,
    reportPath,
    checkedSeats: seats.map((s) => s.seatId),
  }
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

interface AuditDirInput {
  readonly dirPath: string
  readonly filenameRe: RegExp
  readonly unexpectedKind: BreachKind
  readonly unknownSeatKind: BreachKind
  readonly seatIds: ReadonlySet<string>
  readonly breaches: IsolationBreach[]
}

async function auditDir(input: AuditDirInput): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(input.dirPath)
  } catch {
    return
  }
  for (const entry of entries) {
    const match = entry.match(input.filenameRe)
    if (match === null) {
      input.breaches.push({
        kind: input.unexpectedKind,
        path: path.join(input.dirPath, entry),
        detail: `File does not match the expected naming scheme.`,
      })
      continue
    }
    const seatId = match[1] ?? ''
    if (!input.seatIds.has(seatId)) {
      input.breaches.push({
        kind: input.unknownSeatKind,
        path: path.join(input.dirPath, entry),
        detail: `Filename references seat id \`${seatId}\` which was not part of this session.`,
      })
    }
  }
}

interface AuditContentsInput {
  readonly dirPath: string
  readonly filenameRe: RegExp
  readonly seatIds: ReadonlySet<string>
  readonly breaches: IsolationBreach[]
}

async function auditContents(input: AuditContentsInput): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(input.dirPath)
  } catch {
    return
  }
  for (const entry of entries) {
    const match = entry.match(input.filenameRe)
    if (match === null) continue
    const expectedSeat = match[1] ?? ''
    if (!input.seatIds.has(expectedSeat)) continue

    const filePath = path.join(input.dirPath, entry)
    const parsed = await parseSeatLog(filePath).catch((err: unknown) => {
      input.breaches.push({
        kind: 'cross-seat-contamination',
        path: filePath,
        detail: `Failed to parse log file for contamination audit: ${err instanceof Error ? err.message : String(err)}`,
      })
      return null
    })
    if (parsed === null) continue

    for (const e of parsed.entries) {
      if (
        typeof e.seat === 'string' &&
        e.seat.length > 0 &&
        e.seat !== expectedSeat
      ) {
        input.breaches.push({
          kind: 'cross-seat-contamination',
          path: filePath,
          detail: `Entry declares \`seat: ${e.seat}\` but lives in the \`${expectedSeat}\` log file.`,
        })
      }
    }
  }
}

function renderReport(
  seats: readonly SeatHandle[],
  breaches: readonly IsolationBreach[],
): string {
  const lines: string[] = []
  lines.push('# Isolation Audit Report (phase-4 Unit 4)')
  lines.push('')
  lines.push(`- **Seats audited:** ${seats.length}`)
  lines.push(`- **Breaches:** ${breaches.length}`)
  lines.push(
    `- **Status:** ${breaches.length === 0 ? 'PASS' : 'ISOLATION_BREACH'}`,
  )
  lines.push('')
  lines.push('## Seats')
  lines.push('')
  for (const s of seats) {
    lines.push(`- \`${s.seatId}\` (${s.seatName})`)
  }
  lines.push('')
  if (breaches.length === 0) {
    lines.push('## Breaches')
    lines.push('')
    lines.push('_None._')
    lines.push('')
  } else {
    lines.push('## Breaches')
    lines.push('')
    for (const b of breaches) {
      lines.push(`- **${b.kind}** — \`${b.path}\``)
      lines.push(`  ${b.detail}`)
    }
    lines.push('')
  }
  lines.push('')
  lines.push('---')
  lines.push(
    '_Path-confinement for `Write` is enforced by this audit, not by a per-path flag on the Claude Code `Write` tool (phase-4 I1 / D8). If a future Claude Code build exposes per-path scope, wire it in at `.claude/agents/playtest-seat.md` and relax this audit to a consistency check._',
  )
  return lines.join('\n')
}
