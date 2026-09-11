import fitConfig from '../../playwright.fit.config'

/**
 * The HELD harness for `e2e/held/*.spec.ts` — INSTRUMENTS, never gates.
 *
 * `playwright.fit.config.ts` lists its three gate specs by name in `testMatch`, so nothing under
 * `e2e/held/` is collected by `pnpm verify:fit`; the CSP harness (`playwright.config.ts`) collects
 * by DENYLIST and, since 2026-09-11, names the `held` directory at any depth (the glob is spelled in
 * the config; it cannot be spelled inside a block comment) — before that entry existed, `pnpm verify:csp`
 * collected the instrument beside this file and CI ran red for three commits. The partition is
 * gated by scripts/__tests__/playwright-harness-partition.test.ts: no held spec in a CI gate. This
 * config reuses the fit harness wholesale — the same dev server on port 4190, the same timeout, the same
 * blocked service worker — and only re-points `testMatch`, so an instrument measures the SAME
 * page the gate measures. Run it explicitly:
 *
 *     pnpm exec playwright test --config e2e/held/shots.config.ts
 */
export default {
  ...fitConfig,
  // Both paths are resolved relative to THIS file's directory, so they are re-pointed here: the
  // held specs sit beside this config, and the dev server must still boot from the repo root.
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  webServer: { ...fitConfig.webServer, cwd: '../..' },
}
