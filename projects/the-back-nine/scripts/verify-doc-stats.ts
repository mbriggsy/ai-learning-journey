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
 *
 * Arm 6 landed with the 2026-11-09 TODO cleanup: TODO.MD STAYS A QUEUE a session can read at every
 * start — one START HERE with no chain of earlier sessions, one close block, one LANDMINES block, no
 * per-session DISTILL CANDIDATES block (one `## Distill candidates` list instead), and a capped start-of-file
 * section. The file had grown to 321K characters (324K bytes) at its peak, `b6d6032d`, by habits no rule gated (the
 * arm's own comment).
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

/** The three phrasings that have been re-typed (and rotted) outside the register — the third is TODO's
 *  close STATE line ("the register 119 open"), found by the 2026-10-16 doc audit. */
export const STRAY_COUNT = /\b\d+ open items\b|\b\d+-item open register\b|\bregister \d+ open\b/

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

/** A BARE continuation — a backticked `:NNN`, `:NNN-MMM`, or comma list (`:928, :933`) — continues
 *  the nearest NAMED citation before it on the same line, and is checked against that file. The
 *  2026-09-11 evening re-anchor pass proved the class: every named citation moved with the diff and
 *  every bare sibling stayed at its old number, pointing at comments (the 2026-09-10 fleet had
 *  re-anchored 287 of them by hand). A token preceded by "not `" or "-at-filing`" is a RECORDED
 *  refuted anchor — frozen on purpose, never checked. A bare token with no named citation before it
 *  on its line is unattributable here (the queue's own rule: name the file in prose first). */
export const BARE_CONTINUATION = /`:\d+(?:[-–]\d+)?(?:,\s*:\d+(?:[-–]\d+)?)*`/g

/** Blank out the INSIDE of every `<details>…</details>` block (archived reasoning, kept for the record —
 *  its citations describe the code as it was) while preserving line count, so line numbers in the
 *  report stay true. Both tags count only where they open their own line: an inline code mention of the
 *  tag (TODO's "a `<details>` disclosure") once opened a phantom block that ran to the next real close
 *  and hid every live citation between them. */
export function stripArchived(content: string): string {
  return content.replace(/^[ \t]*<details>[\s\S]*?^[ \t]*<\/details>/gm, (block) => block.replace(/[^\n]/g, ' '))
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
      const check = (cited: string, from: number, to: number, citation: string): void => {
        if (to < from) { problems.push({ surface, line: i + 1, citation, reason: 'malformed range (end before start — write the full end line, e.g. 1812-1813)' }); return }
        const src = resolve(cited, from, to)
        if (!src) { problems.push({ surface, line: i + 1, citation, reason: 'file not found' }); return }
        if (from > src.length || to > src.length) { problems.push({ surface, line: i + 1, citation, reason: `out of range (file has ${src.length} lines)` }); return }
        if (src.slice(from - 1, to).every((s) => s.trim() === '')) problems.push({ surface, line: i + 1, citation, reason: 'cites only blank line(s)' })
      }
      const named: { idx: number; cited: string }[] = []
      for (const m of l.matchAll(CITATION)) {
        named.push({ idx: m.index!, cited: m[1]! })
        check(m[1]!, Number(m[2]), m[3] ? Number(m[3]) : Number(m[2]), m[0])
      }
      // The bare continuations — checked against the nearest NAMED citation before them on the line.
      if (named.length === 0) return
      for (const m of l.matchAll(BARE_CONTINUATION)) {
        const idx = m.index!
        const prev = named.filter((n) => n.idx < idx).pop()
        if (!prev) continue
        const before = l.slice(0, idx)
        if (/not\s*`?$/.test(before) || /-at-filing`?$/.test(before)) continue // a recorded refuted anchor, frozen on purpose
        for (const t of m[0].slice(1, -1).split(',')) {
          const r = /:(\d+)(?:[-–](\d+))?/.exec(t.trim())
          if (!r) continue
          check(prev.cited, Number(r[1]), r[2] ? Number(r[2]) : Number(r[1]), `${prev.cited} (bare \`${t.trim()}\`)`)
        }
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
 *  by basename, so a bare `staleness.ts:883` resolves. */
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

// ---------------------------------------------------------------------------
// Arm 6 — TODO.md stays a queue a session can read at every start.
//
// Why (measured 2026-11-09 over b9-2..b9-8's transcripts): the file had grown from 143K characters on
// 2026-10-01 (`d609d271`) to 321K at its peak (`b6d6032d`, 324K bytes), and each session paid 17–29K tokens
// reading slices of its top ~500 lines before its first edit. The rules already said "no session history" (this file's own header) and "keep only
// the newest close block" (squeaky's TODO step), and were beaten anyway by three habits nothing gated:
//   • START HERE was added to, never rewritten: it carried ten "rewritten by b9-N — …" links back
//     through earlier sessions;
//   • each close opened its own DISTILL CANDIDATES block (21 had piled up) and its own LANDMINES block,
//     which the prune then moved into standing piles that never shrank (landmines reached ~40% of the
//     file, and no session read them at start);
//   • finished phases stayed in the live item, crossed out.
// The cleanup moved the landmines to docs/landmines.md (by area) and the candidates to ONE
// `## Distill candidates` list; this arm keeps it that way. Each message names the habit and its fix.
// ---------------------------------------------------------------------------

export const TODO_SURFACE = 'TODO.md'

/** START HERE names the next move and the steps owed after it, measured as its whole paragraph: the ▶ line
 *  and the lines wrapped after it. b9-8's own part (before its chain of earlier sessions) ran 230 characters
 *  at `b6d6032d`; after the 2026-11-09 cleanup and its review's fix round the paragraph runs 1,221 over three
 *  lines (its ▶ line 1,031). The cap leaves room for a sizable job's owed list. */
export const START_HERE_MAX = 1500

/** Everything above the first `## ` heading outside a fence is what a session reads at start: the header,
 *  START HERE, the live item's prescription, the close block and the ranked queue. 46,637 characters after
 *  the 2026-11-09 cleanup and its review's fix round (118,471 at `ec3514a7`, just before it); the cap leaves
 *  room for a larger prescription. The arm requires START HERE, the close block and its LANDMINES above that
 *  heading; text after them (the ranked D7 queue and the standing pointers) stays capped only while no `## `
 *  heading is put above it. */
export const TODO_HEAD_MAX = 60_000

export const DISTILL_HEADING = '## Distill candidates'

const START_HERE_LINE = /^▶ \*\*START HERE\b/
// The block labels in any letter case: the closes have written "**Landmines the 2026-09-05 session added:**".
const SESSION_BLOCK = /^\*\*session \d{4}-\d{2}-\d{2}\b/i
const DISTILL_BLOCK = /^\*\*distill candidates\b/i
const LANDMINES_BLOCK = /^\*\*landmines\b/i
/** What ends START HERE's paragraph: a blank line, a list item or a heading. Any other line is a wrapped line of it. */
const PARAGRAPH_END = /^\s*$|^\s*(?:\d+[.)]|[-*+]) |^#{1,6}\s/
const FENCE = /^\s*(?:`{3,}|~{3,})/

/** The index of the first `## ` heading outside a fenced block, or -1. A `## ` line inside a fence (a shell
 *  comment, a markdown sample) is not a heading. A fence closes only on its own marker (``` or ~~~). */
function firstH2Index(lines: readonly string[]): number {
  let fence: string | null = null
  for (const [i, line] of lines.entries()) {
    if (FENCE.test(line)) {
      const marker = line.trimStart().charAt(0)
      if (fence === null) fence = marker
      else if (marker === fence) fence = null
      continue
    }
    if (fence === null && /^## /.test(line)) return i
  }
  return -1
}

/** Every way the TODO has drifted from a queue (an empty result ⇒ the shape holds). */
export function checkTodoShape(content: string): string[] {
  const body = content.replace(/\r\n/g, '\n')
  const lines = body.split('\n')
  const problems: string[] = []
  const count = (re: RegExp): number => lines.filter((l) => re.test(l)).length

  const starts = [...lines.entries()].filter(([, l]) => START_HERE_LINE.test(l))
  if (starts.length !== 1) problems.push(`expected exactly one "▶ **START HERE" line, found ${starts.length}`)
  for (const [i, first] of starts) {
    // START HERE is a paragraph, hard-wrapped like the rest of the file: read the ▶ line and every wrapped line
    // after it, joined, or a chain or an over-cap START HERE on its continuation lines passes unread.
    const para = [first]
    for (const next of lines.slice(i + 1)) {
      if (PARAGRAPH_END.test(next)) break
      para.push(next)
    }
    const s = para.join(' ')
    if (/\brewritten (?:before )?by\b/i.test(s)) {
      problems.push('START HERE chains earlier sessions ("rewritten by …"); git log holds that history, so rewrite the paragraph whole')
    }
    if (s.length > START_HERE_MAX) {
      problems.push(
        `START HERE runs ${s.length} characters over ${para.length} line(s) (cap ${START_HERE_MAX}): the next move and the steps owed after it, nothing else`,
      )
    }
  }

  const sessions = count(SESSION_BLOCK)
  if (sessions > 1) problems.push(`${sessions} SESSION close blocks (at most one): keep only the newest; git log holds the rest`)
  const landmines = count(LANDMINES_BLOCK)
  if (landmines > 1) {
    problems.push(
      `${landmines} LANDMINES blocks (at most one): the newest close names only what bites the next step; file the rest in docs/landmines.md by area`,
    )
  }
  const distill = count(DISTILL_BLOCK)
  if (distill > 0) {
    problems.push(`${distill} DISTILL CANDIDATES block(s): add each lesson to the one "${DISTILL_HEADING}" section instead`)
  }
  const queues = lines.filter((l) => l.trim() === DISTILL_HEADING).length
  if (queues !== 1) problems.push(`expected exactly one "${DISTILL_HEADING}" section, found ${queues}`)
  // The standing pile the cleanup moved out ("## Operational landmines — these bite hands", 509 lines) sat BELOW
  // the first "## ", where neither the cap nor the block count sees it: a heading naming landmines is the pile.
  const landmineSection = lines.find((l) => /^#{2,6} .*landmine/i.test(l))
  if (landmineSection !== undefined) {
    problems.push(
      `a landmines section in the TODO ("${landmineSection.trim()}"): standing landmines live in docs/landmines.md by area; only the close's LANDMINES block names what bites the next step`,
    )
  }

  const firstH2 = firstH2Index(lines)
  // The cap measures only what sits above the first "## ", so START HERE, the close block and its LANDMINES must
  // sit there too: one heading above them (for navigation, or the 2026-08 to 2026-10 layout's "## Dated" above the
  // queue) would let them grow unmeasured while this arm printed OK.
  if (firstH2 !== -1) {
    const anchors: [string, RegExp][] = [
      ['START HERE', START_HERE_LINE],
      ['the SESSION close block', SESSION_BLOCK],
      ['the LANDMINES block', LANDMINES_BLOCK],
    ]
    const below = anchors.filter(([, re]) => lines.some((l, i) => i > firstH2 && re.test(l))).map(([name]) => name)
    if (below.length > 0) {
      const names = below.length === 1 ? below[0] : `${below.slice(0, -1).join(', ')} and ${below[below.length - 1]}`
      problems.push(
        `a "## " heading above ${names} ends the start-of-file section before ${below.length === 1 ? 'it' : 'them'}, so the cap never measures ${below.length === 1 ? 'it' : 'them'}: keep START HERE, the close block and its LANDMINES above the first "## " heading`,
      )
    }
  }
  // Each line before the heading plus its "\n": the same span as the text before the heading's first character.
  const headEnd = firstH2 === -1 ? body.length : lines.slice(0, firstH2).reduce((n, l) => n + l.length + 1, 0)
  const head = body.slice(0, headEnd)
  if (head.length > TODO_HEAD_MAX) {
    problems.push(
      `the start-of-file section (above the first "## " heading) runs ${head.length} characters (cap ${TODO_HEAD_MAX}): move finished phases, records and landmines out; never cut a live prescription to fit`,
    )
  }
  return problems
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

  // Arm 6 — TODO.md stays a queue a session can read at every start.
  const todoPath = join(cwd, TODO_SURFACE)
  const todoProblems = existsSync(todoPath) ? checkTodoShape(readFileSync(todoPath, 'utf-8')) : [`${TODO_SURFACE} is missing`]
  if (todoProblems.length === 0) {
    console.log(`  OK     ${TODO_SURFACE} — one START HERE with no chain, one close block, one distill list, the start-of-file section under its cap`)
  } else {
    failed = true
    for (const p of todoProblems) console.error(`  SHAPE  ${TODO_SURFACE} — ${p}`)
  }

  if (failed) {
    console.error('[verify:doc-stats] FAILED — see the STALE / STRAY / SHAPE lines above.')
    return 1
  }
  console.log(
    `[verify:doc-stats] OK — every tracked surface matches the live suite (${actual.cases} tests / ${actual.files} files); the register header, its single home, the insights index, every line-numbered citation, every insight's four required sections and the TODO's shape hold.`,
  )
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main())
}
