#!/usr/bin/env tsx
/**
 * Verify the production bundle does not contain dev-only exposures.
 *
 * Overnight E2E audit 2026-04-23 E-03 flagged that src/client/shared/
 * gameStore.ts exposes `window.__gameStore` in dev/test mode, guarded
 * by `import.meta.env.DEV || import.meta.env.MODE === 'test'`. Vite
 * statically replaces these at build time, so DCE should eliminate the
 * block entirely. But nothing regression-tests the output — one
 * refactor introducing a runtime env check could silently ship the
 * dev hook to prod, leaking every player's hand via DevTools.
 *
 * This script runs a production build then scans the emitted JS for
 * forbidden strings. Run it in CI after `vite build` (or via
 * `pnpm verify:bundle`).
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST_DIR = join(process.cwd(), 'dist')

// Strings that must NOT appear in any production JS chunk.
// Add entries here as dev-only exposures accumulate.
const FORBIDDEN_STRINGS = [
  '__gameStore',
  '__gameStoreSnapshot',
]

function collectJsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) {
      out.push(...collectJsFiles(full))
    } else if (name.endsWith('.js') || name.endsWith('.mjs')) {
      out.push(full)
    }
  }
  return out
}

function main(): number {
  if (!existsSync(DIST_DIR)) {
    console.log('[verify-prod-bundle] no dist/ — running `pnpm build`')
    // spawnSync with argv array (no shell) — safe from injection since
    // all args are hard-coded literals, not user input.
    const result = spawnSync('pnpm', ['build'], {
      stdio: 'inherit',
      shell: process.platform === 'win32', // pnpm on Windows needs shell for PATH resolution
    })
    if (result.status !== 0) {
      console.error('[verify-prod-bundle] build failed')
      return 1
    }
  } else {
    console.log('[verify-prod-bundle] using existing dist/')
  }

  const files = collectJsFiles(DIST_DIR)
  if (files.length === 0) {
    console.error('[verify-prod-bundle] no JS files in dist/')
    return 1
  }

  let violations = 0
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    for (const needle of FORBIDDEN_STRINGS) {
      if (content.includes(needle)) {
        console.error(`[verify-prod-bundle] ✗ FORBIDDEN '${needle}' found in ${file}`)
        violations++
      }
    }
  }

  if (violations > 0) {
    console.error(`[verify-prod-bundle] ✗ ${violations} violation(s) — dev exposures leaked to prod.`)
    return 1
  }

  console.log(`[verify-prod-bundle] ✓ ${files.length} JS chunks clean (${FORBIDDEN_STRINGS.length} forbidden strings checked).`)
  return 0
}

process.exit(main())
