/**
 * Unit 7 tests — pure self-test checks + mocked variants of the live ones.
 *
 * PURE: Check 5 (allowlist), Check 7 (scrubber + fail-closed), Check 8 (retention).
 * MOCKED: Checks 1-4 / 6 need a real browser + wrangler; verified via the
 *   live-run of `pnpm playtest:selftest` against `pnpm dev:server`.
 */
import { describe, it, expect } from 'vitest'

import {
  checkAgentAllowlistDefinition,
  checkScrubberInvokedFailClosed,
  checkRetentionBoundary,
} from './selftest-checks'

describe('Check 5 — agent allowlist definition (pure)', () => {
  it('passes with current types.ts definitions', () => {
    const r = checkAgentAllowlistDefinition()
    expect(r.pass).toBe(true)
    expect(r.name).toBe('agent-allowlist-definition')
    expect(r.detail).toMatch(/disjoint/)
  })
})

describe('Check 7 — scrubber invoked + fail-closed (pure)', () => {
  it('passes: well-formed scrub + malformed fail-closed abort', async () => {
    const r = await checkScrubberInvokedFailClosed()
    if (!r.pass) {
      // Surface the diagnostic to help triage.
      throw new Error(`Check 7 failed: ${r.detail}`)
    }
    expect(r.pass).toBe(true)
    expect(r.name).toBe('scrubber-invoked-fail-closed')
  })
})

describe('Check 8 — retention boundary (pure + tmpfs)', () => {
  it('passes: (N+1)-th evicted, N-th kept', async () => {
    const r = await checkRetentionBoundary()
    if (!r.pass) {
      throw new Error(`Check 8 failed: ${r.detail}`)
    }
    expect(r.pass).toBe(true)
    expect(r.name).toBe('retention-boundary')
    expect(r.detail).toMatch(/rotated/)
  })
})
