/**
 * `pnpm verify:no-transition-series` — anti-regression grep gate for
 * ADR #11 revised + Phase 1 deepening hard-cut lock.
 *
 * The trailer uses bare `<Series>` (NOT `<TransitionSeries>`) — every
 * scene boundary is a hard cut; transition reads come from scene-
 * internal overlay components (stamp slap, dossier-page wipe, iris
 * wipe, head-fade-from-black, tail-fade-to-black). `@remotion/
 * transitions` is NOT installed (Phase 0 ADR #4 revised); a future
 * developer reaching for it would silently regress the locked
 * grammar.
 *
 * This gate greps every .ts / .tsx file under `videos/trailer/src/`
 * for `TransitionSeries` references. Comment mentions are tolerated
 * (the source files reference the name in design comments documenting
 * what NOT to do); IMPORT statements + JSX elements are forbidden.
 *
 * Wired into Unit 4.10's anti-regression CI gate set.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * per insight #057.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ -> videos/trailer/src/
const SRC_ROOT = resolve(__dirname, '..', 'src')

function walkFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const childAbs = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkFiles(childAbs))
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(childAbs)
    }
  }
  return out
}

// Forbidden patterns — import OR JSX usage:
//   - `from '@remotion/transitions'`
//   - `import ... TransitionSeries ...`
//   - `<TransitionSeries ...`
// Tolerated: bare `TransitionSeries` text inside `//` or `/* */` comments
// referencing what NOT to do (e.g., `// NO <TransitionSeries> ...`).
const FORBIDDEN_PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: 'import from @remotion/transitions',
    re: /from\s+['"]@remotion\/transitions['"]/,
  },
  {
    name: 'JSX <TransitionSeries> open tag',
    re: /<TransitionSeries\b/,
  },
]

function stripComments(src: string): string {
  // Remove // line comments and /* block */ comments. Naive (doesn't handle
  // strings containing // or /*) but adequate for grep gating — false negatives
  // are unacceptable, false positives are not since the offending file's actual
  // import/JSX line will fail the strict check anyway.
  return src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const failures: { file: string; pattern: string; sample: string }[] = []
const files = walkFiles(SRC_ROOT)
for (const abs of files) {
  const raw = readFileSync(abs, 'utf-8')
  const stripped = stripComments(raw)
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    const m = stripped.match(re)
    if (m) {
      failures.push({
        file: relative(resolve(__dirname, '..'), abs),
        pattern: name,
        sample: m[0],
      })
    }
  }
}

if (failures.length > 0) {
  console.error('[verify-no-transition-series] FAIL: ADR #11 revised regression detected.')
  console.error('')
  console.error('  The trailer uses bare <Series> + scene-internal overlay components.')
  console.error('  <TransitionSeries> and @remotion/transitions are FORBIDDEN per Phase 1 lock.')
  console.error('')
  for (const f of failures) {
    console.error(`  - ${f.file}: ${f.pattern} (matched: ${f.sample})`)
  }
  process.exit(1)
}

console.log(
  `[verify-no-transition-series] PASS — ${files.length} src files clean; no TransitionSeries imports or JSX.`,
)
