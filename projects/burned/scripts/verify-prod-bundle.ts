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
import { fileURLToPath } from 'node:url'

const DIST_DIR = join(process.cwd(), 'dist')

// Strings that must NOT appear in any production CLIENT JS chunk.
// Each entry names the sentinel + a hint pointing at which guard
// likely failed, so a leak gives an actionable error message.
//
// Scope is deliberately CLIENT-SIDE only. The Workers server bundle is
// built by wrangler at deploy time and includes all imported server
// modules (including playtest modules), guarded at RUNTIME by
// `isPlaytestMode(env)` + `PLAYTEST_MODE=1` never being set in prod
// deploys. The sentinel guarantee: none of these literals leak into
// code that ships to players' browsers.
interface Sentinel { needle: string; guard: string }
const FORBIDDEN_STRINGS: Sentinel[] = [
  { needle: '__gameStore', guard: 'gameStore.ts dev exposure guard (import.meta.env.DEV || MODE === test)' },
  { needle: '__gameStoreSnapshot', guard: 'gameStore.ts dev exposure guard' },
  // --- Playtest-harness sentinels (Phase 2) ---
  // The harness protocol is god-role only; no client code path should
  // reference it. If any of these appear in a client chunk, the
  // playtest server types or strings have leaked into shared client
  // code — check the import boundary (src/shared/ should not import
  // from src/server/).
  { needle: 'god-event', guard: 'Unit 6 god-event message type — keep in src/server/god-projection.ts only' },
  { needle: 'playtest-config', guard: 'Unit 5 admin message type — keep in src/server/playtest-config.ts only' },
  { needle: 'mulberry32', guard: 'Unit 3 seedable RNG — keep in src/server/rng.ts only' },
  { needle: 'PLAYTEST_TOKEN', guard: 'Unit 1 env shape — server-only' },
  { needle: 'PLAYTEST_GOD_ORIGINS', guard: 'Unit 1 env shape — server-only' },
  // --- Playtest-harness sentinels (Phase 3 Unit 3b) ---
  // session-secrets.ts lives in scripts/playtest/lib/ and must not be
  // pulled into any client bundle. Function names + module path fragment
  // + a sentinel comment unique to the file are all grep-checked.
  { needle: 'mintPlaytestToken', guard: 'Unit 3b session-secrets — keep in scripts/playtest/lib/ only' },
  { needle: 'mintScrubSalt', guard: 'Unit 3b session-secrets — keep in scripts/playtest/lib/ only' },
  { needle: 'playtest/lib/session-secrets', guard: 'Unit 3b module path — scripts-only, must not be imported by src/' },
  { needle: 'PLAYTEST_TREE_SHAKE_SENTINEL_SESSION_SECRETS_3B', guard: 'Unit 3b sentinel comment — only appears in scripts/playtest/lib/session-secrets.ts' },
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
    for (const { needle, guard } of FORBIDDEN_STRINGS) {
      if (content.includes(needle)) {
        console.error(`[verify-prod-bundle] ✗ FORBIDDEN '${needle}' found in ${file}`)
        console.error(`    Likely failed guard: ${guard}`)
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

/** Pure entry point for Vitest — does not run the build or call process.exit. */
export function checkProdBundle(): { ok: boolean; violations: string[]; filesScanned: number } {
  if (!existsSync(DIST_DIR)) {
    return { ok: true, violations: ['NO_DIST'], filesScanned: 0 }
  }
  const files = collectJsFiles(DIST_DIR)
  const violations: string[] = []
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    for (const { needle, guard } of FORBIDDEN_STRINGS) {
      if (content.includes(needle)) {
        violations.push(`${needle} (in ${file}) — guard: ${guard}`)
      }
    }
  }
  return { ok: violations.length === 0, violations, filesScanned: files.length }
}

// Only run as a script when invoked directly (not when imported by tests).
const entryPath = process.argv[1] ? fileURLToPath(new URL(`file://${process.argv[1].replace(/\\/g, '/')}`)) : ''
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  process.exit(main())
}
