import fitConfig from '../../playwright.fit.config'

/**
 * The HELD harness for `e2e/held/*.spec.ts` — INSTRUMENTS, never gates.
 *
 * `playwright.fit.config.ts` lists its three gate specs by name in `testMatch`, so nothing under
 * `e2e/held/` is collected by `pnpm verify:fit` and nothing here can ever red CI. This config
 * reuses that harness wholesale — the same dev server on port 4190, the same timeout, the same
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
