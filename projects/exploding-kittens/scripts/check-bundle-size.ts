/**
 * Post-build bundle size gate.
 * Reads dist/assets/*.js, gzips each, compares to budget.
 * Exits non-zero if any budget is exceeded.
 *
 * Usage: node --import tsx scripts/check-bundle-size.ts
 */

import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST_DIR = join(import.meta.dirname, '..', 'dist', 'assets')

// Budget in bytes (gzipped)
const BUDGETS: Record<string, number> = {
  player: 100_000,
  board: 150_000,
}

async function main() {
  const files = await readdir(DIST_DIR)
  const jsFiles = files.filter(f => f.endsWith('.js'))

  let failed = false

  for (const [entry, budget] of Object.entries(BUDGETS)) {
    // Entry chunks are named like: player-HASH.js, board-HASH.js
    const entryFile = jsFiles.find(f => f.startsWith(entry + '-') || f === entry + '.js')
    if (!entryFile) {
      console.log(`  [SKIP] No ${entry} entry chunk found`)
      continue
    }

    const raw = await readFile(join(DIST_DIR, entryFile))
    const gzipped = gzipSync(raw)
    const sizeKB = (gzipped.length / 1024).toFixed(1)
    const budgetKB = (budget / 1024).toFixed(1)

    if (gzipped.length > budget) {
      console.error(`  [FAIL] ${entry}: ${sizeKB}KB gzipped > ${budgetKB}KB budget`)
      failed = true
    } else {
      const headroom = ((budget - gzipped.length) / 1024).toFixed(1)
      console.log(`  [PASS] ${entry}: ${sizeKB}KB gzipped (${headroom}KB headroom)`)
    }
  }

  // Also report all chunk sizes for visibility
  console.log('\n  All chunks:')
  for (const file of jsFiles.sort()) {
    const raw = await readFile(join(DIST_DIR, file))
    const gzipped = gzipSync(raw)
    console.log(`    ${file}: ${(raw.length / 1024).toFixed(1)}KB raw, ${(gzipped.length / 1024).toFixed(1)}KB gzipped`)
  }

  if (failed) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
