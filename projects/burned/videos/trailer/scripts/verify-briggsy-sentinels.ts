/**
 * `pnpm verify:briggsy-sentinels` — git-author gate for Briggsy-eye
 * sentinel files. Phase 4 Unit 4.9 amendment TIER 2 #7
 * (adversarial conf 0.86 + product-lens convergent conf 0.78).
 *
 * The pre-deepening mechanism was honor-system: each
 * `briggsy-review-4.N.signoff` file's existence gates Unit 4.10 entry.
 * Claude can `touch` an empty file in 2 seconds — defeating insight
 * 050's "human eye in the loop on perceptual continuities" intent.
 *
 * This gate asserts each sentinel's LAST COMMIT is authored by
 * briggsy007@gmail.com. Claude (or CI) commits with a different
 * identity — the gate catches that. It does NOT prevent Briggsy from
 * rubber-stamping without actually reviewing — that's the human's
 * discipline problem, not a check we can mechanize. The gate stops
 * "Claude wrote the sentinel and claimed Briggsy reviewed."
 *
 * **Scope (Phase 4):** sentinels 4.2-4.7 (composite-build/). Future
 * phases extend the SENTINELS list:
 *   - Phase 5 deepening: 5.4 + 5.6 (gameplay-capture/)
 *   - Phase 6 doc-review cross-phase amendment #5: 6.0a + 6.4 + 6.7
 *     (final-render-qa/) — plus 6.0a additionally requires
 *     `decode-test-roster.md` ≥6 confirmed-panel rows
 * Currently only Phase 4 sentinels are enforced; the others are
 * commented out below with their target paths + phase intent. When
 * Phase 5/6 work begins, uncomment + extend the inline-roster check
 * for 6.0a.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * per insight #057 — script runs from any CWD.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

const REQUIRED_AUTHOR = 'briggsy007@gmail.com'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ -> videos/trailer/ -> projects/burned/ -> repo root
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..')
const BURNED_ROOT = resolve(REPO_ROOT, 'projects', 'burned')

interface Sentinel {
  /** Path relative to projects/burned/ (the git working tree subdir we run git -C from). */
  relPath: string
  phase: 'Phase 4' | 'Phase 5' | 'Phase 6'
}

const SENTINELS: Sentinel[] = [
  // ─── Phase 4 scenes 4.2-4.7 ──────────────────────────────────
  ...[2, 3, 4, 5, 6, 7].map<Sentinel>((n) => ({
    relPath: `videos/trailer/sample-eval/composite-build/briggsy-review-4.${n}.signoff`,
    phase: 'Phase 4',
  })),
  // ─── Phase 5 (uncomment when Phase 5 work begins) ────────────
  // { relPath: 'videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff', phase: 'Phase 5' },
  // { relPath: 'videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff', phase: 'Phase 5' },
  // ─── Phase 6 (uncomment when Phase 6 work begins) ────────────
  // { relPath: 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff', phase: 'Phase 6' },
  // { relPath: 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.4.signoff', phase: 'Phase 6' },
  // { relPath: 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.7.signoff', phase: 'Phase 6' },
]

const failures: string[] = []

for (const { relPath, phase } of SENTINELS) {
  const abs = resolve(BURNED_ROOT, relPath)
  if (!existsSync(abs)) {
    failures.push(`MISSING: ${relPath} (${phase})`)
    continue
  }

  let authorEmail = ''
  try {
    // Run git -C from the repo root so the path resolves against the
    // git working tree. The path arg is relative to projects/burned/
    // → we pass `projects/burned/${relPath}` to git.
    authorEmail = execFileSync(
      'git',
      [
        '-C',
        REPO_ROOT,
        'log',
        '-1',
        '--format=%ae',
        '--',
        relative(REPO_ROOT, abs),
      ],
      { encoding: 'utf8' },
    ).trim()
  } catch {
    failures.push(`UNTRACKED (no commit history): ${relPath}`)
    continue
  }

  if (authorEmail === '') {
    failures.push(`UNTRACKED (empty git log — file not yet committed): ${relPath}`)
  } else if (authorEmail !== REQUIRED_AUTHOR) {
    failures.push(
      `WRONG AUTHOR: ${relPath} authored by ${authorEmail} (expected ${REQUIRED_AUTHOR})`,
    )
  }
}

// ─── Phase 6 Unit 6.0 Step 8 inline-roster check ─────────────────
// When Phase 6 sentinels are enabled above, also uncomment this block:
// the 6.0a sentinel gates on `decode-test-roster.md` having ≥6
// confirmed-panel rows. Adversarial Attack 28 — don't honor-system
// the recruitment claim.
//
// const rosterPath = resolve(BURNED_ROOT, 'videos/trailer/sample-eval/final-render-qa/decode-test-roster.md')
// const sixOhAPath = resolve(BURNED_ROOT, 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff')
// if (existsSync(sixOhAPath)) {
//   if (!existsSync(rosterPath)) {
//     failures.push(`MISSING ROSTER: decode-test-roster.md required to back briggsy-review-6.0a.signoff`)
//   } else {
//     const rosterText = readFileSync(rosterPath, 'utf-8')
//     const matches = rosterText.match(/\|\s*T\d+\s*\|[^\n]+\|[^\n]+\|[^\n]+\|/g) ?? []
//     const filledRows = matches.filter((row) => {
//       const cells = row.split('|').slice(1, -1).map((c) => c.trim())
//       return cells.length >= 4 && cells.slice(0, 4).every((c) => c.length > 0 && c !== '<handle>')
//     })
//     if (filledRows.length < 6) {
//       failures.push(`ROSTER UNDERCOUNT: decode-test-roster.md has ${filledRows.length} confirmed rows; ≥6 required for 6.0a sentinel`)
//     }
//   }
// }

if (failures.length) {
  console.error('[verify-briggsy-sentinels] FAILED:')
  console.error('')
  for (const f of failures) console.error('  - ' + f)
  console.error('')
  console.error(`  Sentinels must be committed by ${REQUIRED_AUTHOR}. To pass:`)
  console.error(`    1. cd projects/burned`)
  console.error(`    2. # touch each missing sentinel file`)
  console.error(`    3. git add <sentinel-path> && git commit -m "review: S0N pass"`)
  console.error('')
  process.exit(1)
}

console.log(
  `[verify-briggsy-sentinels] OK — ${SENTINELS.length} Phase 4 sentinels authored by ${REQUIRED_AUTHOR}.`,
)
