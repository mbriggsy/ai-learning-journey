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
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
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
  if (!ok) {
    console.error(
      `[verify:doc-stats] FAILED — a doc surface disagrees with the live suite (${actual.cases} tests / ${actual.files} files). Update the count(s) above.`,
    )
    return 1
  }
  console.log(
    `[verify:doc-stats] OK — every tracked surface matches the live suite (${actual.cases} tests / ${actual.files} files).`,
  )
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main())
}
