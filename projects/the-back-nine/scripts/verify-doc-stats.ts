/**
 * Documentation test-count drift sentinel. Fails the build (exit 1) when a doc
 * surface that quotes the suite size ("NNN tests across NN files") disagrees with
 * the LIVE suite — or when two surfaces silently drift apart from each other.
 *
 * Why this exists: the test count + file count are hand-typed into README.md and
 * docs/roadmap.md. Adding a test stales them, and because the same fact lives on
 * two surfaces with no guard, they diverge — exactly the failure the engine's own
 * "a number is never re-typed" rule forbids (docs/architecture.md §8). The doc
 * cleanup that re-authored the docs from the requirements ledger could never catch
 * this: it audited narrative COHERENCE, never the RUNNING suite. This gate audits
 * the running suite.
 *
 * The ONLY honest source of truth for both counts is vitest's own collection
 * (`vitest list`): a glob UNDERCOUNTS (it misses scripts/__tests__/**), so a
 * hand-rolled glob guard would falsely flag the correct number as stale.
 *
 * Five more arms landed with the 2026-09-06 doc audit, which found that of the five
 * hand-typed numbers with a declared single home, four had rotted — every one of them
 * ungated. Arms 1–3 gate the survivors the same way the test count is gated; arms 4–5
 * gate the two doc facts the same audit found unguarded — where a citation POINTS, and
 * whether an insight can actually be READ:
 *   1. THE REGISTER'S OPEN COUNT (`docs/backlog.md`'s header) must equal what the file's
 *      own body holds — entry headings minus the ones marked closed — and the header's
 *      arithmetic must add up. It rotted twice by hand before this.
 *   2. THAT COUNT LIVES IN THE HEADER ONLY: no other doc may re-type "N open items" or
 *      "N-item open register" (the roadmap and TODO both did, and one sentence carried
 *      two different numbers).
 *   3. THE INSIGHTS INDEX (`docs/insights/README.md`) must list every insight file and
 *      nothing that does not exist — `/brief` and `/distill` key on it.
 *   4. EVERY LINE-NUMBERED CODE CITATION in the live docs must RESOLVE — the file exists,
 *      the line is in range and not blank, the range is well-formed.
 *   5. EVERY NUMBERED INSIGHT carries the four sections `/distill` declares required
 *      (`## Problem`, `## Root Cause`, `## Fix`, `## Key Insight`). Arm 3 only proves the
 *      index knows a file EXISTS; that says nothing about whether `/brief` can read a root
 *      cause out of it, and eleven files had to be normalized by hand before this landed.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Doc surfaces that quote the suite size and must stay in lockstep with reality. */
export const TRACKED_SURFACES = ['README.md', 'docs/roadmap.md'] as const

export interface SuiteCounts {
  cases: number
  files: number
}

/** Parse `vitest list` stdout → live (cases, files). Each line is
 *  `<file> > <describe...> > <test>`; the file is the text before the FIRST
 *  " > ". Lines without " > " are banner/noise and ignored. */
export function parseVitestList(stdout: string): SuiteCounts {
  const lines = stdout
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.includes(' > '))
  const files = new Set(lines.map((l) => l.slice(0, l.indexOf(' > ')).trim()))
  return { cases: lines.length, files: files.size }
}

/** Extract a "NNN tests/vitest across NN files" claim from doc content.
 *  Returns null when no claim is present — the caller treats that as a FAILURE,
 *  because a reworded claim that silently stops being checked is the
 *  vacuous-guard trap (a green check that proves nothing). */
export function extractClaim(content: string): SuiteCounts | null {
  const m = content.match(/(\d+)\s+(?:tests?|vitest)\s+across\s+(\d+)\s+files/i)
  if (!m) return null
  return { cases: Number(m[1]), files: Number(m[2]) }
}

export interface SurfaceResult {
  surface: string
  claim: SuiteCounts | null
  ok: boolean
  reason?: string
}

