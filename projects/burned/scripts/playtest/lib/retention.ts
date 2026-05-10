/**
 * Retention policy — rolling session-directory rotation + operator-invoked
 * purge (Phase 3 Unit 10b / plan D15).
 *
 * Two independent concerns live here:
 *
 *   1. `selectForRotation` / `applyRetention` — keeps the N newest session
 *      directories under `outputRoot`, deletes the rest. Called once per
 *      orchestrator run (Unit 6 step 15). v1 has NO archive mode — rotated
 *      dirs are removed directly. Archive mode was removed in H-2b because
 *      archives accumulate without auto-delete, trading one disk-pressure
 *      problem for another with no concrete retrieval need.
 *
 *   2. `selectForPurge` / `applyPurge` — operator-invoked explicit deletion
 *      via `pnpm playtest:purge` (see `../purge.ts`). Never fires implicitly.
 *
 * Both selection functions are pure (testable without FS). The two apply
 * functions do FS ops AND append a JSONL audit record to
 * `<outputRoot>/_retention.log` for every decision (rotate / keep /
 * skip-unparseable / purge).
 *
 * Safety: both delete paths resolve the target against `outputRoot` and
 * refuse to touch anything outside, or `outputRoot` itself. See
 * `assertInsideOutputRoot`.
 *
 * Insight-022 boundary: Node stdlib only. No `src/server` imports.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// -----------------------------------------------------------------------------
// Session-dir name parsing.
//
// Per plan D8, run-directory names follow `YYYY-MM-DD-HHMM-<N>p` with an
// optional `-<K>` collision suffix (K >= 2). Anything else is unparseable
// and MUST be left alone.
// -----------------------------------------------------------------------------

/** `2026-04-24-1430-3p` or `2026-04-24-1430-3p-2` etc. */
const SESSION_DIR_NAME_RE =
  /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})-(\d+)p(?:-\d+)?$/

export interface DirEntry {
  readonly name: string
  readonly sessionDate: Date
}

/**
 * Parse a session-dir name into `DirEntry`. Returns `null` if the name
 * doesn't match the contract — callers surface these into `skipped` rather
 * than silently ignoring.
 */
export function parseSessionDirName(name: string): DirEntry | null {
  const m = SESSION_DIR_NAME_RE.exec(name)
  if (!m) return null
  const [, y, mo, d, h, mi] = m
  // Local-time construction matches D8 ("local ISO timestamp"). `new Date(y,
  // mo-1, d, h, mi)` is local-TZ by definition.
  const sessionDate = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  )
  return { name, sessionDate }
}

// -----------------------------------------------------------------------------
// Pure selection — tested exhaustively in retention.test.ts.
// -----------------------------------------------------------------------------

/**
 * Sort dirs by session date DESC, keep top `sessionDirRetention`, rotate
 * the rest. Tie-break by `name` DESC so collision variants (`...-2`, `...-3`)
 * have deterministic order (they share a `sessionDate`).
 */
export function selectForRotation(
  dirs: readonly DirEntry[],
  sessionDirRetention: number,
): { readonly keep: DirEntry[]; readonly rotate: DirEntry[] } {
  const sorted = [...dirs].sort((a, b) => {
    const dt = b.sessionDate.getTime() - a.sessionDate.getTime()
    if (dt !== 0) return dt
    // Tie: name DESC. `...-2` sorts after `...` (bare); `...-3` after `...-2`.
    if (a.name < b.name) return 1
    if (a.name > b.name) return -1
    return 0
  })
  const keep = sorted.slice(0, sessionDirRetention)
  const rotate = sorted.slice(sessionDirRetention)
  return { keep, rotate }
}

/**
 * Partition dirs into `purge` / `keep` around an optional cutoff.
 *
 * - `before` provided → purge every dir with `sessionDate < before`.
 * - `before` undefined → empty purge set (operator-invoked only; no implicit
 *   deletion).
 */
