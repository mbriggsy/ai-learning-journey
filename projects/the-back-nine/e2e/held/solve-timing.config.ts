import { defineConfig } from '@playwright/test'

/**
 * The HELD harness for the solve-timing instrument (`solve-timing.spec.ts`, beside this file) — an
 * INSTRUMENT, never a gate. Its own config because it is the one held spec that measures the BUILT
 * app: `shots.config.ts` reuses the fit harness's dev server, and a dev build is exactly what this
 * instrument exists not to time (`shots.config.ts` ignores the spec, so each harness claims it once —
 * scripts/__tests__/playwright-harness-partition.test.ts).
 *
 * The server is `scripts/serve-dist-with-headers.ts` (`vercel.json`'s exact headers on :4180, the same
 * minus CSP on :4181); the spec drives the CONTROL origin (see its header). It serves the EXISTING
 * `dist/` — run `pnpm build` first. `reuseExistingServer: false`: a server already on those ports may
 * be serving an older `dist/`, and a timing of the wrong build is worse than a loud port collision.
 *
 *     pnpm build
 *     SOLVE_TIMING_OUT=temp/solve-timing/<name> pnpm exec playwright test --config e2e/held/solve-timing.config.ts
 */
export default defineConfig({
  testDir: '.',
  // Both instruments of the BUILT app: the wall-clock timing and the phase-split profile.
  testMatch: ['**/solve-timing.spec.ts', '**/solve-phase-profile.spec.ts'],
  fullyParallel: false,
  workers: 1, // ONE solve at a time — a second one beside it halves the cores it sees
  retries: 0, // a retried timing is a different measurement; a failure is read, never re-rolled
  timeout: 110 * 60_000, // the spec's LOCKUP_MS (95 min) + the plant, the unlock and the verdict
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4181', // the CONTROL origin; 127.0.0.1, NOT localhost (the IPv4/IPv6 flake)
    serviceWorkers: 'block',
  },
  // The INSTALLED Google Chrome in new headless mode — the browser at his seat, never the headless shell.
  projects: [{ name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } }],
  webServer: {
    command: 'pnpm exec tsx scripts/serve-dist-with-headers.ts',
    cwd: '../..',
    url: 'http://127.0.0.1:4181',
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 },
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
