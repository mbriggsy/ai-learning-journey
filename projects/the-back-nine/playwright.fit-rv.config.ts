import { defineConfig } from '@playwright/test'

/**
 * The RecommendationViz chart-text gate (`verify:fit:rv`) — the fourth chart's arm of the §12
 * contract (docs/architecture.md, "SVG draws, HTML writes"), on its OWN harness because it is the
 * one chart that exists only AFTER a full-precision (16k-path) worker solve: ~4–7 min per arm with
 * the whole machine (playwright.caddie.config.ts's measured band for the `surplus` lockup). Beside
 * the fit harness's ~26 date-seed finals it would starve them of cores and they would starve it —
 * the datesplit arms already timed out once at ten concurrent solves, after the chart-text spec grew
 * to 18 date renders (playwright.fit.config.ts).
 *
 * SERIALIZED — `workers: 1`, `fullyParallel: false` — so each solve gets every core (the caddie
 * harness's `hasSolveTarget` rule, made unconditional here: every test in this file solves).
 *
 * A FOURTH harness, deliberately separate (the playwright.config.ts / .fit / .caddie precedent):
 * it boots `pnpm dev` because the `?seed=` route it drives is DCE'd out of dist/, and it must never
 * share a port with the CSP pair (4180/4181), the fit gate (4190), the Caddie walk (4195) or
 * Briggsy's own dev server (5173/5174). Port 4192, `--strictPort` fails loud on a collision.
 *
 * CI runs it as its own job, in parallel with `verify` (.github/workflows/verify-the-back-nine.yml):
 * appended to that job it would double its wall-clock for nothing — this gate needs no dist/.
 *
 * Not in tsconfig.json's `include`, so `tsc --noEmit` skips it; Playwright compiles it itself.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/chart-text-rv.spec.ts'],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI, // a stray test.only fails CI rather than silently narrowing the gate
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // One arm per test: the seed's FINAL tier (reviewSurface FINAL_TIER_MS, 150 s) + the committed
  // lockup (COMMITTED_LOCKUP_MS in the spec, 720 s — the caddie walk's budget for the same solve)
  // + two audits and the planted control. 900 s holds a full-budget lockup with the seed's final tier
  // and the audits inside it — the lockup is the part that actually varies. Measured 2026-09-07 on a
  // 20-thread laptop: 8.0 / 7.7 / 6.0 min per arm (PHONE / FLOOR / REAL), 21.8 min for the gate.
  timeout: 900_000,
  use: {
    baseURL: 'http://127.0.0.1:4192', // 127.0.0.1, NOT localhost (dodges the IPv4/IPv6 readiness flake)
    serviceWorkers: 'block', // PWA is disabled in dev (devOptions.enabled:false) — blocked anyway so a
    // stray registration from a past session can never serve a stale shell into a layout measurement.
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev --port 4192 --strictPort',
    url: 'http://127.0.0.1:4192',
    reuseExistingServer: !process.env.CI, // CI: fresh server (strictPort throws if occupied — fail loud)
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 }, // clean Node exit on Linux CI (ignored on Windows)
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