/** Compare each surface's claim against the live counts. A missing claim fails. */
export function checkDocStats(
  actual: SuiteCounts,
  surfaces: { surface: string; claim: SuiteCounts | null }[],
): { ok: boolean; results: SurfaceResult[] } {
  const results = surfaces.map(({ surface, claim }): SurfaceResult => {
    if (!claim) {
      return { surface, claim, ok: false, reason: 'no "NNN tests across NN files" claim found' }
    }
    if (claim.cases !== actual.cases || claim.files !== actual.files) {
      return {
        surface,
        claim,
        ok: false,
        reason: `claims ${claim.cases} tests / ${claim.files} files; live suite is ${actual.cases} / ${actual.files}`,
      }
    }
    return { surface, claim, ok: true }
  })
  return { ok: results.every((r) => r.ok), results }
}

// ---------------------------------------------------------------------------
// Arm 1 — the register's header must match its body.
// ---------------------------------------------------------------------------

/** The register whose header carries the ONLY copy of the open count. */
export const BACKLOG_SURFACE = 'docs/backlog.md'

export interface BacklogHeader {
  /** "**N open items**" */
  open: number
  /** "(M entries, …" */
  entries: number
  /** "…, K closed …" */
  closed: number
  /** "… two entries are half-closed and counted open …" — closed-MARKED headings that the
   *  header deliberately counts as open. Digits or the words one…nine; 0 when absent. */
  halfClosed: number
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
}

/** Parse the register's header claim. Null when the phrasing is gone — the caller treats
 *  that as a FAILURE (a reworded header that silently stops being checked is the same
 *  vacuous-guard trap as a reworded test-count claim). Only the first dozen lines are
 *  read: the header IS the home; a stray "N open items" lower in the body is arm 2's job. */
export function parseBacklogHeader(content: string): BacklogHeader | null {
  const head = content.replace(/\r\n/g, '\n').split('\n').slice(0, 12).join('\n')
  const m = head.match(/\*\*(\d+) open items\*\*\s*\((\d+) entries,\s*(\d+) closed/)
  if (!m) return null
  const h = head.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine)\s+entr(?:y|ies)\s+(?:is|are)\s+half-closed/i)
  const halfClosed = h ? (NUMBER_WORDS[h[1]!.toLowerCase()] ?? Number(h[1])) : 0
  return { open: Number(m[1]), entries: Number(m[2]), closed: Number(m[3]), halfClosed }
}

export interface BacklogBody {
  /** `### ` headings below the first `## Tier` heading. */
  entries: number
  /** Of those, the ones marked closed: struck through (`### ~~…`) or led by ✅. */
  closedMarked: number
}

/** Count the register's entries from its own body. Everything above the first tier heading
 *  (the preamble, the closure banner) is not an entry. */
