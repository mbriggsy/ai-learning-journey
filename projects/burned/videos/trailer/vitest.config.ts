import { defineConfig } from 'vitest/config';

/**
 * Trailer subpackage vitest config.
 *
 * Required because root `burned/vitest.config.ts` scopes includes to
 * `src/**` + `scripts/playtest/**` — both BURNED-main-project paths.
 * Tests under `videos/trailer/scripts/` fall outside both, so without
 * this shadow config, `pnpm test` from `videos/trailer/` walks up,
 * finds the root config, and reports "No test files found" while
 * trailer test files sit visible in the tree.
 *
 * Same family of nested-package gotcha as insight #054 (pnpm install
 * no-ops nested package outside workspace). Both have the shape:
 * "tool walks up to project root, finds config that excludes the
 * nested package's own dirs, silently does nothing."
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    restoreMocks: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.ts'],
  },
});
