/**
 * Unit 3b tests — per-session token + scrub salt minting.
 *
 * Test-first per Phase 3 plan: both primitives are small, security-
 * relevant, and load-bearing for token-leak scope + scrub-hash
 * non-reversibility across sessions.
 *
 * Scenarios (from phase-3-harness-infra.md Unit 3b):
 *   1. 1000 mint calls per fn → pairwise-distinct outputs.
 *   2. Both fns return 64 hex chars, match /^[0-9a-f]{64}$/.
 *   3. Independence: token !== salt for 1000 sessions.
 *   4. Override: deterministic `Buffer.alloc(32, 0)` → 64 literal zeros.
 *   5. Security — tree-shake sentinel grep: build prod bundle, assert
 *      zero matches across all four Unit 3b sentinels.
 */
import { describe, it, expect } from 'vitest'
import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  mintPlaytestToken,
  mintScrubSalt,
  withRandomSource,
} from './session-secrets'

const HEX_64 = /^[0-9a-f]{64}$/

describe('session-secrets — mint primitives', () => {
  it('mintPlaytestToken returns 64 lowercase-hex chars', () => {
    const token = mintPlaytestToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(HEX_64)
  })

  it('mintScrubSalt returns 64 lowercase-hex chars', () => {
    const salt = mintScrubSalt()
    expect(salt).toHaveLength(64)
    expect(salt).toMatch(HEX_64)
  })

  it('1000 mintPlaytestToken calls are pairwise-distinct', () => {
    const pool = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      pool.add(mintPlaytestToken())
    }
    expect(pool.size).toBe(1000)
  })

  it('1000 mintScrubSalt calls are pairwise-distinct', () => {
    const pool = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      pool.add(mintScrubSalt())
    }
    expect(pool.size).toBe(1000)
  })

  it('token and salt are independent draws (token !== salt for 1000 sessions)', () => {
    for (let i = 0; i < 1000; i++) {
      const token = mintPlaytestToken()
      const salt = mintScrubSalt()
      // The probability of a collision from 32 bytes of CSPRNG output is
      // ~2^-256 — an expected-never event. A match here indicates the
      // fns share state rather than drawing independently.
      expect(token).not.toBe(salt)
    }
  })
})

describe('session-secrets — withRandomSource override (test-only)', () => {
  it('override produces deterministic "all zeros" output when source returns zeroed buffer', () => {
    const deterministic = withRandomSource(() => Buffer.alloc(32, 0))
    const zeros64 = '0000000000000000000000000000000000000000000000000000000000000000'
    expect(deterministic.mintPlaytestToken()).toBe(zeros64)
    expect(deterministic.mintScrubSalt()).toBe(zeros64)
  })

  it('override is scoped (does not globally mutate crypto source)', () => {
    withRandomSource(() => Buffer.alloc(32, 0))
    // Top-level mintPlaytestToken still uses crypto.randomBytes and must
    // not return the all-zeros string.
    const real = mintPlaytestToken()
    expect(real).toMatch(HEX_64)
    expect(real).not.toBe('0000000000000000000000000000000000000000000000000000000000000000')
  })

  it('override source producing distinct buffers yields distinct outputs', () => {
    let counter = 0
    const deterministic = withRandomSource(() => {
      const buf = Buffer.alloc(32, 0)
      buf.writeUInt32BE(counter++, 0)
      return buf
    })
    const a = deterministic.mintPlaytestToken()
    const b = deterministic.mintScrubSalt()
    expect(a).not.toBe(b)
    expect(a.startsWith('00000000')).toBe(true)
    expect(b.startsWith('00000001')).toBe(true)
  })
})

// --- Security: tree-shake sentinel grep -----------------------------------
// Phase-2 Unit 7 pattern: if session-secrets.ts ever gets pulled into the
// client bundle, any of these four string literals will appear in dist/.
// The build is ~30s; we run it conditionally (only if dist/ needs a fresh
// build) to keep the default `pnpm test` run reasonably fast.
const DIST_DIR = join(process.cwd(), 'dist')
const FORBIDDEN_SENTINELS = [
  'mintPlaytestToken',
  'mintScrubSalt',
  'playtest/lib/session-secrets',
  'PLAYTEST_TREE_SHAKE_SENTINEL_SESSION_SECRETS_3B',
] as const

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

describe('session-secrets — tree-shake sentinel grep (prod bundle)', () => {
  it('no Unit 3b sentinel appears anywhere in dist/**/*.js', () => {
    // If dist/ is absent (fresh clone / CI pre-build), invoke `pnpm build`
    // so the test has something to scan. The shared prod-bundle-sentinels
    // test skips on NO_DIST; this one is load-bearing for Unit 3b's
    // security contract, so we force the build.
    if (!existsSync(DIST_DIR)) {
      const result = spawnSync('pnpm', ['build'], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      })
      if (result.status !== 0) {
        throw new Error('[session-secrets.test] `pnpm build` failed — cannot verify tree-shake')
      }
    }

    const files = collectJsFiles(DIST_DIR)
    expect(files.length).toBeGreaterThan(0)

    const violations: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      for (const needle of FORBIDDEN_SENTINELS) {
        if (content.includes(needle)) {
          violations.push(`${needle} in ${file}`)
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Unit 3b sentinel leaked into dist/ (${violations.length} violation(s)):\n  ` +
        violations.join('\n  '),
      )
    }

    expect(violations).toEqual([])
  }, 120_000)
})