export function countBacklogEntries(content: string): BacklogBody {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((l) => /^## Tier \d/.test(l))
  if (start < 0) return { entries: 0, closedMarked: 0 }
  let entries = 0
  let closedMarked = 0
  for (const l of lines.slice(start)) {
    if (!l.startsWith('### ')) continue
    entries += 1
    if (/^### (~~|✅)/.test(l)) closedMarked += 1
  }
  return { entries, closedMarked }
}

/** Header vs body: the entry count, the closed count (closed + the half-closed the header
 *  names), and the header's own arithmetic (open = entries − closed). */
export function checkBacklogCount(content: string): { ok: boolean; reason?: string } {
  const h = parseBacklogHeader(content)
  if (!h) return { ok: false, reason: 'no "**N open items** (M entries, K closed" header claim found' }
  const b = countBacklogEntries(content)
  if (b.entries === 0) return { ok: false, reason: 'no "### " entry headings found below a "## Tier" heading' }
  const problems: string[] = []
  if (h.entries !== b.entries) problems.push(`header says ${h.entries} entries; the body holds ${b.entries}`)
  if (h.closed + h.halfClosed !== b.closedMarked) {
    problems.push(
      `header says ${h.closed} closed + ${h.halfClosed} half-closed = ${h.closed + h.halfClosed}; the body marks ${b.closedMarked} headings ~~struck~~ or ✅`,
    )
  }
  if (h.open !== h.entries - h.closed) {
    problems.push(`header says ${h.open} open, but ${h.entries} entries − ${h.closed} closed = ${h.entries - h.closed}`)
  }
  return problems.length ? { ok: false, reason: problems.join('; ') } : { ok: true }
}

// ---------------------------------------------------------------------------
// Arm 2 — the open count lives in the register's header and nowhere else.
// ---------------------------------------------------------------------------

/** The two phrasings that have been re-typed (and rotted) outside the register. */
export const STRAY_COUNT = /\b\d+ open items\b|\b\d+-item open register\b/

/** Surfaces (other than the register) that re-type the open count. Fenced code is not
 *  exempt on purpose: a count in a code block rots the same way. */
export function findStrayCounts(docs: { surface: string; content: string }[]): string[] {
  return docs.filter((d) => STRAY_COUNT.test(d.content)).map((d) => d.surface)
}

// ---------------------------------------------------------------------------
// Arm 3 — the insights index matches the directory, both ways.
// ---------------------------------------------------------------------------

export const INSIGHTS_DIR = 'docs/insights'

/** Every `NNN-*.md` on disk is linked from the index; every `NNN-*.md` the index links exists. */
export function checkInsightsIndex(
  indexContent: string,
  files: string[],
): { ok: boolean; missingFromIndex: string[]; danglingInIndex: string[] } {
  const linked = new Set([...indexContent.matchAll(/\]\((\d{3}-[^)#\s]+\.md)\)/g)].map((m) => m[1]!))
  const onDisk = new Set(files.filter((f) => /^\d{3}-.*\.md$/.test(f)))
  const missingFromIndex = [...onDisk].filter((f) => !linked.has(f)).sort()
  const danglingInIndex = [...linked].filter((f) => !onDisk.has(f)).sort()
  return { ok: missingFromIndex.length === 0 && danglingInIndex.length === 0, missingFromIndex, danglingInIndex }
}

// ---------------------------------------------------------------------------
// Arm 5 — every numbered insight carries the four sections `/distill` declares required.
// Arm 3 proves the INDEX knows a file exists; this proves the FILE can be read.
// ---------------------------------------------------------------------------

/** The four headings `/distill` declares required in every insight file. */
export const INSIGHT_SECTIONS = ['## Problem', '## Root Cause', '## Fix', '## Key Insight'] as const

/**
 * Which required sections each numbered insight is missing (an empty result ⇒ every file complies).
 *
 * PREFIX match per line, ON PURPOSE: a heading may carry a trailing clause naming what it covers —
 * 016 heads its root-cause section `## Root Cause — the ways a browser-enforcement test is GREEN
 * while proving nothing`, 072 its fix `## Fix (three laws, one seam)` — and both count as PRESENT.
 * The boundary is end-of-line, whitespace, an em dash or an opening paren, so a DIFFERENT section
 * whose name merely STARTS with a required one (`## Root Causes`) does NOT count: an exact `^…$`
 * match would red 016 and 072, a bare `startsWith` would green a section that is not the one asked
 * for.
 *
 * Two things this deliberately does NOT gate:
 *   • `## Also Applies To` — eleven numbered insights legitimately end at `## Key Insight`, and the
 *     index itself calls that closing section "not universal". Requiring it would red files that are
 *     complete as written.
 *   • Section ORDER — 068 runs Problem → Root Cause → Key Insight → Fix, 072 runs Problem → Fix →
 *     Root Cause → Key Insight. Both read fine; gating order would force rewrites that change no
 *     meaning, and the sections are addressed by NAME (`/brief` greps them), never by position.
 *
 * Only `NNN-*.md` files are judged — `README.md` is the index, which is arm 3's job.
 */
export function checkInsightSections(
  files: { name: string; content: string }[],
): { file: string; missing: string[] }[] {
  const out: { file: string; missing: string[] }[] = []
  for (const { name, content } of files) {
    if (!/^\d{3}-.*\.md$/.test(name)) continue
    const body = content.replace(/\r\n/g, '\n')
    const missing = INSIGHT_SECTIONS.filter(
      (s) => !new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|\\s|—|\\()`, 'm').test(body),
    )
    if (missing.length > 0) out.push({ file: name, missing: [...missing] })
  }
  return out
}

/** The doc surfaces arm 2 sweeps: the three root docs + everything under docs/ except the
 *  register itself (its header is the home) and the insights (dated records may quote a
 *  count that was true when written). */
export function strayCountSurfaces(cwd: string): string[] {
  const out: string[] = ['README.md', 'CLAUDE.md', 'TODO.md'].filter((f) => existsSync(join(cwd, f)))
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'insights') walk(p)
      } else if (e.name.endsWith('.md')) {
        const rel = relative(cwd, p).replace(/\\/g, '/')
        if (rel !== BACKLOG_SURFACE) out.push(rel)
      }
    }
  }
  if (existsSync(join(cwd, 'docs'))) walk(join(cwd, 'docs'))
  return out
}

// ---------------------------------------------------------------------------
// Arm 4 — every line-numbered code citation resolves (the file exists; the line is in range and not
// blank). This is the STRUCTURAL half of anchor truth, zero false positives by construction. The
// semantic half — "is the cited THING still at that line" — cannot be gated without a fingerprint
// convention (an identifier-proximity heuristic measured 21–42 % false positives on freshly verified
// citations, 2026-09-06); it is re-verified by the anchor fleet at unit boundaries instead.
// ---------------------------------------------------------------------------

/** `file.ts:NNN` / `path/file.tsx:NNN-MMM` (en-dash ranges too), inside or outside backticks. */
export const CITATION = /((?:[\w.-]+\/)*[\w.-]+\.(?:ts|tsx|css|json|yml|html|mjs|cjs)):(\d+)(?:[-–](\d+))?/g

/** Blank out the INSIDE of every `<details>…</details>` block (archived reasoning, kept for the record —
 *  its citations describe the code as it was) while preserving line count, so line numbers in the
 *  report stay true. */
export function stripArchived(content: string): string {
  return content.replace(/<details>[\s\S]*?<\/details>/g, (block) => block.replace(/[^\n]/g, ' '))
}

export interface CitationProblem {
  surface: string
  line: number
  citation: string
  reason: string
}

/** `resolve(cited)` returns the cited file's lines, or null when no such file exists. A bare basename
 *  may match several files; the resolver returns the FIRST candidate whose range works, so the check
 *  stays zero-false-positive at the cost of not catching an ambiguous bare name. */
export function checkCitations(
  docs: { surface: string; content: string }[],
  resolve: (cited: string, from: number, to: number) => string[] | null,
): CitationProblem[] {
  const problems: CitationProblem[] = []
  for (const { surface, content } of docs) {
    const lines = stripArchived(content).replace(/\r\n/g, '\n').split('\n')
    lines.forEach((l, i) => {
      for (const m of l.matchAll(CITATION)) {
        const cited = m[1]!
        const from = Number(m[2])
        const to = m[3] ? Number(m[3]) : from
        if (to < from) { problems.push({ surface, line: i + 1, citation: m[0], reason: 'malformed range (end before start — write the full end line, e.g. 1812-1813)' }); continue }
        const src = resolve(cited, from, to)
        if (!src) { problems.push({ surface, line: i + 1, citation: m[0], reason: 'file not found' }); continue }
        if (from > src.length || to > src.length) { problems.push({ surface, line: i + 1, citation: m[0], reason: `out of range (file has ${src.length} lines)` }); continue }
        if (src.slice(from - 1, to).every((s) => s.trim() === '')) problems.push({ surface, line: i + 1, citation: m[0], reason: 'cites only blank line(s)' })
      }
    })
  }
  return problems
}

/** Docs whose citations are LIVE claims: the queue, the register, and every doc under docs/ except the
 *  insights and the dated logs (a council row or a cold-read entry cites a line as it was). */
export const CITATION_LOG_SURFACES = ['docs/council-log.md', 'docs/caddie/cold-read-log.md', 'docs/caddie/tape.md'] as const

export function citationSurfaces(cwd: string): string[] {
  const out: string[] = ['TODO.md']
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'insights') walk(p)
      } else if (e.name.endsWith('.md')) {
        const rel = relative(cwd, p).replace(/\\/g, '/')
        if (!(CITATION_LOG_SURFACES as readonly string[]).includes(rel)) out.push(rel)
      }
    }
  }
  if (existsSync(join(cwd, 'docs'))) walk(join(cwd, 'docs'))
  return out.filter((f) => existsSync(join(cwd, f)))
}

/** Index every source-ish file under the project (plus the monorepo-root workflow dir, where CI lives)
 *  by basename, so a bare `staleness.ts:627` resolves. */
export function buildSourceResolver(cwd: string): (cited: string, from: number, to: number) => string[] | null {
  const byBase = new Map<string, string[]>()
  const SKIP = new Set(['node_modules', '.git', 'dist', 'temp', '.playwright-mcp', 'coverage'])
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p) }
      else if (/\.(ts|tsx|css|json|yml|html|mjs|cjs)$/.test(e.name)) {
        const list = byBase.get(e.name) ?? []
        list.push(p)
        byBase.set(e.name, list)
      }
    }
  }
  walk(cwd)
  walk(join(cwd, '..', '..', '.github'))
  const cache = new Map<string, string[]>()
  const linesOf = (p: string): string[] => {
    let v = cache.get(p)
    if (!v) { v = readFileSync(p, 'utf-8').replace(/\r\n/g, '\n').split('\n'); cache.set(p, v) }
    return v
  }
  return (cited, from, to) => {
    const direct = join(cwd, cited)
    if (cited.includes('/') && existsSync(direct)) return linesOf(direct)
    const base = cited.split('/').pop()!
    const candidates = (byBase.get(base) ?? []).filter((p) => p.replace(/\\/g, '/').endsWith(cited))
    if (candidates.length === 0) return null
    const inRange = candidates.find((p) => { const l = linesOf(p); return to <= l.length && !l.slice(from - 1, to).every((s) => s.trim() === '') })
    return linesOf(inRange ?? candidates[0]!)
  }
}

/** Resolve vitest's own CLI entry from its package.json `bin` — so we invoke it
 *  through `node` directly (no shell, no `pnpm.cmd` Windows resolution problem,
 *  no command string for anything to inject into). */
function vitestBin(): string {
  const require = createRequire(import.meta.url)
  const pkgPath = require.resolve('vitest/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { bin?: string | Record<string, string> }
  const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.vitest
  if (!rel) throw new Error('could not resolve the vitest binary from its package.json')
  return join(dirname(pkgPath), rel)
}

function liveCounts(): SuiteCounts {
  // execFileSync with an argument array — shell-free; the only inputs are the
  // node executable and the resolved vitest bin path, neither user-controlled.
  const stdout = execFileSync(process.execPath, [vitestBin(), 'list'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const counts = parseVitestList(stdout)
  if (counts.cases === 0) {
    throw new Error('`vitest list` produced no test cases — collection failed.')
  }
  return counts
}

function main(): number {
  let actual: SuiteCounts
  try {
    actual = liveCounts()
  } catch (e) {
    console.error(`[verify:doc-stats] could not collect the live suite: ${(e as Error).message}`)
    return 1
  }

  const surfaces = TRACKED_SURFACES.map((surface) => {
    const path = join(process.cwd(), surface)
    const claim = existsSync(path) ? extractClaim(readFileSync(path, 'utf-8')) : null
    return { surface, claim }
  })

  const { ok, results } = checkDocStats(actual, surfaces)
  for (const r of results) {
    if (r.ok) console.log(`  OK     ${r.surface} — ${r.claim!.cases} tests / ${r.claim!.files} files`)
    else console.error(`  STALE  ${r.surface} — ${r.reason}`)
  }
  let failed = !ok
  if (!ok) {
    console.error(
      `[verify:doc-stats] a doc surface disagrees with the live suite (${actual.cases} tests / ${actual.files} files). Update the count(s) above.`,
    )
  }

  // Arm 1 — the register's header vs its body.
  const cwd = process.cwd()
  const backlogPath = join(cwd, BACKLOG_SURFACE)
  const backlog = existsSync(backlogPath) ? readFileSync(backlogPath, 'utf-8') : ''
  const reg = checkBacklogCount(backlog)
  if (reg.ok) {
    const h = parseBacklogHeader(backlog)!
    console.log(`  OK     ${BACKLOG_SURFACE} — ${h.open} open (${h.entries} entries, ${h.closed} closed) matches the body`)
  } else {
    failed = true
    console.error(`  STALE  ${BACKLOG_SURFACE} — ${reg.reason}`)
  }

  // Arm 2 — that count lives in the header only.
  const stray = findStrayCounts(
    strayCountSurfaces(cwd).map((surface) => ({ surface, content: readFileSync(join(cwd, surface), 'utf-8') })),
  )
  if (stray.length === 0) {
    console.log(`  OK     the open count is typed nowhere but ${BACKLOG_SURFACE}'s header`)
  } else {
    failed = true
    for (const s of stray) console.error(`  STRAY  ${s} — re-types the register's open count ("N open items" / "N-item open register"); point at the header instead`)
  }

  // Arm 3 — the insights index vs the directory.
  const insightsDir = join(cwd, INSIGHTS_DIR)
  const indexPath = join(insightsDir, 'README.md')
  const idx = checkInsightsIndex(
    existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : '',
    existsSync(insightsDir) ? readdirSync(insightsDir) : [],
  )
  if (idx.ok) {
    console.log(`  OK     ${INSIGHTS_DIR}/README.md — every insight indexed, every indexed insight exists`)
  } else {
    failed = true
    for (const f of idx.missingFromIndex) console.error(`  STALE  ${INSIGHTS_DIR}/README.md — ${f} exists but is not indexed`)
    for (const f of idx.danglingInIndex) console.error(`  STALE  ${INSIGHTS_DIR}/README.md — links ${f}, which does not exist`)
  }

  // Arm 4 — every line-numbered citation resolves.
  const citationDocs = citationSurfaces(cwd).map((surface) => ({ surface, content: readFileSync(join(cwd, surface), 'utf-8') }))
  const problems = checkCitations(citationDocs, buildSourceResolver(cwd))
  const citationCount = citationDocs.reduce((n, d) => n + [...stripArchived(d.content).matchAll(CITATION)].length, 0)
  if (problems.length === 0) {
    console.log(`  OK     ${citationCount} line-numbered citations across ${citationDocs.length} docs resolve (file exists, line in range, not blank)`)
  } else {
    failed = true
    for (const p of problems) console.error(`  STALE  ${p.surface}:${p.line} — ${p.citation} — ${p.reason}`)
  }

  // Arm 5 — every numbered insight carries the four required sections.
  const insightFiles = (existsSync(insightsDir) ? readdirSync(insightsDir) : [])
    .filter((f) => /^\d{3}-.*\.md$/.test(f))
    .map((name) => ({ name, content: readFileSync(join(insightsDir, name), 'utf-8') }))
  const sectionGaps = checkInsightSections(insightFiles)
  if (sectionGaps.length === 0) {
    console.log(`  OK     ${INSIGHTS_DIR} — every numbered insight carries Problem / Root Cause / Fix / Key Insight`)
  } else {
    failed = true
    for (const g of sectionGaps) console.error(`  STALE  ${INSIGHTS_DIR}/${g.file} — missing ${g.missing.join(', ')}`)
  }

  if (failed) {
    console.error('[verify:doc-stats] FAILED — see the STALE / STRAY lines above.')
    return 1
  }
  console.log(
    `[verify:doc-stats] OK — every tracked surface matches the live suite (${actual.cases} tests / ${actual.files} files); the register header, its single home, the insights index, every line-numbered citation and every insight's four required sections hold.`,
  )
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main())
}