export function selectForPurge(
  dirs: readonly DirEntry[],
  before?: Date,
): { readonly purge: DirEntry[]; readonly keep: DirEntry[] } {
  if (before === undefined) {
    return { purge: [], keep: [...dirs] }
  }
  const cutoff = before.getTime()
  const purge: DirEntry[] = []
  const keep: DirEntry[] = []
  for (const d of dirs) {
    if (d.sessionDate.getTime() < cutoff) purge.push(d)
    else keep.push(d)
  }
  return { purge, keep }
}

// -----------------------------------------------------------------------------
// FS apply — retention.
// -----------------------------------------------------------------------------

export interface RetentionResult {
  readonly kept: string[]
  readonly rotated: string[]
  readonly skipped: ReadonlyArray<{ readonly name: string; readonly reason: string }>
}

export interface ApplyRetentionOptions {
  readonly outputRoot: string
  readonly sessionDirRetention: number
}

/**
 * List `outputRoot`, classify entries, delete rotated dirs, log everything.
 */
export async function applyRetention(
  opts: ApplyRetentionOptions,
): Promise<RetentionResult> {
  const outputRoot = path.resolve(opts.outputRoot)
  const retention = opts.sessionDirRetention

  const names = await listDirents(outputRoot)

  const parseable: DirEntry[] = []
  const skipped: Array<{ name: string; reason: string }> = []
  for (const name of names) {
    // `_retention.log` (and any other underscore-prefixed sidecar) is our own
    // bookkeeping — filter silently by name rather than surfacing as "skipped".
    if (name.startsWith('_')) continue
    const parsed = parseSessionDirName(name)
    if (parsed === null) {
      skipped.push({ name, reason: 'unparseable' })
      continue
    }
    parseable.push(parsed)
  }

  const { keep, rotate } = selectForRotation(parseable, retention)

  const logPath = path.join(outputRoot, '_retention.log')
  const logLines: string[] = []
  const ts = new Date().toISOString()

  for (const entry of keep) {
    logLines.push(JSON.stringify({ ts, action: 'keep', dir: entry.name }))
  }
  for (const entry of skipped) {
    logLines.push(
      JSON.stringify({
        ts,
        action: 'skip-unparseable',
        dir: entry.name,
        reason: entry.reason,
      }),
    )
  }

  const rotated: string[] = []
  for (const entry of rotate) {
    const target = path.join(outputRoot, entry.name)
    assertInsideOutputRoot(outputRoot, target)
    await fs.rm(target, { recursive: true, force: true })
    rotated.push(entry.name)
    logLines.push(JSON.stringify({ ts, action: 'rotate', dir: entry.name }))
  }

  if (logLines.length > 0) {
    await fs.appendFile(logPath, logLines.join('\n') + '\n', 'utf8')
  }

  return {
    kept: keep.map(k => k.name),
    rotated,
    skipped,
  }
}

// -----------------------------------------------------------------------------
// FS apply — purge.
// -----------------------------------------------------------------------------

export interface PurgeOptions {
  readonly outputRoot: string
  readonly before?: Date
  readonly sessionId?: string
  readonly fullDir?: boolean
}

export interface PurgeResult {
  readonly purged: string[]
  readonly kept: string[]
  readonly mode: 'full-dir' | 'events-only'
}

/**
 * Files the default (events-only) mode deletes from each matching session
 * dir. `session.md`, `coverage.md`, `issues/`, `seats/`, `suspicions/`
 * intentionally preserved for post-mortem.
 */
const EVENTS_ONLY_TARGETS = ['server/events.jsonl', 'server/connections.jsonl'] as const

