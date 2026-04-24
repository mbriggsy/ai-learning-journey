import { describe, expect, it } from 'vitest'
import { checkProdBundle } from '../../scripts/verify-prod-bundle'

/**
 * Regression guard — playtest-harness Phase 2 Unit 7.
 *
 * Ensures no playtest-mode sentinel strings leak into the client
 * production bundle. The client never imports any playtest server
 * module; if a sentinel appears in a client chunk, a shared-code
 * boundary was violated.
 *
 * The test depends on `dist/` having been built. If `dist/` is absent
 * (fresh clone, clean CI), the test passes with a SKIP marker — the
 * standalone `pnpm verify:bundle` invocation is expected to build
 * first. This keeps `pnpm test` fast (no forced vite build per run)
 * without leaving the regression invisible: a violation in an existing
 * `dist/` still fails loudly here.
 */
describe('prod-bundle sentinels — playtest leak guard', () => {
  it('dist/ has no forbidden sentinel strings (or dist/ is absent)', () => {
    const result = checkProdBundle()

    if (result.violations.length === 1 && result.violations[0] === 'NO_DIST') {
      // No dist/ — skip. CI should run `pnpm verify:bundle` which
      // triggers a full build before scanning.
      expect(result.ok).toBe(true)
      return
    }

    if (!result.ok) {
      // Print the full violation list so the test output identifies
      // both the leaked sentinel AND the guard that likely failed.
      throw new Error(
        `Playtest sentinel leaked into dist/ (${result.violations.length} violation(s)):\n  ` +
        result.violations.join('\n  '),
      )
    }

    expect(result.filesScanned).toBeGreaterThan(0)
  })
})