export async function applyPurge(opts: PurgeOptions): Promise<PurgeResult> {
  const outputRoot = path.resolve(opts.outputRoot)
  const mode: 'full-dir' | 'events-only' = opts.fullDir ? 'full-dir' : 'events-only'

  // Build candidate list.
  let candidates: DirEntry[]
  if (opts.sessionId !== undefined) {
    const parsed = parseSessionDirName(opts.sessionId)
    if (parsed === null) {
      throw new Error(
        `purge: --session-id ${JSON.stringify(opts.sessionId)} does not match YYYY-MM-DD-HHMM-Np`,
      )
    }
    // Verify the dir exists before proceeding — otherwise operator typos
    // silently no-op.
    const fullPath = path.join(outputRoot, opts.sessionId)
    try {
      const st = await fs.stat(fullPath)
      if (!st.isDirectory()) {
        throw new Error(`purge: ${opts.sessionId} exists but is not a directory`)
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`purge: session dir not found: ${opts.sessionId}`)
      }
      throw err
    }
    candidates = [parsed]
  } else {
    const names = await listDirents(outputRoot)
    const parseable: DirEntry[] = []
    for (const name of names) {
      if (name.startsWith('_')) continue
      const p = parseSessionDirName(name)
      if (p !== null) parseable.push(p)
    }
    const { purge } = selectForPurge(parseable, opts.before)
    candidates = purge
  }

  const logPath = path.join(outputRoot, '_retention.log')
  const logLines: string[] = []
  const ts = new Date().toISOString()

  const purged: string[] = []
  for (const entry of candidates) {
    const dir = path.join(outputRoot, entry.name)
    assertInsideOutputRoot(outputRoot, dir)

    if (mode === 'full-dir') {
      await fs.rm(dir, { recursive: true, force: true })
      logLines.push(
        JSON.stringify({ ts, action: 'purge', dir: entry.name, mode: 'full-dir' }),
      )
    } else {
      for (const rel of EVENTS_ONLY_TARGETS) {
        const target = path.join(dir, rel)
        assertInsideOutputRoot(outputRoot, target)
        await fs.rm(target, { force: true })
      }
      logLines.push(
        JSON.stringify({
          ts,
          action: 'purge',
          dir: entry.name,
          mode: 'events-only',
          files: [...EVENTS_ONLY_TARGETS],
        }),
      )
    }
    purged.push(entry.name)
  }

  if (logLines.length > 0) {
    await fs.appendFile(logPath, logLines.join('\n') + '\n', 'utf8')
  }

  // `kept` is the set of surviving session dirs after the purge. Computing
  // it when --session-id is used isn't meaningful (we didn't enumerate), so
  // return an empty kept list in that mode — callers that care should
  // enumerate themselves.
  const kept: string[] = []
  if (opts.sessionId === undefined) {
    const names = await listDirents(outputRoot).catch(() => [] as string[])
    for (const name of names) {
      if (name.startsWith('_')) continue
      if (parseSessionDirName(name) === null) continue
      if (purged.includes(name)) continue
      kept.push(name)
    }
  }

  return { purged, kept, mode }
}

// -----------------------------------------------------------------------------
// Helpers.
// -----------------------------------------------------------------------------

/**
 * List `outputRoot`'s immediate children (directories only). Returns `[]`
 * if the dir doesn't exist — callers treat empty as "nothing to do" rather
 * than erroring, so a first-ever orchestrator run has no retention work.
 */
async function listDirents(outputRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(outputRoot, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/**
 * Belt-and-suspenders delete-safety guard. Refuses to proceed if the target
 * isn't strictly inside `outputRoot`, or IS `outputRoot` itself, or if
 * `outputRoot` is the filesystem root. Exported for test coverage.
 */
export function assertInsideOutputRoot(outputRoot: string, target: string): void {
  const resolvedRoot = path.resolve(outputRoot)
  const resolvedTarget = path.resolve(target)
  if (resolvedTarget === resolvedRoot) {
    throw new Error(
      `retention: refusing to delete outputRoot itself (${resolvedRoot})`,
    )
  }
  // Parent of root == root means outputRoot resolved to a filesystem root
  // ("/" or "C:\"). Refuse to operate at all from there — rotating under `/`
  // is never a legitimate harness configuration.
  if (path.dirname(resolvedRoot) === resolvedRoot) {
    throw new Error(
      `retention: refusing to operate at filesystem root (${resolvedRoot})`,
    )
  }
  const rel = path.relative(resolvedRoot, resolvedTarget)
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
    throw new Error(
      `retention: target ${JSON.stringify(resolvedTarget)} is not inside outputRoot ${JSON.stringify(resolvedRoot)}`,
    )
  }
}
